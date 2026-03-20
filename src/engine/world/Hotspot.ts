import type { HotspotDefinition, Point, Rect, VerbType } from "../core/types";

function ptInPoly(px: number, py: number, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export class HotspotInstance {
  readonly id: string;
  readonly definition: HotspotDefinition;
  enabled: boolean = true;

  constructor(def: HotspotDefinition) {
    this.id = def.id;
    this.definition = def;
  }

  getBounds(): Rect {
    return { ...this.definition.bounds };
  }

  containsPoint(px: number, py: number): boolean {
    if (this.definition.polygon && this.definition.polygon.length >= 3) {
      return ptInPoly(px, py, this.definition.polygon);
    }
    const b = this.definition.bounds;
    return px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height;
  }

  getHandler(verb: VerbType): string | undefined {
    return this.definition.verbHandlers?.[verb];
  }

  get name(): string {
    return this.definition.name;
  }

  get description(): string | undefined {
    return this.definition.description;
  }
}
