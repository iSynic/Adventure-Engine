import { useState } from "react";
import { useEditor } from "../store";
import type { EditorProject, EditorAction } from "../types";
import type { ItemDefinition, VerbType } from "../../engine/core/types";
import ScriptPicker from "../components/ScriptPicker";
import UseWithSection from "../components/UseWithSection";
import InteractionResolution from "../components/InteractionResolution";
import TutorialBubble from "../components/TutorialBubble";
import { generateId, resolveAssetUrl } from "../utils/projectStorage";
import type { EditorAsset } from "../types";

export default function ItemsPanel() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  if (!project) return null;

  function handleAdd() {
    if (!newName.trim()) return;
    const item: ItemDefinition = {
      id: generateId("item"),
      name: newName.trim(),
      description: "",
    };
    dispatch({ type: "ADD_ITEM", item });
    setShowNew(false);
    setNewName("");
  }

  const selectedItem = selectedItemId
    ? project.items.find((i) => i.id === selectedItemId)
    : null;

  return (
    <div className="tab-panel">
      <div className="panel-header">
        <span>Inventory Items</span>
        <button className="btn btn-ghost btn-xs" onClick={() => setShowNew(true)}>+</button>
      </div>
      {showNew && (
        <div className="inline-form">
          <input
            className="ed-input ed-input-sm"
            autoFocus
            placeholder="Item name..."
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
        {project.items.length === 0 && <div className="entity-empty">No items yet.</div>}
        {project.items.map((item) => (
          <div
            key={item.id}
            className={`entity-row${selectedItemId === item.id ? " entity-row-selected" : ""}`}
            onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
          >
            <span className="entity-icon">🎒</span>
            <span className="entity-name">{item.name}</span>
            <span className="entity-id">{item.id}</span>
            <button
              className="btn btn-danger btn-xs"
              onClick={(e) => { e.stopPropagation(); dispatch({ type: "DELETE_ITEM", itemId: item.id }); if (selectedItemId === item.id) setSelectedItemId(null); }}
            >✕</button>
          </div>
        ))}
      </div>
      {selectedItem && (
        <ItemDetail item={selectedItem} project={project} dispatch={dispatch} />
      )}
    </div>
  );
}

function ItemDetail({ item, project, dispatch }: { item: ItemDefinition; project: EditorProject; dispatch: (a: EditorAction) => void }) {
  function updateItem(updates: Partial<ItemDefinition>) {
    dispatch({ type: "UPDATE_ITEM", itemId: item.id, updates });
  }

  const imageAssets = project.assets.filter((a) => a.type !== "audio");
  const iconAssets = imageAssets.filter((a) => a.type === "icon");
  const otherImageAssets = imageAssets.filter((a) => a.type !== "icon");
  const currentIconAsset = item.iconPath
    ? project.assets.find((a) => a.id === item.iconPath)
    : null;

  const ITEM_VERB_OPTIONS: VerbType[] = ["look", "open", "close", "use", "push", "pull", "give"];
  const handlers = item.verbHandlers ?? {};
  const usedVerbs = Object.keys(handlers) as VerbType[];
  const availableVerbs = ITEM_VERB_OPTIONS.filter((v) => !usedVerbs.includes(v));
  const [newVerb, setNewVerb] = useState<VerbType>(availableVerbs[0] ?? "look");
  const hasUseVerb = "use" in handlers;

  function addHandler() {
    if (!newVerb || usedVerbs.includes(newVerb)) return;
    updateItem({ verbHandlers: { ...handlers, [newVerb]: "" } });
    const remaining = ITEM_VERB_OPTIONS.filter((v) => v !== newVerb && !usedVerbs.includes(v));
    if (remaining.length > 0) setNewVerb(remaining[0]);
  }

  function removeHandler(verb: string) {
    const updated = { ...handlers };
    delete updated[verb as VerbType];
    updateItem({ verbHandlers: updated });
  }

  function updateHandlerScript(verb: string, scriptId: string) {
    updateItem({ verbHandlers: { ...handlers, [verb]: scriptId } });
  }

  function changeHandlerVerb(oldVerb: string, newVerbVal: string) {
    const scriptId = handlers[oldVerb as VerbType] ?? "";
    const updated = { ...handlers };
    delete updated[oldVerb as VerbType];
    updated[newVerbVal as VerbType] = scriptId;
    updateItem({ verbHandlers: updated });
  }

  return (
    <div className="entity-detail">
      <div className="panel-header"><span>Item Details</span></div>
      <div className="entity-detail-fields">
        <div className="inspector-section">
          <label className="inspector-label">Name</label>
          <input
            className="ed-input ed-input-sm"
            value={item.name}
            onChange={(e) => updateItem({ name: e.target.value })}
          />
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Description</label>
          <textarea
            className="ed-input ed-input-sm"
            rows={3}
            value={item.description ?? ""}
            onChange={(e) => updateItem({ description: e.target.value })}
            placeholder="Item description..."
            style={{ resize: "vertical" }}
          />
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Icon</label>
          <TutorialBubble
            title="Item Icon"
            description="Choose an icon image for this inventory item. Icons are listed first, followed by other image types. The icon appears in the inventory bar when the player carries this item."
            preferSide="right"
          >
            <div className="bg-picker-row">
              {currentIconAsset && (
                <img src={resolveAssetUrl(project.id, currentIconAsset.id, currentIconAsset.dataUrl)} alt="Icon" className="bg-picker-thumb" />
              )}
              <select
                className="ed-input ed-input-sm bg-picker-select"
                value={item.iconPath ?? ""}
                onChange={(e) => updateItem({ iconPath: e.target.value || undefined })}
              >
                <option value="">-- None --</option>
                {iconAssets.length > 0 && (
                  <optgroup label="Icons">
                    {iconAssets.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </optgroup>
                )}
                {otherImageAssets.length > 0 && (
                  <optgroup label="Other Images">
                    {otherImageAssets.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </TutorialBubble>
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Verb Handlers</label>
          <div className="inspector-hint">
            Map verbs to scripts. The script runs when the player uses that verb on this item.
          </div>

          {usedVerbs.length > 0 && (
            <div className="verb-handler-list">
              {usedVerbs.map((verb) => {
                const otherAvailable = ITEM_VERB_OPTIONS.filter(
                  (v) => v === verb || !usedVerbs.includes(v)
                );
                return (
                  <div key={verb} className="verb-handler-row">
                    <select
                      className="ed-input ed-input-sm"
                      value={verb}
                      onChange={(e) => changeHandlerVerb(verb, e.target.value)}
                      style={{ width: 72, flexShrink: 0 }}
                    >
                      {otherAvailable.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <ScriptPicker
                      value={handlers[verb] ?? ""}
                      onChange={(s) => updateHandlerScript(verb, s)}
                      entityId={item.id}
                      verb={verb}
                    />
                    <button
                      className="btn btn-danger btn-xs"
                      onClick={() => removeHandler(verb)}
                      title="Remove handler"
                    >✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {availableVerbs.length > 0 && (
            <div className="verb-handler-add">
              <select
                className="ed-input ed-input-sm"
                value={newVerb}
                onChange={(e) => setNewVerb(e.target.value as VerbType)}
                style={{ flex: 1, minWidth: 0 }}
              >
                {availableVerbs.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <button className="btn btn-primary btn-xs" onClick={addHandler}>+ Add</button>
            </div>
          )}
        </div>

        {hasUseVerb && (
          <UseWithSection
            useWithHandlers={item.useWithHandlers ?? {}}
            onChange={(uwh) => updateItem({ useWithHandlers: Object.keys(uwh).length > 0 ? uwh : undefined })}
            entityId={item.id}
          />
        )}

        <div className="inspector-section">
          <label className="inspector-label">Default / Fallback Script</label>
          <div className="inspector-hint">
            Runs when no verb handler matches. Leave empty for built-in default response.
          </div>
          <ScriptPicker
            value={item.fallbackScriptId ?? ""}
            onChange={(s) => updateItem({ fallbackScriptId: s || undefined })}
            entityId={item.id}
            verb="fallback"
          />
        </div>

        <InteractionResolution
          verbHandlers={handlers}
          useWithHandlers={item.useWithHandlers}
          fallbackScriptId={item.fallbackScriptId}
        />
      </div>
    </div>
  );
}
