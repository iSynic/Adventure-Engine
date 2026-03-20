import type { ActorDefinition, Point, Direction, AnimationState, AnimationDefinition, ActorRuntimeState } from "../core/types";
import { computeWaypointPathEx, findWalkboxForPoint, findNearestWalkbox, getScaleAtY, closestPointInPolygon, buildEdgeMargins } from "../navigation/Walkbox";
import type { RoomDefinition } from "../core/types";
import { AnimationStateMachine, ANIMATION_FALLBACK_CHAIN } from "../animation/AnimationStateMachine";
import type { AnimationPriority } from "../animation/AnimationStateMachine";

const ARRIVAL_THRESHOLD = 2;

const DIRECTION_ORDER: Direction[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function directionIndex(d: Direction): number {
  return DIRECTION_ORDER.indexOf(d);
}

function nearestAvailableDirection(facing: Direction, available: Direction[]): Direction | null {
  if (available.length === 0) return null;
  if (available.includes(facing)) return facing;
  const fi = directionIndex(facing);
  let bestDir: Direction | null = null;
  let bestDist = 999;
  for (const d of available) {
    const di = directionIndex(d);
    const raw = Math.abs(fi - di);
    const dist = Math.min(raw, 8 - raw);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = d;
    }
  }
  return bestDir;
}

export class ActorInstance {
  readonly id: string;
  readonly definition: ActorDefinition;

  x: number;
  y: number;
  facing: Direction;
  visible: boolean;
  scale: number;
  baseScale: number;
  currentFrame = 0;
  frameTimer = 0;

  roomId: string = "";
  talking: boolean = false;
  busy: boolean = false;
  controlEnabled: boolean = true;

  readonly stateMachine = new AnimationStateMachine();

  private waypoints: Point[] = [];
  private speed: number;

  constructor(def: ActorDefinition) {
    this.id = def.id;
    this.definition = def;
    this.x = def.position?.x ?? 320;
    this.y = def.position?.y ?? 300;
    this.facing = def.facing ?? "S";
    this.visible = def.visible ?? true;
    this.baseScale = def.scale ?? 1;
    this.scale = this.baseScale;
    this.speed = def.movementSpeed ?? 120;
    this.roomId = def.defaultRoomId ?? "";
    this.controlEnabled = def.isPlayer ?? true;
  }

  updateScaleForRoom(room: RoomDefinition): void {
    const wb = findWalkboxForPoint({ x: this.x, y: this.y }, room);
    if (wb && wb.scale) {
      this.scale = this.baseScale * getScaleAtY(this.y, wb, room.height);
    } else {
      this.scale = this.baseScale;
    }
  }

  clampToWalkboxMargin(room: RoomDefinition): void {
    const margin = (this.getSpriteWidth() * this.scale) / 2;
    if (margin <= 0) return;
    const wb = findWalkboxForPoint({ x: this.x, y: this.y }, room) ?? findNearestWalkbox({ x: this.x, y: this.y }, room);
    if (!wb) return;
    const em = buildEdgeMargins(wb, room, margin);
    const clamped = closestPointInPolygon({ x: this.x, y: this.y }, wb.polygon, margin, em);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  get animationState(): AnimationState {
    return this.stateMachine.state;
  }

  set animationState(state: AnimationState) {
    this.stateMachine.transition(state, "automatic");
    this.currentFrame = 0;
    this.frameTimer = 0;
  }

  getRuntimeState(): ActorRuntimeState {
    return {
      roomId: this.roomId,
      x: this.x,
      y: this.y,
      facing: this.facing,
      animState: this.stateMachine.state,
      walking: this.isMoving(),
      talking: this.talking,
      busy: this.busy,
      visible: this.visible,
      controlEnabled: this.controlEnabled,
    };
  }

  applyRuntimeState(s: ActorRuntimeState): void {
    this.roomId = s.roomId;
    this.x = s.x;
    this.y = s.y;
    this.facing = s.facing;
    this.stateMachine.transition(s.animState, "automatic");
    this.talking = s.talking;
    this.busy = s.busy;
    this.visible = s.visible;
    this.controlEnabled = s.controlEnabled;
  }

  moveTo(target: Point, room: RoomDefinition): boolean {
    const start = { x: this.x, y: this.y };
    const margin = (this.getSpriteWidth() * this.scale) / 2;
    const result = computeWaypointPathEx(start, target, room, margin);
    this.waypoints = result.waypoints;
    if (this.waypoints.length > 0) {
      this.setAnimation("walk");
      this.updateFacingToward(this.waypoints[0]);
    }
    if (result.unreachable) {
      console.warn(`[Actor] "${this.id}" target unreachable, walking to nearest reachable point.`);
    }
    return !result.unreachable;
  }

  stopMoving(): void {
    this.waypoints = [];
    this.setAnimation("idle");
  }

  isMoving(): boolean {
    return this.waypoints.length > 0;
  }

  getDestination(): Point | null {
    if (this.waypoints.length === 0) return null;
    return this.waypoints[this.waypoints.length - 1];
  }

  getWaypoints(): Point[] {
    return [...this.waypoints];
  }

  update(deltaTime: number): void {
    if (this.waypoints.length > 0) {
      const target = this.waypoints[0];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const stepDist = this.speed * deltaTime;

      if (dist <= Math.max(stepDist, ARRIVAL_THRESHOLD)) {
        this.x = target.x;
        this.y = target.y;
        this.waypoints.shift();
        if (this.waypoints.length === 0) {
          this.setAnimation("idle");
        } else {
          this.updateFacingToward(this.waypoints[0]);
        }
      } else {
        this.x += (dx / dist) * stepDist;
        this.y += (dy / dist) * stepDist;
        this.updateFacingToward(target);
      }
    }

    const anim = this.getCurrentAnimation();
    if (anim && anim.frames.length > 0) {
      const forceNonLoop = this.stateMachine.isOneShot;
      this.frameTimer += deltaTime * 1000;
      while (this.frameTimer >= anim.frames[this.currentFrame % anim.frames.length].duration) {
        this.frameTimer -= anim.frames[this.currentFrame % anim.frames.length].duration;
        this.currentFrame++;
        if (this.currentFrame >= anim.frames.length) {
          if (anim.loop !== false && !forceNonLoop) {
            this.currentFrame = 0;
          } else {
            this.currentFrame = anim.frames.length - 1;
            this.frameTimer = 0;
            this.stateMachine.onAnimationComplete();
            break;
          }
        }
      }
    } else {
      this.frameTimer += deltaTime;
      if (this.frameTimer >= 0.15) {
        this.frameTimer = 0;
        this.currentFrame++;
      }
    }
  }

  private _flipH = false;

  shouldFlipHorizontally(): boolean {
    return this._flipH;
  }

  getCurrentAnimation(): AnimationDefinition | null {
    const anims = this.definition.animations;
    if (!anims) return null;

    const state = this.stateMachine.state;
    const facing = this.facing;

    const result = this.resolveAnimForState(anims, state, facing);
    if (result) return result;

    let fallbackState = ANIMATION_FALLBACK_CHAIN[state] ?? null;
    while (fallbackState) {
      const fallbackResult = this.resolveAnimForState(anims, fallbackState, facing);
      if (fallbackResult) return fallbackResult;
      fallbackState = ANIMATION_FALLBACK_CHAIN[fallbackState] ?? null;
    }

    this._flipH = false;
    return null;
  }

  private resolveAnimForState(
    anims: NonNullable<ActorDefinition["animations"]>,
    state: AnimationState,
    facing: Direction
  ): AnimationDefinition | null {
    const facingAnim = anims[facing]?.[state];
    if (facingAnim && facingAnim.frames.length > 0) {
      this._flipH = false;
      return facingAnim;
    }

    const mirrorMap: Partial<Record<Direction, Direction>> = {
      W: "E", NW: "NE", SW: "SE",
      E: "W", NE: "NW", SE: "SW",
    };
    const mirrorDir = mirrorMap[facing];
    if (mirrorDir) {
      const mirrorAnim = anims[mirrorDir]?.[state];
      if (mirrorAnim && mirrorAnim.frames.length > 0) {
        const westFacings: Direction[] = ["W", "NW", "SW"];
        this._flipH = westFacings.includes(facing);
        return mirrorAnim;
      }
    }

    const availableDirs = Object.keys(anims).filter(
      (d) => {
        if (d === "*") return false;
        const a = anims[d][state];
        return a && a.frames.length > 0;
      }
    ) as Direction[];

    const nearest = nearestAvailableDirection(facing, availableDirs);
    if (nearest) {
      const westFacings: Direction[] = ["W", "NW", "SW"];
      const eastFacings: Direction[] = ["E", "NE", "SE"];
      this._flipH = westFacings.includes(facing) && eastFacings.includes(nearest);
      return anims[nearest][state]!;
    }

    const baseAnim = anims["*"]?.[state];
    if (baseAnim && baseAnim.frames.length > 0) {
      this._flipH = false;
      return baseAnim;
    }

    this._flipH = false;
    return null;
  }

  getCurrentFrameImagePath(): string | null {
    const anim = this.getCurrentAnimation();
    if (!anim || anim.frames.length === 0) return null;
    const idx = this.currentFrame % anim.frames.length;
    return anim.frames[idx].imagePath;
  }

  updateFacingToward(target: Point): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle >= -22.5 && angle < 22.5) this.facing = "E";
    else if (angle >= 22.5 && angle < 67.5) this.facing = "SE";
    else if (angle >= 67.5 && angle < 112.5) this.facing = "S";
    else if (angle >= 112.5 && angle < 157.5) this.facing = "SW";
    else if (angle >= 157.5 || angle < -157.5) this.facing = "W";
    else if (angle >= -157.5 && angle < -112.5) this.facing = "NW";
    else if (angle >= -112.5 && angle < -67.5) this.facing = "N";
    else if (angle >= -67.5 && angle < -22.5) this.facing = "NE";
  }

  setAnimation(state: AnimationState, priority: AnimationPriority = "automatic"): void {
    const prevState = this.stateMachine.state;
    const changed = this.stateMachine.transition(state, priority);
    if (changed && prevState !== state) {
      this.currentFrame = 0;
      this.frameTimer = 0;
    }
  }

  releaseAnimation(restoreTo: AnimationState = "idle"): void {
    const prevState = this.stateMachine.state;
    this.stateMachine.release(restoreTo);
    if (this.stateMachine.state !== prevState) {
      this.currentFrame = 0;
      this.frameTimer = 0;
    }
  }

  playAnimationOneShot(
    state: AnimationState,
    priority: AnimationPriority = "scripted",
    returnTo?: AnimationState,
    onComplete?: () => void
  ): void {
    const prevState = this.stateMachine.state;
    const changed = this.stateMachine.transitionOneShot(state, priority, returnTo, onComplete);
    if (!changed) {
      if (onComplete) onComplete();
      return;
    }
    if (prevState !== state) {
      this.currentFrame = 0;
      this.frameTimer = 0;
    }
    const anim = this.getCurrentAnimation();
    if (!anim || anim.frames.length === 0) {
      this.stateMachine.onAnimationMissing();
    }
  }

  setAnimationOverride(state: AnimationState): void {
    this.stateMachine.setOverride(state);
    this.currentFrame = 0;
    this.frameTimer = 0;
  }

  clearAnimationOverride(): void {
    this.stateMachine.clearOverride();
    this.currentFrame = 0;
    this.frameTimer = 0;
  }

  getSpritePath(): string | undefined {
    return this.definition.spritePath;
  }

  getSpriteWidth(): number {
    return this.definition.spriteWidth ?? 48;
  }

  getSpriteHeight(): number {
    return this.definition.spriteHeight ?? 64;
  }
}
