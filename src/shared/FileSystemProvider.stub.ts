import type { StorageProvider } from "./StorageProvider";
import type { EditorProject, EditorProjectMeta } from "../editor/types";
import type { SaveGameData } from "../engine/core/types";

/**
 * FileSystemProvider — Skeleton for the Tauri desktop launcher.
 *
 * Implement each method using Tauri's IPC commands and filesystem APIs:
 *   - `window.__TAURI__.invoke(...)` for custom Rust commands
 *   - `@tauri-apps/api/fs` for readTextFile / writeTextFile
 *   - `@tauri-apps/api/path` for resolving directories
 *
 * Recommended project folder structure on disk:
 *   <projectRoot>/
 *     project.json          ← Full EditorProject (minus embedded asset data)
 *     assets/
 *       backgrounds/        ← Background images
 *       sprites/            ← Sprite sheets / individual sprites
 *       icons/              ← Inventory icons
 *       audio/              ← Sound effects and music
 *     saves/
 *       quicksave.json      ← Save game slots
 *       slot_1.json
 *
 * Asset handling strategy:
 *   In the web version, assets are stored as base64 data URLs inside the project JSON.
 *   For the filesystem provider, assets should be stored as separate files in the
 *   assets/ directory. The `dataUrl` field in EditorAsset should contain a relative
 *   file path (e.g., "assets/backgrounds/farmyard_gate.png") which the provider
 *   resolves to an absolute path or a Tauri asset protocol URL via getAssetUrl().
 *
 * getAssetUrl() resolution:
 *   Convert the relative asset path to a Tauri `asset://` protocol URL or
 *   `convertFileSrc()` result that the webview can render.
 *   Example: `getAssetUrl("bork", "bg-1", "assets/backgrounds/farmyard.png")`
 *     → `"asset://localhost/<projectsRoot>/bork/assets/backgrounds/farmyard.png"`
 */
export class FileSystemProvider implements StorageProvider {
  private projectsRoot: string;

  constructor(projectsRoot: string) {
    this.projectsRoot = projectsRoot;
  }

  listProjectMetas(): EditorProjectMeta[] {
    // TODO: Scan projectsRoot for subdirectories containing project.json
    // For each, read project.json and extract { id, title, created, modified, roomCount }
    // Return as EditorProjectMeta[]
    throw new Error("FileSystemProvider.listProjectMetas not implemented");
  }

  loadProject(id: string): EditorProject | null {
    // TODO: Read <projectsRoot>/<id>/project.json
    // Parse JSON and return as EditorProject
    // Run migrateProject() if needed (import from editor/utils/projectMigration)
    throw new Error("FileSystemProvider.loadProject not implemented");
  }

  saveProject(project: EditorProject): void {
    // TODO: Write project to <projectsRoot>/<project.id>/project.json
    // For assets with data: URLs, extract the binary data and write to
    // assets/<type>/<filename>, then replace the dataUrl with the relative path
    // Update the project's modified timestamp
    throw new Error("FileSystemProvider.saveProject not implemented");
  }

  deleteProject(id: string): void {
    // TODO: Remove the entire <projectsRoot>/<id>/ directory
    throw new Error("FileSystemProvider.deleteProject not implemented");
  }

  getAssetUrl(_projectId: string, _assetId: string, dataUrl: string): string {
    // TODO: Resolve relative asset path to a Tauri asset protocol URL.
    // If dataUrl starts with "data:", return it unchanged (inline asset).
    // Otherwise, treat it as a relative path and convert:
    //   `convertFileSrc(`${this.projectsRoot}/${projectId}/${dataUrl}`)`
    // or use Tauri's asset:// protocol.
    throw new Error("FileSystemProvider.getAssetUrl not implemented");
  }

  saveAssetData(_projectId: string, _assetId: string, _dataUrl: string): void {
    // TODO: If dataUrl is a data: URL, decode base64 and write binary file
    // to <projectsRoot>/<projectId>/assets/<assetId>.<ext>
    // If dataUrl is already a relative path, no-op.
    throw new Error("FileSystemProvider.saveAssetData not implemented");
  }

  loadAssetData(_projectId: string, _assetId: string): string | null {
    // TODO: Read the asset file from disk and return as a data: URL,
    // or return the relative file path for use with getAssetUrl().
    throw new Error("FileSystemProvider.loadAssetData not implemented");
  }

  deleteAssetData(_projectId: string, _assetId: string): void {
    // TODO: Remove the asset file from <projectsRoot>/<projectId>/assets/
    throw new Error("FileSystemProvider.deleteAssetData not implemented");
  }

  listAssetIds(projectId: string): string[] {
    // TODO: List all files in <projectsRoot>/<projectId>/assets/ recursively
    // Return asset IDs (filenames without path prefix)
    void projectId;
    throw new Error("FileSystemProvider.listAssetIds not implemented");
  }

  saveGameState(gameId: string, slotId: string, data: SaveGameData): void {
    // TODO: Write data as JSON to <projectsRoot>/<gameId>/saves/<slotId>.json
    // Create the saves/ directory if it doesn't exist
    void gameId; void slotId; void data;
    throw new Error("FileSystemProvider.saveGameState not implemented");
  }

  loadGameState(gameId: string, slotId: string): SaveGameData | null {
    // TODO: Read <projectsRoot>/<gameId>/saves/<slotId>.json
    // Return null if file doesn't exist
    void gameId; void slotId;
    throw new Error("FileSystemProvider.loadGameState not implemented");
  }

  listGameSaves(gameId: string): SaveGameData[] {
    // TODO: List all .json files in <projectsRoot>/<gameId>/saves/
    // Parse each and return sorted by timestamp (newest first)
    void gameId;
    throw new Error("FileSystemProvider.listGameSaves not implemented");
  }

  deleteGameSave(gameId: string, slotId: string): void {
    // TODO: Remove <projectsRoot>/<gameId>/saves/<slotId>.json
    void gameId; void slotId;
    throw new Error("FileSystemProvider.deleteGameSave not implemented");
  }

  hasGameSave(gameId: string, slotId: string): boolean {
    // TODO: Check if <projectsRoot>/<gameId>/saves/<slotId>.json exists
    // Use Tauri's file_exists command or fs.exists
    void gameId; void slotId;
    throw new Error("FileSystemProvider.hasGameSave not implemented");
  }
}
