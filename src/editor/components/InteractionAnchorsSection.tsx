import { useState } from "react";
import type { VerbType, Direction, InteractionAnchor } from "../../engine/core/types";

const ALL_VERBS: VerbType[] = ["look", "open", "close", "pickup", "use", "talk", "push", "pull", "give"];
const DIRECTIONS: Direction[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

interface Props {
  anchors: Partial<Record<VerbType, InteractionAnchor>>;
  interactDistance?: number;
  facePlayerOnInteract?: boolean;
  showFacePlayer?: boolean;
  onChange: (anchors: Partial<Record<VerbType, InteractionAnchor>>) => void;
  onChangeDistance: (v: number | undefined) => void;
  onChangeFacePlayer?: (v: boolean) => void;
}

export default function InteractionAnchorsSection({
  anchors,
  interactDistance,
  facePlayerOnInteract,
  showFacePlayer,
  onChange,
  onChangeDistance,
  onChangeFacePlayer,
}: Props) {
  const usedVerbs = Object.keys(anchors) as VerbType[];
  const availableVerbs = ALL_VERBS.filter((v) => !usedVerbs.includes(v));
  const [newVerb, setNewVerb] = useState<VerbType>(availableVerbs[0] ?? "look");

  const anchorCount = usedVerbs.length;
  const summary = anchorCount > 0 ? `Interaction Anchors (${anchorCount})` : "Interaction Anchors";

  function addAnchor() {
    if (!newVerb || usedVerbs.includes(newVerb)) return;
    const updated = { ...anchors, [newVerb]: { point: { x: 0, y: 0 } } };
    onChange(updated);
    const remaining = ALL_VERBS.filter((v) => v !== newVerb && !usedVerbs.includes(v));
    if (remaining.length > 0) setNewVerb(remaining[0]);
  }

  function removeAnchor(verb: VerbType) {
    const updated = { ...anchors };
    delete updated[verb];
    onChange(updated);
    if (!availableVerbs.includes(verb)) {
      setNewVerb(verb);
    }
  }

  function updateAnchor(verb: VerbType, updates: Partial<InteractionAnchor>) {
    const existing = anchors[verb] ?? { point: { x: 0, y: 0 } };
    onChange({ ...anchors, [verb]: { ...existing, ...updates } });
  }

  function updatePoint(verb: VerbType, axis: "x" | "y", val: string) {
    const existing = anchors[verb] ?? { point: { x: 0, y: 0 } };
    const n = val === "" ? 0 : (parseInt(val, 10) || 0);
    onChange({ ...anchors, [verb]: { ...existing, point: { ...existing.point, [axis]: n } } });
  }

  return (
    <details className="inspector-section" style={{ borderTop: "1px solid var(--border-subtle, #333)", paddingTop: 4 }}>
      <summary style={{ cursor: "pointer", userSelect: "none", fontSize: 12, fontWeight: 600, color: "var(--text-muted, #aaa)", padding: "4px 0", listStyle: "none", display: "flex", alignItems: "center", gap: 4 }}>
        ▸ {summary}
      </summary>

      <div style={{ paddingTop: 6 }}>
        <div className="inspector-section">
          <label className="inspector-label">Interact Distance (px)</label>
          <div className="inspector-hint">
            Player walks within this radius before the interaction fires. Leave empty for default.
          </div>
          <input
            className="ed-input ed-input-sm"
            type="number"
            min={0}
            step={4}
            placeholder="default"
            value={interactDistance ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              const n = parseInt(val, 10);
              onChangeDistance(val === "" || isNaN(n) ? undefined : n);
            }}
            style={{ width: 90 }}
          />
        </div>

        {showFacePlayer && (
          <div className="inspector-section">
            <label className="inspector-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={facePlayerOnInteract ?? false}
                onChange={(e) => onChangeFacePlayer?.(e.target.checked)}
              />
              NPC turns to face player after arrival
            </label>
            <div className="inspector-hint">
              When enabled, this NPC rotates to face the player after the player arrives at the approach point.
            </div>
          </div>
        )}

        <div className="inspector-section">
          <label className="inspector-label">Per-Verb Anchors</label>
          <div className="inspector-hint">
            Override the global stand point for a specific verb. The player walks to the anchor point before that verb fires.
          </div>

          {usedVerbs.map((verb) => {
            const anchor = anchors[verb]!;
            return (
              <div key={verb} style={{ border: "1px solid var(--border-subtle, #333)", borderRadius: 4, padding: 6, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-muted, #aaa)" }}>{verb}</span>
                  <button className="btn btn-danger btn-xs" onClick={() => removeAnchor(verb)} title="Remove anchor">✕</button>
                </div>

                <div className="detail-row-pair" style={{ marginBottom: 4 }}>
                  <label className="detail-label-sm">
                    X
                    <input
                      className="ed-input ed-input-sm"
                      type="number"
                      value={anchor.point.x}
                      onChange={(e) => updatePoint(verb, "x", e.target.value)}
                      style={{ width: 64 }}
                    />
                  </label>
                  <label className="detail-label-sm">
                    Y
                    <input
                      className="ed-input ed-input-sm"
                      type="number"
                      value={anchor.point.y}
                      onChange={(e) => updatePoint(verb, "y", e.target.value)}
                      style={{ width: 64 }}
                    />
                  </label>
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <label style={{ fontSize: 11, color: "var(--text-muted, #aaa)" }}>Facing</label>
                  <select
                    className="ed-input ed-input-sm"
                    value={anchor.facing ?? ""}
                    onChange={(e) => updateAnchor(verb, { facing: (e.target.value || undefined) as Direction | undefined })}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Auto --</option>
                    {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <label style={{ fontSize: 11, color: "var(--text-muted, #aaa)" }}>Dist</label>
                  <input
                    className="ed-input ed-input-sm"
                    type="number"
                    min={0}
                    step={4}
                    placeholder="inherit"
                    value={anchor.interactDistance ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const n = parseInt(val, 10);
                      updateAnchor(verb, { interactDistance: val === "" || isNaN(n) ? undefined : n });
                    }}
                    style={{ width: 60 }}
                  />
                </div>
              </div>
            );
          })}

          {availableVerbs.length > 0 && (
            <div className="verb-handler-add">
              <select
                className="ed-input ed-input-sm"
                value={newVerb}
                onChange={(e) => setNewVerb(e.target.value as VerbType)}
                style={{ flex: 1, minWidth: 0 }}
              >
                {availableVerbs.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <button className="btn btn-primary btn-xs" onClick={addAnchor}>+ Add</button>
            </div>
          )}

          {availableVerbs.length === 0 && usedVerbs.length > 0 && (
            <div className="inspector-hint">All verbs have anchors defined.</div>
          )}
        </div>
      </div>
    </details>
  );
}
