import type { EditorProject, EditorProjectMeta } from "../types";
import type { StorageProvider } from "../../shared/StorageProvider";
import { LocalStorageProvider } from "../../shared/LocalStorageProvider";
import { DEFAULT_DISPLAY_CONFIG } from "../../shared/displayConfig";
import { migrateProject } from "./projectMigration";
import { validateProject, formatValidationErrors } from "./projectValidation";
import { BORK_ASSETS } from "../../projects/bork/borkAssets";

let _provider: StorageProvider = new LocalStorageProvider();

export function setStorageProvider(provider: StorageProvider): void {
  _provider = provider;
}

export function getStorageProvider(): StorageProvider {
  return _provider;
}

export function loadProjectMetas(): EditorProjectMeta[] {
  return _provider.listProjectMetas();
}

export function saveProjectMetas(metas: EditorProjectMeta[]): void {
  // no-op: LocalStorageProvider handles metas internally via saveProject
  // For backward compat, this function exists but the provider manages metas.
}

export function loadProject(id: string): EditorProject | null {
  try {
    const raw = _provider.loadProject(id);
    if (!raw) return null;
    const migrated = migrateProject(raw as unknown as Record<string, unknown>);
    const project = migrated as unknown as EditorProject;

    // If this is a Bork project, merge in any BORK_ASSETS entries that were
    // added after the project was first saved (e.g. new animation frames).
    if (project.assets.some((a) => a.id.startsWith("bork_"))) {
      const existingIds = new Set(project.assets.map((a) => a.id));
      const missing = BORK_ASSETS.filter((a) => !existingIds.has(a.id));
      if (missing.length > 0) {
        project.assets = [...project.assets, ...missing];
      }
    }

    return project;
  } catch (e) {
    console.error(`[ProjectStorage] Failed to load project "${id}":`, e);
    alert(`Could not load project: ${(e as Error).message}`);
    return null;
  }
}

export function saveProject(project: EditorProject): void {
  _provider.saveProject(project);
}

export function deleteProject(id: string): void {
  _provider.deleteProject(id);
}

export function resolveAssetUrl(
  projectId: string,
  assetId: string,
  dataUrl: string
): string {
  return _provider.getAssetUrl(projectId, assetId, dataUrl);
}

export function generateId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const CURRENT_FORMAT_VERSION = 2;

export function createBlankProject(title: string): EditorProject {
  const id = generateId("proj");
  const now = Date.now();
  return {
    formatVersion: CURRENT_FORMAT_VERSION,
    id,
    title,
    created: now,
    modified: now,
    startingRoom: "",
    defaultPlayerActorId: "player",
    defaultPlayerPosition: { x: 200, y: 340 },
    startingItems: [],
    verbs: ["walk", "look", "open", "close", "pickup", "use", "talk"],
    rooms: [],
    actors: [
      {
        id: "player",
        name: "Player",
        isPlayer: true,
        position: { x: 200, y: 340 },
        facing: "E",
        movementSpeed: 130,
        spriteWidth: 40,
        spriteHeight: 60,
      },
    ],
    objects: [],
    items: [],
    scripts: [],
    assets: [],
    display: { ...DEFAULT_DISPLAY_CONFIG },
  };
}

export function exportProjectAsJson(project: EditorProject): void {
  const exportData = { ...project, formatVersion: CURRENT_FORMAT_VERSION };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title.replace(/\s+/g, "_")}.advproject.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProjectFromJson(): Promise<EditorProject | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.advproject.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            alert("Invalid project file: expected a JSON object.");
            resolve(null);
            return;
          }

          let migrated: Record<string, unknown>;
          try {
            migrated = migrateProject(parsed as Record<string, unknown>);
          } catch (e) {
            alert(`Cannot import project: ${(e as Error).message}`);
            resolve(null);
            return;
          }

          const errors = validateProject(migrated);
          if (errors.length > 0) {
            alert(
              `Project file has validation errors:\n\n${formatValidationErrors(errors)}`
            );
            resolve(null);
            return;
          }

          const data = migrated as unknown as EditorProject;
          data.id = generateId("proj");
          data.modified = Date.now();
          resolve(data);
        } catch {
          alert("Invalid project file: could not parse JSON.");
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
