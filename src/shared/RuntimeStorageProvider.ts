import type { SaveGameData } from "../engine/core/types";

/** Runtime-only storage: save-game persistence (no editor dependencies). */
export interface RuntimeStorageProvider {
  saveGameState(gameId: string, slotId: string, data: SaveGameData): void;

  loadGameState(gameId: string, slotId: string): SaveGameData | null;

  listGameSaves(gameId: string): SaveGameData[];

  deleteGameSave(gameId: string, slotId: string): void;

  hasGameSave(gameId: string, slotId: string): boolean;
}
