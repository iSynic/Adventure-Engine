import type { AnimationState } from "../core/types";

export const ANIMATION_FALLBACK_CHAIN: Record<AnimationState, AnimationState | null> = {
  idle: null,
  walk: "idle",
  talk: "idle",
  face: "idle",
  interact_low: "interact",
  interact_mid: "interact",
  interact_high: "interact",
  interact: "idle",
  pickup: "interact_low",
  push_pull: "interact_mid",
  special_use: "interact_mid",
  emote: "idle",
};

export type AnimationPriority = "automatic" | "scripted" | "override";

const PRIORITY_RANK: Record<AnimationPriority, number> = {
  automatic: 0,
  scripted: 1,
  override: 2,
};

export const ALL_ANIMATION_STATES: AnimationState[] = [
  "idle",
  "walk",
  "talk",
  "face",
  "interact_low",
  "interact_mid",
  "interact_high",
  "interact",
  "pickup",
  "push_pull",
  "special_use",
  "emote",
];

export const CORE_ANIMATION_STATES: AnimationState[] = ["idle", "walk", "talk", "face"];
export const INTERACTION_ANIMATION_STATES: AnimationState[] = [
  "interact_low",
  "interact_mid",
  "interact_high",
  "interact",
];
export const OPTIONAL_ANIMATION_STATES: AnimationState[] = [
  "pickup",
  "push_pull",
  "special_use",
  "emote",
];

const VALID_TRANSITIONS: Record<AnimationState, Set<AnimationState>> = {
  idle: new Set<AnimationState>([
    "walk", "talk", "face",
    "interact", "interact_low", "interact_mid", "interact_high",
    "pickup", "push_pull", "special_use", "emote",
  ]),
  walk: new Set<AnimationState>([
    "idle", "talk", "face",
    "interact", "interact_low", "interact_mid", "interact_high",
    "pickup", "push_pull", "special_use", "emote",
  ]),
  talk: new Set<AnimationState>(["idle", "walk"]),
  face: new Set<AnimationState>(["idle", "walk"]),
  interact: new Set<AnimationState>(["idle", "walk"]),
  interact_low: new Set<AnimationState>(["idle", "walk", "interact"]),
  interact_mid: new Set<AnimationState>(["idle", "walk", "interact"]),
  interact_high: new Set<AnimationState>(["idle", "walk", "interact"]),
  pickup: new Set<AnimationState>(["idle", "walk", "interact", "interact_low"]),
  push_pull: new Set<AnimationState>(["idle", "walk", "interact", "interact_mid"]),
  special_use: new Set<AnimationState>(["idle", "walk", "interact", "interact_mid"]),
  emote: new Set<AnimationState>(["idle", "walk"]),
};

export interface AnimationTransition {
  state: AnimationState;
  priority: AnimationPriority;
  loop: boolean;
  returnToState?: AnimationState;
  onComplete?: () => void;
}

export class AnimationStateMachine {
  private currentState: AnimationState = "idle";
  private currentPriority: AnimationPriority = "automatic";
  private returnToState: AnimationState | null = null;
  private onCompleteCallback: (() => void) | null = null;
  private overrideState: AnimationState | null = null;

  get state(): AnimationState {
    if (this.overrideState !== null) {
      return this.overrideState;
    }
    return this.currentState;
  }

  get priority(): AnimationPriority {
    return this.currentPriority;
  }

  private isValidTransition(from: AnimationState, to: AnimationState): boolean {
    if (from === to) return true;
    return VALID_TRANSITIONS[from]?.has(to) ?? false;
  }

  transition(to: AnimationState, priority: AnimationPriority = "automatic"): boolean {
    if (
      PRIORITY_RANK[priority] < PRIORITY_RANK[this.currentPriority] &&
      this.currentState !== "idle"
    ) {
      return false;
    }

    if (priority === "automatic" && !this.isValidTransition(this.currentState, to)) {
      return false;
    }

    this.currentState = to;
    this.currentPriority = priority;
    this.returnToState = null;
    this.onCompleteCallback = null;
    return true;
  }

  release(restoreTo: AnimationState = "idle"): void {
    this.currentState = restoreTo;
    this.currentPriority = "automatic";
    this.returnToState = null;
    this.onCompleteCallback = null;
  }

  transitionOneShot(
    to: AnimationState,
    priority: AnimationPriority = "scripted",
    returnTo?: AnimationState,
    onComplete?: () => void
  ): boolean {
    if (
      PRIORITY_RANK[priority] < PRIORITY_RANK[this.currentPriority] &&
      this.currentState !== "idle"
    ) {
      return false;
    }

    this.returnToState = returnTo ?? this.currentState;
    this.onCompleteCallback = onComplete ?? null;
    this.currentState = to;
    this.currentPriority = priority;
    return true;
  }

  onAnimationComplete(): void {
    if (this.returnToState !== null) {
      const cb = this.onCompleteCallback;
      const returnState = this.returnToState;
      this.returnToState = null;
      this.onCompleteCallback = null;
      this.currentState = returnState;
      this.currentPriority = "automatic";
      if (cb) cb();
    }
  }

  onAnimationMissing(): void {
    if (this.returnToState !== null) {
      const cb = this.onCompleteCallback;
      const returnState = this.returnToState;
      this.returnToState = null;
      this.onCompleteCallback = null;
      this.currentState = returnState;
      this.currentPriority = "automatic";
      if (cb) cb();
    }
  }

  get isOneShot(): boolean {
    return this.returnToState !== null;
  }

  setOverride(state: AnimationState): void {
    this.overrideState = state;
  }

  clearOverride(): void {
    this.overrideState = null;
  }

  get hasOverride(): boolean {
    return this.overrideState !== null;
  }

  forceIdle(): void {
    this.release("idle");
  }

  getFallbackState(state: AnimationState): AnimationState | null {
    return ANIMATION_FALLBACK_CHAIN[state] ?? null;
  }
}
