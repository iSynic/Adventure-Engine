import type { DebugInspectedEntity } from "../../../engine/debug/DebugState";

export function InspectorTab({
  inspectedEntity,
}: {
  inspectedEntity: DebugInspectedEntity | null;
}) {
  return (
    <div className="debug-list">
      {!inspectedEntity && (
        <div className="debug-empty">Click an entity in the game to inspect it</div>
      )}
      {inspectedEntity && (
        <div className="debug-inspector">
          <div className="debug-inspector-header">
            <span className="debug-inspector-type">{inspectedEntity.type}</span>
            <span className="debug-inspector-name">{inspectedEntity.name}</span>
            <span className="debug-inspector-id">({inspectedEntity.id})</span>
          </div>
          {Object.entries(inspectedEntity.properties).map(([key, value]) => (
            <div key={key} className="debug-row">
              <span className="debug-key">{key}</span>
              <span className="debug-value" title={typeof value === "object" ? JSON.stringify(value) : String(value)}>
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
