import type { VerbType } from "../core/types";
import type { DebugOverlayFlags } from "../debug/DebugState";
import { DEFAULT_OVERLAY_FLAGS } from "../debug/DebugState";

export interface SpeechBubble {
  actorId: string;
  text: string;
  x: number;
  y: number;
  timer: number;
}

export interface HitFlashState {
  entityId: string;
  entityType: "object" | "actor" | "hotspot" | "exit";
  x: number;
  y: number;
  startTime: number;
}

export interface UIState {
  selectedVerb: VerbType;
  message: string;
  messageTimer: number;
  hoverTarget: string | null;
  pendingActionSentence: string;
  inventoryOpen: boolean;
  selectedInventoryItem: string | null;
  showRoomTitle: boolean;
  roomTitle: string;
  debugMode: boolean;
  debugOverlayFlags: DebugOverlayFlags;
  debugInteractionTarget: string | null;
  debugHitFlash: HitFlashState | null;
  debugInspectedEntityId: string | null;
  speechBubble: SpeechBubble | null;
  bubbleShownAt: number;
  skippable: boolean;
}

type UIUpdateCallback = (state: UIState) => void;

/** Duration in milliseconds for the invalid-action cursor feedback window. */
const INVALID_FEEDBACK_MS = 500;

export class UIManager {
  private uiState: UIState = {
    selectedVerb: "walk",
    message: "",
    messageTimer: 0,
    hoverTarget: null,
    pendingActionSentence: "",
    inventoryOpen: false,
    selectedInventoryItem: null,
    showRoomTitle: false,
    roomTitle: "",
    debugMode: false,
    debugOverlayFlags: { ...DEFAULT_OVERLAY_FLAGS },
    debugInteractionTarget: null,
    debugHitFlash: null,
    debugInspectedEntityId: null,
    speechBubble: null,
    bubbleShownAt: 0,
    skippable: false,
  };

  private listeners: UIUpdateCallback[] = [];
  private _dismissResolve: (() => void) | null = null;
  private invalidFeedbackUntil: number = 0;

  getState(): UIState {
    return this.uiState;
  }

  subscribe(cb: UIUpdateCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    for (const cb of this.listeners) cb({ ...this.uiState });
  }

  setVerb(verb: VerbType): void {
    this.uiState.selectedVerb = verb;
    this.uiState.selectedInventoryItem = null;
    this.notify();
  }

  getVerb(): VerbType {
    return this.uiState.selectedVerb;
  }

  showMessage(text: string, duration = 3): void {
    this.uiState.message = text;
    this.uiState.messageTimer = duration;
    this.notify();
  }

  clearMessage(): void {
    this.uiState.message = "";
    this.uiState.messageTimer = 0;
    this._dismissResolve = null;
    this.uiState.skippable = false;
    this.notify();
  }

  /**
   * Signal that an invalid action just occurred. The cursor will show the
   * `invalidCursor` style for INVALID_FEEDBACK_MS milliseconds. Calling
   * `updateCursor()` in EngineInputBridge reads `isInvalidFeedbackActive()`
   * to apply the INVALID priority level.
   */
  setInvalidFeedback(): void {
    this.invalidFeedbackUntil = Date.now() + INVALID_FEEDBACK_MS;
  }

  /**
   * Returns true while the invalid-action cursor window is still active.
   * Checked by `updateCursor()` in EngineInputBridge (priority level 2).
   */
  isInvalidFeedbackActive(): boolean {
    return Date.now() < this.invalidFeedbackUntil;
  }

  setHoverTarget(name: string | null): void {
    if (this.uiState.hoverTarget !== name) {
      this.uiState.hoverTarget = name;
      this.notify();
    }
  }

  setPendingActionSentence(sentence: string): void {
    if (this.uiState.pendingActionSentence !== sentence) {
      this.uiState.pendingActionSentence = sentence;
      this.notify();
    }
  }

  private roomTitleTimer: ReturnType<typeof setTimeout> | null = null;

  setRoomTitle(title: string, show = true): void {
    this.uiState.roomTitle = title;
    this.uiState.showRoomTitle = show;
    this.notify();
    if (this.roomTitleTimer !== null) {
      clearTimeout(this.roomTitleTimer);
      this.roomTitleTimer = null;
    }
    if (show) {
      this.roomTitleTimer = setTimeout(() => {
        this.roomTitleTimer = null;
        this.uiState.showRoomTitle = false;
        this.notify();
      }, 2500);
    }
  }

  dispose(): void {
    if (this.roomTitleTimer !== null) {
      clearTimeout(this.roomTitleTimer);
      this.roomTitleTimer = null;
    }
  }

  selectInventoryItem(itemId: string | null): void {
    this.uiState.selectedInventoryItem = itemId;
    if (itemId) {
      this.uiState.selectedVerb = "use";
    }
    this.notify();
  }

  getSelectedInventoryItem(): string | null {
    return this.uiState.selectedInventoryItem;
  }

  toggleDebug(): void {
    this.uiState.debugMode = !this.uiState.debugMode;
    this.notify();
  }

  setDebug(enabled: boolean): void {
    this.uiState.debugMode = enabled;
    this.notify();
  }

  toggleOverlayFlag(flag: keyof DebugOverlayFlags): void {
    this.uiState.debugOverlayFlags[flag] = !this.uiState.debugOverlayFlags[flag];
    this.notify();
  }

  setOverlayFlag(flag: keyof DebugOverlayFlags, value: boolean): void {
    this.uiState.debugOverlayFlags[flag] = value;
    this.notify();
  }

  getOverlayFlags(): Readonly<DebugOverlayFlags> {
    return { ...this.uiState.debugOverlayFlags };
  }

  setDebugInteractionTarget(targetId: string | null): void {
    if (this.uiState.debugInteractionTarget !== targetId) {
      this.uiState.debugInteractionTarget = targetId;
      this.notify();
    }
  }

  triggerHitFlash(entityId: string, entityType: "object" | "actor" | "hotspot" | "exit", x: number, y: number): void {
    this.uiState.debugHitFlash = { entityId, entityType, x, y, startTime: performance.now() };
    this.notify();
  }

  triggerHitFlashMiss(x: number, y: number): void {
    this.uiState.debugHitFlash = { entityId: "", entityType: "object", x, y, startTime: performance.now() };
    this.notify();
  }

  setDebugInspectedEntity(entityId: string | null): void {
    this.uiState.debugInspectedEntityId = entityId;
    this.notify();
  }

  showSpeechBubble(actorId: string, text: string, x: number, y: number, duration = 3): void {
    this.uiState.speechBubble = { actorId, text, x, y, timer: duration };
    this.uiState.bubbleShownAt = performance.now();
    this.notify();
  }

  clearSpeechBubble(): void {
    this.uiState.speechBubble = null;
    this.uiState.bubbleShownAt = 0;
    this._dismissResolve = null;
    this.uiState.skippable = false;
    this.notify();
  }

  setSkippable(skippable: boolean): void {
    this.uiState.skippable = skippable;
    this.notify();
  }

  registerDismissCallback(resolve: () => void): void {
    this._dismissResolve = resolve;
  }

  clearDismissCallback(): void {
    this._dismissResolve = null;
  }

  hasActiveBubble(): boolean {
    return this.uiState.speechBubble !== null;
  }

  hasActiveMessage(): boolean {
    return this.uiState.messageTimer > 0 && this.uiState.message.length > 0;
  }

  dismissBubble(): void {
    const resolve = this._dismissResolve;
    this._dismissResolve = null;
    this.uiState.speechBubble = null;
    this.uiState.bubbleShownAt = 0;
    this.uiState.skippable = false;
    this.notify();
    if (resolve) resolve();
  }

  dismissMessage(): void {
    const resolve = this._dismissResolve;
    this._dismissResolve = null;
    this.uiState.message = "";
    this.uiState.messageTimer = 0;
    this.uiState.skippable = false;
    this.notify();
    if (resolve) resolve();
  }

  update(deltaTime: number): void {
    if (this.uiState.messageTimer > 0) {
      this.uiState.messageTimer -= deltaTime;
      if (this.uiState.messageTimer <= 0) {
        this.uiState.message = "";
        this.uiState.messageTimer = 0;
        this.uiState.skippable = false;
        this._dismissResolve = null;
        this.notify();
      }
    }

    if (this.uiState.speechBubble) {
      this.uiState.speechBubble.timer -= deltaTime;
      if (this.uiState.speechBubble.timer <= 0) {
        this.uiState.speechBubble = null;
        this.uiState.bubbleShownAt = 0;
        this.uiState.skippable = false;
        this._dismissResolve = null;
        this.notify();
      }
    }
  }
}
