import type { Point, Rect, CameraRuntimeState } from "../core/types";

export class Camera {
  x = 0;
  y = 0;
  width: number;
  height: number;
  zoom = 1;

  private targetX: number | null = null;
  private targetY: number | null = null;
  private followActorId: string | null = null;

  private edgeThreshold = 80;
  private lerpSpeed = 0.08;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getRuntimeState(): CameraRuntimeState {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      zoom: this.zoom,
      followActorId: this.followActorId,
    };
  }

  applyRuntimeState(s: CameraRuntimeState): void {
    this.x = s.x;
    this.y = s.y;
    this.width = s.width;
    this.height = s.height;
    this.zoom = s.zoom;
    this.followActorId = s.followActorId;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  followActor(actorId: string | null): void {
    this.followActorId = actorId;
  }

  snapToActor(actorX: number, actorY: number, roomWidth?: number, roomHeight?: number): void {
    this.x = actorX - this.width / 2;
    this.y = actorY - this.height / 2;
    this.clampToRoom(roomWidth, roomHeight);
  }

  update(actorX?: number, actorY?: number, roomWidth?: number, roomHeight?: number): void {
    if (this.followActorId !== null && actorX !== undefined && actorY !== undefined) {
      const screenX = actorX - this.x;
      const screenY = actorY - this.y;

      let desiredX = this.x;
      let desiredY = this.y;

      if (screenX < this.edgeThreshold) {
        desiredX = actorX - this.edgeThreshold;
      } else if (screenX > this.width - this.edgeThreshold) {
        desiredX = actorX - (this.width - this.edgeThreshold);
      }

      if (screenY < this.edgeThreshold) {
        desiredY = actorY - this.edgeThreshold;
      } else if (screenY > this.height - this.edgeThreshold) {
        desiredY = actorY - (this.height - this.edgeThreshold);
      }

      if (desiredX !== this.x) {
        this.x += (desiredX - this.x) * this.lerpSpeed;
        if (Math.abs(desiredX - this.x) < 0.5) this.x = desiredX;
      }
      if (desiredY !== this.y) {
        this.y += (desiredY - this.y) * this.lerpSpeed;
        if (Math.abs(desiredY - this.y) < 0.5) this.y = desiredY;
      }
    }

    this.clampToRoom(roomWidth, roomHeight);
  }

  private clampToRoom(roomWidth?: number, roomHeight?: number): void {
    if (roomWidth !== undefined) {
      if (roomWidth <= this.width) {
        this.x = 0;
      } else {
        this.x = Math.max(0, Math.min(this.x, roomWidth - this.width));
      }
    }
    if (roomHeight !== undefined) {
      if (roomHeight <= this.height) {
        this.y = 0;
      } else {
        this.y = Math.max(0, Math.min(this.y, roomHeight - this.height));
      }
    }
  }

  worldToScreen(wx: number, wy: number): Point {
    return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom };
  }

  screenToWorld(sx: number, sy: number): Point {
    return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y };
  }

  getViewport(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  resetToRoom(): void {
    this.x = 0;
    this.y = 0;
  }
}
