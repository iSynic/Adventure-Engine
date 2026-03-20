import type { Engine } from "../../../engine/core/Engine";
import type { DebugSnapshot } from "../../hooks/useDebugSnapshot";
import type { VariableDefinition } from "../../../engine/core/types";
import type { EditState } from "./debugTabTypes";

export function StateTab({
  engine,
  snapshot,
  playerActorId,
  filteredFlags,
  filteredVars,
  filteredRoomVars,
  filteredObjects,
  playerItems,
  varDefMap,
  edit,
}: {
  engine: Engine;
  snapshot: DebugSnapshot;
  playerActorId: string;
  filteredFlags: [string, boolean][];
  filteredVars: [string, boolean | number | string][];
  filteredRoomVars: [string, unknown][];
  filteredObjects: [string, Record<string, unknown>][];
  playerItems: string[];
  varDefMap: Map<string, VariableDefinition>;
  edit: EditState;
}) {
  const commitVarEdit = (key: string) => {
    const trimmed = edit.editValue.trim();
    if (trimmed === "true") engine.setDebugVariable(key, true);
    else if (trimmed === "false") engine.setDebugVariable(key, false);
    else {
      const numVal = Number(trimmed);
      if (!isNaN(numVal) && trimmed !== "") engine.setDebugVariable(key, numVal);
      else engine.setDebugVariable(key, edit.editValue);
    }
    edit.setEditingKey(null);
  };

  const commitRoomVarEdit = (roomId: string, key: string) => {
    const trimmed = edit.editValue.trim();
    if (trimmed === "true") engine.setDebugRoomVar(roomId, key, true);
    else if (trimmed === "false") engine.setDebugRoomVar(roomId, key, false);
    else {
      const numVal = Number(trimmed);
      if (!isNaN(numVal) && trimmed !== "") engine.setDebugRoomVar(roomId, key, numVal);
      else engine.setDebugRoomVar(roomId, key, edit.editValue);
    }
    edit.setEditingKey(null);
  };

  const commitObjectStateEdit = (objectId: string, key: string) => {
    const numVal = Number(edit.editValue);
    let val: unknown;
    if (edit.editValue === "true") val = true;
    else if (edit.editValue === "false") val = false;
    else if (!isNaN(numVal) && edit.editValue.trim() !== "") val = numVal;
    else val = edit.editValue;
    engine.setDebugObjectState(objectId, key, val);
    edit.setEditingKey(null);
  };

  return (
    <div className="debug-list">
      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>Global Flags</div>
      {filteredFlags.length === 0 && <div className="debug-empty">No flags set</div>}
      {filteredFlags.map(([key, value]) => (
        <div key={`f:${key}`} className="debug-row">
          <span className="debug-key">{key}</span>
          <span
            className={`debug-value debug-bool ${value ? "debug-true" : "debug-false"}`}
            onClick={() => engine.setDebugFlag(key, !value)}
            title="Click to toggle"
            style={{ cursor: "pointer" }}
          >
            {String(value)}
          </span>
        </div>
      ))}

      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4, marginTop: 8 }}>Global Variables</div>
      {filteredVars.length === 0 && <div className="debug-empty">No variables set</div>}
      {filteredVars.map(([key, value]) => {
        const def = varDefMap.get(key);
        return (
          <div key={`v:${key}`} className="debug-row" style={{ flexWrap: "wrap" }}>
            <span className="debug-key" title={def?.description ?? undefined}>{key}</span>
            {edit.editingKey === `state-var:${key}` ? (
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
                onClick={() => edit.startEdit(`state-var:${key}`, String(value))}
                title="Click to edit"
              >
                {String(value)}
              </span>
            )}
            {def && (
              <span style={{ width: "100%", fontSize: "0.7em", color: "#888", marginTop: 1 }}>
                {def.type}{def.description ? ` — ${def.description}` : ""}{def.min !== undefined ? ` [${def.min}..${def.max ?? "∞"}]` : ""}
              </span>
            )}
          </div>
        );
      })}

      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4, marginTop: 8 }}>Room Variables ({snapshot.currentRoomId})</div>
      {filteredRoomVars.length === 0 && <div className="debug-empty">No room variables</div>}
      {filteredRoomVars.map(([key, value]) => (
        <div key={`rv:${key}`} className="debug-row">
          <span className="debug-key">{key}</span>
          {edit.editingKey === `state-rv:${key}` ? (
            <input
              ref={edit.editInputRef}
              className="debug-edit-input"
              value={edit.editValue}
              onChange={(e) => edit.setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRoomVarEdit(snapshot.currentRoomId, key);
                if (e.key === "Escape") edit.setEditingKey(null);
              }}
              onBlur={() => edit.setEditingKey(null)}
            />
          ) : (
            <span
              className="debug-value debug-editable"
              onClick={() => edit.startEdit(`state-rv:${key}`, String(value))}
              title="Click to edit"
            >
              {String(value)}
            </span>
          )}
        </div>
      ))}

      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4, marginTop: 8 }}>Object States</div>
      {filteredObjects.length === 0 && <div className="debug-empty">No object states</div>}
      {filteredObjects.map(([objectId, states]) => (
        <div key={`os:${objectId}`} className="debug-object-group">
          <div className="debug-object-header">{objectId}</div>
          {Object.entries(states).map(([key, value]) => (
            <div key={key} className="debug-row debug-row-indent">
              <span className="debug-key">{key}</span>
              {edit.editingKey === `state-os:${objectId}:${key}` ? (
                <input
                  ref={edit.editInputRef}
                  className="debug-edit-input"
                  value={edit.editValue}
                  onChange={(e) => edit.setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitObjectStateEdit(objectId, key);
                    if (e.key === "Escape") edit.setEditingKey(null);
                  }}
                  onBlur={() => edit.setEditingKey(null)}
                />
              ) : (
                <span
                  className="debug-value debug-editable"
                  onClick={() => edit.startEdit(`state-os:${objectId}:${key}`, String(value))}
                  title="Click to edit"
                >
                  {String(value)}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4, marginTop: 8 }}>Inventory ({playerActorId})</div>
      {playerItems.length === 0 && <div className="debug-empty">Empty</div>}
      {playerItems.map((itemId) => (
        <div key={`inv:${itemId}`} className="debug-row">
          <span className="debug-key">{itemId}</span>
        </div>
      ))}
    </div>
  );
}
