import type { ConditionExpression, StateWatcherDefinition } from "../core/types";
import type { StateStore } from "./StateStore";
import type { InventorySystem } from "../inventory/InventorySystem";
import { evaluateCondition } from "./ConditionEvaluator";

export interface WatcherEntry {
  id: string;
  condition: ConditionExpression;
  scriptId: string;
  once: boolean;
  lastResult: boolean;
  fired: boolean;
}

export type WatcherTriggerCallback = (scriptId: string, watcherId: string) => void;

export class StateWatcher {
  private watchers: WatcherEntry[] = [];
  private triggerCallback: WatcherTriggerCallback | null = null;

  onTrigger(cb: WatcherTriggerCallback): () => void {
    this.triggerCallback = cb;
    return () => {
      if (this.triggerCallback === cb) this.triggerCallback = null;
    };
  }

  registerFromDefinitions(defs: StateWatcherDefinition[], state: StateStore, inventory?: InventorySystem): void {
    for (const def of defs) {
      const current = evaluateCondition(def.condition, state, inventory);
      this.watchers.push({
        id: def.id,
        condition: def.condition,
        scriptId: def.scriptId,
        once: def.once ?? false,
        lastResult: current,
        fired: false,
      });
    }
  }

  register(
    id: string,
    condition: ConditionExpression,
    scriptId: string,
    once: boolean,
    state: StateStore,
    inventory?: InventorySystem
  ): void {
    const current = evaluateCondition(condition, state, inventory);
    this.watchers.push({
      id,
      condition,
      scriptId,
      once,
      lastResult: current,
      fired: false,
    });
  }

  unregister(id: string): void {
    this.watchers = this.watchers.filter((w) => w.id !== id);
  }

  evaluate(state: StateStore, inventory?: InventorySystem): void {
    for (const watcher of this.watchers) {
      if (watcher.once && watcher.fired) continue;

      const result = evaluateCondition(watcher.condition, state, inventory);
      if (result && !watcher.lastResult) {
        watcher.fired = true;
        this.triggerCallback?.(watcher.scriptId, watcher.id);
      }
      watcher.lastResult = result;
    }
  }

  getWatchers(): readonly WatcherEntry[] {
    return this.watchers;
  }

  reset(): void {
    this.watchers = [];
  }
}
