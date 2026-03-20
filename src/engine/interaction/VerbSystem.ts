import type { VerbType, GameAction, ActionResult } from "../core/types";
import type { RoomManager } from "../world/RoomManager";
import type { Registry } from "../core/Registry";
import type { UIManager } from "../ui/UIManager";
import type { ScriptRunner } from "../scripting/ScriptRunner";
import type { InventorySystem } from "../inventory/InventorySystem";
import type { StateStore } from "../state/StateStore";
import type { EventBus, EngineEventMap } from "../core/EventBus";
import { ActionResolver } from "./ActionResolver";

export interface InteractionResult {
  handled: boolean;
  message?: string;
}

export class VerbSystem {
  readonly actionResolver: ActionResolver;
  private eventBus: EventBus<EngineEventMap> | null = null;

  constructor(
    private roomManager: RoomManager,
    private registry: Registry,
    private ui: UIManager,
    private scriptRunner: ScriptRunner,
    private inventory: InventorySystem,
    private state: StateStore
  ) {
    this.actionResolver = new ActionResolver(
      roomManager, registry, ui, scriptRunner, inventory, state
    );
  }

  setEventBus(bus: EventBus<EngineEventMap>): void {
    this.eventBus = bus;
  }

  private emitInteraction(action: GameAction, handled: boolean): void {
    if (!this.eventBus || !handled) return;
    this.eventBus.emit("object:interacted", {
      objectId: action.primaryTarget.id,
      objectType: action.primaryTarget.type,
      verb: action.verb,
      actorId: action.actorId,
      secondaryTargetId: action.secondaryTarget?.id ?? null,
    });
  }

  async dispatch(action: GameAction): Promise<ActionResult>;
  async dispatch(
    verb: VerbType,
    targetId: string,
    targetType: "object" | "actor" | "hotspot" | "exit" | "item",
    actorId: string,
    secondaryTargetId?: string
  ): Promise<InteractionResult>;
  async dispatch(
    verbOrAction: VerbType | GameAction,
    targetId?: string,
    targetType?: "object" | "actor" | "hotspot" | "exit" | "item",
    actorId?: string,
    secondaryTargetId?: string
  ): Promise<InteractionResult | ActionResult> {
    if (typeof verbOrAction === "object" && "primaryTarget" in verbOrAction) {
      const result = await this.actionResolver.resolve(verbOrAction);
      this.emitInteraction(verbOrAction, result.handled);
      return result;
    }

    const verb = verbOrAction as VerbType;
    const primaryTarget = this.actionResolver.makeTarget(targetId!, targetType!);
    const secondaryTarget = secondaryTargetId
      ? this.actionResolver.makeTarget(secondaryTargetId, "item")
      : null;

    const action = this.actionResolver.buildAction(verb, actorId!, primaryTarget, secondaryTarget);
    const result = await this.actionResolver.resolve(action);
    this.emitInteraction(action, result.handled);
    return { handled: result.handled, message: result.message };
  }

  async dispatchAction(action: GameAction): Promise<ActionResult> {
    const result = await this.actionResolver.resolve(action);
    this.emitInteraction(result.action!, result.handled);
    if (!result.handled) {
      this.ui.setInvalidFeedback();
    }
    return result;
  }
}
