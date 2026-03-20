import type { ScriptStep } from "../../engine/core/types";

function indent(code: string, level: number): string {
  const pad = "  ".repeat(level);
  return code
    .split("\n")
    .map((line) => (line.trim() ? pad + line : ""))
    .join("\n");
}

function escStr(s: string): string {
  return JSON.stringify(s);
}

function stepToJs(step: ScriptStep): string {
  switch (step.type) {
    case "say":
      return `ctx.say(${escStr(step.text)});`;
    case "sayBlocking":
      return `await ctx.sayBlocking(${escStr(step.actorId)}, ${escStr(step.text)});`;
    case "gotoRoom":
      return step.spawnPointId
        ? `ctx.gotoRoom(${escStr(step.roomId)}, ${escStr(step.spawnPointId)});`
        : `ctx.gotoRoom(${escStr(step.roomId)});`;
    case "setFlag":
      return `ctx.setFlag(${escStr(step.flag)}, ${JSON.stringify(step.value)});`;
    case "setVar":
      return `ctx.setVar(${escStr(step.variable)}, ${JSON.stringify(step.value)});`;
    case "incrementVar":
      return `ctx.incrementVar(${escStr(step.variable)}, ${step.amount});`;
    case "giveItem":
      return `ctx.giveItem(${escStr(step.actorId)}, ${escStr(step.itemId)});`;
    case "removeItem":
      return `ctx.removeItem(${escStr(step.actorId)}, ${escStr(step.itemId)});`;
    case "fadeOut":
      return `await ctx.fadeOut(${step.duration});`;
    case "fadeIn":
      return `await ctx.fadeIn(${step.duration});`;
    case "wait":
      return `await ctx.wait(${step.duration});`;
    case "walkActorTo":
      return `await ctx.walkActorTo(${escStr(step.actorId)}, ${step.x}, ${step.y});`;
    case "faceActor":
      return `await ctx.faceActor(${escStr(step.actorId)}, ${escStr(step.direction)});`;
    case "startDialogue":
      return `await ctx.startDialogue(${escStr(step.treeId)});`;
    case "beginCutscene":
      return `ctx.beginCutscene();`;
    case "endCutscene":
      return `ctx.endCutscene();`;
    case "lockInput":
      return `ctx.lockInput();`;
    case "unlockInput":
      return `ctx.unlockInput();`;
    case "setObjectState":
      return `ctx.setObjectState(${escStr(step.objectId)}, ${escStr(step.key)}, ${JSON.stringify(step.value)});`;
    case "setObjectPrimaryState":
      return `ctx.setObjectPrimaryState(${escStr(step.objectId)}, ${step.stateIndex});`;
    case "playAnimation":
      return `await ctx.playAnimation(${escStr(step.actorId)}, ${escStr(step.animationState)}, { waitForCompletion: ${step.waitForCompletion ?? false} });`;
    case "emitSignal":
      return `ctx.emitSignal(${escStr(step.signal)});`;
    case "scheduleScript":
      return `ctx.scheduleScript(${escStr(step.scriptId)});`;
    case "setRoomVar":
      return `ctx.setRoomVar(${escStr(step.roomId)}, ${escStr(step.key)}, ${JSON.stringify(step.value)});`;
    case "if": {
      const condJson = JSON.stringify(step.condition);
      let code = `if (ctx.evaluate(${condJson})) {\n`;
      code += indent(stepsBlockToJs(step.thenSteps), 1);
      if (step.elseSteps && step.elseSteps.length > 0) {
        code += "\n} else {\n";
        code += indent(stepsBlockToJs(step.elseSteps), 1);
      }
      code += "\n}";
      return code;
    }
    default: {
      const _exhaustive: never = step;
      return `// Unknown step type: ${(_exhaustive as ScriptStep).type}`;
    }
  }
}

function stepsBlockToJs(steps: ScriptStep[]): string {
  return steps.map((s) => stepToJs(s)).join("\n");
}

export function stepsToRawJs(steps: ScriptStep[]): string {
  if (steps.length === 0) return "";
  return stepsBlockToJs(steps) + "\n";
}
