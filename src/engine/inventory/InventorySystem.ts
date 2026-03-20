import type { ItemDefinition } from "../core/types";
import type { Registry } from "../core/Registry";
import type { StateStore } from "../state/StateStore";

type InventoryChangeCallback = (actorId: string, itemId: string, action: "add" | "remove") => void;

export class InventorySystem {
  private changeListeners: InventoryChangeCallback[] = [];

  constructor(
    private registry: Registry,
    private state: StateStore
  ) {}

  onItemChange(cb: InventoryChangeCallback): () => void {
    this.changeListeners.push(cb);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== cb);
    };
  }

  getItems(actorId: string): ItemDefinition[] {
    const itemIds = this.state.getInventory(actorId);
    return itemIds
      .map((id) => this.registry.getItem(id))
      .filter((item): item is ItemDefinition => item !== undefined);
  }

  addItem(actorId: string, itemId: string): void {
    this.state.addToInventory(actorId, itemId);
    console.log(`[Inventory] ${actorId} picked up: ${itemId}`);
    for (const cb of this.changeListeners) cb(actorId, itemId, "add");
  }

  removeItem(actorId: string, itemId: string): void {
    this.state.removeFromInventory(actorId, itemId);
    for (const cb of this.changeListeners) cb(actorId, itemId, "remove");
  }

  hasItem(actorId: string, itemId: string): boolean {
    return this.state.hasItem(actorId, itemId);
  }

  getItem(itemId: string): ItemDefinition | undefined {
    return this.registry.getItem(itemId);
  }

  getItemCount(actorId: string): number {
    return this.state.getInventory(actorId).length;
  }

  getItemIds(actorId: string): string[] {
    return this.state.getInventory(actorId);
  }

  getSnapshot(): Record<string, string[]> {
    const stateSnapshot = this.state.getSnapshot();
    return Object.fromEntries(
      Object.entries(stateSnapshot.inventory).map(([k, v]) => [k, [...v]])
    );
  }
}
