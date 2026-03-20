import type { EditorProject } from "../types";
import { generateId, CURRENT_FORMAT_VERSION } from "./projectStorage";
import borkData from "../../projects/bork/bork.json";
import { BORK_ASSETS } from "../../projects/bork/borkAssets";

/**
 * Creates a fresh EditorProject from the Bork sample adventure.
 *
 * Bork is a comedic 7-room farmyard point-and-click adventure.
 * bork.json is the single source of truth for all game data: rooms,
 * actors, objects, items, scripts, dialogue, display config, overlay
 * config, and asset reference IDs (backgroundPath / spritePath / iconPath).
 *
 * This function injects only the values that genuinely cannot live in a
 * static JSON template:
 *   - id:            fresh UUID so each loaded instance is independent
 *   - created:       current timestamp
 *   - modified:      current timestamp
 *   - formatVersion: CURRENT_FORMAT_VERSION keeps the project engine-compat
 *   - assets:        Vite-resolved PNG URLs (borkAssets.ts); URLs are build-
 *                    time values that cannot be written into static JSON
 */
export function createSampleProject(): EditorProject {
  const id = generateId("proj");
  const now = Date.now();

  return {
    formatVersion: CURRENT_FORMAT_VERSION,
    id,
    title: borkData.title,
    created: now,
    modified: now,
    startingRoom: borkData.startingRoom,
    defaultPlayerActorId: borkData.defaultPlayerActorId,
    defaultPlayerPosition: borkData.defaultPlayerPosition as { x: number; y: number },
    startingItems: borkData.startingItems ?? [],
    verbs: borkData.verbs as EditorProject["verbs"],
    rooms:   [...borkData.rooms]   as unknown as EditorProject["rooms"],
    actors:  [...borkData.actors]  as unknown as EditorProject["actors"],
    objects: [...borkData.objects] as unknown as EditorProject["objects"],
    items:   [...borkData.items]   as unknown as EditorProject["items"],
    scripts: borkData.scripts as unknown as EditorProject["scripts"],
    dialogueTrees: borkData.dialogueTrees as unknown as EditorProject["dialogueTrees"],
    uiSettings: borkData.uiSettings as unknown as EditorProject["uiSettings"],
    globalFallbackScriptId: borkData.globalFallbackScriptId,
    stateWatchers: borkData.stateWatchers as unknown as EditorProject["stateWatchers"],
    variableDefinitions: borkData.variableDefinitions as unknown as EditorProject["variableDefinitions"],
    assets: BORK_ASSETS,
    display: borkData.display as EditorProject["display"],
    overlayConfig: borkData.overlayConfig as EditorProject["overlayConfig"],
  };
}
