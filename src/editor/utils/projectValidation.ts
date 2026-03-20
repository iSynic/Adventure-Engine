import type { EditorProject } from "../types";

export interface ValidationError {
  path: string;
  message: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPoint(v: unknown): boolean {
  return isObject(v) && typeof v.x === "number" && typeof v.y === "number";
}

function isRect(v: unknown): boolean {
  return (
    isObject(v) &&
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.width === "number" &&
    typeof v.height === "number"
  );
}

function checkString(
  obj: Record<string, unknown>,
  field: string,
  path: string,
  errors: ValidationError[],
  required = true
): void {
  if (!(field in obj)) {
    if (required) errors.push({ path: `${path}.${field}`, message: "Missing required field" });
    return;
  }
  if (typeof obj[field] !== "string") {
    errors.push({ path: `${path}.${field}`, message: `Expected string, got ${typeof obj[field]}` });
  }
}

function checkNumber(
  obj: Record<string, unknown>,
  field: string,
  path: string,
  errors: ValidationError[],
  required = true
): void {
  if (!(field in obj)) {
    if (required) errors.push({ path: `${path}.${field}`, message: "Missing required field" });
    return;
  }
  if (typeof obj[field] !== "number") {
    errors.push({ path: `${path}.${field}`, message: `Expected number, got ${typeof obj[field]}` });
  }
}

function checkArray(
  obj: Record<string, unknown>,
  field: string,
  path: string,
  errors: ValidationError[],
  required = true
): boolean {
  if (!(field in obj)) {
    if (required) errors.push({ path: `${path}.${field}`, message: "Missing required field" });
    return false;
  }
  if (!Array.isArray(obj[field])) {
    errors.push({ path: `${path}.${field}`, message: `Expected array, got ${typeof obj[field]}` });
    return false;
  }
  return true;
}

function validateRooms(rooms: unknown[], errors: ValidationError[]): void {
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const p = `rooms[${i}]`;
    if (!isObject(room)) {
      errors.push({ path: p, message: "Expected object" });
      continue;
    }
    checkString(room, "id", p, errors);
    checkString(room, "name", p, errors);
    checkNumber(room, "width", p, errors);
    checkNumber(room, "height", p, errors);
    if (checkArray(room, "walkboxes", p, errors)) {
      for (let j = 0; j < (room.walkboxes as unknown[]).length; j++) {
        const wb = (room.walkboxes as unknown[])[j];
        const wp = `${p}.walkboxes[${j}]`;
        if (!isObject(wb)) {
          errors.push({ path: wp, message: "Expected object" });
          continue;
        }
        checkString(wb, "id", wp, errors);
        if (checkArray(wb, "polygon", wp, errors)) {
          for (let k = 0; k < (wb.polygon as unknown[]).length; k++) {
            if (!isPoint((wb.polygon as unknown[])[k])) {
              errors.push({ path: `${wp}.polygon[${k}]`, message: "Expected {x, y} point" });
            }
          }
        }
      }
    }
    if ("exits" in room && Array.isArray(room.exits)) {
      for (let j = 0; j < room.exits.length; j++) {
        const exit = room.exits[j];
        const ep = `${p}.exits[${j}]`;
        if (!isObject(exit)) {
          errors.push({ path: ep, message: "Expected object" });
          continue;
        }
        checkString(exit, "id", ep, errors);
        checkString(exit, "targetRoomId", ep, errors);
        if ("bounds" in exit && !isRect(exit.bounds)) {
          errors.push({ path: `${ep}.bounds`, message: "Expected {x, y, width, height} rect" });
        }
      }
    }
    if ("hotspots" in room && Array.isArray(room.hotspots)) {
      for (let j = 0; j < room.hotspots.length; j++) {
        const hs = room.hotspots[j];
        const hp = `${p}.hotspots[${j}]`;
        if (!isObject(hs)) {
          errors.push({ path: hp, message: "Expected object" });
          continue;
        }
        checkString(hs, "id", hp, errors);
        checkString(hs, "name", hp, errors);
        if ("bounds" in hs && !isRect(hs.bounds)) {
          errors.push({ path: `${hp}.bounds`, message: "Expected {x, y, width, height} rect" });
        }
      }
    }
    if ("spawnPoints" in room && Array.isArray(room.spawnPoints)) {
      for (let j = 0; j < room.spawnPoints.length; j++) {
        const sp = room.spawnPoints[j];
        const spp = `${p}.spawnPoints[${j}]`;
        if (!isObject(sp)) {
          errors.push({ path: spp, message: "Expected object" });
          continue;
        }
        checkString(sp, "id", spp, errors);
        checkNumber(sp, "x", spp, errors);
        checkNumber(sp, "y", spp, errors);
      }
    }
  }
}

function validateActors(actors: unknown[], errors: ValidationError[]): void {
  for (let i = 0; i < actors.length; i++) {
    const actor = actors[i];
    const p = `actors[${i}]`;
    if (!isObject(actor)) {
      errors.push({ path: p, message: "Expected object" });
      continue;
    }
    checkString(actor, "id", p, errors);
    checkString(actor, "name", p, errors);
  }
}

function validateObjects(objects: unknown[], errors: ValidationError[]): void {
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const p = `objects[${i}]`;
    if (!isObject(obj)) {
      errors.push({ path: p, message: "Expected object" });
      continue;
    }
    checkString(obj, "id", p, errors);
    checkString(obj, "name", p, errors);
  }
}

function validateItems(items: unknown[], errors: ValidationError[]): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const p = `items[${i}]`;
    if (!isObject(item)) {
      errors.push({ path: p, message: "Expected object" });
      continue;
    }
    checkString(item, "id", p, errors);
    checkString(item, "name", p, errors);
  }
}

function validateScripts(scripts: unknown[], errors: ValidationError[]): void {
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    const p = `scripts[${i}]`;
    if (!isObject(script)) {
      errors.push({ path: p, message: "Expected object" });
      continue;
    }
    checkString(script, "name", p, errors);
    checkString(script, "body", p, errors);
  }
}

function validateAssets(assets: unknown[], errors: ValidationError[]): void {
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const p = `assets[${i}]`;
    if (!isObject(asset)) {
      errors.push({ path: p, message: "Expected object" });
      continue;
    }
    checkString(asset, "id", p, errors);
    checkString(asset, "name", p, errors);
    checkString(asset, "dataUrl", p, errors);
    checkString(asset, "type", p, errors);
    checkNumber(asset, "width", p, errors);
    checkNumber(asset, "height", p, errors);
  }
}

function validateDialogueTrees(trees: unknown[], errors: ValidationError[]): void {
  for (let i = 0; i < trees.length; i++) {
    const tree = trees[i];
    const p = `dialogueTrees[${i}]`;
    if (!isObject(tree)) {
      errors.push({ path: p, message: "Expected object" });
      continue;
    }
    checkString(tree, "id", p, errors);
    checkString(tree, "name", p, errors);
    checkString(tree, "startNodeId", p, errors);
    if (checkArray(tree, "nodes", p, errors)) {
      for (let j = 0; j < (tree.nodes as unknown[]).length; j++) {
        const node = (tree.nodes as unknown[])[j];
        const np = `${p}.nodes[${j}]`;
        if (!isObject(node)) {
          errors.push({ path: np, message: "Expected object" });
          continue;
        }
        checkString(node, "id", np, errors);
        checkString(node, "speaker", np, errors);
        checkString(node, "text", np, errors);
      }
    }
  }
}

export function validateProject(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  checkNumber(data, "formatVersion", "root", errors);
  checkString(data, "id", "root", errors);
  checkString(data, "title", "root", errors);
  checkNumber(data, "created", "root", errors);
  checkNumber(data, "modified", "root", errors);
  checkString(data, "startingRoom", "root", errors);
  checkString(data, "defaultPlayerActorId", "root", errors);

  if (!("defaultPlayerPosition" in data)) {
    errors.push({ path: "root.defaultPlayerPosition", message: "Missing required field" });
  } else if (!isPoint(data.defaultPlayerPosition)) {
    errors.push({ path: "root.defaultPlayerPosition", message: "Expected {x, y} point" });
  }

  if (checkArray(data, "verbs", "root", errors)) {
    for (let i = 0; i < (data.verbs as unknown[]).length; i++) {
      if (typeof (data.verbs as unknown[])[i] !== "string") {
        errors.push({ path: `verbs[${i}]`, message: "Expected string" });
      }
    }
  }

  if (checkArray(data, "rooms", "root", errors)) {
    validateRooms(data.rooms as unknown[], errors);
  }
  if (checkArray(data, "actors", "root", errors)) {
    validateActors(data.actors as unknown[], errors);
  }
  if (checkArray(data, "objects", "root", errors)) {
    validateObjects(data.objects as unknown[], errors);
  }
  if (checkArray(data, "items", "root", errors)) {
    validateItems(data.items as unknown[], errors);
  }
  if (checkArray(data, "scripts", "root", errors)) {
    validateScripts(data.scripts as unknown[], errors);
  }
  if (checkArray(data, "assets", "root", errors)) {
    validateAssets(data.assets as unknown[], errors);
  }

  if ("dialogueTrees" in data && data.dialogueTrees != null) {
    if (!Array.isArray(data.dialogueTrees)) {
      errors.push({ path: "root.dialogueTrees", message: `Expected array, got ${typeof data.dialogueTrees}` });
    } else {
      validateDialogueTrees(data.dialogueTrees, errors);
    }
  }

  if (!("startingItems" in data)) {
    errors.push({ path: "root.startingItems", message: "Missing required field" });
  } else if (!Array.isArray(data.startingItems)) {
    errors.push({ path: "root.startingItems", message: `Expected array, got ${typeof data.startingItems}` });
  } else {
    for (let i = 0; i < data.startingItems.length; i++) {
      if (typeof data.startingItems[i] !== "string") {
        errors.push({ path: `startingItems[${i}]`, message: "Expected string" });
      }
    }
  }

  return errors;
}

export function formatValidationErrors(errors: ValidationError[], maxShow = 5): string {
  if (errors.length === 0) return "";
  const shown = errors.slice(0, maxShow);
  const lines = shown.map((e) => `• ${e.path}: ${e.message}`);
  if (errors.length > maxShow) {
    lines.push(`…and ${errors.length - maxShow} more error(s).`);
  }
  return lines.join("\n");
}

export type { EditorProject };
