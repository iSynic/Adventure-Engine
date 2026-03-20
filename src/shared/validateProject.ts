import type {
  RoomDefinition,
  ActorDefinition,
  ObjectDefinition,
  ItemDefinition,
  VerbType,
  VerbCursorMap,
  Point,
  UISettings,
  DialogueTree,
  ScriptStep,
  ConditionExpression,
  VariableDefinition,
  StateWatcherDefinition,
} from "../engine/core/types";
import type { DisplayConfig } from "./displayConfig";
import type { OverlayConfig } from "./overlayConfig";
import type { ValidationResult, ValidationError } from "./exportSchema";

export interface ValidatableProject {
  id: string;
  title: string;
  startingRoom: string;
  defaultPlayerActorId: string;
  defaultPlayerPosition: Point;
  startingItems: string[];
  verbs: VerbType[];
  rooms: RoomDefinition[];
  actors: ActorDefinition[];
  objects: ObjectDefinition[];
  items: ItemDefinition[];
  scripts: { name: string; body: string; steps?: ScriptStep[] }[];
  assets: { id: string; dataUrl: string; type?: "background" | "sprite" | "icon" | "audio" | "other" }[];
  dialogueTrees?: DialogueTree[];
  uiSettings?: UISettings;
  verbCursors?: VerbCursorMap;
  globalFallbackScriptId?: string;
  variableDefinitions?: VariableDefinition[];
  stateWatchers?: StateWatcherDefinition[];
  display?: DisplayConfig;
  overlayConfig?: OverlayConfig;
}

interface ValidationContext {
  roomIds: Set<string>;
  actorIds: Set<string>;
  objectIds: Set<string>;
  itemIds: Set<string>;
  scriptNames: Set<string>;
  assetIds: Set<string>;
  assetDataUrls: Set<string>;
  dialogueTrees: ValidatableProject["dialogueTrees"];
  dialogueTreeIds: Set<string>;
  dialogueNodeIdsByTree: Map<string, Set<string>>;
  errors: ValidationError[];
}

function isDataUrl(p: string): boolean {
  return p.startsWith("data:");
}

function isAbsoluteUrl(p: string): boolean {
  return /^https?:\/\//i.test(p);
}

function checkAssetRef(
  pathOrId: string | undefined,
  context: string,
  assetIds: Set<string>,
  assetDataUrls: Set<string>,
  errors: ValidationError[]
): void {
  if (!pathOrId) return;
  if (isDataUrl(pathOrId)) return;
  if (isAbsoluteUrl(pathOrId)) return;
  if (assetIds.has(pathOrId)) return;
  if (assetDataUrls.has(pathOrId)) return;
  errors.push({
    severity: "error",
    message: `${context}: asset reference "${pathOrId}" does not match any registered asset. Register the asset in the asset library or use a data URL.`,
  });
}

function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const item of arr) {
    if (seen.has(item)) dupes.add(item);
    seen.add(item);
  }
  return [...dupes];
}

function validateConditionExpression(
  cond: ConditionExpression,
  context: string,
  roomIds: Set<string>,
  actorIds: Set<string>,
  objectIds: Set<string>,
  itemIds: Set<string>,
  dialogueTreeIds: Set<string>,
  dialogueNodeIdsByTree: Map<string, Set<string>>,
  errors: ValidationError[],
  severity: "error" | "warning" = "warning"
): void {
  switch (cond.type) {
    case "inventory":
      if (cond.actorId && !actorIds.has(cond.actorId)) {
        errors.push({ severity, message: `${context}: condition references non-existent actor "${cond.actorId}".` });
      }
      if (cond.itemId && !itemIds.has(cond.itemId)) {
        errors.push({ severity, message: `${context}: condition references non-existent item "${cond.itemId}".` });
      }
      break;
    case "objectState":
      if (cond.objectId && !objectIds.has(cond.objectId)) {
        errors.push({ severity, message: `${context}: condition references non-existent object "${cond.objectId}".` });
      }
      break;
    case "roomVisited":
      if (cond.roomId && !roomIds.has(cond.roomId)) {
        errors.push({ severity, message: `${context}: condition references non-existent room "${cond.roomId}".` });
      }
      break;
    case "dialogueNodeSeen":
      if (cond.treeId && !dialogueTreeIds.has(cond.treeId)) {
        errors.push({ severity, message: `${context}: condition references non-existent dialogue tree "${cond.treeId}".` });
      } else if (cond.treeId && cond.nodeId) {
        const nodeSet = dialogueNodeIdsByTree.get(cond.treeId);
        if (nodeSet && !nodeSet.has(cond.nodeId)) {
          errors.push({ severity, message: `${context}: condition references non-existent node "${cond.nodeId}" in dialogue tree "${cond.treeId}".` });
        }
      }
      break;
    case "hasTag":
      if (cond.objectId && !objectIds.has(cond.objectId)) {
        errors.push({ severity, message: `${context}: condition references non-existent object "${cond.objectId}".` });
      }
      break;
    case "and":
      for (let i = 0; i < cond.conditions.length; i++) {
        validateConditionExpression(cond.conditions[i], context, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors, severity);
      }
      break;
    case "or":
      for (let i = 0; i < cond.conditions.length; i++) {
        validateConditionExpression(cond.conditions[i], context, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors, severity);
      }
      break;
    case "not":
      validateConditionExpression(cond.condition, context, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors, severity);
      break;
  }
}

function validateScriptSteps(
  steps: ScriptStep[],
  scriptName: string,
  roomIds: Set<string>,
  actorIds: Set<string>,
  objectIds: Set<string>,
  itemIds: Set<string>,
  scriptNames: Set<string>,
  dialogueTreeIds: Set<string>,
  errors: ValidationError[]
): void {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const ctx = `Script "${scriptName}" step ${i} (${step.type})`;

    switch (step.type) {
      case "gotoRoom":
        if (step.roomId && !roomIds.has(step.roomId)) {
          errors.push({ severity: "error", message: `${ctx}: references non-existent room "${step.roomId}".` });
        }
        break;
      case "sayBlocking":
      case "walkActorTo":
      case "faceActor":
      case "playAnimation":
        if ("actorId" in step && step.actorId && !actorIds.has(step.actorId)) {
          errors.push({ severity: "error", message: `${ctx}: references non-existent actor "${step.actorId}".` });
        }
        break;
      case "giveItem":
      case "removeItem":
        if (step.actorId && !actorIds.has(step.actorId)) {
          errors.push({ severity: "error", message: `${ctx}: references non-existent actor "${step.actorId}".` });
        }
        if (step.itemId && !itemIds.has(step.itemId)) {
          errors.push({ severity: "error", message: `${ctx}: references non-existent item "${step.itemId}".` });
        }
        break;
      case "setObjectState":
      case "setObjectPrimaryState":
        if ("objectId" in step && step.objectId && !objectIds.has(step.objectId)) {
          errors.push({ severity: "error", message: `${ctx}: references non-existent object "${step.objectId}".` });
        }
        break;
      case "startDialogue":
        if (step.treeId && !dialogueTreeIds.has(step.treeId)) {
          errors.push({ severity: "error", message: `${ctx}: references non-existent dialogue tree "${step.treeId}".` });
        }
        break;
      case "scheduleScript":
        if (step.scriptId && !scriptNames.has(step.scriptId)) {
          errors.push({ severity: "error", message: `${ctx}: references non-existent script "${step.scriptId}".` });
        }
        break;
      case "setRoomVar":
        if (step.roomId && !roomIds.has(step.roomId)) {
          errors.push({ severity: "error", message: `${ctx}: references non-existent room "${step.roomId}".` });
        }
        break;
      case "if":
        if (step.thenSteps) {
          validateScriptSteps(step.thenSteps, scriptName, roomIds, actorIds, objectIds, itemIds, scriptNames, dialogueTreeIds, errors);
        }
        if (step.elseSteps) {
          validateScriptSteps(step.elseSteps, scriptName, roomIds, actorIds, objectIds, itemIds, scriptNames, dialogueTreeIds, errors);
        }
        break;
    }
  }
}

// ─── Per-entity validators ────────────────────────────────────────────────────

function validateRooms(rooms: RoomDefinition[], ctx: ValidationContext): void {
  const { roomIds, actorIds, objectIds, itemIds, scriptNames, assetIds, assetDataUrls, errors } = ctx;
  for (const room of rooms) {
    if (!room.width || room.width <= 0) {
      errors.push({ severity: "warning", message: `Room "${room.name}": width is missing or zero. Set explicit room dimensions in Room Settings.` });
    }
    if (!room.height || room.height <= 0) {
      errors.push({ severity: "warning", message: `Room "${room.name}": height is missing or zero. Set explicit room dimensions in Room Settings.` });
    }
    if (room.exits) {
      for (const exit of room.exits) {
        if (!roomIds.has(exit.targetRoomId)) {
          errors.push({ severity: "error", message: `Room "${room.name}": exit "${exit.id}" targets non-existent room "${exit.targetRoomId}".` });
        }
        if (exit.targetSpawnPointId) {
          const targetRoom = rooms.find((r) => r.id === exit.targetRoomId);
          if (targetRoom) {
            const spawn = targetRoom.spawnPoints?.find((s) => s.id === exit.targetSpawnPointId);
            if (!spawn) {
              errors.push({ severity: "error", message: `Room "${room.name}": exit "${exit.id}" references non-existent spawn point "${exit.targetSpawnPointId}" in room "${targetRoom.name}".` });
            }
          }
        }
      }
    }
    if (room.actorIds) {
      for (const actorId of room.actorIds) {
        if (!actorIds.has(actorId)) {
          errors.push({ severity: "error", message: `Room "${room.name}": references non-existent actor "${actorId}".` });
        }
      }
    }
    if (room.objectIds) {
      for (const objectId of room.objectIds) {
        if (!objectIds.has(objectId)) {
          errors.push({ severity: "error", message: `Room "${room.name}": references non-existent object "${objectId}".` });
        }
      }
    }
    for (const hookName of ["onEnter", "onExit", "onUpdate"] as const) {
      const scriptRef = room[hookName];
      if (scriptRef && !scriptNames.has(scriptRef)) {
        errors.push({ severity: "error", message: `Room "${room.name}": ${hookName} references non-existent script "${scriptRef}".` });
      }
    }
    if (room.hotspots) {
      for (const hs of room.hotspots) {
        if (hs.verbHandlers) {
          for (const [verb, scriptName] of Object.entries(hs.verbHandlers)) {
            if (scriptName && !scriptNames.has(scriptName)) {
              errors.push({ severity: "warning", message: `Room "${room.name}", hotspot "${hs.name}": verb handler "${verb}" references non-existent script "${scriptName}".` });
            }
          }
        }
        if (hs.useWithHandlers) {
          for (const [targetItemId, scriptName] of Object.entries(hs.useWithHandlers)) {
            if (!itemIds.has(targetItemId)) {
              errors.push({ severity: "warning", message: `Room "${room.name}", hotspot "${hs.name}": use-with handler references non-existent item "${targetItemId}".` });
            }
            if (scriptName && !scriptNames.has(scriptName)) {
              errors.push({ severity: "warning", message: `Room "${room.name}", hotspot "${hs.name}": use-with handler for "${targetItemId}" references non-existent script "${scriptName}".` });
            }
          }
        }
        if (hs.fallbackScriptId && !scriptNames.has(hs.fallbackScriptId)) {
          errors.push({ severity: "warning", message: `Room "${room.name}", hotspot "${hs.name}": fallback script "${hs.fallbackScriptId}" does not exist.` });
        }
      }
    }
    if (!room.backgroundPath) {
      errors.push({ severity: "warning", message: `Room "${room.name}": no background image set — players will see a black screen in this room.` });
    } else {
      checkAssetRef(room.backgroundPath, `Room "${room.name}" background`, assetIds, assetDataUrls, errors);
    }
    if (room.maskPath) {
      checkAssetRef(room.maskPath, `Room "${room.name}" mask`, assetIds, assetDataUrls, errors);
    }
    if (room.ambientAudioPath) {
      checkAssetRef(room.ambientAudioPath, `Room "${room.name}" ambient audio`, assetIds, assetDataUrls, errors);
    }
    if (room.parallaxLayers) {
      for (let i = 0; i < room.parallaxLayers.length; i++) {
        const layer = room.parallaxLayers[i];
        if (layer.imagePath) {
          checkAssetRef(layer.imagePath, `Room "${room.name}" parallax layer ${i}`, assetIds, assetDataUrls, errors);
        } else {
          errors.push({ severity: "error", message: `Room "${room.name}": parallax layer ${i} has no image path.` });
        }
      }
    }
  }
}

function validateActors(actors: ActorDefinition[], ctx: ValidationContext): void {
  const { roomIds, actorIds, itemIds, scriptNames, assetIds, assetDataUrls, errors, dialogueTrees } = ctx;
  for (const actor of actors) {
    if (actor.defaultRoomId && !roomIds.has(actor.defaultRoomId)) {
      errors.push({ severity: "error", message: `Actor "${actor.name}": default room "${actor.defaultRoomId}" does not exist.` });
    }
    if (actor.spritePath) {
      checkAssetRef(actor.spritePath, `Actor "${actor.name}" sprite`, assetIds, assetDataUrls, errors);
    }
    if (actor.animations) {
      for (const [dir, states] of Object.entries(actor.animations)) {
        for (const [state, anim] of Object.entries(states)) {
          if (anim?.frames) {
            for (let i = 0; i < anim.frames.length; i++) {
              const frame = anim.frames[i];
              if (frame.imagePath) {
                checkAssetRef(frame.imagePath, `Actor "${actor.name}" animation ${dir}/${state} frame ${i}`, assetIds, assetDataUrls, errors);
              } else {
                errors.push({ severity: "error", message: `Actor "${actor.name}": animation ${dir}/${state} frame ${i} has no image path.` });
              }
            }
          }
        }
      }
    }
    if (actor.verbHandlers) {
      for (const [verb, scriptName] of Object.entries(actor.verbHandlers)) {
        if (scriptName && !scriptNames.has(scriptName)) {
          errors.push({ severity: "warning", message: `Actor "${actor.name}": verb handler "${verb}" references non-existent script "${scriptName}".` });
        }
      }
    }
    if (actor.useWithHandlers) {
      for (const [targetItemId, scriptName] of Object.entries(actor.useWithHandlers)) {
        if (!itemIds.has(targetItemId)) {
          errors.push({ severity: "warning", message: `Actor "${actor.name}": use-with handler references non-existent item "${targetItemId}".` });
        }
        if (scriptName && !scriptNames.has(scriptName)) {
          errors.push({ severity: "warning", message: `Actor "${actor.name}": use-with handler for "${targetItemId}" references non-existent script "${scriptName}".` });
        }
      }
    }
    if (actor.fallbackScriptId && !scriptNames.has(actor.fallbackScriptId)) {
      errors.push({ severity: "warning", message: `Actor "${actor.name}": fallback script "${actor.fallbackScriptId}" does not exist.` });
    }
    if (actor.dialogueId && dialogueTrees) {
      const tree = dialogueTrees.find((t) => t.id === actor.dialogueId);
      if (!tree) {
        errors.push({ severity: "warning", message: `Actor "${actor.name}": dialogueId "${actor.dialogueId}" does not match any dialogue tree.` });
      }
    }
  }
}

function validateObjects(objects: ObjectDefinition[], ctx: ValidationContext): void {
  const { roomIds, itemIds, scriptNames, assetIds, assetDataUrls, errors } = ctx;
  for (const obj of objects) {
    if (obj.roomId && !roomIds.has(obj.roomId)) {
      errors.push({ severity: "error", message: `Object "${obj.name}": room "${obj.roomId}" does not exist.` });
    }
    if (obj.spritePath) {
      checkAssetRef(obj.spritePath, `Object "${obj.name}" sprite`, assetIds, assetDataUrls, errors);
    }
    if (obj.stateSprites) {
      for (let i = 0; i < obj.stateSprites.length; i++) {
        const entry = obj.stateSprites[i];
        if (entry.spritePath) {
          checkAssetRef(entry.spritePath, `Object "${obj.name}" state sprite ${i} (${entry.stateKey}=${entry.stateValue})`, assetIds, assetDataUrls, errors);
        } else {
          errors.push({ severity: "error", message: `Object "${obj.name}": state sprite ${i} (${entry.stateKey}=${entry.stateValue}) has no sprite path.` });
        }
      }
    }
    if (obj.verbHandlers) {
      for (const [verb, scriptName] of Object.entries(obj.verbHandlers)) {
        if (scriptName && !scriptNames.has(scriptName)) {
          errors.push({ severity: "warning", message: `Object "${obj.name}": verb handler "${verb}" references non-existent script "${scriptName}".` });
        }
      }
    }
    if (obj.useWithHandlers) {
      for (const [targetItemId, scriptName] of Object.entries(obj.useWithHandlers)) {
        if (!itemIds.has(targetItemId)) {
          errors.push({ severity: "warning", message: `Object "${obj.name}": use-with handler references non-existent item "${targetItemId}".` });
        }
        if (scriptName && !scriptNames.has(scriptName)) {
          errors.push({ severity: "warning", message: `Object "${obj.name}": use-with handler for "${targetItemId}" references non-existent script "${scriptName}".` });
        }
      }
    }
    if (obj.fallbackScriptId && !scriptNames.has(obj.fallbackScriptId)) {
      errors.push({ severity: "warning", message: `Object "${obj.name}": fallback script "${obj.fallbackScriptId}" does not exist.` });
    }
  }
}

function validateItems(items: ItemDefinition[], ctx: ValidationContext): void {
  const { actorIds, itemIds, scriptNames, errors } = ctx;
  for (const item of items) {
    if (item.iconPath) {
      checkAssetRef(item.iconPath, `Item "${item.name}" icon`, ctx.assetIds, ctx.assetDataUrls, errors);
    }
    if (item.verbHandlers) {
      for (const [verb, scriptName] of Object.entries(item.verbHandlers)) {
        if (scriptName && !scriptNames.has(scriptName)) {
          errors.push({ severity: "warning", message: `Item "${item.name}": verb handler "${verb}" references non-existent script "${scriptName}".` });
        }
      }
    }
    if (item.useWithHandlers) {
      for (const [targetItemId, scriptName] of Object.entries(item.useWithHandlers)) {
        if (!itemIds.has(targetItemId)) {
          errors.push({ severity: "warning", message: `Item "${item.name}": use-with handler references non-existent item "${targetItemId}".` });
        }
        if (scriptName && !scriptNames.has(scriptName)) {
          errors.push({ severity: "warning", message: `Item "${item.name}": use-with handler for "${targetItemId}" references non-existent script "${scriptName}".` });
        }
      }
    }
    if (item.fallbackScriptId && !scriptNames.has(item.fallbackScriptId)) {
      errors.push({ severity: "warning", message: `Item "${item.name}": fallback script "${item.fallbackScriptId}" does not exist.` });
    }
  }
}

function validateScripts(
  scripts: ValidatableProject["scripts"],
  globalFallbackScriptId: string | undefined,
  ctx: ValidationContext
): void {
  const { scriptNames, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, errors } = ctx;

  if (globalFallbackScriptId && !scriptNames.has(globalFallbackScriptId)) {
    errors.push({ severity: "warning", message: `Global fallback script "${globalFallbackScriptId}" does not exist.` });
  }

  const dupeScripts = findDuplicates(scripts.map((s) => s.name));
  for (const name of dupeScripts) {
    errors.push({ severity: "error", message: `Duplicate script name: "${name}".` });
  }

  for (const script of scripts) {
    if (script.steps && script.steps.length > 0) {
      validateScriptSteps(
        script.steps, script.name,
        roomIds, actorIds, objectIds, itemIds, scriptNames, dialogueTreeIds,
        errors
      );
    }
  }

  const AsyncFunctionCtor = Object.getPrototypeOf(async function () {}).constructor;
  for (const script of scripts) {
    if (script.body && script.body.trim()) {
      try {
        new AsyncFunctionCtor("ctx", script.body);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ severity: "error", message: `Script "${script.name}": syntax error — ${msg}` });
      }
    }
  }
}

function validateDialogueTrees(
  dialogueTrees: ValidatableProject["dialogueTrees"],
  project: ValidatableProject,
  ctx: ValidationContext
): void {
  if (!dialogueTrees) return;
  const { actorIds, itemIds, objectIds, roomIds, scriptNames, dialogueTreeIds, dialogueNodeIdsByTree, errors } = ctx;

  for (const tree of dialogueTrees) {
    // ─── Actor ref + node integrity ──────────────────────────────────────────
    if (tree.actorId && !actorIds.has(tree.actorId)) {
      errors.push({ severity: "warning", message: `Dialogue tree "${tree.name}": actor "${tree.actorId}" does not exist.` });
    }
    const nodeIds = new Set(tree.nodes.map((n) => n.id));
    if (!nodeIds.has(tree.startNodeId)) {
      errors.push({ severity: "error", message: `Dialogue tree "${tree.name}": start node "${tree.startNodeId}" does not exist.` });
    }
    for (const node of tree.nodes) {
      for (const branch of node.branches) {
        if (branch.nextNodeId && !nodeIds.has(branch.nextNodeId)) {
          errors.push({ severity: "error", message: `Dialogue tree "${tree.name}", node "${node.id}": branch targets non-existent node "${branch.nextNodeId}".` });
        }
      }
    }

    // ─── Reachability + infinite-loop detection ───────────────────────────────
    if (nodeIds.size > 0 && nodeIds.has(tree.startNodeId)) {
      const reachable = new Set<string>();
      const queue = [tree.startNodeId];
      while (queue.length > 0) {
        const id = queue.pop()!;
        if (reachable.has(id)) continue;
        reachable.add(id);
        const node = tree.nodes.find((n) => n.id === id);
        if (node) {
          for (const branch of node.branches) {
            if (branch.nextNodeId && nodeIds.has(branch.nextNodeId)) queue.push(branch.nextNodeId);
          }
        }
      }
      for (const node of tree.nodes) {
        if (!reachable.has(node.id)) {
          const excerpt = node.text ? ` ("${node.text.slice(0, 30).trim()}${node.text.length > 30 ? "…" : ""}")` : "";
          errors.push({ severity: "warning", message: `Dialogue tree "${tree.name}": node "${node.id}"${excerpt} is unreachable from the start node and will never be shown.` });
        }
      }

      const nodesWithExit = new Set<string>();
      for (const node of tree.nodes) {
        const hasNullBranch = node.branches.some((b) => b.nextNodeId === null);
        const hasEndAction = node.actions?.some((a) => a.type === "endDialogue") ?? false;
        if (hasNullBranch || hasEndAction || node.branches.length === 0) nodesWithExit.add(node.id);
      }
      let changed = true;
      while (changed) {
        changed = false;
        for (const node of tree.nodes) {
          if (nodesWithExit.has(node.id)) continue;
          if (node.branches.some((b) => b.nextNodeId && nodesWithExit.has(b.nextNodeId))) {
            nodesWithExit.add(node.id);
            changed = true;
          }
        }
      }
      for (const node of tree.nodes) {
        if (reachable.has(node.id) && !nodesWithExit.has(node.id) && node.branches.length > 0) {
          const excerpt = node.text ? ` ("${node.text.slice(0, 30).trim()}${node.text.length > 30 ? "…" : ""}")` : "";
          errors.push({ severity: "warning", message: `Dialogue tree "${tree.name}": node "${node.id}"${excerpt} has no path to a terminal node — all its branches loop back indefinitely.` });
        }
      }
    }

    // ─── Node action + condition validation ───────────────────────────────────
    for (let ni = 0; ni < tree.nodes.length; ni++) {
      const node = tree.nodes[ni];
      if (node.portrait) {
        if (!isDataUrl(node.portrait) && !isAbsoluteUrl(node.portrait) && !ctx.assetIds.has(node.portrait) && !ctx.assetDataUrls.has(node.portrait)) {
          errors.push({ severity: "warning", message: `Dialogue tree "${tree.name}", node "${node.id}": portrait "${node.portrait}" does not match any registered asset.` });
        }
      }
      if (node.actions) {
        for (let ai = 0; ai < node.actions.length; ai++) {
          const action = node.actions[ai];
          const actCtx = `Dialogue tree "${tree.name}", node "${node.id}", action ${ai} (${action.type})`;
          if ((action.type === "giveItem" || action.type === "removeItem")) {
            if (action.itemId && !itemIds.has(action.itemId)) errors.push({ severity: "error", message: `${actCtx}: references non-existent item "${action.itemId}".` });
            if (action.actorId && !actorIds.has(action.actorId)) errors.push({ severity: "error", message: `${actCtx}: references non-existent actor "${action.actorId}".` });
          }
          if (action.type === "gotoRoom") {
            if (action.roomId && !roomIds.has(action.roomId)) errors.push({ severity: "error", message: `${actCtx}: references non-existent room "${action.roomId}".` });
            if (action.roomId && action.spawnPointId) {
              const targetRoom = project.rooms.find((r) => r.id === action.roomId);
              if (targetRoom && !targetRoom.spawnPoints?.some((s) => s.id === action.spawnPointId)) {
                errors.push({ severity: "error", message: `${actCtx}: references non-existent spawn point "${action.spawnPointId}" in room "${targetRoom.name}".` });
              }
            }
          }
          if (action.type === "callScript" && action.scriptId && !scriptNames.has(action.scriptId)) {
            errors.push({ severity: "error", message: `${actCtx}: references non-existent script "${action.scriptId}".` });
          }
          if (action.type === "setObjectState" && action.objectId && !objectIds.has(action.objectId)) {
            errors.push({ severity: "error", message: `${actCtx}: references non-existent object "${action.objectId}".` });
          }
        }
      }
      if (node.condition && typeof node.condition === "object") {
        validateConditionExpression(node.condition, `Dialogue tree "${tree.name}", node "${node.id}"`, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors);
      }
      for (const branch of node.branches) {
        if (branch.condition && typeof branch.condition === "object") {
          validateConditionExpression(branch.condition, `Dialogue tree "${tree.name}", node "${node.id}", branch "${branch.id}"`, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors);
        }
      }
    }
  }
}

function validateAssets(
  assets: ValidatableProject["assets"],
  project: ValidatableProject,
  ctx: ValidationContext
): void {
  const { errors } = ctx;

  const dupeAssetIds = findDuplicates(assets.map((a) => a.id));
  for (const id of dupeAssetIds) {
    errors.push({ severity: "error", message: `Duplicate asset ID: "${id}".` });
  }

  for (const asset of assets) {
    if (asset.type !== "audio") {
      const w = (asset as { width?: number }).width;
      const h = (asset as { height?: number }).height;
      if (typeof w === "number" && typeof h === "number" && (w === 0 || h === 0)) {
        errors.push({ severity: "warning", message: `Asset "${asset.id}" has zero dimensions (${w}x${h}).` });
      }
    }
  }

  const assetTypeMap = new Map<string, string>();
  for (const asset of assets) {
    if (asset.type) assetTypeMap.set(asset.id, asset.type);
  }

  if (assetTypeMap.size === 0) return;

  for (const room of project.rooms) {
    if (room.backgroundPath && assetTypeMap.get(room.backgroundPath) === "audio") {
      errors.push({ severity: "error", message: `Room "${room.name}": background references audio asset "${room.backgroundPath}".` });
    }
    if (room.maskPath && assetTypeMap.get(room.maskPath) === "audio") {
      errors.push({ severity: "error", message: `Room "${room.name}": mask references audio asset "${room.maskPath}".` });
    }
    if (room.ambientAudioPath) {
      const t = assetTypeMap.get(room.ambientAudioPath);
      if (t && t !== "audio") errors.push({ severity: "error", message: `Room "${room.name}": ambient audio references non-audio asset "${room.ambientAudioPath}" (type: ${t}).` });
    }
    if (room.parallaxLayers) {
      for (let i = 0; i < room.parallaxLayers.length; i++) {
        const layer = room.parallaxLayers[i];
        if (layer.imagePath && assetTypeMap.get(layer.imagePath) === "audio") {
          errors.push({ severity: "error", message: `Room "${room.name}": parallax layer ${i} references audio asset "${layer.imagePath}".` });
        }
      }
    }
  }

  for (const actor of project.actors) {
    if (actor.spritePath && assetTypeMap.get(actor.spritePath) === "audio") {
      errors.push({ severity: "error", message: `Actor "${actor.name}": sprite references audio asset "${actor.spritePath}".` });
    }
    if (actor.animations) {
      for (const [dir, states] of Object.entries(actor.animations)) {
        for (const [state, anim] of Object.entries(states)) {
          if (anim?.frames) {
            for (let i = 0; i < anim.frames.length; i++) {
              if (anim.frames[i].imagePath && assetTypeMap.get(anim.frames[i].imagePath) === "audio") {
                errors.push({ severity: "error", message: `Actor "${actor.name}": animation ${dir}/${state} frame ${i} references audio asset "${anim.frames[i].imagePath}".` });
              }
            }
          }
        }
      }
    }
  }

  for (const obj of project.objects) {
    if (obj.spritePath && assetTypeMap.get(obj.spritePath) === "audio") {
      errors.push({ severity: "error", message: `Object "${obj.name}": sprite references audio asset "${obj.spritePath}".` });
    }
    if (obj.stateSprites) {
      for (let i = 0; i < obj.stateSprites.length; i++) {
        const entry = obj.stateSprites[i];
        if (entry.spritePath && assetTypeMap.get(entry.spritePath) === "audio") {
          errors.push({ severity: "error", message: `Object "${obj.name}": state sprite ${i} (${entry.stateKey}=${entry.stateValue}) references audio asset "${entry.spritePath}".` });
        }
      }
    }
  }

  for (const item of project.items) {
    if (item.iconPath && assetTypeMap.get(item.iconPath) === "audio") {
      errors.push({ severity: "error", message: `Item "${item.name}": icon references audio asset "${item.iconPath}".` });
    }
  }
}

function validateCrossReferences(project: ValidatableProject, ctx: ValidationContext): void {
  const { roomIds, objectIds, errors } = ctx;

  if (project.rooms.length > 0 && project.startingRoom && roomIds.has(project.startingRoom)) {
    const roomExitMap = new Map<string, Set<string>>();
    for (const room of project.rooms) {
      const targets = new Set<string>();
      for (const exit of room.exits ?? []) {
        if (roomIds.has(exit.targetRoomId)) targets.add(exit.targetRoomId);
      }
      roomExitMap.set(room.id, targets);
    }
    const reachableRooms = new Set<string>();
    const bfsQueue = [project.startingRoom];
    while (bfsQueue.length > 0) {
      const current = bfsQueue.pop()!;
      if (reachableRooms.has(current)) continue;
      reachableRooms.add(current);
      for (const t of (roomExitMap.get(current) ?? new Set())) {
        if (!reachableRooms.has(t)) bfsQueue.push(t);
      }
    }
    for (const room of project.rooms) {
      if (!reachableRooms.has(room.id)) {
        errors.push({ severity: "warning", message: `Room "${room.name}" is unreachable from the starting room via exits.` });
      }
    }
  }

  if (project.rooms.length > 1) {
    for (const room of project.rooms) {
      if (!room.exits || room.exits.length === 0) {
        errors.push({ severity: "warning", message: `Room "${room.name}" has no exits — players will be unable to leave this room.` });
      }
    }
  }

  for (const obj of project.objects) {
    if (obj.roomId && roomIds.has(obj.roomId)) {
      const room = project.rooms.find((r) => r.id === obj.roomId);
      if (room) {
        const hasHotspot = room.hotspots?.some((hs) => hs.name === obj.name || hs.id === obj.id);
        const hasBounds = obj.bounds && obj.bounds.width > 0 && obj.bounds.height > 0;
        const hasInteractionHotspot = obj.interactionHotspot && obj.interactionHotspot.width > 0 && obj.interactionHotspot.height > 0;
        if (!hasHotspot && !hasBounds && !hasInteractionHotspot) {
          errors.push({ severity: "warning", message: `Object "${obj.name}" in room "${room.name}" has no interaction region (no bounds, interaction hotspot, or room hotspot).` });
        }
      }
    }
  }

  const actorRoomAssignments = new Map<string, boolean>();
  for (const actor of project.actors) actorRoomAssignments.set(actor.id, !!actor.defaultRoomId);
  for (const room of project.rooms) {
    for (const actorId of room.actorIds ?? []) actorRoomAssignments.set(actorId, true);
  }
  for (const actor of project.actors) {
    if (actor.id === project.defaultPlayerActorId) continue;
    if (!actorRoomAssignments.get(actor.id)) {
      errors.push({ severity: "warning", message: `Actor "${actor.name}" is not placed in any room (no defaultRoomId and not in any room's actor list).` });
    }
  }

  const objectRoomAssignments = new Map<string, boolean>();
  for (const obj of project.objects) objectRoomAssignments.set(obj.id, !!obj.roomId);
  for (const room of project.rooms) {
    for (const objId of room.objectIds ?? []) objectRoomAssignments.set(objId, true);
  }
  for (const obj of project.objects) {
    if (!objectRoomAssignments.get(obj.id)) {
      errors.push({ severity: "warning", message: `Object "${obj.name}" is not placed in any room (no roomId and not in any room's object list).` });
    }
  }
}

function validateDuplicatesAndGeometry(project: ValidatableProject, ctx: ValidationContext): void {
  const { roomIds, errors } = ctx;

  for (const room of project.rooms) {
    const walkboxIds = new Set(room.walkboxes.map((w) => w.id));
    for (const wb of room.walkboxes) {
      if (!wb.polygon || wb.polygon.length < 3) {
        errors.push({ severity: "error", message: `Room "${room.name}", walkbox "${wb.id}": polygon has fewer than 3 points (${wb.polygon ? wb.polygon.length : 0}). A valid walkbox requires at least 3 vertices.` });
      }
      for (const adjId of wb.adjacentIds) {
        if (!walkboxIds.has(adjId)) {
          errors.push({ severity: "error", message: `Room "${room.name}", walkbox "${wb.id}": adjacentId "${adjId}" does not exist in this room.` });
        }
      }
    }
  }

  const dupeRoomIds = findDuplicates(project.rooms.map((r) => r.id));
  for (const id of dupeRoomIds) {
    const room = project.rooms.find((r) => r.id === id);
    errors.push({ severity: "error", message: `Room "${room?.name ?? id}": duplicate room ID "${id}". Each room must have a unique identifier.` });
  }
  const dupeActorIds = findDuplicates(project.actors.map((a) => a.id));
  for (const id of dupeActorIds) {
    const actor = project.actors.find((a) => a.id === id);
    errors.push({ severity: "error", message: `Actor "${actor?.name ?? id}": duplicate actor ID "${id}". Each actor must have a unique identifier.` });
  }
  const dupeObjectIds = findDuplicates(project.objects.map((o) => o.id));
  for (const id of dupeObjectIds) {
    const obj = project.objects.find((o) => o.id === id);
    errors.push({ severity: "error", message: `Object "${obj?.name ?? id}": duplicate object ID "${id}". Each object must have a unique identifier.` });
  }
  const dupeItemIds = findDuplicates(project.items.map((i) => i.id));
  for (const id of dupeItemIds) {
    const item = project.items.find((i) => i.id === id);
    errors.push({ severity: "error", message: `Item "${item?.name ?? id}": duplicate item ID "${id}". Each item must have a unique identifier.` });
  }
  if (project.dialogueTrees) {
    const dupeTreeIds = findDuplicates(project.dialogueTrees.map((t) => t.id));
    for (const id of dupeTreeIds) {
      const tree = project.dialogueTrees.find((t) => t.id === id);
      errors.push({ severity: "error", message: `Dialogue tree "${tree?.name ?? id}": duplicate dialogue tree ID "${id}". Each dialogue tree must have a unique identifier.` });
    }
  }

  if (project.variableDefinitions) {
    const varNames = new Map<string, number>();
    for (const v of project.variableDefinitions) varNames.set(v.name, (varNames.get(v.name) ?? 0) + 1);
    for (const [name, count] of varNames) {
      if (count > 1) errors.push({ severity: "error", message: `Variable "${name}": defined ${count} times. Each variable must have a unique name.` });
    }
    for (const v of project.variableDefinitions) {
      if (v.type === "number" && v.min !== undefined && v.max !== undefined && v.min > v.max) {
        errors.push({ severity: "error", message: `Variable "${v.name}": min (${v.min}) is greater than max (${v.max}).` });
      }
      if (v.scope === "room" && v.roomId && !roomIds.has(v.roomId)) {
        errors.push({ severity: "error", message: `Variable "${v.name}": room-scoped to non-existent room "${v.roomId}".` });
      }
    }
  }
}

function validateProjectConfig(project: ValidatableProject, ctx: ValidationContext): void {
  const { scriptNames, assetIds, assetDataUrls, dialogueTreeIds, dialogueNodeIdsByTree, roomIds, actorIds, objectIds, itemIds, errors } = ctx;

  if (project.display) {
    const d = project.display;
    const validScalingModes = ["stretch", "integer", "fit", "none"];
    const validAlignments = ["center", "top-left"];
    if (d.baseWidth !== undefined) {
      if (!Number.isFinite(d.baseWidth) || d.baseWidth <= 0) errors.push({ severity: "error", message: `Display: baseWidth must be a positive number (got ${d.baseWidth}). The default (640) will be used at runtime.` });
      else if (d.baseWidth < 160 || d.baseWidth > 3840) errors.push({ severity: "error", message: `Display: baseWidth ${d.baseWidth} is outside the supported range (160–3840). It will be clamped at runtime.` });
    }
    if (d.baseHeight !== undefined) {
      if (!Number.isFinite(d.baseHeight) || d.baseHeight <= 0) errors.push({ severity: "error", message: `Display: baseHeight must be a positive number (got ${d.baseHeight}). The default (360) will be used at runtime.` });
      else if (d.baseHeight < 90 || d.baseHeight > 2160) errors.push({ severity: "error", message: `Display: baseHeight ${d.baseHeight} is outside the supported range (90–2160). It will be clamped at runtime.` });
    }
    if (d.scalingMode !== undefined && !validScalingModes.includes(d.scalingMode)) {
      errors.push({ severity: "error", message: `Display: scalingMode "${d.scalingMode}" is not valid (must be one of: ${validScalingModes.join(", ")}). The default ("integer") will be used at runtime.` });
    }
    if (d.viewportAlignment !== undefined && !validAlignments.includes(d.viewportAlignment)) {
      errors.push({ severity: "error", message: `Display: viewportAlignment "${d.viewportAlignment}" is not valid (must be one of: ${validAlignments.join(", ")}). The default ("center") will be used at runtime.` });
    }
  }

  const verbSet = new Set<string>(project.verbs);
  if (project.overlayConfig?.verbBar?.buttons) {
    for (const btn of project.overlayConfig.verbBar.buttons) {
      if (btn.verb && !verbSet.has(btn.verb)) {
        errors.push({ severity: "warning", message: `Overlay config: verb button "${btn.verb}" references a verb not in the project verb list. Add it to verbs or remove the button.` });
      }
      if (btn.imagePath) {
        if (!isDataUrl(btn.imagePath) && !isAbsoluteUrl(btn.imagePath) && !assetIds.has(btn.imagePath) && !assetDataUrls.has(btn.imagePath)) {
          errors.push({ severity: "warning", message: `Overlay "${btn.verb}": button image "${btn.imagePath}" does not match any registered asset.` });
        }
      } else {
        errors.push({ severity: "warning", message: `Overlay "${btn.verb}": verb button has no image path. Consider adding an image for visual clarity.` });
      }
    }
  }

  const assetDimensions = new Map<string, { width: number; height: number }>();
  for (const asset of project.assets) {
    const a = asset as { id: string; width?: number; height?: number };
    if (typeof a.width === "number" && typeof a.height === "number" && a.width > 0 && a.height > 0) {
      assetDimensions.set(a.id, { width: a.width, height: a.height });
    }
  }
  for (const room of project.rooms) {
    if (room.backgroundPath && room.width > 0 && room.height > 0) {
      const bgDims = assetDimensions.get(room.backgroundPath);
      if (bgDims && (bgDims.width !== room.width || bgDims.height !== room.height)) {
        errors.push({ severity: "warning", message: `Room "${room.name}": declared dimensions (${room.width}×${room.height}) differ from the background image (${bgDims.width}×${bgDims.height}). Update the room size to match the image to avoid visual misalignment.` });
      }
    }
  }

  for (const actor of project.actors) {
    if (actor.portraitPath && !isDataUrl(actor.portraitPath) && !isAbsoluteUrl(actor.portraitPath) && !assetIds.has(actor.portraitPath) && !assetDataUrls.has(actor.portraitPath)) {
      errors.push({ severity: "warning", message: `Actor "${actor.name}": portrait "${actor.portraitPath}" does not match any registered asset.` });
    }
  }

  if (project.stateWatchers) {
    for (const watcher of project.stateWatchers) {
      if (watcher.scriptId && !scriptNames.has(watcher.scriptId)) {
        errors.push({ severity: "error", message: `State watcher "${watcher.id}": references non-existent script "${watcher.scriptId}". Create the script or update the reference.` });
      }
      if (watcher.condition) {
        validateConditionExpression(watcher.condition, `State watcher "${watcher.id}"`, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors, "error");
      }
    }
  }
}

function validateConditions(project: ValidatableProject, ctx: ValidationContext): void {
  const { roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors } = ctx;

  for (const room of project.rooms) {
    for (const exit of room.exits ?? []) {
      if (exit.visibilityCondition) {
        validateConditionExpression(exit.visibilityCondition, `Room "${room.name}", exit "${exit.id}" visibilityCondition`, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors);
      }
      if (exit.interactionCondition) {
        validateConditionExpression(exit.interactionCondition, `Room "${room.name}", exit "${exit.id}" interactionCondition`, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors);
      }
    }
    for (const hs of room.hotspots ?? []) {
      if (hs.visibilityCondition) {
        validateConditionExpression(hs.visibilityCondition, `Room "${room.name}", hotspot "${hs.name}" visibilityCondition`, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors);
      }
      if (hs.interactionCondition) {
        validateConditionExpression(hs.interactionCondition, `Room "${room.name}", hotspot "${hs.name}" interactionCondition`, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors);
      }
    }
  }

  for (const obj of project.objects) {
    if (obj.visibilityCondition) {
      validateConditionExpression(obj.visibilityCondition, `Object "${obj.name}" visibilityCondition`, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors);
    }
    if (obj.interactionCondition) {
      validateConditionExpression(obj.interactionCondition, `Object "${obj.name}" interactionCondition`, roomIds, actorIds, objectIds, itemIds, dialogueTreeIds, dialogueNodeIdsByTree, errors);
    }
  }
}

function validateProjectMeta(project: ValidatableProject, errors: ValidationError[]): void {
  if (!project.startingRoom) {
    errors.push({ severity: "error", message: "No starting room configured." });
  } else if (!project.rooms.find((r) => r.id === project.startingRoom)) {
    errors.push({ severity: "error", message: `Starting room "${project.startingRoom}" does not exist.` });
  }
  if (!project.defaultPlayerActorId) {
    errors.push({ severity: "error", message: "No player actor configured." });
  } else if (!project.actors.find((a) => a.id === project.defaultPlayerActorId)) {
    errors.push({ severity: "error", message: `Player actor "${project.defaultPlayerActorId}" does not exist.` });
  }
  if (project.rooms.length === 0) {
    errors.push({ severity: "error", message: "Project has no rooms." });
  }
}

function buildContext(project: ValidatableProject, errors: ValidationError[]): ValidationContext {
  const dialogueNodeIdsByTree = new Map<string, Set<string>>();
  for (const tree of project.dialogueTrees ?? []) {
    dialogueNodeIdsByTree.set(tree.id, new Set(tree.nodes.map((n) => n.id)));
  }
  return {
    roomIds: new Set(project.rooms.map((r) => r.id)),
    actorIds: new Set(project.actors.map((a) => a.id)),
    objectIds: new Set(project.objects.map((o) => o.id)),
    itemIds: new Set(project.items.map((i) => i.id)),
    scriptNames: new Set(project.scripts.map((s) => s.name)),
    assetIds: new Set(project.assets.map((a) => a.id)),
    assetDataUrls: new Set(project.assets.map((a) => a.dataUrl)),
    dialogueTrees: project.dialogueTrees,
    dialogueTreeIds: new Set(project.dialogueTrees?.map((t) => t.id) ?? []),
    dialogueNodeIdsByTree,
    errors,
  };
}

function validateInventoryAndCursors(project: ValidatableProject, ctx: ValidationContext): void {
  const { itemIds, assetIds, assetDataUrls, errors } = ctx;
  for (const itemId of project.startingItems ?? []) {
    if (!itemIds.has(itemId)) errors.push({ severity: "error", message: `Starting item "${itemId}" does not exist in items list.` });
  }
  for (const [verb, assetId] of Object.entries(project.verbCursors ?? {})) {
    if (assetId) checkAssetRef(assetId, `Verb cursor "${verb}"`, assetIds, assetDataUrls, errors);
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function validateProject(project: ValidatableProject): ValidationResult {
  const errors: ValidationError[] = [];
  validateProjectMeta(project, errors);
  const ctx = buildContext(project, errors);
  validateRooms(project.rooms, ctx);
  validateActors(project.actors, ctx);
  validateObjects(project.objects, ctx);
  validateItems(project.items, ctx);
  validateInventoryAndCursors(project, ctx);
  validateScripts(project.scripts, project.globalFallbackScriptId, ctx);
  validateDialogueTrees(project.dialogueTrees, project, ctx);
  validateAssets(project.assets, project, ctx);
  validateCrossReferences(project, ctx);
  validateDuplicatesAndGeometry(project, ctx);
  validateProjectConfig(project, ctx);
  validateConditions(project, ctx);
  const valid = !errors.some((e) => e.severity === "error");
  return { valid, errors };
}

export function validateManifestCompleteness(
  manifest: import("./exportSchema").ExportManifest,
  project: ValidatableProject,
  zipPaths?: Set<string>
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!manifest.gameId) {
    errors.push({ severity: "error", message: 'Manifest is missing a "gameId". Set a project ID in Settings → Project before exporting.' });
  }
  if (!manifest.title) {
    errors.push({ severity: "error", message: 'Manifest is missing a "title". Set a project title in Settings → Project before exporting.' });
  }
  if (!manifest.version) {
    errors.push({ severity: "error", message: 'Manifest is missing a "version". Set a version string in Settings → Project before exporting.' });
  }
  if (!manifest.startRoomId) {
    errors.push({ severity: "error", message: 'Manifest is missing "startRoomId". Configure the starting room in Settings → Project.' });
  } else {
    const roomExists = project.rooms.some((r) => r.id === manifest.startRoomId);
    if (!roomExists) {
      errors.push({
        severity: "error",
        message: `Manifest "startRoomId" is "${manifest.startRoomId}" but no room with that ID exists. Update the starting room in Settings → Project.`,
      });
    }
  }
  if (!manifest.playerActorId) {
    errors.push({ severity: "error", message: 'Manifest is missing "playerActorId". Configure the player actor in Settings → Project.' });
  } else {
    const actorExists = project.actors.some((a) => a.id === manifest.playerActorId);
    if (!actorExists) {
      errors.push({
        severity: "error",
        message: `Manifest "playerActorId" is "${manifest.playerActorId}" but no actor with that ID exists. Update the player actor in Settings → Project.`,
      });
    }
  }

  if (!manifest.exportSchemaVersion) {
    errors.push({ severity: "error", message: "Manifest is missing exportSchemaVersion. The export package may have been generated by an incompatible tool." });
  }

  if (!manifest.assetBasePath) {
    errors.push({ severity: "error", message: "Manifest is missing assetBasePath. The export package may be incomplete." });
  }

  if (!manifest.data) {
    errors.push({ severity: "error", message: "Manifest is missing the data section. The export package is incomplete and cannot be loaded." });
  } else {
    const requiredDataKeys: (keyof typeof manifest.data)[] = [
      "rooms", "actors", "objects", "inventory", "scripts", "dialogue", "project",
    ];
    for (const key of requiredDataKeys) {
      if (!manifest.data[key]) {
        errors.push({ severity: "error", message: `Manifest data.${key} path is missing. Re-export the game to regenerate the package.` });
      }
    }

    if (zipPaths) {
      for (const key of requiredDataKeys) {
        const dataPath = manifest.data[key];
        if (dataPath && !zipPaths.has(dataPath)) {
          errors.push({
            severity: "error",
            message: `Manifest: data.${key} references "${dataPath}" which is not present in the ZIP.`,
          });
        }
      }
    }
  }

  const assetIds = new Set(project.assets.map((a) => a.id));
  const assetDataUrls = new Set(project.assets.map((a) => a.dataUrl));
  const allReferencedPaths = collectAllAssetPaths(project);

  for (const refPath of allReferencedPaths) {
    if (refPath.startsWith("data:")) continue;
    if (/^https?:\/\//i.test(refPath)) continue;
    if (assetIds.has(refPath)) continue;
    if (assetDataUrls.has(refPath)) continue;

    if (zipPaths) {
      const inZip =
        zipPaths.has(refPath) ||
        zipPaths.has("assets/" + refPath) ||
        Array.from(zipPaths).some((p) => p.endsWith("/" + refPath));
      if (!inZip) {
        errors.push({
          severity: "error",
          message: `Manifest: referenced asset path "${refPath}" is not present in the ZIP.`,
        });
      }
    } else {
      errors.push({
        severity: "error",
        message: `Referenced asset path "${refPath}" is not a data URL, absolute URL, or registered asset. It may not resolve at export time.`,
      });
    }
  }

  const valid = !errors.some((e) => e.severity === "error");
  return { valid, errors };
}

export interface PackageFileSystem {
  exists(relativePath: string): boolean;
  readText(relativePath: string): string;
  listFiles(dir: string): string[];
}

export function validateExportedPackage(
  packageDirOrPfs: string | PackageFileSystem
): ValidationResult {
  let pfs: PackageFileSystem;

  if (typeof packageDirOrPfs === "string") {
    const fs = require("fs") as typeof import("fs");
    const nodePath = require("path") as typeof import("path");
    const packageDir = packageDirOrPfs;
    pfs = {
      exists(relativePath: string): boolean {
        return fs.existsSync(nodePath.join(packageDir, relativePath));
      },
      readText(relativePath: string): string {
        return fs.readFileSync(nodePath.join(packageDir, relativePath), "utf-8");
      },
      listFiles(dir: string): string[] {
        const full = nodePath.join(packageDir, dir);
        if (!fs.existsSync(full)) return [];
        const results: string[] = [];
        function walk(d: string, prefix: string) {
          for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const rel = prefix ? prefix + "/" + entry.name : entry.name;
            if (entry.isDirectory()) {
              walk(nodePath.join(d, entry.name), rel);
            } else {
              results.push(dir + "/" + rel);
            }
          }
        }
        walk(full, "");
        return results;
      },
    };
  } else {
    pfs = packageDirOrPfs;
  }

  const errors: ValidationError[] = [];

  if (!pfs.exists("manifest.json")) {
    return { valid: false, errors: [{ severity: "error", message: "manifest.json not found in package directory." }] };
  }

  let manifest: import("./exportSchema").ExportManifest;
  try {
    manifest = JSON.parse(pfs.readText("manifest.json"));
  } catch {
    return { valid: false, errors: [{ severity: "error", message: "manifest.json is not valid JSON." }] };
  }

  if (!manifest.gameId) errors.push({ severity: "error", message: "Manifest: gameId is empty." });
  if (!manifest.title) errors.push({ severity: "error", message: "Manifest: title is empty." });
  if (!manifest.version) errors.push({ severity: "error", message: "Manifest: version is empty." });
  if (!manifest.exportSchemaVersion) errors.push({ severity: "error", message: "Manifest: exportSchemaVersion is missing." });
  if (!manifest.startRoomId) errors.push({ severity: "error", message: "Manifest: startRoomId is empty." });
  if (!manifest.playerActorId) errors.push({ severity: "error", message: "Manifest: playerActorId is empty." });
  if (!manifest.assetBasePath) errors.push({ severity: "error", message: "Manifest: assetBasePath is missing." });

  if (!manifest.data) {
    errors.push({ severity: "error", message: "Manifest: data section is missing." });
  } else {
    const requiredDataKeys: (keyof typeof manifest.data)[] = [
      "rooms", "actors", "objects", "inventory", "scripts", "dialogue", "project",
    ];
    for (const key of requiredDataKeys) {
      const dataPath = manifest.data[key];
      if (!dataPath) {
        errors.push({ severity: "error", message: `Manifest: data.${key} path is empty.` });
      } else if (!pfs.exists(dataPath)) {
        errors.push({ severity: "error", message: `Manifest: data.${key} references "${dataPath}" which is not present in the package.` });
      }
    }
  }

  if (manifest.data && !errors.some((e) => e.severity === "error")) {
    const assetBase = manifest.assetBasePath || "assets/";
    let allAssetFiles: Set<string>;
    try {
      allAssetFiles = new Set(pfs.listFiles(assetBase.replace(/\/$/, "")));
    } catch {
      allAssetFiles = new Set<string>();
    }

    function checkExportedAssetRef(assetPath: string, context: string) {
      if (!assetPath) return;
      if (assetPath.startsWith("data:")) return;
      if (/^https?:\/\//i.test(assetPath)) return;
      if (pfs.exists(assetPath)) return;
      if (allAssetFiles.has(assetPath)) return;
      const baseName = assetPath.replace(/^assets\//, "");
      if (allAssetFiles.has(assetBase + baseName)) return;
      errors.push({ severity: "error", message: `${context}: referenced asset "${assetPath}" not found in package.` });
    }

    function parseDataFile<T>(dataPath: string, label: string): T | null {
      try {
        return JSON.parse(pfs.readText(dataPath)) as T;
      } catch (e) {
        errors.push({ severity: "error", message: `Failed to parse ${label} ("${dataPath}"): ${e instanceof Error ? e.message : String(e)}` });
        return null;
      }
    }

    const rooms = parseDataFile<{ id?: string; name?: string; backgroundPath?: string; maskPath?: string; ambientAudioPath?: string; parallaxLayers?: { imagePath: string }[] }[]>(manifest.data.rooms, "rooms");
    if (rooms) {
      for (const room of rooms) {
        const rl = room.name ? `Room "${room.name}"` : "Room";
        if (room.backgroundPath) checkExportedAssetRef(room.backgroundPath, `${rl} background`);
        if (room.maskPath) checkExportedAssetRef(room.maskPath, `${rl} mask`);
        if (room.ambientAudioPath) checkExportedAssetRef(room.ambientAudioPath, `${rl} ambient audio`);
        if (room.parallaxLayers) {
          for (const layer of room.parallaxLayers) {
            if (layer.imagePath) checkExportedAssetRef(layer.imagePath, `${rl} parallax layer`);
          }
        }
      }
    }

    const actors = parseDataFile<{ id?: string; name?: string; spritePath?: string; animations?: Record<string, Record<string, { frames?: { imagePath: string }[] } | null>>; portraitPath?: string }[]>(manifest.data.actors, "actors");
    if (actors) {
      for (const actor of actors) {
        const al = actor.name ? `Actor "${actor.name}"` : "Actor";
        if (actor.spritePath) checkExportedAssetRef(actor.spritePath, `${al} sprite`);
        if (actor.portraitPath) checkExportedAssetRef(actor.portraitPath, `${al} portrait`);
        if (actor.animations) {
          for (const [stateKey, states] of Object.entries(actor.animations)) {
            for (const [animKey, anim] of Object.entries(states)) {
              if (anim?.frames) {
                for (const frame of anim.frames) {
                  if (frame.imagePath) checkExportedAssetRef(frame.imagePath, `${al} animation "${stateKey}/${animKey}" frame`);
                }
              }
            }
          }
        }
      }
    }

    const objects = parseDataFile<{ id?: string; name?: string; spritePath?: string; stateSprites?: { spritePath: string }[] }[]>(manifest.data.objects, "objects");
    if (objects) {
      for (const obj of objects) {
        const ol = obj.name ? `Object "${obj.name}"` : "Object";
        if (obj.spritePath) checkExportedAssetRef(obj.spritePath, `${ol} sprite`);
        if (obj.stateSprites) {
          for (const entry of obj.stateSprites) {
            if (entry.spritePath) checkExportedAssetRef(entry.spritePath, `${ol} state sprite`);
          }
        }
      }
    }

    const items = parseDataFile<{ id?: string; name?: string; iconPath?: string }[]>(manifest.data.inventory, "inventory");
    if (items) {
      for (const item of items) {
        const il = item.name ? `Item "${item.name}"` : "Item";
        if (item.iconPath) checkExportedAssetRef(item.iconPath, `${il} icon`);
      }
    }
  }

  const valid = !errors.some((e) => e.severity === "error");
  return { valid, errors };
}

function collectAllAssetPaths(project: ValidatableProject): string[] {
  const paths: string[] = [];
  for (const room of project.rooms) {
    if (room.backgroundPath) paths.push(room.backgroundPath);
    if (room.maskPath) paths.push(room.maskPath);
    if (room.ambientAudioPath) paths.push(room.ambientAudioPath);
    if (room.parallaxLayers) {
      for (const layer of room.parallaxLayers) {
        if (layer.imagePath) paths.push(layer.imagePath);
      }
    }
  }
  for (const actor of project.actors) {
    if (actor.spritePath) paths.push(actor.spritePath);
    if (actor.animations) {
      for (const states of Object.values(actor.animations)) {
        for (const anim of Object.values(states)) {
          if (anim?.frames) {
            for (const frame of anim.frames) {
              if (frame.imagePath) paths.push(frame.imagePath);
            }
          }
        }
      }
    }
  }
  for (const obj of project.objects) {
    if (obj.spritePath) paths.push(obj.spritePath);
    if (obj.stateSprites) {
      for (const entry of obj.stateSprites) {
        if (entry.spritePath) paths.push(entry.spritePath);
      }
    }
  }
  for (const item of project.items) {
    if (item.iconPath) paths.push(item.iconPath);
  }
  return [...new Set(paths)].filter((p) => p.length > 0);
}
