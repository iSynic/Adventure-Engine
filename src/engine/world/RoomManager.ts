import type { RoomDefinition, GameConfig, Point, Direction, ActorDefinition, ConditionExpression, HitTarget } from "../core/types";
import type { Registry } from "../core/Registry";
import type { AssetLoader } from "../assets/AssetLoader";
import type { StateStore } from "../state/StateStore";
import type { AudioManager } from "../audio/AudioManager";
import type { ScriptRunner } from "../scripting/ScriptRunner";
import type { InventorySystem } from "../inventory/InventorySystem";
import { evaluateCondition } from "../state/ConditionEvaluator";
import { ActorInstance } from "./Actor";
import { ObjectEntity } from "./ObjectEntity";
import { HotspotInstance } from "./Hotspot";
import { ExitRegion } from "./ExitRegion";

export class RoomManager {
  private currentRoom: RoomDefinition | null = null;
  private actors = new Map<string, ActorInstance>();
  private objects = new Map<string, ObjectEntity>();
  private hotspots = new Map<string, HotspotInstance>();
  private exits: ExitRegion[] = [];
  private onRoomChanged?: (roomId: string) => void;
  private updateHookRunning = false;
  private updateHookRoomId: string | null = null;

  private inventory: InventorySystem | null = null;

  constructor(
    private registry: Registry,
    private assetLoader: AssetLoader,
    private state: StateStore,
    private audio: AudioManager,
    private scriptRunner: ScriptRunner
  ) {}

  setInventory(inv: InventorySystem): void {
    this.inventory = inv;
  }

  private evalCondition(cond: ConditionExpression | undefined): boolean {
    if (!cond) return true;
    return evaluateCondition(cond, this.state, this.inventory ?? undefined);
  }

  onRoomChange(cb: (roomId: string) => void): void {
    this.onRoomChanged = cb;
  }

  collectRoomAssetPaths(def: RoomDefinition): string[] {
    const paths: string[] = [];
    if (def.backgroundPath) paths.push(def.backgroundPath);
    if (def.maskPath) paths.push(def.maskPath);
    if (def.parallaxLayers) {
      for (const layer of def.parallaxLayers) {
        if (layer.imagePath) paths.push(layer.imagePath);
      }
    }
    if (def.ambientAudioPath) paths.push(def.ambientAudioPath);
    const objectIds = def.objectIds ?? [];
    for (const objId of objectIds) {
      const objDef = this.registry.getObject(objId);
      if (!objDef) continue;
      if (objDef.spritePath) paths.push(objDef.spritePath);
      if (objDef.stateSprites) {
        for (const entry of objDef.stateSprites) {
          paths.push(entry.spritePath);
        }
      }
    }
    if (def.actorIds) {
      for (const actorId of def.actorIds) {
        const actorDef = this.registry.getActor(actorId);
        if (!actorDef) continue;
        if (actorDef.spritePath) paths.push(actorDef.spritePath);
        if (actorDef.animations) {
          for (const dir of Object.keys(actorDef.animations)) {
            const dirAnims = actorDef.animations[dir];
            for (const state of Object.keys(dirAnims)) {
              const anim = dirAnims[state as keyof typeof dirAnims];
              if (anim?.frames) {
                for (const frame of anim.frames) {
                  if (frame.imagePath) paths.push(frame.imagePath);
                }
              }
            }
          }
        }
      }
    }
    return [...new Set(paths)];
  }

  async preloadRoom(roomId: string): Promise<void> {
    const def = this.registry.getRoom(roomId);
    if (!def) return;
    const paths = def.assetManifest ?? this.collectRoomAssetPaths(def);
    const images = paths.filter((p) => !p.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i));
    const audio = paths.filter((p) => p.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i));
    await this.assetLoader.preload({ images, audio });
  }

  async loadRoom(
    roomId: string,
    spawnPointId?: string,
    transitionFromRoomId?: string
  ): Promise<void> {
    const oldRoomId = this.currentRoom?.id;
    if (this.currentRoom) {
      await this.unloadCurrentRoom(transitionFromRoomId);
    }

    const def = this.registry.getRoom(roomId);
    if (!def) throw new Error(`[RoomManager] Room not found: ${roomId}`);

    this.currentRoom = def;
    this.updateHookRunning = false;

    const manifestPaths = def.assetManifest ?? this.collectRoomAssetPaths(def);
    this.assetLoader.registerRoomAssets(roomId, manifestPaths);
    if (oldRoomId && oldRoomId !== roomId) {
      this.assetLoader.releaseRoom(oldRoomId);
    }

    await this.assetLoader.loadImage(def.backgroundPath);
    if (def.maskPath) await this.assetLoader.loadImage(def.maskPath);

    if (def.parallaxLayers) {
      for (const layer of def.parallaxLayers) {
        if (layer.imagePath) {
          await this.assetLoader.loadImage(layer.imagePath).catch(() => {});
        }
      }
    }

    this.objects.clear();
    this.hotspots.clear();
    this.exits = [];

    if (def.hotspots) {
      for (const hs of def.hotspots) {
        this.hotspots.set(hs.id, new HotspotInstance(hs));
      }
    }

    if (def.exits) {
      for (const ex of def.exits) {
        this.exits.push(new ExitRegion(ex));
      }
    }

    const objectIds = def.objectIds ?? [];
    for (const objId of objectIds) {
      const objDef = this.registry.getObject(objId);
      if (!objDef) {
        console.warn(`[RoomManager] Object not found: ${objId}`);
        continue;
      }
      const entity = new ObjectEntity(objDef);
      entity.roomId = roomId;

      const savedObjState = this.state.getObjectRuntimeState(objId);
      if (savedObjState) {
        entity.applyRuntimeState(savedObjState);
        entity.roomId = roomId;
      } else {
        const stateObj = this.state.getObjectState(objId, "_visible");
        const visible = stateObj !== undefined ? (stateObj as boolean) : (objDef.visible ?? true);
        entity.visible = visible;

        const storedStates = this.state.getState().objectStates[objId];
        if (storedStates) {
          for (const [k, v] of Object.entries(storedStates)) {
            if (k !== "_visible") {
              entity.state[k] = v;
            }
          }
        }
      }

      if (objDef.spritePath) {
        await this.assetLoader.loadImage(objDef.spritePath).catch(() => {});
      }
      if (objDef.stateSprites) {
        for (const entry of objDef.stateSprites) {
          await this.assetLoader.loadImage(entry.spritePath).catch(() => {});
        }
      }
      this.objects.set(objId, entity);
    }

    if (def.actorIds) {
      for (const actorId of def.actorIds) {
        if (actorId === "player") continue;
        const actorDef = this.registry.getActor(actorId);
        if (!actorDef) continue;
        const actor = new ActorInstance(actorDef);
        actor.roomId = roomId;
        const savedRuntimeState = this.state.getActorRuntimeState(actorId);
        if (savedRuntimeState) {
          actor.applyRuntimeState(savedRuntimeState);
          actor.roomId = roomId;
        } else {
          const savedPos = this.state.getActorPosition(actorId);
          const savedFacing = this.state.getActorFacing(actorId);
          if (savedPos) {
            actor.x = savedPos.x;
            actor.y = savedPos.y;
          }
          if (savedFacing) {
            actor.facing = savedFacing;
          }
        }
        if (actorDef.spritePath) {
          await this.assetLoader.loadImage(actorDef.spritePath).catch(() => {});
        }
        await this.preloadActorAnimations(actorDef);
        this.actors.set(actorId, actor);
      }
    }

    if (def.ambientAudioPath) {
      this.audio.playAmbient(def.ambientAudioPath);
    } else {
      this.audio.stopAmbient();
    }

    this.onRoomChanged?.(roomId);
    console.log(`[RoomManager] Loaded room: ${roomId}`);
  }

  private async unloadCurrentRoom(fromRoomId?: string): Promise<void> {
    if (!this.currentRoom) return;
    if (this.currentRoom.onExit) {
      await this.scriptRunner.runHook(this.currentRoom.onExit, {
        currentRoomId: this.currentRoom.id,
        verb: "walk",
        currentActorId: null,
        currentTargetId: null,
        currentTargetType: null,
      }, { ownership: "room", ownerId: this.currentRoom.id });
    }
    this.actors.clear();
  }

  async preloadActorAnimations(actorDef: ActorDefinition): Promise<void> {
    if (!actorDef.animations) return;
    const paths: string[] = [];
    for (const dir of Object.keys(actorDef.animations)) {
      const dirAnims = actorDef.animations[dir];
      for (const state of Object.keys(dirAnims)) {
        const anim = dirAnims[state as keyof typeof dirAnims];
        if (anim?.frames) {
          for (const frame of anim.frames) {
            if (frame.imagePath && !paths.includes(frame.imagePath)) {
              paths.push(frame.imagePath);
            }
          }
        }
      }
    }
    await this.assetLoader.preload({ images: paths });
  }

  placeActorInRoom(actor: ActorInstance, spawnPointId?: string): void {
    const room = this.currentRoom;
    if (!room) return;

    if (spawnPointId && room.spawnPoints) {
      const sp = room.spawnPoints.find((s) => s.id === spawnPointId);
      if (sp) {
        actor.x = sp.x;
        actor.y = sp.y;
        if (sp.facing) actor.facing = sp.facing;
      }
    }

    this.actors.set(actor.id, actor);
  }

  getActor(id: string): ActorInstance | undefined {
    return this.actors.get(id);
  }

  getAllActors(): ActorInstance[] {
    return Array.from(this.actors.values());
  }

  getObject(id: string): ObjectEntity | undefined {
    return this.objects.get(id);
  }

  getAllObjects(): ObjectEntity[] {
    return Array.from(this.objects.values());
  }

  getAllHotspots(): HotspotInstance[] {
    return Array.from(this.hotspots.values());
  }

  getAllExits(): ExitRegion[] {
    return this.exits;
  }

  getCurrentRoom(): RoomDefinition | null {
    return this.currentRoom;
  }

  update(deltaTime: number): void {
    const room = this.currentRoom;
    for (const actor of this.actors.values()) {
      actor.update(deltaTime);
      if (room) {
        actor.updateScaleForRoom(room);
        actor.clampToWalkboxMargin(room);
      }
      this.state.setActorPosition(actor.id, { x: actor.x, y: actor.y });
      this.state.setActorFacing(actor.id, actor.facing);
    }

    for (const obj of this.objects.values()) {
      const storedStates = this.state.getState().objectStates[obj.id];
      if (storedStates) {
        for (const [k, v] of Object.entries(storedStates)) {
          if (k === "_visible") {
            obj.visible = v as boolean;
          } else {
            obj.state[k] = v;
          }
        }
      }
      const visCond = obj.definition.visibilityCondition;
      if (visCond) {
        obj.visible = this.evalCondition(visCond);
      }
      const intCond = obj.definition.interactionCondition;
      if (intCond) {
        obj.interactionEnabled = this.evalCondition(intCond);
      }
    }

    for (const hs of this.hotspots.values()) {
      const visCond = hs.definition.visibilityCondition;
      const intCond = hs.definition.interactionCondition;
      if (visCond || intCond) {
        const visOk = visCond ? this.evalCondition(visCond) : true;
        const intOk = intCond ? this.evalCondition(intCond) : true;
        hs.enabled = visOk && intOk;
      }
    }

    for (const ex of this.exits) {
      const visCond = ex.definition.visibilityCondition;
      const intCond = ex.definition.interactionCondition;
      if (visCond || intCond) {
        const visOk = visCond ? this.evalCondition(visCond) : true;
        const intOk = intCond ? this.evalCondition(intCond) : true;
        ex.enabled = visOk && intOk;
      }
    }

    if (this.currentRoom?.onUpdate && !this.updateHookRunning) {
      this.updateHookRunning = true;
      const roomId = this.currentRoom.id;
      this.updateHookRoomId = roomId;
      const clearFlag = () => {
        if (this.updateHookRoomId === roomId) {
          this.updateHookRunning = false;
        }
      };
      this.scriptRunner.runHook(this.currentRoom.onUpdate, {
        currentRoomId: roomId,
        verb: "walk",
        currentActorId: null,
        currentTargetId: null,
        currentTargetType: null,
      }, { ownership: "room", ownerId: roomId }).then(clearFlag, clearFlag);
    }
  }

  getHitTarget(
    x: number,
    y: number
  ): HitTarget | null {
    for (const actor of this.actors.values()) {
      if (!actor.visible) continue;
      const hw = (actor.getSpriteWidth() * actor.scale) / 2;
      const hh = actor.getSpriteHeight() * actor.scale;
      if (
        x >= actor.x - hw &&
        x <= actor.x + hw &&
        y >= actor.y - hh &&
        y <= actor.y
      ) {
        return { type: "actor", id: actor.id };
      }
    }

    for (const obj of this.objects.values()) {
      if (!obj.visible || !obj.enabled || !obj.interactionEnabled) continue;
      if (obj.containsPoint(x, y)) {
        return {
          type: "object",
          id: obj.id,
          cursorOverride: obj.definition.cursorOverride,
          affordance: obj.definition.affordance,
        };
      }
    }

    for (const hs of this.hotspots.values()) {
      if (!hs.enabled) continue;
      if (hs.containsPoint(x, y)) {
        return { type: "hotspot", id: hs.id };
      }
    }

    for (const ex of this.exits) {
      if (!ex.enabled) continue;
      if (ex.containsPoint(x, y)) {
        return { type: "exit", id: ex.id };
      }
    }

    return null;
  }
}
