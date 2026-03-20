import JSZip from "jszip";
import type { EditorProject } from "../types";
import { generatePlayerHTML, type ExportSettings } from "./playerTemplate";
import { projectToConfig } from "./projectToConfig";
import { EXPORT_SCHEMA_VERSION, type ExportManifest } from "../../shared/exportSchema";
import { validateManifestCompleteness } from "../../shared/validateProject";

const PLAYER_RUNTIME_PATH = "player-runtime/player.js";

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

function collectReferencedPaths(project: EditorProject): string[] {
  const { config } = projectToConfig(project);
  const paths: string[] = [];

  for (const room of config.rooms) {
    if (room.backgroundPath) paths.push(room.backgroundPath);
    if (room.maskPath) paths.push(room.maskPath);
    if (room.ambientAudioPath) paths.push(room.ambientAudioPath);
  }
  for (const actor of config.actors) {
    if (actor.spritePath) paths.push(actor.spritePath);
  }
  for (const obj of config.objects) {
    if (obj.spritePath) paths.push(obj.spritePath);
  }
  for (const item of config.items) {
    if (item.iconPath) paths.push(item.iconPath);
  }

  return [...new Set(paths)].filter((p) => p.length > 0);
}

function isDataUrl(path: string): boolean {
  return path.startsWith("data:");
}

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function extFromPath(path: string): string {
  const match = path.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : "bin";
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

async function fetchAsBlob(url: string): Promise<Blob | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.blob();
  } catch {
    return null;
  }
}

function resolvePublicUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (path.startsWith("/")) return path;
  return base + "/" + path;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

async function fetchPlayerRuntime(): Promise<string> {
  const url = resolvePublicUrl(PLAYER_RUNTIME_PATH);
  const js = await fetchAsText(url);
  if (!js) {
    throw new Error(
      "Could not load player runtime. Please run 'pnpm run build:player' first."
    );
  }
  return js;
}

export async function exportGame(
  project: EditorProject,
  settings: ExportSettings
): Promise<void> {
  const zip = new JSZip();
  const allPaths = collectReferencedPaths(project);
  const playerJS = await fetchPlayerRuntime();

  if (settings.mode === "inline") {
    const inlineMap = new Map<string, string>();

    for (const path of allPaths) {
      if (isDataUrl(path)) continue;
      const fetchUrl = isAbsoluteUrl(path) ? path : resolvePublicUrl(path);
      const blob = await fetchAsBlob(fetchUrl);
      if (blob) {
        const dataUrl = await blobToDataUrl(blob);
        inlineMap.set(path, dataUrl);
      }
    }

    const html = generatePlayerHTML(project, settings, null, inlineMap, playerJS);
    zip.file("index.html", html);
  } else {
    const assetFileMap = new Map<string, string>();
    const usedNames = new Set<string>();
    const assetsFolder = zip.folder("assets")!;

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

    for (const path of allPaths) {
      if (isDataUrl(path)) {
        if (!assetFileMap.has(path)) {
          const result = dataUrlToBlob(path);
          if (result) {
            const fileName = makeUnique("asset." + result.ext, usedNames);
            usedNames.add(fileName);
            assetFileMap.set(path, fileName);
            assetsFolder.file(fileName, result.blob);
          }
        }
        continue;
      }

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
      }
    }

    const html = generatePlayerHTML(project, settings, assetFileMap, null, playerJS);
    zip.file("index.html", html);

    const { config } = projectToConfig(project);
    const dataFolder = zip.folder("data")!;
    dataFolder.file("rooms.json", JSON.stringify(config.rooms, null, 2));
    dataFolder.file("actors.json", JSON.stringify(config.actors, null, 2));
    dataFolder.file("objects.json", JSON.stringify(config.objects, null, 2));
    dataFolder.file("inventory.json", JSON.stringify(config.items, null, 2));
    // Strip editor-only fields (description, kind, steps); runtime only needs name+body
    const exportedScripts = project.scripts.map(({ name, body }) => ({ name, body }));
    dataFolder.file("scripts.json", JSON.stringify(exportedScripts, null, 2));
    dataFolder.file("dialogue.json", JSON.stringify(config.dialogueTrees, null, 2));
    dataFolder.file("project.json", JSON.stringify({
      defaultPlayerPosition: config.defaultPlayerPosition,
      startingItems: config.startingItems,
      verbs: config.verbs,
      uiSettings: config.uiSettings,
      verbCursors: config.verbCursors,
      ...(config.display ? { display: config.display } : {}),
      ...(config.overlayConfig ? { overlayConfig: config.overlayConfig } : {}),
    }, null, 2));

    const manifest: ExportManifest = {
      gameId: project.id,
      title: settings.gameTitle || project.title,
      version: "1.0.0",
      exportSchemaVersion: EXPORT_SCHEMA_VERSION,
      startRoomId: config.startingRoom,
      playerActorId: config.defaultPlayerActorId,
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
      ...(settings.authorName?.trim() ? { author: settings.authorName.trim() } : {}),
      ...(config.display ? { display: config.display } : {}),
      ...(config.overlayConfig ? { overlayConfig: config.overlayConfig } : {}),
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    const zipPaths = new Set<string>();
    zip.forEach((relativePath) => { zipPaths.add(relativePath); });
    const manifestResult = validateManifestCompleteness(manifest, project, zipPaths);
    const fatalErrors = manifestResult.errors.filter((e) => e.severity === "error");
    if (fatalErrors.length > 0) {
      const messages = fatalErrors.map((e) => e.message).join("\n");
      throw new Error("Export validation failed:\n" + messages);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFileName(settings.gameTitle || project.title) + ".zip";
  a.click();
  URL.revokeObjectURL(url);
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
