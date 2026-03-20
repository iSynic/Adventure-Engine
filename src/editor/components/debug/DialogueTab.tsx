import type { Engine } from "../../../engine/core/Engine";
import type { DebugSnapshot } from "../../hooks/useDebugSnapshot";

export function DialogueTab({
  engine,
  snapshot,
}: {
  engine: Engine;
  snapshot: DebugSnapshot;
}) {
  return (
    <div className="debug-list">
      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>Active Dialogue</div>
      <div className="debug-row">
        <span className="debug-key">Tree ID</span>
        <span className="debug-value">{snapshot.dialogue?.currentTreeId ?? "(none)"}</span>
      </div>
      <div className="debug-row">
        <span className="debug-key">Node ID</span>
        <span className="debug-value">{snapshot.dialogue?.currentNodeId ?? "(none)"}</span>
      </div>
      <div className="debug-row">
        <span className="debug-key">Active</span>
        <span className={`debug-value debug-bool ${snapshot.dialogue?.active ? "debug-true" : "debug-false"}`}>
          {String(snapshot.dialogue?.active ?? false)}
        </span>
      </div>

      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Trees Seen</span>
        <button className="btn btn-danger btn-xs" onClick={() => { engine.state.clearDialogueSeen(); }} title="Clear all dialogue seen tracking">Reset</button>
      </div>
      {Object.keys(snapshot.dialogueSeen ?? {}).length === 0 && (
        <div className="debug-empty">No trees seen yet</div>
      )}
      {Object.entries(snapshot.dialogueSeen ?? {}).map(([treeId, seen]) => (
        <div key={treeId} className="debug-object-group">
          <div className="debug-object-header">{treeId}</div>
          <div className="debug-row debug-row-indent">
            <span className="debug-key">Nodes seen</span>
            <span className="debug-value">{seen.nodes.length > 0 ? seen.nodes.join(", ") : "(none)"}</span>
          </div>
          <div className="debug-row debug-row-indent">
            <span className="debug-key">Branches chosen</span>
            <span className="debug-value">{seen.branches.length > 0 ? seen.branches.join(", ") : "(none)"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
