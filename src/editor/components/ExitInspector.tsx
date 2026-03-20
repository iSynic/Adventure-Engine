import { useEditor } from "../store";
import type { Direction, ConditionExpression } from "../../engine/core/types";
import ConditionBuilder from "./ConditionBuilder";
import TutorialBubble from "./TutorialBubble";

const DIRECTIONS: Direction[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export default function ExitInspector() {
  const { state, dispatch, selectedRoom } = useEditor();
  const project = state.currentProject;
  const selected = state.selectedEntity;

  if (!project || !selectedRoom || !selected || selected.type !== "exit") return null;

  const exit = (selectedRoom.exits ?? []).find((e) => e.id === selected.id);
  if (!exit) return null;

  function updateExit(updates: Record<string, unknown>) {
    const exits = (selectedRoom!.exits ?? []).map((e) =>
      e.id === selected!.id ? { ...e, ...updates } : e
    );
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates: { exits } });
  }

  const targetRoom = project.rooms.find((r) => r.id === exit.targetRoomId);
  const targetSpawns = targetRoom?.spawnPoints ?? [];

  function handleDelete() {
    const exits = (selectedRoom!.exits ?? []).filter((ex) => ex.id !== selected!.id);
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates: { exits } });
    dispatch({ type: "SELECT_ENTITY", entity: null });
  }

  return (
    <div className="object-inspector">
      <div className="inspector-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Exit: {exit.label || exit.id}</span>
        <TutorialBubble title="Delete Exit" description="Remove this exit region from the room." preferSide="left">
          <button className="btn btn-danger btn-xs" onClick={handleDelete} title="Delete exit">Delete</button>
        </TutorialBubble>
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Label</label>
        <input
          className="ed-input ed-input-sm"
          value={exit.label ?? ""}
          onChange={(e) => updateExit({ label: e.target.value })}
          placeholder="e.g. Go to Garden"
        />
      </div>

      <div className="inspector-section">
        <TutorialBubble title="Target Room" description="The room the player transitions to when clicking this exit. Must match an existing room ID." preferSide="right">
          <label className="inspector-label">Target Room</label>
        </TutorialBubble>
        <select
          className="ed-input ed-input-sm"
          value={exit.targetRoomId}
          onChange={(e) => updateExit({ targetRoomId: e.target.value, targetSpawnPointId: "" })}
        >
          <option value="">-- Select Room --</option>
          {project.rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name || r.id}</option>
            ))}
        </select>
      </div>

      <div className="inspector-section">
        <TutorialBubble title="Target Spawn Point" description="Where the player appears in the target room. Create matching spawn points in connected rooms for bidirectional navigation." preferSide="right">
          <label className="inspector-label">Target Spawn Point</label>
        </TutorialBubble>
        <select
          className="ed-input ed-input-sm"
          value={exit.targetSpawnPointId ?? ""}
          onChange={(e) => updateExit({ targetSpawnPointId: e.target.value || undefined })}
        >
          <option value="">Default</option>
          {targetSpawns.map((sp) => (
            <option key={sp.id} value={sp.id}>{sp.id}</option>
          ))}
        </select>
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Direction</label>
        <select
          className="ed-input ed-input-sm"
          value={exit.direction}
          onChange={(e) => updateExit({ direction: e.target.value })}
        >
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Bounds</label>
        <div className="inspector-hint">
          x: {exit.bounds.x}, y: {exit.bounds.y}, {exit.bounds.width}×{exit.bounds.height}
        </div>
      </div>

      <ConditionBuilder
        label="Visibility Condition"
        condition={exit.visibilityCondition as ConditionExpression | undefined}
        onChange={(c: ConditionExpression | undefined) => updateExit({ visibilityCondition: c })}
      />
      <ConditionBuilder
        label="Interaction Condition"
        condition={exit.interactionCondition as ConditionExpression | undefined}
        onChange={(c: ConditionExpression | undefined) => updateExit({ interactionCondition: c })}
      />
    </div>
  );
}
