import { useState } from "react";
import type { Engine } from "../../../engine/core/Engine";
import type { EditState } from "./debugTabTypes";

export function VariablesTab({
  engine,
  filteredVars,
  edit,
}: {
  engine: Engine;
  filteredVars: [string, boolean | number | string][];
  edit: EditState;
}) {
  const [newVarName, setNewVarName] = useState("");
  const [newVarValue, setNewVarValue] = useState("");

  const commitVarEdit = (key: string) => {
    const trimmed = edit.editValue.trim();
    if (trimmed === "true") {
      engine.setDebugVariable(key, true);
    } else if (trimmed === "false") {
      engine.setDebugVariable(key, false);
    } else {
      const numVal = Number(trimmed);
      if (!isNaN(numVal) && trimmed !== "") {
        engine.setDebugVariable(key, numVal);
      } else {
        engine.setDebugVariable(key, edit.editValue);
      }
    }
    edit.setEditingKey(null);
  };

  return (
    <div className="debug-list">
      {filteredVars.length === 0 && (
        <div className="debug-empty">No variables set</div>
      )}
      {filteredVars.map(([key, value]) => (
        <div key={key} className="debug-row">
          <span className="debug-key">{key}</span>
          {edit.editingKey === `var:${key}` ? (
            <input
              ref={edit.editInputRef}
              className="debug-edit-input"
              value={edit.editValue}
              onChange={(e) => edit.setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitVarEdit(key);
                if (e.key === "Escape") edit.setEditingKey(null);
              }}
              onBlur={() => edit.setEditingKey(null)}
            />
          ) : (
            <span
              className="debug-value debug-editable"
              onClick={() => edit.startEdit(`var:${key}`, String(value))}
              title="Click to edit"
            >
              {String(value)}
            </span>
          )}
        </div>
      ))}
      <div className="debug-add-row">
        <input className="debug-add-input" type="text" placeholder="Name..." value={newVarName} onChange={(e) => setNewVarName(e.target.value)} style={{ flex: 1 }} />
        <input
          className="debug-add-input"
          type="text"
          placeholder="Value..."
          value={newVarValue}
          onChange={(e) => setNewVarValue(e.target.value)}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newVarName.trim()) {
              const trimmed = newVarValue.trim();
              let val: boolean | number | string;
              if (trimmed === "true") val = true;
              else if (trimmed === "false") val = false;
              else { const n = Number(trimmed); val = (!isNaN(n) && trimmed !== "") ? n : newVarValue; }
              engine.setDebugVariable(newVarName.trim(), val);
              setNewVarName("");
              setNewVarValue("");
            }
          }}
        />
        <button
          className="btn btn-xs btn-primary"
          disabled={!newVarName.trim()}
          onClick={() => {
            if (newVarName.trim()) {
              const trimmed = newVarValue.trim();
              let val: boolean | number | string;
              if (trimmed === "true") val = true;
              else if (trimmed === "false") val = false;
              else { const n = Number(trimmed); val = (!isNaN(n) && trimmed !== "") ? n : newVarValue; }
              engine.setDebugVariable(newVarName.trim(), val);
              setNewVarName("");
              setNewVarValue("");
            }
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
