import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type {
  EditorState,
  EditorAction,
  EditorProject,
  EditorTool,
  EditorTab,
  SelectedEntity,
  EditorRoomDefinition,
  EditorDialogueTree,
} from "./types";
import type {
  ItemDefinition,
} from "../engine/core/types";
import type { EditorAsset, EditorScript } from "./types";
import type { StorageProvider } from "../shared/StorageProvider";
import {
  loadProjectMetas,
  loadProject,
  saveProject,
  deleteProject,
  setStorageProvider,
} from "./utils/projectStorage";

const UNDO_LIMIT = 50;

const TRACKED_ACTIONS = new Set([
  "ADD_ROOM", "UPDATE_ROOM", "DELETE_ROOM",
  "ADD_OBJECT", "UPDATE_OBJECT", "DELETE_OBJECT",
  "ADD_ACTOR", "UPDATE_ACTOR", "DELETE_ACTOR",
  "ADD_ITEM", "UPDATE_ITEM", "DELETE_ITEM",
  "ADD_ASSET", "UPDATE_ASSET", "DELETE_ASSET",
  "ADD_SCRIPT", "UPDATE_SCRIPT", "DELETE_SCRIPT",
  "SET_VERB_CURSOR",
  "ADD_DIALOGUE_TREE", "UPDATE_DIALOGUE_TREE", "DELETE_DIALOGUE_TREE",
  "UPDATE_PROJECT_META",
  "UPDATE_PROJECT",
]);

const initialState: EditorState = {
  projects: [],
  currentProject: null,
  selectedRoomId: null,
  activeTab: "rooms",
  activeTool: "select",
  hotspotDrawMode: "rect",
  selectedEntity: null,
  isPlaying: false,
  testRoomId: null,
  isDirty: false,
  zoom: 1,
  past: [],
  future: [],
  _savedProjectRef: null,
  pendingEditScript: null,
  pendingDialogueTreeId: null,
  _dragActive: false,
  _dragSnapshot: null,
};

function applyDataAction(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {

    // ─── Project metadata ────────────────────────────────────────────────────
    case "UPDATE_PROJECT_META":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: { ...state.currentProject, title: action.title },
        isDirty: true,
      };

    case "UPDATE_PROJECT":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: { ...state.currentProject, ...action.updates },
        isDirty: true,
      };

    // ─── Rooms ───────────────────────────────────────────────────────────────
    case "ADD_ROOM": {
      if (!state.currentProject) return state;
      const updated: EditorProject = {
        ...state.currentProject,
        rooms: [...state.currentProject.rooms, action.room],
        startingRoom:
          state.currentProject.startingRoom || action.room.id,
      };
      return {
        ...state,
        currentProject: updated,
        selectedRoomId: action.room.id,
        isDirty: true,
      };
    }

    case "UPDATE_ROOM": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          rooms: state.currentProject.rooms.map((r) =>
            r.id === action.roomId ? { ...r, ...action.updates } : r
          ),
        },
        isDirty: true,
      };
    }

    case "DELETE_ROOM": {
      if (!state.currentProject) return state;
      const rooms = state.currentProject.rooms.filter(
        (r) => r.id !== action.roomId
      );
      return {
        ...state,
        currentProject: { ...state.currentProject, rooms },
        selectedRoomId:
          state.selectedRoomId === action.roomId
            ? (rooms[0]?.id ?? null)
            : state.selectedRoomId,
        isDirty: true,
      };
    }

    // ─── Objects ─────────────────────────────────────────────────────────────
    case "ADD_OBJECT": {
      if (!state.currentProject) return state;
      const room = state.currentProject.rooms.find(
        (r) => r.id === action.object.roomId
      );
      const updatedRooms = room
        ? state.currentProject.rooms.map((r) =>
            r.id === room.id
              ? {
                  ...r,
                  objectIds: [...(r.objectIds ?? []), action.object.id],
                }
              : r
          )
        : state.currentProject.rooms;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          objects: [...state.currentProject.objects, action.object],
          rooms: updatedRooms,
        },
        isDirty: true,
      };
    }

    case "UPDATE_OBJECT": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          objects: state.currentProject.objects.map((o) =>
            o.id === action.objectId ? { ...o, ...action.updates } : o
          ),
        },
        isDirty: true,
      };
    }

    case "DELETE_OBJECT": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          objects: state.currentProject.objects.filter(
            (o) => o.id !== action.objectId
          ),
          rooms: state.currentProject.rooms.map((r) => ({
            ...r,
            objectIds: (r.objectIds ?? []).filter((id) => id !== action.objectId),
          })),
        },
        isDirty: true,
      };
    }

    // ─── Actors ──────────────────────────────────────────────────────────────
    case "ADD_ACTOR": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          actors: [...state.currentProject.actors, action.actor],
        },
        isDirty: true,
      };
    }

    case "UPDATE_ACTOR": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          actors: state.currentProject.actors.map((a) =>
            a.id === action.actorId ? { ...a, ...action.updates } : a
          ),
        },
        isDirty: true,
      };
    }

    case "DELETE_ACTOR": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          actors: state.currentProject.actors.filter(
            (a) => a.id !== action.actorId
          ),
        },
        isDirty: true,
      };
    }

    // ─── Items ───────────────────────────────────────────────────────────────
    case "ADD_ITEM": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          items: [...state.currentProject.items, action.item],
        },
        isDirty: true,
      };
    }

    case "UPDATE_ITEM": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          items: state.currentProject.items.map((i) =>
            i.id === action.itemId ? { ...i, ...action.updates } : i
          ),
        },
        isDirty: true,
      };
    }

    case "DELETE_ITEM": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          items: state.currentProject.items.filter(
            (i) => i.id !== action.itemId
          ),
        },
        isDirty: true,
      };
    }

    // ─── Assets ──────────────────────────────────────────────────────────────
    case "ADD_ASSET": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          assets: [...state.currentProject.assets, action.asset],
        },
        isDirty: true,
      };
    }

    case "UPDATE_ASSET": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          assets: state.currentProject.assets.map((a) =>
            a.id === action.assetId ? { ...a, ...action.updates } : a
          ),
        },
        isDirty: true,
      };
    }

    case "DELETE_ASSET": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          assets: state.currentProject.assets.filter(
            (a) => a.id !== action.assetId
          ),
        },
        isDirty: true,
      };
    }

    // ─── Scripts ─────────────────────────────────────────────────────────────
    case "ADD_SCRIPT": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          scripts: [...state.currentProject.scripts, action.script],
        },
        isDirty: true,
      };
    }

    case "UPDATE_SCRIPT": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          scripts: state.currentProject.scripts.map((s) =>
            s.name === action.name ? { ...s, ...action.updates } : s
          ),
        },
        isDirty: true,
      };
    }

    case "DELETE_SCRIPT": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          scripts: state.currentProject.scripts.filter(
            (s) => s.name !== action.name
          ),
        },
        isDirty: true,
      };
    }

    // ─── Cursors ─────────────────────────────────────────────────────────────
    case "SET_VERB_CURSOR": {
      if (!state.currentProject) return state;
      const existingVerbCursors = state.currentProject.cursorConfig?.verbCursors ?? state.currentProject.verbCursors ?? {};
      const cursors = { ...existingVerbCursors };
      if (action.assetId) {
        cursors[action.verb] = action.assetId;
      } else {
        delete cursors[action.verb];
      }
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          cursorConfig: {
            ...state.currentProject.cursorConfig,
            verbCursors: cursors,
          },
        },
        isDirty: true,
      };
    }

    // ─── Dialogue trees ──────────────────────────────────────────────────────
    case "ADD_DIALOGUE_TREE": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          dialogueTrees: [...(state.currentProject.dialogueTrees ?? []), action.tree],
        },
        isDirty: true,
      };
    }

    case "UPDATE_DIALOGUE_TREE": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          dialogueTrees: (state.currentProject.dialogueTrees ?? []).map((t) =>
            t.id === action.treeId ? action.tree : t
          ),
        },
        isDirty: true,
      };
    }

    case "DELETE_DIALOGUE_TREE": {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          dialogueTrees: (state.currentProject.dialogueTrees ?? []).filter(
            (t) => t.id !== action.treeId
          ),
        },
        isDirty: true,
      };
    }

    default:
      return state;
  }
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  // ─── History: UNDO / REDO ────────────────────────────────────────────────
  if (action.type === "UNDO") {
    if (state.past.length === 0 || !state.currentProject) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    return {
      ...state,
      past: newPast,
      future: [state.currentProject, ...state.future],
      currentProject: previous,
      isDirty: previous !== state._savedProjectRef,
    };
  }

  if (action.type === "REDO") {
    if (state.future.length === 0 || !state.currentProject) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      ...state,
      past: [...state.past, state.currentProject],
      future: newFuture,
      currentProject: next,
      isDirty: next !== state._savedProjectRef,
    };
  }

  // ─── Drag lifecycle ──────────────────────────────────────────────────────
  if (action.type === "BEGIN_DRAG") {
    return {
      ...state,
      _dragActive: true,
      _dragSnapshot: state.currentProject,
    };
  }

  if (action.type === "END_DRAG") {
    if (!state._dragActive || !state._dragSnapshot) {
      return { ...state, _dragActive: false, _dragSnapshot: null };
    }
    if (state._dragSnapshot === state.currentProject) {
      return { ...state, _dragActive: false, _dragSnapshot: null };
    }
    return {
      ...state,
      _dragActive: false,
      _dragSnapshot: null,
      past: [...state.past, state._dragSnapshot].slice(-UNDO_LIMIT),
      future: [],
    };
  }

  // ─── Tracked data mutations (push undo snapshot before applying) ─────────
  if (TRACKED_ACTIONS.has(action.type)) {
    if (!state.currentProject) return applyDataAction(state, action);

    if (state._dragActive) {
      return applyDataAction(state, action);
    }

    const newState = applyDataAction(
      {
        ...state,
        past: [...state.past, state.currentProject].slice(-UNDO_LIMIT),
        future: [],
      },
      action
    );
    return newState;
  }

  // ─── Non-tracked navigation / UI actions ─────────────────────────────────
  switch (action.type) {
    case "LOAD_PROJECTS":
      return { ...state, projects: action.projects };

    case "CREATE_PROJECT":
      return {
        ...state,
        currentProject: action.project,
        selectedRoomId: action.project.rooms[0]?.id ?? null,
        activeTab: "rooms",
        activeTool: "select",
        selectedEntity: null,
        isDirty: false,
        past: [],
        future: [],
        _savedProjectRef: action.project,
        _dragActive: false,
        _dragSnapshot: null,
        projects: [
          ...state.projects,
          {
            id: action.project.id,
            title: action.project.title,
            created: action.project.created,
            modified: action.project.modified,
            roomCount: action.project.rooms.length,
          },
        ],
      };

    case "OPEN_PROJECT":
      return {
        ...state,
        currentProject: action.project,
        selectedRoomId: action.project.rooms[0]?.id ?? null,
        activeTab: "rooms",
        activeTool: "select",
        selectedEntity: null,
        isDirty: false,
        past: [],
        future: [],
        _savedProjectRef: action.project,
        _dragActive: false,
        _dragSnapshot: null,
      };

    case "CLOSE_PROJECT":
      return {
        ...state,
        currentProject: null,
        selectedRoomId: null,
        activeTab: "rooms",
        activeTool: "select",
        selectedEntity: null,
        isDirty: false,
        isPlaying: false,
        past: [],
        future: [],
        _savedProjectRef: null,
        _dragActive: false,
        _dragSnapshot: null,
      };

    case "DELETE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        currentProject:
          state.currentProject?.id === action.id ? null : state.currentProject,
      };

    case "MARK_SAVED":
      return { ...state, isDirty: false, _savedProjectRef: state.currentProject };

    case "SELECT_ROOM":
      return {
        ...state,
        selectedRoomId: action.roomId,
        selectedEntity: null,
        activeTool: "select",
      };

    case "SET_TOOL":
      return { ...state, activeTool: action.tool, selectedEntity: null };

    case "SET_HOTSPOT_DRAW_MODE":
      return { ...state, hotspotDrawMode: action.mode };

    case "SELECT_ENTITY":
      return { ...state, selectedEntity: action.entity };

    case "SET_TAB":
      return { ...state, activeTab: action.tab, selectedEntity: null };

    case "SELECT_SCRIPT":
      return { ...state, activeTab: "scripts", pendingEditScript: action.name };

    case "CLEAR_PENDING_SCRIPT":
      return { ...state, pendingEditScript: null };

    case "SELECT_DIALOGUE_TREE":
      return { ...state, activeTab: "dialogue", pendingDialogueTreeId: action.treeId };

    case "CLEAR_PENDING_DIALOGUE_TREE":
      return { ...state, pendingDialogueTreeId: null };

    case "SET_PLAYING":
      return { ...state, isPlaying: action.playing, testRoomId: action.playing ? (action.testRoomId ?? null) : null };

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(0.25, Math.min(2, action.zoom)) };

    default:
      return state;
  }
}

// ─── Context / provider ───────────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  saveCurrentProject: () => void;
  openProject: (id: string) => void;
  closeProject: () => void;
  deleteProjectById: (id: string) => void;
  selectedRoom: EditorRoomDefinition | null;
  canUndo: boolean;
  canRedo: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  children,
  storageProvider,
}: {
  children: ReactNode;
  storageProvider?: StorageProvider;
}) {
  if (storageProvider) {
    setStorageProvider(storageProvider);
  }

  const [state, dispatch] = useReducer(editorReducer, {
    ...initialState,
    projects: loadProjectMetas(),
  });

  const saveCurrentProject = useCallback(() => {
    if (!state.currentProject) return;
    saveProject(state.currentProject);
    dispatch({ type: "MARK_SAVED" });
  }, [state.currentProject]);

  const openProject = useCallback(
    (id: string) => {
      const project = loadProject(id);
      if (project) dispatch({ type: "OPEN_PROJECT", project });
    },
    []
  );

  const closeProject = useCallback(() => {
    dispatch({ type: "CLOSE_PROJECT" });
  }, []);

  const deleteProjectById = useCallback((id: string) => {
    deleteProject(id);
    dispatch({ type: "DELETE_PROJECT", id });
  }, []);

  const selectedRoom =
    state.currentProject?.rooms.find(
      (r) => r.id === state.selectedRoomId
    ) ?? null;

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return (
    <EditorContext.Provider
      value={{
        state,
        dispatch,
        saveCurrentProject,
        openProject,
        closeProject,
        deleteProjectById,
        selectedRoom,
        canUndo,
        canRedo,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
