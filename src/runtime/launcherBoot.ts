import type { ExportManifest } from "../shared/exportSchema";
import type { DisplayConfig } from "../shared/displayConfig";
import { resolveDisplayConfig } from "../shared/displayConfig";
import type { OverlayConfig } from "../shared/overlayConfig";
import { resolveOverlayConfig, getVerbButtonConfig } from "../shared/overlayConfig";
import type { GameConfig, VerbType } from "../engine/core/types";
import type { UIState } from "../engine/ui/UIManager";
import type { RuntimeStorageProvider } from "../shared/RuntimeStorageProvider";
import type { ScriptHandlerFn } from "../engine/scripting/ScriptRunner";
import { Engine } from "../engine/core/Engine";
import { loadGameData, defaultWebFetcher, desktopFetcher, type DataFetcher } from "./runtimeDataLoader";
import { VERB_LABELS } from "./verbLabels";
import { createViewportResizeObserver, applyPixelPerfectCSS } from "../shared/ViewportScaler";

export type { ExportManifest } from "../shared/exportSchema";
export type { DisplayConfig } from "../shared/displayConfig";
export type { OverlayConfig } from "../shared/overlayConfig";
export type { DataFetcher } from "./runtimeDataLoader";
export type { RuntimeStorageProvider } from "../shared/RuntimeStorageProvider";
export type { StorageProvider } from "../shared/StorageProvider";
export { defaultWebFetcher, desktopFetcher } from "./runtimeDataLoader";
export { LocalStorageProvider } from "../shared/LocalStorageProvider";
export { FileSystemProvider } from "../shared/FileSystemProvider.stub";
export { VERB_LABELS } from "./verbLabels";

// ─── Runtime shell structure ──────────────────────────────────────────────────
//
// The runtime distinguishes between two categories of DOM elements:
//
//   REQUIRED — viewport elements the engine cannot run without:
//     • #canvas-wrap  — the scaling container observed by ResizeObserver
//     • #game-canvas  — the HTMLCanvasElement passed to Engine/Renderer
//
//   OPTIONAL — overlay UI elements that the built-in shell creates by default
//     but that can be omitted (null) or replaced by a host page's own DOM:
//     • #overlay       — absolute positioned layer over the canvas
//     • #hover-label   — verb+target tooltip shown on mouse hover
//     • #room-title    — centred room-name card shown during transitions
//     • #message-bar   — text feedback strip (gated by overlayConfig.messageBar.visible)
//     • #verb-bar      — verb-button panel  (gated by overlayConfig.verbBar.visible)
//     • #inventory-bar — inventory strip     (gated by overlayConfig.inventoryBar.visible)
//     • #save-load-bar — save/load buttons  (gated by overlayConfig.saveLoadBar.visible)
//
// When `bootRuntime` is called with a mount element that already contains
// #canvas-wrap and #game-canvas (the "adopt" path), the engine reuses those
// elements and queries for optional elements; missing ones become null.
// All wiring code (wireUI, wireSaveLoadKeys) null-checks every optional element,
// so the engine functions correctly whether or not any overlay element is present.
//
// FUTURE: OverlayConfig will be extended to let the project declare a custom
// overlay template or component. When that lands, the built-in bars below
// become the default fallback rather than the only option.
// ─────────────────────────────────────────────────────────────────────────────

export interface RuntimeBootConfig {
  mount: HTMLElement;
  mode: "web" | "desktop";
  debug?: boolean;
  storageProvider?: RuntimeStorageProvider;

  packageRoot?: string;
  manifest?: ExportManifest;
  dataFetcher?: DataFetcher;

  preloadedConfig?: GameConfig;
  preloadedScripts?: Record<string, ScriptHandlerFn>;

  /** Called with boot-time status strings instead of writing to dom.messageBar. */
  onStatusUpdate?: (msg: string) => void;
  /** Explicit scaling/centering wrapper; falls back to #game-container then mount. */
  scalingContainer?: HTMLElement;
}

export interface RuntimeInstance {
  engine: Engine;
  shutdown: () => void;
}

interface RuntimeDOM {
  // REQUIRED — engine will not function without these two elements
  canvas: HTMLCanvasElement;
  canvasWrap: HTMLElement;

  // OPTIONAL — overlay UI; null when absent or disabled via OverlayConfig.
  // All wiring code null-checks these before use, so any subset may be absent.
  overlay: HTMLElement | null;
  hoverLabel: HTMLElement | null;   // verb+target hover tooltip
  roomTitle: HTMLElement | null;    // room-transition title card
  messageBar: HTMLElement | null;   // text feedback strip
  verbBar: HTMLElement | null;      // verb-button panel
  inventoryBar: HTMLElement | null; // inventory item strip
  saveLoadBar: HTMLElement | null;  // save / load buttons
}

// ─── Required: viewport DOM ───────────────────────────────────────────────────
// Creates the two elements the engine cannot run without: the scaling wrapper
// div (#canvas-wrap) and the rendering canvas (#game-canvas). Also applies
// neutral full-bleed styles to the mount element so it acts as a viewport host.
// Nothing in this function is overlay-specific.
function createViewportDOM(
  mount: HTMLElement,
  cfg: ReturnType<typeof resolveDisplayConfig>
): { canvas: HTMLCanvasElement; canvasWrap: HTMLElement } {
  // Mount: neutral full-bleed container centred on the viewport
  mount.style.display = "flex";
  mount.style.flexDirection = "column";
  mount.style.alignItems = cfg.viewportAlignment === "top-left" ? "flex-start" : "center";
  mount.style.justifyContent = "center";
  mount.style.background = cfg.backgroundColor;
  mount.style.color = "#ddd";
  mount.style.fontFamily = "'Segoe UI', system-ui, sans-serif";
  mount.style.width = "100%";
  mount.style.height = "100%";
  mount.style.overflow = "hidden";

  // REQUIRED: scaling wrapper — observed by ResizeObserver for integer/fit scaling
  const canvasWrap = document.createElement("div");
  canvasWrap.id = "canvas-wrap";
  canvasWrap.style.position = "relative";
  canvasWrap.style.width = `${cfg.baseWidth}px`;
  canvasWrap.style.height = `${cfg.baseHeight}px`;
  canvasWrap.style.background = cfg.backgroundColor;
  canvasWrap.style.flexShrink = "0";

  // REQUIRED: the rendering surface passed to Engine/Renderer
  const canvas = document.createElement("canvas");
  canvas.id = "game-canvas";
  canvas.width = cfg.baseWidth;
  canvas.height = cfg.baseHeight;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.cursor = "crosshair";
  applyPixelPerfectCSS(canvas, cfg.pixelPerfect);

  canvasWrap.appendChild(canvas);
  mount.appendChild(canvasWrap);

  return { canvas, canvasWrap };
}

// ─── Optional: built-in overlay DOM ──────────────────────────────────────────
// Builds the default shell overlay inside canvasWrap. All elements are opt-in:
// bars default visible:false; hoverLabel and roomTitle default visible:true.
// topRegion / bottomRegion are created lazily — only appended when a bar lands
// in them, so an empty config adds no layout structure to the overlay.
//
// FUTURE: this function is the natural replacement point once OverlayConfig
// gains support for custom overlay templates. At that point, callers can skip
// this function entirely and supply their own overlay elements instead.
function buildOverlayDOM(
  canvasWrap: HTMLElement,
  oCfg: ReturnType<typeof resolveOverlayConfig>
): Pick<RuntimeDOM, "overlay" | "hoverLabel" | "roomTitle" | "messageBar" | "verbBar" | "inventoryBar" | "saveLoadBar"> {
  // Invisible full-cover layer that holds all overlay UI.
  // flex layout is added only when bar regions are actually present.
  const overlay = document.createElement("div");
  overlay.id = "overlay";
  overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden";

  // OPTIONAL: verb+target hover tooltip (default: visible)
  let hoverLabel: HTMLElement | null = null;
  if (oCfg.hoverLabel.visible) {
    hoverLabel = document.createElement("div");
    hoverLabel.id = "hover-label";
    hoverLabel.style.cssText = "position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:4px 12px;font-size:13px;border-radius:4px;pointer-events:none;display:none;z-index:10";
  }

  // OPTIONAL: room-transition title card (default: visible)
  let roomTitle: HTMLElement | null = null;
  if (oCfg.roomTitle.visible) {
    roomTitle = document.createElement("div");
    roomTitle.id = "room-title";
    roomTitle.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 32px;font-size:22px;border-radius:6px;pointer-events:none;display:none;z-index:10";
  }

  // Lazy layout regions — created only when at least one bar is placed in them
  let topRegion: HTMLElement | null = null;
  let bottomRegion: HTMLElement | null = null;

  const getTopRegion = (): HTMLElement => {
    if (!topRegion) {
      topRegion = document.createElement("div");
      topRegion.style.cssText = "display:flex;flex-direction:column;gap:0;pointer-events:none";
    }
    return topRegion;
  };

  const getBottomRegion = (): HTMLElement => {
    if (!bottomRegion) {
      bottomRegion = document.createElement("div");
      bottomRegion.style.cssText = "display:flex;flex-direction:column;gap:0;pointer-events:none;margin-top:auto";
    }
    return bottomRegion;
  };

  // OPTIONAL: narration / text feedback box — absolutely positioned inside the canvas,
  // centred horizontally near the top. Hidden by default; shown by wireUI on message events.
  let messageBar: HTMLElement | null = null;
  if (oCfg.messageBar.visible) {
    messageBar = document.createElement("div");
    messageBar.id = "message-bar";
    messageBar.style.cssText = [
      "position:absolute",
      "top:36px",
      "left:50%",
      "transform:translateX(-50%)",
      "max-width:80%",
      "background:rgba(0,0,0,0.85)",
      "color:#ffffcc",
      "font-family:monospace",
      "font-size:13px",
      "padding:8px 18px",
      "border-radius:6px",
      "text-align:center",
      "pointer-events:auto",
      "z-index:8",
      "display:none",
      "border:2px solid #88aaff",
    ].join(";");

    const textEl = document.createElement("div");
    textEl.setAttribute("data-msg-text", "");
    messageBar.appendChild(textEl);

    const hintEl = document.createElement("div");
    hintEl.setAttribute("data-msg-hint", "");
    hintEl.style.cssText = "display:none;font-size:10px;color:#88aadd;margin-top:4px;opacity:0.8";
    hintEl.textContent = "\u25BC click to continue";
    messageBar.appendChild(hintEl);
  }

  // OPTIONAL: verb-button panel — absolutely positioned on the overlay, 4-way dock
  let verbBar: HTMLElement | null = null;
  if (oCfg.verbBar.visible) {
    const dock = oCfg.verbBar.dock;
    const size = oCfg.verbBar.size;
    const visMode = oCfg.verbBar.visibilityMode;
    const isVertical = dock === "left" || dock === "right";
    const COLLAPSED_SIZE = 6;

    let posCSS = "";
    if      (dock === "top")    posCSS = `top:0;left:0;right:0;height:${size}px;`;
    else if (dock === "bottom") posCSS = `bottom:0;left:0;right:0;height:${size}px;`;
    else if (dock === "left")   posCSS = `top:0;bottom:0;left:0;width:${size}px;`;
    else                        posCSS = `top:0;bottom:0;right:0;width:${size}px;`;

    let visCSS = "";
    if (visMode === "hover") {
      visCSS = "opacity:0;transition:opacity 0.2s;";
    } else if (visMode === "collapsed") {
      if (isVertical) visCSS = `width:${COLLAPSED_SIZE}px;transition:width 0.15s ease;`;
      else            visCSS = `height:${COLLAPSED_SIZE}px;transition:height 0.15s ease;`;
    }

    verbBar = document.createElement("div");
    verbBar.id = "verb-bar";
    verbBar.style.cssText = [
      "position:absolute",
      posCSS,
      `display:flex;flex-wrap:wrap;gap:${oCfg.verbBar.gap}px;padding:${oCfg.verbBar.padding}px`,
      "background:rgba(26,26,46,0.85);pointer-events:auto",
      `flex-direction:${isVertical ? "column" : "row"};align-items:center;overflow:hidden`,
      visCSS,
    ].join(";");

    // Suppress browser context menu inside the verb bar
    verbBar.addEventListener("contextmenu", (e) => e.preventDefault());

    // Visibility mode interactions
    if (visMode === "hover") {
      verbBar.addEventListener("mouseenter", () => { verbBar!.style.opacity = "1"; });
      verbBar.addEventListener("mouseleave", () => { verbBar!.style.opacity = "0"; });
    } else if (visMode === "collapsed") {
      const prop = isVertical ? "width" : "height";
      verbBar.addEventListener("mouseenter", () => { verbBar!.style[prop] = `${size}px`; });
      verbBar.addEventListener("mouseleave", () => { verbBar!.style[prop] = `${COLLAPSED_SIZE}px`; });
    }
  }

  // OPTIONAL: inventory item strip.
  // When verbBar is also visible, inventory renders inside the verb bar's right section.
  // The standalone inventoryBar is created hidden in that case (wireUI keeps it hidden).
  // When verbBar is NOT visible, the standalone inventoryBar is used normally.
  let inventoryBar: HTMLElement | null = null;
  if (oCfg.inventoryBar.visible) {
    inventoryBar = document.createElement("div");
    inventoryBar.id = "inventory-bar";
    if (oCfg.verbBar.visible) {
      inventoryBar.style.display = "none"; // inventory rendered inside verb bar
    } else {
      inventoryBar.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:2px 6px;background:rgba(26,26,46,0.85);pointer-events:auto";
    }
  }

  // OPTIONAL: save/load button strip (default: hidden)
  let saveLoadBar: HTMLElement | null = null;
  if (oCfg.saveLoadBar.visible) {
    saveLoadBar = document.createElement("div");
    saveLoadBar.id = "save-load-bar";
    saveLoadBar.style.cssText = "display:flex;justify-content:center;gap:6px;padding:4px;background:rgba(0,0,0,0.5);pointer-events:auto";

    const btnSave = document.createElement("button");
    btnSave.id = "btn-save";
    btnSave.className = "sl-btn";
    btnSave.style.cssText = "background:#2a2a3e;border:1px solid #555;color:#ccc;padding:3px 10px;cursor:pointer;font-size:11px;border-radius:3px";
    btnSave.textContent = "Save (F5)";

    const btnLoad = document.createElement("button");
    btnLoad.id = "btn-load";
    btnLoad.className = "sl-btn";
    btnLoad.style.cssText = "background:#2a2a3e;border:1px solid #555;color:#ccc;padding:3px 10px;cursor:pointer;font-size:11px;border-radius:3px";
    btnLoad.textContent = "Load (F9)";

    saveLoadBar.appendChild(btnSave);
    saveLoadBar.appendChild(btnLoad);
  }

  // Place bars into layout regions (regions created lazily).
  // messageBar and verbBar are absolute-positioned directly on the overlay.
  // When verbBar is absent, standalone inventoryBar goes in the bottom region.
  if (inventoryBar && !oCfg.verbBar.visible) getBottomRegion().appendChild(inventoryBar);
  if (saveLoadBar) getBottomRegion().appendChild(saveLoadBar);

  // Apply flex layout to overlay only when bar regions are present
  const hasRegions = topRegion !== null || bottomRegion !== null;
  if (hasRegions) {
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    if (topRegion && bottomRegion) {
      overlay.style.justifyContent = "space-between";
    }
  }

  if (topRegion) overlay.appendChild(topRegion);
  if (bottomRegion) overlay.appendChild(bottomRegion);
  if (verbBar) overlay.appendChild(verbBar);
  if (messageBar) overlay.appendChild(messageBar); // absolute-positioned; not in any region
  if (hoverLabel) overlay.appendChild(hoverLabel);
  if (roomTitle) overlay.appendChild(roomTitle);
  canvasWrap.appendChild(overlay);

  return { overlay, hoverLabel, roomTitle, messageBar, verbBar, inventoryBar, saveLoadBar };
}

// ─── Fallback DOM builder ─────────────────────────────────────────────────────
// Called only when the mount element does not already contain the required
// viewport elements. Creates both the required viewport and the optional
// built-in overlay. Host pages that supply their own shell bypass this entirely
// via adoptExistingDOM() below.
function createRuntimeDOM(
  mount: HTMLElement,
  display: DisplayConfig | undefined,
  overlayConfig: OverlayConfig | undefined
): RuntimeDOM {
  const cfg = resolveDisplayConfig(display);
  const oCfg = resolveOverlayConfig(overlayConfig);

  const { canvas, canvasWrap } = createViewportDOM(mount, cfg);
  const overlayElements = buildOverlayDOM(canvasWrap, oCfg);

  return { canvas, canvasWrap, ...overlayElements };
}

// ─── Adopt path ───────────────────────────────────────────────────────────────
// Used when the host page supplies its own shell HTML (e.g. the exported
// standalone player, the editor preview pane, or a custom host page).
// Returns null if the REQUIRED elements are missing, causing bootRuntime to
// fall back to createRuntimeDOM instead. Optional overlay elements are queried
// by id; any that are absent in the host DOM become null and are silently
// skipped by wireUI / wireSaveLoadKeys.
function adoptExistingDOM(mount: HTMLElement): RuntimeDOM | null {
  // REQUIRED: bail out if either core element is absent
  const canvas = mount.querySelector("#game-canvas") as HTMLCanvasElement | null
    ?? mount.querySelector("canvas") as HTMLCanvasElement | null;
  const canvasWrap = mount.querySelector("#canvas-wrap") as HTMLElement | null;

  if (!canvas || !canvasWrap) {
    return null;
  }

  return {
    canvas,      // REQUIRED
    canvasWrap,  // REQUIRED

    // OPTIONAL: all may be null if the host page omits them
    overlay:      mount.querySelector("#overlay")       as HTMLElement | null,
    hoverLabel:   mount.querySelector("#hover-label")   as HTMLElement | null,
    roomTitle:    mount.querySelector("#room-title")    as HTMLElement | null,
    messageBar:   mount.querySelector("#message-bar")   as HTMLElement | null,
    verbBar:      mount.querySelector("#verb-bar")      as HTMLElement | null,
    inventoryBar: mount.querySelector("#inventory-bar") as HTMLElement | null,
    saveLoadBar:  mount.querySelector("#save-load-bar") as HTMLElement | null,
  };
}

// ─── Overlay renderers ────────────────────────────────────────────────────────
// Stateless DOM helpers called by wireUI on every UIState change.
// Each function null-checks its container so callers don't have to.

function renderVerbBar(
  container: HTMLElement | null,
  verbs: VerbType[],
  selected: VerbType,
  onSelect: (v: VerbType) => void,
  overlayConfig?: OverlayConfig,
  assetRoot?: string,
  inventoryItems?: { id: string; name: string }[],
  selectedItem?: string | null,
  onSelectItem?: (id: string | null) => void,
  onLookItem?: (id: string) => void
) {
  if (!container) return;
  container.innerHTML = "";
  const oCfg = resolveOverlayConfig(overlayConfig);

  const hasInventory = inventoryItems !== undefined;
  let verbTarget: HTMLElement = container;

  if (hasInventory) {
    container.style.justifyContent = "space-between";
    container.style.alignItems = "center";

    const left = document.createElement("div");
    left.style.cssText = `display:flex;flex-wrap:wrap;align-items:center;gap:${oCfg.verbBar.gap}px`;
    verbTarget = left;
    container.appendChild(left);

    const right = document.createElement("div");
    right.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:4px;border-left:1px solid #333;padding-left:6px;margin-left:4px";
    renderInventoryItems(right, inventoryItems!, selectedItem ?? null, onSelectItem ?? (() => {}), onLookItem ?? (() => {}));
    container.appendChild(right);
  }

  for (const v of verbs) {
    const btnConfig = getVerbButtonConfig(oCfg, v);
    const btn = document.createElement("button");
    btn.style.cssText = "background:none;border:1px solid #444;color:#ccc;padding:4px 10px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:4px";

    if (v === selected) {
      btn.style.background = "#3a3a5e";
      btn.style.color = "#fff";
      btn.style.borderColor = "#666";
    }

    if (btnConfig?.imagePath) {
      const img = document.createElement("img");
      const src = (assetRoot && !btnConfig.imagePath.startsWith("data:") && !btnConfig.imagePath.startsWith("http"))
        ? assetRoot + btnConfig.imagePath
        : btnConfig.imagePath;
      img.src = src;
      img.alt = btnConfig.label ?? VERB_LABELS[v] ?? v;
      img.style.display = "block";
      if (btnConfig.width) img.style.width = `${btnConfig.width}px`;
      if (btnConfig.height) img.style.height = `${btnConfig.height}px`;
      if (!btnConfig.width && !btnConfig.height) {
        img.style.height = "20px";
        img.style.width = "auto";
      }
      img.style.pointerEvents = "none";
      btn.appendChild(img);

      if (!btnConfig.hideLabel) {
        const span = document.createElement("span");
        span.textContent = btnConfig.label ?? VERB_LABELS[v] ?? v;
        btn.appendChild(span);
      }

      if (btnConfig.width || btnConfig.height) {
        btn.style.padding = "2px";
      }
    } else {
      btn.textContent = btnConfig?.label ?? VERB_LABELS[v] ?? v;
    }

    btn.onclick = () => onSelect(v);
    verbTarget.appendChild(btn);
  }
}

// Renders inventory item buttons into any container element (no label).
function renderInventoryItems(
  container: HTMLElement,
  items: { id: string; name: string }[],
  selectedItem: string | null,
  onSelect: (id: string | null) => void,
  onLook: (id: string) => void
) {
  if (items.length === 0) {
    const sp = document.createElement("span");
    sp.style.cssText = "font-size:11px;color:#555;font-style:italic";
    sp.textContent = "no items";
    container.appendChild(sp);
    return;
  }
  for (const item of items) {
    const btn = document.createElement("button");
    btn.style.cssText = "background:#2a2a3e;border:1px solid #555;color:#ddd;padding:3px 8px;cursor:pointer;font-size:11px;border-radius:3px";
    if (selectedItem === item.id) {
      btn.style.background = "#4a4a6e";
      btn.style.borderColor = "#88f";
    }
    btn.textContent = item.name;
    btn.onclick = () => onSelect(selectedItem === item.id ? null : item.id);
    btn.oncontextmenu = (ev) => {
      ev.preventDefault();
      onLook(item.id);
    };
    container.appendChild(btn);
  }
}

function renderInventory(
  container: HTMLElement | null,
  items: { id: string; name: string }[],
  selectedItem: string | null,
  onSelect: (id: string | null) => void,
  onLook: (id: string) => void,
  overlayConfig?: OverlayConfig
) {
  if (!container) return;
  const oCfg = resolveOverlayConfig(overlayConfig);
  container.innerHTML = "";

  if (!oCfg.inventoryBar.hideLabel) {
    const label = document.createElement("span");
    label.style.cssText = "font-size:11px;color:#888;margin-right:4px";
    label.textContent = oCfg.inventoryBar.labelText;
    container.appendChild(label);
  }

  renderInventoryItems(container, items, selectedItem, onSelect, onLook);
}

// ─── UI wiring ────────────────────────────────────────────────────────────────

// Subscribes to UIState and updates all optional overlay elements.
// Every dom.* access is null-checked — this function is safe to call
// regardless of which optional elements the host page provides.
function wireUI(
  dom: RuntimeDOM,
  engine: Engine,
  verbs: VerbType[],
  defaultPlayerActorId: string,
  overlayConfig?: OverlayConfig,
  assetRoot?: string
) {
  // When the verb bar hosts inventory, permanently hide any standalone
  // #inventory-bar element (including those in adopted/host DOM templates).
  if (dom.verbBar && dom.inventoryBar) {
    dom.inventoryBar.style.display = "none";
  }

  // The message bar sits over the canvas with pointer-events:auto so clicks
  // on the text/hint area land on the DOM element — not on the canvas.
  // Add a click handler here so clicking the narration box also advances.
  if (dom.messageBar) {
    dom.messageBar.addEventListener("click", () => {
      if (engine.dialogueManager.isActive() && engine.dialogueManager.canSkipCurrentLine()) {
        engine.dialogueManager.skipCurrentLine();
      } else if (engine.ui.hasActiveBubble()) {
        engine.ui.dismissBubble();
      } else if (engine.ui.hasActiveMessage()) {
        engine.ui.dismissMessage();
      }
    });
  }

  let msgHintTimer: ReturnType<typeof setTimeout> | null = null;
  let lastMessage = "";
  let lastSkippable = false;

  function refreshUI(state: UIState) {
    const playerItems = engine.inventory
      .getItems(defaultPlayerActorId)
      .map((i) => ({ id: i.id, name: i.name }));

    // Render verb bar with inventory items in the right section.
    // Only pass inventory data when both verbBar and inventoryBar.visible are true.
    const showInvInVerbBar = !!(dom.verbBar && overlayConfig?.inventoryBar?.visible);
    renderVerbBar(
      dom.verbBar,
      verbs,
      state.selectedVerb,
      (v) => engine.ui.setVerb(v),
      overlayConfig,
      assetRoot,
      showInvInVerbBar ? playerItems : undefined,
      showInvInVerbBar ? state.selectedInventoryItem : undefined,
      showInvInVerbBar
        ? (id) => {
            const cur = engine.ui.getSelectedInventoryItem();
            engine.ui.selectInventoryItem(cur === id ? null : id);
          }
        : undefined,
      showInvInVerbBar
        ? (id) => {
            engine.verbSystem
              .dispatch("look", id, "item", defaultPlayerActorId)
              .then((r) => {
                if (r.message) {
                  const actor = engine.roomManager.getActor(defaultPlayerActorId);
                  if (actor) {
                    engine.ui.showSpeechBubble(defaultPlayerActorId, r.message, actor.x, actor.y, 4);
                  } else {
                    engine.ui.showMessage(r.message);
                  }
                }
              });
          }
        : undefined
    );

    // Standalone inventoryBar: only render if there is no verb bar to host it.
    // When verbBar is present, inventory is already rendered in its right section.
    if (!dom.verbBar) {
      renderInventory(
        dom.inventoryBar,
        playerItems,
        state.selectedInventoryItem,
        (id) => {
          const cur = engine.ui.getSelectedInventoryItem();
          engine.ui.selectInventoryItem(cur === id ? null : id);
        },
        (id) => {
          engine.verbSystem
            .dispatch("look", id, "item", defaultPlayerActorId)
            .then((r) => {
              if (r.message) {
                const actor = engine.roomManager.getActor(defaultPlayerActorId);
                if (actor) {
                  engine.ui.showSpeechBubble(defaultPlayerActorId, r.message, actor.x, actor.y, 4);
                } else {
                  engine.ui.showMessage(r.message);
                }
              }
            });
        },
        overlayConfig
      );
    }

    if (dom.hoverLabel) {
      if (state.hoverTarget) {
        dom.hoverLabel.textContent =
          state.selectedVerb + " " + state.hoverTarget;
        dom.hoverLabel.style.display = "block";
      } else {
        dom.hoverLabel.style.display = "none";
      }
    }

    if (dom.roomTitle) {
      if (state.roomTitle) {
        dom.roomTitle.textContent = state.roomTitle;
        dom.roomTitle.style.display = "block";
      } else {
        dom.roomTitle.style.display = "none";
      }
    }

    // Narration box: show/hide and manage click-hint timer
    if (dom.messageBar) {
      const textEl = dom.messageBar.querySelector("[data-msg-text]") as HTMLElement | null;
      const hintEl = dom.messageBar.querySelector("[data-msg-hint]") as HTMLElement | null;

      if (state.message) {
        if (textEl) textEl.textContent = state.message;
        else dom.messageBar.textContent = state.message;
        dom.messageBar.style.display = "block";

        // Schedule hint when message changes OR when skippable transitions false→true.
        // Tracking lastSkippable is necessary because showMessage() sets skippable=false
        // first, then setSkippable(true) arrives as a separate UIState update.
        const skippableJustEnabled = state.skippable && !lastSkippable;
        if (state.message !== lastMessage || skippableJustEnabled || !state.skippable) {
          if (hintEl) hintEl.style.display = "none";
          if (msgHintTimer) { clearTimeout(msgHintTimer); msgHintTimer = null; }
          if (state.skippable) {
            msgHintTimer = setTimeout(() => {
              if (hintEl && dom.messageBar!.style.display !== "none") {
                hintEl.style.display = "block";
              }
            }, 800);
          }
        }
      } else {
        dom.messageBar.style.display = "none";
        if (hintEl) hintEl.style.display = "none";
        if (msgHintTimer) { clearTimeout(msgHintTimer); msgHintTimer = null; }
      }
      lastMessage = state.message ?? "";
      lastSkippable = state.skippable;
    }
  }

  engine.ui.subscribe((s) => refreshUI(s));
  refreshUI(engine.ui.getState());
}

function wireSaveLoadKeys(
  engine: Engine,
  dom: RuntimeDOM,
  mount: HTMLElement,
  mode: "web" | "desktop"
): () => void {
  const doSave = () => {
    engine.quickSave();
    engine.ui.showMessage("Game saved.", 2);
  };
  const doLoad = () => {
    engine.quickLoad();
    engine.ui.showMessage("Game loaded.", 2);
  };

  let keyHandler: ((e: KeyboardEvent) => void) | null = null;
  if (mode === "web") {
    keyHandler = (e: KeyboardEvent) => {
      if (e.key === "F5") { e.preventDefault(); doSave(); }
      if (e.key === "F9") { e.preventDefault(); doLoad(); }
    };
    document.addEventListener("keydown", keyHandler);
  }

  const btnSave = dom.saveLoadBar?.querySelector("#btn-save") as HTMLElement | null ?? null;
  const btnLoad = dom.saveLoadBar?.querySelector("#btn-load") as HTMLElement | null ?? null;
  if (btnSave) btnSave.addEventListener("click", doSave);
  if (btnLoad) btnLoad.addEventListener("click", doLoad);

  return () => {
    if (keyHandler) document.removeEventListener("keydown", keyHandler);
    if (btnSave) btnSave.removeEventListener("click", doSave);
    if (btnLoad) btnLoad.removeEventListener("click", doLoad);
  };
}

// ─── Boot helpers ─────────────────────────────────────────────────────────────

function resolveDataFetcher(config: RuntimeBootConfig): DataFetcher {
  if (config.dataFetcher) {
    return config.dataFetcher;
  }
  const root = config.packageRoot ?? "./";
  if (config.mode === "desktop") {
    return desktopFetcher(root);
  }
  return defaultWebFetcher(root);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── bootRuntime: public entry point ─────────────────────────────────────────

export async function bootRuntime(
  config: RuntimeBootConfig
): Promise<RuntimeInstance> {
  const { manifest, mode, mount, debug } = config;
  const packageRoot = config.packageRoot ?? "./";

  if (debug) {
    console.log("[Runtime] bootRuntime called", {
      packageRoot,
      mode,
      gameId: manifest?.gameId ?? config.preloadedConfig?.id,
      title: manifest?.title ?? config.preloadedConfig?.title,
    });
  }

  const display = manifest?.display ?? config.preloadedConfig?.display;
  const overlayConf = manifest?.overlayConfig ?? config.preloadedConfig?.overlayConfig;

  // Prefer the host page's existing DOM (exported player, editor preview, custom shell).
  // If the required elements (#canvas-wrap + #game-canvas) are missing, build the
  // full fallback shell instead (required viewport + optional built-in overlay bars).
  const adopted = adoptExistingDOM(mount);
  const dom = adopted ?? createRuntimeDOM(mount, display, overlayConf);

  // Always suppress the browser context menu on the verb bar, regardless of
  // whether the DOM was adopted (exported player) or built by createRuntimeDOM.
  if (dom.verbBar) {
    dom.verbBar.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  const cfg = resolveDisplayConfig(display);
  dom.canvas.width = cfg.baseWidth;
  dom.canvas.height = cfg.baseHeight;
  applyPixelPerfectCSS(dom.canvas, cfg.pixelPerfect);

  mount.style.background = cfg.backgroundColor;

  const scalingContainer: HTMLElement =
    config.scalingContainer ??
    (mount.querySelector("#game-container") as HTMLElement | null) ??
    mount;

  if (adopted) {
    dom.canvasWrap.style.width = `${cfg.baseWidth}px`;
    dom.canvasWrap.style.height = `${cfg.baseHeight}px`;
    dom.canvasWrap.style.background = cfg.backgroundColor;
    dom.canvas.style.width = "100%";
    dom.canvas.style.height = "100%";

    if (cfg.viewportAlignment === "top-left") {
      scalingContainer.style.alignItems = "flex-start";
      scalingContainer.style.justifyContent = "flex-start";
    } else {
      scalingContainer.style.alignItems = "center";
      scalingContainer.style.justifyContent = "center";
    }
  }

  let resizeObserverCleanup: (() => void) | null = null;
  if (cfg.scalingMode !== "none") {
    const observeTarget = scalingContainer;

    const ro = createViewportResizeObserver(
      observeTarget,
      dom.canvas,
      dom.canvasWrap,
      cfg,
      (vp) => {
        if (dom.overlay) {
          dom.overlay.style.width = `${vp.canvasWidth}px`;
          dom.overlay.style.height = `${vp.canvasHeight}px`;
          dom.overlay.style.transform = `scale(${vp.scale})`;
          dom.overlay.style.transformOrigin = "top left";
        }
      }
    );
    resizeObserverCleanup = () => ro.disconnect();
  }

  let gameConfig: GameConfig;
  let scripts: Record<string, ScriptHandlerFn>;

  const setStatus = (text: string) => {
    if (config.onStatusUpdate) {
      config.onStatusUpdate(text);
    } else if (dom.messageBar) {
      const textEl = dom.messageBar.querySelector("[data-msg-text]") as HTMLElement | null;
      if (textEl) {
        textEl.textContent = text;
        dom.messageBar.style.display = text ? "block" : "none";
      } else {
        dom.messageBar.textContent = text;
      }
    }
  };

  if (config.preloadedConfig && config.preloadedScripts) {
    gameConfig = config.preloadedConfig;
    scripts = config.preloadedScripts;
    setStatus("Starting engine...");
  } else if (manifest) {
    setStatus("Loading game data...");

    const fetcher = resolveDataFetcher(config);

    let gameData;
    try {
      gameData = await loadGameData(manifest, fetcher);
    } catch (e) {
      setStatus("Error: Failed to load game data.");
      console.error("[Runtime] Data load error:", e);
      throw e;
    }

    gameConfig = gameData.config;
    scripts = gameData.scripts;

    const normalizedRoot = packageRoot.endsWith("/") ? packageRoot : packageRoot + "/";
    const assetBase = manifest.assetBasePath || "";
    const normalizedAssetBase = assetBase.endsWith("/") || assetBase === "" ? assetBase : assetBase + "/";
    gameConfig.assetRoot = normalizedRoot + normalizedAssetBase;
  } else {
    setStatus("Error: No game data provided.");
    throw new Error("bootRuntime requires either manifest or preloadedConfig/preloadedScripts.");
  }

  if (!gameConfig.startingRoom) {
    setStatus("Error: No starting room configured.");
    throw new Error("No starting room configured in manifest.");
  }

  setStatus("Starting engine...");

  let engine: Engine;
  try {
    engine = new Engine({
      canvas: dom.canvas,
      config: gameConfig,
      scripts,
      storageProvider: config.storageProvider,
    });
    await engine.init({ deferActivation: true });
    engine.start();
  } catch (e) {
    setStatus("Error starting game: " + String(e));
    console.error("[Runtime] Boot error:", e);
    throw e;
  }

  setStatus("");

  const verbs = gameConfig.verbs || ["walk", "look", "use", "pickup", "talk"];
  wireUI(dom, engine, verbs, gameConfig.defaultPlayerActorId, overlayConf, gameConfig.assetRoot);

  const removeSaveLoadKeys = wireSaveLoadKeys(engine, dom, mount, mode);

  await engine.activateCurrentRoom();

  if (debug) {
    console.log("[Runtime] Game running:", gameConfig.title, "mode:", mode);
  }

  return {
    engine,
    shutdown: () => {
      engine.stop();
      resizeObserverCleanup?.();
      removeSaveLoadKeys();
      mount.innerHTML = "";
      if (debug) {
        console.log("[Runtime] Shut down.");
      }
    },
  };
}
