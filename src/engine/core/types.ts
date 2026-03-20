// ─── Primitive verb / direction / animation types ─────────────────────────────

export type VerbType =
  | "walk"
  | "look"
  | "open"
  | "close"
  | "pickup"
  | "use"
  | "talk"
  | "push"
  | "pull"
  | "give";

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export type AnimationState =
  | "idle"
  | "walk"
  | "talk"
  | "face"
  | "interact_low"
  | "interact_mid"
  | "interact_high"
  | "pickup"
  | "push_pull"
  | "special_use"
  | "emote"
  | "interact";

// ─── Geometric primitives ─────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VerbCursorMap {
  [verb: string]: string;
}

export interface InteractionAnchor {
  point: Point;
  facing?: Direction;
  interactDistance?: number;
}

// ─── Root game config ─────────────────────────────────────────────────────────

/**
 * RUNTIME AUTHORITY — GameConfig and all types in this file are owned by
 * the engine runtime. The editor extends some of these via wrapper types
 * (e.g. EditorRoomDefinition extends RoomDefinition). The export layer
 * (exportSchema.ts) aliases these types for the serialized game package.
 * Do not add editor-only fields here; extend in editor/types.ts instead.
 */
export interface GameConfig {
  id: string;
  title: string;
  startingRoom: string;
  assetRoot: string;
  defaultPlayerActorId: string;
  verbs: VerbType[];
  startingItems?: string[];
  defaultPlayerPosition?: Point;
  rooms: RoomDefinition[];
  actors: ActorDefinition[];
  objects: ObjectDefinition[];
  items: ItemDefinition[];
  dialogue?: DialogueDefinition[];
  dialogueTrees?: DialogueTree[];
  uiSettings?: UISettings;
  audioSettings?: AudioSettings;
  verbCursors?: VerbCursorMap;
  globalFallbackScriptId?: string;
  variableDefinitions?: VariableDefinition[];
  stateWatchers?: StateWatcherDefinition[];
  display?: import("../../shared/displayConfig").DisplayConfig;
  overlayConfig?: import("../../shared/overlayConfig").OverlayConfig;
  cursorConfig?: import("../../shared/cursorConfig").CursorConfig;
}

// ─── Variables & conditions ───────────────────────────────────────────────────

export type VariableType = "boolean" | "number" | "string";

export interface VariableDefinition {
  name: string;
  type: VariableType;
  description?: string;
  defaultValue?: boolean | number | string;
  min?: number;
  max?: number;
  scope?: "global" | "room";
  roomId?: string;
}

export type ComparisonOperator = "==" | "!=" | ">" | "<" | ">=" | "<=";

export type ConditionExpression =
  | FlagCondition
  | VariableCondition
  | InventoryCondition
  | ObjectStateCondition
  | RoomVisitedCondition
  | DialogueNodeSeenCondition
  | HasTagCondition
  | AndCondition
  | OrCondition
  | NotCondition;

export interface FlagCondition {
  type: "flag";
  flag: string;
  value?: boolean;
}

export interface VariableCondition {
  type: "variable";
  variable: string;
  operator: ComparisonOperator;
  value: boolean | number | string;
}

export interface InventoryCondition {
  type: "inventory";
  actorId: string;
  itemId: string;
}

export interface ObjectStateCondition {
  type: "objectState";
  objectId: string;
  key: string;
  operator?: ComparisonOperator;
  value: unknown;
}

export interface RoomVisitedCondition {
  type: "roomVisited";
  roomId: string;
}

export interface DialogueNodeSeenCondition {
  type: "dialogueNodeSeen";
  treeId: string;
  nodeId: string;
}

export interface HasTagCondition {
  type: "hasTag";
  objectId: string;
  tag: string;
}

export interface AndCondition {
  type: "and";
  conditions: ConditionExpression[];
}

export interface OrCondition {
  type: "or";
  conditions: ConditionExpression[];
}

export interface NotCondition {
  type: "not";
  condition: ConditionExpression;
}

// ─── Watchers & UI / audio settings ──────────────────────────────────────────

export interface StateWatcherDefinition {
  id: string;
  condition: ConditionExpression;
  scriptId: string;
  once?: boolean;
}

export interface UISettings {
  verbBarEnabled?: boolean;
  inventoryEnabled?: boolean;
  messageLogEnabled?: boolean;
  showRoomTitle?: boolean;
}

export interface AudioSettings {
  masterVolume?: number;
  musicVolume?: number;
  sfxVolume?: number;
}

// ─── Room geometry: walkboxes, exits, spawn points, hotspots ─────────────────

export interface WalkboxDefinition {
  id: string;
  polygon: Point[];
  adjacentIds: string[];
  scale?: { near: number; far: number; yNear: number; yFar: number };
  speedModifier?: number;
}

export interface ExitDefinition {
  id: string;
  direction: Direction;
  bounds: Rect;
  targetRoomId: string;
  targetSpawnPointId?: string;
  label?: string;
  visibilityCondition?: ConditionExpression;
  interactionCondition?: ConditionExpression;
}

export interface SpawnPoint {
  id: string;
  x: number;
  y: number;
  facing?: Direction;
}

export interface HotspotDefinition {
  id: string;
  name: string;
  roomId: string;
  bounds: Rect;
  polygon?: Point[];
  description?: string;
  verbHandlers?: Partial<Record<VerbType, string>>;
  useWithHandlers?: Record<string, string>;
  fallbackScriptId?: string;
  zLayer?: "behind" | "normal" | "front";
  standPoint?: Point;
  approachDirection?: Direction;
  interactionAnchors?: Partial<Record<VerbType, InteractionAnchor>>;
  interactDistance?: number;
  visibilityCondition?: ConditionExpression;
  interactionCondition?: ConditionExpression;
}

// ─── Actors & animations ──────────────────────────────────────────────────────

export interface AnimationFrame {
  imagePath: string;
  duration: number;
}

export interface AnimationDefinition {
  id: string;
  frames: AnimationFrame[];
  loop?: boolean;
}

export interface ActorAnimationSet {
  [direction: string]: {
    [state in AnimationState]?: AnimationDefinition;
  };
}

/** Runtime authority. Extended by EditorActorDefinition in editor/types.ts. */
export interface ActorDefinition {
  id: string;
  name: string;
  defaultRoomId?: string;
  position?: Point;
  facing?: Direction;
  visible?: boolean;
  scale?: number;
  movementSpeed?: number;
  spritePath?: string;
  spriteWidth?: number;
  spriteHeight?: number;
  animations?: ActorAnimationSet;
  isPlayer?: boolean;
  verbHandlers?: Partial<Record<VerbType, string>>;
  useWithHandlers?: Record<string, string>;
  fallbackScriptId?: string;
  dialogueId?: string;
  standPoint?: Point;
  approachDirection?: Direction;
  interactionAnchors?: Partial<Record<VerbType, InteractionAnchor>>;
  interactDistance?: number;
  facePlayerOnInteract?: boolean;
  portraitPath?: string;
}

// ─── Objects & items ──────────────────────────────────────────────────────────

export interface StateSpriteEntry {
  stateKey: string;
  stateValue: string;
  spritePath: string;
  bounds?: Rect;
  fps?: number;
  frameCount?: number;
  atlasRect?: Rect;
}

/** Runtime authority. Extended by EditorObjectDefinition in editor/types.ts. */
export interface ObjectDefinition {
  id: string;
  name: string;
  roomId?: string;
  position?: Point;
  spritePath?: string;
  spriteWidth?: number;
  spriteHeight?: number;
  bounds?: Rect;
  visible?: boolean;
  enabled?: boolean;
  pickupable?: boolean;
  description?: string;
  state?: Record<string, unknown>;
  stateSprites?: StateSpriteEntry[];
  verbHandlers?: Partial<Record<VerbType, string>>;
  useWithHandlers?: Record<string, string>;
  fallbackScriptId?: string;
  zOffset?: number;
  zLayer?: "behind" | "normal" | "front";
  interactionAnimation?: AnimationState;
  standPoint?: Point;
  approachDirection?: Direction;
  interactionAnchors?: Partial<Record<VerbType, InteractionAnchor>>;
  interactDistance?: number;
  visibilityCondition?: ConditionExpression;
  interactionCondition?: ConditionExpression;
  tags?: string[];
  primaryState?: number;
  interactionHotspot?: Rect;
  cursorOverride?: string;
  affordance?: "look" | "pickup" | "use" | "talk" | "none";
}

export interface ItemDefinition {
  id: string;
  name: string;
  iconPath?: string;
  description?: string;
  ownerId?: string;
  verbHandlers?: Partial<Record<VerbType, string>>;
  useWithHandlers?: Record<string, string>;
  fallbackScriptId?: string;
}

// ─── Dialogue ─────────────────────────────────────────────────────────────────

export interface DialogueLine {
  id: string;
  actorId: string;
  text: string;
  next?: string;
  conditions?: string[];
  actions?: string[];
}

export interface DialogueDefinition {
  id: string;
  actorId: string;
  lines: DialogueLine[];
  startLineId: string;
}

export type DialogueActionType = "setFlag" | "giveItem" | "gotoRoom" | "endDialogue" | "setVariable" | "removeItem" | "callScript" | "setObjectState";

export interface DialogueAction {
  type: DialogueActionType;
  flag?: string;
  flagValue?: boolean;
  itemId?: string;
  actorId?: string;
  roomId?: string;
  spawnPointId?: string;
  variable?: string;
  value?: boolean | number | string;
  scriptId?: string;
  objectId?: string;
  key?: string;
}

export interface DialogueBranch {
  id: string;
  text: string;
  nextNodeId: string | null;
  condition?: string | ConditionExpression;
  once?: boolean;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  branches: DialogueBranch[];
  actions?: DialogueAction[];
  condition?: string | ConditionExpression;
  once?: boolean;
  portrait?: string;
}

export interface DialogueTree {
  id: string;
  name: string;
  actorId?: string;
  startNodeId: string;
  nodes: DialogueNode[];
  onStartFlag?: string;
  onEndFlag?: string;
}

// ─── Room decoration: parallax, effects, scene props ─────────────────────────

export type TransitionEffect = "fade" | "instant";

export interface ParallaxLayer {
  imagePath: string;
  scrollFactor: number;
}

export type RoomEffectType = "glow" | "dust" | "fog" | "sparkle";
export type RoomEffectLayer = "background" | "foreground";

export interface RoomEffect {
  id: string;
  type: RoomEffectType;
  layer: RoomEffectLayer;
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
  intensity?: number;
  speed?: number;
  color?: string;
  seed?: number;
}

export type ScenePropKind = "light" | "decal" | "plaque";

export interface RoomSceneProp {
  id: string;
  kind: ScenePropKind;
  x: number;
  y: number;
  zLayer?: "behind" | "normal" | "front";
  zOffset?: number;
  visible?: boolean;

  radius?: number;
  color?: string;
  intensity?: number;
  pulseSpeed?: number;

  assetPath?: string;
  width?: number;
  height?: number;
  frameCount?: number;
  fps?: number;

  text?: string;
  font?: string;
  textColor?: string;
  background?: string;
  padding?: number;
}

// ─── Room definition ──────────────────────────────────────────────────────────

/** Runtime authority. Extended by EditorRoomDefinition in editor/types.ts. */
export interface RoomDefinition {
  id: string;
  name: string;
  backgroundPath: string;
  maskPath?: string;
  width: number;
  height: number;
  parallaxLayers?: ParallaxLayer[];
  walkboxes: WalkboxDefinition[];
  exits?: ExitDefinition[];
  objectIds?: string[];
  hotspots?: HotspotDefinition[];
  actorIds?: string[];
  spawnPoints?: SpawnPoint[];
  ambientAudioPath?: string;
  onEnter?: string;
  onExit?: string;
  onUpdate?: string;
  transitionEffect?: TransitionEffect;
  assetManifest?: string[];
  effects?: RoomEffect[];
  sceneProps?: RoomSceneProp[];
}

// ─── Runtime state snapshots ──────────────────────────────────────────────────

export interface ActorRuntimeState {
  roomId: string;
  x: number;
  y: number;
  facing: Direction;
  animState: AnimationState;
  walking: boolean;
  talking: boolean;
  busy: boolean;
  visible: boolean;
  controlEnabled: boolean;
}

export interface ObjectRuntimeState {
  roomId: string | null;
  ownerId: string | null;
  visible: boolean;
  enabled: boolean;
  interactionEnabled: boolean;
  currentState: Record<string, unknown>;
  x: number;
  y: number;
  classFlags: string[];
  primaryState: number;
}

export interface RoomRuntimeState {
  visited: boolean;
  localVariables: Record<string, boolean | number | string>;
  objectOverrides: Record<string, Partial<ObjectRuntimeState>>;
  scriptState: Record<string, unknown>;
}

export interface CameraRuntimeState {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  followActorId: string | null;
}

export interface DialogueRuntimeState {
  active: boolean;
  currentTreeId: string | null;
  currentNodeId: string | null;
}

export interface ScriptRuntimeSnapshot {
  inCutscene: boolean;
  activeScriptCount: number;
  scripts: ScriptInstanceInfo[];
}

export interface DialogueSeenState {
  nodes: string[];
  branches: string[];
}

export interface GameState {
  flags: Record<string, boolean>;
  variables: Record<string, boolean | number | string>;
  currentRoomId: string;
  actors: Record<string, ActorRuntimeState>;
  objects: Record<string, ObjectRuntimeState>;
  rooms: Record<string, RoomRuntimeState>;
  inventory: Record<string, string[]>;
  camera: CameraRuntimeState;
  dialogue: DialogueRuntimeState;
  dialogueSeen: Record<string, DialogueSeenState>;

  visitedRooms: string[];
  actorPositions: Record<string, Point>;
  actorFacing: Record<string, Direction>;
  objectStates: Record<string, Record<string, unknown>>;
  objectLocations: Record<string, string | null>;
}

export const SAVE_SCHEMA_VERSION = 1;

export interface SaveGameData {
  saveVersion: number;
  saveId: string;
  timestamp: number;
  gameId: string;
  state: GameState;
  currentRoomId: string;
  playerPosition: Point;
  playerFacing: Direction;
  engineVersion?: string;
  roomName?: string;
  summary?: string;
}

export type SaveLoadResult =
  | { ok: true; data: SaveGameData }
  | { ok: false; error: string; code: "INVALID_JSON" | "MISSING_FIELDS" | "UNKNOWN_VERSION" | "CORRUPT_STATE" | "STORAGE_ERROR" | "NO_SAVE" };

export type ScriptStepActionType =
  | "say"
  | "sayBlocking"
  | "gotoRoom"
  | "setFlag"
  | "setVar"
  | "incrementVar"
  | "giveItem"
  | "removeItem"
  | "fadeOut"
  | "fadeIn"
  | "wait"
  | "walkActorTo"
  | "faceActor"
  | "startDialogue"
  | "beginCutscene"
  | "endCutscene"
  | "lockInput"
  | "unlockInput"
  | "setObjectState"
  | "setObjectPrimaryState"
  | "playAnimation"
  | "emitSignal"
  | "scheduleScript"
  | "setRoomVar";

export interface SayStep {
  type: "say";
  text: string;
}

export interface SayBlockingStep {
  type: "sayBlocking";
  actorId: string;
  text: string;
}

export interface GotoRoomStep {
  type: "gotoRoom";
  roomId: string;
  spawnPointId?: string;
}

export interface SetFlagStep {
  type: "setFlag";
  flag: string;
  value: boolean;
}

export interface SetVarStep {
  type: "setVar";
  variable: string;
  value: boolean | number | string;
}

export interface IncrementVarStep {
  type: "incrementVar";
  variable: string;
  amount?: number;
}

export interface GiveItemStep {
  type: "giveItem";
  actorId: string;
  itemId: string;
}

export interface RemoveItemStep {
  type: "removeItem";
  actorId: string;
  itemId: string;
}

export interface FadeOutStep {
  type: "fadeOut";
  duration?: number;
}

export interface FadeInStep {
  type: "fadeIn";
  duration?: number;
}

export interface WaitStep {
  type: "wait";
  duration: number;
}

export interface WalkActorToStep {
  type: "walkActorTo";
  actorId: string;
  x: number;
  y: number;
}

export interface FaceActorStep {
  type: "faceActor";
  actorId: string;
  direction: Direction;
}

export interface StartDialogueStep {
  type: "startDialogue";
  treeId: string;
}

export interface BeginCutsceneStep {
  type: "beginCutscene";
}

export interface EndCutsceneStep {
  type: "endCutscene";
}

export interface LockInputStep {
  type: "lockInput";
}

export interface UnlockInputStep {
  type: "unlockInput";
}

export interface SetObjectPrimaryStateStep {
  type: "setObjectPrimaryState";
  objectId: string;
  stateIndex: number;
}

export interface SetObjectStateStep {
  type: "setObjectState";
  objectId: string;
  key: string;
  value: string;
}

export interface PlayAnimationStep {
  type: "playAnimation";
  actorId: string;
  animationState: AnimationState;
  waitForCompletion?: boolean;
}

export interface EmitSignalStep {
  type: "emitSignal";
  signal: string;
}

export interface ScheduleScriptStep {
  type: "scheduleScript";
  scriptId: string;
}

export interface SetRoomVarStep {
  type: "setRoomVar";
  roomId: string;
  key: string;
  value: boolean | number | string;
}

export interface IfStep {
  type: "if";
  condition: ConditionExpression;
  thenSteps: ScriptStep[];
  elseSteps?: ScriptStep[];
}

export type ScriptStep =
  | SayStep
  | SayBlockingStep
  | GotoRoomStep
  | SetFlagStep
  | SetVarStep
  | IncrementVarStep
  | GiveItemStep
  | RemoveItemStep
  | FadeOutStep
  | FadeInStep
  | WaitStep
  | WalkActorToStep
  | FaceActorStep
  | StartDialogueStep
  | BeginCutsceneStep
  | EndCutsceneStep
  | LockInputStep
  | UnlockInputStep
  | SetObjectPrimaryStateStep
  | SetObjectStateStep
  | PlayAnimationStep
  | EmitSignalStep
  | ScheduleScriptStep
  | SetRoomVarStep
  | IfStep;

export type ScriptState = "running" | "waiting" | "paused" | "completed" | "cancelled";

export type ScriptOwnership = "global" | "room" | "actor" | "object" | "interaction" | "cutscene";

export type WaitReason =
  | "timer"
  | "actor-movement"
  | "dialogue-complete"
  | "room-change"
  | "signal"
  | "condition"
  | "fade"
  | "animation"
  | "cutscene";

export interface ScriptInstanceInfo {
  id: string;
  hookId: string;
  state: ScriptState;
  ownership: ScriptOwnership;
  ownerId: string | null;
  waitReason: WaitReason | null;
  waitData: unknown;
  priority: number;
  interruptible: boolean;
  isCutscene: boolean;
  createdAt: number;
  elapsedMs: number;
}

export interface InteractionContext {
  state: import("../state/StateStore").StateStore;
  inventory: import("../inventory/InventorySystem").InventorySystem;
  roomManager: import("../world/RoomManager").RoomManager;
  ui: import("../ui/UIManager").UIManager;
  audio: import("../audio/AudioManager").AudioManager;
  currentActorId: string | null;
  currentTargetId: string | null;
  currentTargetType: "object" | "actor" | "hotspot" | "exit" | "item" | null;
  currentRoomId: string;
  verb: VerbType;
  secondaryTargetId?: string | null;
}

export type TargetType = "object" | "actor" | "hotspot" | "exit" | "item";

export interface HitTarget {
  type: "object" | "actor" | "hotspot" | "exit";
  id: string;
  cursorOverride?: string;
  affordance?: "look" | "pickup" | "use" | "talk" | "none";
}

export interface ActionTarget {
  id: string;
  type: TargetType;
  displayName: string;
}

export interface GameAction {
  verb: VerbType;
  actorId: string;
  primaryTarget: ActionTarget;
  secondaryTarget?: ActionTarget | null;
}

export interface ActionResult {
  handled: boolean;
  message?: string;
  action: GameAction;
}
