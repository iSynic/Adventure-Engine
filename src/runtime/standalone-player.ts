import type { GameConfig } from "../engine/core/types";
import type { ScriptHandlerFn } from "../engine/scripting/ScriptRunner";
import { bootRuntime } from "./launcherBoot";

interface PlayerGameData {
  config: GameConfig;
  scriptBodies: Record<string, string>;
}

declare global {
  interface Window {
    __GAME_DATA__?: PlayerGameData;
  }
}

function compileScripts(
  bodies: Record<string, string>
): Record<string, ScriptHandlerFn> {
  const compiled: Record<string, ScriptHandlerFn> = {};
  for (const [name, body] of Object.entries(bodies)) {
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      compiled[name] = new AsyncFunction("ctx", body) as ScriptHandlerFn;
    } catch (e) {
      console.error(`[Player] Failed to compile script "${name}":`, e);
    }
  }
  return compiled;
}

async function boot() {
  const loadingStatus = document.getElementById("loading-status");
  const onStatusUpdate = (msg: string) => {
    if (loadingStatus) {
      loadingStatus.textContent = msg;
    } else if (msg) {
      const isError = msg.startsWith("Error");
      if (isError) {
        console.error("[Player]", msg);
      } else {
        console.log("[Player]", msg);
      }
    }
  };

  const gameData = window.__GAME_DATA__;
  if (!gameData) {
    onStatusUpdate("Error: No game data found.");
    return;
  }

  const { config, scriptBodies } = gameData;
  const scripts = compileScripts(scriptBodies);

  const mount = document.getElementById("canvas-wrap")?.parentElement
    ?? document.body;

  try {
    await bootRuntime({
      mount,
      mode: "web",
      preloadedConfig: config,
      preloadedScripts: scripts,
      onStatusUpdate,
      scalingContainer: document.getElementById("game-container") ?? undefined,
    });
  } catch (e) {
    console.error("[Player] Boot error:", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
