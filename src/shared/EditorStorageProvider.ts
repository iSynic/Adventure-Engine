import type { EditorProject, EditorProjectMeta } from "../editor/types";

/** Editor-only storage: project CRUD and asset management. */
export interface EditorStorageProvider {
  listProjectMetas(): EditorProjectMeta[];

  loadProject(id: string): EditorProject | null;

  saveProject(project: EditorProject): void;

  deleteProject(id: string): void;

  getAssetUrl(projectId: string, assetId: string, dataUrl: string): string;

  saveAssetData(projectId: string, assetId: string, dataUrl: string): void;

  loadAssetData(projectId: string, assetId: string): string | null;

  deleteAssetData(projectId: string, assetId: string): void;

  listAssetIds(projectId: string): string[];
}
