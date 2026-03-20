import { CURRENT_FORMAT_VERSION } from "./projectStorage";

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, MigrationFn> = {
  0: (data) => {
    data.formatVersion = 1;
    return data;
  },
  1: (data) => {
    const trees = data.dialogueTrees as Array<Record<string, unknown>> | undefined;
    if (trees) {
      for (const tree of trees) {
        const nodes = tree.nodes as Array<Record<string, unknown>> | undefined;
        if (!nodes) continue;
        const positions: Record<string, { x: number; y: number }> = {};
        for (const node of nodes) {
          if (typeof node.x === "number" && typeof node.y === "number") {
            positions[node.id as string] = { x: node.x, y: node.y };
            delete node.x;
            delete node.y;
          }
        }
        if (Object.keys(positions).length > 0) {
          tree.nodePositions = positions;
        }
      }
    }
    data.formatVersion = 2;
    return data;
  },
};

export function detectVersion(data: Record<string, unknown>): number {
  if (typeof data.formatVersion === "number") {
    return data.formatVersion;
  }
  if ("formatVersion" in data && typeof data.formatVersion !== "number") {
    throw new Error(
      `Invalid formatVersion: expected a number, got ${typeof data.formatVersion}.`
    );
  }
  return 0;
}

export function migrateProject(raw: Record<string, unknown>): Record<string, unknown> {
  let version = detectVersion(raw);

  if (version > CURRENT_FORMAT_VERSION) {
    throw new Error(
      `Project format version ${version} is newer than this editor supports (v${CURRENT_FORMAT_VERSION}). Please update the editor.`
    );
  }

  while (version < CURRENT_FORMAT_VERSION) {
    const migrationFn = migrations[version];
    if (!migrationFn) {
      throw new Error(
        `No migration available from format version ${version} to ${version + 1}.`
      );
    }
    raw = migrationFn(raw);
    version = detectVersion(raw);
  }

  return raw;
}
