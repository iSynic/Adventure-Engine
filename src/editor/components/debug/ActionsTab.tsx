import { useState } from "react";
import type { Engine } from "../../../engine/core/Engine";
import type { DebugSnapshot } from "../../hooks/useDebugSnapshot";

export function ActionsTab({
  engine,
  snapshot,
  playerActorId,
}: {
  engine: Engine;
  snapshot: DebugSnapshot;
  playerActorId: string;
}) {
  const [jumpRoomId, setJumpRoomId] = useState("");
  const [runScriptName, setRunScriptName] = useState("");
  const [spawnItemId, setSpawnItemId] = useState("");
  const [scriptFilter, setScriptFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");

  const gameConfig = engine.getConfig();
  const allRoomIds = gameConfig.rooms.map((r) => r.id);
  const allItemIds = gameConfig.items.map((i) => i.id);
  const allScriptNames = engine.scriptRunner.getRegisteredHookNames();

  return (
    <div className="debug-list">
      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4 }}>Jump to Room</div>
      <div className="debug-action-row">
        <select className="debug-select" value={jumpRoomId} onChange={(e) => setJumpRoomId(e.target.value)}>
          <option value="">Select room...</option>
          {allRoomIds.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <button className="btn btn-xs btn-primary" disabled={!jumpRoomId} onClick={() => { if (jumpRoomId) engine.debugJumpToRoom(jumpRoomId); }}>Jump</button>
      </div>

      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4, marginTop: 8 }}>Reload Current Room</div>
      <div className="debug-action-row">
        <span style={{ fontSize: "0.8em", color: "#aaa" }}>Re-enter {snapshot.currentRoomId || "(none)"}</span>
        <button className="btn btn-xs btn-ghost" disabled={!snapshot.currentRoomId} onClick={() => engine.debugReloadRoom()}>Reload</button>
      </div>

      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4, marginTop: 8 }}>Run Script</div>
      <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 4 }}>Execute any registered script hook immediately for testing.</div>
      <div className="debug-action-row" style={{ flexWrap: "wrap", gap: 4 }}>
        <input className="debug-add-input" type="text" placeholder="Search scripts..." value={scriptFilter} onChange={(e) => { setScriptFilter(e.target.value); setRunScriptName(""); }} style={{ flex: "1 1 100%" }} />
        <select className="debug-select" value={runScriptName} onChange={(e) => setRunScriptName(e.target.value)}>
          <option value="">Select script...</option>
          {allScriptNames.filter((name) => name.toLowerCase().includes(scriptFilter.toLowerCase())).map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <button className="btn btn-xs btn-primary" disabled={!runScriptName} onClick={() => { if (runScriptName) engine.debugRunScript(runScriptName); }}>Run</button>
      </div>

      <div className="debug-overlay-section-label" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4, marginBottom: 4, marginTop: 8 }}>Spawn Inventory Item</div>
      <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 4 }}>Add an item directly to the player's inventory for testing.</div>
      <div className="debug-action-row" style={{ flexWrap: "wrap", gap: 4 }}>
        <input className="debug-add-input" type="text" placeholder="Search items..." value={itemFilter} onChange={(e) => { setItemFilter(e.target.value); setSpawnItemId(""); }} style={{ flex: "1 1 100%" }} />
        <select className="debug-select" value={spawnItemId} onChange={(e) => setSpawnItemId(e.target.value)}>
          <option value="">Select item...</option>
          {allItemIds.filter((id) => id.toLowerCase().includes(itemFilter.toLowerCase())).map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <button className="btn btn-xs btn-primary" disabled={!spawnItemId} onClick={() => { if (spawnItemId) engine.debugGiveItem(playerActorId, spawnItemId); }}>Give</button>
      </div>
    </div>
  );
}
