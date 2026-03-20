import type { Engine } from "../../../engine/core/Engine";

export function InventoryTab({
  engine,
  filteredInventory,
  playerActorId,
}: {
  engine: Engine;
  filteredInventory: string[];
  playerActorId: string;
}) {
  return (
    <div className="debug-list">
      {filteredInventory.length === 0 && (
        <div className="debug-empty">Inventory empty</div>
      )}
      {filteredInventory.map((itemId) => (
        <div key={itemId} className="debug-row">
          <span className="debug-key">{itemId}</span>
          <button
            className="btn btn-xs btn-danger"
            onClick={() => engine.debugRemoveItem(playerActorId, itemId)}
            title="Remove from inventory"
            style={{ marginLeft: "auto", fontSize: "0.7em" }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
