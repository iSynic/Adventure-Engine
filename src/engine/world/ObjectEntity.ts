import type { ObjectDefinition, Rect, StateSpriteEntry, ObjectRuntimeState } from "../core/types";

export class ObjectEntity {
  readonly id: string;
  readonly definition: ObjectDefinition;

  x: number;
  y: number;
  visible: boolean;
  enabled: boolean;
  state: Record<string, unknown>;

  roomId: string | null;
  ownerId: string | null = null;
  interactionEnabled: boolean = true;
  classFlags: string[] = [];
  primaryState: number = 0;

  constructor(def: ObjectDefinition) {
    this.id = def.id;
    this.definition = def;
    this.x = def.position?.x ?? 0;
    this.y = def.position?.y ?? 0;
    this.visible = def.visible ?? true;
    this.enabled = def.enabled ?? true;
    this.state = def.state ? { ...def.state } : {};
    this.roomId = def.roomId ?? null;
    this.classFlags = def.tags ? [...def.tags] : [];
    this.primaryState = def.primaryState ?? 0;
  }

  getRuntimeState(): ObjectRuntimeState {
    return {
      roomId: this.roomId,
      ownerId: this.ownerId,
      visible: this.visible,
      enabled: this.enabled,
      interactionEnabled: this.interactionEnabled,
      currentState: { ...this.state },
      x: this.x,
      y: this.y,
      classFlags: [...this.classFlags],
      primaryState: this.primaryState,
    };
  }

  applyRuntimeState(s: ObjectRuntimeState): void {
    this.roomId = s.roomId;
    this.ownerId = s.ownerId;
    this.visible = s.visible;
    this.enabled = s.enabled;
    this.interactionEnabled = s.interactionEnabled;
    this.state = { ...s.currentState };
    this.x = s.x;
    this.y = s.y;
    const flags = s.classFlags ?? [];
    this.classFlags = flags.length > 0 ? [...flags] : (this.definition.tags ? [...this.definition.tags] : []);
    this.primaryState = s.primaryState ?? 0;
  }

  getActiveStateSprite(): StateSpriteEntry | null {
    const entries = this.definition.stateSprites;
    if (!entries || entries.length === 0) return null;

    for (const entry of entries) {
      if (entry.stateKey === "__primaryState") {
        if (String(this.primaryState) === entry.stateValue) {
          return entry;
        }
        continue;
      }
      const currentVal = this.state[entry.stateKey];
      if (String(currentVal) === entry.stateValue) {
        return entry;
      }
    }

    if (this.primaryState >= 0 && this.primaryState < entries.length) {
      return entries[this.primaryState];
    }
    return null;
  }

  getActiveSpritePath(): string | undefined {
    const match = this.getActiveStateSprite();
    if (match) return match.spritePath;
    return this.definition.spritePath;
  }

  getBounds(): Rect {
    const match = this.getActiveStateSprite();
    const boundsOverride = match?.bounds;

    if (boundsOverride) {
      return {
        x: this.x + boundsOverride.x,
        y: this.y + boundsOverride.y,
        width: boundsOverride.width,
        height: boundsOverride.height,
      };
    }

    if (this.definition.bounds) {
      return {
        x: this.x + this.definition.bounds.x,
        y: this.y + this.definition.bounds.y,
        width: this.definition.bounds.width,
        height: this.definition.bounds.height,
      };
    }
    const w = this.definition.spriteWidth ?? 64;
    const h = this.definition.spriteHeight ?? 64;
    return {
      x: this.x - w / 2,
      y: this.y - h,
      width: w,
      height: h,
    };
  }

  containsPoint(px: number, py: number): boolean {
    const hotspot = this.definition.interactionHotspot;
    if (hotspot) {
      return px >= hotspot.x && px <= hotspot.x + hotspot.width && py >= hotspot.y && py <= hotspot.y + hotspot.height;
    }
    const bounds = this.getBounds();
    return (
      px >= bounds.x &&
      px <= bounds.x + bounds.width &&
      py >= bounds.y &&
      py <= bounds.y + bounds.height
    );
  }

  getState<T>(key: string): T | undefined {
    return this.state[key] as T | undefined;
  }

  setState(key: string, value: unknown): void {
    this.state[key] = value;
  }

  getSpriteWidth(): number {
    return this.definition.spriteWidth ?? 64;
  }

  getSpriteHeight(): number {
    return this.definition.spriteHeight ?? 64;
  }
}
