import { useState, useRef, useEffect } from "react";
import type { Engine } from "../../engine/core/Engine";
import { useDebugSnapshot } from "../hooks/useDebugSnapshot";
import { ActionsTab } from "./debug/ActionsTab";
import { OverlaysTab } from "./debug/OverlaysTab";
import { InspectorTab } from "./debug/InspectorTab";
import { EventsTab } from "./debug/EventsTab";
import { DialogueTab } from "./debug/DialogueTab";
import { FlagsTab } from "./debug/FlagsTab";
import { VariablesTab } from "./debug/VariablesTab";
import { InventoryTab } from "./debug/InventoryTab";
import { ObjectsTab } from "./debug/ObjectsTab";
import { ScriptsTab } from "./debug/ScriptsTab";
import { StateTab } from "./debug/StateTab";

interface DebugPanelProps {
  engine: Engine;
  playerActorId: string;
}

type ActiveTab = "state" | "flags" | "variables" | "inventory" | "objects" | "scripts" | "overlays" | "inspector" | "events" | "dialogue" | "actions";

export default function DebugPanel({ engine, playerActorId }: DebugPanelProps) {
  const { snapshot, overlayFlags, inspectedEntity, events, contextInfo } = useDebugSnapshot(engine);
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overlays");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingKey && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingKey]);

  if (!snapshot) return null;

  const lowerFilter = filter.toLowerCase();

  const filteredFlags = Object.entries(snapshot.flags).filter(([key]) =>
    key.toLowerCase().includes(lowerFilter)
  ) as [string, boolean][];

  const filteredVars = Object.entries(snapshot.variables).filter(([key]) =>
    key.toLowerCase().includes(lowerFilter)
  ) as [string, boolean | number | string][];

  const playerItems = snapshot.inventory[playerActorId] ?? [];
  const filteredInventory = playerItems.filter((item) =>
    item.toLowerCase().includes(lowerFilter)
  );

  const allObjects = Object.entries(snapshot.objectStates) as [string, Record<string, unknown>][];
  const filteredObjects = allObjects.filter(([key]) =>
    key.toLowerCase().includes(lowerFilter)
  );

  const activeScripts = snapshot.scripts ?? [];
  const filteredScripts = activeScripts.filter((s) =>
    s.hookId.toLowerCase().includes(lowerFilter)
  );

  const roomState = snapshot.rooms[snapshot.currentRoomId];
  const roomLocalVars = roomState?.localVariables ?? {};
  const filteredRoomVars = Object.entries(roomLocalVars).filter(([key]) =>
    key.toLowerCase().includes(lowerFilter)
  );

  const varDefMap = new Map(
    (snapshot.variableDefinitions ?? []).map((d) => [d.name, d])
  );

  const startEdit = (key: string, currentValue: string) => {
    setEditingKey(key);
    setEditValue(currentValue);
  };

  const edit = {
    editingKey,
    editValue,
    startEdit,
    setEditingKey,
    setEditValue,
    editInputRef,
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "actions", label: "Actions" },
    { id: "overlays", label: "Overlays" },
    { id: "inspector", label: "Inspector" },
    { id: "events", label: "Events" },
    { id: "dialogue", label: "Dialogue" },
    { id: "state", label: "State" },
    { id: "flags", label: "Flags" },
    { id: "variables", label: "Vars" },
    { id: "inventory", label: "Inv" },
    { id: "objects", label: "Objects" },
    { id: "scripts", label: "Scripts" },
  ];

  return (
    <div className="debug-panel">
      <div style={{ padding: "4px 8px", fontSize: "0.7em", color: "#888", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        Runtime debug tools — changes here are temporary and reset on reload.
      </div>
      <div className="debug-context-bar">
        <span className="debug-ctx-item">
          <span className="debug-ctx-label">Room:</span> {contextInfo.roomId || "(none)"}
        </span>
        <span className="debug-ctx-item">
          <span className="debug-ctx-label">Verb:</span> {contextInfo.verb}
        </span>
        {contextInfo.sentence && (
          <span className="debug-ctx-item debug-ctx-sentence">"{contextInfo.sentence}"</span>
        )}
        {contextInfo.inCutscene && (
          <span className="debug-ctx-item debug-ctx-cutscene">CUTSCENE</span>
        )}
        <span className="debug-ctx-item debug-ctx-coords">
          ({Math.round(contextInfo.mouseX)},{Math.round(contextInfo.mouseY)})
        </span>
      </div>

      <div className="debug-tabs debug-tabs-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`debug-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === "state" || activeTab === "flags" || activeTab === "variables" || activeTab === "inventory" || activeTab === "objects" || activeTab === "scripts" || activeTab === "actions") && (
        <input
          className="debug-filter"
          type="text"
          placeholder="Filter by name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}

      <div className="debug-content">
        <div style={{ display: activeTab === "actions" ? undefined : "none" }}><ActionsTab engine={engine} snapshot={snapshot} playerActorId={playerActorId} /></div>
        <div style={{ display: activeTab === "overlays" ? undefined : "none" }}><OverlaysTab engine={engine} overlayFlags={overlayFlags} /></div>
        <div style={{ display: activeTab === "inspector" ? undefined : "none" }}><InspectorTab inspectedEntity={inspectedEntity} /></div>
        <div style={{ display: activeTab === "events" ? undefined : "none" }}><EventsTab engine={engine} events={events} /></div>
        <div style={{ display: activeTab === "dialogue" ? undefined : "none" }}><DialogueTab engine={engine} snapshot={snapshot} /></div>
        <div style={{ display: activeTab === "state" ? undefined : "none" }}>
          <StateTab
            engine={engine}
            snapshot={snapshot}
            playerActorId={playerActorId}
            filteredFlags={filteredFlags}
            filteredVars={filteredVars}
            filteredRoomVars={filteredRoomVars}
            filteredObjects={filteredObjects}
            playerItems={playerItems}
            varDefMap={varDefMap}
            edit={edit}
          />
        </div>
        <div style={{ display: activeTab === "flags" ? undefined : "none" }}><FlagsTab engine={engine} filteredFlags={filteredFlags} edit={edit} /></div>
        <div style={{ display: activeTab === "variables" ? undefined : "none" }}><VariablesTab engine={engine} filteredVars={filteredVars} edit={edit} /></div>
        <div style={{ display: activeTab === "inventory" ? undefined : "none" }}><InventoryTab engine={engine} filteredInventory={filteredInventory} playerActorId={playerActorId} /></div>
        <div style={{ display: activeTab === "objects" ? undefined : "none" }}><ObjectsTab filteredObjects={filteredObjects} /></div>
        <div style={{ display: activeTab === "scripts" ? undefined : "none" }}><ScriptsTab engine={engine} snapshot={snapshot} filteredScripts={filteredScripts} /></div>
      </div>
    </div>
  );
}
