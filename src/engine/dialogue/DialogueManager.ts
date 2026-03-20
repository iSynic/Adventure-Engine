import type { DialogueTree, DialogueNode, DialogueAction, DialogueRuntimeState, ConditionExpression, ActorDefinition } from "../core/types";
import type { StateStore } from "../state/StateStore";
import type { InventorySystem } from "../inventory/InventorySystem";
import type { UIManager } from "../ui/UIManager";
import type { RoomManager } from "../world/RoomManager";
import { evaluateCondition } from "../state/ConditionEvaluator";

export interface DialogueChoice {
  id: string;
  text: string;
  branchIndex: number;
}

export type DialogueStateCallback = (state: {
  active: boolean;
  speakerName: string;
  speakerText: string;
  speakerPortrait?: string;
  choices: DialogueChoice[];
  chosenBranchIds: string[];
}) => void;

type DialogueEventCallback = (event: string, detail: string) => void;
type RunScriptFn = (scriptId: string) => void;

export class DialogueManager {
  private trees = new Map<string, DialogueTree>();
  private stateStore!: StateStore;
  private inventory!: InventorySystem;
  private ui!: UIManager;
  private roomManager: RoomManager | null = null;
  private gotoRoomFn: (roomId: string, spawnPointId?: string) => void = () => {};
  private runScriptFn: RunScriptFn = () => {};
  private actorDefs: ActorDefinition[] = [];
  private currentLineUsesBubble = false;

  private active = false;
  private currentTree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;
  private choiceResolver: ((index: number) => void) | null = null;
  private lineTimerResolver: (() => void) | null = null;
  private listeners: DialogueStateCallback[] = [];
  private eventListeners: DialogueEventCallback[] = [];

  onDialogueEvent(cb: DialogueEventCallback): () => void {
    this.eventListeners.push(cb);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== cb);
    };
  }

  private emitEvent(event: string, detail: string): void {
    for (const cb of this.eventListeners) cb(event, detail);
  }

  initialize(
    stateStore: StateStore,
    inventory: InventorySystem,
    ui: UIManager,
    gotoRoom: (roomId: string, spawnPointId?: string) => void
  ): void {
    this.stateStore = stateStore;
    this.inventory = inventory;
    this.ui = ui;
    this.gotoRoomFn = gotoRoom;
  }

  setRoomManager(rm: RoomManager): void {
    this.roomManager = rm;
  }

  setRunScriptFn(fn: RunScriptFn): void {
    this.runScriptFn = fn;
  }

  setActorDefinitions(actors: ActorDefinition[]): void {
    this.actorDefs = actors;
  }

  registerTree(tree: DialogueTree): void {
    this.trees.set(tree.id, tree);
  }

  registerTrees(trees: DialogueTree[]): void {
    for (const tree of trees) {
      this.registerTree(tree);
    }
  }

  subscribe(cb: DialogueStateCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    const state = this.getDialogueState();
    for (const cb of this.listeners) cb(state);
  }

  private resolvePortrait(): string | undefined {
    if (this.currentNode?.portrait) return this.currentNode.portrait;
    if (this.currentTree?.actorId) {
      const actor = this.actorDefs.find((a) => a.id === this.currentTree!.actorId);
      if (actor?.portraitPath) return actor.portraitPath;
    }
    const speakerName = this.currentNode?.speaker;
    if (speakerName) {
      const actor = this.actorDefs.find((a) => a.name === speakerName || a.id === speakerName);
      if (actor?.portraitPath) return actor.portraitPath;
    }
    return undefined;
  }

  private getChosenBranchIdsForCurrentTree(): string[] {
    if (!this.currentTree) return [];
    const seen = this.stateStore.getDialogueSeenState()[this.currentTree.id];
    return seen?.branches ?? [];
  }

  getDialogueState() {
    if (!this.active || !this.currentNode) {
      return { active: false, speakerName: "", speakerText: "", choices: [] as DialogueChoice[], chosenBranchIds: [] as string[] };
    }
    return {
      active: true,
      speakerName: this.currentNode.speaker,
      speakerText: this.currentNode.text,
      speakerPortrait: this.resolvePortrait(),
      choices: this.getVisibleChoices(),
      chosenBranchIds: this.getChosenBranchIdsForCurrentTree(),
    };
  }

  isActive(): boolean {
    return this.active;
  }

  getRuntimeState(): DialogueRuntimeState {
    return {
      active: this.active,
      currentTreeId: this.currentTree?.id ?? null,
      currentNodeId: this.currentNode?.id ?? null,
    };
  }

  private evaluateConditionExpr(condition: string | ConditionExpression | undefined): boolean {
    if (condition === undefined || condition === null) return true;
    if (typeof condition === "string" && condition.trim() === "") return true;
    return evaluateCondition(condition, this.stateStore, this.inventory);
  }

  private getVisibleChoices(): DialogueChoice[] {
    if (!this.currentNode || !this.currentTree) return [];
    const treeId = this.currentTree.id;
    const choices: DialogueChoice[] = [];
    this.currentNode.branches.forEach((branch, index) => {
      if (branch.once && this.stateStore.hasChosenDialogueBranch(treeId, branch.id)) {
        return;
      }
      if (this.evaluateConditionExpr(branch.condition)) {
        choices.push({
          id: branch.id,
          text: branch.text,
          branchIndex: index,
        });
      }
    });
    return choices;
  }

  private executeActions(actions: DialogueAction[]): boolean {
    for (const action of actions) {
      switch (action.type) {
        case "setFlag":
          if (action.flag) {
            this.stateStore.setFlag(action.flag, action.flagValue ?? true);
          }
          break;
        case "giveItem":
          if (action.itemId && action.actorId) {
            this.inventory.addItem(action.actorId, action.itemId);
          }
          break;
        case "removeItem":
          if (action.itemId && action.actorId) {
            this.inventory.removeItem(action.actorId, action.itemId);
          }
          break;
        case "gotoRoom":
          if (action.roomId) {
            this.gotoRoomFn(action.roomId, action.spawnPointId);
          }
          break;
        case "setVariable":
          if (action.variable && action.value !== undefined) {
            this.stateStore.setVariable(action.variable, action.value);
          }
          break;
        case "callScript":
          if (action.scriptId) {
            this.runScriptFn(action.scriptId);
          }
          break;
        case "setObjectState":
          if (action.objectId && action.key && action.value !== undefined) {
            this.stateStore.setObjectState(action.objectId, action.key, action.value);
          }
          break;
        case "endDialogue":
          return true;
      }
    }
    return false;
  }

  async startDialogue(treeId: string): Promise<void> {
    const tree = this.trees.get(treeId);
    if (!tree) {
      console.warn(`[DialogueManager] Tree not found: ${treeId}`);
      return;
    }

    this.active = true;
    this.currentTree = tree;
    this.emitEvent("start", `Dialogue "${treeId}" started`);

    if (tree.onStartFlag) {
      this.stateStore.setFlag(tree.onStartFlag, true);
    }

    const startNode = tree.nodes.find((n) => n.id === tree.startNodeId);
    if (!startNode) {
      console.warn(`[DialogueManager] Start node not found: ${tree.startNodeId}`);
      this.endDialogue();
      return;
    }

    await this.processNode(startNode);
  }

  private findNextFallthrough(skipNodeId: string): DialogueNode | null {
    if (!this.currentTree) return null;
    const nodes = this.currentTree.nodes;
    const idx = nodes.findIndex((n) => n.id === skipNodeId);
    if (idx < 0) return null;
    for (let i = idx + 1; i < nodes.length; i++) {
      const candidate = nodes[i];
      if (!this.evaluateConditionExpr(candidate.condition)) continue;
      if (candidate.once && this.stateStore.hasSeenDialogueNode(this.currentTree.id, candidate.id)) continue;
      return candidate;
    }
    return null;
  }

  private async processNode(node: DialogueNode): Promise<void> {
    if (!this.currentTree) {
      this.endDialogue();
      return;
    }

    const treeId = this.currentTree.id;

    if (!this.evaluateConditionExpr(node.condition)) {
      const fallthrough = this.findNextFallthrough(node.id);
      if (fallthrough) {
        await this.processNode(fallthrough);
      } else {
        this.endDialogue();
      }
      return;
    }

    if (node.once && this.stateStore.hasSeenDialogueNode(treeId, node.id)) {
      const fallthrough = this.findNextFallthrough(node.id);
      if (fallthrough) {
        await this.processNode(fallthrough);
      } else {
        this.endDialogue();
      }
      return;
    }

    this.currentNode = node;

    if (node.actions && node.actions.length > 0) {
      const shouldEnd = this.executeActions(node.actions);
      if (shouldEnd) {
        this.endDialogue();
        return;
      }
    }

    // Show speaker line as canvas speech bubble when the actor is in the room;
    // fall back to the message bar for narrator-only lines or unfound actors.
    let usesBubble = false;
    if (this.roomManager && node.speaker) {
      let actorId = node.speaker;
      let actor = this.roomManager.getActor(actorId);
      if (!actor) {
        const def = this.actorDefs.find((a) => a.name === node.speaker || a.id === node.speaker);
        if (def) {
          actorId = def.id;
          actor = this.roomManager.getActor(actorId);
        }
      }
      if (actor) {
        this.ui.showSpeechBubble(actorId, node.text, actor.x, actor.y, Infinity);
        usesBubble = true;
      }
    }
    if (!usesBubble) {
      this.ui.showMessage(node.text, Infinity);
    }
    this.currentLineUsesBubble = usesBubble;
    this.notify();

    this.stateStore.markDialogueNodeSeen(treeId, node.id);

    const visibleChoices = this.getVisibleChoices();

    if (visibleChoices.length === 0) {
      // No choices: wait for the player to click (pure resolver — no timer, no auto-advance).
      // setSkippable(true) tells wireUI to show the 800ms click-hint on the message bar.
      this.ui.setSkippable(true);
      await new Promise<void>((resolve) => {
        this.lineTimerResolver = resolve;
      });
      // Resolved by skipCurrentLine() on click; clear skippable before ending.
      this.ui.setSkippable(false);
      this.endDialogue();
      return;
    }

    const choiceIndex = await this.waitForChoice();
    const branch = node.branches[choiceIndex];

    if (!branch || branch.nextNodeId === null) {
      this.endDialogue();
      return;
    }

    const nextNode = this.currentTree?.nodes.find((n) => n.id === branch.nextNodeId);
    if (!nextNode) {
      this.endDialogue();
      return;
    }

    await this.processNode(nextNode);
  }

  private waitForChoice(): Promise<number> {
    return new Promise((resolve) => {
      this.choiceResolver = resolve;
    });
  }

  selectChoice(branchIndex: number): void {
    if (this.choiceResolver) {
      const branch = this.currentNode?.branches[branchIndex];
      this.emitEvent("choice", `Player chose: "${branch?.text ?? `option ${branchIndex}`}"`);
      if (branch && this.currentTree) {
        this.stateStore.markDialogueBranchChosen(this.currentTree.id, branch.id);
      }
      const resolver = this.choiceResolver;
      this.choiceResolver = null;
      resolver(branchIndex);
    }
  }

  canSkipCurrentLine(): boolean {
    return this.lineTimerResolver !== null;
  }

  skipCurrentLine(): void {
    if (this.lineTimerResolver) {
      const resolve = this.lineTimerResolver;
      this.lineTimerResolver = null;
      if (this.currentLineUsesBubble) {
        this.ui.dismissBubble();
      } else {
        this.ui.clearMessage();
      }
      this.currentLineUsesBubble = false;
      resolve();
    }
  }

  forceReset(): void {
    this.active = false;
    this.currentTree = null;
    this.currentNode = null;
    if (this.choiceResolver) {
      this.choiceResolver(-1);
      this.choiceResolver = null;
    }
    if (this.lineTimerResolver) {
      this.lineTimerResolver();
      this.lineTimerResolver = null;
    }
    this.currentLineUsesBubble = false;
    this.ui.clearMessage();
    this.ui.clearSpeechBubble();
    this.notify();
  }

  private endDialogue(): void {
    const tree = this.currentTree;
    const treeId = tree?.id ?? "unknown";
    this.emitEvent("end", `Dialogue "${treeId}" ended`);

    if (tree?.onEndFlag) {
      this.stateStore.setFlag(tree.onEndFlag, true);
    }

    this.active = false;
    this.currentTree = null;
    this.currentNode = null;
    this.choiceResolver = null;
    this.lineTimerResolver = null;
    this.currentLineUsesBubble = false;
    this.ui.clearMessage();
    this.ui.clearSpeechBubble();
    this.notify();
  }

}
