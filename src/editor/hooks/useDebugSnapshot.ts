import { useEffect, useState, useRef } from "react";
import type { Engine } from "../../engine/core/Engine";
import type { ScriptInstanceInfo } from "../../engine/core/types";
import type { DebugOverlayFlags } from "../../engine/debug/DebugState";
import type { DebugInspectedEntity } from "../../engine/debug/DebugState";
import type { DebugEvent, DebugEventCategory } from "../../engine/debug/DebugEventLog";

export interface DebugSnapshot {
  flags: Record<string, boolean>;
  variables: Record<string, boolean | number | string>;
  currentRoomId: string;
  inventory: Record<string, string[]>;
  objectStates: Record<string, Record<string, unknown>>;
  objectLocations: Record<string, string | null>;
  rooms: Record<string, import("../../engine/core/types").RoomRuntimeState>;
  scripts: ScriptInstanceInfo[];
  inCutscene: boolean;
  variableDefinitions: import("../../engine/core/types").VariableDefinition[];
  dialogue: import("../../engine/core/types").DialogueRuntimeState;
  dialogueSeen: Record<string, { nodes: string[]; branches: string[] }>;
}

export interface DebugContextInfo {
  roomId: string;
  verb: string;
  sentence: string;
  inCutscene: boolean;
  mouseX: number;
  mouseY: number;
}

export function useDebugSnapshot(engine: Engine) {
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);
  const [overlayFlags, setOverlayFlags] = useState<DebugOverlayFlags>(engine.ui.getOverlayFlags());
  const [inspectedEntity, setInspectedEntity] = useState<DebugInspectedEntity | null>(null);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [contextInfo, setContextInfo] = useState<DebugContextInfo>({
    roomId: "",
    verb: "walk",
    sentence: "",
    inCutscene: false,
    mouseX: 0,
    mouseY: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const snap = engine.getDebugSnapshot();
      setSnapshot(snap);
      setOverlayFlags({ ...engine.ui.getOverlayFlags() });
      setInspectedEntity(engine.getDebugInspectedEntity());
      const uiState = engine.ui.getState();
      const mousePos = engine.getMouseWorldPosition();
      setContextInfo({
        roomId: snap.currentRoomId,
        verb: uiState.selectedVerb,
        sentence: uiState.pendingActionSentence || "",
        inCutscene: snap.inCutscene,
        mouseX: mousePos.x,
        mouseY: mousePos.y,
      });
    }, 200);
    setSnapshot(engine.getDebugSnapshot());
    return () => clearInterval(interval);
  }, [engine]);

  useEffect(() => {
    const unsub = engine.debugEventLog.subscribe((evts) => {
      setEvents([...evts]);
    });
    setEvents([...engine.debugEventLog.getEvents()]);
    return unsub;
  }, [engine]);

  return { snapshot, overlayFlags, inspectedEntity, events, contextInfo };
}
