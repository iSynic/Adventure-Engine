import type { Engine } from "../../../engine/core/Engine";
import type { DebugOverlayFlags } from "../../../engine/debug/DebugState";
import { OVERLAY_FLAG_KEYS, overlayFlagLabel } from "../../../engine/debug/DebugState";
import TutorialBubble from "../TutorialBubble";

const OVERLAY_DESCRIPTIONS: Record<keyof DebugOverlayFlags, string> = {
  walkboxes: "Show walkable area polygons and adjacency connections",
  hotspots: "Show interactive hotspot bounding rectangles and polygons",
  exits: "Show room exit trigger regions",
  objects: "Show object bounding boxes and anchor points",
  actors: "Show actor anchor positions and collision bounds",
  paths: "Show the current pathfinding route being followed",
  zSort: "Show Y-sort anchor points that determine draw order",
  interactionTarget: "Highlight the entity the player is about to interact with",
  hitResult: "Flash the click hit-test result on each click",
};

export function OverlaysTab({
  engine,
  overlayFlags,
}: {
  engine: Engine;
  overlayFlags: DebugOverlayFlags;
}) {
  return (
    <div className="debug-list">
      <TutorialBubble title="Debug Overlays" description="Toggle visual overlays on the game canvas to see walkboxes, object bounds, hotspots, spawn points, exit regions, and more. Press number keys 1-9 as shortcuts." preferSide="below">
        <div className="debug-overlay-section-label">Toggle overlays (keys 1-9)</div>
      </TutorialBubble>
      {OVERLAY_FLAG_KEYS.map((key, idx) => (
        <label key={key} className="debug-overlay-toggle" title={OVERLAY_DESCRIPTIONS[key]}>
          <input type="checkbox" checked={overlayFlags[key]} onChange={() => engine.ui.toggleOverlayFlag(key)} />
          <span className="debug-overlay-key">{idx + 1}</span>
          <span>{overlayFlagLabel(key)}</span>
        </label>
      ))}
    </div>
  );
}
