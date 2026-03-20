import type {
  RoomDefinition,
  ActorDefinition,
  ObjectDefinition,
  ItemDefinition,
  DialogueDefinition,
} from "./types";

export class Registry {
  private rooms = new Map<string, RoomDefinition>();
  private actors = new Map<string, ActorDefinition>();
  private objects = new Map<string, ObjectDefinition>();
  private items = new Map<string, ItemDefinition>();
  private dialogue = new Map<string, DialogueDefinition>();

  registerRoom(def: RoomDefinition): void {
    this.rooms.set(def.id, def);
  }

  registerActor(def: ActorDefinition): void {
    this.actors.set(def.id, def);
  }

  registerObject(def: ObjectDefinition): void {
    this.objects.set(def.id, def);
  }

  registerItem(def: ItemDefinition): void {
    this.items.set(def.id, def);
  }

  registerDialogue(def: DialogueDefinition): void {
    this.dialogue.set(def.id, def);
  }

  getRoom(id: string): RoomDefinition | undefined {
    return this.rooms.get(id);
  }

  getActor(id: string): ActorDefinition | undefined {
    return this.actors.get(id);
  }

  getObject(id: string): ObjectDefinition | undefined {
    return this.objects.get(id);
  }

  getItem(id: string): ItemDefinition | undefined {
    return this.items.get(id);
  }

  getDialogue(id: string): DialogueDefinition | undefined {
    return this.dialogue.get(id);
  }

  getAllRooms(): RoomDefinition[] {
    return Array.from(this.rooms.values());
  }

  getAllActors(): ActorDefinition[] {
    return Array.from(this.actors.values());
  }

  getAllObjects(): ObjectDefinition[] {
    return Array.from(this.objects.values());
  }

  getAllItems(): ItemDefinition[] {
    return Array.from(this.items.values());
  }

  loadFromConfig(config: import("./types").GameConfig): void {
    for (const room of config.rooms) this.registerRoom(room);
    for (const actor of config.actors) this.registerActor(actor);
    for (const obj of config.objects) this.registerObject(obj);
    for (const item of config.items) this.registerItem(item);
    if (config.dialogue) {
      for (const d of config.dialogue) this.registerDialogue(d);
    }
  }
}
