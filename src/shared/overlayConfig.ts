export type OverlayPlacement = "top" | "bottom";
export type OverlayDirection = "horizontal" | "vertical";

/**
 * Dock position of the verb bar — which edge of the game display it attaches to.
 * - `"top"` / `"bottom"` → spans the full width at that edge; bar height = `size`
 * - `"left"` / `"right"` → spans the full height at that edge; bar width = `size`
 */
export type VerbBarDock = "top" | "bottom" | "left" | "right";

/**
 * How the verb bar reveals itself during gameplay.
 * - `"always"` — permanently visible (default)
 * - `"hover"` — invisible until the mouse enters its region; fades in
 * - `"collapsed"` — shows a narrow 6 px strip at the dock edge; expands on hover
 */
export type VerbBarVisibilityMode = "always" | "hover" | "collapsed";

/**
 * Controls how the player selects the active verb.
 *
 * - `"bar"` (default) — verbs are selected via the on-screen verb bar.
 * - `"rightclick"` — verbs are cycled by right-clicking the canvas (Sierra /
 *   SCI-style).  The verb bar defaults to hidden when this mode is active,
 *   though setting `visible: true` explicitly will keep it visible alongside
 *   right-click cycling.
 */
export type VerbSelectMode = "bar" | "rightclick";

export interface VerbButtonConfig {
  verb: string;
  imagePath?: string;
  width?: number;
  height?: number;
  label?: string;
  hideLabel?: boolean;
}

export interface VerbBarConfig {
  visible?: boolean;
  /** @deprecated Use `dock` instead. Kept for backward compatibility. */
  placement?: OverlayPlacement;
  /** Which edge of the game display the verb bar attaches to. Default: `"bottom"`. */
  dock?: VerbBarDock;
  /** Bar thickness in pixels: height for top/bottom docks, width for left/right. Default: 40. */
  size?: number;
  /** How the bar reveals itself. Default: `"always"`. */
  visibilityMode?: VerbBarVisibilityMode;
  direction?: OverlayDirection;
  gap?: number;
  padding?: number;
  buttons?: VerbButtonConfig[];
  /**
   * Verb-selection input mode.  Defaults to `"bar"`.
   * When set to `"rightclick"`, right-clicking the canvas cycles through the
   * project's verbs in order (Sierra/AGI/SCI convention).
   */
  verbSelectMode?: VerbSelectMode;
}

export interface InventoryBarConfig {
  visible?: boolean;
  placement?: OverlayPlacement;
  labelText?: string;
  hideLabel?: boolean;
}

export interface MessageBarConfig {
  visible?: boolean;
  placement?: "top" | "bottom";
}

export interface SaveLoadBarConfig {
  visible?: boolean;
}

export interface HoverLabelConfig {
  visible?: boolean;
}

export interface RoomTitleConfig {
  visible?: boolean;
}

export interface OverlayConfig {
  verbBar?: VerbBarConfig;
  inventoryBar?: InventoryBarConfig;
  messageBar?: MessageBarConfig;
  saveLoadBar?: SaveLoadBarConfig;
  hoverLabel?: HoverLabelConfig;
  roomTitle?: RoomTitleConfig;
}

export interface ResolvedVerbBarConfig {
  visible: boolean;
  /** @deprecated Use `dock`. */
  placement: OverlayPlacement;
  /** Resolved dock position. Always present after resolution. */
  dock: VerbBarDock;
  /** Bar thickness in pixels. */
  size: number;
  /** Resolved visibility mode. */
  visibilityMode: VerbBarVisibilityMode;
  direction: OverlayDirection;
  gap: number;
  padding: number;
  buttons: VerbButtonConfig[];
  /** Resolved verb-selection mode. Always present after resolution. */
  verbSelectMode: VerbSelectMode;
}

export interface ResolvedInventoryBarConfig {
  visible: boolean;
  placement: OverlayPlacement;
  hideLabel: boolean;
  labelText: string;
}

export interface ResolvedMessageBarConfig {
  visible: boolean;
  placement: "top" | "bottom";
}

export interface ResolvedSaveLoadBarConfig {
  visible: boolean;
}

export interface ResolvedHoverLabelConfig {
  visible: boolean;
}

export interface ResolvedRoomTitleConfig {
  visible: boolean;
}

export interface ResolvedOverlayConfig {
  verbBar: ResolvedVerbBarConfig;
  inventoryBar: ResolvedInventoryBarConfig;
  messageBar: ResolvedMessageBarConfig;
  saveLoadBar: ResolvedSaveLoadBarConfig;
  hoverLabel: ResolvedHoverLabelConfig;
  roomTitle: ResolvedRoomTitleConfig;
}

export function resolveOverlayConfig(partial?: OverlayConfig): ResolvedOverlayConfig {
  const verbSelectMode: VerbSelectMode = partial?.verbBar?.verbSelectMode ?? "bar";
  // `dock` is canonical; fall back to `placement` for backward compat, then "bottom".
  const rawDock = partial?.verbBar?.dock ?? partial?.verbBar?.placement ?? "bottom";
  const dock: VerbBarDock = (rawDock === "left" || rawDock === "right") ? rawDock : rawDock as VerbBarDock;
  // Legacy `placement` stays as top|bottom mirror for non-dock code paths.
  const placement: OverlayPlacement = (dock === "top") ? "top" : "bottom";
  return {
    verbBar: {
      verbSelectMode,
      visible: partial?.verbBar?.visible ?? (verbSelectMode === "bar"),
      placement,
      dock,
      size: partial?.verbBar?.size ?? 40,
      visibilityMode: partial?.verbBar?.visibilityMode ?? "always",
      direction: partial?.verbBar?.direction ?? "horizontal",
      gap: partial?.verbBar?.gap ?? 0,
      padding: partial?.verbBar?.padding ?? 0,
      buttons: partial?.verbBar?.buttons ?? [],
    },
    inventoryBar: {
      visible: partial?.inventoryBar?.visible ?? false,
      placement: partial?.inventoryBar?.placement ?? "bottom",
      hideLabel: partial?.inventoryBar?.hideLabel ?? false,
      labelText: partial?.inventoryBar?.labelText ?? "INVENTORY:",
    },
    messageBar: {
      visible: partial?.messageBar?.visible ?? false,
      placement: partial?.messageBar?.placement ?? "bottom",
    },
    saveLoadBar: {
      visible: partial?.saveLoadBar?.visible ?? false,
    },
    hoverLabel: {
      visible: partial?.hoverLabel?.visible ?? true,
    },
    roomTitle: {
      visible: partial?.roomTitle?.visible ?? true,
    },
  };
}

export function getVerbButtonConfig(
  resolved: ResolvedOverlayConfig,
  verb: string
): VerbButtonConfig | undefined {
  return resolved.verbBar.buttons.find((b) => b.verb === verb);
}
