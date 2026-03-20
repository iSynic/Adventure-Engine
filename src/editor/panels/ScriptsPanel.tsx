import { useEffect, useState, useMemo, useRef } from "react";
import { useEditor } from "../store";
import type { EditorScript } from "../types";
import type { ScriptStep } from "../../engine/core/types";
import FloatingScriptEditor from "../components/FloatingScriptEditor";
import { stepsToRawJs } from "../utils/stepsToRawJs";

export default function ScriptsPanel() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSteps, setEditSteps] = useState<ScriptStep[]>([]);
  const [editKind, setEditKind] = useState<"raw" | "visual">("raw");
  const [isNewScript, setIsNewScript] = useState(false);

  const savedBodyRef = useRef("");

  const rawPreview = useMemo(
    () => (editKind === "visual" ? stepsToRawJs(editSteps) : ""),
    [editKind, editSteps],
  );

  useEffect(() => {
    if (state.pendingEditScript && project) {
      const script = project.scripts.find((s) => s.name === state.pendingEditScript);
      if (script) {
        openScript(script);
      }
      dispatch({ type: "CLEAR_PENDING_SCRIPT" });
    }
  }, [state.pendingEditScript, project, dispatch]);

  if (!project) return null;

  function isDirty() {
    return editKind === "raw" && editBody !== savedBodyRef.current;
  }

  function openScript(script: EditorScript, asNew = false) {
    setEditing(script.name);
    if (script.kind === "visual" && script.steps && script.steps.length > 0) {
      const compiled = stepsToRawJs(script.steps);
      setEditBody(compiled);
      savedBodyRef.current = compiled;
      setEditSteps([]);
      setEditKind("raw");
      setIsNewScript(false);
      dispatch({
        type: "UPDATE_SCRIPT",
        name: script.name,
        updates: { kind: "raw", body: compiled, steps: undefined },
      });
    } else if (asNew) {
      setEditBody("");
      savedBodyRef.current = "";
      setEditSteps([]);
      setEditKind("visual");
      setIsNewScript(true);
    } else {
      setEditBody(script.body);
      savedBodyRef.current = script.body;
      setEditSteps([]);
      setEditKind("raw");
      setIsNewScript(false);
    }
  }

  function handleAdd() {
    if (!newName.trim()) return;
    const script: EditorScript = {
      name: newName.trim(),
      body: "",
      description: "",
      kind: "visual",
      steps: [],
    };
    dispatch({ type: "ADD_SCRIPT", script });
    setShowNew(false);
    setNewName("");
    openScript(script, true);
  }

  function startEdit(script: EditorScript) {
    if (editing && isDirty()) {
      if (!window.confirm(`Close "${editing}" without saving? Your changes will be lost.`)) return;
    }
    openScript(script);
  }

  function saveEdit() {
    if (!editing) return;
    if (editKind === "visual") {
      const compiledBody = stepsToRawJs(editSteps);
      dispatch({
        type: "UPDATE_SCRIPT",
        name: editing,
        updates: { kind: "raw", body: compiledBody, steps: undefined },
      });
    } else {
      dispatch({
        type: "UPDATE_SCRIPT",
        name: editing,
        updates: { kind: "raw", body: editBody, steps: undefined },
      });
    }
    setEditing(null);
    setIsNewScript(false);
  }

  function switchToRaw() {
    if (editSteps.length > 0) {
      if (!window.confirm("Switching to Raw cannot be undone. Your visual steps will be converted to raw JavaScript. Continue?")) return;
    }
    const compiled = stepsToRawJs(editSteps);
    setEditBody(compiled);
    savedBodyRef.current = compiled;
    setEditSteps([]);
    setEditKind("raw");
  }

  function closeEdit() {
    if (isDirty()) {
      if (!window.confirm("Close without saving? Your changes will be lost.")) return;
    }
    setEditing(null);
    setIsNewScript(false);
  }

  return (
    <div className="tab-panel scripts-panel">
      <div className="scripts-float-panel">
        <div className="scripts-float-header">
          <span>Scripts</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setShowNew(true)}>+</button>
        </div>
        <div className="scripts-float-body">
          {showNew && (
            <div className="inline-form" style={{ padding: "6px 8px" }}>
              <input
                className="ed-input ed-input-sm"
                autoFocus
                placeholder="Script name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setShowNew(false); setNewName(""); }
                }}
              />
              <button className="btn btn-primary btn-xs" onClick={handleAdd}>Add</button>
              <button className="btn btn-ghost btn-xs" onClick={() => { setShowNew(false); setNewName(""); }}>x</button>
            </div>
          )}
          <div className="entity-list">
            {project.scripts.length === 0 && <div className="entity-empty">No scripts yet.</div>}
            {project.scripts.map((s) => (
              <div key={s.name} className={`entity-row${editing === s.name ? " entity-row-active" : ""}`}>
                <span className="entity-icon">📜</span>
                <span className="entity-name">{s.name}</span>
                <button className="btn btn-ghost btn-xs" onClick={() => startEdit(s)}>Edit</button>
                <button className="btn btn-danger btn-xs" onClick={() => dispatch({ type: "DELETE_SCRIPT", name: s.name })}>x</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <FloatingScriptEditor
          scriptName={editing}
          editKind={editKind}
          editBody={editBody}
          editSteps={editSteps}
          isNewScript={isNewScript}
          rawPreview={rawPreview}
          onBodyChange={setEditBody}
          onStepsChange={setEditSteps}
          onSave={saveEdit}
          onClose={closeEdit}
          onSwitchToRaw={switchToRaw}
        />
      )}
    </div>
  );
}
