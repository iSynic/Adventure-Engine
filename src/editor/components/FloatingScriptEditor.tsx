import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ScriptStep } from "../../engine/core/types";
import VisualScriptEditor from "./VisualScriptEditor";
import TutorialBubble from "./TutorialBubble";

const W = 700;
const H = 520;

interface Props {
  scriptName: string;
  editKind: "raw" | "visual";
  editBody: string;
  editSteps: ScriptStep[];
  isNewScript: boolean;
  rawPreview: string;
  onBodyChange: (body: string) => void;
  onStepsChange: (steps: ScriptStep[]) => void;
  onSave: () => void;
  onClose: () => void;
  onSwitchToRaw: () => void;
}

export default function FloatingScriptEditor({
  scriptName,
  editKind,
  editBody,
  editSteps,
  isNewScript,
  rawPreview,
  onBodyChange,
  onStepsChange,
  onSave,
  onClose,
  onSwitchToRaw,
}: Props) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: Math.max(0, window.innerWidth - W - 16),
    y: Math.max(20, Math.round((window.innerHeight - H) / 2)),
  }));

  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  function handleHeaderMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - W, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - H, e.clientY - offset.current.y)),
      });
    }
    function onUp() {
      dragging.current = false;
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  return createPortal(
    <div
      className="floating-script-editor"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="floating-script-editor__header"
        onMouseDown={handleHeaderMouseDown}
      >
        <span title={scriptName}>{scriptName}</span>
        {isNewScript && editKind === "visual" && (
          <TutorialBubble
            title="Switch to Raw JavaScript"
            description="Converts your visual steps into raw JavaScript. This is one-way — you can't switch back to the visual builder after converting. Use Raw mode for complex logic, loops, or API calls not covered by the step library."
            preferSide="below"
          >
            <button
              className="btn btn-ghost btn-xs"
              onClick={onSwitchToRaw}
              title="Switch to Raw JS (one-way)"
              style={{ background: "rgba(255,180,50,0.2)", fontSize: "0.7em" }}
            >
              Switch to Raw
            </button>
          </TutorialBubble>
        )}
        <button className="btn btn-primary btn-xs" onClick={onSave}>
          Save
        </button>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="floating-script-editor__body">
        {editKind === "visual" ? (
          <>
            <VisualScriptEditor
              steps={editSteps}
              onChange={onStepsChange}
              scriptName={scriptName}
            />
            <div className="raw-preview-section">
              <TutorialBubble
                title="Generated Code"
                description="This is the JavaScript compiled from your visual steps. It's read-only here — edit the steps above to change it. Switch to Raw mode if you need to write code by hand."
                preferSide="above"
              >
                <div className="raw-preview-label" style={{ cursor: "help" }}>
                  Generated Code
                </div>
              </TutorialBubble>
              <pre className="raw-preview-code">
                {rawPreview || "// Add steps above to see generated code"}
              </pre>
            </div>
          </>
        ) : (
          <>
            <div style={{
              padding: "4px 10px",
              fontSize: "0.72em",
              color: "#777",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
              lineHeight: 1.5,
            }}>
              Raw JavaScript — use <code style={{ color: "#aaa" }}>ctx.say(text)</code>,{" "}
              <code style={{ color: "#aaa" }}>ctx.gotoRoom(id)</code>,{" "}
              <code style={{ color: "#aaa" }}>ctx.setFlag(name, value)</code>,{" "}
              <code style={{ color: "#aaa" }}>ctx.giveItem(actorId, itemId)</code> and other{" "}
              <code style={{ color: "#aaa" }}>ctx.*</code> helpers. Use <code style={{ color: "#aaa" }}>await</code> for blocking steps.
            </div>
            <textarea
              className="script-textarea"
              value={editBody}
              onChange={(e) => onBodyChange(e.target.value)}
              spellCheck={false}
            />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
