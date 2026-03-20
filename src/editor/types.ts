/**
 * EDITOR AUTHORING LAYER — Types in this file extend the engine's runtime
 * types with editor-only fields (e.g. shapeLocked, nodePositions). The
 * projectToConfig transform explicitly strips these before handing data
 * to the runtime. If you need a new editor-only field on an entity, add
 * it to the corresponding Editor* wrapper type here, not to engine/core/types.
 */
import type {
  VerbType,
  VerbCursorMap,
  RoomDefinition,
  ActorDefinition,
  ObjectDefinition,
  ItemDefinition,
  Point,
  UISettings,
  DialogueTree,
  WalkboxDefinition,
  HotspotDefinition,
  VariableDefinition,
  StateWatcherDefinition,
  ScriptStep,
} from "../engine/core/types";

export interface EditorWalkbox extends WalkboxDefinition {
  /** @editor-only — canvas drag-lock flag; stripped by all export/runtime transforms. */
  shapeLocked?: boolean;
}

export interface EditorHotspot extends HotspotDefinition {
  /** @editor-only — canvas drag-lock flag; stripped by all export/runtime transforms. */
  shapeLocked?: boolean;
}

export interface EditorDialogueTree extends DialogueTree {
  /** @editor-only — visual node positions in the dialogue editor canvas; not used by runtime. */
  nodePositions?: Record<string, Point>;
}

/** Editor extension of RoomDefinition — adds EditorWalkbox/EditorHotspot. */
export interface EditorRoomDefinition extends Omit<RoomDefinition, "walkboxes" | "hotspots"> {
  walkboxes: EditorWalkbox[];
  hotspots?: EditorHotspot[];
}

/**
 * Editor extension of ActorDefinition.
 * Currently carries no additional editor-only fields beyond ActorDefinition.
 * Add editor-only actor fields here (not in engine/core/types.ts) when needed.
 */
export interface EditorActorDefinition extends ActorDefinition {}

/**
 * Editor extension of ObjectDefinition.
 * Currently carries no additional editor-only fields beyond ObjectDefinition.
 * Add editor-only object fields here (not in engine/core/types.ts) when needed.
 */
export interface EditorObjectDefinition extends ObjectDefinition {}

export type EditorTool =
  | "select"
  | "walkbox"
  | "exit"
  | "hotspot"
  | "spawn"
  | "object"
  | "pan";

export type EditorTab =
  | "rooms"
  | "assets"
  | "items"
  | "actors"
  | "scripts"
  | "dialogue"
  | "settings"
  | "linter";

export interface EditorAsset {
  id: string;
  name: string;
  dataUrl: string;
  type: "background" | "sprite" | "icon" | "audio" | "other";
  width: number;
  height: number;
}

export type EditorScriptKind = "raw" | "visual";

export interface EditorScript {
  name: string;
  body: string;
  /** @editor-only — human-readable description shown in the Scripts panel; not exported. */
  description?: string;
  /** @editor-only — "raw" or "visual"; determines how body was authored. Stripped at export. */
  kind?: EditorScriptKind;
  /** @editor-only — visual script AST used to regenerate body. Stripped at export; runtime only needs body. */
  steps?: ScriptStep[];
}

/** Editor-owned top-level project container. Converted to GameConfig via projectToConfig. */
export interface EditorProject {
  formatVersion: number;
  id: string;
  title: string;
  created: number;
  modified: number;
  startingRoom: string;
  defaultPlayerActorId: string;
  defaultPlayerPosition: Point;
  startingItems: string[];
  verbs: VerbType[];
  rooms: EditorRoomDefinition[];
  actors: EditorActorDefinition[];
  objects: EditorObjectDefinition[];
  items: ItemDefinition[];
  scripts: EditorScript[];
  assets: EditorAsset[];
  dialogueTrees?: EditorDialogueTree[];
  uiSettings?: UISettings;
  verbCursors?: VerbCursorMap;
  globalFallbackScriptId?: string;
  variableDefinitions?: VariableDefinition[];
  stateWatchers?: StateWatcherDefinition[];
  display?: import("../shared/displayConfig").DisplayConfig;
  overlayConfig?: import("../shared/overlayConfig").OverlayConfig;
  cursorConfig?: import("../shared/cursorConfig").CursorConfig;
}

export interface EditorProjectMeta {
  id: string;
  title: string;
  created: number;
  modified: number;
  roomCount: number;
}

export type SelectedEntityType =
  | "walkbox"
  | "exit"
  | "hotspot"
  | "spawn"
  | "object"
  | "actor"
  | "room";

export interface SelectedEntity {
  type: SelectedEntityType;
  id: string;
  roomId?: string;
}

export type HotspotDrawMode = "rect" | "polygon";

export interface EditorState {
  projects: EditorProjectMeta[];
  currentProject: EditorProject | null;
  selectedRoomId: string | null;
  activeTab: EditorTab;
  activeTool: EditorTool;
  hotspotDrawMode: HotspotDrawMode;
  selectedEntity: SelectedEntity | null;
  isPlaying: boolean;
  testRoomId: string | null;
  isDirty: boolean;
  zoom: number;
  past: EditorProject[];
  future: EditorProject[];
  pendingEditScript: string | null;
  pendingDialogueTreeId: string | null;
  _savedProjectRef: EditorProject | null;
  _dragActive: boolean;
  _dragSnapshot: EditorProject | null;
}

export type EditorAction =
  | { type: "LOAD_PROJECTS"; projects: EditorProjectMeta[] }
  | { type: "CREATE_PROJECT"; project: EditorProject }
  | { type: "OPEN_PROJECT"; project: EditorProject }
  | { type: "CLOSE_PROJECT" }
  | { type: "UPDATE_PROJECT_META"; id: string; title: string }
  | { type: "UPDATE_PROJECT"; updates: Partial<Pick<EditorProject, "globalFallbackScriptId" | "overlayConfig" | "display" | "cursorConfig">> }
  | { type: "DELETE_PROJECT"; id: string }
  | { type: "MARK_SAVED" }
  | { type: "SELECT_ROOM"; roomId: string | null }
  | { type: "ADD_ROOM"; room: EditorRoomDefinition }
  | { type: "UPDATE_ROOM"; roomId: string; updates: Partial<EditorRoomDefinition> }
  | { type: "DELETE_ROOM"; roomId: string }
  | { type: "ADD_OBJECT"; object: EditorObjectDefinition }
  | { type: "UPDATE_OBJECT"; objectId: string; updates: Partial<EditorObjectDefinition> }
  | { type: "DELETE_OBJECT"; objectId: string }
  | { type: "ADD_ACTOR"; actor: EditorActorDefinition }
  | { type: "UPDATE_ACTOR"; actorId: string; updates: Partial<EditorActorDefinition> }
  | { type: "DELETE_ACTOR"; actorId: string }
  | { type: "ADD_ITEM"; item: ItemDefinition }
  | { type: "UPDATE_ITEM"; itemId: string; updates: Partial<ItemDefinition> }
  | { type: "DELETE_ITEM"; itemId: string }
  | { type: "ADD_ASSET"; asset: EditorAsset }
  | { type: "UPDATE_ASSET"; assetId: string; updates: Partial<EditorAsset> }
  | { type: "DELETE_ASSET"; assetId: string }
  | { type: "ADD_SCRIPT"; script: EditorScript }
  | { type: "UPDATE_SCRIPT"; name: string; updates: Partial<EditorScript> }
  | { type: "DELETE_SCRIPT"; name: string }
  | { type: "SET_TOOL"; tool: EditorTool }
  | { type: "SET_HOTSPOT_DRAW_MODE"; mode: HotspotDrawMode }
  | { type: "SELECT_ENTITY"; entity: SelectedEntity | null }
  | { type: "SET_TAB"; tab: EditorTab }
  | { type: "SET_PLAYING"; playing: boolean; testRoomId?: string | null }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_VERB_CURSOR"; verb: string; assetId: string | null }
  | { type: "ADD_DIALOGUE_TREE"; tree: EditorDialogueTree }
  | { type: "UPDATE_DIALOGUE_TREE"; treeId: string; tree: EditorDialogueTree }
  | { type: "DELETE_DIALOGUE_TREE"; treeId: string }
  | { type: "SELECT_SCRIPT"; name: string }
  | { type: "CLEAR_PENDING_SCRIPT" }
  | { type: "SELECT_DIALOGUE_TREE"; treeId: string }
  | { type: "CLEAR_PENDING_DIALOGUE_TREE" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "BEGIN_DRAG" }
  | { type: "END_DRAG" };
