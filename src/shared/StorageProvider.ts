import type { EditorStorageProvider } from "./EditorStorageProvider";
import type { RuntimeStorageProvider } from "./RuntimeStorageProvider";

export type { EditorStorageProvider } from "./EditorStorageProvider";
export type { RuntimeStorageProvider } from "./RuntimeStorageProvider";

/**
 * Combined storage interface for hosts that provide both editor project
 * persistence and runtime save-game persistence (e.g. LocalStorageProvider).
 *
 * Runtime-only consumers should depend on RuntimeStorageProvider instead,
 * and editor-only consumers on EditorStorageProvider. This union exists
 * for backward compatibility and convenience in providers that implement both.
 */
export interface StorageProvider extends EditorStorageProvider, RuntimeStorageProvider {}
