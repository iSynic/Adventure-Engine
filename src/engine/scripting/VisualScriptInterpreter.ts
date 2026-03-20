import type { ScriptStep } from "../core/types";
import type { ScriptContext } from "./ScriptRunner";

export async function executeSteps(steps: ScriptStep[], ctx: ScriptContext): Promise<void> {
  for (const step of steps) {
    await executeStep(step, ctx);
  }
}

async function executeStep(step: ScriptStep, ctx: ScriptContext): Promise<void> {
  switch (step.type) {
    case "say":
      ctx.say(step.text);
      break;

    case "sayBlocking":
      await ctx.sayBlocking(step.actorId, step.text);
      break;

    case "gotoRoom":
      ctx.gotoRoom(step.roomId, step.spawnPointId);
      break;

    case "setFlag":
      ctx.setFlag(step.flag, step.value);
      break;

    case "setVar":
      ctx.setVar(step.variable, step.value);
      break;

    case "incrementVar":
      ctx.incrementVar(step.variable, step.amount);
      break;

    case "giveItem":
      ctx.giveItem(step.actorId, step.itemId);
      break;

    case "removeItem":
      ctx.removeItem(step.actorId, step.itemId);
      break;

    case "fadeOut":
      await ctx.fadeOut(step.duration);
      break;

    case "fadeIn":
      await ctx.fadeIn(step.duration);
      break;

    case "wait":
      await ctx.wait(step.duration);
      break;

    case "walkActorTo":
      await ctx.walkActorTo(step.actorId, step.x, step.y);
      break;

    case "faceActor":
      await ctx.faceActor(step.actorId, step.direction);
      break;

    case "startDialogue":
      await ctx.startDialogue(step.treeId);
      break;

    case "beginCutscene":
      ctx.beginCutscene();
      break;

    case "endCutscene":
      ctx.endCutscene();
      break;

    case "lockInput":
      ctx.lockInput();
      break;

    case "unlockInput":
      ctx.unlockInput();
      break;

    case "setObjectState":
      ctx.setObjectState(step.objectId, step.key, step.value);
      break;

    case "setObjectPrimaryState":
      ctx.setObjectPrimaryState(step.objectId, step.stateIndex);
      break;

    case "playAnimation":
      await ctx.playAnimation(step.actorId, step.animationState, {
        waitForCompletion: step.waitForCompletion,
      });
      break;

    case "emitSignal":
      ctx.emitSignal(step.signal);
      break;

    case "scheduleScript":
      ctx.scheduleScript(step.scriptId);
      break;

    case "setRoomVar":
      ctx.setRoomVar(step.roomId, step.key, step.value);
      break;

    case "if": {
      const result = ctx.evaluate(step.condition);
      if (result) {
        await executeSteps(step.thenSteps, ctx);
      } else if (step.elseSteps && step.elseSteps.length > 0) {
        await executeSteps(step.elseSteps, ctx);
      }
      break;
    }

    default: {
      const _exhaustive: never = step;
      console.warn(`[VisualScriptInterpreter] Unknown step type: ${(_exhaustive as ScriptStep).type}`);
    }
  }
}

export function compileVisualScript(steps: ScriptStep[]): (ctx: ScriptContext) => Promise<void> {
  return (ctx: ScriptContext) => executeSteps(steps, ctx);
}
