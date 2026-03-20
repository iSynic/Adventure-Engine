import type { VerbType, GameAction, ActionTarget, ActionResult, TargetType, ScriptOwnership } from "../core/types";
import type { RoomManager } from "../world/RoomManager";
import type { Registry } from "../core/Registry";
import type { UIManager } from "../ui/UIManager";
import type { ScriptRunner, PartialScriptContext } from "../scripting/ScriptRunner";
import type { InventorySystem } from "../inventory/InventorySystem";
import type { StateStore } from "../state/StateStore";

export interface ActionResolverConfig {
  globalFallbackScriptId?: string;
}

export class ActionResolver {
  private config: ActionResolverConfig = {};

  constructor(
    private roomManager: RoomManager,
    private registry: Registry,
    private ui: UIManager,
    private scriptRunner: ScriptRunner,
    private inventory: InventorySystem,
    private state: StateStore
  ) {}

  setConfig(config: ActionResolverConfig): void {
    this.config = config;
  }

  buildAction(
    verb: VerbType,
    actorId: string,
    primaryTarget: ActionTarget,
    secondaryTarget?: ActionTarget | null
  ): GameAction {
    return { verb, actorId, primaryTarget, secondaryTarget: secondaryTarget ?? null };
  }

  resolveTargetName(id: string, type: TargetType): string {
    switch (type) {
      case "object": {
        const def = this.registry.getObject(id);
        return def?.name ?? id;
      }
      case "actor": {
        const def = this.registry.getActor(id);
        return def?.name ?? id;
      }
      case "hotspot": {
        const hs = this.roomManager.getAllHotspots().find((h) => h.id === id);
        return hs?.name ?? id;
      }
      case "exit": {
        const ex = this.roomManager.getAllExits().find((e) => e.id === id);
        return ex?.label ?? "Exit";
      }
      case "item": {
        const item = this.registry.getItem(id);
        return item?.name ?? id;
      }
      default:
        return id;
    }
  }

  makeTarget(id: string, type: TargetType): ActionTarget {
    return { id, type, displayName: this.resolveTargetName(id, type) };
  }

  formatSentence(action: GameAction): string {
    const verb = action.verb;
    const primary = action.primaryTarget.displayName;
    const actorName = this.resolveTargetName(action.actorId, "actor");
    const prefix = actorName !== action.actorId ? `[${actorName}] ` : "";
    if (action.secondaryTarget) {
      return `${prefix}${verb} ${action.secondaryTarget.displayName} on ${primary}`;
    }
    return `${prefix}${verb} ${primary}`;
  }

  validate(action: GameAction): { valid: boolean; reason?: string } {
    const { primaryTarget, verb, actorId } = action;

    const actorDef = this.registry.getActor(actorId);
    if (!actorDef) return { valid: false, reason: "No one is there to do that." };

    switch (primaryTarget.type) {
      case "object": {
        const def = this.registry.getObject(primaryTarget.id);
        if (!def) return { valid: false, reason: "I don't see that." };
        break;
      }
      case "actor": {
        const def = this.registry.getActor(primaryTarget.id);
        if (!def) return { valid: false, reason: "There's nobody there." };
        if (verb === "pickup") return { valid: false, reason: "You can't pick up people." };
        break;
      }
      case "hotspot": {
        const hs = this.roomManager.getAllHotspots().find((h) => h.id === primaryTarget.id);
        if (!hs) return { valid: false, reason: "Nothing there." };
        if (verb === "pickup") return { valid: false, reason: "You can't pick that up." };
        break;
      }
      case "item": {
        const item = this.registry.getItem(primaryTarget.id);
        if (!item) return { valid: false, reason: "You don't have that." };
        break;
      }
      case "exit": {
        const exit = this.roomManager.getAllExits().find((e) => e.id === primaryTarget.id);
        if (!exit) return { valid: false, reason: "That doesn't lead anywhere." };
        if (verb !== "walk" && verb !== "look" && verb !== "open") {
          return { valid: false, reason: "You can't do that there." };
        }
        break;
      }
    }

    return { valid: true };
  }

  private async tryFallbackChain(
    entityFallbackScriptId: string | undefined,
    partial: PartialScriptContext,
    ownership: { ownership: ScriptOwnership; ownerId: string },
    verb: VerbType,
    target: ActionTarget,
    action: GameAction,
    descriptionOverride?: string
  ): Promise<ActionResult> {
    if (entityFallbackScriptId && this.scriptRunner.hasHandler(entityFallbackScriptId)) {
      await this.scriptRunner.runHook(entityFallbackScriptId, partial, ownership);
      return { handled: true, action };
    }

    const globalFb = this.config.globalFallbackScriptId;
    if (globalFb && this.scriptRunner.hasHandler(globalFb)) {
      await this.scriptRunner.runHook(globalFb, partial, ownership);
      return { handled: true, action };
    }

    if (descriptionOverride) {
      return { handled: true, message: descriptionOverride, action };
    }

    return { handled: false, message: this.defaultResponse(verb, target), action };
  }

  async resolve(action: GameAction): Promise<ActionResult> {
    const validation = this.validate(action);
    if (!validation.valid) {
      return { handled: false, message: validation.reason, action };
    }

    const currentRoom = this.roomManager.getCurrentRoom();
    const currentRoomId = currentRoom?.id ?? "";

    const partial: PartialScriptContext = {
      currentActorId: action.actorId,
      currentTargetId: action.primaryTarget.id,
      currentTargetType: action.primaryTarget.type,
      currentRoomId,
      verb: action.verb,
      secondaryTargetId: action.secondaryTarget?.id ?? null,
    };

    const { primaryTarget, verb } = action;

    if (primaryTarget.type === "object") {
      const objDef = this.registry.getObject(primaryTarget.id)!;

      if (objDef.interactionAnimation && verb !== "look" && verb !== "walk") {
        const playerActor = this.roomManager.getActor(action.actorId);
        if (playerActor) {
          playerActor.playAnimationOneShot(objDef.interactionAnimation, "scripted");
        }
      }

      if (verb === "use" && action.secondaryTarget) {
        const uwh = objDef.useWithHandlers?.[action.secondaryTarget.id];
        if (uwh && this.scriptRunner.hasHandler(uwh)) {
          await this.scriptRunner.runHook(uwh, partial, { ownership: "object", ownerId: primaryTarget.id });
          return { handled: true, action };
        }
      }

      const hookId = objDef.verbHandlers?.[verb];
      if (hookId && this.scriptRunner.hasHandler(hookId)) {
        await this.scriptRunner.runHook(hookId, partial, { ownership: "object", ownerId: primaryTarget.id });
        return { handled: true, action };
      }
      return this.tryFallbackChain(objDef.fallbackScriptId, partial, { ownership: "object", ownerId: primaryTarget.id }, verb, primaryTarget, action);
    }

    if (primaryTarget.type === "actor") {
      const actorDef = this.registry.getActor(primaryTarget.id)!;

      if (verb === "use" && action.secondaryTarget) {
        const uwh = actorDef.useWithHandlers?.[action.secondaryTarget.id];
        if (uwh && this.scriptRunner.hasHandler(uwh)) {
          await this.scriptRunner.runHook(uwh, partial, { ownership: "actor", ownerId: primaryTarget.id });
          return { handled: true, action };
        }
      }

      const hookId = actorDef.verbHandlers?.[verb];
      if (hookId && this.scriptRunner.hasHandler(hookId)) {
        await this.scriptRunner.runHook(hookId, partial, { ownership: "actor", ownerId: primaryTarget.id });
        return { handled: true, action };
      }
      if (verb === "talk" && actorDef.dialogueId) {
        await this.scriptRunner.startDialogueTree(actorDef.dialogueId);
        return { handled: true, action };
      }
      return this.tryFallbackChain(actorDef.fallbackScriptId, partial, { ownership: "actor", ownerId: primaryTarget.id }, verb, primaryTarget, action);
    }

    if (primaryTarget.type === "hotspot") {
      const hs = this.roomManager.getAllHotspots().find((h) => h.id === primaryTarget.id)!;
      const hsDef = hs.definition;

      if (verb === "use" && action.secondaryTarget) {
        const uwh = hsDef.useWithHandlers?.[action.secondaryTarget.id];
        if (uwh && this.scriptRunner.hasHandler(uwh)) {
          await this.scriptRunner.runHook(uwh, partial, { ownership: "interaction", ownerId: primaryTarget.id });
          return { handled: true, action };
        }
      }

      const hookId = hs.getHandler(verb);
      if (hookId && this.scriptRunner.hasHandler(hookId)) {
        await this.scriptRunner.runHook(hookId, partial, { ownership: "interaction", ownerId: primaryTarget.id });
        return { handled: true, action };
      }
      return this.tryFallbackChain(
        hsDef.fallbackScriptId, partial,
        { ownership: "interaction", ownerId: primaryTarget.id },
        verb, primaryTarget, action,
        verb === "look" && hs.description ? hs.description : undefined
      );
    }

    if (primaryTarget.type === "item") {
      const itemDef = this.registry.getItem(primaryTarget.id)!;

      if (verb === "use" && action.secondaryTarget) {
        const uwh = itemDef.useWithHandlers?.[action.secondaryTarget.id];
        if (uwh && this.scriptRunner.hasHandler(uwh)) {
          await this.scriptRunner.runHook(uwh, partial, { ownership: "interaction", ownerId: primaryTarget.id });
          return { handled: true, action };
        }
      }

      const hookId = itemDef.verbHandlers?.[verb];
      if (hookId && this.scriptRunner.hasHandler(hookId)) {
        await this.scriptRunner.runHook(hookId, partial, { ownership: "interaction", ownerId: primaryTarget.id });
        return { handled: true, action };
      }

      return this.tryFallbackChain(
        itemDef.fallbackScriptId, partial,
        { ownership: "interaction", ownerId: primaryTarget.id },
        verb, primaryTarget, action,
        verb === "look" && itemDef.description ? itemDef.description : undefined
      );
    }

    if (primaryTarget.type === "exit") {
      if (verb === "walk" || verb === "open") {
        return { handled: true, action };
      }
      if (verb === "look") {
        return { handled: true, message: `It leads somewhere.`, action };
      }
      return { handled: false, message: this.defaultResponse(verb, primaryTarget), action };
    }

    return { handled: false, message: this.defaultResponse(verb, primaryTarget), action };
  }

  private defaultResponse(verb: VerbType, target: ActionTarget): string {
    const name = target.displayName;

    if (target.type === "actor") {
      switch (verb) {
        case "look": return `${name} looks back at you.`;
        case "talk": return `${name} doesn't want to talk right now.`;
        case "use": return `That doesn't seem like a good idea.`;
        case "pickup": return `You can't pick up people.`;
        default: return `That doesn't work.`;
      }
    }

    if (target.type === "hotspot") {
      return `Nothing interesting about the ${name}.`;
    }

    if (target.type === "exit") {
      return `You can't do that there.`;
    }

    if (target.type === "item") {
      switch (verb) {
        case "look": return `It's a ${name}.`;
        case "use": return `That doesn't seem to do anything.`;
        default: return `That doesn't work.`;
      }
    }

    switch (verb) {
      case "look": return `It's a ${name}.`;
      case "open": return `The ${name} won't open.`;
      case "close": return `You can't close the ${name}.`;
      case "pickup": return `You can't pick that up.`;
      case "use": return `That doesn't seem to do anything.`;
      case "push": return `Nothing happens.`;
      case "pull": return `Nothing happens.`;
      default: return `That doesn't work.`;
    }
  }
}
