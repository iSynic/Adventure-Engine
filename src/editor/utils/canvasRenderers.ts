import type { Point, ExitDefinition, InteractionAnchor, Direction } from "../../engine/core/types";
import type { EditorWalkbox, EditorHotspot, SelectedEntity } from "../types";
import { drawHandles, type Rect, type ResizeHandle, applyResize } from "./canvasGeometry";

const WALKBOX_COLORS = ["#4ec94e","#4eefff","#ff8c4e","#cf4eff","#ff4e8c","#ffe04e"];
const EXIT_COLOR = "#ff8c00";
const HOTSPOT_COLOR = "#ffe000";
const SPAWN_COLOR = "#00e5ff";
const OBJECT_COLOR = "#ff4e9e";
const ACTOR_COLOR = "#4e9eff";
const SELECTED_COLOR = "#ffffff";
const APPROACH_COLOR = "#00ffcc";
const ANCHOR_COLOR = "#ffaa00";

export { EXIT_COLOR, HOTSPOT_COLOR, SPAWN_COLOR, OBJECT_COLOR, ACTOR_COLOR, SELECTED_COLOR, APPROACH_COLOR, ANCHOR_COLOR };

export interface DragState {
  entityType: string;
  entityId: string;
  origPos: Point;
  origBounds?: Rect;
  origPolygon?: Point[];
  resizeHandle?: ResizeHandle;
  vertexIdx?: number;
  approachGizmo?: string;
}

export interface ApproachGizmoData {
  standPoint?: Point;
  approachDirection?: Direction;
  anchors?: Partial<Record<string, InteractionAnchor>>;
}

export interface DragDelta {
  dx: number;
  dy: number;
}

function applyResizeForDraw(orig: Rect, handle: ResizeHandle, dx: number, dy: number): Rect {
  return applyResize(orig, handle, dx, dy);
}

export function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, bgImg: HTMLImageElement | null) {
  ctx.clearRect(0, 0, W, H);
  if (bgImg && bgImg.width > 1) {
    ctx.drawImage(bgImg, 0, 0, W, H);
  } else {
    const sz = 40;
    for (let r = 0; r < H / sz; r++) {
      for (let c = 0; c < W / sz; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#2a2a3a" : "#1e1e2e";
        ctx.fillRect(c * sz, r * sz, sz, sz);
      }
    }
    ctx.fillStyle = "#666";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("No background — assign one in Properties", W / 2, H / 2);
    ctx.textAlign = "left";
  }
}

export function drawWalkboxes(
  ctx: CanvasRenderingContext2D,
  walkboxes: EditorWalkbox[],
  selected: SelectedEntity | null,
  dd: DragState | null,
  delta: DragDelta,
) {
  walkboxes.forEach((wb, i) => {
    if (wb.polygon.length < 2) return;
    const color = WALKBOX_COLORS[i % WALKBOX_COLORS.length];
    const isSel = selected?.type === "walkbox" && selected.id === wb.id;
    const isDragged = dd && dd.entityType === "walkbox" && dd.entityId === wb.id;
    let poly = wb.polygon;
    if (isDragged) {
      if (dd.vertexIdx !== undefined) {
        poly = poly.map((p, idx) =>
          idx === dd.vertexIdx ? { x: dd.origPos.x + delta.dx, y: dd.origPos.y + delta.dy } : p
        );
      } else if (dd.origPolygon) {
        poly = dd.origPolygon.map((p) => ({ x: p.x + delta.dx, y: p.y + delta.dy }));
      }
    }
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k].x, poly[k].y);
    ctx.closePath();
    ctx.fillStyle = color + (isSel ? "55" : "33");
    ctx.fill();
    ctx.strokeStyle = isSel ? SELECTED_COLOR : color;
    ctx.lineWidth = isSel ? 2 : 1.5;
    ctx.stroke();

    poly.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSel ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? SELECTED_COLOR : color;
      ctx.fill();
    });

    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    ctx.fillStyle = color;
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(wb.id, cx, cy);
    ctx.textAlign = "left";
  });
}

export function drawExits(
  ctx: CanvasRenderingContext2D,
  exits: ExitDefinition[],
  selected: SelectedEntity | null,
  dd: DragState | null,
  delta: DragDelta,
) {
  exits.forEach((exit) => {
    const isSel = selected?.type === "exit" && selected.id === exit.id;
    let b = exit.bounds;
    if (dd && dd.entityType === "exit" && dd.entityId === exit.id && dd.origBounds) {
      if (dd.resizeHandle) {
        b = applyResizeForDraw(dd.origBounds, dd.resizeHandle, delta.dx, delta.dy);
      } else {
        b = { ...b, x: dd.origBounds.x + delta.dx, y: dd.origBounds.y + delta.dy };
      }
    }
    ctx.strokeStyle = isSel ? SELECTED_COLOR : EXIT_COLOR;
    ctx.lineWidth = isSel ? 2 : 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(b.x, b.y, b.width, b.height);
    ctx.setLineDash([]);
    ctx.fillStyle = EXIT_COLOR + "33";
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.fillStyle = isSel ? SELECTED_COLOR : EXIT_COLOR;
    ctx.font = "11px monospace";
    ctx.fillText(`→ ${exit.targetRoomId || "?"}`, b.x + 3, b.y + 14);
    if (isSel) drawHandles(ctx, b.x, b.y, b.width, b.height);
  });
}

export function drawHotspots(
  ctx: CanvasRenderingContext2D,
  hotspots: EditorHotspot[],
  selected: SelectedEntity | null,
  dd: DragState | null,
  delta: DragDelta,
) {
  hotspots.forEach((hs) => {
    const isSel = selected?.type === "hotspot" && selected.id === hs.id;
    const isDraggedHs = dd && dd.entityType === "hotspot" && dd.entityId === hs.id;

    if (hs.polygon && hs.polygon.length >= 3) {
      let poly = hs.polygon;
      if (isDraggedHs) {
        if (dd.vertexIdx !== undefined) {
          poly = poly.map((p, idx) =>
            idx === dd.vertexIdx ? { x: dd.origPos.x + delta.dx, y: dd.origPos.y + delta.dy } : p
          );
        } else if (dd.origPolygon) {
          poly = dd.origPolygon.map((p) => ({ x: p.x + delta.dx, y: p.y + delta.dy }));
        }
      }
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k].x, poly[k].y);
      ctx.closePath();
      ctx.fillStyle = HOTSPOT_COLOR + (isSel ? "44" : "22");
      ctx.fill();
      ctx.strokeStyle = isSel ? SELECTED_COLOR : HOTSPOT_COLOR;
      ctx.lineWidth = isSel ? 2 : 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      poly.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSel ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? SELECTED_COLOR : HOTSPOT_COLOR;
        ctx.fill();
      });

      const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
      const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
      ctx.fillStyle = isSel ? SELECTED_COLOR : HOTSPOT_COLOR;
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(hs.name, cx, cy);
      ctx.textAlign = "left";
    } else {
      let b = hs.bounds;
      if (isDraggedHs && dd.origBounds) {
        if (dd.resizeHandle) {
          b = applyResizeForDraw(dd.origBounds, dd.resizeHandle, delta.dx, delta.dy);
        } else {
          b = { ...b, x: dd.origBounds.x + delta.dx, y: dd.origBounds.y + delta.dy };
        }
      }
      ctx.strokeStyle = isSel ? SELECTED_COLOR : HOTSPOT_COLOR;
      ctx.lineWidth = isSel ? 2 : 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(b.x, b.y, b.width, b.height);
      ctx.setLineDash([]);
      ctx.fillStyle = HOTSPOT_COLOR + "22";
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.fillStyle = isSel ? SELECTED_COLOR : HOTSPOT_COLOR;
      ctx.font = "11px monospace";
      ctx.fillText(hs.name, b.x + 3, b.y + 14);
      if (isSel) drawHandles(ctx, b.x, b.y, b.width, b.height);
    }
  });
}

interface SpawnPoint {
  id: string;
  x: number;
  y: number;
}

export function drawSpawnPoints(
  ctx: CanvasRenderingContext2D,
  spawnPoints: SpawnPoint[],
  selected: SelectedEntity | null,
  dd: DragState | null,
  delta: DragDelta,
) {
  spawnPoints.forEach((sp) => {
    const isSel = selected?.type === "spawn" && selected.id === sp.id;
    let sx = sp.x;
    let sy = sp.y;
    if (dd && dd.entityType === "spawn" && dd.entityId === sp.id) {
      sx = dd.origPos.x + delta.dx;
      sy = dd.origPos.y + delta.dy;
    }
    ctx.beginPath();
    ctx.arc(sx, sy, isSel ? 10 : 7, 0, Math.PI * 2);
    ctx.fillStyle = SPAWN_COLOR + "55";
    ctx.fill();
    ctx.strokeStyle = isSel ? SELECTED_COLOR : SPAWN_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = isSel ? SELECTED_COLOR : SPAWN_COLOR;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(sp.id, sx, sy - 12);
    ctx.textAlign = "left";
  });
}

type SpriteMap = Map<string, HTMLImageElement | null>;

interface ObjectEntity {
  id: string;
  name: string;
  position?: { x: number; y: number };
  spriteWidth?: number;
  spriteHeight?: number;
  spritePath?: string;
}

export function drawObjects(
  ctx: CanvasRenderingContext2D,
  objects: ObjectEntity[],
  selected: SelectedEntity | null,
  dd: DragState | null,
  delta: DragDelta,
  spriteMap?: SpriteMap,
) {
  objects.forEach((obj) => {
    const isSel = selected?.type === "object" && selected.id === obj.id;
    let x = obj.position?.x ?? 100;
    let y = obj.position?.y ?? 200;
    let w = obj.spriteWidth ?? 48;
    let h = obj.spriteHeight ?? 48;
    if (dd && dd.entityType === "object" && dd.entityId === obj.id) {
      if (dd.resizeHandle && dd.origBounds) {
        const nb = applyResizeForDraw(dd.origBounds, dd.resizeHandle, delta.dx, delta.dy);
        w = nb.width;
        h = nb.height;
        x = nb.x + w / 2;
        y = nb.y + h;
      } else {
        x = dd.origPos.x + delta.dx;
        y = dd.origPos.y + delta.dy;
      }
    }
    const sprite = obj.spritePath ? spriteMap?.get(obj.spritePath) : undefined;
    if (sprite) {
      ctx.drawImage(sprite, x - w / 2, y - h, w, h);
      ctx.strokeStyle = isSel ? SELECTED_COLOR : OBJECT_COLOR;
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.strokeRect(x - w / 2, y - h, w, h);
    } else {
      ctx.fillStyle = isSel ? OBJECT_COLOR + "88" : OBJECT_COLOR + "44";
      ctx.fillRect(x - w / 2, y - h, w, h);
      ctx.strokeStyle = isSel ? SELECTED_COLOR : OBJECT_COLOR;
      ctx.lineWidth = isSel ? 2 : 1.5;
      ctx.strokeRect(x - w / 2, y - h, w, h);
    }
    ctx.fillStyle = isSel ? SELECTED_COLOR : OBJECT_COLOR;
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(obj.name, x, y - h - 4);
    ctx.textAlign = "left";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = isSel ? SELECTED_COLOR : OBJECT_COLOR;
    ctx.fill();
    if (isSel) drawHandles(ctx, x - w / 2, y - h, w, h);
  });
}

interface ActorEntity {
  id: string;
  name: string;
  position?: { x: number; y: number };
  spriteWidth?: number;
  spriteHeight?: number;
  spritePath?: string;
}

export function drawActors(
  ctx: CanvasRenderingContext2D,
  actors: ActorEntity[],
  selected: SelectedEntity | null,
  dd: DragState | null,
  delta: DragDelta,
  spriteMap?: SpriteMap,
) {
  actors.forEach((actor) => {
    const isSel = selected?.type === "actor" && selected.id === actor.id;
    let x = actor.position?.x ?? 200;
    let y = actor.position?.y ?? 350;
    const w = actor.spriteWidth ?? 40;
    const h = actor.spriteHeight ?? 60;
    if (dd && dd.entityType === "actor" && dd.entityId === actor.id) {
      x = dd.origPos.x + delta.dx;
      y = dd.origPos.y + delta.dy;
    }
    const sprite = actor.spritePath ? spriteMap?.get(actor.spritePath) : undefined;
    if (sprite) {
      ctx.drawImage(sprite, x - w / 2, y - h, w, h);
      ctx.strokeStyle = isSel ? SELECTED_COLOR : ACTOR_COLOR;
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.strokeRect(x - w / 2, y - h, w, h);
    } else {
      ctx.fillStyle = isSel ? ACTOR_COLOR + "88" : ACTOR_COLOR + "44";
      ctx.fillRect(x - w / 2, y - h, w, h);
      ctx.strokeStyle = isSel ? SELECTED_COLOR : ACTOR_COLOR;
      ctx.lineWidth = isSel ? 2 : 1.5;
      ctx.strokeRect(x - w / 2, y - h, w, h);
    }
    ctx.fillStyle = isSel ? SELECTED_COLOR : ACTOR_COLOR;
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(actor.name, x, y - h - 4);
    ctx.textAlign = "left";
  });
}

export function drawInProgressPoly(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let k = 1; k < points.length; k++) ctx.lineTo(points[k].x, points[k].y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 2]);
  ctx.stroke();
  ctx.setLineDash([]);
  points.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, i === 0 ? 7 : 4, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? color : (color === "#fff" ? "#aaa" : "#ccc800");
    ctx.fill();
  });
}

export function drawRectPreview(
  ctx: CanvasRenderingContext2D,
  start: Point,
  cur: Point,
  color: string,
) {
  const x = Math.min(start.x, cur.x);
  const y = Math.min(start.y, cur.y);
  const w = Math.abs(cur.x - start.x);
  const h = Math.abs(cur.y - start.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.fillStyle = color + "22";
  ctx.fillRect(x, y, w, h);
}

// ─── Approach-point gizmos ────────────────────────────────────────────────────

const DIR_ANGLES: Partial<Record<Direction, number>> = {
  N: -Math.PI / 2,
  NE: -Math.PI / 4,
  E: 0,
  SE: Math.PI / 4,
  S: Math.PI / 2,
  SW: (3 * Math.PI) / 4,
  W: Math.PI,
  NW: (-3 * Math.PI) / 4,
};

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string, invScale = 1) {
  const s = size * invScale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s, cy);
  ctx.closePath();
  ctx.fillStyle = color + "bb";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * invScale;
  ctx.stroke();
}

function drawDirArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: Direction, color: string, invScale = 1) {
  const angle = DIR_ANGLES[dir];
  if (angle === undefined) return;
  const len = 13 * invScale;
  const ex = cx + Math.cos(angle) * len;
  const ey = cy + Math.sin(angle) * len;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * invScale;
  ctx.stroke();
  const hl = 5 * invScale;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - Math.cos(angle - 0.5) * hl, ey - Math.sin(angle - 0.5) * hl);
  ctx.lineTo(ex - Math.cos(angle + 0.5) * hl, ey - Math.sin(angle + 0.5) * hl);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawApproachPointGizmos(
  ctx: CanvasRenderingContext2D,
  data: ApproachGizmoData,
  dd: DragState | null,
  delta: DragDelta,
  invScale = 1,
) {
  if (data.standPoint) {
    let { x, y } = data.standPoint;
    if (dd?.approachGizmo === "standPoint") {
      x = dd.origPos.x + delta.dx;
      y = dd.origPos.y + delta.dy;
    }
    drawDiamond(ctx, x, y, 6, APPROACH_COLOR, invScale);
    if (data.approachDirection) {
      drawDirArrow(ctx, x, y, data.approachDirection, APPROACH_COLOR, invScale);
    }
    ctx.fillStyle = "#000";
    ctx.font = `bold ${8 * invScale}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("P", x, y + 3 * invScale);
    ctx.textAlign = "left";
  }

  if (data.anchors) {
    for (const [verb, anchor] of Object.entries(data.anchors)) {
      if (!anchor) continue;
      let { x, y } = anchor.point;
      if (dd?.approachGizmo === verb) {
        x = dd.origPos.x + delta.dx;
        y = dd.origPos.y + delta.dy;
      }
      drawDiamond(ctx, x, y, 5, ANCHOR_COLOR, invScale);
      if (anchor.facing) {
        drawDirArrow(ctx, x, y, anchor.facing, ANCHOR_COLOR, invScale);
      }
      ctx.fillStyle = "#000";
      ctx.font = `bold ${7 * invScale}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(verb.slice(0, 3).toUpperCase(), x, y + 3 * invScale);
      ctx.textAlign = "left";
      ctx.fillStyle = ANCHOR_COLOR;
      ctx.font = `${9 * invScale}px monospace`;
      ctx.fillText(verb, x + 8 * invScale, y - 6 * invScale);
    }
  }
}
