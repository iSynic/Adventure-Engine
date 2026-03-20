import type { StorageProvider } from "./StorageProvider";
import type { EditorProject, EditorProjectMeta } from "../editor/types";
import type { SaveGameData } from "../engine/core/types";

const PROJECTS_KEY = "adv-engine-projects";
const PROJECT_PREFIX = "adv-engine-project-";
const ASSET_PREFIX = "adv-engine-asset-";
const SAVE_KEY_PREFIX = "adventure_engine_save_";

export class LocalStorageProvider implements StorageProvider {
  listProjectMetas(): EditorProjectMeta[] {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as EditorProjectMeta[];
    } catch {
      return [];
    }
  }

  private saveProjectMetas(metas: EditorProjectMeta[]): void {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(metas));
  }

  loadProject(id: string): EditorProject | null {
    try {
      const raw = localStorage.getItem(PROJECT_PREFIX + id);
      if (!raw) return null;
      return JSON.parse(raw) as EditorProject;
    } catch (e) {
      console.error(`[LocalStorageProvider] Failed to load project "${id}":`, e);
      return null;
    }
  }

  saveProject(project: EditorProject): void {
    const updated = { ...project, modified: Date.now() };
    localStorage.setItem(PROJECT_PREFIX + project.id, JSON.stringify(updated));
    const metas = this.listProjectMetas();
    const meta: EditorProjectMeta = {
      id: updated.id,
      title: updated.title,
      created: updated.created,
      modified: updated.modified,
      roomCount: updated.rooms.length,
    };
    const idx = metas.findIndex((m) => m.id === updated.id);
    if (idx >= 0) metas[idx] = meta;
    else metas.push(meta);
    this.saveProjectMetas(metas);
  }

  deleteProject(id: string): void {
    localStorage.removeItem(PROJECT_PREFIX + id);
    const metas = this.listProjectMetas().filter((m) => m.id !== id);
    this.saveProjectMetas(metas);
    const assetKeys: string[] = [];
    const prefix = ASSET_PREFIX + id + "_";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) assetKeys.push(key);
    }
    assetKeys.forEach((k) => localStorage.removeItem(k));
  }

  getAssetUrl(_projectId: string, _assetId: string, dataUrl: string): string {
    return dataUrl;
  }

  saveAssetData(projectId: string, assetId: string, dataUrl: string): void {
    localStorage.setItem(ASSET_PREFIX + projectId + "_" + assetId, dataUrl);
  }

  loadAssetData(projectId: string, assetId: string): string | null {
    return localStorage.getItem(ASSET_PREFIX + projectId + "_" + assetId);
  }

  deleteAssetData(projectId: string, assetId: string): void {
    localStorage.removeItem(ASSET_PREFIX + projectId + "_" + assetId);
  }

  listAssetIds(projectId: string): string[] {
    const ids: string[] = [];
    const prefix = ASSET_PREFIX + projectId + "_";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        ids.push(key.slice(prefix.length));
      }
    }
    return ids;
  }

  saveGameState(gameId: string, slotId: string, data: SaveGameData): void {
    try {
      localStorage.setItem(
        SAVE_KEY_PREFIX + gameId + "_" + slotId,
        JSON.stringify(data)
      );
    } catch (e) {
      console.error(`[LocalStorageProvider] Failed to save slot "${slotId}":`, e);
      throw e;
    }
  }

  loadGameState(gameId: string, slotId: string): SaveGameData | null {
    const key = SAVE_KEY_PREFIX + gameId + "_" + slotId;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed as SaveGameData;
    } catch (e) {
      console.error(`[LocalStorageProvider] Corrupt save data for slot "${slotId}":`, e);
      throw new Error(`Corrupt save data in slot "${slotId}": invalid JSON`);
    }
  }

  listGameSaves(gameId: string): SaveGameData[] {
    const saves: SaveGameData[] = [];
    const prefix = SAVE_KEY_PREFIX + gameId + "_";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            saves.push(JSON.parse(raw) as SaveGameData);
          } catch (e) {
            console.warn(`[LocalStorageProvider] Skipping corrupt save at key "${key}":`, e);
          }
        }
      }
    }
    return saves.sort((a, b) => b.timestamp - a.timestamp);
  }

  deleteGameSave(gameId: string, slotId: string): void {
    localStorage.removeItem(SAVE_KEY_PREFIX + gameId + "_" + slotId);
  }

  hasGameSave(gameId: string, slotId: string): boolean {
    return localStorage.getItem(SAVE_KEY_PREFIX + gameId + "_" + slotId) !== null;
  }
}
