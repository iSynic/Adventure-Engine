export interface DebugOverlayFlags {
  walkboxes: boolean;
  hotspots: boolean;
  exits: boolean;
  objects: boolean;
  actors: boolean;
  paths: boolean;
  zSort: boolean;
  interactionTarget: boolean;
  hitResult: boolean;
}

export interface DebugInspectedEntity {
  type: "object" | "actor" | "hotspot" | "exit";
  id: string;
  name: string;
  properties: Record<string, unknown>;
}

export interface HitFlash {
  type: "object" | "actor" | "hotspot" | "exit";
  id: string;
  time: number;
}

export const DEFAULT_OVERLAY_FLAGS: DebugOverlayFlags = {
  walkboxes: true,
  hotspots: true,
  exits: true,
  objects: true,
  actors: true,
  paths: true,
  zSort: false,
  interactionTarget: true,
  hitResult: true,
};

const FLAG_KEYS: (keyof DebugOverlayFlags)[] = [
  "walkboxes",
  "hotspots",
  "exits",
  "objects",
  "actors",
  "paths",
  "zSort",
  "interactionTarget",
  "hitResult",
];

export function getOverlayFlagByIndex(index: number): keyof DebugOverlayFlags | null {
  if (index >= 0 && index < FLAG_KEYS.length) return FLAG_KEYS[index];
  return null;
}

export function overlayFlagLabel(key: keyof DebugOverlayFlags): string {
  switch (key) {
    case "walkboxes": return "Walkboxes";
    case "hotspots": return "Hotspot Bounds";
    case "exits": return "Exit Regions";
    case "objects": return "Object Bounds";
    case "actors": return "Actor Anchors";
    case "paths": return "Path Visualization";
    case "zSort": return "Z-Sort Anchors";
    case "interactionTarget": return "Interaction Target";
    case "hitResult": return "Click Hit Flash";
  }
}

export const OVERLAY_FLAG_KEYS = FLAG_KEYS;
