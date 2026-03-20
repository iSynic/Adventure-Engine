import type { StateStore } from "../state/StateStore";
import type { InventorySystem } from "../inventory/InventorySystem";
import type { ScriptRunner } from "../scripting/ScriptRunner";
import type { ScriptScheduler } from "../scripting/ScriptScheduler";
import type { RoomManager } from "../world/RoomManager";
import type { Registry } from "../core/Registry";
import type { UIManager } from "../ui/UIManager";
import type { DialogueManager } from "../dialogue/DialogueManager";
import type { DebugEventLog } from "./DebugEventLog";
import type { DebugInspectedEntity } from "./DebugState";
import type { EventBus, EngineEventMap } from "../core/EventBus";

export interface DebugBridgeDeps {
  state: StateStore;
  inventory: InventorySystem;
  scriptRunner: ScriptRunner;
  scheduler: ScriptScheduler;
  roomManager: RoomManager;
  registry: Registry;
  ui: UIManager;
  dialogueManager: DialogueManager;
  debugEventLog: DebugEventLog;
  events: EventBus<EngineEventMap>;
  getPlayerId: () => string | null;
  loadRoom: (roomId: string, spawnPointId?: string) => Promise<void>;
}

export function setupDebugHooks(deps: DebugBridgeDeps): void {
  const { state, inventory, dialogueManager, scheduler, debugEventLog, events } = deps;

  state.onStateChange((type, key, value) => {
    if (type === "flag") {
      debugEventLog.log("flag", `Flag "${key}" = ${value}`);
    } else if (type === "objectState") {
      debugEventLog.log("variable", `Object state "${key}" = ${JSON.stringify(value)}`);
    } else if (type === "roomVar") {
      debugEventLog.log("variable", `Room var "${key}" = ${JSON.stringify(value)}`);
    } else {
      debugEventLog.log("variable", `Variable "${key}" = ${JSON.stringify(value)}`);
    }
  });

  inventory.onItemChange((actorId, itemId, action) => {
    debugEventLog.log("inventory", `${action === "add" ? "Added" : "Removed"} "${itemId}" ${action === "add" ? "to" : "from"} ${actorId}`);
  });

  dialogueManager.onDialogueEvent((_event, detail) => {
    debugEventLog.log("dialogue", detail);
  });

  scheduler.onScriptLifecycle((event, hookId) => {
    debugEventLog.log("script", `Script "${hookId}" ${event}`);
  });

  debugEventLog.subscribeToEventBus(events);
}

export function getDebugInspectedEntity(deps: DebugBridgeDeps): DebugInspectedEntity | null {
  const { ui, roomManager, registry } = deps;
  const entityId = ui.getState().debugInspectedEntityId;
  if (!entityId) return null;

  const actor = roomManager.getActor(entityId);
  if (actor) {
    const def = registry.getActor(entityId);
    return {
      type: "actor",
      id: entityId,
      name: def?.name ?? entityId,
      properties: {
        x: Math.round(actor.x),
        y: Math.round(actor.y),
        facing: actor.facing,
        visible: actor.visible,
        scale: actor.scale,
        animationState: actor.animationState,
        walking: actor.isMoving(),
        talking: actor.talking,
        busy: actor.busy,
        controlEnabled: actor.controlEnabled,
        roomId: actor.roomId,
        speed: def?.movementSpeed ?? 120,
        isPlayer: def?.isPlayer ?? false,
        verbHandlers: def?.verbHandlers ? Object.keys(def.verbHandlers) : [],
      },
    };
  }

  const obj = roomManager.getObject(entityId);
  if (obj) {
    const def = registry.getObject(entityId);
    const bounds = obj.getBounds();
    return {
      type: "object",
      id: entityId,
      name: def?.name ?? entityId,
      properties: {
        x: obj.x,
        y: obj.y,
        visible: obj.visible,
        enabled: obj.enabled,
        roomId: obj.roomId,
        bounds: `${bounds.width}×${bounds.height} at (${bounds.x},${bounds.y})`,
        state: { ...obj.state },
        verbHandlers: def?.verbHandlers ? Object.keys(def.verbHandlers) : [],
        spritePath: def?.spritePath ?? "(none)",
      },
    };
  }

  const hotspots = roomManager.getAllHotspots();
  const hs = hotspots.find((h) => h.id === entityId);
  if (hs) {
    const b = hs.getBounds();
    return {
      type: "hotspot",
      id: entityId,
      name: hs.name,
      properties: {
        enabled: hs.enabled,
        bounds: `${b.width}×${b.height} at (${b.x},${b.y})`,
        description: hs.description ?? "(none)",
      },
    };
  }

  const exits = roomManager.getAllExits();
  const ex = exits.find((e) => e.id === entityId);
  if (ex) {
    const b = ex.getBounds();
    return {
      type: "exit",
      id: entityId,
      name: ex.label ?? entityId,
      properties: {
        targetRoomId: ex.targetRoomId,
        targetSpawnPointId: ex.targetSpawnPointId ?? "(default)",
        enabled: ex.enabled,
        bounds: `${b.width}×${b.height} at (${b.x},${b.y})`,
      },
    };
  }

  return null;
}

export function debugSetFlag(deps: DebugBridgeDeps, key: string, value: boolean): void {
  deps.state.setFlag(key, value);
}

export function debugSetVariable(deps: DebugBridgeDeps, key: string, value: boolean | number | string): void {
  deps.state.setVariable(key, value);
}

export function debugSetRoomVar(deps: DebugBridgeDeps, roomId: string, key: string, value: boolean | number | string): void {
  deps.state.setRoomLocalVariable(roomId, key, value);
}

export function debugSetObjectState(deps: DebugBridgeDeps, objectId: string, key: string, value: unknown): void {
  deps.state.setObjectState(objectId, key, value);
}

export async function debugJumpToRoom(deps: DebugBridgeDeps, roomId: string, spawnPointId?: string): Promise<void> {
  const roomDef = deps.registry.getRoom(roomId);
  if (!roomDef) {
    console.warn(`[Engine] debugJumpToRoom: room "${roomId}" not found`);
    return;
  }
  deps.debugEventLog.log("room", `Debug jump to room: ${roomId}`);
  await deps.loadRoom(roomId, spawnPointId);
}

export async function debugReloadRoom(deps: DebugBridgeDeps): Promise<void> {
  const currentRoom = deps.roomManager.getCurrentRoom();
  if (!currentRoom) return;
  deps.debugEventLog.log("room", `Debug reload room: ${currentRoom.id}`);
  await deps.loadRoom(currentRoom.id);
}

export function debugGiveItem(deps: DebugBridgeDeps, actorId: string, itemId: string): void {
  deps.inventory.addItem(actorId, itemId);
  deps.debugEventLog.log("inventory", `Debug give item: ${itemId} → ${actorId}`);
}

export function debugRemoveItem(deps: DebugBridgeDeps, actorId: string, itemId: string): void {
  deps.inventory.removeItem(actorId, itemId);
  deps.debugEventLog.log("inventory", `Debug remove item: ${itemId} from ${actorId}`);
}

export async function debugRunScript(deps: DebugBridgeDeps, scriptName: string): Promise<void> {
  const currentRoom = deps.roomManager.getCurrentRoom();
  deps.debugEventLog.log("script", `Debug run script: ${scriptName}`);
  await deps.scriptRunner.runHook(scriptName, {
    currentRoomId: currentRoom?.id ?? "",
    verb: "walk",
    currentActorId: null,
    currentTargetId: null,
    currentTargetType: null,
  }, { ownership: "global", ownerId: null });
}

export function debugCancelScript(deps: DebugBridgeDeps, instanceId: string): void {
  deps.debugEventLog.log("script", `Debug cancel script instance: ${instanceId}`);
  deps.scheduler.cancelById(instanceId, true);
}
