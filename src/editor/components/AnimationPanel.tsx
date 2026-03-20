import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor } from "../store";
import { resolveAssetUrl } from "../utils/projectStorage";
import type { AnimationState, Direction, AnimationDefinition, AnimationFrame, ActorAnimationSet } from "../../engine/core/types";
import TutorialBubble from "./TutorialBubble";

const ANIM_STATE_GROUPS: { label: string; states: AnimationState[] }[] = [
  { label: "Core", states: ["idle", "walk", "talk", "face"] },
  { label: "Interaction", states: ["interact_low", "interact_mid", "interact_high", "interact"] },
  { label: "Optional", states: ["pickup", "push_pull", "special_use", "emote"] },
];
const ANIM_STATES: AnimationState[] = ANIM_STATE_GROUPS.flatMap((g) => g.states);
const DIRECTIONS: Direction[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const ALL_DIR_KEYS = ["*", ...DIRECTIONS] as const;
type DirKey = (typeof ALL_DIR_KEYS)[number];

function AnimationPreview({ frames }: { frames: AnimationFrame[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const timerRef = useRef<number>(0);

  useEffect(() => {
    if (frames.length === 0) return;
    setCurrentIdx(0);
    let idx = 0;
    let cancelled = false;

    function tick() {
      if (cancelled || frames.length === 0) return;
      const dur = frames[idx % frames.length].duration;
      timerRef.current = window.setTimeout(() => {
        idx = (idx + 1) % frames.length;
        setCurrentIdx(idx);
        tick();
      }, dur);
    }
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
  }, [frames]);

  useEffect(() => {
    if (!canvasRef.current || frames.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const frame = frames[currentIdx % frames.length];
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, 80, 100);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 80, 100);
    };
    img.onerror = () => {
      ctx.clearRect(0, 0, 80, 100);
      ctx.fillStyle = "#333";
      ctx.fillRect(0, 0, 80, 100);
      ctx.fillStyle = "#888";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Missing", 40, 50);
    };
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") + "/";
    const src = frame.imagePath.startsWith("http") ||
      frame.imagePath.startsWith("/") ||
      frame.imagePath.startsWith("data:") ||
      frame.imagePath.startsWith("blob:")
      ? frame.imagePath
      : base + frame.imagePath;
    img.src = src;
  }, [currentIdx, frames]);

  if (frames.length === 0) {
    return <div className="anim-preview-empty">No frames</div>;
  }

  return (
    <div className="anim-preview">
      <canvas ref={canvasRef} width={80} height={100} className="anim-preview-canvas" />
      <span className="anim-preview-label">
        Frame {currentIdx + 1}/{frames.length}
      </span>
    </div>
  );
}

export default function AnimationPanel() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<AnimationState>("idle");
  const [selectedDir, setSelectedDir] = useState<DirKey>("S");

  if (!project) return null;

  const actor = project.actors.find((a) => a.id === selectedActorId) ?? null;
  const anims: ActorAnimationSet = actor?.animations ?? {};
  const dirAnims = anims[selectedDir] ?? {};
  const currentAnim: AnimationDefinition | undefined = dirAnims[selectedState];
  const frames: AnimationFrame[] = currentAnim?.frames ?? [];

  function updateAnimations(newAnims: ActorAnimationSet) {
    if (!selectedActorId) return;
    dispatch({
      type: "UPDATE_ACTOR",
      actorId: selectedActorId,
      updates: { animations: newAnims },
    });
  }

  function setFrames(newFrames: AnimationFrame[]) {
    const newAnim: AnimationDefinition = {
      id: `${selectedState}_${selectedDir}`,
      frames: newFrames,
      loop: currentAnim?.loop ?? true,
    };
    const newDirAnims = { ...dirAnims, [selectedState]: newAnim };
    const newAnims = { ...anims, [selectedDir]: newDirAnims };
    updateAnimations(newAnims);
  }

  function addFrame() {
    const newFrame: AnimationFrame = { imagePath: "", duration: 150 };
    setFrames([...frames, newFrame]);
  }

  function removeFrame(idx: number) {
    setFrames(frames.filter((_, i) => i !== idx));
  }

  function updateFrame(idx: number, updates: Partial<AnimationFrame>) {
    setFrames(frames.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  }

  function moveFrame(idx: number, dir: "up" | "down") {
    const newFrames = [...frames];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newFrames.length) return;
    [newFrames[idx], newFrames[swapIdx]] = [newFrames[swapIdx], newFrames[idx]];
    setFrames(newFrames);
  }

  const spriteAssets = project.assets.filter(
    (a) => a.type === "sprite" || a.type === "other"
  );

  return (
    <div className="animation-panel">
      <div className="anim-section">
        <label className="anim-label">Actor</label>
        <select
          className="ed-input ed-input-sm"
          value={selectedActorId ?? ""}
          onChange={(e) => setSelectedActorId(e.target.value || null)}
        >
          <option value="">-- Select actor --</option>
          {project.actors.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
          ))}
        </select>
      </div>

      {actor && (
        <>
          <div className="anim-section anim-row">
            <div>
              <label className="anim-label">State</label>
              <select
                className="ed-input ed-input-sm"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value as AnimationState)}
              >
                {ANIM_STATE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.states.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="anim-label">Direction</label>
              <select
                className="ed-input ed-input-sm"
                value={selectedDir}
                onChange={(e) => setSelectedDir(e.target.value as DirKey)}
              >
                <option value="*">Base (all directions)</option>
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="anim-section">
            <AnimationPreview frames={frames} />
          </div>

          <div className="anim-section">
            <div className="anim-frames-header">
              <label className="anim-label">Frames</label>
              <TutorialBubble title="Add Animation Frame" description="Add a new frame to this animation. Each frame specifies a sprite image and duration in milliseconds." preferSide="left">
                <button className="btn btn-ghost btn-xs" onClick={addFrame}>+ Add Frame</button>
              </TutorialBubble>
            </div>
            {frames.length === 0 && (
              <div className="entity-empty">No frames defined. Add frames to create this animation.</div>
            )}
            <div className="anim-frames-list">
              {frames.map((frame, idx) => (
                <div key={idx} className="anim-frame-row">
                  <span className="anim-frame-num">#{idx + 1}</span>
                  <input
                    className="ed-input ed-input-sm anim-frame-path"
                    placeholder="Image path..."
                    value={frame.imagePath}
                    onChange={(e) => updateFrame(idx, { imagePath: e.target.value })}
                  />
                  {spriteAssets.length > 0 && (
                    <select
                      className="ed-input ed-input-sm anim-frame-select"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) updateFrame(idx, { imagePath: e.target.value });
                      }}
                    >
                      <option value="">Pick asset...</option>
                      {spriteAssets.map((a) => (
                        <option key={a.id} value={resolveAssetUrl(project.id, a.id, a.dataUrl)}>{a.name}</option>
                      ))}
                    </select>
                  )}
                  <label className="anim-dur-label">
                    ms
                    <input
                      type="number"
                      className="ed-input ed-input-sm anim-dur-input"
                      value={frame.duration}
                      min={16}
                      step={10}
                      onChange={(e) => updateFrame(idx, { duration: Math.max(16, parseInt(e.target.value) || 150) })}
                    />
                  </label>
                  <button className="btn btn-ghost btn-xs" onClick={() => moveFrame(idx, "up")} disabled={idx === 0} title="Move up">&#x25B2;</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => moveFrame(idx, "down")} disabled={idx === frames.length - 1} title="Move down">&#x25BC;</button>
                  <button className="btn btn-danger btn-xs" onClick={() => removeFrame(idx)} title="Remove frame">&#x2715;</button>
                </div>
              ))}
            </div>
          </div>

          <div className="anim-section">
            <label className="anim-label">Direction Coverage</label>
            <div className="anim-dir-grid">
              {ALL_DIR_KEYS.map((d) => {
                const has = anims[d] && Object.keys(anims[d]).some((s) => {
                  const a = anims[d][s as AnimationState];
                  return a && a.frames.length > 0;
                });
                return (
                  <button
                    key={d}
                    className={`anim-dir-cell${d === selectedDir ? " active" : ""}${has ? " has-anim" : ""}`}
                    onClick={() => setSelectedDir(d)}
                    title={d === "*" ? "Base (all directions)" : d}
                  >
                    {d === "*" ? "Base" : d}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
