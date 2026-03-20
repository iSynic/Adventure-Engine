/**
 * EXPORT PACKAGE CONTRACT — Types here define the serialized game package
 * format written to disk or served over the network. ExportManifest is the
 * top-level descriptor; Exported* aliases reference the engine's runtime
 * types since export data is consumed directly by the runtime loader.
 * Changes here affect the on-disk format and must be versioned via
 * EXPORT_SCHEMA_VERSION.
 */
import type {
  VerbType,
  VerbCursorMap,
  Point,
  UISettings,
  RoomDefinition,
  ActorDefinition,
  ObjectDefinition,
  ItemDefinition,
  DialogueTree,
} from "../engine/core/types";

import type { DisplayConfig } from "./displayConfig";
export type { DisplayConfig, ScalingMode, ViewportAlignment } from "./displayConfig";
export { DEFAULT_DISPLAY_CONFIG, resolveDisplayConfig } from "./displayConfig";

import type { OverlayConfig } from "./overlayConfig";
export type { OverlayConfig } from "./overlayConfig";
export { resolveOverlayConfig } from "./overlayConfig";

import type { CursorConfig } from "./cursorConfig";
export type { CursorConfig } from "./cursorConfig";
export { VERB_CSS_CURSORS, DEFAULT_CURSOR_CONFIG } from "./cursorConfig";

export const EXPORT_SCHEMA_VERSION = "1.0.0";

export interface ManifestDataPaths {
  rooms: string;
  actors: string;
  objects: string;
  scripts: string;
  dialogue: string;
  inventory: string;
  project: string;
}

/** Export contract: top-level game package descriptor. Version via EXPORT_SCHEMA_VERSION. */
export interface ExportManifest {
  gameId: string;
  title: string;
  version: string;
  exportSchemaVersion: string;
  startRoomId: string;
  playerActorId: string;
  assetBasePath: string;
  data: ManifestDataPaths;
  author?: string;
  description?: string;
  icon?: string;
  display?: DisplayConfig;
  overlayConfig?: OverlayConfig;
}

export type ExportedRoom = RoomDefinition;
export type ExportedActor = ActorDefinition;
export type ExportedObject = ObjectDefinition;
export type ExportedItem = ItemDefinition;

/**
 * Export contract: compiled script entry in the serialized game package.
 * Only name and body are included — kind and steps are editor-only authoring
 * metadata and are stripped before serialization.
 */
export interface ExportedScript {
  name: string;
  body: string;
}

export interface ExportedSettings {
  verbs: VerbType[];
  uiSettings?: UISettings;
  verbCursors?: VerbCursorMap;
  defaultPlayerPosition?: Point;
  startingItems?: string[];
  globalFallbackScriptId?: string;
  display?: DisplayConfig;
  overlayConfig?: OverlayConfig;
  cursorConfig?: CursorConfig;
}

export interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
