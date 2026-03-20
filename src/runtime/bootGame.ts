import type { GameConfig } from "../engine/core/types";
import type { ScriptContext } from "../engine/scripting/ScriptRunner";
import type { RuntimeStorageProvider } from "../shared/RuntimeStorageProvider";
import { Engine } from "../engine/core/Engine";

export type ScriptRegistry = Record<
  string,
  (ctx: ScriptContext) => void | Promise<void>
>;

export interface BootOptions {
  canvas: HTMLCanvasElement;
  config: GameConfig;
  scripts: ScriptRegistry;
  storageProvider?: RuntimeStorageProvider;
}

export async function bootGame(options: BootOptions): Promise<Engine> {
  console.log(`[Runtime] Booting game: ${options.config.id}`);

  const engine = new Engine({
    canvas: options.canvas,
    config: options.config,
    scripts: options.scripts,
    storageProvider: options.storageProvider,
  });

  engine.start();
  await engine.init({ deferActivation: true });

  console.log(`[Runtime] Game running: ${options.config.title}`);
  return engine;
}
