import type { Point } from "../../engine/core/types";

export const HANDLE_SIZE = 7;
export const MIN_RECT_SIZE = 10;

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
};

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ptInRect(px: number, py: number, x: number, y: number, w: number, h: number) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

export function ptNearPoint(px: number, py: number, x: number, y: number, r = 8) {
  return Math.hypot(px - x, py - y) <= r;
}

export function ptInPoly(px: number, py: number, poly: Point[]) {
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

export function polyBounds(poly: Point[]): Rect {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

export function getHandlePositions(x: number, y: number, w: number, h: number): Record<ResizeHandle, Point> {
  return {
    nw: { x, y },
    ne: { x: x + w, y },
    sw: { x, y: y + h },
    se: { x: x + w, y: y + h },
  };
}

export function hitTestHandle(pt: Point, x: number, y: number, w: number, h: number): ResizeHandle | null {
  const handles = getHandlePositions(x, y, w, h);
  for (const [key, pos] of Object.entries(handles)) {
    if (Math.abs(pt.x - pos.x) <= HANDLE_SIZE && Math.abs(pt.y - pos.y) <= HANDLE_SIZE) {
      return key as ResizeHandle;
    }
  }
  return null;
}

export function drawHandles(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const handles = getHandlePositions(x, y, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  for (const pos of Object.values(handles)) {
    ctx.fillRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
  }
}

export function applyResize(orig: Rect, handle: ResizeHandle, dx: number, dy: number): Rect {
  let { x, y, width, height } = orig;
  switch (handle) {
    case "se":
      width = Math.max(MIN_RECT_SIZE, width + dx);
      height = Math.max(MIN_RECT_SIZE, height + dy);
      break;
    case "sw":
      x = x + dx;
      width = Math.max(MIN_RECT_SIZE, width - dx);
      if (width === MIN_RECT_SIZE) x = orig.x + orig.width - MIN_RECT_SIZE;
      height = Math.max(MIN_RECT_SIZE, height + dy);
      break;
    case "ne":
      width = Math.max(MIN_RECT_SIZE, width + dx);
      y = y + dy;
      height = Math.max(MIN_RECT_SIZE, height - dy);
      if (height === MIN_RECT_SIZE) y = orig.y + orig.height - MIN_RECT_SIZE;
      break;
    case "nw":
      x = x + dx;
      width = Math.max(MIN_RECT_SIZE, width - dx);
      if (width === MIN_RECT_SIZE) x = orig.x + orig.width - MIN_RECT_SIZE;
      y = y + dy;
      height = Math.max(MIN_RECT_SIZE, height - dy);
      if (height === MIN_RECT_SIZE) y = orig.y + orig.height - MIN_RECT_SIZE;
      break;
  }
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}
