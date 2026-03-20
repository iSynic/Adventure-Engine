import type { ExitDefinition, Rect, Direction } from "../core/types";

export class ExitRegion {
  readonly id: string;
  readonly definition: ExitDefinition;
  enabled: boolean = true;

  constructor(def: ExitDefinition) {
    this.id = def.id;
    this.definition = def;
  }

  getBounds(): Rect {
    return { ...this.definition.bounds };
  }

  containsPoint(px: number, py: number): boolean {
    const b = this.definition.bounds;
    return px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height;
  }

  get targetRoomId(): string {
    return this.definition.targetRoomId;
  }

  get targetSpawnPointId(): string | undefined {
    return this.definition.targetSpawnPointId;
  }

  get direction(): Direction {
    return this.definition.direction;
  }

  get label(): string | undefined {
    return this.definition.label;
  }
}
