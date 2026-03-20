import type {
  ScriptStep,
  Direction,
  AnimationState,
} from "../../../engine/core/types";

export interface StepCatalogEntry {
  type: ScriptStep["type"];
  label: string;
  category: string;
  description: string;
}

export const STEP_CATALOG: StepCatalogEntry[] = [
  { type: "say", label: "Say (non-blocking)", category: "Dialogue", description: "Display text without pausing the script" },
  { type: "sayBlocking", label: "Say (blocking)", category: "Dialogue", description: "Display speech and wait for the player to dismiss it" },
  { type: "startDialogue", label: "Start Dialogue Tree", category: "Dialogue", description: "Begin a branching dialogue conversation" },
  { type: "setFlag", label: "Set Flag", category: "State", description: "Set a boolean flag to true or false" },
  { type: "setVar", label: "Set Variable", category: "State", description: "Set a variable to any value (number, string, boolean)" },
  { type: "incrementVar", label: "Increment Variable", category: "State", description: "Add or subtract from a numeric variable" },
  { type: "setObjectState", label: "Set Object State", category: "State", description: "Set a key/value pair on an object's state" },
  { type: "setObjectPrimaryState", label: "Set Object Primary State", category: "State", description: "Switch an object's primary state index to change its sprite" },
  { type: "setRoomVar", label: "Set Room Variable", category: "State", description: "Set a local variable scoped to a specific room" },
  { type: "gotoRoom", label: "Go to Room", category: "Navigation", description: "Transition the player to another room" },
  { type: "walkActorTo", label: "Walk Actor To", category: "Navigation", description: "Walk an actor to a specific X/Y position" },
  { type: "faceActor", label: "Face Direction", category: "Navigation", description: "Turn an actor to face a compass direction" },
  { type: "giveItem", label: "Give Item", category: "Inventory", description: "Add an item to an actor's inventory" },
  { type: "removeItem", label: "Remove Item", category: "Inventory", description: "Remove an item from an actor's inventory" },
  { type: "fadeOut", label: "Fade Out", category: "Timing", description: "Fade the screen to black over a duration" },
  { type: "fadeIn", label: "Fade In", category: "Timing", description: "Fade the screen back in over a duration" },
  { type: "wait", label: "Wait", category: "Timing", description: "Pause the script for a set number of milliseconds" },
  { type: "playAnimation", label: "Play Animation", category: "Animation", description: "Play a named animation on an actor" },
  { type: "beginCutscene", label: "Begin Cutscene", category: "Control", description: "Start a cutscene — disables player input" },
  { type: "endCutscene", label: "End Cutscene", category: "Control", description: "End the current cutscene and restore input" },
  { type: "lockInput", label: "Lock Input", category: "Control", description: "Temporarily disable all player input" },
  { type: "unlockInput", label: "Unlock Input", category: "Control", description: "Re-enable player input" },
  { type: "emitSignal", label: "Emit Signal", category: "Control", description: "Broadcast a named signal for state watchers to react to" },
  { type: "scheduleScript", label: "Schedule Script", category: "Control", description: "Queue another script to run (non-blocking)" },
  { type: "if", label: "If / Else", category: "Logic", description: "Conditionally run steps based on a condition" },
];

export const CATEGORIES = [...new Set(STEP_CATALOG.map((s) => s.category))];

export const DIRECTIONS: Direction[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export const ANIMATION_STATES: AnimationState[] = [
  "idle", "walk", "talk", "face", "interact_low", "interact_mid",
  "interact_high", "pickup", "push_pull", "special_use", "emote", "interact",
];

export function createDefaultStep(type: ScriptStep["type"]): ScriptStep {
  switch (type) {
    case "say": return { type: "say", text: "" };
    case "sayBlocking": return { type: "sayBlocking", actorId: "", text: "" };
    case "gotoRoom": return { type: "gotoRoom", roomId: "" };
    case "setFlag": return { type: "setFlag", flag: "", value: true };
    case "setVar": return { type: "setVar", variable: "", value: 0 };
    case "incrementVar": return { type: "incrementVar", variable: "", amount: 1 };
    case "giveItem": return { type: "giveItem", actorId: "", itemId: "" };
    case "removeItem": return { type: "removeItem", actorId: "", itemId: "" };
    case "fadeOut": return { type: "fadeOut", duration: 500 };
    case "fadeIn": return { type: "fadeIn", duration: 500 };
    case "wait": return { type: "wait", duration: 1000 };
    case "walkActorTo": return { type: "walkActorTo", actorId: "", x: 0, y: 0 };
    case "faceActor": return { type: "faceActor", actorId: "", direction: "S" };
    case "startDialogue": return { type: "startDialogue", treeId: "" };
    case "beginCutscene": return { type: "beginCutscene" };
    case "endCutscene": return { type: "endCutscene" };
    case "lockInput": return { type: "lockInput" };
    case "unlockInput": return { type: "unlockInput" };
    case "setObjectState": return { type: "setObjectState", objectId: "", key: "", value: "" };
    case "setObjectPrimaryState": return { type: "setObjectPrimaryState", objectId: "", stateIndex: 0 };
    case "playAnimation": return { type: "playAnimation", actorId: "", animationState: "idle" };
    case "emitSignal": return { type: "emitSignal", signal: "" };
    case "scheduleScript": return { type: "scheduleScript", scriptId: "" };
    case "setRoomVar": return { type: "setRoomVar", roomId: "", key: "", value: "" };
    case "if": return { type: "if", condition: { type: "flag", flag: "" }, thenSteps: [], elseSteps: [] };
  }
}

export function stepLabel(type: ScriptStep["type"]): string {
  return STEP_CATALOG.find((s) => s.type === type)?.label ?? type;
}

export function stepSummary(step: ScriptStep): string {
  switch (step.type) {
    case "say": return step.text ? `"${step.text.slice(0, 40)}${step.text.length > 40 ? "..." : ""}"` : "(empty)";
    case "sayBlocking": return `${step.actorId || "?"}: "${step.text.slice(0, 30)}${step.text.length > 30 ? "..." : ""}"`;
    case "gotoRoom": return step.roomId || "(no room)";
    case "setFlag": return `${step.flag || "?"} = ${step.value}`;
    case "setVar": return `${step.variable || "?"} = ${step.value}`;
    case "incrementVar": return `${step.variable || "?"} += ${step.amount ?? 1}`;
    case "giveItem": return `${step.itemId || "?"} to ${step.actorId || "?"}`;
    case "removeItem": return `${step.itemId || "?"} from ${step.actorId || "?"}`;
    case "fadeOut": return `${step.duration ?? 500}ms`;
    case "fadeIn": return `${step.duration ?? 500}ms`;
    case "wait": return `${step.duration}ms`;
    case "walkActorTo": return `${step.actorId || "?"} to (${step.x}, ${step.y})`;
    case "faceActor": return `${step.actorId || "?"} face ${step.direction}`;
    case "startDialogue": return step.treeId || "(no tree)";
    case "beginCutscene": return "";
    case "endCutscene": return "";
    case "lockInput": return "";
    case "unlockInput": return "";
    case "setObjectState": return `${step.objectId || "?"}.${step.key || "?"} = ${step.value}`;
    case "setObjectPrimaryState": return `${step.objectId || "?"} → state ${step.stateIndex}`;
    case "playAnimation": return `${step.actorId || "?"} ${step.animationState}`;
    case "emitSignal": return step.signal || "(no signal)";
    case "scheduleScript": return step.scriptId || "(no script)";
    case "setRoomVar": return `${step.roomId || "?"}.${step.key || "?"} = ${step.value}`;
    case "if": return `${step.thenSteps.length} then${step.elseSteps?.length ? `, ${step.elseSteps.length} else` : ""}`;
  }
}

export function pathsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function resolveStepAtPath(steps: ScriptStep[], selPath: number[]): ScriptStep | null {
  if (selPath.length === 0) return null;
  let current: ScriptStep[] = steps;
  for (let i = 0; i < selPath.length; i++) {
    const seg = selPath[i];
    if (seg === -1 || seg === -2) {
      const parent = current as unknown;
      if (!parent || typeof parent !== "object") return null;
      continue;
    }
    if (seg < 0 || seg >= current.length) return null;
    const step = current[seg];
    if (i === selPath.length - 1) return step;
    if (step.type === "if") {
      const next = selPath[i + 1];
      if (next === -1) { current = step.thenSteps; i++; }
      else if (next === -2) { current = step.elseSteps ?? []; i++; }
      else return null;
    } else {
      return null;
    }
  }
  return null;
}

export function updateStepAtPath(steps: ScriptStep[], selPath: number[], updated: ScriptStep): ScriptStep[] {
  if (selPath.length === 0) return steps;
  const [head, ...rest] = selPath;
  if (head < 0 || head >= steps.length) return steps;
  const copy = [...steps];
  if (rest.length === 0) {
    copy[head] = updated;
    return copy;
  }
  const step = copy[head];
  if (step.type === "if" && rest.length >= 2) {
    const branch = rest[0];
    const subPath = rest.slice(1);
    if (branch === -1) {
      copy[head] = { ...step, thenSteps: updateStepAtPath(step.thenSteps, subPath, updated) };
    } else if (branch === -2) {
      copy[head] = { ...step, elseSteps: updateStepAtPath(step.elseSteps ?? [], subPath, updated) };
    }
  }
  return copy;
}
