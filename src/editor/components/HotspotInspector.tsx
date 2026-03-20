import { useState } from "react";
import { useEditor } from "../store";
import type { VerbType, Direction, ConditionExpression } from "../../engine/core/types";
import type { EditorHotspot } from "../types";
import InteractionAnchorsSection from "./InteractionAnchorsSection";
import ConditionBuilder from "./ConditionBuilder";
import ScriptPicker from "./ScriptPicker";
import UseWithSection from "./UseWithSection";
import InteractionResolution from "./InteractionResolution";
import TutorialBubble from "./TutorialBubble";

const VERB_OPTIONS: VerbType[] = ["look", "open", "close", "pickup", "use", "talk", "push", "pull", "give"];

export default function HotspotInspector() {
  const { state, dispatch, selectedRoom } = useEditor();
  const selected = state.selectedEntity;
  const [newVerb, setNewVerb] = useState<VerbType>("look");

  if (!selectedRoom || !selected || selected.type !== "hotspot") return null;

  const hotspot = (selectedRoom.hotspots ?? []).find((h) => h.id === selected.id);
  if (!hotspot) return null;

  const handlers = hotspot.verbHandlers ?? {};
  const usedVerbs = Object.keys(handlers) as VerbType[];
  const availableVerbs = VERB_OPTIONS.filter((v) => !usedVerbs.includes(v));

  function updateHotspot(updates: Partial<EditorHotspot>) {
    const hotspots = (selectedRoom!.hotspots ?? []).map((h) =>
      h.id === selected!.id ? { ...h, ...updates } : h
    );
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates: { hotspots } });
  }

  function addHandler() {
    if (!newVerb || usedVerbs.includes(newVerb)) return;
    const updated = { ...handlers, [newVerb]: "" };
    updateHotspot({ verbHandlers: updated });
    const remaining = VERB_OPTIONS.filter((v) => v !== newVerb && !usedVerbs.includes(v));
    if (remaining.length > 0) setNewVerb(remaining[0]);
  }

  function removeHandler(verb: string) {
    const updated = { ...handlers };
    delete updated[verb as VerbType];
    updateHotspot({ verbHandlers: updated });
  }

  function updateHandlerScript(verb: string, scriptId: string) {
    const updated = { ...handlers, [verb]: scriptId };
    updateHotspot({ verbHandlers: updated });
  }

  function changeHandlerVerb(oldVerb: string, newVerbVal: string) {
    const scriptId = handlers[oldVerb as VerbType] ?? "";
    const updated = { ...handlers };
    delete updated[oldVerb as VerbType];
    updated[newVerbVal as VerbType] = scriptId;
    updateHotspot({ verbHandlers: updated });
  }

  function handleDelete() {
    const hotspots = (selectedRoom!.hotspots ?? []).filter((hs) => hs.id !== selected!.id);
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates: { hotspots } });
    dispatch({ type: "SELECT_ENTITY", entity: null });
  }

  const hasUseVerb = "use" in handlers;

  return (
    <div className="object-inspector">
      <div className="inspector-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Hotspot: {hotspot.name}</span>
        <TutorialBubble title="Delete Hotspot" description="Remove this hotspot interaction zone from the room." preferSide="left">
          <button className="btn btn-danger btn-xs" onClick={handleDelete} title="Delete hotspot">Delete</button>
        </TutorialBubble>
      </div>
      <div className="inspector-hint" style={{ marginBottom: 6 }}>
        Hotspots are invisible interactive regions in the room. Players can interact with them using verbs. Define verb handlers to control what happens.
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Name</label>
        <input
          className="ed-input ed-input-sm"
          value={hotspot.name}
          onChange={(e) => updateHotspot({ name: e.target.value })}
        />
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Description</label>
        <input
          className="ed-input ed-input-sm"
          value={hotspot.description ?? ""}
          onChange={(e) => updateHotspot({ description: e.target.value })}
          placeholder="Look-at description"
        />
      </div>

      <div className="inspector-section">
        <TutorialBubble title="Z Layer" description="Controls whether this hotspot renders behind actors, in the normal Y-sorted order, or always in front. Useful for objects that should appear above or below characters." preferSide="right">
          <label className="inspector-label">Z Layer</label>
        </TutorialBubble>
        <select
          className="ed-input ed-input-sm"
          value={hotspot.zLayer ?? "normal"}
          onChange={(e) => {
            const val = e.target.value as "behind" | "normal" | "front";
            updateHotspot({ zLayer: val === "normal" ? undefined : val });
          }}
        >
          <option value="behind">Behind (drawn first)</option>
          <option value="normal">Normal (Y-sorted with actors)</option>
          <option value="front">Front (drawn last)</option>
        </select>
        <div className="inspector-hint">
          Controls rendering order relative to actors. Behind hotspots always render under actors, front hotspots always over.
        </div>
      </div>

      <div className="inspector-section">
        <TutorialBubble title="Verb Handlers" description="Map verbs (look, use, open, etc.) to scripts. When the player uses a verb on this hotspot, the assigned script runs." tip="Add a handler for each verb the player can use on this hotspot." preferSide="right">
          <label className="inspector-label">Verb Handlers</label>
        </TutorialBubble>
        <div className="inspector-hint">
          Map verbs to scripts. The script runs when the player uses that verb on this hotspot.
        </div>

        {usedVerbs.length > 0 && (
          <div className="verb-handler-list">
            {usedVerbs.map((verb) => {
              const otherAvailable = VERB_OPTIONS.filter(
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
                    entityId={hotspot.id}
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
          useWithHandlers={hotspot.useWithHandlers ?? {}}
          onChange={(uwh) => updateHotspot({ useWithHandlers: Object.keys(uwh).length > 0 ? uwh : undefined })}
          entityId={hotspot.id}
        />
      )}

      <div className="inspector-section">
        <label className="inspector-label">Default / Fallback Script</label>
        <div className="inspector-hint">
          Runs when no verb handler matches. Leave empty for built-in default response.
        </div>
        <ScriptPicker
          value={hotspot.fallbackScriptId ?? ""}
          onChange={(s) => updateHotspot({ fallbackScriptId: s || undefined })}
          entityId={hotspot.id}
          verb="fallback"
        />
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Stand Point</label>
        <div className="inspector-hint">
          Where the player walks to before interacting. Leave blank to auto-compute.
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <input
            className="ed-input ed-input-sm"
            type="number"
            placeholder="X"
            value={hotspot.standPoint?.x ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                updateHotspot({ standPoint: undefined });
              } else {
                updateHotspot({ standPoint: { x: Number(val), y: hotspot.standPoint?.y ?? 0 } });
              }
            }}
            style={{ width: 64 }}
          />
          <input
            className="ed-input ed-input-sm"
            type="number"
            placeholder="Y"
            value={hotspot.standPoint?.y ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                updateHotspot({ standPoint: undefined });
              } else {
                updateHotspot({ standPoint: { x: hotspot.standPoint?.x ?? 0, y: Number(val) } });
              }
            }}
            style={{ width: 64 }}
          />
        </div>
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Approach Direction</label>
        <select
          className="ed-input ed-input-sm"
          value={hotspot.approachDirection ?? ""}
          onChange={(e) =>
            updateHotspot({
              approachDirection: (e.target.value || undefined) as Direction | undefined,
            })
          }
        >
          <option value="">-- Auto --</option>
          {(["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as Direction[]).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div className="inspector-hint">
          Direction the player faces after arriving at the stand point.
        </div>
      </div>

      <InteractionAnchorsSection
        anchors={hotspot.interactionAnchors ?? {}}
        interactDistance={hotspot.interactDistance}
        onChange={(a) => updateHotspot({ interactionAnchors: Object.keys(a).length > 0 ? a : undefined })}
        onChangeDistance={(v) => updateHotspot({ interactDistance: v })}
      />

      {hotspot.polygon && hotspot.polygon.length >= 3 ? (
        <>
          <div className="inspector-section">
            <label className="inspector-label">Shape</label>
            <div className="inspector-hint">
              Polygon — {hotspot.polygon.length} vertices
            </div>
          </div>

          <div className="inspector-section">
            <label className="inspector-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={hotspot.shapeLocked ?? false}
                onChange={(e) => updateHotspot({ shapeLocked: e.target.checked })}
              />
              Shape Locked
            </label>
            <div className="inspector-hint">
              When locked, dragging moves the entire polygon instead of individual vertices.
            </div>
          </div>
        </>
      ) : (
        <div className="inspector-section">
          <label className="inspector-label">Bounds</label>
          <div className="inspector-hint">
            x: {hotspot.bounds.x}, y: {hotspot.bounds.y}, {hotspot.bounds.width}×{hotspot.bounds.height}
          </div>
        </div>
      )}

      <TutorialBubble title="Visibility Condition" description="When set, the hotspot is only visible if this condition is met. Hidden hotspots cannot be interacted with." preferSide="right">
        <ConditionBuilder
          label="Visibility Condition"
          condition={hotspot.visibilityCondition}
          onChange={(c: ConditionExpression | undefined) => updateHotspot({ visibilityCondition: c })}
        />
      </TutorialBubble>

      <TutorialBubble title="Interaction Condition" description="When set, the hotspot is visible but can only be interacted with if this condition is true. Useful for locked doors or items requiring prerequisites." preferSide="right">
        <ConditionBuilder
          label="Interaction Condition"
          condition={hotspot.interactionCondition}
          onChange={(c: ConditionExpression | undefined) => updateHotspot({ interactionCondition: c })}
        />
      </TutorialBubble>

      <InteractionResolution
        verbHandlers={handlers}
        useWithHandlers={hotspot.useWithHandlers}
        fallbackScriptId={hotspot.fallbackScriptId}
      />
    </div>
  );
}
