import type { ValidationError } from "../../shared/exportSchema";
import TutorialBubble from "./TutorialBubble";

interface ValidationPanelProps {
  errors: ValidationError[];
  action: "play" | "export";
  onDismiss: () => void;
  onProceed: () => void;
}

export default function ValidationPanel({ errors, action, onDismiss, onProceed }: ValidationPanelProps) {
  const hasErrors = errors.some((e) => e.severity === "error");
  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warningCount = errors.filter((e) => e.severity === "warning").length;
  const actionLabel = action === "play" ? "Play Anyway" : "Export Anyway";

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 460, maxWidth: 600 }}
      >
        <div className="modal-title">
          {hasErrors ? "Validation Errors" : "Validation Warnings"}
        </div>

        <div style={{ fontSize: 12, color: "#ccc", marginBottom: 8 }}>
          {errorCount > 0 && <span style={{ color: "#f87171" }}>{errorCount} error{errorCount !== 1 ? "s" : ""}</span>}
          {errorCount > 0 && warningCount > 0 && ", "}
          {warningCount > 0 && <span style={{ color: "#fbbf24" }}>{warningCount} warning{warningCount !== 1 ? "s" : ""}</span>}
        </div>

        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 4,
            padding: "8px 10px",
            maxHeight: 300,
            overflowY: "auto",
            marginBottom: 12,
          }}
        >
          {errors.map((err, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: err.severity === "error" ? "#f87171" : "#fbbf24",
                padding: "3px 0",
                borderBottom: i < errors.length - 1 ? "1px solid #222" : "none",
              }}
            >
              {err.severity === "error" ? "\u2716" : "\u26A0"} {err.message}
            </div>
          ))}
        </div>

        {hasErrors && (
          <p style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>
            Errors must be fixed before {action === "play" ? "playing" : "exporting"}. Warnings are advisory.
          </p>
        )}

        <div className="modal-actions">
          {!hasErrors && (
            <TutorialBubble title="Proceed with Warnings" description="Warnings are advisory and will not break the game. You can proceed, but consider fixing them for a polished result." preferSide="above">
              <button className="btn btn-primary" onClick={onProceed}>
                {actionLabel}
              </button>
            </TutorialBubble>
          )}
          <button className="btn btn-ghost" onClick={onDismiss}>
            {hasErrors ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
