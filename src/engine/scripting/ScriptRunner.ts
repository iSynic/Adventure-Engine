import type { VerbType, Direction, Point, AnimationState, ConditionExpression, WaitReason } from "../core/types";
import type { StateStore } from "../state/StateStore";
import type { InventorySystem } from "../inventory/InventorySystem";
import type { UIManager } from "../ui/UIManager";
import type { AudioManager } from "../audio/AudioManager";
import type { InputManager } from "../input/InputManager";
import type { RoomManager } from "../world/RoomManager";
import type { ScriptScheduler, ScheduleOptions } from "./ScriptScheduler";
import type { ScriptInstance } from "./ScriptInstance";
import type { StateWatcher } from "../state/StateWatcher";
import type { EventBus, EngineEventMap, EngineEventName } from "../core/EventBus";
import { evaluateCondition } from "../state/ConditionEvaluator";

export type ScriptHandlerFn = (ctx: ScriptContext) => void | Promise<void>;

export interface PlayAnimationOptions {
  waitForCompletion?: boolean;
  loop?: boolean;
}

export interface ScriptContext {
  state: StateStore;
  inventory: InventorySystem;
  ui: UIManager;
  audio: AudioManager;
  currentActorId: string | null;
  currentTargetId: string | null;
  currentTargetType: "object" | "actor" | "hotspot" | "exit" | "item" | null;
  currentRoomId: string;
  verb: VerbType;
  secondaryTargetId?: string | null;
  gotoRoom: (roomId: string, spawnPointId?: string) => void;
  say: (text: string) => void;
  setFlag: (key: string, value: boolean) => void;
  getFlag: (key: string) => boolean;
  setVar: (key: string, value: boolean | number | string) => void;
  getVar: (key: string) => boolean | number | string | undefined;
  giveItem: (actorId: string, itemId: string) => void;
  removeItem: (actorId: string, itemId: string) => void;
  hasItem: (actorId: string, itemId: string) => boolean;
  fadeOut: (ms?: number) => Promise<void>;
  fadeIn: (ms?: number) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  walkActorTo: (actorId: string, x: number, y: number) => Promise<void>;
  faceActor: (actorId: string, direction: Direction) => void | Promise<void>;
  sayBlocking: (actorId: string, text: string) => Promise<void>;
  lockInput: () => void;
  unlockInput: () => void;
  startDialogue: (treeId: string) => Promise<void>;
  beginCutscene: () => void;
  endCutscene: () => void;
  suspendPlayerInput: () => void;
  resumePlayerInput: () => void;
  isInCutscene: () => boolean;
  waitForSignal: (signalName: string) => Promise<void>;
  emitSignal: (signalName: string) => void;
  scheduleScript: (hookId: string, opts?: ScheduleOptions) => void;
  playAnimation: (actorId: string, state: AnimationState, options?: PlayAnimationOptions) => void | Promise<void>;
  setAnimationOverride: (actorId: string, state: AnimationState) => void;
  clearAnimationOverride: (actorId: string) => void;
  evaluate: (condition: ConditionExpression | string) => boolean;
  objectState: (objectId: string, key: string) => unknown;
  setObjectState: (objectId: string, key: string, value: unknown) => void;
  setObjectPrimaryState: (objectId: string, stateIndex: number) => void;
  roomVar: (roomId: string, key: string) => boolean | number | string | undefined;
  setRoomVar: (roomId: string, key: string, value: boolean | number | string) => void;
  incrementVar: (key: string, amount?: number) => void;
  registerWatcher: (id: string, condition: ConditionExpression, scriptId: string, once?: boolean) => void;
  unregisterWatcher: (id: string) => void;
  on: <K extends EngineEventName>(event: K, handler: (payload: EngineEventMap[K]) => void) => void;
  off: <K extends EngineEventName>(event: K, handler: (payload: EngineEventMap[K]) => void) => void;
}

export type PartialScriptContext = Omit<
  ScriptContext,
  | "state"
  | "inventory"
  | "ui"
  | "audio"
  | "gotoRoom"
  | "say"
  | "setFlag"
  | "getFlag"
  | "setVar"
  | "getVar"
  | "giveItem"
  | "removeItem"
  | "hasItem"
  | "fadeOut"
  | "fadeIn"
  | "wait"
  | "walkActorTo"
  | "faceActor"
  | "sayBlocking"
  | "lockInput"
  | "unlockInput"
  | "startDialogue"
  | "beginCutscene"
  | "endCutscene"
  | "suspendPlayerInput"
  | "resumePlayerInput"
  | "isInCutscene"
  | "waitForSignal"
  | "emitSignal"
  | "scheduleScript"
  | "playAnimation"
  | "setAnimationOverride"
  | "clearAnimationOverride"
  | "evaluate"
  | "objectState"
  | "setObjectState"
  | "setObjectPrimaryState"
  | "roomVar"
  | "setRoomVar"
  | "incrementVar"
  | "registerWatcher"
  | "unregisterWatcher"
  | "on"
  | "off"
>;

// Scripts may block on player input (click-to-advance dialogue), so the timeout
// must be long enough to accommodate multiple speech lines without clicking.
// Allow up to 60 minutes total per hook.
const SCRIPT_TIMEOUT_MS = 3_600_000;

export class ScriptRunner {
  private handlers = new Map<string, ScriptHandlerFn>();
  private gotoRoomFn: (roomId: string, spawnPointId?: string) => void = () => {};
  private fadeOutFn: (ms?: number) => Promise<void> = () => Promise.resolve();
  private fadeInFn: (ms?: number) => Promise<void> = () => Promise.resolve();
  private startDialogueFn: (treeId: string) => Promise<void> = () => Promise.resolve();

  private state!: StateStore;
  private inventory!: InventorySystem;
  private ui!: UIManager;
  private audio!: AudioManager;
  private inputManager!: InputManager;
  private roomManager!: RoomManager;
  private scheduler: ScriptScheduler | null = null;
  private stateWatcher: StateWatcher | null = null;
  private eventBus: EventBus<EngineEventMap> | null = null;

  initialize(
    state: StateStore,
    inventory: InventorySystem,
    ui: UIManager,
    audio: AudioManager,
    gotoRoom: (roomId: string, spawnPointId?: string) => void,
    fadeOut?: (ms?: number) => Promise<void>,
    fadeIn?: (ms?: number) => Promise<void>,
    inputManager?: InputManager,
    roomManager?: RoomManager,
    startDialogue?: (treeId: string) => Promise<void>
  ): void {
    this.state = state;
    this.inventory = inventory;
    this.ui = ui;
    this.audio = audio;
    this.gotoRoomFn = gotoRoom;
    if (fadeOut) this.fadeOutFn = fadeOut;
    if (fadeIn) this.fadeInFn = fadeIn;
    if (inputManager) this.inputManager = inputManager;
    if (roomManager) this.roomManager = roomManager;
    if (startDialogue) this.startDialogueFn = startDialogue;
  }

  setScheduler(scheduler: ScriptScheduler): void {
    this.scheduler = scheduler;
  }

  setStateWatcher(watcher: StateWatcher): void {
    this.stateWatcher = watcher;
  }

  setEventBus(bus: EventBus<EngineEventMap>): void {
    this.eventBus = bus;
  }

  register(id: string, fn: ScriptHandlerFn): void {
    this.handlers.set(id, fn);
  }

  registerMany(scripts: Record<string, ScriptHandlerFn>): void {
    for (const [id, fn] of Object.entries(scripts)) {
      this.register(id, fn);
    }
  }

  getRegisteredHookNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  private trackWait<T>(inst: ScriptInstance | null, reason: WaitReason, promise: Promise<T>, data?: unknown): Promise<T> {
    if (inst) inst.setWaiting(reason, data);
    return promise.finally(() => {
      if (inst) inst.clearWait();
    });
  }

  private buildContext(partial: PartialScriptContext, instance: ScriptInstance | null): { ctx: ScriptContext; cleanup: () => void } {
    const subscriptions: Array<{ event: EngineEventName; handler: (payload: EngineEventMap[EngineEventName]) => void }> = [];
    const bus = this.eventBus;
    const inst = instance;

    const ctx: ScriptContext = {
      ...partial,

      // ─── Subsystems ───────────────────────────────────────────────────────
      state: this.state,
      inventory: this.inventory,
      ui: this.ui,
      audio: this.audio,

      // ─── State / flags / variables / inventory ────────────────────────────
      gotoRoom: this.gotoRoomFn,
      say: (text: string) => this.ui.showMessage(text),
      setFlag: (key, val) => this.state.setFlag(key, val),
      getFlag: (key) => this.state.getFlag(key),
      setVar: (key, val) => this.state.setVariable(key, val),
      getVar: (key) => this.state.getVariable(key),
      giveItem: (actorId, itemId) => this.inventory.addItem(actorId, itemId),
      removeItem: (actorId, itemId) => this.inventory.removeItem(actorId, itemId),
      hasItem: (actorId, itemId) => this.inventory.hasItem(actorId, itemId),

      // ─── Transitions & timing ─────────────────────────────────────────────
      fadeOut: (ms?: number) => this.trackWait(inst, "fade", this.fadeOutFn(ms), { direction: "out", ms }),
      fadeIn: (ms?: number) => this.trackWait(inst, "fade", this.fadeInFn(ms), { direction: "in", ms }),
      wait: (ms: number) => this.waitImpl(inst, ms),

      // ─── Actor movement / speech ──────────────────────────────────────────
      walkActorTo: (actorId: string, x: number, y: number) => this.walkActorToImpl(inst, actorId, x, y),
      faceActor: (actorId: string, direction: Direction) => this.faceActorImpl(inst, actorId, direction),
      sayBlocking: (actorId: string, text: string) => this.sayBlockingImpl(inst, actorId, text),

      // ─── Input / cutscene / dialogue / signals ────────────────────────────
      lockInput: () => this.lockInputImpl(),
      unlockInput: () => this.unlockInputImpl(),
      startDialogue: (treeId: string) => this.startDialogueImpl(inst, treeId),
      beginCutscene: () => this.beginCutsceneImpl(),
      endCutscene: () => this.endCutsceneImpl(),
      suspendPlayerInput: () => this.lockInputImpl(),
      resumePlayerInput: () => this.unlockInputImpl(),
      isInCutscene: () => this.scheduler?.inCutscene ?? false,
      waitForSignal: (name: string) => this.waitForSignalImpl(inst, name),
      emitSignal: (name: string) => this.emitSignalImpl(name),
      scheduleScript: (hookId: string, opts?: ScheduleOptions) => this.scheduleScriptImpl(hookId, partial, opts),

      // ─── Animation / object state / room vars / watchers ──────────────────
      playAnimation: (actorId: string, state: AnimationState, options?: PlayAnimationOptions) =>
        this.playAnimationImpl(inst, actorId, state, options),
      setAnimationOverride: (actorId: string, state: AnimationState) =>
        this.setAnimationOverrideImpl(actorId, state),
      clearAnimationOverride: (actorId: string) =>
        this.clearAnimationOverrideImpl(actorId),
      evaluate: (condition: ConditionExpression | string) =>
        evaluateCondition(condition, this.state, this.inventory),
      objectState: (objectId: string, key: string) =>
        this.state.getObjectState(objectId, key),
      setObjectState: (objectId: string, key: string, value: unknown) =>
        this.state.setObjectState(objectId, key, value),
      setObjectPrimaryState: (objectId: string, stateIndex: number) =>
        this.state.setObjectPrimaryState(objectId, stateIndex),
      roomVar: (roomId: string, key: string) =>
        this.state.getRoomLocalVariable(roomId, key),
      setRoomVar: (roomId: string, key: string, value: boolean | number | string) =>
        this.state.setRoomLocalVariable(roomId, key, value),
      incrementVar: (key: string, amount?: number) =>
        this.state.incrementVariable(key, amount),
      registerWatcher: (id: string, condition: ConditionExpression, scriptId: string, once?: boolean) => {
        this.stateWatcher?.register(id, condition, scriptId, once ?? false, this.state, this.inventory);
      },
      unregisterWatcher: (id: string) => {
        this.stateWatcher?.unregister(id);
      },

      // ─── Event bus subscriptions ──────────────────────────────────────────
      on: <K extends EngineEventName>(event: K, handler: (payload: EngineEventMap[K]) => void) => {
        if (bus) {
          bus.on(event, handler);
          subscriptions.push({ event, handler });
        }
      },
      off: <K extends EngineEventName>(event: K, handler: (payload: EngineEventMap[K]) => void) => {
        if (bus) {
          bus.off(event, handler);
          const idx = subscriptions.findIndex((s) => s.event === event && s.handler === handler);
          if (idx >= 0) subscriptions.splice(idx, 1);
        }
      },
    };

    const cleanup = () => {
      for (const sub of subscriptions) {
        bus?.off(sub.event, sub.handler);
      }
      subscriptions.length = 0;
    };

    return { ctx, cleanup };
  }

  private waitImpl(inst: ScriptInstance | null, ms: number): Promise<void> {
    const p = new Promise<void>((resolve) => setTimeout(resolve, ms));
    return this.trackWait(inst, "timer", p, { ms });
  }

  private walkActorToImpl(inst: ScriptInstance | null, actorId: string, x: number, y: number): Promise<void> {
    const p = new Promise<void>((resolve, reject) => {
      if (!this.roomManager) {
        reject(new Error("[ScriptRunner] roomManager not available for walkActorTo"));
        return;
      }
      const actor = this.roomManager.getActor(actorId);
      if (!actor) {
        reject(new Error(`[ScriptRunner] Actor not found: ${actorId}`));
        return;
      }
      const room = this.roomManager.getCurrentRoom();
      if (!room) {
        reject(new Error("[ScriptRunner] No current room for walkActorTo"));
        return;
      }

      actor.moveTo({ x, y }, room);

      if (!actor.isMoving()) {
        resolve();
        return;
      }

      const checkInterval = 16;
      const check = () => {
        if (!actor.isMoving()) {
          resolve();
          return;
        }
        setTimeout(check, checkInterval);
      };
      setTimeout(check, checkInterval);
    });
    return this.trackWait(inst, "actor-movement", p, { actorId, x, y });
  }

  private faceActorImpl(inst: ScriptInstance | null, actorId: string, direction: Direction): void | Promise<void> {
    if (!this.roomManager) return;
    const actor = this.roomManager.getActor(actorId);
    if (!actor) return;

    if (actor.facing === direction) return;

    const hasFaceAnim = actor.definition.animations !== undefined &&
      this.hasAnimForState(actor, "face");

    if (hasFaceAnim) {
      const p = new Promise<void>((resolve) => {
        actor.playAnimationOneShot("face", "scripted", "idle", () => {
          actor.facing = direction;
          resolve();
        });
      });
      return this.trackWait(inst, "animation", p, { actorId, animation: "face" });
    }

    actor.facing = direction;
  }

  private hasAnimForState(actor: ReturnType<RoomManager["getActor"]>, state: AnimationState): boolean {
    if (!actor || !actor.definition.animations) return false;
    const anims = actor.definition.animations;
    for (const dir of Object.keys(anims)) {
      const a = anims[dir][state];
      if (a && a.frames.length > 0) return true;
    }
    return false;
  }

  private sayBlockingImpl(inst: ScriptInstance | null, actorId: string, text: string): Promise<void> {
    // Always require click to advance. Infinity duration so UIManager never
    // auto-clears the bubble/message; the dismiss callback fires when the player
    // clicks (even during a locked cutscene — clicks still propagate to the
    // bubble/message dismiss path in EngineInputBridge).

    let usedBubble = false;
    let actor: ReturnType<RoomManager["getActor"]> | null = null;
    let preSpeechState: AnimationState = "idle";
    if (this.roomManager) {
      actor = this.roomManager.getActor(actorId);
      if (actor) {
        preSpeechState = actor.animationState;
        this.ui.showSpeechBubble(actorId, text, actor.x, actor.y, Infinity);
        usedBubble = true;
        actor.talking = true;
        actor.setAnimation("talk", "scripted");
      } else {
        this.ui.showMessage(text, Infinity);
      }
    } else {
      this.ui.showMessage(text, Infinity);
    }

    this.ui.setSkippable(true);

    const p = new Promise<void>((resolve) => {
      const cleanup = () => {
        this.ui.clearDismissCallback();
        if (usedBubble) {
          this.ui.clearSpeechBubble();
        } else {
          this.ui.clearMessage();
        }
        if (actor) {
          actor.talking = false;
          const restoreState = (preSpeechState === "walk" && !actor.isMoving()) ? "idle" : preSpeechState;
          actor.releaseAnimation(restoreState);
        }
        resolve();
      };

      // Click-to-advance: no auto-timer. The engine waits until the player
      // clicks (which fires dismissBubble/dismissMessage → this callback).
      this.ui.registerDismissCallback(cleanup);
    });
    return this.trackWait(inst, "dialogue-complete", p, { actorId, text: text.slice(0, 60) });
  }

  private startDialogueImpl(inst: ScriptInstance | null, treeId: string): Promise<void> {
    const p = this.startDialogueFn(treeId);
    return this.trackWait(inst, "dialogue-complete", p, { treeId });
  }

  private playAnimationImpl(
    inst: ScriptInstance | null,
    actorId: string,
    state: AnimationState,
    options?: PlayAnimationOptions
  ): void | Promise<void> {
    if (!this.roomManager) return;
    const actor = this.roomManager.getActor(actorId);
    if (!actor) return;

    const loop = options?.loop ?? false;
    const waitForCompletion = options?.waitForCompletion ?? false;

    if (loop) {
      actor.setAnimation(state, "scripted");
      return;
    }

    if (waitForCompletion) {
      const p = new Promise<void>((resolve) => {
        actor.playAnimationOneShot(state, "scripted", undefined, resolve);
      });
      return this.trackWait(inst, "animation", p, { actorId, animation: state });
    }

    actor.playAnimationOneShot(state, "scripted");
  }

  private setAnimationOverrideImpl(actorId: string, state: AnimationState): void {
    if (!this.roomManager) return;
    const actor = this.roomManager.getActor(actorId);
    if (actor) {
      actor.setAnimationOverride(state);
    }
  }

  private clearAnimationOverrideImpl(actorId: string): void {
    if (!this.roomManager) return;
    const actor = this.roomManager.getActor(actorId);
    if (actor) {
      actor.clearAnimationOverride();
    }
  }

  private lockInputImpl(): void {
    if (this.inputManager) {
      this.inputManager.lockInput();
    }
  }

  private unlockInputImpl(): void {
    if (this.inputManager) {
      this.inputManager.unlockInput();
    }
  }

  private beginCutsceneImpl(): void {
    this.lockInputImpl();
    if (this.scheduler) {
      this.scheduler.beginCutscene();
    }
  }

  private endCutsceneImpl(): void {
    this.unlockInputImpl();
    if (this.scheduler) {
      this.scheduler.endCutscene();
    }
  }

  private waitForSignalImpl(inst: ScriptInstance | null, name: string): Promise<void> {
    if (this.scheduler) {
      const p = this.scheduler.waitForSignal(name, inst ?? undefined);
      return this.trackWait(inst, "signal", p, { signal: name });
    }
    return Promise.resolve();
  }

  private emitSignalImpl(name: string): void {
    if (this.scheduler) {
      this.scheduler.emitSignal(name);
    }
  }

  private scheduleScriptImpl(hookId: string, currentPartial: PartialScriptContext, opts?: ScheduleOptions): void {
    if (this.scheduler) {
      this.scheduler.scheduleBackground(hookId, currentPartial, opts);
    } else {
      this.runHookDirect(hookId, currentPartial);
    }
  }

  async runHook(hookId: string, partial: PartialScriptContext, opts?: ScheduleOptions): Promise<void> {
    if (!this.handlers.has(hookId)) {
      return;
    }
    if (this.scheduler) {
      const instance = this.scheduler.schedule(hookId, partial, opts);
      await instance.promise.catch(() => {});
      return;
    }
    return this.runHookDirect(hookId, partial);
  }

  async runHookDirect(hookId: string, partial: PartialScriptContext, instance?: ScriptInstance): Promise<void> {
    const fn = this.handlers.get(hookId);
    if (!fn) {
      return;
    }
    const { ctx, cleanup } = this.buildContext(partial, instance ?? null);
    const wasLocked = this.inputManager?.locked ?? false;
    try {
      const result = fn(ctx);
      if (result instanceof Promise) {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`[ScriptRunner] Hook "${hookId}" timed out after ${SCRIPT_TIMEOUT_MS}ms`)), SCRIPT_TIMEOUT_MS);
        });
        try {
          await Promise.race([result, timeoutPromise]);
        } finally {
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
          }
        }
      }
    } catch (e) {
      console.error(`[ScriptRunner] Error in hook ${hookId}:`, e);
      if (!wasLocked && this.inputManager?.locked && !(this.scheduler?.inCutscene)) {
        this.inputManager.unlockInput();
        console.warn(`[ScriptRunner] Auto-unlocked input after error in hook "${hookId}"`);
      }
    } finally {
      cleanup();
    }
  }

  startDialogueTree(treeId: string): Promise<void> {
    return this.startDialogueImpl(null, treeId);
  }

  hasHandler(id: string): boolean {
    return this.handlers.has(id);
  }
}
