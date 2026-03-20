import { useRef, useEffect, useCallback, useState } from "react";
import { useEditor } from "../store";
import { resolveAssetUrl } from "../utils/projectStorage";
import TutorialBubble from "./TutorialBubble";
import {
  drawBackground,
  drawWalkboxes,
  drawExits,
  drawHotspots,
  drawSpawnPoints,
  drawObjects,
  drawActors,
  drawInProgressPoly,
  drawRectPreview,
  drawApproachPointGizmos,
  EXIT_COLOR,
  HOTSPOT_COLOR,
  type ApproachGizmoData,
} from "../utils/canvasRenderers";
import { useCanvasInteractions, type DragState } from "../hooks/useCanvasInteractions";
import { resolveDisplayConfig } from "../../shared/displayConfig";
import type { SelectedEntity, EditorRoomDefinition, EditorProject } from "../types";

function getApproachGizmoData(
  selected: SelectedEntity,
  room: EditorRoomDefinition,
  project: EditorProject,
): ApproachGizmoData | null {
  if (selected.type === "actor") {
    const actor = project.actors.find((a) => a.id === selected.id);
    if (!actor) return null;
    if (!actor.standPoint && !actor.interactionAnchors) return null;
    return {
      standPoint: actor.standPoint,
      approachDirection: actor.approachDirection,
      anchors: actor.interactionAnchors,
    };
  }
  if (selected.type === "object") {
    const obj = project.objects.find((o) => o.id === selected.id);
    if (!obj) return null;
    if (!obj.standPoint && !obj.interactionAnchors) return null;
    return {
      standPoint: obj.standPoint,
      approachDirection: obj.approachDirection,
      anchors: obj.interactionAnchors,
    };
  }
  if (selected.type === "hotspot") {
    const hs = (room.hotspots ?? []).find((h) => h.id === selected.id);
    if (!hs) return null;
    if (!hs.standPoint && !hs.interactionAnchors) return null;
    return {
      standPoint: hs.standPoint,
      approachDirection: hs.approachDirection,
      anchors: hs.interactionAnchors,
    };
  }
  return null;
}

export default function RoomCanvas() {
  const { state, dispatch, selectedRoom } = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const drawCanvasRef = useRef<(() => void) | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const bgPathRef = useRef<string>("");
  const [bgLoadVersion, setBgLoadVersion] = useState(0);
  const spriteMapRef = useRef<Map<string, HTMLImageElement | null>>(new Map());
  const [spriteLoadVersion, setSpriteLoadVersion] = useState(0);

  const project = state.currentProject;
  const tool = state.activeTool;
  const selected = state.selectedEntity;
  const zoom = state.zoom ?? 1;

  const {
    drawingWalkbox,
    drawingHotspotPoly,
    drawingRect,
    hoverLabel,
    hoverCursor,
    handlers,
  } = useCanvasInteractions({
    canvasRef,
    selectedRoom,
    project,
    tool,
    selected,
    hotspotDrawMode: state.hotspotDrawMode,
    dispatch,
    drawCanvasRef,
    dragRef,
    dragDeltaRef,
    zoom,
  });

  useEffect(() => {
    if (!selectedRoom) return;
    const path = selectedRoom.backgroundPath;
    if (!path) {
      bgImgRef.current = null;
      bgPathRef.current = "";
      setBgLoadVersion((v) => v + 1);
      return;
    }
    if (path === bgPathRef.current) return;
    bgPathRef.current = path;
    bgImgRef.current = null;

    const asset = project?.assets.find((a) => a.id === path);
    const assetDataUrl = asset && project
      ? resolveAssetUrl(project.id, asset.id, asset.dataUrl)
      : path;
    const img = new Image();
    img.onload = () => { bgImgRef.current = img; setBgLoadVersion((v) => v + 1); };
    img.onerror = () => { bgImgRef.current = null; setBgLoadVersion((v) => v + 1); };
    img.src = assetDataUrl;
  }, [selectedRoom?.backgroundPath, project?.assets]);

  useEffect(() => {
    if (!selectedRoom || !project) return;
    let cancelled = false;
    spriteMapRef.current.clear();

    const roomObjects = project.objects.filter((o) => o.roomId === selectedRoom.id);
    const roomActors = project.actors.filter(
      (a) => a.defaultRoomId === selectedRoom.id || (a.isPlayer && !a.defaultRoomId),
    );

    const spritePaths = new Set<string>();
    for (const obj of roomObjects) if (obj.spritePath) spritePaths.add(obj.spritePath);
    for (const actor of roomActors) if (actor.spritePath) spritePaths.add(actor.spritePath);

    if (spritePaths.size === 0) { setSpriteLoadVersion((v) => v + 1); return; }

    spritePaths.forEach((spriteId) => {
      const asset = project.assets.find((a) => a.id === spriteId);
      if (!asset) { spriteMapRef.current.set(spriteId, null); setSpriteLoadVersion((v) => v + 1); return; }
      const url = resolveAssetUrl(project.id, asset.id, asset.dataUrl);
      const img = new Image();
      img.onload = () => { if (cancelled) return; spriteMapRef.current.set(spriteId, img); setSpriteLoadVersion((v) => v + 1); };
      img.onerror = () => { if (cancelled) return; spriteMapRef.current.set(spriteId, null); setSpriteLoadVersion((v) => v + 1); };
      img.src = url;
    });

    return () => { cancelled = true; };
  }, [selectedRoom?.id, project?.objects, project?.actors, project?.assets]);

  const displayCfg = resolveDisplayConfig(project?.display);
  const roomW = selectedRoom?.width ?? displayCfg.baseWidth;
  const roomH = selectedRoom?.height ?? displayCfg.baseHeight;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedRoom || !project) return;
    const ctx = canvas.getContext("2d")!;
    const cfg = resolveDisplayConfig(project?.display);
    const W = selectedRoom.width || cfg.baseWidth;
    const H = selectedRoom.height || cfg.baseHeight;

    const dd = dragRef.current;
    const delta = dragDeltaRef.current;

    drawBackground(ctx, W, H, bgImgRef.current);
    drawWalkboxes(ctx, selectedRoom.walkboxes, selected, dd, delta);
    drawExits(ctx, selectedRoom.exits ?? [], selected, dd, delta);
    drawHotspots(ctx, selectedRoom.hotspots ?? [], selected, dd, delta);
    drawSpawnPoints(ctx, selectedRoom.spawnPoints ?? [], selected, dd, delta);
    drawObjects(ctx, project.objects.filter((o) => o.roomId === selectedRoom.id), selected, dd, delta, spriteMapRef.current);
    drawActors(ctx, project.actors.filter((a) => a.defaultRoomId === selectedRoom.id || (a.isPlayer && a.defaultRoomId === undefined)), selected, dd, delta, spriteMapRef.current);

    if (drawingWalkbox && drawingWalkbox.length > 0) {
      drawInProgressPoly(ctx, drawingWalkbox, "#fff");
    }
    if (drawingHotspotPoly && drawingHotspotPoly.length > 0) {
      drawInProgressPoly(ctx, drawingHotspotPoly, HOTSPOT_COLOR);
    }
    if (drawingRect) {
      drawRectPreview(ctx, drawingRect.start, drawingRect.cur, tool === "exit" ? EXIT_COLOR : HOTSPOT_COLOR);
    }

    if (tool === "select" && selected) {
      const gizmoData = getApproachGizmoData(selected, selectedRoom, project);
      if (gizmoData) {
        const invScale = 1 / zoom;
        drawApproachPointGizmos(ctx, gizmoData, dd, delta, invScale);
      }
    }
  }, [selectedRoom, project, selected, drawingWalkbox, drawingHotspotPoly, drawingRect, tool, bgLoadVersion, spriteLoadVersion, zoom]);

  drawCanvasRef.current = drawCanvas;

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  if (!selectedRoom) {
    return (
      <div className="room-canvas-placeholder">
        <p>Select a room from the list to edit</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="room-canvas-wrap" style={{ position: "relative" }}>
      <TutorialBubble
        title="Room Canvas"
        description="This is the visual room editor. Select a tool from the toolbar (pointer, walkbox, exit, hotspot, spawn) then click/drag on the canvas to place or move entities. Click entities to select them — selected entities show property inspectors on the right."
        preferSide="below"
      >
        <canvas
          ref={canvasRef}
          width={roomW}
          height={roomH}
          className="room-canvas"
          tabIndex={0}
          style={{
            width: "100%",
            cursor: hoverCursor || (tool !== "select" ? "crosshair" : "default"),
          }}
          onPointerDown={handlers.handlePointerDown}
          onPointerMove={handlers.handlePointerMove}
          onPointerUp={handlers.handlePointerUp}
          onPointerCancel={handlers.handlePointerCancel}
          onLostPointerCapture={handlers.handleLostPointerCapture}
          onDoubleClick={handlers.handleDoubleClick}
          onContextMenu={handlers.handleContextMenu}
          onKeyDown={handlers.handleKeyDown}
        />
      </TutorialBubble>
      {hoverLabel && (
        <div className="room-canvas-tooltip">{hoverLabel}</div>
      )}
    </div>
  );
}
