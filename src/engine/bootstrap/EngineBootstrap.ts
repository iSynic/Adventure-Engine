import type { GameConfig, Point } from "../core/types";
import type { Registry } from "../core/Registry";
import type { AssetLoader } from "../assets/AssetLoader";
import type { StateStore } from "../state/StateStore";
import type { RoomManager } from "../world/RoomManager";
import type { InventorySystem } from "../inventory/InventorySystem";
import type { ScriptRunner } from "../scripting/ScriptRunner";
import type { ScriptScheduler } from "../scripting/ScriptScheduler";
import type { Camera } from "../rendering/Camera";
import type { Renderer } from "../rendering/Renderer";
import type { UIManager } from "../ui/UIManager";
import type { DebugEventLog } from "../debug/DebugEventLog";
import type { EventBus, EngineEventMap } from "../core/EventBus";
import { ActorInstance } from "../world/Actor";
import { verifyWalkboxGraph } from "../navigation/Walkbox";

export interface BootstrapDeps {
  config: GameConfig;
  registry: Registry;
  assetLoader: AssetLoader;
  state: StateStore;
  roomManager: RoomManager;
  inventory: InventorySystem;
  scriptRunner: ScriptRunner;
  scheduler: ScriptScheduler;
  camera: Camera;
  renderer: Renderer;
  ui: UIManager;
  debugEventLog: DebugEventLog;
  events: EventBus<EngineEventMap>;
  onUIUpdate?: () => void;
}

export async function engineInit(deps: BootstrapDeps): Promise<ActorInstance> {
  const { config, registry, roomManager, inventory, state } = deps;

  const playerDef = registry.getActor(config.defaultPlayerActorId);
  if (!playerDef) {
    throw new Error(`[Engine] Player actor not found: ${config.defaultPlayerActorId}`);
  }

  const player = new ActorInstance(playerDef);
  await roomManager.preloadActorAnimations(playerDef);

  if (config.startingItems) {
    for (const itemId of config.startingItems) {
      inventory.addItem(config.defaultPlayerActorId, itemId);
    }
  }

  for (const obj of config.objects) {
    if (obj.state) {
      for (const [key, value] of Object.entries(obj.state)) {
        state.setObjectState(obj.id, key, value);
      }
    }
    if (obj.tags && obj.tags.length > 0) {
      const existing = state.getObjectRuntimeState(obj.id);
      if (existing) {
        if (existing.classFlags.length === 0) {
          existing.classFlags = [...obj.tags];
        }
      } else {
        state.setObjectRuntimeState(obj.id, {
          roomId: obj.roomId ?? null,
          ownerId: null,
          visible: obj.visible ?? true,
          enabled: obj.enabled ?? true,
          interactionEnabled: true,
          currentState: obj.state ? { ...obj.state } : {},
          x: obj.position?.x ?? 0,
          y: obj.position?.y ?? 0,
          classFlags: [...obj.tags],
          primaryState: obj.primaryState ?? 0,
        });
      }
    }
  }

  return player;
}

export interface PendingRoomActivation {
  roomId: string;
  onEnter?: string;
  previousRoomId: string | null;
}

export interface EngineLoadRoomOptions {
  skipActivation?: boolean;
}

export async function engineLoadRoom(
  deps: BootstrapDeps,
  player: ActorInstance | null,
  roomId: string,
  spawnPointId?: string,
  fadeHandle?: FadeHandle,
  options?: EngineLoadRoomOptions
): Promise<PendingRoomActivation | null> {
  const { config, registry, roomManager, state, scheduler, camera, ui, debugEventLog, events, renderer } = deps;
  const prevRoom = roomManager.getCurrentRoom()?.id;
  const handle = fadeHandle ?? { animId: 0 };

  const targetRoomDef = registry.getRoom(roomId);
  const effect = targetRoomDef?.transitionEffect ?? "fade";

  if (prevRoom && effect === "fade") {
    const preloadPromise = roomManager.preloadRoom(roomId);
    await Promise.all([fadeOut(renderer, 300, handle), preloadPromise]);
  } else if (prevRoom) {
    await roomManager.preloadRoom(roomId);
  }

  if (prevRoom) {
    events.emit("room:exited", { roomId: prevRoom, nextRoomId: roomId });
    scheduler.onRoomChange(prevRoom, roomId);
  }

  await roomManager.loadRoom(roomId, spawnPointId, prevRoom);

  const room = roomManager.getCurrentRoom()!;

  if (room.walkboxes.length > 0) {
    const warnings = verifyWalkboxGraph(room.walkboxes);
    for (const w of warnings) {
      console.warn(`[Walkbox] ${w.message}`);
      debugEventLog.log("room", `⚠ Walkbox: ${w.message}`);
    }
  }
  const playerDef = registry.getActor(config.defaultPlayerActorId);
  if (player && playerDef) {
    let placed = false;
    if (spawnPointId && room.spawnPoints) {
      const sp = room.spawnPoints.find((s) => s.id === spawnPointId);
      if (sp) {
        player.x = sp.x;
        player.y = sp.y;
        if (sp.facing) player.facing = sp.facing;
        placed = true;
      }
    }
    if (!placed && !prevRoom && room.spawnPoints && room.spawnPoints.length > 0) {
      const defaultSp = room.spawnPoints[0];
      player.x = defaultSp.x;
      player.y = defaultSp.y;
      if (defaultSp.facing) player.facing = defaultSp.facing;
      placed = true;
    }
    if (!placed && config.defaultPlayerPosition && !prevRoom) {
      player.x = config.defaultPlayerPosition.x;
      player.y = config.defaultPlayerPosition.y;
    }

    roomManager.placeActorInRoom(player, undefined);
  }

  if (room.width <= camera.width && room.height <= camera.height) {
    camera.resetToRoom();
  } else if (player) {
    camera.snapToActor(player.x, player.y, room.width, room.height);
  }

  ui.setRoomTitle(room.name, true);
  debugEventLog.log("room", `Room transition: ${prevRoom ?? "(start)"} → ${roomId}`);
  deps.onUIUpdate?.();

  const previousRoomId = prevRoom ?? null;

  if (options?.skipActivation) {
    const currentRoom = roomManager.getCurrentRoom();
    if (currentRoom && currentRoom.id === roomId) {
      state.setCurrentRoomId(roomId);
      if (player) {
        player.roomId = roomId;
      }
    }
    return { roomId, onEnter: room.onEnter, previousRoomId };
  }

  events.emit("room:entered", { roomId, previousRoomId });

  if (room.onEnter) {
    await deps.scriptRunner.runHook(room.onEnter, {
      currentRoomId: roomId,
      verb: "walk",
      currentActorId: null,
      currentTargetId: null,
      currentTargetType: null,
    }, { ownership: "room", ownerId: roomId });
  }

  const currentRoom = roomManager.getCurrentRoom();
  if (currentRoom && currentRoom.id === roomId) {
    state.setCurrentRoom(roomId);
    if (player) {
      player.roomId = roomId;
    }
  }

  if (prevRoom && effect === "fade") {
    await fadeIn(renderer, 300, handle);
  }

  return null;
}

export async function activateRoom(
  deps: BootstrapDeps,
  pending: PendingRoomActivation
): Promise<void> {
  const { events, scriptRunner, state, roomManager } = deps;

  events.emit("room:entered", { roomId: pending.roomId, previousRoomId: pending.previousRoomId });

  if (pending.onEnter) {
    await scriptRunner.runHook(pending.onEnter, {
      currentRoomId: pending.roomId,
      verb: "walk",
      currentActorId: null,
      currentTargetId: null,
      currentTargetType: null,
    }, { ownership: "room", ownerId: pending.roomId });
  }

  const currentRoom = roomManager.getCurrentRoom();
  if (currentRoom && currentRoom.id === pending.roomId) {
    state.setCurrentRoom(pending.roomId);
  }
}

export interface FadeHandle {
  animId: number;
}

export function fadeOut(renderer: Renderer, ms: number, handle: FadeHandle): Promise<void> {
  if (ms <= 0) {
    renderer.fadeAlpha = 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    cancelAnimationFrame(handle.animId);
    const start = performance.now();
    const from = renderer.fadeAlpha;
    const step = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      renderer.fadeAlpha = from + (1 - from) * t;
      if (t < 1) {
        handle.animId = requestAnimationFrame(step);
      } else {
        renderer.fadeAlpha = 1;
        resolve();
      }
    };
    handle.animId = requestAnimationFrame(step);
  });
}

export function fadeIn(renderer: Renderer, ms: number, handle: FadeHandle): Promise<void> {
  if (ms <= 0) {
    renderer.fadeAlpha = 0;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    cancelAnimationFrame(handle.animId);
    const start = performance.now();
    const from = renderer.fadeAlpha;
    const step = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      renderer.fadeAlpha = from * (1 - t);
      if (t < 1) {
        handle.animId = requestAnimationFrame(step);
      } else {
        renderer.fadeAlpha = 0;
        resolve();
      }
    };
    handle.animId = requestAnimationFrame(step);
  });
}
