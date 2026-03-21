import type { GameConfig } from "../engine/core/types";
import type {
  ExportManifest,
  ExportedScript,
  ExportedSettings,
} from "../shared/exportSchema";
import type { ScriptHandlerFn } from "../engine/scripting/ScriptRunner";
import { compileRawScript } from "./compileScript";

export type DataFetcher = (url: string) => Promise<unknown>;

export function defaultWebFetcher(packageRoot: string): DataFetcher {
  const root = packageRoot.endsWith("/") ? packageRoot : packageRoot + "/";
  return async (relativePath: string) => {
    const url = root + relativePath;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
    }
    return resp.json();
  };
}

declare global {
  interface Window {
    __TAURI__?: {
      invoke?(cmd: string, args?: Record<string, unknown>): Promise<unknown>;
      fs?: {
        readTextFile(path: string, options?: { baseDir?: number }): Promise<string>;
      };
      path?: {
        join(...parts: string[]): Promise<string>;
      };
    };
  }
}

function resolveDesktopPath(
  packageRoot: string,
  relativePath: string,
  tauriPath?: { join(...parts: string[]): Promise<string> }
): string | Promise<string> {
  if (tauriPath?.join) {
    return tauriPath.join(packageRoot, relativePath);
  }
  const root = packageRoot.endsWith("/") || packageRoot.endsWith("\\")
    ? packageRoot
    : packageRoot + "/";
  return root + relativePath;
}

export function desktopFetcher(packageRoot: string): DataFetcher {
  return async (relativePath: string) => {
    const tauri = window.__TAURI__;

    if (tauri?.invoke) {
      try {
        const fullPath = await resolveDesktopPath(packageRoot, relativePath, tauri.path);
        const result = await tauri.invoke("read_game_file", { path: fullPath });
        if (typeof result === "string") {
          return JSON.parse(result);
        }
        return result;
      } catch {
      }
    }

    if (tauri?.fs?.readTextFile) {
      const fullPath = await resolveDesktopPath(packageRoot, relativePath, tauri.path);
      const text = await tauri.fs.readTextFile(fullPath);
      return JSON.parse(text);
    }

    return defaultWebFetcher(packageRoot)(relativePath);
  };
}

/**
 * Compiles exported scripts into runtime handler functions.
 * Exported packages only contain name+body — kind and steps are editor-only
 * metadata stripped at export time. Visual scripts are compiled to body by
 * the editor before export, so the runtime always executes body directly.
 */
export async function compileScripts(
  scriptList: ExportedScript[]
): Promise<Record<string, ScriptHandlerFn>> {
  const compiled: Record<string, ScriptHandlerFn> = {};
  for (const script of scriptList) {
    try {
      compiled[script.name] = await compileRawScript(script.name, script.body);
    } catch (e) {
      console.error(`[Runtime] Failed to compile script "${script.name}":`, e);
    }
  }
  return compiled;
}

export interface LoadedGameData {
  config: GameConfig;
  scripts: Record<string, ScriptHandlerFn>;
}

export async function loadGameData(
  manifest: ExportManifest,
  fetcher: DataFetcher
): Promise<LoadedGameData> {
  const [rooms, actors, objects, items, scripts, dialogueTrees, settings] =
    await Promise.all([
      fetcher(manifest.data.rooms),
      fetcher(manifest.data.actors),
      fetcher(manifest.data.objects),
      fetcher(manifest.data.inventory),
      fetcher(manifest.data.scripts) as Promise<ExportedScript[]>,
      fetcher(manifest.data.dialogue),
      fetcher(manifest.data.project) as Promise<ExportedSettings>,
    ]);

  const compiledScripts = await compileScripts(scripts as ExportedScript[]);
  const settingsData = settings as ExportedSettings;

  const config: GameConfig = {
    id: manifest.gameId,
    title: manifest.title,
    startingRoom: manifest.startRoomId,
    assetRoot: "./",
    defaultPlayerActorId: manifest.playerActorId,
    defaultPlayerPosition: settingsData.defaultPlayerPosition,
    startingItems: settingsData.startingItems,
    verbs: settingsData.verbs,
    uiSettings: settingsData.uiSettings,
    verbCursors: settingsData.verbCursors,
    globalFallbackScriptId: settingsData.globalFallbackScriptId,
    display: settingsData.display,
    overlayConfig: settingsData.overlayConfig ?? manifest.overlayConfig,
    cursorConfig: settingsData.cursorConfig,
    rooms: rooms as GameConfig["rooms"],
    actors: actors as GameConfig["actors"],
    objects: objects as GameConfig["objects"],
    items: items as GameConfig["items"],
    dialogueTrees: dialogueTrees as GameConfig["dialogueTrees"],
  };

  return { config, scripts: compiledScripts };
}
