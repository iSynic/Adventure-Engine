import { useEditor } from "../store";
import type { EditorTool, HotspotDrawMode } from "../types";
import TutorialBubble from "./TutorialBubble";

interface Tool {
  id: EditorTool;
  label: string;
  icon: string;
  hint: string;
  key: string;
  tutorialTitle: string;
  tutorialDesc: string;
  tutorialTip?: string;
}

const TOOLS: Tool[] = [
  {
    id: "select",
    label: "Select",
    icon: "↖",
    hint: "Select & drag entities (V)",
    key: "V",
    tutorialTitle: "Select Tool (V)",
    tutorialDesc:
      "Click any walkbox, exit, hotspot, or spawn point on the canvas to select it. Drag a selected entity to reposition it. Individual polygon vertices can also be dragged.",
    tutorialTip: "Press Delete or Backspace to remove the selected entity.",
  },
  {
    id: "walkbox",
    label: "Walkbox",
    icon: "⬡",
    hint: "Draw walkable polygon (W) — click to add points, double-click to finish",
    key: "W",
    tutorialTitle: "Walkbox Tool (W)",
    tutorialDesc:
      "Draw the area where the player character can walk. Click to place polygon vertices, then double-click to close the shape. The engine uses BFS pathfinding across all walkboxes in a room.",
    tutorialTip:
      "Overlap walkboxes slightly so the pathfinder can move between them seamlessly.",
  },
  {
    id: "exit",
    label: "Exit",
    icon: "→□",
    hint: "Draw an exit region (E) — drag to create rectangle",
    key: "E",
    tutorialTitle: "Exit Tool (E)",
    tutorialDesc:
      "Define a doorway or transition zone. Drag to draw a rectangle — when the player walks into it, they are transported to another room. Set the target room and spawn point in the inspector.",
    tutorialTip: "Place exits at the edges of the room so movement feels natural.",
  },
  {
    id: "hotspot",
    label: "Hotspot",
    icon: "◎",
    hint: "Draw a hotspot region (H) — drag to create rectangle",
    key: "H",
    tutorialTitle: "Hotspot Tool (H)",
    tutorialDesc:
      "Mark a region the player can interact with — a painting, a sign, a window. Drag to place the rectangle. Use verb handlers in the Scripts tab to define what happens when the player looks at or uses it.",
    tutorialTip: "Hotspots don't block movement — they just respond to clicks.",
  },
  {
    id: "spawn",
    label: "Spawn",
    icon: "⊕",
    hint: "Place a spawn point (S) — click to place",
    key: "S",
    tutorialTitle: "Spawn Point Tool (S)",
    tutorialDesc:
      "Place a named spawn point where actors start or arrive when entering a room. Each room needs at least one default spawn. Exits in other rooms reference these by ID.",
    tutorialTip: "Name spawn points after where the player arrives from (e.g. 'from_north').",
  },
  {
    id: "pan",
    label: "Pan",
    icon: "✥",
    hint: "Pan the view (Space / P)",
    key: "P",
    tutorialTitle: "Pan Tool (P)",
    tutorialDesc:
      "Click and drag to scroll the canvas viewport. Useful when the room width exceeds the visible area. You can also hold Space and drag regardless of the active tool.",
    tutorialTip: "Use the scroll wheel to zoom in and out while panning.",
  },
];

export default function ToolBar() {
  const { state, dispatch } = useEditor();

  return (
    <div className="toolbar">
      {TOOLS.map((tool) => (
        <TutorialBubble
          key={tool.id}
          title={tool.tutorialTitle}
          description={tool.tutorialDesc}
          tip={tool.tutorialTip}
          preferSide="below"
        >
          <button
            className={`tool-btn${state.activeTool === tool.id ? " active" : ""}`}
            title={tool.hint}
            onClick={() => dispatch({ type: "SET_TOOL", tool: tool.id })}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        </TutorialBubble>
      ))}
      {state.activeTool === "hotspot" && (
        <div className="toolbar-submode">
          {(["rect", "polygon"] as HotspotDrawMode[]).map((mode) => (
            <button
              key={mode}
              className={`tool-btn tool-btn-sub${state.hotspotDrawMode === mode ? " active" : ""}`}
              title={mode === "rect" ? "Draw rectangle hotspot" : "Draw polygon hotspot (click vertices)"}
              onClick={() => dispatch({ type: "SET_HOTSPOT_DRAW_MODE", mode })}
            >
              <span className="tool-icon">{mode === "rect" ? "▭" : "⬡"}</span>
              <span className="tool-label">{mode === "rect" ? "Rect" : "Poly"}</span>
            </button>
          ))}
        </div>
      )}
      <div className="toolbar-sep" />
      <div className="toolbar-hint">
        {state.activeTool === "hotspot"
          ? state.hotspotDrawMode === "polygon"
            ? "Draw a polygon hotspot (H) — click to add points, double-click to finish"
            : "Draw a hotspot region (H) — drag to create rectangle"
          : TOOLS.find((t) => t.id === state.activeTool)?.hint ?? ""}
      </div>
    </div>
  );
}
