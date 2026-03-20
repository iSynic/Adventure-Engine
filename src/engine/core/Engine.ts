import type { GameConfig, ScriptInstanceInfo, ActorRuntimeState, ObjectRuntimeState, RoomRuntimeState, CameraRuntimeState, DialogueRuntimeState, VariableDefinition, Point } from "./types";
import type { RuntimeStorageProvider } from "../../shared/RuntimeStorageProvider";
import { resolveDisplayConfig } from "../../shared/displayConfig";
import { Registry } from "./Registry";
import { AssetLoader } from "../assets/AssetLoader";
import { StateStore } from "../state/StateStore";
import { SaveSystem } from "../state/SaveSystem";
import { RoomManager } from "../world/RoomManager";
import { InventorySystem } from "../inventory/InventorySystem";
import { AudioManager } from "../audio/AudioManager";
import { UIManager } from "../ui/UIManager";
import { ScriptRunner } from "../scripting/ScriptRunner";
import { ScriptScheduler } from "../scripting/ScriptScheduler";
import { VerbSystem } from "../interaction/VerbSystem";
import { InputManager } from "../input/InputManager";
import { Camera } from "../rendering/Camera";
import { Renderer } from "../rendering/Renderer";
import { ActorInstance } from "../world/Actor";
import { DialogueManager } from "../dialogue/DialogueManager";
import { DebugEventLog } from "../debug/DebugEventLog";
import type { DebugInspectedEntity } from "../debug/DebugState";
import { StateWatcher } from "../state/StateWatcher";
import { EventBus } from "./EventBus";
import type { EngineEventMap } from "./EventBus";

import { engineInit, engineLoadRoom, activateRoom, fadeOut, fadeIn } from "../bootstrap/EngineBootstrap";
import type { BootstrapDeps, FadeHandle, PendingRoomActivation } from "../bootstrap/EngineBootstrap";
import { setupDebugHooks, getDebugInspectedEntity, debugSetFlag, debugSetVariable, debugSetRoomVar, debugSetObjectState, debugJumpToRoom, debugReloadRoom, debugGiveItem, debugRemoveItem, debugRunScript, debugCancelScript } from "../debug/EngineDebugBridge";
import type { DebugBridgeDeps } from "../debug/EngineDebugBridge";
import { createInputBridgeState, getSetupInputHandlers, checkSentenceStale, updateCursor } from "../input/EngineInputBridge";
import type { InputBridgeDeps, InputBridgeState } from "../input/EngineInputBridge";
import { initializeVariableDefinitions, initializeStateWatchers, setupEventBusEmitters } from "../state/EngineEventWiring";
import type { EventWiringDeps } from "../state/EngineEventWiring";

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  config: GameConfig;
  scripts: Record<string, (ctx: import("../scripting/ScriptRunner").ScriptContext) => void | Promise<void>>;
  storageProvider?: RuntimeStorageProvider;
}

export class Engine {
  readonly registry: Registry;
  readonly assetLoader: AssetLoader;
  readonly state: StateStore;
  readonly saveSystem: SaveSystem;
  readonly scriptRunner: ScriptRunner;
  readonly scheduler: ScriptScheduler;
  readonly audio: AudioManager;
  readonly ui: UIManager;
  readonly inventory: InventorySystem;
  readonly roomManager: RoomManager;
  readonly verbSystem: VerbSystem;
  readonly dialogueManager: DialogueManager;
  readonly debugEventLog: DebugEventLog;
  readonly stateWatcher: StateWatcher;
  readonly input: InputManager;
  readonly camera: Camera;
  readonly renderer: Renderer;
  readonly events: EventBus<EngineEventMap>;

  private config: GameConfig;
  private player: ActorInstance | null = null;
  private running = false;
  private initialized = false;
  private lastTime = 0;
  private animFrameId = 0;
  private ctx: CanvasRenderingContext2D;
  private fadeHandle: FadeHandle = { animId: 0 };

  private pendingActivation: PendingRoomActivation | null = null;
  private inputState: InputBridgeState;
  private inputMarkInitialized: () => void;
  private cachedInputDeps: InputBridgeDeps | null = null;

  onUIUpdate?: () => void;

  constructor(options: EngineOptions) {
    const { canvas, config, scripts } = options;
    this.config = config;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("[Engine] Could not get 2D canvas context");
    this.ctx = ctx;

    this.events = new EventBus<EngineEventMap>();
    this.registry = new Registry();
    this.assetLoader = new AssetLoader();
    this.state = new StateStore();
    this.saveSystem = new SaveSystem();
    if (options.storageProvider) {
      this.saveSystem.setStorageProvider(options.storageProvider);
    }
    this.scriptRunner = new ScriptRunner();
    this.scheduler = new ScriptScheduler();
    this.audio = new AudioManager(this.assetLoader);
    this.ui = new UIManager();
    this.inventory = new InventorySystem(this.registry, this.state);
    this.roomManager = new RoomManager(
      this.registry,
      this.assetLoader,
      this.state,
      this.audio,
      this.scriptRunner
    );
    this.roomManager.setInventory(this.inventory);
    this.verbSystem = new VerbSystem(
      this.roomManager,
      this.registry,
      this.ui,
      this.scriptRunner,
      this.inventory,
      this.state
    );
    this.verbSystem.actionResolver.setConfig({
      globalFallbackScriptId: config.globalFallbackScriptId,
    });
    this.dialogueManager = new DialogueManager();
    this.debugEventLog = new DebugEventLog();
    this.stateWatcher = new StateWatcher();
    this.input = new InputManager();
    this.camera = new Camera(canvas.width, canvas.height);
    this.renderer = new Renderer(this.ctx, this.assetLoader, this.camera, this.registry, resolveDisplayConfig(config.display).pixelPerfect);

    this.saveSystem.setGameId(config.id);
    this.scriptRunner.registerMany(scripts);
    this.dialogueManager.initialize(
      this.state,
      this.inventory,
      this.ui,
      (roomId, spawnPointId) => this.loadRoom(roomId, spawnPointId)
    );
    this.dialogueManager.setRoomManager(this.roomManager);
    this.dialogueManager.setActorDefinitions(config.actors);
    this.dialogueManager.setRunScriptFn((scriptId: string) => {
      this.scriptRunner.runHook(scriptId, {
        currentActorId: this.player?.id ?? null,
        currentTargetId: null,
        currentTargetType: null,
        currentRoomId: this.state.getCurrentRoom(),
        verb: "walk" as const,
        secondaryTargetId: null,
      });
    });
    if (config.dialogueTrees) {
      this.dialogueManager.registerTrees(config.dialogueTrees);
    }
    this.scriptRunner.initialize(
      this.state,
      this.inventory,
      this.ui,
      this.audio,
      (roomId, spawnPointId) => this.loadRoom(roomId, spawnPointId),
      (ms) => this.fadeOut(ms),
      (ms) => this.fadeIn(ms),
      this.input,
      this.roomManager,
      (treeId) => this.dialogueManager.startDialogue(treeId)
    );
    this.scheduler.initialize(this.scriptRunner);
    this.scriptRunner.setScheduler(this.scheduler);
    this.scriptRunner.setStateWatcher(this.stateWatcher);

    this.registry.loadFromConfig(config);
    this.assetLoader.setAssetRoot(config.assetRoot);

    this.input.attach(canvas);

    this.inputState = createInputBridgeState();
    const { markInitialized } = getSetupInputHandlers(this.getInputBridgeDeps(), this.inputState);
    this.inputMarkInitialized = markInitialized;

    setupDebugHooks(this.getDebugBridgeDeps());

    const wiringDeps = this.getEventWiringDeps();
    initializeVariableDefinitions(config, this.state);
    initializeStateWatchers(config, wiringDeps);

    this.ui.subscribe(() => this.onUIUpdate?.());
    setupEventBusEmitters(wiringDeps);
  }

  private getBootstrapDeps(): BootstrapDeps {
    return {
      config: this.config,
      registry: this.registry,
      assetLoader: this.assetLoader,
      state: this.state,
      roomManager: this.roomManager,
      inventory: this.inventory,
      scriptRunner: this.scriptRunner,
      scheduler: this.scheduler,
      camera: this.camera,
      renderer: this.renderer,
      ui: this.ui,
      debugEventLog: this.debugEventLog,
      events: this.events,
      onUIUpdate: undefined,
    };
  }

  private getDebugBridgeDeps(): DebugBridgeDeps {
    return {
      state: this.state,
      inventory: this.inventory,
      scriptRunner: this.scriptRunner,
      scheduler: this.scheduler,
      roomManager: this.roomManager,
      registry: this.registry,
      ui: this.ui,
      dialogueManager: this.dialogueManager,
      debugEventLog: this.debugEventLog,
      events: this.events,
      getPlayerId: () => this.player?.id ?? null,
      loadRoom: (roomId, spawnPointId) => this.loadRoom(roomId, spawnPointId),
    };
  }

  private getInputBridgeDeps(): InputBridgeDeps {
    if (!this.cachedInputDeps) {
      this.cachedInputDeps = {
        input: this.input,
        ui: this.ui,
        camera: this.camera,
        roomManager: this.roomManager,
        verbSystem: this.verbSystem,
        dialogueManager: this.dialogueManager,
        debugEventLog: this.debugEventLog,
        config: this.config,
        ctx: this.ctx,
        getPlayer: () => this.player,
        loadRoom: (roomId, spawnPointId) => this.loadRoom(roomId, spawnPointId),
        quickSave: () => this.quickSave(),
        quickLoad: () => this.quickLoad(),
        getIsBusy: () => this.scheduler.inCutscene,
      };
    }
    return this.cachedInputDeps;
  }

  private getEventWiringDeps(): EventWiringDeps {
    return {
      state: this.state,
      stateWatcher: this.stateWatcher,
      inventory: this.inventory,
      scriptRunner: this.scriptRunner,
      scheduler: this.scheduler,
      dialogueManager: this.dialogueManager,
      debugEventLog: this.debugEventLog,
      verbSystem: this.verbSystem,
      events: this.events,
      getPlayerId: () => this.player?.id ?? null,
      getCurrentRoomId: () => this.state.getCurrentRoom(),
    };
  }

  async init(options?: { deferActivation?: boolean }): Promise<void> {
    this.player = await engineInit(this.getBootstrapDeps());
    this.camera.followActor(this.player.id);
    await this.loadRoom(this.config.startingRoom, undefined, { skipActivation: options?.deferActivation });
    this.initialized = true;
    this.inputMarkInitialized();
    console.log(`[Engine] Game "${this.config.title}" initialized.`);
  }

  async activateCurrentRoom(): Promise<void> {
    if (!this.pendingActivation) return;
    const pending = this.pendingActivation;
    this.pendingActivation = null;
    const deps = this.getBootstrapDeps();
    deps.onUIUpdate = () => this.onUIUpdate?.();
    await activateRoom(deps, pending);
  }

  fadeOut(ms = 300): Promise<void> {
    return fadeOut(this.renderer, ms, this.fadeHandle);
  }

  fadeIn(ms = 300): Promise<void> {
    return fadeIn(this.renderer, ms, this.fadeHandle);
  }

  async loadRoom(roomId: string, spawnPointId?: string, options?: { skipActivation?: boolean }): Promise<void> {
    const deps = this.getBootstrapDeps();
    deps.onUIUpdate = () => this.onUIUpdate?.();
    const pending = await engineLoadRoom(deps, this.player, roomId, spawnPointId, this.fadeHandle, options);
    this.pendingActivation = pending;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    cancelAnimationFrame(this.fadeHandle.animId);
    this.fadeHandle.animId = 0;
    this.input.detach();
    this.audio.stopAll();
    this.ui.dispose();
    this.scheduler.dispose();
    this.debugEventLog.dispose();
  }

  private loop(timestamp: number): void {
    if (!this.running) return;
    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();
    this.input.update();

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(deltaTime: number): void {
    this.roomManager.update(deltaTime);
    this.ui.update(deltaTime);
    this.scheduler.update(deltaTime);

    const player = this.player;
    if (player) {
      this.camera.update(
        player.x,
        player.y,
        this.roomManager.getCurrentRoom()?.width,
        this.roomManager.getCurrentRoom()?.height
      );
    }

    this.syncRuntimeState();
    updateCursor(this.getInputBridgeDeps(), this.inputState, this.inputState.lastHitType);
    checkSentenceStale(this.getInputBridgeDeps(), this.inputState);
  }

  private syncRuntimeState(): void {
    const currentRoom = this.roomManager.getCurrentRoom();
    const roomId = currentRoom?.id ?? "";

    for (const actor of this.roomManager.getAllActors()) {
      actor.roomId = roomId;
      this.state.setActorRuntimeState(actor.id, actor.getRuntimeState());
    }

    for (const obj of this.roomManager.getAllObjects()) {
      if (!obj.roomId) obj.roomId = roomId;
      const stored = this.state.getObjectRuntimeState(obj.id);
      if (stored && stored.primaryState !== obj.primaryState) {
        obj.primaryState = stored.primaryState;
      }
      this.state.setObjectRuntimeState(obj.id, obj.getRuntimeState());
    }

    this.state.setCameraState(this.camera.getRuntimeState());
    this.state.setDialogueState(this.dialogueManager.getRuntimeState());
  }

  private render(): void {
    const debugMode = this.ui.getState().debugMode;
    let pathPreview: { fromX: number; fromY: number; waypoints: Point[] } | undefined;
    if (debugMode && this.player && this.inputState.pathPreviewWaypoints.length > 0) {
      pathPreview = {
        fromX: this.player.x,
        fromY: this.player.y,
        waypoints: this.inputState.pathPreviewWaypoints,
      };
    }
    this.renderer.render(
      this.roomManager,
      this.ui,
      this.inventory,
      this.config.defaultPlayerActorId,
      debugMode,
      pathPreview
    );
  }

  quickSave(): void {
    if (!this.player || !this.roomManager.getCurrentRoom()) return;
    const room = this.roomManager.getCurrentRoom()!;
    const roomDef = this.config.rooms.find(r => r.id === room.id);
    const result = this.saveSystem.save(
      this.state,
      "quicksave",
      { x: this.player.x, y: this.player.y },
      this.player.facing,
      room.id,
      roomDef?.name ?? room.id
    );
    if (result.ok) {
      this.ui.showMessage("Game saved.");
    } else {
      this.ui.showMessage("Save failed: " + result.error);
    }
  }

  async quickLoad(): Promise<void> {
    const result = this.saveSystem.load("quicksave");
    if (!result.ok) {
      this.ui.showMessage(result.code === "NO_SAVE" ? "No save found." : result.error);
      console.warn(`[Engine] quickLoad failed: [${result.code}] ${result.error}`);
      return;
    }
    await this.applyLoadedSave(result.data);
    this.ui.showMessage("Game loaded.");
  }

  private async applyLoadedSave(data: import("./types").SaveGameData): Promise<void> {
    for (const actor of this.roomManager.getAllActors()) {
      actor.stopMoving();
    }

    this.scheduler.cancelAll(false);

    this.dialogueManager.forceReset();

    this.state.setState(data.state);

    if (this.player) {
      this.player.x = data.playerPosition.x;
      this.player.y = data.playerPosition.y;
      this.player.facing = data.playerFacing;
      this.player.roomId = data.currentRoomId;
      this.player.stopMoving();
    }

    const savedCamera = this.state.getCameraState();
    if (savedCamera) {
      this.camera.applyRuntimeState(savedCamera);
    }
    if (this.player) {
      this.camera.followActor(this.player.id);
    }

    const roomDef = this.config.rooms.find(r => r.id === data.currentRoomId);
    if (!roomDef) {
      console.error(`[Engine] Saved room "${data.currentRoomId}" not found in config. Falling back to starting room.`);
      this.ui.showMessage("Warning: saved room not found. Loading starting room.");
      await this.loadRoom(this.config.startingRoom);
      return;
    }

    try {
      await this.loadRoom(data.currentRoomId);
    } catch (e) {
      console.error(`[Engine] Failed to load saved room "${data.currentRoomId}":`, e);
      this.ui.showMessage("Warning: failed to restore room.");
      try {
        await this.loadRoom(this.config.startingRoom);
      } catch {
        console.error("[Engine] Failed to load starting room as fallback.");
      }
    }
  }

  getPlayer(): ActorInstance | null {
    return this.player;
  }

  getPathPreviewWaypoints(): Point[] {
    return this.inputState.pathPreviewWaypoints;
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getDebugSnapshot(): {
    flags: Record<string, boolean>;
    variables: Record<string, boolean | number | string>;
    currentRoomId: string;
    inventory: Record<string, string[]>;
    objectStates: Record<string, Record<string, unknown>>;
    objectLocations: Record<string, string | null>;
    actors: Record<string, ActorRuntimeState>;
    objects: Record<string, ObjectRuntimeState>;
    rooms: Record<string, RoomRuntimeState>;
    camera: CameraRuntimeState;
    dialogue: DialogueRuntimeState;
    dialogueSeen: Record<string, { nodes: string[]; branches: string[] }>;
    scripts: ScriptInstanceInfo[];
    inCutscene: boolean;
    variableDefinitions: VariableDefinition[];
  } {
    const snapshot = this.state.getSnapshot();
    const scriptSnapshot = this.scheduler.getRuntimeSnapshot();
    return {
      ...snapshot,
      scripts: scriptSnapshot.scripts,
      inCutscene: scriptSnapshot.inCutscene,
      variableDefinitions: this.config.variableDefinitions ?? [],
    };
  }

  setDebugFlag(key: string, value: boolean): void {
    debugSetFlag(this.getDebugBridgeDeps(), key, value);
  }

  setDebugVariable(key: string, value: boolean | number | string): void {
    debugSetVariable(this.getDebugBridgeDeps(), key, value);
  }

  setDebugRoomVar(roomId: string, key: string, value: boolean | number | string): void {
    debugSetRoomVar(this.getDebugBridgeDeps(), roomId, key, value);
  }

  setDebugObjectState(objectId: string, key: string, value: unknown): void {
    debugSetObjectState(this.getDebugBridgeDeps(), objectId, key, value);
  }

  async debugJumpToRoom(roomId: string, spawnPointId?: string): Promise<void> {
    await debugJumpToRoom(this.getDebugBridgeDeps(), roomId, spawnPointId);
  }

  async debugReloadRoom(): Promise<void> {
    await debugReloadRoom(this.getDebugBridgeDeps());
  }

  debugGiveItem(actorId: string, itemId: string): void {
    debugGiveItem(this.getDebugBridgeDeps(), actorId, itemId);
  }

  debugRemoveItem(actorId: string, itemId: string): void {
    debugRemoveItem(this.getDebugBridgeDeps(), actorId, itemId);
  }

  async debugRunScript(scriptName: string): Promise<void> {
    await debugRunScript(this.getDebugBridgeDeps(), scriptName);
  }

  debugCancelScript(instanceId: string): void {
    debugCancelScript(this.getDebugBridgeDeps(), instanceId);
  }

  getDebugInspectedEntity(): DebugInspectedEntity | null {
    return getDebugInspectedEntity(this.getDebugBridgeDeps());
  }

  getMouseWorldPosition(): { x: number; y: number } {
    return { x: this.inputState.lastWorldX, y: this.inputState.lastWorldY };
  }
}
