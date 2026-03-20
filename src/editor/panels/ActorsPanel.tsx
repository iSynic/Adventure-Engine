import { useState } from "react";
import { useEditor } from "../store";
import type { EditorActorDefinition } from "../types";
import ActorInspector from "../components/ActorInspector";
import { generateId } from "../utils/projectStorage";

export default function ActorsPanel() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  if (!project) return null;

  function handleAdd() {
    if (!newName.trim()) return;
    const actor: EditorActorDefinition = {
      id: generateId("actor"),
      name: newName.trim(),
      defaultRoomId: project!.startingRoom,
      position: { x: 200, y: 350 },
      spritePath: "",
      spriteWidth: 48,
      spriteHeight: 96,
      scale: 1,
    };
    dispatch({ type: "ADD_ACTOR", actor });
    setShowNew(false);
    setNewName("");
  }

  const selectedActor = selectedActorId
    ? project.actors.find((a) => a.id === selectedActorId)
    : null;

  return (
    <div className="tab-panel">
      <div className="panel-header">
        <span>Actors</span>
        <button className="btn btn-ghost btn-xs" onClick={() => setShowNew(true)}>+</button>
      </div>
      {showNew && (
        <div className="inline-form">
          <input
            className="ed-input ed-input-sm"
            autoFocus
            placeholder="Actor name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setShowNew(false); setNewName(""); }
            }}
          />
          <button className="btn btn-primary btn-xs" onClick={handleAdd}>Add</button>
          <button className="btn btn-ghost btn-xs" onClick={() => { setShowNew(false); setNewName(""); }}>✕</button>
        </div>
      )}
      <div className="entity-list">
        {project.actors.length === 0 && <div className="entity-empty">No actors yet.</div>}
        {project.actors.map((a) => (
          <div
            key={a.id}
            className={`entity-row${selectedActorId === a.id ? " entity-row-selected" : ""}`}
            onClick={() => setSelectedActorId(selectedActorId === a.id ? null : a.id)}
          >
            <span className="entity-icon">🧍</span>
            <span className="entity-name">{a.name}</span>
            <span className="entity-id">{a.id}</span>
            <button
              className="btn btn-danger btn-xs"
              onClick={(e) => { e.stopPropagation(); dispatch({ type: "DELETE_ACTOR", actorId: a.id }); if (selectedActorId === a.id) setSelectedActorId(null); }}
            >✕</button>
          </div>
        ))}
      </div>
      {selectedActor && (
        <ActorInspector actor={selectedActor} project={project} dispatch={dispatch} />
      )}
    </div>
  );
}
