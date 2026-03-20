/**
 * CursorConfig — data-driven cursor presentation layer for the adventure engine.
 *
 * Projects that define no `cursorConfig` behave identically to before this
 * feature was introduced: the engine falls back to built-in CSS cursor strings
 * for each verb (see VERB_CSS_CURSORS below).
 *
 * Projects that do define `cursorConfig` gain six levels of cursor priority,
 * resolved in order by `updateCursor()` in EngineInputBridge:
 *
 *   1. BUSY    — engine is running a cutscene; shows `busyCursor`
 *   2. INVALID — a recent invalid-action signal is active; shows `invalidCursor`
 *   3. CARRY   — an inventory item is selected for a "use X with Y" action;
 *                shows `inventoryItemCursor`
 *   4. CONTEXT — hover target provides a verb-aware cursor:
 *                  - actor/hotspot: active verb cursor (or per-entity cursorOverride)
 *                  - exit: active verb cursor (VERB_CSS_CURSORS fallback)
 *                  - object with affordance: verbCursors[affordance] chain
 *                  - object with cursorOverride: that override value
 *   5. VERB    — active verb cursor from `verbCursors` map (or CSS fallback)
 *   6. DEFAULT — idle/no hover; shows `defaultCursor`
 *
 * All cursor settings are configurable in the editor's Settings → Cursor Settings
 * panel. Future extension points (out of scope):
 *   - Animated sprite-strip cursors
 *   - Per-hotspot or per-actor cursorOverride at the config level
 */

/** Maps each verb name to a CSS cursor string or asset URL. */
export interface VerbCursorMap {
  [verb: string]: string;
}

/**
 * Cursor presentation config attached to a project.
 * All fields are optional — omit any you don't need.
 */
export interface CursorConfig {
  /**
   * Cursor shown when no target is hovered and no verb is active.
   * Accepts a CSS cursor value (e.g. "default", "none") or an image URL.
   * Default: "default"
   */
  defaultCursor?: string;

  /**
   * Per-verb cursor map. Keys are VerbType strings ("walk", "look", etc.).
   * Values are CSS cursor strings or image URLs.
   * Takes precedence over the legacy top-level `verbCursors` field.
   * Example: { walk: "crosshair", pickup: "grab" }
   */
  verbCursors?: VerbCursorMap;

  /**
   * Cursor shown after an invalid action (e.g. "You can't pick that up.").
   * Active for ~500 ms (INVALID_FEEDBACK_MS). Default: "not-allowed"
   */
  invalidCursor?: string;

  /**
   * Cursor shown while the engine is running a cutscene / blocking script.
   * Default: "wait"
   */
  busyCursor?: string;

  /**
   * Horizontal hotspot offset (px) when using a custom cursor image URL.
   * Default: 16
   */
  hotspotX?: number;

  /**
   * Vertical hotspot offset (px) when using a custom cursor image URL.
   * Default: 16
   */
  hotspotY?: number;

  /**
   * Cursor shown when an inventory item is selected for a "use X with Y" action.
   * Communicates "item in hand" state to the player.
   * Default: "grabbing"
   */
  inventoryItemCursor?: string;
}

/** Safe defaults used when no CursorConfig (or partial config) is provided. */
export const DEFAULT_CURSOR_CONFIG: Required<CursorConfig> = {
  defaultCursor: "default",
  verbCursors: {},
  invalidCursor: "not-allowed",
  busyCursor: "wait",
  hotspotX: 16,
  hotspotY: 16,
  inventoryItemCursor: "grabbing",
};

/**
 * Built-in CSS cursor fallbacks keyed by VerbType.
 * Previously defined privately in EngineInputBridge — now exported so other
 * modules (e.g. editor previews) can reference the same mapping.
 */
export const VERB_CSS_CURSORS: Record<string, string> = {
  walk: "crosshair",
  look: "help",
  open: "pointer",
  close: "pointer",
  pickup: "grab",
  use: "cell",
  talk: "text",
  push: "e-resize",
  pull: "w-resize",
  give: "copy",
};
