/**
 * SaveSystem — Versioned game save/load with validation and migration.
 *
 * ## What is saved (GUARANTEED restored)
 * - Global flags and variables
 * - Current room ID
 * - Visited rooms list
 * - All actor runtime states (position, facing, animation, visibility)
 * - All object runtime states (visibility, enabled, primary state, custom state vars)
 * - Object locations (which room or inventory owns them)
 * - Inventory contents per actor
 * - Camera position, zoom, and follow target
 * - Dialogue seen/branch-chosen history
 * - Room local variables and room script state
 * - Player position and facing direction (stored separately for fast access)
 *
 * ## What is NOT saved / NOT restored
 * - Active script execution (ScriptScheduler state) — scripts in progress are
 *   cancelled on load. Mid-cutscene restoration is not supported.
 * - Walk-in-progress — walking actors are stopped before restore.
 * - Active dialogue flow — the dialogue manager is reset; only seen-history persists.
 * - Audio playback state — music/sfx positions are not captured.
 * - Pending fade/transition effects.
 * - UI transient state (hover label, message bar text).
 *
 * ## Versioning
 * Each save includes a `saveVersion` number. The current version is defined by
 * `SAVE_SCHEMA_VERSION` in `types.ts`. Saves without a `saveVersion` field are
 * treated as version 0 (legacy) and auto-migrated to the current version on load.
 * Saves from a NEWER version than the engine supports are rejected with a clear error.
 *
 * ## Future work
 * - Scheduler-aware save/restore (capture script instruction pointers)
 * - Multiple named save slots with UI
 * - Save file compression
 */

import type { SaveGameData, SaveLoadResult, Point, Direction } from "../core/types";
import { SAVE_SCHEMA_VERSION } from "../core/types";
import type { StateStore } from "./StateStore";
import type { RuntimeStorageProvider } from "../../shared/RuntimeStorageProvider";
import { LocalStorageProvider } from "../../shared/LocalStorageProvider";
import { parseSaveJSON, validateSaveData, migrateSaveData } from "./saveValidation";

export class SaveSystem {
  private gameId: string = "";
  private provider: RuntimeStorageProvider = new LocalStorageProvider();

  setGameId(id: string): void {
    this.gameId = id;
  }

  setStorageProvider(provider: RuntimeStorageProvider): void {
    this.provider = provider;
  }

  save(
    state: StateStore,
    slotId: string,
    playerPosition: Point,
    playerFacing: Direction,
    currentRoomId: string,
    roomName?: string
  ): SaveLoadResult {
    try {
      const saveData: SaveGameData = {
        saveVersion: SAVE_SCHEMA_VERSION,
        saveId: slotId,
        timestamp: Date.now(),
        gameId: this.gameId,
        state: state.getState(),
        currentRoomId,
        playerPosition,
        playerFacing,
        engineVersion: "1.0.0",
        roomName: roomName ?? currentRoomId,
        summary: `Room: ${roomName ?? currentRoomId}`,
      };
      this.provider.saveGameState(this.gameId, slotId, saveData);
      console.log(`[SaveSystem] Saved game to slot "${slotId}" (v${SAVE_SCHEMA_VERSION})`);
      return { ok: true, data: saveData };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[SaveSystem] Failed to save to slot "${slotId}":`, msg);
      return { ok: false, error: `Save failed: ${msg}`, code: "STORAGE_ERROR" };
    }
  }

  load(slotId: string): SaveLoadResult {
    try {
      const raw = this.provider.loadGameState(this.gameId, slotId);
      if (!raw) {
        return { ok: false, error: `No save found in slot "${slotId}".`, code: "NO_SAVE" };
      }

      const validation = validateSaveData(raw);
      if (!validation.ok) {
        console.error(`[SaveSystem] Validation failed for slot "${slotId}":`, validation.error);
        return validation;
      }

      const migrated = migrateSaveData(validation.data);
      console.log(`[SaveSystem] Loaded save from slot "${slotId}" (v${migrated.saveVersion})`);
      return { ok: true, data: migrated };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[SaveSystem] Failed to load slot "${slotId}":`, msg);
      const isCorrupt = msg.includes("Corrupt") || msg.includes("invalid JSON") || msg.includes("JSON");
      return { ok: false, error: `Load failed: ${msg}`, code: isCorrupt ? "INVALID_JSON" : "STORAGE_ERROR" };
    }
  }

  loadRaw(slotId: string): SaveGameData | null {
    try {
      return this.provider.loadGameState(this.gameId, slotId);
    } catch {
      return null;
    }
  }

  listSaves(): SaveGameData[] {
    try {
      return this.provider.listGameSaves(this.gameId);
    } catch (e) {
      console.error("[SaveSystem] Failed to list saves:", e);
      return [];
    }
  }

  deleteSave(slotId: string): void {
    try {
      this.provider.deleteGameSave(this.gameId, slotId);
    } catch (e) {
      console.error(`[SaveSystem] Failed to delete slot "${slotId}":`, e);
    }
  }

  hasSave(slotId: string): boolean {
    try {
      return this.provider.hasGameSave(this.gameId, slotId);
    } catch {
      return false;
    }
  }
}

export { parseSaveJSON, validateSaveData, migrateSaveData };
