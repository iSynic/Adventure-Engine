import { useState, useRef, useCallback } from "react";
import type { Point, ExitDefinition, VerbType } from "../../engine/core/types";
import type { SelectedEntityType, SelectedEntity, EditorRoomDefinition, EditorProject, EditorHotspot, EditorAction } from "../types";
import { generateId } from "../utils/projectStorage";
import {
  ptInRect,
  ptNearPoint,
  ptInPoly,
  polyBounds,
  hitTestHandle,
  applyResize,
  HANDLE_CURSORS,
  type Rect,
  type ResizeHandle,
} from "../utils/canvasGeometry";
import { resolveDisplayConfig } from "../../shared/displayConfig";

interface HitResult {
  type: SelectedEntityType;
  id: string;
  vertexIdx?: number;
  resizeHandle?: ResizeHandle;
  approachGizmo?: string;
}

export interface DragState {
  entityType: SelectedEntityType;
  entityId: string;
  startX: number;
  startY: number;
  origPos: Point;
  vertexIdx?: number;
  origBounds?: Rect;
  origPolygon?: Point[];
  resizeHandle?: ResizeHandle;
  approachGizmo?: string;
}

interface UseCanvasInteractionsArgs {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  selectedRoom: EditorRoomDefinition | null;
  project: EditorProject | null;
  tool: string;
  selected: SelectedEntity | null;
  hotspotDrawMode: string;
  dispatch: React.Dispatch<EditorAction>;
  drawCanvasRef: React.MutableRefObject<(() => void) | null>;
  dragRef: React.MutableRefObject<DragState | null>;
  dragDeltaRef: React.MutableRefObject<{ dx: number; dy: number }>;
  zoom?: number;
}

export function useCanvasInteractions({
  canvasRef,
  selectedRoom,
  project,
  tool,
  selected,
  hotspotDrawMode,
  dispatch,
  drawCanvasRef,
  dragRef,
  dragDeltaRef,
  zoom = 1,
}: UseCanvasInteractionsArgs) {
  const [drawingWalkbox, setDrawingWalkbox] = useState<Point[] | null>(null);
  const [drawingHotspotPoly, setDrawingHotspotPoly] = useState<Point[] | null>(null);
  const [drawingRect, setDrawingRect] = useState<{ start: Point; cur: Point } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverLabel, setHoverLabel] = useState("");
  const [hoverCursor, setHoverCursor] = useState("");

  const displayFallback = resolveDisplayConfig(project?.display);

  // ─── Coordinate helpers ───────────────────────────────────────────────────
  function getCanvasPos(e: React.MouseEvent | React.PointerEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const W = selectedRoom?.width || displayFallback.baseWidth;
    const H = selectedRoom?.height || displayFallback.baseHeight;
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }

  // ─── Hit testing ──────────────────────────────────────────────────────────
  function hitTestSelectedHandle(pt: Point): HitResult | null {
    if (!selected || !selectedRoom || !project) return null;

    if (selected.type === "exit") {
      const exit = (selectedRoom.exits ?? []).find((e) => e.id === selected.id);
      if (exit) {
        const h = hitTestHandle(pt, exit.bounds.x, exit.bounds.y, exit.bounds.width, exit.bounds.height);
        if (h) return { type: "exit", id: exit.id, resizeHandle: h };
      }
    } else if (selected.type === "hotspot") {
      const hs = (selectedRoom.hotspots ?? []).find((h) => h.id === selected.id);
      if (hs && !(hs.polygon && hs.polygon.length >= 3)) {
        const h = hitTestHandle(pt, hs.bounds.x, hs.bounds.y, hs.bounds.width, hs.bounds.height);
        if (h) return { type: "hotspot", id: hs.id, resizeHandle: h };
      }
    } else if (selected.type === "object") {
      const obj = project.objects.find((o) => o.id === selected.id);
      if (obj) {
        const x = obj.position?.x ?? 100;
        const y = obj.position?.y ?? 200;
        const w = obj.spriteWidth ?? 48;
        const h = obj.spriteHeight ?? 48;
        const handle = hitTestHandle(pt, x - w / 2, y - h, w, h);
        if (handle) return { type: "object", id: obj.id, resizeHandle: handle };
      }
    }
    return null;
  }

  function hitTestApproachGizmos(pt: Point): HitResult | null {
    if (!selected || !project || !selectedRoom || tool !== "select") return null;
    const RADIUS = 9 / zoom;
    let standPoint: Point | undefined;
    let anchors: Partial<Record<string, { point: Point }>> | undefined;

    if (selected.type === "actor") {
      const actor = project.actors.find((a) => a.id === selected.id);
      standPoint = actor?.standPoint;
      anchors = actor?.interactionAnchors;
    } else if (selected.type === "object") {
      const obj = project.objects.find((o) => o.id === selected.id);
      standPoint = obj?.standPoint;
      anchors = obj?.interactionAnchors;
    } else if (selected.type === "hotspot") {
      const hs = (selectedRoom.hotspots ?? []).find((h) => h.id === selected.id);
      standPoint = hs?.standPoint;
      anchors = hs?.interactionAnchors;
    }

    if (standPoint && ptNearPoint(pt.x, pt.y, standPoint.x, standPoint.y, RADIUS)) {
      return { type: selected.type, id: selected.id, approachGizmo: "standPoint" };
    }
    if (anchors) {
      for (const [verb, anchor] of Object.entries(anchors)) {
        if (!anchor) continue;
        if (ptNearPoint(pt.x, pt.y, anchor.point.x, anchor.point.y, RADIUS)) {
          return { type: selected.type, id: selected.id, approachGizmo: verb };
        }
      }
    }
    return null;
  }

  function hitTestEntity(pt: Point): HitResult | null {
    if (!selectedRoom || !project) return null;

    if (selected && tool === "select") {
      const gizmo = hitTestApproachGizmos(pt);
      if (gizmo) return gizmo;
      const handle = hitTestSelectedHandle(pt);
      if (handle) return handle;
    }

    for (const actor of project.actors.filter((a) => a.defaultRoomId === selectedRoom.id || (a.isPlayer && !a.defaultRoomId))) {
      const x = actor.position?.x ?? 200;
      const y = actor.position?.y ?? 350;
      const w = actor.spriteWidth ?? 40;
      const h = actor.spriteHeight ?? 60;
      if (ptInRect(pt.x, pt.y, x - w / 2, y - h, w, h)) {
        return { type: "actor", id: actor.id };
      }
    }
    for (const obj of project.objects.filter((o) => o.roomId === selectedRoom.id)) {
      const x = obj.position?.x ?? 100;
      const y = obj.position?.y ?? 200;
      const w = obj.spriteWidth ?? 48;
      const h = obj.spriteHeight ?? 48;
      if (ptInRect(pt.x, pt.y, x - w / 2, y - h, w, h)) {
        return { type: "object", id: obj.id };
      }
    }
    for (const sp of selectedRoom.spawnPoints ?? []) {
      if (ptNearPoint(pt.x, pt.y, sp.x, sp.y, 10)) {
        return { type: "spawn", id: sp.id };
      }
    }
    for (const exit of selectedRoom.exits ?? []) {
      if (ptInRect(pt.x, pt.y, exit.bounds.x, exit.bounds.y, exit.bounds.width, exit.bounds.height)) {
        return { type: "exit", id: exit.id };
      }
    }
    for (const hs of [...(selectedRoom.hotspots ?? [])].reverse()) {
      if (hs.polygon && hs.polygon.length >= 3) {
        if (!hs.shapeLocked) {
          for (let vi = 0; vi < hs.polygon.length; vi++) {
            if (ptNearPoint(pt.x, pt.y, hs.polygon[vi].x, hs.polygon[vi].y, 8)) {
              return { type: "hotspot", id: hs.id, vertexIdx: vi };
            }
          }
        }
        if (ptInPoly(pt.x, pt.y, hs.polygon)) {
          return { type: "hotspot", id: hs.id };
        }
      } else {
        if (ptInRect(pt.x, pt.y, hs.bounds.x, hs.bounds.y, hs.bounds.width, hs.bounds.height)) {
          return { type: "hotspot", id: hs.id };
        }
      }
    }
    for (const wb of [...selectedRoom.walkboxes].reverse()) {
      if (!wb.shapeLocked) {
        for (let vi = 0; vi < wb.polygon.length; vi++) {
          if (ptNearPoint(pt.x, pt.y, wb.polygon[vi].x, wb.polygon[vi].y, 8)) {
            return { type: "walkbox", id: wb.id, vertexIdx: vi };
          }
        }
      }
      if (ptInPoly(pt.x, pt.y, wb.polygon)) {
        return { type: "walkbox", id: wb.id };
      }
    }
    return null;
  }

  // ─── Shape creation (walkbox / hotspot polygon finalization) ─────────────
  function finishWalkbox(pts: Point[]) {
    if (!selectedRoom) return;
    const id = generateId("wb");
    const walkboxes = [
      ...selectedRoom.walkboxes,
      { id, polygon: pts, adjacentIds: [], shapeLocked: false },
    ];
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { walkboxes } });
    dispatch({ type: "SELECT_ENTITY", entity: { type: "walkbox", id, roomId: selectedRoom.id } });
    setDrawingWalkbox(null);
  }

  function finishHotspotPoly(pts: Point[]) {
    if (!selectedRoom) return;
    const id = generateId("hs");
    const bounds = polyBounds(pts);
    const hotspots: EditorHotspot[] = [
      ...(selectedRoom.hotspots ?? []),
      {
        id,
        name: "New Hotspot",
        roomId: selectedRoom.id,
        bounds,
        polygon: pts,
      },
    ];
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { hotspots } });
    dispatch({ type: "SELECT_ENTITY", entity: { type: "hotspot", id, roomId: selectedRoom.id } });
    setDrawingHotspotPoly(null);
  }

  // ─── Drag commit ──────────────────────────────────────────────────────────
  function commitApproachGizmoDrag(d: DragState, dx: number, dy: number) {
    if (!selectedRoom || !project) return;
    const newPt = { x: Math.round(d.origPos.x + dx), y: Math.round(d.origPos.y + dy) };

    if (d.approachGizmo === "standPoint") {
      if (d.entityType === "actor") {
        dispatch({ type: "UPDATE_ACTOR", actorId: d.entityId, updates: { standPoint: newPt } });
      } else if (d.entityType === "object") {
        dispatch({ type: "UPDATE_OBJECT", objectId: d.entityId, updates: { standPoint: newPt } });
      } else if (d.entityType === "hotspot") {
        const hotspots = (selectedRoom.hotspots ?? []).map((hs) =>
          hs.id === d.entityId ? { ...hs, standPoint: newPt } : hs
        );
        dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { hotspots } });
      }
    } else if (d.approachGizmo) {
      const verb = d.approachGizmo as VerbType;
      if (d.entityType === "actor") {
        const actor = project.actors.find((a) => a.id === d.entityId);
        if (actor) {
          const prev = actor.interactionAnchors?.[verb] ?? { point: newPt };
          dispatch({ type: "UPDATE_ACTOR", actorId: d.entityId, updates: {
            interactionAnchors: { ...actor.interactionAnchors, [verb]: { ...prev, point: newPt } },
          }});
        }
      } else if (d.entityType === "object") {
        const obj = project.objects.find((o) => o.id === d.entityId);
        if (obj) {
          const prev = obj.interactionAnchors?.[verb] ?? { point: newPt };
          dispatch({ type: "UPDATE_OBJECT", objectId: d.entityId, updates: {
            interactionAnchors: { ...obj.interactionAnchors, [verb]: { ...prev, point: newPt } },
          }});
        }
      } else if (d.entityType === "hotspot") {
        const hs = (selectedRoom.hotspots ?? []).find((h) => h.id === d.entityId);
        if (hs) {
          const prev = hs.interactionAnchors?.[verb] ?? { point: newPt };
          const hotspots = (selectedRoom.hotspots ?? []).map((h) =>
            h.id === d.entityId
              ? { ...h, interactionAnchors: { ...h.interactionAnchors, [verb]: { ...prev, point: newPt } } }
              : h
          );
          dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { hotspots } });
        }
      }
    }
  }

  function commitDrag() {
    const d = dragRef.current;
    if (!d || !selectedRoom) {
      dragRef.current = null;
      dragDeltaRef.current = { dx: 0, dy: 0 };
      return;
    }
    const { dx, dy } = dragDeltaRef.current;
    if (dx !== 0 || dy !== 0) {
      if (d.approachGizmo) {
        commitApproachGizmoDrag(d, dx, dy);
        dragRef.current = null;
        dragDeltaRef.current = { dx: 0, dy: 0 };
        dispatch({ type: "END_DRAG" });
        setDrag(null);
        return;
      }
      if (d.resizeHandle && d.origBounds) {
        const nb = applyResize(d.origBounds, d.resizeHandle, dx, dy);
        if (d.entityType === "exit") {
          const exits = (selectedRoom.exits ?? []).map((ex) =>
            ex.id === d.entityId ? { ...ex, bounds: nb } : ex
          );
          dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { exits } });
        } else if (d.entityType === "hotspot") {
          const hotspots = (selectedRoom.hotspots ?? []).map((hs) =>
            hs.id === d.entityId ? { ...hs, bounds: nb } : hs
          );
          dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { hotspots } });
        } else if (d.entityType === "object") {
          dispatch({
            type: "UPDATE_OBJECT",
            objectId: d.entityId,
            updates: {
              position: { x: Math.round(nb.x + nb.width / 2), y: Math.round(nb.y + nb.height) },
              spriteWidth: Math.round(nb.width),
              spriteHeight: Math.round(nb.height),
            },
          });
        }
      } else if (d.entityType === "object") {
        dispatch({
          type: "UPDATE_OBJECT",
          objectId: d.entityId,
          updates: {
            position: { x: Math.round(d.origPos.x + dx), y: Math.round(d.origPos.y + dy) },
          },
        });
      } else if (d.entityType === "actor") {
        dispatch({
          type: "UPDATE_ACTOR",
          actorId: d.entityId,
          updates: {
            position: { x: Math.round(d.origPos.x + dx), y: Math.round(d.origPos.y + dy) },
          },
        });
      } else if (d.entityType === "spawn") {
        const spawnPoints = (selectedRoom.spawnPoints ?? []).map((sp) =>
          sp.id === d.entityId
            ? { ...sp, x: Math.round(d.origPos.x + dx), y: Math.round(d.origPos.y + dy) }
            : sp
        );
        dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { spawnPoints } });
      } else if (d.entityType === "walkbox" && d.vertexIdx !== undefined) {
        const walkboxes = selectedRoom.walkboxes.map((wb) => {
          if (wb.id !== d.entityId) return wb;
          const polygon = wb.polygon.map((p, i) =>
            i === d.vertexIdx
              ? { x: Math.round(d.origPos.x + dx), y: Math.round(d.origPos.y + dy) }
              : p
          );
          return { ...wb, polygon };
        });
        dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { walkboxes } });
      } else if (d.entityType === "walkbox" && d.origPolygon) {
        const walkboxes = selectedRoom.walkboxes.map((wb) => {
          if (wb.id !== d.entityId) return wb;
          const polygon = d.origPolygon!.map((p) => ({
            x: Math.round(p.x + dx),
            y: Math.round(p.y + dy),
          }));
          return { ...wb, polygon };
        });
        dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { walkboxes } });
      } else if (d.entityType === "exit" && d.origBounds) {
        const exits = (selectedRoom.exits ?? []).map((ex) =>
          ex.id === d.entityId
            ? { ...ex, bounds: { ...ex.bounds, x: Math.round(d.origBounds!.x + dx), y: Math.round(d.origBounds!.y + dy) } }
            : ex
        );
        dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { exits } });
      } else if (d.entityType === "hotspot" && d.vertexIdx !== undefined) {
        const hotspots = (selectedRoom.hotspots ?? []).map((hs) => {
          if (hs.id !== d.entityId || !hs.polygon) return hs;
          const polygon = hs.polygon.map((p, i) =>
            i === d.vertexIdx
              ? { x: Math.round(d.origPos.x + dx), y: Math.round(d.origPos.y + dy) }
              : p
          );
          const bounds = polyBounds(polygon);
          return { ...hs, polygon, bounds };
        });
        dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { hotspots } });
      } else if (d.entityType === "hotspot" && d.origPolygon) {
        const hotspots = (selectedRoom.hotspots ?? []).map((hs) => {
          if (hs.id !== d.entityId) return hs;
          const polygon = d.origPolygon!.map((p) => ({
            x: Math.round(p.x + dx),
            y: Math.round(p.y + dy),
          }));
          const bounds = polyBounds(polygon);
          return { ...hs, polygon, bounds };
        });
        dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { hotspots } });
      } else if (d.entityType === "hotspot" && d.origBounds) {
        const hotspots = (selectedRoom.hotspots ?? []).map((hs) =>
          hs.id === d.entityId
            ? { ...hs, bounds: { ...hs.bounds, x: Math.round(d.origBounds!.x + dx), y: Math.round(d.origBounds!.y + dy) } }
            : hs
        );
        dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { hotspots } });
      }
    }
    dragRef.current = null;
    dragDeltaRef.current = { dx: 0, dy: 0 };
    dispatch({ type: "END_DRAG" });
    setDrag(null);
  }

  // ─── Keyboard delete ──────────────────────────────────────────────────────
  function handleDeleteSelected() {
    if (!selected || !selectedRoom) return;
    if (selected.type === "walkbox") {
      const walkboxes = selectedRoom.walkboxes.filter((wb) => wb.id !== selected.id);
      dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { walkboxes } });
    } else if (selected.type === "exit") {
      const exits = (selectedRoom.exits ?? []).filter((ex) => ex.id !== selected.id);
      dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { exits } });
    } else if (selected.type === "hotspot") {
      const hotspots = (selectedRoom.hotspots ?? []).filter((hs) => hs.id !== selected.id);
      dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { hotspots } });
    } else if (selected.type === "spawn") {
      const spawnPoints = (selectedRoom.spawnPoints ?? []).filter((sp) => sp.id !== selected.id);
      dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { spawnPoints } });
    }
    dispatch({ type: "SELECT_ENTITY", entity: null });
  }

  // ─── Pointer event handlers ───────────────────────────────────────────────
  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    if (!selectedRoom || !project) return;
    const pt = getCanvasPos(e);

    if (tool === "select") {
      const hit = hitTestEntity(pt);
      if (hit) {
        dispatch({ type: "SELECT_ENTITY", entity: { type: hit.type, id: hit.id, roomId: selectedRoom.id } });

        if (hit.approachGizmo) {
          let origPos: Point = { x: 0, y: 0 };
          if (hit.approachGizmo === "standPoint") {
            if (hit.type === "actor") origPos = project.actors.find((a) => a.id === hit.id)?.standPoint ?? origPos;
            else if (hit.type === "object") origPos = project.objects.find((o) => o.id === hit.id)?.standPoint ?? origPos;
            else if (hit.type === "hotspot") origPos = (selectedRoom.hotspots ?? []).find((h) => h.id === hit.id)?.standPoint ?? origPos;
          } else {
            const verb = hit.approachGizmo as VerbType;
            if (hit.type === "actor") origPos = project.actors.find((a) => a.id === hit.id)?.interactionAnchors?.[verb]?.point ?? origPos;
            else if (hit.type === "object") origPos = project.objects.find((o) => o.id === hit.id)?.interactionAnchors?.[verb]?.point ?? origPos;
            else if (hit.type === "hotspot") origPos = (selectedRoom.hotspots ?? []).find((h) => h.id === hit.id)?.interactionAnchors?.[verb]?.point ?? origPos;
          }
          dispatch({ type: "BEGIN_DRAG" });
          const gizmoDrag: DragState = {
            entityType: hit.type,
            entityId: hit.id,
            startX: pt.x,
            startY: pt.y,
            origPos,
            approachGizmo: hit.approachGizmo,
          };
          dragRef.current = gizmoDrag;
          dragDeltaRef.current = { dx: 0, dy: 0 };
          setDrag(gizmoDrag);
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }

        let origPos: Point = { x: 0, y: 0 };
        let origBounds: Rect | undefined;
        let origPolygon: Point[] | undefined;
        const resizeHandle = hit.resizeHandle;

        if (resizeHandle) {
          if (hit.type === "exit") {
            const exit = (selectedRoom.exits ?? []).find((ex) => ex.id === hit.id);
            if (exit) origBounds = { ...exit.bounds };
          } else if (hit.type === "hotspot") {
            const hs = (selectedRoom.hotspots ?? []).find((h) => h.id === hit.id);
            if (hs) origBounds = { ...hs.bounds };
          } else if (hit.type === "object") {
            const obj = project.objects.find((o) => o.id === hit.id);
            if (obj) {
              const ox = obj.position?.x ?? 100;
              const oy = obj.position?.y ?? 200;
              const ow = obj.spriteWidth ?? 48;
              const oh = obj.spriteHeight ?? 48;
              origBounds = { x: ox - ow / 2, y: oy - oh, width: ow, height: oh };
              origPos = { x: ox, y: oy };
            }
          }
        } else if (hit.type === "object") {
          const obj = project.objects.find((o) => o.id === hit.id);
          origPos = obj?.position ?? { x: 100, y: 200 };
        } else if (hit.type === "actor") {
          const actor = project.actors.find((a) => a.id === hit.id);
          origPos = actor?.position ?? { x: 200, y: 350 };
        } else if (hit.type === "spawn") {
          const sp = selectedRoom.spawnPoints?.find((s) => s.id === hit.id);
          origPos = { x: sp?.x ?? 200, y: sp?.y ?? 350 };
        } else if (hit.type === "walkbox" && hit.vertexIdx !== undefined) {
          const wb = selectedRoom.walkboxes.find((w) => w.id === hit.id)!;
          origPos = { ...wb.polygon[hit.vertexIdx] };
        } else if (hit.type === "walkbox") {
          const wb = selectedRoom.walkboxes.find((w) => w.id === hit.id)!;
          origPolygon = wb.polygon.map((p) => ({ ...p }));
        } else if (hit.type === "exit") {
          const exit = (selectedRoom.exits ?? []).find((ex) => ex.id === hit.id);
          if (exit) origBounds = { ...exit.bounds };
        } else if (hit.type === "hotspot") {
          const hs = (selectedRoom.hotspots ?? []).find((h) => h.id === hit.id);
          if (hs) {
            if (hs.polygon && hs.polygon.length >= 3 && hit.vertexIdx !== undefined) {
              origPos = { ...hs.polygon[hit.vertexIdx] };
            } else if (hs.polygon && hs.polygon.length >= 3) {
              origPolygon = hs.polygon.map((p) => ({ ...p }));
            } else {
              origBounds = { ...hs.bounds };
            }
          }
        }

        dispatch({ type: "BEGIN_DRAG" });
        const dragData: DragState = {
          entityType: hit.type,
          entityId: hit.id,
          startX: pt.x,
          startY: pt.y,
          origPos,
          vertexIdx: hit.vertexIdx,
          origBounds,
          origPolygon,
          resizeHandle,
        };
        dragRef.current = dragData;
        dragDeltaRef.current = { dx: 0, dy: 0 };
        setDrag(dragData);
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        dispatch({ type: "SELECT_ENTITY", entity: null });
      }
      return;
    }

    if (tool === "walkbox") {
      if (!drawingWalkbox) {
        setDrawingWalkbox([pt]);
      } else {
        const first = drawingWalkbox[0];
        if (drawingWalkbox.length >= 3 && ptNearPoint(pt.x, pt.y, first.x, first.y, 12)) {
          finishWalkbox(drawingWalkbox);
        } else {
          setDrawingWalkbox([...drawingWalkbox, pt]);
        }
      }
      return;
    }

    if (tool === "exit") {
      setDrawingRect({ start: pt, cur: pt });
      return;
    }

    if (tool === "hotspot") {
      if (hotspotDrawMode === "polygon") {
        if (!drawingHotspotPoly) {
          setDrawingHotspotPoly([pt]);
        } else {
          const first = drawingHotspotPoly[0];
          if (drawingHotspotPoly.length >= 3 && ptNearPoint(pt.x, pt.y, first.x, first.y, 12)) {
            finishHotspotPoly(drawingHotspotPoly);
          } else {
            setDrawingHotspotPoly([...drawingHotspotPoly, pt]);
          }
        }
      } else {
        setDrawingRect({ start: pt, cur: pt });
      }
      return;
    }

    if (tool === "spawn") {
      const id = generateId("spawn");
      const spawnPoints = [...(selectedRoom.spawnPoints ?? []), { id, x: pt.x, y: pt.y }];
      dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { spawnPoints } });
      dispatch({ type: "SELECT_ENTITY", entity: { type: "spawn", id, roomId: selectedRoom.id } });
      return;
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!selectedRoom || !project) return;
    const pt = getCanvasPos(e);

    if (dragRef.current) {
      const d = dragRef.current;
      const dx = pt.x - d.startX;
      const dy = pt.y - d.startY;
      dragDeltaRef.current = { dx, dy };
      if (d.approachGizmo) {
        commitApproachGizmoDrag(d, dx, dy);
      }
      drawCanvasRef.current?.();
      return;
    }

    if (drawingRect) {
      setDrawingRect((prev) => prev ? { ...prev, cur: pt } : null);
      return;
    }

    let cursor = "";
    const hit = hitTestEntity(pt);
    if (hit) {
      if (hit.resizeHandle) {
        cursor = HANDLE_CURSORS[hit.resizeHandle];
      }
      if (hit.approachGizmo) {
        cursor = "move";
        if (hit.approachGizmo === "standPoint") {
          setHoverLabel("Stand point (drag to move)");
        } else {
          setHoverLabel(`Anchor: ${hit.approachGizmo} (drag to move)`);
        }
      } else {
        const labels: Record<string, string> = {};
        project.objects.forEach((o) => (labels[o.id] = o.name));
        project.actors.forEach((a) => (labels[a.id] = a.name));
        selectedRoom.spawnPoints?.forEach((s) => (labels[s.id] = `Spawn: ${s.id}`));
        selectedRoom.exits?.forEach((ex) => (labels[ex.id] = `Exit → ${ex.targetRoomId || "?"}`));
        selectedRoom.hotspots?.forEach((hs) => (labels[hs.id] = hs.name));
        selectedRoom.walkboxes.forEach((wb) => (labels[wb.id] = `Walkbox: ${wb.id}`));
        setHoverLabel(labels[hit.id] ?? hit.id);
      }
    } else {
      setHoverLabel(`${pt.x}, ${pt.y}`);
    }
    setHoverCursor(cursor);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!selectedRoom) return;

    if (dragRef.current) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      commitDrag();
      return;
    }

    if (drawingRect) {
      const pt = getCanvasPos(e);
      const x = Math.min(drawingRect.start.x, pt.x);
      const y = Math.min(drawingRect.start.y, pt.y);
      const width = Math.abs(pt.x - drawingRect.start.x);
      const height = Math.abs(pt.y - drawingRect.start.y);
      if (width > 5 && height > 5) {
        if (tool === "exit") {
          const id = generateId("exit");
          const exits = [
            ...(selectedRoom.exits ?? []),
            {
              id,
              direction: "E" as const,
              bounds: { x, y, width, height },
              targetRoomId: "",
              label: "Exit",
            },
          ];
          dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { exits } });
          dispatch({ type: "SELECT_ENTITY", entity: { type: "exit", id, roomId: selectedRoom.id } });
        } else if (tool === "hotspot") {
          const id = generateId("hs");
          const hotspots = [
            ...(selectedRoom.hotspots ?? []),
            {
              id,
              name: "New Hotspot",
              roomId: selectedRoom.id,
              bounds: { x, y, width, height },
            },
          ];
          dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom.id, updates: { hotspots } });
          dispatch({ type: "SELECT_ENTITY", entity: { type: "hotspot", id, roomId: selectedRoom.id } });
        }
      }
      setDrawingRect(null);
    }
  }

  function handlePointerCancel(e: React.PointerEvent) {
    if (dragRef.current) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      dragRef.current = null;
      dragDeltaRef.current = { dx: 0, dy: 0 };
      dispatch({ type: "END_DRAG" });
      setDrag(null);
      drawCanvasRef.current?.();
    }
  }

  function handleLostPointerCapture() {
    if (dragRef.current) {
      commitDrag();
    }
  }

  function handleDoubleClick(_e: React.MouseEvent) {
    if (tool === "walkbox" && drawingWalkbox && drawingWalkbox.length >= 3) {
      finishWalkbox(drawingWalkbox);
    }
    if (tool === "hotspot" && hotspotDrawMode === "polygon" && drawingHotspotPoly && drawingHotspotPoly.length >= 3) {
      finishHotspotPoly(drawingHotspotPoly);
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    if (tool === "walkbox") {
      setDrawingWalkbox(null);
    }
    if (tool === "hotspot" && hotspotDrawMode === "polygon") {
      setDrawingHotspotPoly(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setDrawingWalkbox(null);
      setDrawingHotspotPoly(null);
      setDrawingRect(null);
      dispatch({ type: "SELECT_ENTITY", entity: null });
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      handleDeleteSelected();
    }
  }

  return {
    drawingWalkbox,
    drawingHotspotPoly,
    drawingRect,
    drag,
    hoverLabel,
    hoverCursor,
    handlers: {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handlePointerCancel,
      handleLostPointerCapture,
      handleDoubleClick,
      handleContextMenu,
      handleKeyDown,
    },
  };
}
