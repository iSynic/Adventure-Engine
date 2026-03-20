import type { VerbType, TargetType } from "./types";

export interface EngineEventMap {
  "room:entered": { roomId: string; previousRoomId: string | null };
  "room:exited": { roomId: string; nextRoomId: string };
  "object:interacted": {
    objectId: string;
    objectType: TargetType;
    verb: VerbType;
    actorId: string;
    secondaryTargetId: string | null;
  };
  "item:collected": { actorId: string; itemId: string };
  "dialogue:started": { treeId: string };
  "dialogue:ended": { treeId: string };
  "script:started": { hookId: string };
  "script:completed": { hookId: string; status: "complete" | "error" | "cancel" };
  "variable:changed": {
    type: "flag" | "variable" | "objectState" | "roomVar" | "room";
    key: string;
    value: unknown;
  };
}

export type EngineEventName = keyof EngineEventMap;

type EventHandler<T> = (payload: T) => void;

export class EventBus<TMap extends { [K in keyof TMap]: unknown }> {
  private listeners = new Map<keyof TMap, Set<EventHandler<any>>>();

  on<K extends keyof TMap>(event: K, handler: EventHandler<TMap[K]>): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  off<K extends keyof TMap>(event: K, handler: EventHandler<TMap[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit<K extends keyof TMap>(event: K, payload: TMap[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        try {
          handler(payload);
        } catch (e) {
          console.error(`[EventBus] Error in handler for "${String(event)}":`, e);
        }
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
