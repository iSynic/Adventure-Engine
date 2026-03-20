import { useState } from "react";
import { useEditor } from "../store";
import { resolveAssetUrl } from "../utils/projectStorage";
import type { EditorObjectDefinition } from "../types";
import type { StateSpriteEntry, AnimationState, Direction, ConditionExpression, Rect, VerbType } from "../../engine/core/types";
import TutorialBubble from "./TutorialBubble";
import ConditionBuilder from "./ConditionBuilder";
import ScriptPicker from "./ScriptPicker";
import UseWithSection from "./UseWithSection";
import InteractionResolution from "./InteractionResolution";
import InteractionAnchorsSection from "./InteractionAnchorsSection";

const VERB_OPTIONS: VerbType[] = ["look", "open", "close", "pickup", "use", "talk", "push", "pull", "give"];

const INTERACTION_ANIM_OPTIONS: { value: AnimationState | ""; label: string }[] = [
  { value: "", label: "-- None (default) --" },
  { value: "interact_low", label: "interact_low" },
  { value: "interact_mid", label: "interact_mid" },
  { value: "interact_high", label: "interact_high" },
  { value: "interact", label: "interact" },
  { value: "pickup", label: "pickup" },
  { value: "push_pull", label: "push_pull" },
  { value: "special_use", label: "special_use" },
];

const AFFORDANCE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "(default)" },
  { value: "look", label: "look" },
  { value: "pickup", label: "pickup" },
  { value: "use", label: "use" },
  { value: "talk", label: "talk" },
  { value: "none", label: "none" },
];

// ─── TagsInput: editable tag chip list ───────────────────────────────────────
function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      const tag = input.trim();
      if (!tags.includes(tag)) {
        onChange([...tags, tag]);
      }
      setInput("");
    }
  }

  function handleRemove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              background: "rgba(100,140,255,0.2)",
              border: "1px solid rgba(100,140,255,0.4)",
              borderRadius: 10,
              padding: "1px 8px",
              fontSize: "0.8em",
              color: "#c0d0ff",
            }}
          >
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              style={{
                background: "none",
                border: "none",
                color: "#ff6b6b",
                cursor: "pointer",
                padding: 0,
                fontSize: "0.9em",
                lineHeight: 1,
              }}
              title="Remove tag"
            >
              x
            </button>
          </span>
        ))}
      </div>
      <input
        className="ed-input ed-input-sm"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type tag and press Enter"
        style={{ width: "100%" }}
      />
    </div>
  );
}

// ─── HotspotEditor: pixel-level interaction hotspot with sprite overlay ───────
function HotspotEditor({
  hotspot,
  onChange,
  spriteAsset,
}: {
  hotspot: Rect | undefined;
  onChange: (h: Rect | undefined) => void;
  spriteAsset: { dataUrl: string; width: number; height: number } | null;
}) {
  const enabled = hotspot !== undefined;

  function toggle() {
    if (enabled) {
      onChange(undefined);
    } else {
      onChange({ x: 0, y: 0, width: 32, height: 32 });
    }
  }

  function update(field: keyof Rect, value: number) {
    if (!hotspot) return;
    onChange({ ...hotspot, [field]: value });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <input type="checkbox" checked={enabled} onChange={toggle} />
        <span style={{ fontSize: "0.85em", color: "#aaa" }}>Enable custom interaction hotspot</span>
      </div>
      {enabled && hotspot && (
        <>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.7em", color: "#888" }}>X</label>
              <input className="ed-input ed-input-sm" type="number" value={hotspot.x} onChange={(e) => update("x", Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.7em", color: "#888" }}>Y</label>
              <input className="ed-input ed-input-sm" type="number" value={hotspot.y} onChange={(e) => update("y", Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.7em", color: "#888" }}>W</label>
              <input className="ed-input ed-input-sm" type="number" value={hotspot.width} onChange={(e) => update("width", Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.7em", color: "#888" }}>H</label>
              <input className="ed-input ed-input-sm" type="number" value={hotspot.height} onChange={(e) => update("height", Number(e.target.value))} style={{ width: "100%" }} />
            </div>
          </div>
          {spriteAsset && (
            <div style={{ position: "relative", display: "inline-block", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }}>
              <img
                src={spriteAsset.dataUrl}
                alt="Sprite preview"
                style={{ display: "block", maxWidth: 128, maxHeight: 128, imageRendering: "pixelated" }}
              />
              <div
                style={{
                  position: "absolute",
                  left: `${(hotspot.x / spriteAsset.width) * 100}%`,
                  top: `${(hotspot.y / spriteAsset.height) * 100}%`,
                  width: `${(hotspot.width / spriteAsset.width) * 100}%`,
                  height: `${(hotspot.height / spriteAsset.height) * 100}%`,
                  background: "rgba(0, 200, 255, 0.3)",
                  border: "1px solid rgba(0, 200, 255, 0.7)",
                  pointerEvents: "none",
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ObjectInspector() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  const selected = state.selectedEntity;

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newSprite, setNewSprite] = useState("");

  if (!project || !selected || selected.type !== "object") return null;

  const obj = project.objects.find((o) => o.id === selected.id);
  if (!obj) return null;

  const stateSprites = obj.stateSprites ?? [];

  function updateObject(updates: Partial<EditorObjectDefinition>) {
    dispatch({ type: "UPDATE_OBJECT", objectId: obj!.id, updates });
  }

  function handleAddStateSprite() {
    if (!newKey.trim() || !newValue.trim() || !newSprite.trim()) return;
    const entry: StateSpriteEntry = {
      stateKey: newKey.trim(),
      stateValue: newValue.trim(),
      spritePath: newSprite.trim(),
    };
    updateObject({ stateSprites: [...stateSprites, entry] });
    setNewKey("");
    setNewValue("");
    setNewSprite("");
  }

  function handleRemoveStateSprite(index: number) {
    const updated = stateSprites.filter((_, i) => i !== index);
    updateObject({ stateSprites: updated });
  }

  function handleUpdateStateSpriteSprite(index: number, spritePath: string) {
    const updated = stateSprites.map((e, i) =>
      i === index ? { ...e, spritePath } : e
    );
    updateObject({ stateSprites: updated });
  }

  function handleUpdateStateSpriteField(index: number, field: string, value: number | undefined) {
    const updated = stateSprites.map((e, i) =>
      i === index ? { ...e, [field]: value } : e
    );
    updateObject({ stateSprites: updated });
  }

  function handleUpdateStateSpriteRect(index: number, rect: Rect | undefined) {
    const updated = stateSprites.map((e, i) =>
      i === index ? { ...e, atlasRect: rect } : e
    );
    updateObject({ stateSprites: updated });
  }

  const imageAssets = project.assets.filter((a) => a.type !== "audio");
  const primarySpriteAssets = imageAssets.filter((a) => a.type === "sprite");
  const otherSpriteAssets = imageAssets.filter((a) => a.type !== "sprite");
  const currentSpriteAsset = obj.spritePath
    ? project.assets.find((a) => a.id === obj.spritePath)
    : null;

  const spriteAssets = project.assets.filter(
    (a) => a.type === "sprite" || a.type === "other" || a.type === "background"
  );

  return (
    <div className="object-inspector">
      <div className="inspector-header">Object: {obj.name}</div>

      {/* ─── Basic info ───────────────────────────────────────────────────── */}
      <div className="inspector-section">
        <label className="inspector-label">Name</label>
        <input
          className="ed-input ed-input-sm"
          value={obj.name}
          onChange={(e) => updateObject({ name: e.target.value })}
        />
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Description</label>
        <input
          className="ed-input ed-input-sm"
          value={obj.description ?? ""}
          onChange={(e) => updateObject({ description: e.target.value })}
        />
      </div>

      <div className="inspector-section" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85em" }}>
          <input
            type="checkbox"
            checked={obj.visible ?? true}
            onChange={(e) => updateObject({ visible: e.target.checked })}
          />
          Visible on start
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85em" }}>
          <input
            type="checkbox"
            checked={obj.enabled ?? true}
            onChange={(e) => updateObject({ enabled: e.target.checked })}
          />
          Enabled on start
        </label>
      </div>

      {/* ─── Tags / classification ───────────────────────────────────────── */}
      <div className="inspector-section">
        <label className="inspector-label">Tags / Class</label>
        <div className="inspector-hint">
          Categorize objects with tags for condition checks and script logic.
        </div>
        <TagsInput
          tags={obj.tags ?? []}
          onChange={(tags) => updateObject({ tags: tags.length > 0 ? tags : undefined })}
        />
      </div>

      {/* ─── Sprite / visual ─────────────────────────────────────────────── */}
      <div className="inspector-section">
        <TutorialBubble title="Initial Primary State" description="The starting state index for this object. Each index maps to a state sprite entry. Changing this switches which sprite is displayed when the room loads." preferSide="right">
          <label className="inspector-label">Initial Primary State</label>
        </TutorialBubble>
        <div className="inspector-hint">
          Numeric state index (0-based) into the state sprites list for simple state machines.
        </div>
        <input
          className="ed-input ed-input-sm"
          type="number"
          min={0}
          value={obj.primaryState ?? 0}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            const clamped = isNaN(val) ? 0 : Math.max(0, val);
            updateObject({ primaryState: clamped === 0 ? undefined : clamped });
          }}
          style={{ width: 80 }}
        />
        {stateSprites.length > 0 && (
          <div style={{ fontSize: "0.75em", color: "#888", marginTop: 2 }}>
            {stateSprites.map((entry, i) => (
              <span key={i} style={{ color: i === (obj.primaryState ?? 0) ? "#6bf" : undefined }}>
                {i}: {entry.stateKey}={entry.stateValue}{i < stateSprites.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Sprite</label>
        <TutorialBubble
          title="Object Sprite"
          description="Choose a sprite image for this object from the asset library. Sprites are listed first, followed by other image types. A thumbnail preview shows the selected image."
          preferSide="right"
        >
          <div className="bg-picker-row">
            {currentSpriteAsset && (
              <img src={resolveAssetUrl(project.id, currentSpriteAsset.id, currentSpriteAsset.dataUrl)} alt="Sprite" className="bg-picker-thumb" />
            )}
            <select
              className="ed-input ed-input-sm bg-picker-select"
              value={obj.spritePath ?? ""}
              onChange={(e) => updateObject({ spritePath: e.target.value || undefined })}
            >
              <option value="">-- None --</option>
              {primarySpriteAssets.length > 0 && (
                <optgroup label="Sprites">
                  {primarySpriteAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </optgroup>
              )}
              {otherSpriteAssets.length > 0 && (
                <optgroup label="Other Images">
                  {otherSpriteAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </TutorialBubble>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-header">
          <TutorialBubble title="State Sprites" description="Define alternate sprites for this object based on state key/value pairs. When the object's state matches a key=value entry, its sprite switches. Entries are checked in order — the first match wins." preferSide="right">
            <label className="inspector-label">State Sprites</label>
          </TutorialBubble>
        </div>
        <div className="inspector-hint">
          Map state key/value pairs to different sprites. The first matching entry wins.
        </div>

        {stateSprites.length > 0 && (
          <div className="state-sprite-list">
            {stateSprites.map((entry, i) => (
              <div key={i} className="state-sprite-row">
                <div className="state-sprite-condition">
                  <span className="state-sprite-key">{entry.stateKey}</span>
                  <span className="state-sprite-eq">=</span>
                  <span className="state-sprite-val">{entry.stateValue}</span>
                </div>
                <div className="state-sprite-path-row">
                  <select
                    className="ed-input ed-input-sm state-sprite-select"
                    value={entry.spritePath}
                    onChange={(e) => handleUpdateStateSpriteSprite(i, e.target.value)}
                  >
                    <option value={entry.spritePath}>{entry.spritePath || "(none)"}</option>
                    {spriteAssets
                      .filter((a) => a.id !== entry.spritePath)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                  <button
                    className="btn btn-danger btn-xs"
                    onClick={() => handleRemoveStateSprite(i)}
                    title="Remove"
                  >
                    x
                  </button>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 2, alignItems: "center" }}>
                  <label style={{ fontSize: "0.7em", color: "#888", width: 28 }}>FPS</label>
                  <input
                    className="ed-input ed-input-sm"
                    type="number"
                    min={0}
                    value={entry.fps ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleUpdateStateSpriteField(i, "fps", isNaN(val) || val <= 0 ? undefined : val);
                    }}
                    style={{ width: 50 }}
                  />
                  {(entry.fps ?? 0) > 0 && (
                    <>
                      <label style={{ fontSize: "0.7em", color: "#888", width: 42 }}>Frames</label>
                      <input
                        className="ed-input ed-input-sm"
                        type="number"
                        min={1}
                        value={entry.frameCount ?? 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleUpdateStateSpriteField(i, "frameCount", isNaN(val) || val <= 1 ? undefined : val);
                        }}
                        style={{ width: 50 }}
                      />
                    </>
                  )}
                </div>
                <div style={{ marginTop: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <input
                      type="checkbox"
                      checked={entry.atlasRect !== undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleUpdateStateSpriteRect(i, { x: 0, y: 0, width: 32, height: 32 });
                        } else {
                          handleUpdateStateSpriteRect(i, undefined);
                        }
                      }}
                    />
                    <span style={{ fontSize: "0.7em", color: "#888" }}>Atlas sub-rect</span>
                  </div>
                  {entry.atlasRect && (
                    <div style={{ display: "flex", gap: 3 }}>
                      {(["x", "y", "width", "height"] as const).map((field) => (
                        <div key={field} style={{ flex: 1 }}>
                          <label style={{ fontSize: "0.65em", color: "#666" }}>{field.charAt(0).toUpperCase()}</label>
                          <input
                            className="ed-input ed-input-sm"
                            type="number"
                            min={0}
                            value={entry.atlasRect![field]}
                            onChange={(e) => {
                              handleUpdateStateSpriteRect(i, { ...entry.atlasRect!, [field]: Number(e.target.value) });
                            }}
                            style={{ width: "100%" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="state-sprite-add">
          <div className="state-sprite-add-row">
            <input
              className="ed-input ed-input-sm"
              placeholder="State key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            <span className="state-sprite-eq">=</span>
            <input
              className="ed-input ed-input-sm"
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <div className="state-sprite-add-row">
            <select
              className="ed-input ed-input-sm state-sprite-select"
              value={newSprite}
              onChange={(e) => setNewSprite(e.target.value)}
            >
              <option value="">Select sprite...</option>
              {spriteAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input
              className="ed-input ed-input-sm"
              placeholder="Or type path"
              value={newSprite}
              onChange={(e) => setNewSprite(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary btn-xs"
            onClick={handleAddStateSprite}
            disabled={!newKey.trim() || !newValue.trim() || !newSprite.trim()}
          >
            + Add State Sprite
          </button>
        </div>
      </div>

      {/* ─── Interaction region ──────────────────────────────────────────── */}
      <div className="inspector-section">
        <label className="inspector-label">Interaction Hotspot</label>
        <div className="inspector-hint">
          Define a custom clickable region in sprite-local coordinates. If not set, the object bounds are used.
        </div>
        <HotspotEditor
          hotspot={obj.interactionHotspot}
          onChange={(h) => updateObject({ interactionHotspot: h })}
          spriteAsset={currentSpriteAsset ? { dataUrl: resolveAssetUrl(project.id, currentSpriteAsset.id, currentSpriteAsset.dataUrl), width: currentSpriteAsset.width, height: currentSpriteAsset.height } : null}
        />
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Z Layer</label>
        <select
          className="ed-input ed-input-sm"
          value={obj.zLayer ?? "normal"}
          onChange={(e) => {
            const val = e.target.value as "behind" | "normal" | "front";
            updateObject({ zLayer: val === "normal" ? undefined : val });
          }}
        >
          <option value="behind">Behind (drawn first)</option>
          <option value="normal">Normal (Y-sorted with actors)</option>
          <option value="front">Front (drawn last)</option>
        </select>
        <div className="inspector-hint">
          Controls rendering order relative to actors. Behind objects always render under actors, front objects always over.
        </div>
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Pickupable</label>
        <input
          type="checkbox"
          checked={obj.pickupable ?? false}
          onChange={(e) => updateObject({ pickupable: e.target.checked })}
        />
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Interaction Animation</label>
        <select
          className="ed-input ed-input-sm"
          value={obj.interactionAnimation ?? ""}
          onChange={(e) =>
            updateObject({
              interactionAnimation: (e.target.value || undefined) as AnimationState | undefined,
            })
          }
        >
          {INTERACTION_ANIM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="inspector-hint">
          Actor animation state triggered when interacting with this object.
        </div>
      </div>
      {/* ─── Routing: walk-to point, approach direction, anchors ─────────── */}
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
            value={obj.standPoint?.x ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                updateObject({ standPoint: undefined });
              } else {
                updateObject({ standPoint: { x: Number(val), y: obj.standPoint?.y ?? 0 } });
              }
            }}
            style={{ width: 64 }}
          />
          <input
            className="ed-input ed-input-sm"
            type="number"
            placeholder="Y"
            value={obj.standPoint?.y ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                updateObject({ standPoint: undefined });
              } else {
                updateObject({ standPoint: { x: obj.standPoint?.x ?? 0, y: Number(val) } });
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
          value={obj.approachDirection ?? ""}
          onChange={(e) =>
            updateObject({
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
        anchors={obj.interactionAnchors ?? {}}
        interactDistance={obj.interactDistance}
        onChange={(a) => updateObject({ interactionAnchors: Object.keys(a).length > 0 ? a : undefined })}
        onChangeDistance={(v) => updateObject({ interactDistance: v })}
      />

      {/* ─── Appearance / cursor / affordance ────────────────────────────── */}
      <div className="inspector-section">
        <label className="inspector-label">Cursor Override</label>
        <div className="inspector-hint">
          CSS cursor name or asset path shown when hovering over this object.
        </div>
        <input
          className="ed-input ed-input-sm"
          value={obj.cursorOverride ?? ""}
          onChange={(e) => updateObject({ cursorOverride: e.target.value || undefined })}
          placeholder="e.g. pointer, grab, help"
        />
      </div>

      <div className="inspector-section">
        <label className="inspector-label">Affordance</label>
        <div className="inspector-hint">
          Semantic interaction hint. Overrides the default verb when the player clicks with "walk" selected.
        </div>
        <select
          className="ed-input ed-input-sm"
          value={obj.affordance ?? ""}
          onChange={(e) => {
            const val = e.target.value as "look" | "pickup" | "use" | "talk" | "none" | "";
            updateObject({ affordance: val || undefined });
          }}
        >
          {AFFORDANCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* ─── Verb handlers / scripts ─────────────────────────────────────── */}
      <ObjectVerbHandlers obj={obj} updateObject={updateObject} />

      {/* ─── Conditions / resolution ─────────────────────────────────────── */}
      <ConditionBuilder
        label="Visibility Condition"
        condition={obj.visibilityCondition}
        onChange={(c: ConditionExpression | undefined) => updateObject({ visibilityCondition: c })}
      />

      <ConditionBuilder
        label="Interaction Condition"
        condition={obj.interactionCondition}
        onChange={(c: ConditionExpression | undefined) => updateObject({ interactionCondition: c })}
      />

      <InteractionResolution
        verbHandlers={obj.verbHandlers ?? {}}
        useWithHandlers={obj.useWithHandlers}
        fallbackScriptId={obj.fallbackScriptId}
      />
    </div>
  );
}

// ─── ObjectVerbHandlers: per-verb and use-with script picker ─────────────────
function ObjectVerbHandlers({ obj, updateObject }: { obj: EditorObjectDefinition; updateObject: (u: Partial<EditorObjectDefinition>) => void }) {
  const [newVerb, setNewVerb] = useState<VerbType>("look");
  const handlers = obj.verbHandlers ?? {};
  const usedVerbs = Object.keys(handlers) as VerbType[];
  const availableVerbs = VERB_OPTIONS.filter((v) => !usedVerbs.includes(v));
  const hasUseVerb = "use" in handlers;

  function addHandler() {
    if (!newVerb || usedVerbs.includes(newVerb)) return;
    updateObject({ verbHandlers: { ...handlers, [newVerb]: "" } });
    const remaining = VERB_OPTIONS.filter((v) => v !== newVerb && !usedVerbs.includes(v));
    if (remaining.length > 0) setNewVerb(remaining[0]);
  }

  function removeHandler(verb: string) {
    const updated = { ...handlers };
    delete updated[verb as VerbType];
    updateObject({ verbHandlers: updated });
  }

  function updateHandlerScript(verb: string, scriptId: string) {
    updateObject({ verbHandlers: { ...handlers, [verb]: scriptId } });
  }

  function changeHandlerVerb(oldVerb: string, newVerbVal: string) {
    const scriptId = handlers[oldVerb as VerbType] ?? "";
    const updated = { ...handlers };
    delete updated[oldVerb as VerbType];
    updated[newVerbVal as VerbType] = scriptId;
    updateObject({ verbHandlers: updated });
  }

  return (
    <>
      <div className="inspector-section">
        <label className="inspector-label">Verb Handlers</label>
        <div className="inspector-hint">
          Map verbs to scripts. The script runs when the player uses that verb on this object.
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
                    entityId={obj.id}
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
          useWithHandlers={obj.useWithHandlers ?? {}}
          onChange={(uwh) => updateObject({ useWithHandlers: Object.keys(uwh).length > 0 ? uwh : undefined })}
          entityId={obj.id}
        />
      )}

      <div className="inspector-section">
        <label className="inspector-label">Default / Fallback Script</label>
        <div className="inspector-hint">
          Runs when no verb handler matches. Leave empty for built-in default response.
        </div>
        <ScriptPicker
          value={obj.fallbackScriptId ?? ""}
          onChange={(s) => updateObject({ fallbackScriptId: s || undefined })}
          entityId={obj.id}
          verb="fallback"
        />
      </div>
    </>
  );
}
