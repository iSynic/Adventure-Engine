import type { ScriptOwnership, ScriptState, ScriptInstanceInfo, ScriptRuntimeSnapshot } from "../core/types";
import { ScriptInstance } from "./ScriptInstance";
import type { ScriptRunner, PartialScriptContext } from "./ScriptRunner";

export interface ScheduleOptions {
  ownership?: ScriptOwnership;
  ownerId?: string | null;
  priority?: number;
  interruptible?: boolean;
  isCutscene?: boolean;
}

interface SignalWaiterEntry {
  resolve: () => void;
  instance: ScriptInstance | null;
}

type ScriptLifecycleCallback = (event: "start" | "complete" | "error" | "cancel", hookId: string) => void;

export class ScriptScheduler {
  private instances: ScriptInstance[] = [];
  private signalWaiters = new Map<string, SignalWaiterEntry[]>();
  private pendingSignals = new Set<string>();
  private _inCutscene = false;
  private scriptRunner!: ScriptRunner;
  private lifecycleListeners: ScriptLifecycleCallback[] = [];

  onScriptLifecycle(cb: ScriptLifecycleCallback): () => void {
    this.lifecycleListeners.push(cb);
    return () => {
      this.lifecycleListeners = this.lifecycleListeners.filter((l) => l !== cb);
    };
  }

  private emitLifecycle(event: "start" | "complete" | "error" | "cancel", hookId: string): void {
    for (const cb of this.lifecycleListeners) cb(event, hookId);
  }

  initialize(scriptRunner: ScriptRunner): void {
    this.scriptRunner = scriptRunner;
  }

  get inCutscene(): boolean {
    return this._inCutscene;
  }

  schedule(
    hookId: string,
    partial: PartialScriptContext,
    opts?: ScheduleOptions
  ): ScriptInstance {
    const instance = new ScriptInstance({
      hookId,
      ownership: opts?.ownership ?? "interaction",
      ownerId: opts?.ownerId ?? null,
      priority: opts?.priority ?? 0,
      interruptible: opts?.interruptible ?? true,
      isCutscene: opts?.isCutscene ?? false,
    });

    this.instances.push(instance);
    this.emitLifecycle("start", hookId);
    this.executeInstance(instance, hookId, partial);
    return instance;
  }

  scheduleBackground(
    hookId: string,
    partial: PartialScriptContext,
    opts?: ScheduleOptions
  ): ScriptInstance {
    return this.schedule(hookId, partial, {
      ownership: opts?.ownership ?? "global",
      ownerId: opts?.ownerId ?? null,
      priority: opts?.priority ?? -10,
      interruptible: opts?.interruptible ?? true,
      isCutscene: false,
    });
  }

  private async executeInstance(
    instance: ScriptInstance,
    hookId: string,
    partial: PartialScriptContext
  ): Promise<void> {
    try {
      await this.scriptRunner.runHookDirect(hookId, partial, instance);
      if (instance.isActive) {
        instance.complete();
        this.emitLifecycle("complete", hookId);
      }
    } catch (e) {
      if (instance.state !== "cancelled") {
        console.error(`[ScriptScheduler] Script "${hookId}" failed:`, e);
        this.emitLifecycle("error", hookId);
      } else {
        this.emitLifecycle("cancel", hookId);
      }
      if (instance.isActive) {
        instance.complete();
      }
    } finally {
      if (instance.isCutscene && this._inCutscene) {
        this._inCutscene = this.instances.some(
          (i) => i.isCutscene && i.isActive && i !== instance
        );
      }
      this.cleanup();
    }
  }

  beginCutscene(): void {
    this._inCutscene = true;
  }

  endCutscene(): void {
    this._inCutscene = false;
  }

  emitSignal(name: string): void {
    const waiters = this.signalWaiters.get(name);
    if (waiters && waiters.length > 0) {
      for (const entry of waiters) {
        entry.resolve();
      }
      this.signalWaiters.delete(name);
    } else {
      this.pendingSignals.add(name);
    }
  }

  waitForSignal(name: string, instance?: ScriptInstance): Promise<void> {
    if (this.pendingSignals.has(name)) {
      this.pendingSignals.delete(name);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let waiters = this.signalWaiters.get(name);
      if (!waiters) {
        waiters = [];
        this.signalWaiters.set(name, waiters);
      }
      waiters.push({ resolve, instance: instance ?? null });
    });
  }

  private purgeSignalWaitersForInstance(instance: ScriptInstance): void {
    for (const [name, waiters] of this.signalWaiters.entries()) {
      const filtered = waiters.filter((e) => e.instance !== instance);
      if (filtered.length === 0) {
        this.signalWaiters.delete(name);
      } else if (filtered.length < waiters.length) {
        this.signalWaiters.set(name, filtered);
      }
    }
  }

  cancelByOwner(ownership: ScriptOwnership, ownerId?: string): void {
    for (const instance of this.instances) {
      if (instance.isActive && instance.ownership === ownership) {
        if (ownerId === undefined || instance.ownerId === ownerId) {
          if (instance.interruptible) {
            this.purgeSignalWaitersForInstance(instance);
            instance.cancel();
          }
        }
      }
    }
    this.cleanup();
  }

  cancelById(instanceId: string, force = false): void {
    const instance = this.instances.find((i) => i.id === instanceId);
    if (instance && instance.isActive && (force || instance.interruptible)) {
      this.purgeSignalWaitersForInstance(instance);
      instance.cancel();
    }
    this.cleanup();
  }

  cancelAll(respectInterruptible = true): void {
    for (const instance of this.instances) {
      if (instance.isActive) {
        if (!respectInterruptible || instance.interruptible) {
          this.purgeSignalWaitersForInstance(instance);
          instance.cancel();
        }
      }
    }
    this.cleanup();
  }

  pauseAll(): void {
    for (const instance of this.instances) {
      if (instance.isActive) {
        instance.pause();
      }
    }
  }

  resumeAll(): void {
    for (const instance of this.instances) {
      instance.resume();
    }
  }

  pauseByOwner(ownership: ScriptOwnership, ownerId?: string): void {
    for (const instance of this.instances) {
      if (instance.isActive && instance.ownership === ownership) {
        if (ownerId === undefined || instance.ownerId === ownerId) {
          instance.pause();
        }
      }
    }
  }

  resumeByOwner(ownership: ScriptOwnership, ownerId?: string): void {
    for (const instance of this.instances) {
      if (instance.ownership === ownership) {
        if (ownerId === undefined || instance.ownerId === ownerId) {
          instance.resume();
        }
      }
    }
  }

  onRoomChange(oldRoomId: string, _newRoomId: string): void {
    for (const instance of this.instances) {
      if (!instance.isActive) continue;
      if (
        instance.ownership === "room" ||
        instance.ownership === "object" ||
        instance.ownership === "interaction"
      ) {
        if (instance.interruptible) {
          this.purgeSignalWaitersForInstance(instance);
          instance.cancel();
        }
      }
    }
    this.cleanup();
  }

  getActiveScripts(): ScriptInstanceInfo[] {
    return this.instances
      .filter((i) => i.isActive)
      .sort((a, b) => b.priority - a.priority)
      .map((i) => i.toInfo());
  }

  getRuntimeSnapshot(): ScriptRuntimeSnapshot {
    const active = this.getActiveScripts();
    return {
      inCutscene: this._inCutscene,
      activeScriptCount: active.length,
      scripts: active,
    };
  }

  getScriptsByState(state: ScriptState): ScriptInstanceInfo[] {
    return this.instances
      .filter((i) => i.state === state)
      .map((i) => i.toInfo());
  }

  getAllScriptInfo(): ScriptInstanceInfo[] {
    return this.instances.map((i) => i.toInfo());
  }

  getActiveCounts(): { running: number; waiting: number; paused: number; total: number } {
    let running = 0;
    let waiting = 0;
    let paused = 0;
    for (const i of this.instances) {
      if (i.state === "running") running++;
      else if (i.state === "waiting") waiting++;
      else if (i.state === "paused") paused++;
    }
    return { running, waiting, paused, total: running + waiting + paused };
  }

  update(_dt: number): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.instances = this.instances.filter(
      (i) => i.state === "running" || i.state === "waiting" || i.state === "paused"
    );
  }

  dispose(): void {
    this.cancelAll(false);
    this.instances = [];
    this.signalWaiters.clear();
    this.pendingSignals.clear();
    this._inCutscene = false;
  }
}
