import { useEditor } from "../store";
import type { EditorWalkbox } from "../types";
import TutorialBubble from "./TutorialBubble";

export default function WalkboxInspector() {
  const { state, dispatch, selectedRoom } = useEditor();
  const selected = state.selectedEntity;

  if (!selectedRoom || !selected || selected.type !== "walkbox") return null;

  const walkbox = selectedRoom.walkboxes.find((w) => w.id === selected.id);
  if (!walkbox) return null;

  const otherWalkboxes = selectedRoom.walkboxes.filter((w) => w.id !== selected.id);

  function updateWalkbox(updates: Partial<EditorWalkbox>) {
    const walkboxes = selectedRoom!.walkboxes.map((w) =>
      w.id === selected!.id ? { ...w, ...updates } : w
    );
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates: { walkboxes } });
  }

  function toggleAdjacent(adjId: string) {
    const current = walkbox!.adjacentIds ?? [];
    const updated = current.includes(adjId)
      ? current.filter((id) => id !== adjId)
      : [...current, adjId];
    updateWalkbox({ adjacentIds: updated });
  }

  const scale = walkbox.scale ?? { near: 1, far: 0.5, yNear: 400, yFar: 0 };

  function updateScale(field: string, value: number) {
    const updated = { ...scale, [field]: value };
    updateWalkbox({ scale: updated });
  }

  function handleDelete() {
    const walkboxes = selectedRoom!.walkboxes.filter((w) => w.id !== selected!.id);
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates: { walkboxes } });
    dispatch({ type: "SELECT_ENTITY", entity: null });
  }

  return (
    <div className="object-inspector">
      <div className="inspector-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Walkbox: {walkbox.id}</span>
        <TutorialBubble title="Delete Walkbox" description="Remove this walkbox from the room. Actors will not be able to walk in this area." preferSide="left">
          <button className="btn btn-danger btn-xs" onClick={handleDelete} title="Delete walkbox">Delete</button>
        </TutorialBubble>
      </div>

      <div className="inspector-section">
        <label className="inspector-label">ID</label>
        <div className="inspector-hint" style={{ fontFamily: "monospace", color: "#aaa" }}>
          {walkbox.id}
        </div>
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Vertices</label>
        <div className="inspector-hint">
          {walkbox.polygon.length} points
        </div>
      </div>

      <div className="inspector-section">
        <TutorialBubble title="Shape Lock" description="When locked, dragging moves the entire walkbox polygon as one unit instead of moving individual vertices." preferSide="right">
          <label className="inspector-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={walkbox.shapeLocked ?? false}
              onChange={(e) => updateWalkbox({ shapeLocked: e.target.checked })}
            />
            Shape Locked
          </label>
        </TutorialBubble>
        <div className="inspector-hint">
          When locked, dragging moves the entire polygon instead of individual vertices.
        </div>
      </div>

      {otherWalkboxes.length > 0 && (
        <div className="inspector-section">
          <TutorialBubble title="Adjacent Walkboxes" description="Link walkboxes that share an edge so actors can pathfind between them. Without adjacency, actors cannot cross from one walkbox to another." preferSide="right">
            <label className="inspector-label">Adjacent Walkboxes</label>
          </TutorialBubble>
          <div className="inspector-hint">
            Check walkboxes that connect to this one for pathfinding.
          </div>
          <div className="walkbox-adj-list">
            {otherWalkboxes.map((other) => (
              <label key={other.id} className="walkbox-adj-item">
                <input
                  type="checkbox"
                  checked={(walkbox!.adjacentIds ?? []).includes(other.id)}
                  onChange={() => toggleAdjacent(other.id)}
                />
                <span>{other.id}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="inspector-section">
        <TutorialBubble title="Depth Scale" description="Controls how actors scale based on Y position. Near (bottom) = full size, Far (top) = smaller. Creates perspective depth." preferSide="right">
          <label className="inspector-label">Depth Scale</label>
        </TutorialBubble>
        <div className="inspector-hint">
          Character scale based on Y position. Near = bottom of walkbox, Far = top.
        </div>
        <div className="inspector-grid">
          <label className="inspector-label-sm">Scale Near</label>
          <input
            className="ed-input ed-input-sm"
            type="number"
            step="0.05"
            min="0.1"
            max="3"
            value={scale.near}
            onChange={(e) => updateScale("near", parseFloat(e.target.value) || 1)}
          />
          <label className="inspector-label-sm">Scale Far</label>
          <input
            className="ed-input ed-input-sm"
            type="number"
            step="0.05"
            min="0.1"
            max="3"
            value={scale.far}
            onChange={(e) => updateScale("far", parseFloat(e.target.value) || 0.5)}
          />
          <label className="inspector-label-sm">Y Near</label>
          <input
            className="ed-input ed-input-sm"
            type="number"
            value={scale.yNear}
            onChange={(e) => updateScale("yNear", parseInt(e.target.value) || 0)}
          />
          <label className="inspector-label-sm">Y Far</label>
          <input
            className="ed-input ed-input-sm"
            type="number"
            value={scale.yFar}
            onChange={(e) => updateScale("yFar", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Speed Modifier</label>
        <div className="inspector-hint">
          Movement speed multiplier in this walkbox (1 = normal).
        </div>
        <input
          className="ed-input ed-input-sm"
          type="number"
          step="0.1"
          min="0.1"
          max="5"
          value={walkbox.speedModifier ?? 1}
          onChange={(e) => updateWalkbox({ speedModifier: parseFloat(e.target.value) || 1 })}
        />
      </div>
    </div>
  );
}
