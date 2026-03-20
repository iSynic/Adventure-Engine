export function ObjectsTab({
  filteredObjects,
}: {
  filteredObjects: [string, Record<string, unknown>][];
}) {
  return (
    <div className="debug-list">
      {filteredObjects.length === 0 && (
        <div className="debug-empty">No object states</div>
      )}
      {filteredObjects.map(([objectId, states]) => (
        <div key={objectId} className="debug-object-group">
          <div className="debug-object-header">{objectId}</div>
          {Object.entries(states).map(([key, value]) => (
            <div key={key} className="debug-row debug-row-indent">
              <span className="debug-key">{key}</span>
              <span className="debug-value">{String(value)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
