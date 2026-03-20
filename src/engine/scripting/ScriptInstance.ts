/**
 * ScriptInstance — tracks a single script execution's lifecycle.
 *
 * State machine:
 *
 *   ┌─────────┐
 *   │ running │◄──────────────────────┐
 *   └────┬────┘                       │
 *        │ setWaiting(reason)         │ clearWait()
 *        ▼                            │
 *   ┌─────────┐                       │
 *   │ waiting │───────────────────────┘
 *   └────┬────┘
 *        │
 *   ┌────┴────┐  pause() from running OR waiting
 *   │ paused  │  resume() → restores previous state (running if no waitReason, waiting if waitReason set)
 *   └────┬────┘
 *        │
 *   ┌────┴──────┐
 *   │ completed │  complete() — terminal, resolves promise
 *   └───────────┘
 *   ┌───────────┐
 *   │ cancelled │  cancel() — terminal, rejects promise
 *   └───────────┘
 *
 * Invariants:
 * - Only active states (running/waiting/paused) can transition.
 * - completed/cancelled are terminal — no further transitions allowed.
 * - waitReason is non-null only while state === "waiting" (or preserved through pause for resume).
 * - pause() preserves _waitReason so resume() can restore the correct state.
 */
import type {
  ScriptState,
  ScriptOwnership,
  WaitReason,
  ScriptInstanceInfo,
} from "../core/types";

let nextId = 1;

export interface ScriptInstanceOptions {
  hookId: string;
  ownership?: ScriptOwnership;
  ownerId?: string | null;
  priority?: number;
  interruptible?: boolean;
  isCutscene?: boolean;
}

export class ScriptInstance {
  readonly id: string;
  readonly hookId: string;
  readonly ownership: ScriptOwnership;
  readonly ownerId: string | null;
  readonly priority: number;
  readonly interruptible: boolean;
  readonly isCutscene: boolean;
  readonly createdAt: number;

  private _state: ScriptState = "running";
  private _waitReason: WaitReason | null = null;
  private _waitData: unknown = null;

  private _resolve: (() => void) | null = null;
  private _reject: ((err: Error) => void) | null = null;
  private _promise: Promise<void>;

  constructor(options: ScriptInstanceOptions) {
    this.id = `script_${nextId++}`;
    this.hookId = options.hookId;
    this.ownership = options.ownership ?? "interaction";
    this.ownerId = options.ownerId ?? null;
    this.priority = options.isCutscene ? Math.max(options.priority ?? 0, 100) : (options.priority ?? 0);
    this.interruptible = options.interruptible ?? true;
    this.isCutscene = options.isCutscene ?? false;
    this.createdAt = Date.now();

    this._promise = new Promise<void>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    this._promise.catch(() => {});
  }

  get state(): ScriptState {
    return this._state;
  }

  get waitReason(): WaitReason | null {
    return this._waitReason;
  }

  get waitData(): unknown {
    return this._waitData;
  }

  get promise(): Promise<void> {
    return this._promise;
  }

  get isActive(): boolean {
    return this._state === "running" || this._state === "waiting" || this._state === "paused";
  }

  setWaiting(reason: WaitReason, data?: unknown): void {
    if (!this.isActive) return;
    this._state = "waiting";
    this._waitReason = reason;
    this._waitData = data ?? null;
  }

  clearWait(): void {
    if (this._state !== "waiting") return;
    this._state = "running";
    this._waitReason = null;
    this._waitData = null;
  }

  pause(): void {
    if (this._state === "running" || this._state === "waiting") {
      this._state = "paused";
    }
  }

  resume(): void {
    if (this._state === "paused") {
      this._state = this._waitReason ? "waiting" : "running";
    }
  }

  complete(): void {
    if (!this.isActive) return;
    this._state = "completed";
    this._waitReason = null;
    this._waitData = null;
    this._resolve?.();
  }

  cancel(): void {
    if (!this.isActive) return;
    this._state = "cancelled";
    this._waitReason = null;
    this._waitData = null;
    this._reject?.(new Error(`Script "${this.hookId}" was cancelled`));
  }

  toInfo(): ScriptInstanceInfo {
    return {
      id: this.id,
      hookId: this.hookId,
      state: this._state,
      ownership: this.ownership,
      ownerId: this.ownerId,
      waitReason: this._waitReason,
      waitData: this._waitData,
      priority: this.priority,
      interruptible: this.interruptible,
      isCutscene: this.isCutscene,
      createdAt: this.createdAt,
      elapsedMs: Date.now() - this.createdAt,
    };
  }
}
