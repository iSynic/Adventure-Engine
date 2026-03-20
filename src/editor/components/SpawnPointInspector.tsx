import { useEditor } from "../store";
import type { Direction } from "../../engine/core/types";
import TutorialBubble from "./TutorialBubble";

const DIRECTIONS: Direction[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export default function SpawnPointInspector() {
  const { state, dispatch, selectedRoom } = useEditor();
  const selected = state.selectedEntity;

  if (!selectedRoom || !selected || selected.type !== "spawn") return null;

  const spawn = (selectedRoom.spawnPoints ?? []).find((s) => s.id === selected.id);
  if (!spawn) return null;

  function updateSpawn(updates: Record<string, unknown>) {
    const spawnPoints = (selectedRoom!.spawnPoints ?? []).map((s) =>
      s.id === selected!.id ? { ...s, ...updates } : s
    );
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates: { spawnPoints } });
  }

  function updateId(newId: string) {
    if (!newId.trim()) return;
    const spawnPoints = (selectedRoom!.spawnPoints ?? []).map((s) =>
      s.id === selected!.id ? { ...s, id: newId.trim() } : s
    );
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates: { spawnPoints } });
    dispatch({ type: "SELECT_ENTITY", entity: { type: "spawn", id: newId.trim(), roomId: selectedRoom!.id } });
  }

  function handleDelete() {
    if (selectedRoom!.spawnPoints && selectedRoom!.spawnPoints.length <= 1) {
      alert("You must have at least one spawn point.");
      return;
    }
    const spawnPoints = (selectedRoom!.spawnPoints ?? []).filter((sp) => sp.id !== selected!.id);
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates: { spawnPoints } });
    dispatch({ type: "SELECT_ENTITY", entity: null });
  }

  return (
    <div className="object-inspector">
      <div className="inspector-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Spawn Point: {spawn.id}</span>
        <TutorialBubble title="Delete Spawn Point" description="Remove this spawn point. At least one spawn point must remain in each room." preferSide="left">
          <button className="btn btn-danger btn-xs" onClick={handleDelete} title="Delete spawn point">Delete</button>
        </TutorialBubble>
      </div>

      <div className="inspector-section">
        <TutorialBubble title="Spawn Point ID" description="Unique identifier for this spawn point. Referenced by exits in other rooms to determine where the player appears." preferSide="right">
          <label className="inspector-label">ID</label>
        </TutorialBubble>
        <input
          className="ed-input ed-input-sm"
          value={spawn.id}
          onChange={(e) => updateId(e.target.value)}
          placeholder="e.g. from_north"
        />
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Position</label>
        <div className="inspector-hint">
          x: {spawn.x}, y: {spawn.y}
        </div>
      </div>

      <div className="inspector-section">
        <TutorialBubble title="Facing Direction" description="The direction the player faces when spawning at this point. Choose the direction that makes sense for the entry angle." preferSide="right">
          <label className="inspector-label">Facing Direction</label>
        </TutorialBubble>
        <select
          className="ed-input ed-input-sm"
          value={spawn.facing ?? "S"}
          onChange={(e) => updateSpawn({ facing: e.target.value })}
        >
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
