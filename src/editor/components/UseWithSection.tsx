import { useState } from "react";
import { useEditor } from "../store";
import ScriptPicker from "./ScriptPicker";

interface UseWithSectionProps {
  useWithHandlers: Record<string, string>;
  onChange: (handlers: Record<string, string>) => void;
  entityId: string;
}

export default function UseWithSection({ useWithHandlers, onChange, entityId }: UseWithSectionProps) {
  const { state } = useEditor();
  const project = state.currentProject;
  const [newItemId, setNewItemId] = useState("");

  if (!project) return null;

  const entries = Object.entries(useWithHandlers);
  const usedItemIds = new Set(entries.map(([id]) => id));
  const availableItems = project.items.filter((i) => !usedItemIds.has(i.id));

  function addEntry() {
    if (!newItemId) return;
    onChange({ ...useWithHandlers, [newItemId]: "" });
    setNewItemId("");
  }

  function removeEntry(itemId: string) {
    const updated = { ...useWithHandlers };
    delete updated[itemId];
    onChange(updated);
  }

  function updateScript(itemId: string, scriptId: string) {
    onChange({ ...useWithHandlers, [itemId]: scriptId });
  }

  return (
    <div className="inspector-section">
      <label className="inspector-label">Use With (Two-Object Interactions)</label>
      <div className="inspector-hint">
        Define what happens when a specific inventory item is used on this target. These are checked before the generic "use" handler.
      </div>

      {entries.length > 0 && (
        <div className="verb-handler-list">
          {entries.map(([itemId, scriptId]) => {
            const item = project.items.find((i) => i.id === itemId);
            return (
              <div key={itemId} className="verb-handler-row">
                <span
                  style={{
                    width: 80,
                    flexShrink: 0,
                    fontSize: "0.8em",
                    color: item ? "#c0d0ff" : "#f87171",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={itemId}
                >
                  {item?.name ?? itemId}
                </span>
                <ScriptPicker
                  value={scriptId}
                  onChange={(s) => updateScript(itemId, s)}
                  entityId={entityId}
                  verb={`use_${itemId}`}
                />
                <button
                  className="btn btn-danger btn-xs"
                  onClick={() => removeEntry(itemId)}
                  title="Remove"
                >✕</button>
              </div>
            );
          })}
        </div>
      )}

      {availableItems.length > 0 && (
        <div className="verb-handler-add">
          <select
            className="ed-input ed-input-sm"
            value={newItemId}
            onChange={(e) => setNewItemId(e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
          >
            <option value="">Select item...</option>
            {availableItems.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-xs"
            onClick={addEntry}
            disabled={!newItemId}
          >
            + Add
          </button>
        </div>
      )}
    </div>
  );
}
