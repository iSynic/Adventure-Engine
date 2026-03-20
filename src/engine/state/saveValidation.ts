import type { SaveGameData, SaveLoadResult } from "../core/types";
import { SAVE_SCHEMA_VERSION } from "../core/types";

interface ValidationError {
  valid: false;
  error: string;
  code: "INVALID_JSON" | "MISSING_FIELDS" | "UNKNOWN_VERSION" | "CORRUPT_STATE";
}

interface ValidationOk {
  valid: true;
}

type ValidationResult = ValidationOk | ValidationError;

function fail(error: string, code: ValidationError["code"]): ValidationError {
  return { valid: false, error, code };
}

function ok(): ValidationOk {
  return { valid: true };
}

function validateStateStructure(state: Record<string, unknown>): ValidationResult {
  if (typeof state.currentRoomId !== "string") {
    return fail("state.currentRoomId must be a string.", "CORRUPT_STATE");
  }

  const objectFields: Array<[string, string]> = [
    ["flags", "state.flags"],
    ["variables", "state.variables"],
    ["actors", "state.actors"],
    ["objects", "state.objects"],
    ["rooms", "state.rooms"],
    ["inventory", "state.inventory"],
    ["objectStates", "state.objectStates"],
    ["objectLocations", "state.objectLocations"],
    ["actorPositions", "state.actorPositions"],
    ["actorFacing", "state.actorFacing"],
  ];
  for (const [key, label] of objectFields) {
    if (state[key] !== undefined && state[key] !== null && typeof state[key] !== "object") {
      return fail(`${label} must be an object if present.`, "CORRUPT_STATE");
    }
  }

  if (state.visitedRooms !== undefined && !Array.isArray(state.visitedRooms)) {
    return fail("state.visitedRooms must be an array if present.", "CORRUPT_STATE");
  }

  if (state.camera !== undefined && state.camera !== null) {
    if (typeof state.camera !== "object") {
      return fail("state.camera must be an object if present.", "CORRUPT_STATE");
    }
    const cam = state.camera as Record<string, unknown>;
    if (typeof cam.x !== "number" || typeof cam.y !== "number") {
      return fail("state.camera must have numeric x and y.", "CORRUPT_STATE");
    }
  }

  if (state.dialogue !== undefined && state.dialogue !== null) {
    if (typeof state.dialogue !== "object") {
      return fail("state.dialogue must be an object if present.", "CORRUPT_STATE");
    }
  }

  if (state.dialogueSeen !== undefined && state.dialogueSeen !== null) {
    if (typeof state.dialogueSeen !== "object") {
      return fail("state.dialogueSeen must be an object if present.", "CORRUPT_STATE");
    }
  }

  return ok();
}

export function validateSaveData(raw: unknown): SaveLoadResult {
  if (raw === null || raw === undefined) {
    return { ok: false, error: "Save data is null or undefined.", code: "MISSING_FIELDS" };
  }
  if (typeof raw !== "object") {
    return { ok: false, error: "Save data is not an object.", code: "CORRUPT_STATE" };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.saveVersion !== undefined && typeof obj.saveVersion !== "number") {
    return { ok: false, error: `Invalid 'saveVersion': expected a number, got ${typeof obj.saveVersion}.`, code: "CORRUPT_STATE" };
  }

  const version = typeof obj.saveVersion === "number" ? obj.saveVersion : 0;
  if (version > SAVE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Save version ${version} is newer than supported version ${SAVE_SCHEMA_VERSION}. Update the engine to load this save.`,
      code: "UNKNOWN_VERSION",
    };
  }

  if (typeof obj.saveId !== "string" || !obj.saveId) {
    return { ok: false, error: "Missing or invalid 'saveId'.", code: "MISSING_FIELDS" };
  }
  if (typeof obj.timestamp !== "number" || obj.timestamp <= 0) {
    return { ok: false, error: "Missing or invalid 'timestamp'.", code: "MISSING_FIELDS" };
  }
  if (typeof obj.gameId !== "string") {
    return { ok: false, error: "Missing or invalid 'gameId'.", code: "MISSING_FIELDS" };
  }
  if (typeof obj.currentRoomId !== "string") {
    return { ok: false, error: "Missing or invalid 'currentRoomId'.", code: "MISSING_FIELDS" };
  }

  if (obj.playerPosition === null || typeof obj.playerPosition !== "object") {
    return { ok: false, error: "Missing or invalid 'playerPosition'.", code: "MISSING_FIELDS" };
  }
  const pos = obj.playerPosition as Record<string, unknown>;
  if (typeof pos.x !== "number" || typeof pos.y !== "number") {
    return { ok: false, error: "'playerPosition' must have numeric x and y.", code: "CORRUPT_STATE" };
  }

  if (typeof obj.playerFacing !== "string") {
    return { ok: false, error: "Missing or invalid 'playerFacing'.", code: "MISSING_FIELDS" };
  }

  if (obj.state === null || typeof obj.state !== "object") {
    return { ok: false, error: "Missing or invalid 'state' object.", code: "CORRUPT_STATE" };
  }

  const stateCheck = validateStateStructure(obj.state as Record<string, unknown>);
  if (!stateCheck.valid) {
    return { ok: false, error: stateCheck.error, code: stateCheck.code };
  }

  return { ok: true, data: raw as SaveGameData };
}

export function migrateSaveData(data: SaveGameData): SaveGameData {
  const version = data.saveVersion ?? 0;
  const migrated = { ...data };

  if (version < 1) {
    migrated.saveVersion = 1;
    if (!migrated.engineVersion) migrated.engineVersion = "unknown";
    if (!migrated.roomName) migrated.roomName = migrated.currentRoomId ?? "";
    if (!migrated.summary) migrated.summary = "";
  }

  return migrated;
}

export function parseSaveJSON(jsonString: string): SaveLoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Invalid JSON: ${msg}`, code: "INVALID_JSON" };
  }

  const validation = validateSaveData(raw);
  if (!validation.ok) return validation;

  const migrated = migrateSaveData(validation.data);
  return { ok: true, data: migrated };
}
