import type { DisplayConfig, ScalingMode, ViewportAlignment } from "./displayConfig";
import { resolveDisplayConfig } from "./displayConfig";

export interface ScaledViewport {
  canvasWidth: number;
  canvasHeight: number;
  cssWidth: number;
  cssHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  stretchX?: number;
  stretchY?: number;
}

export function computeScaledViewport(
  containerW: number,
  containerH: number,
  displayConfig?: DisplayConfig
): ScaledViewport {
  const cfg = resolveDisplayConfig(displayConfig);
  const { baseWidth, baseHeight, scalingMode, viewportAlignment } = cfg;

  if (scalingMode === "stretch") {
    const sx = containerW / baseWidth;
    const sy = containerH / baseHeight;
    return {
      canvasWidth: baseWidth,
      canvasHeight: baseHeight,
      cssWidth: Math.floor(containerW),
      cssHeight: Math.floor(containerH),
      offsetX: 0,
      offsetY: 0,
      scale: Math.min(sx, sy),
      stretchX: sx,
      stretchY: sy,
    };
  }

  const result = computeScale(baseWidth, baseHeight, containerW, containerH, scalingMode);
  const cssWidth = Math.floor(baseWidth * result.scale);
  const cssHeight = Math.floor(baseHeight * result.scale);

  const offsets = computeAlignment(cssWidth, cssHeight, containerW, containerH, viewportAlignment);

  return {
    canvasWidth: baseWidth,
    canvasHeight: baseHeight,
    cssWidth,
    cssHeight,
    offsetX: offsets.x,
    offsetY: offsets.y,
    scale: result.scale,
  };
}

function computeScale(
  baseW: number,
  baseH: number,
  containerW: number,
  containerH: number,
  mode: ScalingMode
): { scale: number } {
  if (mode === "none") {
    return { scale: 1 };
  }

  if (mode === "integer") {
    const maxScaleX = Math.floor(containerW / baseW);
    const maxScaleY = Math.floor(containerH / baseH);
    const rawIntScale = Math.min(maxScaleX, maxScaleY);
    if (rawIntScale >= 1) return { scale: rawIntScale };
    const fitScale = Math.min(containerW / baseW, containerH / baseH);
    return { scale: fitScale };
  }

  const fitScale = Math.min(containerW / baseW, containerH / baseH);
  return { scale: fitScale };
}

function computeAlignment(
  cssW: number,
  cssH: number,
  containerW: number,
  containerH: number,
  alignment: ViewportAlignment
): { x: number; y: number } {
  switch (alignment) {
    case "top-left":
      return { x: 0, y: 0 };
    case "center":
    default:
      return {
        x: Math.max(0, Math.floor((containerW - cssW) / 2)),
        y: Math.max(0, Math.floor((containerH - cssH) / 2)),
      };
  }
}

export function applyPixelPerfectCSS(canvas: HTMLCanvasElement, pixelPerfect: boolean): void {
  if (pixelPerfect) {
    canvas.style.imageRendering = "pixelated";
  } else {
    canvas.style.imageRendering = "";
  }
}

export function createViewportResizeObserver(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  wrapper: HTMLElement,
  displayConfig?: DisplayConfig,
  onResize?: (viewport: ScaledViewport) => void
): ResizeObserver {
  const cfg = resolveDisplayConfig(displayConfig);
  applyPixelPerfectCSS(canvas, cfg.pixelPerfect);

  canvas.width = cfg.baseWidth;
  canvas.height = cfg.baseHeight;

  const ro = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (width <= 0 || height <= 0) return;

    const vp = computeScaledViewport(width, height, displayConfig);
    wrapper.style.width = `${vp.cssWidth}px`;
    wrapper.style.height = `${vp.cssHeight}px`;
    onResize?.(vp);
  });

  ro.observe(container);
  return ro;
}
