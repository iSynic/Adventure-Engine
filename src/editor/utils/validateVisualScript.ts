import type { ScriptStep, ConditionExpression } from "../../engine/core/types";
import type { EditorProject } from "../types";

export interface StepValidationError {
  path: number[];
  field: string;
  message: string;
}

export function validateVisualScript(
  steps: ScriptStep[],
  project: EditorProject
): StepValidationError[] {
  const errors: StepValidationError[] = [];
  validateSteps(steps, [], project, errors);
  return errors;
}

function validateSteps(
  steps: ScriptStep[],
  parentPath: number[],
  project: EditorProject,
  errors: StepValidationError[]
): void {
  for (let i = 0; i < steps.length; i++) {
    validateStep(steps[i], [...parentPath, i], project, errors);
  }
}

function validateStep(
  step: ScriptStep,
  path: number[],
  project: EditorProject,
  errors: StepValidationError[]
): void {
  const actorIds = new Set(project.actors.map((a) => a.id));
  const roomIds = new Set(project.rooms.map((r) => r.id));
  const itemIds = new Set(project.items.map((i) => i.id));
  const objectIds = new Set(project.objects.map((o) => o.id));
  const treeIds = new Set((project.dialogueTrees ?? []).map((t) => t.id));
  const scriptNames = new Set(project.scripts.map((s) => s.name));
  const variableNames = new Set((project.variableDefinitions ?? []).map((v) => v.name));

  switch (step.type) {
    case "say":
      if (!step.text.trim()) {
        errors.push({ path, field: "text", message: "Text is required" });
      }
      break;

    case "sayBlocking":
      if (!step.actorId) {
        errors.push({ path, field: "actorId", message: "Actor is required" });
      } else if (!actorIds.has(step.actorId)) {
        errors.push({ path, field: "actorId", message: `Actor "${step.actorId}" not found` });
      }
      if (!step.text.trim()) {
        errors.push({ path, field: "text", message: "Text is required" });
      }
      break;

    case "gotoRoom":
      if (!step.roomId) {
        errors.push({ path, field: "roomId", message: "Room is required" });
      } else if (!roomIds.has(step.roomId)) {
        errors.push({ path, field: "roomId", message: `Room "${step.roomId}" not found` });
      }
      if (step.spawnPointId && step.roomId && roomIds.has(step.roomId)) {
        const room = project.rooms.find((r) => r.id === step.roomId);
        const spawnIds = new Set((room?.spawnPoints ?? []).map((sp) => sp.id));
        if (!spawnIds.has(step.spawnPointId)) {
          errors.push({ path, field: "spawnPointId", message: `Spawn point "${step.spawnPointId}" not found in room "${step.roomId}"` });
        }
      }
      break;

    case "setFlag":
      if (!step.flag.trim()) {
        errors.push({ path, field: "flag", message: "Flag name is required" });
      }
      break;

    case "setVar":
      if (!step.variable.trim()) {
        errors.push({ path, field: "variable", message: "Variable name is required" });
      } else if (variableNames.size > 0 && !variableNames.has(step.variable)) {
        errors.push({ path, field: "variable", message: `Variable "${step.variable}" not defined` });
      }
      break;

    case "incrementVar":
      if (!step.variable.trim()) {
        errors.push({ path, field: "variable", message: "Variable name is required" });
      } else if (variableNames.size > 0 && !variableNames.has(step.variable)) {
        errors.push({ path, field: "variable", message: `Variable "${step.variable}" not defined` });
      }
      break;

    case "giveItem":
      if (!step.actorId) {
        errors.push({ path, field: "actorId", message: "Actor is required" });
      } else if (!actorIds.has(step.actorId)) {
        errors.push({ path, field: "actorId", message: `Actor "${step.actorId}" not found` });
      }
      if (!step.itemId) {
        errors.push({ path, field: "itemId", message: "Item is required" });
      } else if (!itemIds.has(step.itemId)) {
        errors.push({ path, field: "itemId", message: `Item "${step.itemId}" not found` });
      }
      break;

    case "removeItem":
      if (!step.actorId) {
        errors.push({ path, field: "actorId", message: "Actor is required" });
      } else if (!actorIds.has(step.actorId)) {
        errors.push({ path, field: "actorId", message: `Actor "${step.actorId}" not found` });
      }
      if (!step.itemId) {
        errors.push({ path, field: "itemId", message: "Item is required" });
      } else if (!itemIds.has(step.itemId)) {
        errors.push({ path, field: "itemId", message: `Item "${step.itemId}" not found` });
      }
      break;

    case "fadeOut":
    case "fadeIn":
      if (step.duration !== undefined && step.duration < 0) {
        errors.push({ path, field: "duration", message: "Duration must be non-negative" });
      }
      break;

    case "wait":
      if (step.duration <= 0) {
        errors.push({ path, field: "duration", message: "Duration must be positive" });
      }
      break;

    case "walkActorTo":
      if (!step.actorId) {
        errors.push({ path, field: "actorId", message: "Actor is required" });
      } else if (!actorIds.has(step.actorId)) {
        errors.push({ path, field: "actorId", message: `Actor "${step.actorId}" not found` });
      }
      break;

    case "faceActor":
      if (!step.actorId) {
        errors.push({ path, field: "actorId", message: "Actor is required" });
      } else if (!actorIds.has(step.actorId)) {
        errors.push({ path, field: "actorId", message: `Actor "${step.actorId}" not found` });
      }
      break;

    case "startDialogue":
      if (!step.treeId) {
        errors.push({ path, field: "treeId", message: "Dialogue tree is required" });
      } else if (!treeIds.has(step.treeId)) {
        errors.push({ path, field: "treeId", message: `Dialogue tree "${step.treeId}" not found` });
      }
      break;

    case "setObjectState":
      if (!step.objectId) {
        errors.push({ path, field: "objectId", message: "Object is required" });
      } else if (!objectIds.has(step.objectId)) {
        errors.push({ path, field: "objectId", message: `Object "${step.objectId}" not found` });
      }
      if (!step.key.trim()) {
        errors.push({ path, field: "key", message: "State key is required" });
      }
      break;

    case "setObjectPrimaryState":
      if (!step.objectId) {
        errors.push({ path, field: "objectId", message: "Object is required" });
      } else if (!objectIds.has(step.objectId)) {
        errors.push({ path, field: "objectId", message: `Object "${step.objectId}" not found` });
      }
      break;

    case "playAnimation":
      if (!step.actorId) {
        errors.push({ path, field: "actorId", message: "Actor is required" });
      } else if (!actorIds.has(step.actorId)) {
        errors.push({ path, field: "actorId", message: `Actor "${step.actorId}" not found` });
      }
      break;

    case "emitSignal":
      if (!step.signal.trim()) {
        errors.push({ path, field: "signal", message: "Signal name is required" });
      }
      break;

    case "scheduleScript":
      if (!step.scriptId) {
        errors.push({ path, field: "scriptId", message: "Script is required" });
      } else if (!scriptNames.has(step.scriptId)) {
        errors.push({ path, field: "scriptId", message: `Script "${step.scriptId}" not found` });
      }
      break;

    case "setRoomVar":
      if (!step.roomId) {
        errors.push({ path, field: "roomId", message: "Room is required" });
      } else if (!roomIds.has(step.roomId)) {
        errors.push({ path, field: "roomId", message: `Room "${step.roomId}" not found` });
      }
      if (!step.key.trim()) {
        errors.push({ path, field: "key", message: "Variable key is required" });
      }
      break;

    case "beginCutscene":
    case "endCutscene":
    case "lockInput":
    case "unlockInput":
      break;

    case "if":
      validateConditionRefs(step.condition, path, "condition", project, errors);
      validateSteps(step.thenSteps, [...path, -1], project, errors);
      if (step.elseSteps) {
        validateSteps(step.elseSteps, [...path, -2], project, errors);
      }
      break;
  }
}

function validateConditionRefs(
  condition: ConditionExpression,
  path: number[],
  field: string,
  project: EditorProject,
  errors: StepValidationError[]
): void {
  switch (condition.type) {
    case "flag":
      if (!condition.flag.trim()) {
        errors.push({ path, field: `${field}.flag`, message: "Flag name is required" });
      }
      break;
    case "variable":
      if (!condition.variable.trim()) {
        errors.push({ path, field: `${field}.variable`, message: "Variable name is required" });
      }
      break;
    case "inventory": {
      const actorIds = new Set(project.actors.map((a) => a.id));
      const itemIds = new Set(project.items.map((i) => i.id));
      if (condition.actorId && !actorIds.has(condition.actorId)) {
        errors.push({ path, field: `${field}.actorId`, message: `Actor "${condition.actorId}" not found` });
      }
      if (condition.itemId && !itemIds.has(condition.itemId)) {
        errors.push({ path, field: `${field}.itemId`, message: `Item "${condition.itemId}" not found` });
      }
      break;
    }
    case "hasTag": {
      const objectIds = new Set(project.objects.map((o) => o.id));
      if (!condition.objectId.trim()) {
        errors.push({ path, field: `${field}.objectId`, message: "Object ID is required" });
      } else if (!objectIds.has(condition.objectId)) {
        errors.push({ path, field: `${field}.objectId`, message: `Object "${condition.objectId}" not found` });
      }
      if (!condition.tag.trim()) {
        errors.push({ path, field: `${field}.tag`, message: "Tag is required" });
      }
      break;
    }
    case "objectState": {
      const objectIds = new Set(project.objects.map((o) => o.id));
      if (condition.objectId && !objectIds.has(condition.objectId)) {
        errors.push({ path, field: `${field}.objectId`, message: `Object "${condition.objectId}" not found` });
      }
      break;
    }
    case "roomVisited": {
      const roomIds = new Set(project.rooms.map((r) => r.id));
      if (condition.roomId && !roomIds.has(condition.roomId)) {
        errors.push({ path, field: `${field}.roomId`, message: `Room "${condition.roomId}" not found` });
      }
      break;
    }
    case "and":
    case "or":
      for (const child of condition.conditions) {
        validateConditionRefs(child, path, field, project, errors);
      }
      break;
    case "not":
      validateConditionRefs(condition.condition, path, field, project, errors);
      break;
  }
}

export function errorsForStep(errors: StepValidationError[], stepPath: number[]): StepValidationError[] {
  return errors.filter((e) => {
    if (e.path.length < stepPath.length) return false;
    return stepPath.every((v, i) => e.path[i] === v);
  });
}

export function directErrorsForStep(errors: StepValidationError[], stepPath: number[]): StepValidationError[] {
  return errors.filter((e) => {
    if (e.path.length !== stepPath.length) return false;
    return stepPath.every((v, i) => e.path[i] === v);
  });
}
