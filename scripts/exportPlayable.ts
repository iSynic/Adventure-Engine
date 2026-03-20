import fs from "fs";
import path from "path";
import type { EditorProject } from "../src/editor/types";
import type {
  ExportManifest,
  ExportedScript,
  ExportedSettings,
} from "../src/shared/exportSchema";
import { EXPORT_SCHEMA_VERSION } from "../src/shared/exportSchema";
import { validateProject, validateManifestCompleteness } from "../src/shared/validateProject";

const ROOT = path.resolve(import.meta.dirname, "..");

function usage(): never {
  console.error("Usage: pnpm run export:playable -- <project.advproject.json> [options]");
  console.error("");
  console.error("  Reads a saved project file (.advproject.json) and writes a");
  console.error("  self-contained playable build to dist/playable/<slug>/.");
  console.error("  The output folder can be served with any static file server.");
  console.error("");
  console.error("  Options:");
  console.error("    --author <name>        Author name for the manifest");
  console.error("    --description <text>   Game description for the manifest");
  console.error("    --icon <path>          Icon path for the manifest");
  console.error("");
  console.error("  The project file is exported from the editor via File > Save As JSON.");
  process.exit(1);
}

interface CLIOptions {
  projectPath: string;
  author?: string;
  description?: string;
  icon?: string;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  if (args.length === 0) usage();

  let projectPath = "";
  let author: string | undefined;
  let description: string | undefined;
  let icon: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--author" && i + 1 < args.length) {
      author = args[++i];
    } else if (arg === "--description" && i + 1 < args.length) {
      description = args[++i];
    } else if (arg === "--icon" && i + 1 < args.length) {
      icon = args[++i];
    } else if (!arg.startsWith("--") && !projectPath) {
      projectPath = arg;
    }
  }

  if (!projectPath) usage();
  return { projectPath, author, description, icon };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function makeUnique(name: string, used: Set<string>): string {
  if (!used.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  while (used.has(base + "_" + i + ext)) i++;
  return base + "_" + i + ext;
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif",
    "image/webp": "webp", "image/svg+xml": "svg",
    "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mp3": "mp3",
  };
  return map[mime] || "bin";
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; ext: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { buffer: Buffer.from(match[2], "base64"), ext: mimeToExt(match[1]) };
}

function isDataUrl(p: string): boolean { return p.startsWith("data:"); }

function extFromPath(p: string): string {
  const match = p.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : "bin";
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generatePlayableHTML(title: string, runtimeJSPath: string, baseW = 640, baseH = 360, bgColor = "#000", pixelPerfect = true): string {
  const pixelCSS = pixelPerfect ? "image-rendering:pixelated;" : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{background:${bgColor};color:#ddd;font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center}
#game-header{width:100%;padding:8px 10px;display:flex;justify-content:space-between;align-items:center}
#game-header h1{font-size:16px;color:#fff}
#loading-status{font-size:12px;color:#888}
#game-container{flex:1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;min-height:0}
#canvas-wrap{position:relative;width:${baseW}px;height:${baseH}px;background:${bgColor}}
canvas{display:block;width:100%;height:100%;cursor:crosshair;${pixelCSS}}
#overlay{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden}
#message-bar{position:absolute;top:36px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#e0e0e0;font-size:14px;padding:6px 14px;border-radius:4px;text-align:center;pointer-events:auto;max-width:80%;white-space:pre-wrap;word-break:break-word;display:none}
#message-bar [data-msg-hint]{display:none;font-size:11px;color:#aaa;margin-top:2px;text-align:center}
#verb-bar{position:absolute;bottom:0;left:0;right:0;height:36px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;background:rgba(26,26,46,0.85);pointer-events:auto}
#verb-bar button{background:none;border:1px solid #444;color:#ccc;padding:4px 10px;cursor:pointer;font-size:12px}
#verb-bar button:hover{background:#333}
#verb-bar button.active{background:#3a3a5e;color:#fff;border-color:#666}
#inventory-bar{display:none}
.inv-item{background:#2a2a3e;border:1px solid #555;color:#ddd;padding:3px 8px;cursor:pointer;font-size:11px}
.inv-item:hover{background:#3a3a4e}
.inv-item.active{background:#4a4a6e;border-color:#88f}
#hover-label{position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:4px 12px;font-size:13px;border-radius:4px;pointer-events:none;display:none;z-index:10}
#room-title{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 32px;font-size:22px;border-radius:6px;pointer-events:none;display:none;z-index:10}
#save-load-bar{position:absolute;top:4px;right:4px;display:flex;gap:6px;pointer-events:auto}
.sl-btn{background:#2a2a3e;border:1px solid #555;color:#ccc;padding:3px 10px;cursor:pointer;font-size:11px;border-radius:3px}
.sl-btn:hover{background:#3a3a5e}
</style>
</head>
<body>
<div id="game-header">
<h1>${escapeHtml(title)}</h1>
<span id="loading-status"></span>
</div>
<div id="game-container">
<div id="canvas-wrap">
<canvas id="game-canvas" width="${baseW}" height="${baseH}"></canvas>
<div id="overlay">
<div id="message-bar"><span data-msg-text></span><span data-msg-hint>&#9654; click to continue</span></div>
<div id="verb-bar"></div>
<div id="inventory-bar"></div>
<div id="save-load-bar">
<button class="sl-btn" id="btn-save">Save (F5)</button>
<button class="sl-btn" id="btn-load">Load (F9)</button>
</div>
<div id="hover-label"></div>
<div id="room-title"></div>
</div>
</div>
</div>
<script src="${runtimeJSPath}"></script>
</body>
</html>`;
}

async function main() {
  const opts = parseArgs();

  const absProjectPath = path.resolve(opts.projectPath);
  if (!fs.existsSync(absProjectPath)) {
    console.error(`Error: File not found: ${absProjectPath}`);
    process.exit(1);
  }

  console.log(`Reading project: ${absProjectPath}`);
  const raw = fs.readFileSync(absProjectPath, "utf-8");
  const project: EditorProject = JSON.parse(raw);

  console.log(`Project: "${project.title}" (${project.rooms.length} rooms, ${project.actors.length} actors, ${project.scripts.length} scripts)`);

  const validation = validateProject(project);
  for (const err of validation.errors) {
    const prefix = err.severity === "error" ? "\x1b[31mERROR\x1b[0m" : "\x1b[33mWARN\x1b[0m";
    console.log(`  ${prefix}: ${err.message}`);
  }
  if (!validation.valid) {
    console.error("\nValidation failed. Fix errors before exporting.");
    process.exit(1);
  }

  const runtimeSrc = path.join(ROOT, "public", "playable-runtime", "playable.js");
  if (!fs.existsSync(runtimeSrc)) {
    console.error("Error: Runtime not built. Run 'pnpm run build:runtime' first.");
    process.exit(1);
  }

  const slug = sanitizeFileName(project.title || project.id).toLowerCase();
  const outDir = path.join(ROOT, "dist", "playable", slug);

  console.log(`\nOutput: ${outDir}`);

  fs.mkdirSync(path.join(outDir, "data"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "assets"), { recursive: true });

  fs.copyFileSync(runtimeSrc, path.join(outDir, "playable.js"));

  const assetMap = new Map(project.assets.map((a) => [a.id, a.dataUrl]));
  const assetFileMap = new Map<string, string>();
  const usedNames = new Set<string>();
  const unresolvedAssets: string[] = [];

  function writeAsset(resolved: string, hintName: string): string | null {
    if (assetFileMap.has(resolved)) return assetFileMap.get(resolved)!;

    if (isDataUrl(resolved)) {
      const result = dataUrlToBuffer(resolved);
      if (!result) {
        unresolvedAssets.push(resolved.substring(0, 60) + "...");
        return null;
      }
      const baseName = sanitizeFileName(hintName.replace(/\.[^.]+$/, ""));
      const fileName = makeUnique(baseName + "." + result.ext, usedNames);
      usedNames.add(fileName);
      fs.writeFileSync(path.join(outDir, "assets", fileName), result.buffer);
      assetFileMap.set(resolved, fileName);
      return fileName;
    }

    const stripped = resolved.replace(/^\/+/, "");
    const localPath = path.join(ROOT, "public", stripped);
    const realLocal = path.resolve(localPath);
    const publicRoot = path.resolve(ROOT, "public");
    if (!realLocal.startsWith(publicRoot + path.sep) && realLocal !== publicRoot) {
      unresolvedAssets.push(resolved + " (outside public/)");
      return null;
    }
    if (fs.existsSync(localPath)) {
      const ext = extFromPath(resolved);
      const baseName = sanitizeFileName(
        path.basename(resolved).replace(/\.[^.]+$/, "") || "asset"
      );
      const fileName = makeUnique(baseName + "." + ext, usedNames);
      usedNames.add(fileName);
      fs.copyFileSync(localPath, path.join(outDir, "assets", fileName));
      assetFileMap.set(resolved, fileName);
      return fileName;
    }

    unresolvedAssets.push(resolved);
    return null;
  }

  for (const asset of project.assets) {
    if (asset.dataUrl.startsWith("data:")) {
      writeAsset(asset.dataUrl, asset.name);
    }
  }

  function resolveAndWrite(pathOrId: string | undefined, hint?: string): string {
    if (!pathOrId) return "";
    const dataUrl = assetMap.get(pathOrId);
    const resolved = dataUrl || pathOrId;
    const fileName = writeAsset(resolved, hint || pathOrId);
    if (fileName) return "assets/" + fileName;
    if (assetFileMap.has(resolved)) return "assets/" + assetFileMap.get(resolved)!;
    return resolved;
  }

  const exportedRooms = project.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    backgroundPath: resolveAndWrite(room.backgroundPath, room.name + "_bg"),
    maskPath: room.maskPath ? resolveAndWrite(room.maskPath, room.name + "_mask") : undefined,
    width: room.width,
    height: room.height,
    parallaxLayers: room.parallaxLayers?.map((layer) => ({
      imagePath: resolveAndWrite(layer.imagePath, "parallax"),
      scrollFactor: layer.scrollFactor,
    })),
    walkboxes: room.walkboxes.map((wb) => ({
      id: wb.id,
      polygon: wb.polygon,
      adjacentIds: wb.adjacentIds,
      scale: wb.scale,
      speedModifier: wb.speedModifier,
    })),
    exits: room.exits,
    objectIds: room.objectIds,
    hotspots: room.hotspots?.map((hs) => ({
      id: hs.id,
      name: hs.name,
      roomId: hs.roomId,
      bounds: hs.bounds,
      polygon: hs.polygon,
      description: hs.description,
      verbHandlers: hs.verbHandlers,
      zLayer: hs.zLayer,
      standPoint: hs.standPoint,
      approachDirection: hs.approachDirection,
      visibilityCondition: hs.visibilityCondition,
      interactionCondition: hs.interactionCondition,
    })),
    actorIds: room.actorIds,
    spawnPoints: room.spawnPoints,
    ambientAudioPath: room.ambientAudioPath ? resolveAndWrite(room.ambientAudioPath, room.name + "_audio") : undefined,
    onEnter: room.onEnter,
    onExit: room.onExit,
    onUpdate: room.onUpdate,
    transitionEffect: room.transitionEffect,
  }));

  const exportedActors = project.actors.map((actor) => ({
    id: actor.id,
    name: actor.name,
    defaultRoomId: actor.defaultRoomId,
    position: actor.position,
    facing: actor.facing,
    visible: actor.visible,
    scale: actor.scale,
    movementSpeed: actor.movementSpeed,
    spritePath: resolveAndWrite(actor.spritePath, actor.name + "_sprite"),
    spriteWidth: actor.spriteWidth,
    spriteHeight: actor.spriteHeight,
    animations: actor.animations
      ? Object.fromEntries(
          Object.entries(actor.animations).map(([dir, states]) => [
            dir,
            Object.fromEntries(
              Object.entries(states).map(([state, anim]) => [
                state,
                anim
                  ? {
                      id: anim.id,
                      frames: anim.frames.map((frame) => ({
                        imagePath: resolveAndWrite(frame.imagePath, actor.name + "_anim"),
                        duration: frame.duration,
                      })),
                      loop: anim.loop,
                    }
                  : anim,
              ])
            ),
          ])
        )
      : undefined,
    isPlayer: actor.isPlayer,
    verbHandlers: actor.verbHandlers,
    dialogueId: actor.dialogueId,
    standPoint: actor.standPoint,
    approachDirection: actor.approachDirection,
  }));

  const exportedObjects = project.objects.map((obj) => ({
    id: obj.id,
    name: obj.name,
    roomId: obj.roomId,
    position: obj.position,
    spritePath: resolveAndWrite(obj.spritePath, obj.name + "_sprite"),
    spriteWidth: obj.spriteWidth,
    spriteHeight: obj.spriteHeight,
    bounds: obj.bounds,
    visible: obj.visible,
    enabled: obj.enabled,
    pickupable: obj.pickupable,
    description: obj.description,
    state: obj.state,
    stateSprites: obj.stateSprites?.map((entry) => ({
      stateKey: entry.stateKey,
      stateValue: entry.stateValue,
      spritePath: resolveAndWrite(entry.spritePath, obj.name + "_state"),
      bounds: entry.bounds,
    })),
    verbHandlers: obj.verbHandlers,
    zOffset: obj.zOffset,
    zLayer: obj.zLayer,
    interactionAnimation: obj.interactionAnimation,
    standPoint: obj.standPoint,
    approachDirection: obj.approachDirection,
    visibilityCondition: obj.visibilityCondition,
    interactionCondition: obj.interactionCondition,
  }));

  const exportedItems = project.items.map((item) => ({
    id: item.id,
    name: item.name,
    iconPath: resolveAndWrite(item.iconPath, item.name + "_icon"),
    description: item.description,
    ownerId: item.ownerId,
    verbHandlers: item.verbHandlers,
  }));

  const exportedScripts: ExportedScript[] = project.scripts.map((s) => ({
    name: s.name,
    body: s.body,
    ...(s.kind ? { kind: s.kind } : {}),
    ...(s.steps ? { steps: s.steps } : {}),
  }));

  const verbCursors = project.verbCursors
    ? Object.fromEntries(
        Object.entries(project.verbCursors)
          .map(([verb, assetId]) => [verb, resolveAndWrite(assetId, "cursor_" + verb)])
          .filter(([, url]) => url)
      )
    : undefined;

  const exportedSettings: ExportedSettings = {
    verbs: project.verbs,
    uiSettings: project.uiSettings,
    verbCursors,
    defaultPlayerPosition: project.defaultPlayerPosition,
    startingItems: project.startingItems,
    ...(project.globalFallbackScriptId ? { globalFallbackScriptId: project.globalFallbackScriptId } : {}),
    ...(project.display ? { display: project.display } : {}),
    ...(project.overlayConfig ? { overlayConfig: project.overlayConfig } : {}),
  };

  if (unresolvedAssets.length > 0) {
    console.error(`\n\x1b[31mExport failed: ${unresolvedAssets.length} asset(s) could not be resolved:\x1b[0m`);
    for (const asset of unresolvedAssets) {
      console.error(`  - ${asset}`);
    }
    fs.rmSync(outDir, { recursive: true, force: true });
    process.exit(1);
  }

  fs.writeFileSync(path.join(outDir, "data", "rooms.json"), JSON.stringify(exportedRooms, null, 2));
  fs.writeFileSync(path.join(outDir, "data", "actors.json"), JSON.stringify(exportedActors, null, 2));
  fs.writeFileSync(path.join(outDir, "data", "objects.json"), JSON.stringify(exportedObjects, null, 2));
  fs.writeFileSync(path.join(outDir, "data", "inventory.json"), JSON.stringify(exportedItems, null, 2));
  fs.writeFileSync(path.join(outDir, "data", "scripts.json"), JSON.stringify(exportedScripts, null, 2));
  const exportedDialogueTrees = (project.dialogueTrees || []).map((tree) => ({
    id: tree.id,
    name: tree.name,
    actorId: tree.actorId,
    startNodeId: tree.startNodeId,
    nodes: tree.nodes.map((node) => ({
      id: node.id,
      speaker: node.speaker,
      text: node.text,
      branches: node.branches,
      actions: node.actions,
      condition: node.condition,
    })),
  }));
  fs.writeFileSync(path.join(outDir, "data", "dialogue.json"), JSON.stringify(exportedDialogueTrees, null, 2));
  fs.writeFileSync(path.join(outDir, "data", "project.json"), JSON.stringify(exportedSettings, null, 2));

  const manifest: ExportManifest = {
    gameId: project.id,
    title: project.title,
    version: "1.0.0",
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    startRoomId: project.startingRoom,
    playerActorId: project.defaultPlayerActorId,
    assetBasePath: "assets/",
    data: {
      rooms: "data/rooms.json",
      actors: "data/actors.json",
      objects: "data/objects.json",
      inventory: "data/inventory.json",
      scripts: "data/scripts.json",
      dialogue: "data/dialogue.json",
      project: "data/project.json",
    },
    ...(opts.author?.trim() ? { author: opts.author.trim() } : {}),
    ...(opts.description?.trim() ? { description: opts.description.trim() } : {}),
    ...(opts.icon?.trim() ? { icon: opts.icon.trim() } : {}),
    ...(project.display ? { display: project.display } : {
      display: {
        baseWidth: project.rooms[0]?.width ?? 640,
        baseHeight: project.rooms[0]?.height ?? 360,
      },
    }),
    ...(project.overlayConfig ? { overlayConfig: project.overlayConfig } : {}),
  };

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const dispCfg = manifest.display;
  fs.writeFileSync(path.join(outDir, "index.html"), generatePlayableHTML(
    project.title,
    "playable.js",
    dispCfg?.baseWidth ?? 640,
    dispCfg?.baseHeight ?? 360,
    dispCfg?.backgroundColor ?? "#000",
    dispCfg?.pixelPerfect ?? true
  ));

  const filePaths = new Set<string>();
  function collectFiles(dir: string, prefix: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? prefix + "/" + entry.name : entry.name;
      if (entry.isDirectory()) {
        collectFiles(path.join(dir, entry.name), rel);
      } else {
        filePaths.add(rel);
      }
    }
  }
  collectFiles(outDir, "");

  const manifestValidation = validateManifestCompleteness(manifest, project, filePaths);
  if (!manifestValidation.valid) {
    console.error("\n\x1b[31mPost-export manifest validation failed:\x1b[0m");
    for (const err of manifestValidation.errors) {
      const prefix = err.severity === "error" ? "\x1b[31mERROR\x1b[0m" : "\x1b[33mWARN\x1b[0m";
      console.error(`  ${prefix}: ${err.message}`);
    }
    fs.rmSync(outDir, { recursive: true, force: true });
    process.exit(1);
  }

  const assetCount = usedNames.size;
  console.log(`\nExport complete!`);
  console.log(`  ${exportedRooms.length} rooms, ${exportedActors.length} actors, ${exportedObjects.length} objects`);
  console.log(`  ${exportedItems.length} items, ${exportedScripts.length} scripts`);
  console.log(`  ${assetCount} asset files`);
  console.log(`  Manifest validation: \x1b[32mPASSED\x1b[0m`);
  console.log(`\nServe with: npx serve ${outDir}`);
}

main().catch((e) => {
  console.error("Export failed:", e);
  process.exit(1);
});
