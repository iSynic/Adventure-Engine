import type { Engine } from "../../../engine/core/Engine";
import type { DebugSnapshot } from "../../hooks/useDebugSnapshot";
import type { ScriptInstanceInfo } from "../../../engine/core/types";

export function ScriptsTab({
  engine,
  snapshot,
  filteredScripts,
}: {
  engine: Engine;
  snapshot: DebugSnapshot;
  filteredScripts: ScriptInstanceInfo[];
}) {
  return (
    <div className="debug-list">
      {snapshot.inCutscene && (
        <div className="debug-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>
          <span className="debug-key" style={{ color: "#ff9800" }}>CUTSCENE MODE</span>
          <span className="debug-value" style={{ color: "#ff9800" }}>active</span>
        </div>
      )}
      {filteredScripts.length === 0 && !snapshot.inCutscene && (
        <div className="debug-empty">No active scripts</div>
      )}
      {filteredScripts.map((s) => (
        <div key={s.id} className="debug-object-group">
          <div className="debug-object-header" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              className="debug-script-dot"
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor:
                  s.state === "running" ? "#4caf50" :
                  s.state === "waiting" ? "#ffeb3b" :
                  s.state === "paused" ? "#2196f3" :
                  "#9e9e9e",
              }}
            />
            <span>{s.hookId}</span>
            {s.isCutscene && <span style={{ fontSize: "0.7em", color: "#ff9800", marginLeft: 4 }}>CUT</span>}
          </div>
          <div className="debug-row debug-row-indent">
            <span className="debug-key">state</span>
            <span className="debug-value">{s.state}</span>
          </div>
          <div className="debug-row debug-row-indent">
            <span className="debug-key">ownership</span>
            <span className="debug-value">{s.ownership}{s.ownerId ? ` (${s.ownerId})` : ""}</span>
          </div>
          {s.waitReason && (
            <div className="debug-row debug-row-indent">
              <span className="debug-key">waiting</span>
              <span className="debug-value">{s.waitReason}</span>
            </div>
          )}
          <div className="debug-row debug-row-indent">
            <span className="debug-key">priority</span>
            <span className="debug-value">{s.priority}{s.interruptible ? "" : " (locked)"}</span>
          </div>
          <div className="debug-row debug-row-indent">
            <button
              className="btn btn-xs btn-danger"
              onClick={() => engine.debugCancelScript(s.id)}
              title={s.interruptible ? "Cancel this script instance" : "Force-cancel this locked script"}
              style={{ fontSize: "0.7em" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
