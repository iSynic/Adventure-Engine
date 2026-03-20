import type { GameConfig } from "../core/types";
import type { StateStore } from "./StateStore";
import type { StateWatcher } from "./StateWatcher";
import type { InventorySystem } from "../inventory/InventorySystem";
import type { ScriptRunner } from "../scripting/ScriptRunner";
import type { ScriptScheduler } from "../scripting/ScriptScheduler";
import type { DialogueManager } from "../dialogue/DialogueManager";
import type { DebugEventLog } from "../debug/DebugEventLog";
import type { VerbSystem } from "../interaction/VerbSystem";
import type { EventBus, EngineEventMap } from "../core/EventBus";

export interface EventWiringDeps {
  state: StateStore;
  stateWatcher: StateWatcher;
  inventory: InventorySystem;
  scriptRunner: ScriptRunner;
  scheduler: ScriptScheduler;
  dialogueManager: DialogueManager;
  debugEventLog: DebugEventLog;
  verbSystem: VerbSystem;
  events: EventBus<EngineEventMap>;
  getPlayerId: () => string | null;
  getCurrentRoomId: () => string;
}

export function initializeVariableDefinitions(
  config: GameConfig,
  state: StateStore
): void {
  if (!config.variableDefinitions) return;
  for (const def of config.variableDefinitions) {
    if (def.defaultValue === undefined) continue;
    if (def.scope === "room" && def.roomId) {
      if (typeof def.defaultValue === "boolean" || typeof def.defaultValue === "number" || typeof def.defaultValue === "string") {
        if (state.getRoomLocalVariable(def.roomId, def.name) === undefined) {
          state.setRoomLocalVariable(def.roomId, def.name, def.defaultValue);
        }
      }
    } else if (def.type === "boolean") {
      if (state.getVariable(def.name) === undefined) {
        state.setVariable(def.name, !!def.defaultValue);
      }
      state.setFlag(def.name, !!def.defaultValue);
    } else {
      if (state.getVariable(def.name) === undefined) {
        state.setVariable(def.name, def.defaultValue as number | string);
      }
    }
  }
}

export function initializeStateWatchers(
  config: GameConfig,
  deps: EventWiringDeps
): void {
  const { state, stateWatcher, inventory, scriptRunner, debugEventLog } = deps;

  if (config.stateWatchers) {
    stateWatcher.registerFromDefinitions(config.stateWatchers, state, inventory);
  }
  stateWatcher.onTrigger((scriptId, watcherId) => {
    debugEventLog.log("variable", `Watcher "${watcherId}" triggered — running script "${scriptId}"`);
    scriptRunner.runHook(scriptId, {
      currentActorId: deps.getPlayerId(),
      currentTargetId: null,
      currentTargetType: null,
      currentRoomId: deps.getCurrentRoomId(),
      verb: "walk" as const,
      secondaryTargetId: null,
    });
  });
  state.onStateChange(() => {
    stateWatcher.evaluate(state, inventory);
  });
  inventory.onItemChange(() => {
    stateWatcher.evaluate(state, inventory);
  });
}

export function setupEventBusEmitters(deps: EventWiringDeps): void {
  const { state, inventory, dialogueManager, scheduler, scriptRunner, verbSystem, events } = deps;

  state.onStateChange((type, key, value) => {
    events.emit("variable:changed", { type, key, value });
  });

  inventory.onItemChange((actorId, itemId, action) => {
    if (action === "add") {
      events.emit("item:collected", { actorId, itemId });
    }
  });

  dialogueManager.onDialogueEvent((event, _detail) => {
    const treeId = dialogueManager.getRuntimeState().currentTreeId ?? "unknown";
    if (event === "start") {
      events.emit("dialogue:started", { treeId });
    } else if (event === "end") {
      events.emit("dialogue:ended", { treeId });
    }
  });

  scheduler.onScriptLifecycle((event, hookId) => {
    if (event === "start") {
      events.emit("script:started", { hookId });
    } else if (event === "complete" || event === "error" || event === "cancel") {
      events.emit("script:completed", { hookId, status: event });
    }
  });

  scriptRunner.setEventBus(events);
  verbSystem.setEventBus(events);
}
