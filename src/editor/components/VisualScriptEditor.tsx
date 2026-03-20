import { useState, useMemo } from "react";
import type { ScriptStep } from "../../engine/core/types";
import { useEditor } from "../store";
import {
  validateVisualScript,
  directErrorsForStep,
} from "../utils/validateVisualScript";
import { StepForm } from "./scriptEditor/StepForm";
import { StepList } from "./scriptEditor/StepList";
import {
  stepLabel,
  resolveStepAtPath,
  updateStepAtPath,
} from "./scriptEditor/scriptEditorUtils";

export default function VisualScriptEditor({
  steps,
  onChange,
  scriptName,
}: {
  steps: ScriptStep[];
  onChange: (steps: ScriptStep[]) => void;
  scriptName?: string;
}) {
  const { state } = useEditor();
  const project = state.currentProject;
  const [selectedPath, setSelectedPath] = useState<number[] | null>(null);
  if (!project) return null;

  const errors = useMemo(() => validateVisualScript(steps, project), [steps, project]);

  const selectedStep = selectedPath ? resolveStepAtPath(steps, selectedPath) : null;
  const selectedErrors = selectedStep && selectedPath ? directErrorsForStep(errors, selectedPath) : [];

  function handleUpdateSelected(updated: ScriptStep) {
    if (!selectedPath) return;
    onChange(updateStepAtPath(steps, selectedPath, updated));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{
        padding: "6px 8px",
        fontSize: "0.75em",
        color: "#999",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        Build scripts by adding steps in sequence. Use If/Else for branching logic.
        Click a step to edit its details below.
      </div>

      {errors.length > 0 && (
        <div style={{
          background: "rgba(255,107,107,0.1)",
          border: "1px solid rgba(255,107,107,0.3)",
          borderRadius: 4,
          padding: "4px 8px",
          margin: "6px 6px 0",
          fontSize: "0.75em",
          color: "#ff9999",
          flexShrink: 0,
        }}>
          {errors.length} validation {errors.length === 1 ? "issue" : "issues"}
        </div>
      )}

      <div style={{ padding: 6, overflow: "auto", flex: 1 }}>
        <StepList
          steps={steps}
          onChange={onChange}
          path={[]}
          errors={errors}
          project={project}
          scriptName={scriptName}
          depth={0}
          selectedPath={selectedPath}
          onSelectPath={setSelectedPath}
        />
      </div>

      {selectedStep && selectedStep.type !== "if" && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "8px 10px",
          background: "rgba(100,180,255,0.04)",
          flexShrink: 0,
          maxHeight: "40%",
          overflow: "auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{
              fontSize: "0.8em",
              fontWeight: 600,
              color: "#aac",
            }}>
              Step Details: {stepLabel(selectedStep.type)}
            </span>
            <button className="btn btn-ghost btn-xs" onClick={() => setSelectedPath(null)} style={{ fontSize: "0.7em" }}>Close</button>
          </div>
          <StepForm
            step={selectedStep}
            onChange={handleUpdateSelected}
            errors={selectedErrors}
            project={project}
            scriptName={scriptName}
          />
        </div>
      )}
    </div>
  );
}
