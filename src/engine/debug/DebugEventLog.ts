import type { EventBus, EngineEventMap, EngineEventName } from "../core/EventBus";

export type DebugEventCategory =
  | "verb"
  | "script"
  | "room"
  | "flag"
  | "variable"
  | "inventory"
  | "dialogue"
  | "event";

export interface DebugEvent {
  id: number;
  timestamp: number;
  category: DebugEventCategory;
  message: string;
}

type DebugEventListener = (events: DebugEvent[]) => void;

export class DebugEventLog {
  private events: DebugEvent[] = [];
  private nextId = 1;
  private maxEvents = 500;
  private listeners: DebugEventListener[] = [];
  private busHandlers: Array<{ event: EngineEventName; handler: (payload: unknown) => void }> = [];
  private subscribedBus: EventBus<EngineEventMap> | null = null;

  log(category: DebugEventCategory, message: string): void {
    const event: DebugEvent = {
      id: this.nextId++,
      timestamp: Date.now(),
      category,
      message,
    };
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    this.notify();
  }

  subscribeToEventBus(bus: EventBus<EngineEventMap>): void {
    if (this.subscribedBus) {
      this.unsubscribeFromEventBus();
    }
    this.subscribedBus = bus;
    const allEvents: EngineEventName[] = [
      "room:entered",
      "room:exited",
      "object:interacted",
      "item:collected",
      "dialogue:started",
      "dialogue:ended",
      "script:started",
      "script:completed",
      "variable:changed",
    ];
    for (const eventName of allEvents) {
      const handler = (payload: unknown) => {
        this.log("event", `[${eventName}] ${JSON.stringify(payload)}`);
      };
      bus.on(eventName, handler);
      this.busHandlers.push({ event: eventName, handler });
    }
  }

  unsubscribeFromEventBus(): void {
    if (this.subscribedBus) {
      for (const { event, handler } of this.busHandlers) {
        this.subscribedBus.off(event, handler);
      }
    }
    this.busHandlers = [];
    this.subscribedBus = null;
  }

  getEvents(): readonly DebugEvent[] {
    return this.events;
  }

  getFilteredEvents(categories?: DebugEventCategory[]): readonly DebugEvent[] {
    if (!categories || categories.length === 0) return this.events;
    return this.events.filter((e) => categories.includes(e.category));
  }

  clear(): void {
    this.events = [];
    this.nextId = 1;
    this.notify();
  }

  subscribe(listener: DebugEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l(this.events);
  }

  dispose(): void {
    this.unsubscribeFromEventBus();
    this.events = [];
    this.listeners = [];
  }
}
