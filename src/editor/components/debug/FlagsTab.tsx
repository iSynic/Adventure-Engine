import { useState } from "react";
import type { Engine } from "../../../engine/core/Engine";
import type { EditState } from "./debugTabTypes";

export function FlagsTab({
  engine,
  filteredFlags,
  edit,
}: {
  engine: Engine;
  filteredFlags: [string, boolean][];
  edit: EditState;
}) {
  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagValue, setNewFlagValue] = useState(true);

  const commitFlagEdit = (key: string) => {
    const lower = edit.editValue.toLowerCase().trim();
    const boolVal = lower === "true" || lower === "1";
    engine.setDebugFlag(key, boolVal);
    edit.setEditingKey(null);
  };

  return (
    <div className="debug-list">
      {filteredFlags.length === 0 && (
        <div className="debug-empty">No flags set</div>
      )}
      {filteredFlags.map(([key, value]) => (
        <div key={key} className="debug-row">
          <span className="debug-key">{key}</span>
          {edit.editingKey === `flag:${key}` ? (
            <input
              ref={edit.editInputRef}
              className="debug-edit-input"
              value={edit.editValue}
              onChange={(e) => edit.setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitFlagEdit(key);
                if (e.key === "Escape") edit.setEditingKey(null);
              }}
              onBlur={() => edit.setEditingKey(null)}
            />
          ) : (
            <span
              className={`debug-value debug-bool ${value ? "debug-true" : "debug-false"}`}
              onClick={() => edit.startEdit(`flag:${key}`, String(value))}
              title="Click to edit"
            >
              {String(value)}
            </span>
          )}
        </div>
      ))}
      <div className="debug-add-row">
        <input
          className="debug-add-input"
          type="text"
          placeholder="New flag name..."
          value={newFlagName}
          onChange={(e) => setNewFlagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newFlagName.trim()) {
              engine.setDebugFlag(newFlagName.trim(), newFlagValue);
              setNewFlagName("");
            }
          }}
        />
        <select
          className="debug-select"
          value={String(newFlagValue)}
          onChange={(e) => setNewFlagValue(e.target.value === "true")}
          style={{ flex: "0 0 60px" }}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
        <button
          className="btn btn-xs btn-primary"
          disabled={!newFlagName.trim()}
          onClick={() => {
            if (newFlagName.trim()) {
              engine.setDebugFlag(newFlagName.trim(), newFlagValue);
              setNewFlagName("");
            }
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
