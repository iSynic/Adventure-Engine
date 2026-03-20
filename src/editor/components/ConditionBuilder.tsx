import { useState, useEffect } from "react";
import type { ConditionExpression, ComparisonOperator } from "../../engine/core/types";
import { useEditor } from "../store";
import TutorialBubble from "./TutorialBubble";

type ConditionType = ConditionExpression["type"];

const CONDITION_TYPES: { value: ConditionType; label: string }[] = [
  { value: "flag", label: "Flag" },
  { value: "variable", label: "Variable" },
  { value: "inventory", label: "Has Item" },
  { value: "objectState", label: "Object State" },
  { value: "roomVisited", label: "Room Visited" },
  { value: "dialogueNodeSeen", label: "Dialogue Node Seen" },
  { value: "hasTag", label: "Has Tag" },
  { value: "and", label: "All Of (AND)" },
  { value: "or", label: "Any Of (OR)" },
  { value: "not", label: "Not" },
];

const OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
];

function createDefault(type: ConditionType): ConditionExpression {
  switch (type) {
    case "flag": return { type: "flag", flag: "" };
    case "variable": return { type: "variable", variable: "", operator: "==", value: 0 };
    case "inventory": return { type: "inventory", actorId: "player", itemId: "" };
    case "objectState": return { type: "objectState", objectId: "", key: "", value: "" };
    case "roomVisited": return { type: "roomVisited", roomId: "" };
    case "dialogueNodeSeen": return { type: "dialogueNodeSeen", treeId: "", nodeId: "" };
    case "and": return { type: "and", conditions: [] };
    case "or": return { type: "or", conditions: [] };
    case "hasTag": return { type: "hasTag", objectId: "", tag: "" };
    case "not": return { type: "not", condition: { type: "flag", flag: "" } };
  }
}

function HasTagEditor({
  condition,
  onChange,
}: {
  condition: ConditionExpression & { type: "hasTag" };
  onChange: (c: ConditionExpression) => void;
}) {
  const { state } = useEditor();
  const objects = state.currentProject?.objects ?? [];
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select
        className="ed-input ed-input-sm"
        value={condition.objectId}
        onChange={(e) => onChange({ ...condition, objectId: e.target.value })}
        style={{ flex: 1 }}
      >
        <option value="">-- Select object --</option>
        {objects.map((o) => (
          <option key={o.id} value={o.id}>{o.name} ({o.id})</option>
        ))}
      </select>
      <input
        className="ed-input ed-input-sm"
        value={condition.tag}
        onChange={(e) => onChange({ ...condition, tag: e.target.value })}
        placeholder="Tag"
        style={{ flex: 1 }}
      />
    </div>
  );
}

function ConditionEditor({
  condition,
  onChange,
  onRemove,
  depth,
}: {
  condition: ConditionExpression;
  onChange: (c: ConditionExpression) => void;
  onRemove?: () => void;
  depth: number;
}) {
  const changeType = (newType: ConditionType) => {
    onChange(createDefault(newType));
  };

  return (
    <div className="condition-editor" style={{ marginLeft: depth > 0 ? 12 : 0, borderLeft: depth > 0 ? "2px solid rgba(255,255,255,0.1)" : "none", paddingLeft: depth > 0 ? 8 : 0, marginBottom: 4 }}>
      <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
        <select
          className="ed-input ed-input-sm"
          value={condition.type}
          onChange={(e) => changeType(e.target.value as ConditionType)}
          style={{ width: 110, flexShrink: 0 }}
        >
          {CONDITION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {onRemove && (
          <button className="btn btn-danger btn-xs" onClick={onRemove} title="Remove">x</button>
        )}
      </div>

      {condition.type === "flag" && (
        <div>
          <div style={{ color: "#888", fontSize: "0.65em", marginBottom: 2 }}>Check if a boolean flag is set to true or false.</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              className="ed-input ed-input-sm"
              value={condition.flag}
              onChange={(e) => onChange({ ...condition, flag: e.target.value })}
              placeholder="Flag name"
              style={{ flex: 1 }}
            />
            <select
              className="ed-input ed-input-sm"
              value={condition.value === false ? "false" : "true"}
              onChange={(e) => onChange({ ...condition, value: e.target.value === "true" })}
              style={{ width: 64 }}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </div>
      )}

      {condition.type === "variable" && (
        <div>
          <div style={{ color: "#888", fontSize: "0.65em", marginBottom: 2 }}>Compare a variable against a value using an operator.</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            className="ed-input ed-input-sm"
            value={condition.variable}
            onChange={(e) => onChange({ ...condition, variable: e.target.value })}
            placeholder="Variable name"
            style={{ flex: 1 }}
          />
          <select
            className="ed-input ed-input-sm"
            value={condition.operator}
            onChange={(e) => onChange({ ...condition, operator: e.target.value as ComparisonOperator })}
            style={{ width: 52 }}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          <input
            className="ed-input ed-input-sm"
            value={String(condition.value)}
            onChange={(e) => {
              const raw = e.target.value;
              let parsed: boolean | number | string;
              if (raw === "true") parsed = true;
              else if (raw === "false") parsed = false;
              else { const num = Number(raw); parsed = isNaN(num) ? raw : num; }
              onChange({ ...condition, value: parsed });
            }}
            placeholder="Value (number, string, true/false)"
            style={{ width: 80 }}
          />
          </div>
        </div>
      )}

      {condition.type === "inventory" && (
        <div>
          <div style={{ color: "#888", fontSize: "0.65em", marginBottom: 2 }}>Check if an actor has a specific item in their inventory.</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              className="ed-input ed-input-sm"
              value={condition.actorId}
              onChange={(e) => onChange({ ...condition, actorId: e.target.value })}
              placeholder="Actor ID"
              style={{ flex: 1 }}
              title="The actor whose inventory to check (use 'player' for the player character)"
            />
            <span style={{ color: "#999", fontSize: "0.8em" }}>has</span>
            <input
              className="ed-input ed-input-sm"
              value={condition.itemId}
              onChange={(e) => onChange({ ...condition, itemId: e.target.value })}
              placeholder="Item ID"
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ color: "#888", fontSize: "0.65em", marginTop: 2 }}>Use "player" for the default player actor ID.</div>
        </div>
      )}

      {condition.type === "objectState" && (
        <div>
          <div style={{ color: "#888", fontSize: "0.65em", marginBottom: 2 }}>Compare an object's state property against a value.</div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="ed-input ed-input-sm"
            value={condition.objectId}
            onChange={(e) => onChange({ ...condition, objectId: e.target.value })}
            placeholder="Object ID"
            style={{ flex: 1, minWidth: 60 }}
          />
          <span style={{ color: "#999", fontSize: "0.8em" }}>.</span>
          <input
            className="ed-input ed-input-sm"
            value={condition.key}
            onChange={(e) => onChange({ ...condition, key: e.target.value })}
            placeholder="Key"
            style={{ width: 60 }}
            title="State property name (must match a key set via setObjectState)"
          />
          <select
            className="ed-input ed-input-sm"
            value={condition.operator ?? "=="}
            onChange={(e) => onChange({ ...condition, operator: e.target.value as ComparisonOperator })}
            style={{ width: 52 }}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          <input
            className="ed-input ed-input-sm"
            value={String(condition.value ?? "")}
            onChange={(e) => {
              const num = Number(e.target.value);
              onChange({ ...condition, value: isNaN(num) || e.target.value === "" ? e.target.value : num });
            }}
            placeholder="Value"
            style={{ width: 60 }}
          />
        </div>
        </div>
      )}

      {condition.type === "roomVisited" && (
        <div>
          <div style={{ color: "#888", fontSize: "0.65em", marginBottom: 2 }}>True if the player has entered this room at least once.</div>
          <input
            className="ed-input ed-input-sm"
            value={condition.roomId}
            onChange={(e) => onChange({ ...condition, roomId: e.target.value })}
            placeholder="Room ID"
          />
        </div>
      )}

      {condition.type === "dialogueNodeSeen" && (
        <div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              className="ed-input ed-input-sm"
              value={condition.treeId}
              onChange={(e) => onChange({ ...condition, treeId: e.target.value })}
              placeholder="Tree ID"
              style={{ flex: 1 }}
              title="The dialogue tree's unique identifier"
            />
            <input
              className="ed-input ed-input-sm"
              value={condition.nodeId}
              onChange={(e) => onChange({ ...condition, nodeId: e.target.value })}
              placeholder="Node ID"
              style={{ flex: 1 }}
              title="The specific node within the dialogue tree"
            />
          </div>
          <div style={{ color: "#888", fontSize: "0.65em", marginTop: 2 }}>True if the player has previously visited this dialogue node.</div>
        </div>
      )}

      {condition.type === "hasTag" && (
        <div>
          <div style={{ color: "#888", fontSize: "0.65em", marginBottom: 2 }}>True if the object has been assigned this tag.</div>
          <HasTagEditor condition={condition} onChange={onChange} />
        </div>
      )}

      {(condition.type === "and" || condition.type === "or") && (
        <div>
          <div style={{ color: "#888", fontSize: "0.65em", marginBottom: 2 }}>
            {condition.type === "and" ? "All sub-conditions must be true." : "At least one sub-condition must be true."}
          </div>
          {condition.conditions.map((child, i) => (
            <ConditionEditor
              key={i}
              condition={child}
              onChange={(c) => {
                const updated = [...condition.conditions];
                updated[i] = c;
                onChange({ ...condition, conditions: updated });
              }}
              onRemove={() => {
                const updated = condition.conditions.filter((_, j) => j !== i);
                onChange({ ...condition, conditions: updated });
              }}
              depth={depth + 1}
            />
          ))}
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => onChange({ ...condition, conditions: [...condition.conditions, createDefault("flag")] })}
            style={{ marginTop: 2 }}
          >
            + Add
          </button>
        </div>
      )}

      {condition.type === "not" && (
        <div>
          <div style={{ color: "#888", fontSize: "0.65em", marginBottom: 2 }}>Inverts the result of the sub-condition.</div>
          <ConditionEditor
            condition={condition.condition}
            onChange={(c) => onChange({ ...condition, condition: c })}
            depth={depth + 1}
          />
        </div>
      )}
    </div>
  );
}

function deriveMode(c: ConditionExpression | string | undefined): "none" | "flag" | "expression" {
  if (c === undefined) return "none";
  if (typeof c === "string") return "flag";
  if (c.type === "flag" && (c.value === undefined || c.value === true)) return "flag";
  return "expression";
}

function conditionToFlagName(c: ConditionExpression | string | undefined): string {
  if (typeof c === "string") return c;
  if (c && c.type === "flag") return c.flag;
  return "";
}

export default function ConditionBuilder({
  condition,
  onChange,
  label,
}: {
  condition?: ConditionExpression | string;
  onChange: (c: ConditionExpression | undefined) => void;
  label?: string;
}) {
  const [mode, setMode] = useState<"none" | "flag" | "expression">(deriveMode(condition));

  useEffect(() => {
    setMode(deriveMode(condition));
  }, [condition]);

  const handleModeChange = (newMode: string) => {
    if (newMode === "none") {
      setMode("none");
      onChange(undefined);
    } else if (newMode === "flag") {
      setMode("flag");
      const flagName = conditionToFlagName(condition);
      onChange(flagName ? { type: "flag", flag: flagName } : undefined);
    } else {
      setMode("expression");
      if (!condition || typeof condition === "string") {
        const flagName = conditionToFlagName(condition);
        onChange(flagName ? { type: "flag", flag: flagName } : createDefault("flag"));
      }
    }
  };

  return (
    <div className="inspector-section">
      {label && <label className="inspector-label">{label}</label>}
      <TutorialBubble title="Condition Mode" description="Choose how to define this condition. 'Simple Flag' checks a single boolean flag. 'Expression' opens the full condition builder with AND/OR/NOT logic." preferSide="right">
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
          <select
            className="ed-input ed-input-sm"
            value={mode}
            onChange={(e) => handleModeChange(e.target.value)}
            style={{ width: 120 }}
          >
            <option value="none">None</option>
            <option value="flag">Simple Flag</option>
            <option value="expression">Expression</option>
          </select>
        </div>
      </TutorialBubble>
      {mode === "flag" && (
        <input
          className="ed-input ed-input-sm"
          value={conditionToFlagName(condition)}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ type: "flag", flag: e.target.value });
            } else {
              onChange(undefined);
            }
          }}
          placeholder="Flag name (must be true)"
        />
      )}
      {mode === "expression" && condition && typeof condition !== "string" && (
        <div>
          <div style={{ color: "#888", fontSize: "0.65em", marginBottom: 4 }}>
            Choose a condition type, then fill in the fields. Use AND/OR/NOT to combine multiple conditions.
          </div>
          <ConditionEditor
            condition={condition}
            onChange={onChange}
            depth={0}
          />
        </div>
      )}
    </div>
  );
}

export { ConditionEditor };
