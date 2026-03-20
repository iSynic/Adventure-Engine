import { useState } from "react";
import type { ScriptStep } from "../../../engine/core/types";
import type { EditorProject } from "../../types";
import type { StepValidationError } from "../../utils/validateVisualScript";
import {
  directErrorsForStep,
  errorsForStep,
} from "../../utils/validateVisualScript";
import ConditionBuilder from "../ConditionBuilder";
import TutorialBubble from "../TutorialBubble";
import { StepForm } from "./StepForm";
import {
  STEP_CATALOG,
  CATEGORIES,
  createDefaultStep,
  stepLabel,
  stepSummary,
  pathsEqual,
} from "./scriptEditorUtils";

function StepListItem({
  step,
  index,
  path,
  isFirst,
  isLast,
  selectedPath,
  onSelectPath,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  errors,
  project,
  scriptName,
  depth,
}: {
  step: ScriptStep;
  index: number;
  path: number[];
  isFirst: boolean;
  isLast: boolean;
  selectedPath: number[] | null;
  onSelectPath: (p: number[] | null) => void;
  onUpdate: (s: ScriptStep) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  errors: StepValidationError[];
  project: EditorProject;
  scriptName?: string;
  depth: number;
}) {
  const stepPath = [...path, index];
  const isSelected = selectedPath !== null && pathsEqual(selectedPath, stepPath);
  const hasChildErrors = errorsForStep(errors, stepPath).length > 0;
  const borderColor = isSelected ? "rgba(100,180,255,0.5)" : hasChildErrors ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.08)";

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: 4,
      marginBottom: 4,
      background: isSelected
        ? "rgba(100,180,255,0.08)"
        : depth > 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
    }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 6px",
          cursor: "pointer",
          background: isSelected ? "rgba(100,180,255,0.06)" : "rgba(255,255,255,0.03)",
          borderRadius: 4,
        }}
        onClick={() => onSelectPath(isSelected ? null : stepPath)}
      >
        <span style={{
          background: step.type === "if" ? "rgba(130,100,255,0.2)" : "rgba(100,180,255,0.2)",
          padding: "1px 6px",
          borderRadius: 3,
          fontSize: "0.75em",
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {stepLabel(step.type)}
        </span>
        <span style={{ color: "#aaa", fontSize: "0.75em", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {stepSummary(step)}
        </span>
        {hasChildErrors && <span style={{ color: "#ff6b6b", fontSize: "0.7em" }} title="Has validation errors">!</span>}
        <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-xs" disabled={isFirst} onClick={onMoveUp} title="Move up" style={{ padding: "0 3px", fontSize: "0.7em" }}>{"\u25B2"}</button>
          <button className="btn btn-ghost btn-xs" disabled={isLast} onClick={onMoveDown} title="Move down" style={{ padding: "0 3px", fontSize: "0.7em" }}>{"\u25BC"}</button>
          <button className="btn btn-danger btn-xs" onClick={onDelete} title="Delete" style={{ padding: "0 4px" }}>x</button>
        </div>
      </div>

      {step.type === "if" && isSelected && (
        <div style={{ padding: "4px 6px 6px" }}>
          <IfStepEditor
            step={step}
            path={stepPath}
            onChange={onUpdate}
            errors={errors}
            project={project}
            scriptName={scriptName}
            depth={depth}
            selectedPath={selectedPath}
            onSelectPath={onSelectPath}
          />
        </div>
      )}
    </div>
  );
}

function IfStepEditor({
  step,
  path,
  onChange,
  errors,
  project,
  scriptName,
  depth,
  selectedPath,
  onSelectPath,
}: {
  step: Extract<ScriptStep, { type: "if" }>;
  path: number[];
  onChange: (s: ScriptStep) => void;
  errors: StepValidationError[];
  project: EditorProject;
  scriptName?: string;
  depth: number;
  selectedPath: number[] | null;
  onSelectPath: (p: number[] | null) => void;
}) {
  const [showElse, setShowElse] = useState((step.elseSteps?.length ?? 0) > 0);

  const conditionErrors = directErrorsForStep(errors, path).filter((e) => e.field.startsWith("condition"));

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <ConditionBuilder
          condition={step.condition}
          onChange={(c) => onChange({ ...step, condition: c ?? { type: "flag", flag: "" } })}
          label="Condition"
        />
        {conditionErrors.length > 0 && (
          <div style={{ marginTop: 2 }}>
            {conditionErrors.map((e, i) => (
              <div key={i} style={{ color: "#ff6b6b", fontSize: "0.75em", marginTop: 2 }}>{e.message}</div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: "0.8em", fontWeight: 600, color: "#8c8", marginBottom: 4 }}>Then:</div>
        <StepList
          steps={step.thenSteps}
          onChange={(newSteps) => onChange({ ...step, thenSteps: newSteps })}
          path={[...path, -1]}
          errors={errors}
          project={project}
          scriptName={scriptName}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
        />
      </div>

      {!showElse && (
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => { setShowElse(true); onChange({ ...step, elseSteps: step.elseSteps ?? [] }); }}
          style={{ marginBottom: 4 }}
        >
          + Add Else
        </button>
      )}

      {showElse && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: "0.8em", fontWeight: 600, color: "#c88" }}>Else:</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setShowElse(false);
                onChange({ ...step, elseSteps: [] });
              }}
              style={{ fontSize: "0.7em" }}
            >
              Remove Else
            </button>
          </div>
          <StepList
            steps={step.elseSteps ?? []}
            onChange={(newSteps) => onChange({ ...step, elseSteps: newSteps })}
            path={[...path, -2]}
            errors={errors}
            project={project}
            scriptName={scriptName}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelectPath={onSelectPath}
          />
        </div>
      )}
    </div>
  );
}

function AddStepButton({ onAdd }: { onAdd: (type: ScriptStep["type"]) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <TutorialBubble title="Add Step" description="Add a new action step to this script. Choose from categories like Dialogue, State, Navigation, Inventory, and more." preferSide="below">
        <button className="btn btn-ghost btn-xs" onClick={() => setOpen(true)} style={{ marginTop: 4 }}>
          + Add Step
        </button>
      </TutorialBubble>
    );
  }

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: 6, marginTop: 4, background: "rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: "0.8em", fontWeight: 600 }}>Add Step</span>
        <button className="btn btn-ghost btn-xs" onClick={() => setOpen(false)}>x</button>
      </div>
      {CATEGORIES.map((cat) => (
        <div key={cat} style={{ marginBottom: 4 }}>
          <div style={{ fontSize: "0.7em", color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{cat}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {STEP_CATALOG.filter((s) => s.category === cat).map((entry) => (
              <button
                key={entry.type}
                className="btn btn-ghost btn-xs"
                onClick={() => { onAdd(entry.type); setOpen(false); }}
                style={{ fontSize: "0.75em" }}
                title={entry.description}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StepList({
  steps,
  onChange,
  path,
  errors,
  project,
  scriptName,
  depth,
  selectedPath,
  onSelectPath,
}: {
  steps: ScriptStep[];
  onChange: (steps: ScriptStep[]) => void;
  path: number[];
  errors: StepValidationError[];
  project: EditorProject;
  scriptName?: string;
  depth: number;
  selectedPath: number[] | null;
  onSelectPath: (p: number[] | null) => void;
}) {
  function addStep(type: ScriptStep["type"]) {
    onChange([...steps, createDefaultStep(type)]);
    onSelectPath([...path, steps.length]);
  }

  function updateStep(index: number, updated: ScriptStep) {
    const copy = [...steps];
    copy[index] = updated;
    onChange(copy);
  }

  function deleteStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
    if (selectedPath && pathsEqual(selectedPath, [...path, index])) onSelectPath(null);
  }

  function moveStep(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const copy = [...steps];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
    if (selectedPath && pathsEqual(selectedPath, [...path, index])) onSelectPath([...path, target]);
    else if (selectedPath && pathsEqual(selectedPath, [...path, target])) onSelectPath([...path, index]);
  }

  return (
    <div style={{ marginLeft: depth > 0 ? 8 : 0, borderLeft: depth > 0 ? "2px solid rgba(255,255,255,0.06)" : "none", paddingLeft: depth > 0 ? 8 : 0 }}>
      {steps.length === 0 && (
        <div style={{ color: "#666", fontSize: "0.75em", padding: 4, fontStyle: "italic" }}>No steps yet.</div>
      )}
      {steps.map((step, i) => (
        <StepListItem
          key={i}
          step={step}
          index={i}
          path={path}
          isFirst={i === 0}
          isLast={i === steps.length - 1}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          onUpdate={(s) => updateStep(i, s)}
          onDelete={() => deleteStep(i)}
          onMoveUp={() => moveStep(i, -1)}
          onMoveDown={() => moveStep(i, 1)}
          errors={errors}
          project={project}
          scriptName={scriptName}
          depth={depth}
        />
      ))}
      <AddStepButton onAdd={addStep} />
    </div>
  );
}
