export type ScalingMode = "stretch" | "integer" | "fit" | "none";
export type ViewportAlignment = "center" | "top-left";

export interface DisplayConfig {
  baseWidth?: number;
  baseHeight?: number;
  scalingMode?: ScalingMode;
  pixelPerfect?: boolean;
  viewportAlignment?: ViewportAlignment;
  backgroundColor?: string;
}

export const DEFAULT_DISPLAY_CONFIG: Required<DisplayConfig> = {
  baseWidth: 640,
  baseHeight: 360,
  scalingMode: "integer",
  pixelPerfect: true,
  viewportAlignment: "center",
  backgroundColor: "#000",
};

const VALID_SCALING_MODES: readonly ScalingMode[] = ["stretch", "integer", "fit", "none"];
const VALID_ALIGNMENTS: readonly ViewportAlignment[] = ["center", "top-left"];

export function resolveDisplayConfig(partial?: DisplayConfig): Required<DisplayConfig> {
  let scalingMode = partial?.scalingMode ?? DEFAULT_DISPLAY_CONFIG.scalingMode;
  if (!VALID_SCALING_MODES.includes(scalingMode)) {
    console.warn(`[DisplayConfig] Unknown scalingMode "${scalingMode}", falling back to "${DEFAULT_DISPLAY_CONFIG.scalingMode}"`);
    scalingMode = DEFAULT_DISPLAY_CONFIG.scalingMode;
  }

  let viewportAlignment = partial?.viewportAlignment ?? DEFAULT_DISPLAY_CONFIG.viewportAlignment;
  if (!VALID_ALIGNMENTS.includes(viewportAlignment)) {
    console.warn(`[DisplayConfig] Unknown viewportAlignment "${viewportAlignment}", falling back to "${DEFAULT_DISPLAY_CONFIG.viewportAlignment}"`);
    viewportAlignment = DEFAULT_DISPLAY_CONFIG.viewportAlignment;
  }

  return {
    baseWidth: safeInt(partial?.baseWidth, DEFAULT_DISPLAY_CONFIG.baseWidth, 160, 3840, "baseWidth"),
    baseHeight: safeInt(partial?.baseHeight, DEFAULT_DISPLAY_CONFIG.baseHeight, 90, 2160, "baseHeight"),
    scalingMode,
    pixelPerfect: typeof partial?.pixelPerfect === "boolean" ? partial.pixelPerfect : DEFAULT_DISPLAY_CONFIG.pixelPerfect,
    viewportAlignment,
    backgroundColor: typeof partial?.backgroundColor === "string" && partial.backgroundColor.length > 0
      ? partial.backgroundColor
      : DEFAULT_DISPLAY_CONFIG.backgroundColor,
  };
}

function safeInt(value: unknown, fallback: number, min: number, max: number, field: string): number {
  if (value === undefined || value === null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    console.warn(`[DisplayConfig] Invalid ${field} value "${value}", falling back to ${fallback}`);
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(n)));
}
