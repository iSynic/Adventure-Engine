import type { EditorProject } from "../types";
import { resolveDisplayConfig } from "../../shared/displayConfig";
import { resolveOverlayConfig } from "../../shared/overlayConfig";

export interface ExportSettings {
  gameTitle: string;
  authorName: string;
  mode: "inline" | "multifile";
}

export function generatePlayerHTML(
  project: EditorProject,
  settings: ExportSettings,
  assetFileMap: Map<string, string> | null,
  inlineMap: Map<string, string> | null,
  playerRuntimeJS: string
): string {
  const { config, scriptBodies } = buildExportConfig(project, assetFileMap, inlineMap);
  const gameData = { config, scriptBodies };
  const safeGameData = safeJsonForScript(JSON.stringify(gameData));

  const resolved = resolveDisplayConfig(project.display);
  const baseW = resolved.baseWidth;
  const baseH = resolved.baseHeight;
  const bgColor = resolved.backgroundColor;
  const pixelCSS = resolved.pixelPerfect ? "image-rendering:pixelated;" : "";

  const oCfg = resolveOverlayConfig(project.overlayConfig);
  const hasVerbBar      = oCfg.verbBar.visible;
  const hasInventoryBar = oCfg.inventoryBar.visible;
  const hasMessageBar   = oCfg.messageBar.visible;
  const hasSaveLoadBar  = oCfg.saveLoadBar.visible;
  const hasHoverLabel   = oCfg.hoverLabel.visible;
  const hasRoomTitle    = oCfg.roomTitle.visible;

  // Verb bar dock layout
  const vbDock = oCfg.verbBar.dock;
  const vbSize = oCfg.verbBar.size;
  const vbMode = oCfg.verbBar.visibilityMode;
  const vbIsVertical = vbDock === "left" || vbDock === "right";
  const VB_COLLAPSED = 6;

  const hasBars = hasInventoryBar || hasMessageBar || hasSaveLoadBar; // verb bar is absolute, not region-based
  const hasTopBars = (hasMessageBar && oCfg.messageBar.placement === "top")
    || (hasInventoryBar && oCfg.inventoryBar.placement === "top");
  const hasBottomBars = (hasMessageBar && oCfg.messageBar.placement !== "top")
    || (hasInventoryBar && oCfg.inventoryBar.placement !== "top")
    || hasSaveLoadBar;

  const overlayFlexCSS = hasBars
    ? (hasTopBars && hasBottomBars
        ? "display:flex;flex-direction:column;justify-content:space-between;"
        : "display:flex;flex-direction:column;")
    : "";

  // Verb bar CSS — absolute positioned on the overlay
  let vbPosCSS = "";
  if      (vbDock === "top")    vbPosCSS = `top:0;left:0;right:0;height:${vbSize}px;`;
  else if (vbDock === "bottom") vbPosCSS = `bottom:0;left:0;right:0;height:${vbSize}px;`;
  else if (vbDock === "left")   vbPosCSS = `top:0;bottom:0;left:0;width:${vbSize}px;`;
  else                          vbPosCSS = `top:0;bottom:0;right:0;width:${vbSize}px;`;

  let vbVisCSS = "";
  let vbHoverCSS = "";
  if (vbMode === "hover") {
    vbVisCSS = "opacity:0;transition:opacity 0.2s;";
    vbHoverCSS = "#verb-bar:hover{opacity:1}";
  } else if (vbMode === "collapsed") {
    if (vbIsVertical) {
      vbVisCSS = `width:${VB_COLLAPSED}px;transition:width 0.15s ease;`;
      vbHoverCSS = `#verb-bar:hover{width:${vbSize}px}`;
    } else {
      vbVisCSS = `height:${VB_COLLAPSED}px;transition:height 0.15s ease;`;
      vbHoverCSS = `#verb-bar:hover{height:${vbSize}px}`;
    }
  }

  // When verbBar is present, inventory is rendered inside it (right section).
  // Standalone #inventory-bar is hidden in that case.
  const invInVerbBar = hasVerbBar && hasInventoryBar;

  const barCSS = [
    // Message bar: always an absolute top-centre in-canvas overlay (not a region bar)
    hasMessageBar   ? `#message-bar{position:absolute;top:36px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#e0e0e0;font-size:14px;padding:6px 14px;border-radius:4px;text-align:center;pointer-events:auto;max-width:80%;white-space:pre-wrap;word-break:break-word;display:none}` : "",
    hasMessageBar   ? `#message-bar [data-msg-hint]{display:none;font-size:11px;color:#aaa;margin-top:2px;text-align:center}` : "",
    // Verb bar: absolute positioned, justify-content:space-between for verbs (left) + inventory (right)
    hasVerbBar      ? `#verb-bar{position:absolute;${vbPosCSS}display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;background:rgba(26,26,46,0.85);pointer-events:auto;flex-direction:${vbIsVertical ? "column" : "row"};overflow:hidden;${vbVisCSS}}` : "",
    hasVerbBar      ? `#verb-bar button{background:none;border:1px solid #444;color:#ccc;padding:4px 10px;cursor:pointer;font-size:12px}` : "",
    hasVerbBar      ? `#verb-bar button:hover{background:#333}` : "",
    hasVerbBar      ? `#verb-bar button.active{background:#3a3a5e;color:#fff;border-color:#666}` : "",
    hasVerbBar && vbHoverCSS ? vbHoverCSS : "",
    // Inventory bar: hidden when verb bar is present (inventory rendered inside verb bar instead)
    hasInventoryBar && !invInVerbBar ? `#inventory-bar{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:2px 6px;background:rgba(26,26,46,0.85);pointer-events:auto}` : "",
    hasInventoryBar && !invInVerbBar ? `#inventory-bar .inv-label{font-size:11px;color:#888;margin-right:4px}` : "",
    hasInventoryBar && invInVerbBar  ? `#inventory-bar{display:none}` : "",
    hasInventoryBar ? `.inv-item{background:#2a2a3e;border:1px solid #555;color:#ddd;padding:3px 8px;cursor:pointer;font-size:11px}` : "",
    hasInventoryBar ? `.inv-item:hover{background:#3a3a4e}` : "",
    hasInventoryBar ? `.inv-item.active{background:#4a4a6e;border-color:#88f}` : "",
    hasHoverLabel   ? `#hover-label{position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:4px 12px;font-size:13px;border-radius:4px;pointer-events:none;display:none;z-index:10}` : "",
    hasRoomTitle    ? `#room-title{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 32px;font-size:22px;border-radius:6px;pointer-events:none;display:none;z-index:10}` : "",
    hasSaveLoadBar  ? `#save-load-bar{position:absolute;top:4px;right:4px;display:flex;gap:6px;pointer-events:auto}` : "",
    hasSaveLoadBar  ? `.sl-btn{background:#2a2a3e;border:1px solid #555;color:#ccc;padding:3px 10px;cursor:pointer;font-size:11px;border-radius:3px}` : "",
    hasSaveLoadBar  ? `.sl-btn:hover{background:#3a3a5e}` : "",
    !invInVerbBar && (hasInventoryBar || hasSaveLoadBar) ? `#overlay .top-region{display:flex;flex-direction:column;gap:0;pointer-events:none}` : "",
    !invInVerbBar && (hasInventoryBar || hasSaveLoadBar) ? `#overlay .bottom-region{display:flex;flex-direction:column;gap:0;pointer-events:none;margin-top:auto}` : "",
  ].filter(Boolean).join("\n");

  const invLabel = !oCfg.inventoryBar.hideLabel
    ? `<span class="inv-label">${escapeHtml(oCfg.inventoryBar.labelText)}</span>`
    : "";

  // Verb bar is absolutely positioned directly in the overlay — not inside a region
  const verbBarHTML = hasVerbBar ? `<div id="verb-bar"></div>` : "";

  // Message bar: absolutely positioned in-canvas overlay — never in a region
  const messagBarHTML = hasMessageBar
    ? `<div id="message-bar"><span data-msg-text></span><span data-msg-hint>&#9654; click to continue</span></div>`
    : "";

  // Save/load bar: absolute top-right — not in a region
  const saveLoadHTML = hasSaveLoadBar
    ? `<div id="save-load-bar"><button class="sl-btn" id="btn-save">Save (F5)</button><button class="sl-btn" id="btn-load">Load (F9)</button></div>`
    : "";

  // Inventory in region only when there's no verb bar to host it
  const bottomRegionBars: string[] = [];
  if (hasInventoryBar && !invInVerbBar && oCfg.inventoryBar.placement !== "top") bottomRegionBars.push(`<div id="inventory-bar">${invLabel}</div>`);

  const topRegionBars: string[] = [];
  if (hasInventoryBar && !invInVerbBar && oCfg.inventoryBar.placement === "top") topRegionBars.push(`<div id="inventory-bar">${invLabel}</div>`);

  // When inventory is in the verb bar, still emit a hidden #inventory-bar for wireUI to find
  const hiddenInvBarHTML = invInVerbBar ? `<div id="inventory-bar" style="display:none"></div>` : "";

  const topRegionHTML    = topRegionBars.length    ? `<div class="top-region">${topRegionBars.join("")}</div>`    : "";
  const bottomRegionHTML = bottomRegionBars.length ? `<div class="bottom-region">${bottomRegionBars.join("")}</div>` : "";
  const hoverLabelHTML   = hasHoverLabel ? `<div id="hover-label"></div>` : "";
  const roomTitleHTML    = hasRoomTitle  ? `<div id="room-title"></div>`  : "";

  const overlayInner = [messagBarHTML, topRegionHTML, bottomRegionHTML, verbBarHTML, hiddenInvBarHTML, saveLoadHTML, hoverLabelHTML, roomTitleHTML].filter(Boolean).join("\n");
  const overlayHTML = overlayInner
    ? `<div id="overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden">\n${overlayInner}\n</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(settings.gameTitle)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{background:${bgColor};color:#ddd;font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center}
#game-header{width:100%;padding:8px 10px;display:flex;justify-content:space-between;align-items:center}
#game-header h1{font-size:16px;color:#fff}
#game-header .author{font-size:12px;color:#888}
#game-container{flex:1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;min-height:0}
#canvas-wrap{position:relative;width:${baseW}px;height:${baseH}px;background:${bgColor}}
canvas{display:block;width:100%;height:100%;cursor:crosshair;${pixelCSS}}
${barCSS}
</style>
</head>
<body>
<div id="game-header">
<h1>${escapeHtml(settings.gameTitle)}</h1>
<span class="author">${escapeHtml(settings.authorName ? "by " + settings.authorName : "")}</span>
</div>
<div id="game-container">
<div id="canvas-wrap">
<canvas id="game-canvas" width="${baseW}" height="${baseH}"></canvas>
${overlayHTML}
</div>
</div>
<script>window.__GAME_DATA__ = JSON.parse(${safeGameData});</script>
<script>${playerRuntimeJS}</script>
</body>
</html>`;
}

function buildExportConfig(
  project: EditorProject,
  assetFileMap: Map<string, string> | null,
  inlineMap: Map<string, string> | null
) {
  const assetLookup = new Map(project.assets.map((a) => [a.id, a.dataUrl]));

  function resolveAsset(pathOrId: string | undefined): string {
    if (!pathOrId) return "";
    if (assetLookup.has(pathOrId)) {
      const dataUrl = assetLookup.get(pathOrId)!;
      if (assetFileMap && assetFileMap.has(dataUrl)) {
        return "assets/" + assetFileMap.get(dataUrl)!;
      }
      return dataUrl;
    }
    if (assetFileMap && assetFileMap.has(pathOrId)) {
      return "assets/" + assetFileMap.get(pathOrId)!;
    }
    if (inlineMap && inlineMap.has(pathOrId)) {
      return inlineMap.get(pathOrId)!;
    }
    return pathOrId;
  }

  const config = {
    id: project.id,
    title: project.title,
    startingRoom: project.startingRoom,
    assetRoot: "",
    defaultPlayerActorId: project.defaultPlayerActorId,
    defaultPlayerPosition: project.defaultPlayerPosition,
    startingItems: project.startingItems,
    verbs: project.verbs,
    uiSettings: project.uiSettings,
    rooms: project.rooms.map((room) => ({
      ...room,
      backgroundPath: resolveAsset(room.backgroundPath),
      maskPath: room.maskPath ? resolveAsset(room.maskPath) : undefined,
    })),
    actors: project.actors.map((actor) => ({
      ...actor,
      spritePath: resolveAsset(actor.spritePath),
    })),
    objects: project.objects.map((obj) => ({
      ...obj,
      spritePath: resolveAsset(obj.spritePath),
    })),
    items: project.items.map((item) => ({
      ...item,
      iconPath: resolveAsset(item.iconPath),
    })),
    display: project.display,
    overlayConfig: resolveOverlayConfigForExport(project, resolveAsset),
  };

  const scriptBodies: Record<string, string> = {};
  for (const script of project.scripts) {
    scriptBodies[script.name] = script.body;
  }

  return { config, scriptBodies };
}

function resolveOverlayConfigForExport(
  project: EditorProject,
  resolveAsset: (p: string | undefined) => string
): EditorProject["overlayConfig"] | undefined {
  if (!project.overlayConfig) return undefined;
  const oc = { ...project.overlayConfig };
  if (oc.verbBar?.buttons) {
    oc.verbBar = {
      ...oc.verbBar,
      buttons: oc.verbBar.buttons.map((b) => ({
        ...b,
        imagePath: b.imagePath ? resolveAsset(b.imagePath) : undefined,
      })),
    };
  }
  return oc;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeJsonForScript(json: string): string {
  const escaped = json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `'${escaped.replace(/'/g, "\\'")}'`;
}
