import JSZip from "jszip";
import type { EditorProject } from "../types";
import type {
  ExportManifest,
  ExportedScript,
  ExportedSettings,
  ValidationResult,
} from "../../shared/exportSchema";
import { EXPORT_SCHEMA_VERSION } from "../../shared/exportSchema";
import { resolveDisplayConfig } from "../../shared/displayConfig";
import { validateProject } from "./validateProject";
import { validateManifestCompleteness } from "../../shared/validateProject";

const RUNTIME_PATH = "playable-runtime/playable.js";

export interface PlayableExportOptions {
  title?: string;
  author?: string;
  description?: string;
  display?: import("../../shared/exportSchema").DisplayConfig;
}

export interface PlayableExportResult {
  success: boolean;
  validation: ValidationResult;
  error?: string;
  zipBlob?: Blob;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const ext = mimeToExt(mime);
  return { blob: new Blob([arr], { type: mime }), ext };
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/mp3": "mp3",
  };
  return map[mime] || "bin";
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

function isDataUrl(path: string): boolean {
  return path.startsWith("data:");
}

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function resolvePublicUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (path.startsWith("/")) return path;
  return base + "/" + path;
}

async function fetchAsBlob(url: string): Promise<Blob | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.blob();
  } catch {
    return null;
  }
}

async function fetchAsText(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

function extFromPath(path: string): string {
  const match = path.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : "bin";
}

async function fetchRuntimeBundle(): Promise<string> {
  const url = resolvePublicUrl(RUNTIME_PATH);
  const js = await fetchAsText(url);
  if (!js) {
    throw new Error(
      "Could not load playable runtime. Please run 'pnpm run build:runtime' first."
    );
  }
  return js;
}

function generatePlayableHTML(
  title: string,
  runtimeJS: string,
  baseWidth: number = 640,
  baseHeight: number = 360,
  bgColor: string = "#000",
  pixelPerfect: boolean = true
): string {
  const canvasW = baseWidth;
  const canvasH = baseHeight;
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
#canvas-wrap{position:relative;width:${canvasW}px;height:${canvasH}px;background:${bgColor}}
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
<canvas id="game-canvas" width="${canvasW}" height="${canvasH}"></canvas>
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
<script>${runtimeJS}</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function exportPlayableBuild(
  project: EditorProject,
  options?: PlayableExportOptions
): Promise<PlayableExportResult> {
  const validation = validateProject(project);
  if (!validation.valid) {
    return { success: false, validation };
  }

  try {
    const runtimeJS = await fetchRuntimeBundle();
    const zip = new JSZip();
    const assetMap = new Map(project.assets.map((a) => [a.id, a.dataUrl]));
    const assetFileMap = new Map<string, string>();
    const usedNames = new Set<string>();
    const assetsFolder = zip.folder("assets")!;
    const dataFolder = zip.folder("data")!;

    function resolveAssetPath(pathOrId: string | undefined): string {
      if (!pathOrId) return "";
      const dataUrl = assetMap.get(pathOrId);
      const resolved = dataUrl || pathOrId;

      if (assetFileMap.has(resolved)) {
        return "assets/" + assetFileMap.get(resolved)!;
      }
      return resolved;
    }

    for (const asset of project.assets) {
      if (!asset.dataUrl.startsWith("data:")) continue;
      const result = dataUrlToBlob(asset.dataUrl);
      if (!result) continue;
      const baseName = sanitizeFileName(asset.name.replace(/\.[^.]+$/, ""));
      const fileName = makeUnique(baseName + "." + result.ext, usedNames);
      usedNames.add(fileName);
      assetFileMap.set(asset.dataUrl, fileName);
      assetsFolder.file(fileName, result.blob);
    }

    const allPaths = collectReferencedPaths(project);
    const unresolvedAssets: string[] = [];
    for (const path of allPaths) {
      if (isDataUrl(path)) {
        if (!assetFileMap.has(path)) {
          const result = dataUrlToBlob(path);
          if (result) {
            const fileName = makeUnique("asset." + result.ext, usedNames);
            usedNames.add(fileName);
            assetFileMap.set(path, fileName);
            assetsFolder.file(fileName, result.blob);
          } else {
            unresolvedAssets.push(path.substring(0, 60) + "...");
          }
        }
        continue;
      }
      if (assetFileMap.has(path)) continue;

      const fetchUrl = isAbsoluteUrl(path) ? path : resolvePublicUrl(path);
      const blob = await fetchAsBlob(fetchUrl);
      if (blob) {
        const ext = extFromPath(path);
        const baseName = sanitizeFileName(
          path.split("/").pop()?.replace(/\.[^.]+$/, "") || "asset"
        );
        const fileName = makeUnique(baseName + "." + ext, usedNames);
        usedNames.add(fileName);
        assetFileMap.set(path, fileName);
        assetsFolder.file(fileName, blob);
      } else {
        unresolvedAssets.push(path);
      }
    }

    if (unresolvedAssets.length > 0) {
      return {
        success: false,
        validation: {
          valid: false,
          errors: [
            ...validation.errors,
            ...unresolvedAssets.map((p) => ({
              severity: "error" as const,
              message: `Failed to resolve asset: ${p}`,
            })),
          ],
        },
        error: `${unresolvedAssets.length} asset(s) could not be resolved.`,
      };
    }

    function resolveAssetForExport(pathOrId: string | undefined): string {
      if (!pathOrId) return "";
      const dataUrl = assetMap.get(pathOrId);
      const resolved = dataUrl || pathOrId;
      if (assetFileMap.has(resolved)) {
        return "assets/" + assetFileMap.get(resolved)!;
      }
      if (assetFileMap.has(pathOrId)) {
        return "assets/" + assetFileMap.get(pathOrId)!;
      }
      return resolved;
    }

    const exportedRooms = project.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      backgroundPath: resolveAssetForExport(room.backgroundPath),
      maskPath: room.maskPath
        ? resolveAssetForExport(room.maskPath)
        : undefined,
      width: room.width,
      height: room.height,
      parallaxLayers: room.parallaxLayers?.map((layer) => ({
        imagePath: resolveAssetForExport(layer.imagePath),
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
        useWithHandlers: hs.useWithHandlers,
        fallbackScriptId: hs.fallbackScriptId,
        zLayer: hs.zLayer,
        standPoint: hs.standPoint,
        approachDirection: hs.approachDirection,
        interactionAnchors: hs.interactionAnchors,
        interactDistance: hs.interactDistance,
        visibilityCondition: hs.visibilityCondition,
        interactionCondition: hs.interactionCondition,
      })),
      actorIds: room.actorIds,
      spawnPoints: room.spawnPoints,
      ambientAudioPath: room.ambientAudioPath
        ? resolveAssetForExport(room.ambientAudioPath)
        : undefined,
      onEnter: room.onEnter,
      onExit: room.onExit,
      onUpdate: room.onUpdate,
      transitionEffect: room.transitionEffect,
      effects: room.effects,
      sceneProps: room.sceneProps?.map((prop) => ({
        ...prop,
        assetPath: prop.assetPath ? resolveAssetForExport(prop.assetPath) : undefined,
      })),
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
      spritePath: resolveAssetForExport(actor.spritePath),
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
                          imagePath: resolveAssetForExport(frame.imagePath),
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
      useWithHandlers: actor.useWithHandlers,
      fallbackScriptId: actor.fallbackScriptId,
      dialogueId: actor.dialogueId,
      standPoint: actor.standPoint,
      approachDirection: actor.approachDirection,
      interactionAnchors: actor.interactionAnchors,
      interactDistance: actor.interactDistance,
      facePlayerOnInteract: actor.facePlayerOnInteract,
      portraitPath: actor.portraitPath ? resolveAssetForExport(actor.portraitPath) : undefined,
    }));

    const exportedObjects = project.objects.map((obj) => ({
      id: obj.id,
      name: obj.name,
      roomId: obj.roomId,
      position: obj.position,
      spritePath: resolveAssetForExport(obj.spritePath),
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
        spritePath: resolveAssetForExport(entry.spritePath),
        bounds: entry.bounds,
        fps: entry.fps,
        frameCount: entry.frameCount,
        atlasRect: entry.atlasRect,
      })),
      verbHandlers: obj.verbHandlers,
      useWithHandlers: obj.useWithHandlers,
      fallbackScriptId: obj.fallbackScriptId,
      zOffset: obj.zOffset,
      zLayer: obj.zLayer,
      interactionAnimation: obj.interactionAnimation,
      standPoint: obj.standPoint,
      approachDirection: obj.approachDirection,
      interactionAnchors: obj.interactionAnchors,
      interactDistance: obj.interactDistance,
      visibilityCondition: obj.visibilityCondition,
      interactionCondition: obj.interactionCondition,
      tags: obj.tags,
      primaryState: obj.primaryState,
      interactionHotspot: obj.interactionHotspot,
      cursorOverride: obj.cursorOverride,
      affordance: obj.affordance,
    }));

    const exportedItems = project.items.map((item) => ({
      id: item.id,
      name: item.name,
      iconPath: resolveAssetForExport(item.iconPath),
      description: item.description,
      ownerId: item.ownerId,
      verbHandlers: item.verbHandlers,
      useWithHandlers: item.useWithHandlers,
      fallbackScriptId: item.fallbackScriptId,
    }));

    const exportedScripts: ExportedScript[] = project.scripts.map((s) => ({
      name: s.name,
      body: s.body,
    }));

    const verbCursors = project.verbCursors
      ? Object.fromEntries(
          Object.entries(project.verbCursors)
            .map(([verb, assetId]) => [verb, resolveAssetForExport(assetId)])
            .filter(([, url]) => url)
        )
      : undefined;

    const cursorConfig = project.cursorConfig
      ? {
          ...project.cursorConfig,
          verbCursors: project.cursorConfig.verbCursors
            ? Object.fromEntries(
                Object.entries(project.cursorConfig.verbCursors)
                  .map(([verb, assetId]) => [verb, resolveAssetForExport(assetId)])
                  .filter(([, url]) => url)
              )
            : undefined,
        }
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
      ...(cursorConfig ? { cursorConfig } : {}),
    };

    dataFolder.file("rooms.json", JSON.stringify(exportedRooms, null, 2));
    dataFolder.file("actors.json", JSON.stringify(exportedActors, null, 2));
    dataFolder.file("objects.json", JSON.stringify(exportedObjects, null, 2));
    dataFolder.file("inventory.json", JSON.stringify(exportedItems, null, 2));
    dataFolder.file("scripts.json", JSON.stringify(exportedScripts, null, 2));
    const exportedDialogueTrees = (project.dialogueTrees || []).map((tree) => ({
      id: tree.id,
      name: tree.name,
      actorId: tree.actorId,
      startNodeId: tree.startNodeId,
      onStartFlag: tree.onStartFlag,
      onEndFlag: tree.onEndFlag,
      nodes: tree.nodes.map((node) => ({
        id: node.id,
        speaker: node.speaker,
        text: node.text,
        branches: node.branches,
        actions: node.actions,
        condition: node.condition,
        once: node.once,
        portrait: node.portrait,
      })),
    }));
    dataFolder.file(
      "dialogue.json",
      JSON.stringify(exportedDialogueTrees, null, 2)
    );
    dataFolder.file("project.json", JSON.stringify(exportedSettings, null, 2));

    const exportTitle = options?.title?.trim() || project.title;

    const displayConfig = options?.display ?? project.display;
    const resolvedDisplay = resolveDisplayConfig(displayConfig);
    const baseWidth = resolvedDisplay.baseWidth;
    const baseHeight = resolvedDisplay.baseHeight;

    const manifest: ExportManifest = {
      gameId: project.id,
      title: exportTitle,
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
      ...(options?.author?.trim() ? { author: options.author.trim() } : {}),
      ...(options?.description?.trim() ? { description: options.description.trim() } : {}),
      ...(displayConfig ? { display: displayConfig } : {}),
      ...(project.overlayConfig ? { overlayConfig: project.overlayConfig } : {}),
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("index.html", generatePlayableHTML(
      exportTitle,
      runtimeJS,
      baseWidth,
      baseHeight,
      resolvedDisplay.backgroundColor,
      resolvedDisplay.pixelPerfect
    ));

    const zipPaths = new Set<string>();
    zip.forEach((relativePath) => {
      zipPaths.add(relativePath);
    });

    const manifestValidation = validateManifestCompleteness(manifest, project, zipPaths);
    if (!manifestValidation.valid) {
      return {
        success: false,
        validation: {
          valid: false,
          errors: [...validation.errors, ...manifestValidation.errors],
        },
        error: "Manifest validation failed.",
      };
    }

    const blob = await zip.generateAsync({ type: "blob" });

    return {
      success: true,
      validation: {
        valid: true,
        errors: [
          ...validation.errors,
          ...manifestValidation.errors,
        ],
      },
      zipBlob: blob,
    };
  } catch (e) {
    return {
      success: false,
      validation,
      error: String(e),
    };
  }
}

function collectReferencedPaths(project: EditorProject): string[] {
  const paths: string[] = [];
  const assetMap = new Map(project.assets.map((a) => [a.id, a.dataUrl]));

  function resolve(pathOrId: string | undefined): string | undefined {
    if (!pathOrId) return undefined;
    return assetMap.get(pathOrId) || pathOrId;
  }

  for (const room of project.rooms) {
    const bg = resolve(room.backgroundPath);
    if (bg) paths.push(bg);
    const mask = resolve(room.maskPath);
    if (mask) paths.push(mask);
    const audio = resolve(room.ambientAudioPath);
    if (audio) paths.push(audio);
    if (room.parallaxLayers) {
      for (const layer of room.parallaxLayers) {
        const img = resolve(layer.imagePath);
        if (img) paths.push(img);
      }
    }
    if (room.sceneProps) {
      for (const prop of room.sceneProps) {
        const img = resolve(prop.assetPath);
        if (img) paths.push(img);
      }
    }
  }

  for (const actor of project.actors) {
    const sp = resolve(actor.spritePath);
    if (sp) paths.push(sp);
    if (actor.animations) {
      for (const dirStates of Object.values(actor.animations)) {
        for (const anim of Object.values(dirStates)) {
          if (anim) {
            for (const frame of anim.frames) {
              const img = resolve(frame.imagePath);
              if (img) paths.push(img);
            }
          }
        }
      }
    }
    if (actor.portraitPath) {
      const p = resolve(actor.portraitPath);
      if (p) paths.push(p);
    }
  }

  for (const obj of project.objects) {
    const sp = resolve(obj.spritePath);
    if (sp) paths.push(sp);
    if (obj.stateSprites) {
      for (const entry of obj.stateSprites) {
        const sp2 = resolve(entry.spritePath);
        if (sp2) paths.push(sp2);
      }
    }
  }

  for (const item of project.items) {
    const icon = resolve(item.iconPath);
    if (icon) paths.push(icon);
  }

  // Legacy verbCursors map (top-level on project)
  if (project.verbCursors) {
    for (const assetId of Object.values(project.verbCursors)) {
      const cursor = resolve(assetId as string);
      if (cursor) paths.push(cursor);
    }
  }

  // Data-driven cursorConfig verbCursors
  if (project.cursorConfig?.verbCursors) {
    for (const assetId of Object.values(project.cursorConfig.verbCursors)) {
      const cursor = resolve(assetId as string);
      if (cursor) paths.push(cursor);
    }
  }

  return [...new Set(paths)].filter((p) => p.length > 0);
}
