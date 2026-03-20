import { useState } from "react";
import { useEditor } from "../store";
import { generateId, resolveAssetUrl } from "../utils/projectStorage";
import type { ParallaxLayer, RoomEffect, RoomEffectType, RoomSceneProp, ScenePropKind, TransitionEffect } from "../../engine/core/types";
import type { EditorRoomDefinition } from "../types";
import TutorialBubble from "./TutorialBubble";
import { DEFAULT_DISPLAY_CONFIG } from "../../shared/displayConfig";

export default function RoomList() {
  const { state, dispatch } = useEditor();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const project = state.currentProject;
  if (!project) return null;

  function handleAdd() {
    if (!newName.trim()) return;
    const id = generateId("room");
    const roomW = state.currentProject?.display?.baseWidth ?? DEFAULT_DISPLAY_CONFIG.baseWidth;
    const roomH = state.currentProject?.display?.baseHeight ?? DEFAULT_DISPLAY_CONFIG.baseHeight;
    const room: EditorRoomDefinition = {
      id,
      name: newName.trim(),
      backgroundPath: "",
      width: roomW,
      height: roomH,
      walkboxes: [],
      exits: [],
      hotspots: [],
      objectIds: [],
      spawnPoints: [{ id: "default", x: Math.round(roomW * 0.25), y: Math.round(roomH * 0.875) }],
    };
    dispatch({ type: "ADD_ROOM", room });
    setShowNew(false);
    setNewName("");
  }

  function handleDelete(roomId: string) {
    if (!project || project.rooms.length <= 1) {
      alert("You must have at least one room.");
      return;
    }
    if (confirm("Delete this room? This cannot be undone.")) {
      dispatch({ type: "DELETE_ROOM", roomId });
    }
  }

  function handleSetStarting(roomId: string) {
    if (!project) return;
    dispatch({
      type: "UPDATE_PROJECT_META",
      id: project.id,
      title: project.title,
    });
    // Directly patch startingRoom via a room update trick — use an object update
    const updated = { ...project, startingRoom: roomId };
    dispatch({ type: "OPEN_PROJECT", project: updated });
  }

  return (
    <div className="room-list">
      {/* ─── Panel header + add-room trigger ────────────────────────────── */}
      <div className="panel-header">
        <span>Rooms</span>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => setShowNew(true)}
          title="Add room"
        >
          +
        </button>
      </div>

      {/* ─── Inline add-room form ─────────────────────────────────────── */}
      {showNew && (
        <div className="inline-form">
          <input
            className="ed-input ed-input-sm"
            autoFocus
            placeholder="Room name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setShowNew(false); setNewName(""); }
            }}
          />
          <button className="btn btn-primary btn-xs" onClick={handleAdd}>Add</button>
          <button className="btn btn-ghost btn-xs" onClick={() => { setShowNew(false); setNewName(""); }}>✕</button>
        </div>
      )}

      {/* ─── Room item list ───────────────────────────────────────────── */}
      <div className="room-list-items">
        {project.rooms.map((room) => {
          const isSelected = room.id === state.selectedRoomId;
          const isStarting = room.id === project.startingRoom;
          return (
            <div
              key={room.id}
              className={`room-item${isSelected ? " selected" : ""}`}
              onClick={() => dispatch({ type: "SELECT_ROOM", roomId: room.id })}
            >
              <span className="room-item-icon">{isStarting ? "🏠" : "🗺️"}</span>
              <span className="room-item-name">{room.name}</span>
              <div className="room-item-actions" onClick={(e) => e.stopPropagation()}>
                {!isStarting && (
                  <button
                    className="btn btn-ghost btn-xs"
                    title="Set as starting room"
                    onClick={() => handleSetStarting(room.id)}
                  >
                    ▶
                  </button>
                )}
                <button
                  className="btn btn-danger btn-xs"
                  title="Delete room"
                  onClick={() => handleDelete(room.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Selected room settings ───────────────────────────────────── */}
      {state.selectedRoomId && <RoomSettings />}
    </div>
  );
}

// ─── RoomSettings: background, dimensions, hooks, parallax ───────────────────
/** Editing panel for the currently selected room: background, dimensions, audio, and parallax layers. */
function RoomSettings() {
  const { state, dispatch, selectedRoom } = useEditor();
  const project = state.currentProject;
  if (!selectedRoom || !project) return null;

  function updateRoom(updates: Partial<EditorRoomDefinition>) {
    dispatch({ type: "UPDATE_ROOM", roomId: selectedRoom!.id, updates });
  }

  function handleWidthChange(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 320) updateRoom({ width: n });
  }

  function handleHeightChange(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 200) updateRoom({ height: n });
  }

  function addParallaxLayer() {
    const layers: ParallaxLayer[] = [
      ...(selectedRoom!.parallaxLayers ?? []),
      { imagePath: "", scrollFactor: 0.5 },
    ];
    updateRoom({ parallaxLayers: layers });
  }

  function removeParallaxLayer(idx: number) {
    const layers = (selectedRoom!.parallaxLayers ?? []).filter((_, i) => i !== idx);
    updateRoom({ parallaxLayers: layers.length > 0 ? layers : undefined });
  }

  function updateParallaxLayer(idx: number, updates: Partial<ParallaxLayer>) {
    const layers = (selectedRoom!.parallaxLayers ?? []).map((l, i) =>
      i === idx ? { ...l, ...updates } : l
    );
    updateRoom({ parallaxLayers: layers });
  }

  const layers = selectedRoom.parallaxLayers ?? [];

  const imageAssets = project.assets.filter((a) => a.type !== "audio");
  const bgAssets = imageAssets.filter((a) => a.type === "background");
  const otherAssets = imageAssets.filter((a) => a.type !== "background");
  const currentBgAsset = selectedRoom.backgroundPath
    ? project.assets.find((a) => a.id === selectedRoom.backgroundPath)
    : null;
  const bgThumbUrl = currentBgAsset
    ? resolveAssetUrl(project.id, currentBgAsset.id, currentBgAsset.dataUrl)
    : "";

  return (
    <div className="room-settings">
      <div className="panel-header"><span>Room Settings</span></div>

      {/* ─── Background + dimensions ───────────────────────────────────── */}
      <div className="room-settings-fields">
        <label className="settings-label">Background</label>
        <TutorialBubble
          title="Background Picker"
          description="Choose a background image for this room from the asset library. Assets tagged as 'Background' appear first. A thumbnail preview shows the selected image."
          tip="Import background images in the Assets tab, then pick them here."
          preferSide="right"
        >
          <div className="bg-picker-row">
            {bgThumbUrl && (
              <img src={bgThumbUrl} alt="Background" className="bg-picker-thumb" />
            )}
            <select
              className="ed-input ed-input-sm bg-picker-select"
              value={selectedRoom.backgroundPath || ""}
              onChange={(e) => {
                const assetId = e.target.value || "";
                const asset = assetId ? project.assets.find((a) => a.id === assetId) : null;
                const updates: Partial<EditorRoomDefinition> = { backgroundPath: assetId };
                if (asset && asset.width > 0 && asset.height > 0) {
                  updates.width = asset.width;
                  updates.height = asset.height;
                }
                updateRoom(updates);
              }}
            >
              <option value="">-- None --</option>
              {bgAssets.length > 0 && (
                <optgroup label="Backgrounds">
                  {bgAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </optgroup>
              )}
              {otherAssets.length > 0 && (
                <optgroup label="Other Images">
                  {otherAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </TutorialBubble>
        <label className="settings-label" style={{ marginTop: 6 }}>
          Width
          <input
            className="ed-input ed-input-sm"
            type="number"
            min={320}
            step={10}
            value={selectedRoom.width}
            onChange={(e) => handleWidthChange(e.target.value)}
          />
        </label>
        <label className="settings-label">
          Height
          <input
            className="ed-input ed-input-sm"
            type="number"
            min={200}
            step={10}
            value={selectedRoom.height}
            onChange={(e) => handleHeightChange(e.target.value)}
          />
        </label>
      </div>
      {/* ─── Parallax layers ───────────────────────────────────────────── */}
      <div className="panel-header" style={{ marginTop: 8 }}>
        <span>Parallax Layers</span>
        <button className="btn btn-ghost btn-xs" onClick={addParallaxLayer}>+</button>
      </div>
      {layers.length === 0 && (
        <div className="entity-empty" style={{ fontSize: 11 }}>No parallax layers.</div>
      )}
      {layers.map((layer, idx) => (
        <div key={idx} className="parallax-layer-row">
          <select
            className="ed-input ed-input-sm"
            value={layer.imagePath}
            onChange={(e) => updateParallaxLayer(idx, { imagePath: e.target.value })}
          >
            <option value="">-- Select asset --</option>
            {project.assets
              .filter((a) => a.type !== "audio")
              .map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
          </select>
          <label className="settings-label settings-label-inline">
            Speed
            <input
              className="ed-input ed-input-sm"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={layer.scrollFactor}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) updateParallaxLayer(idx, { scrollFactor: Math.max(0, Math.min(1, v)) });
              }}
            />
          </label>
          <button className="btn btn-danger btn-xs" onClick={() => removeParallaxLayer(idx)}>✕</button>
        </div>
      ))}

      <RoomEffectsSection room={selectedRoom} updateRoom={updateRoom} />
      <RoomScenePropsSection room={selectedRoom} updateRoom={updateRoom} />
    </div>
  );
}

// ─── RoomEffectsSection: ambient audio, post-process effects ─────────────────
/** Collapsible panel for ambient audio track, room transition, and particle/glow visual effects on the selected room. */
function RoomEffectsSection({ room, updateRoom }: { room: EditorRoomDefinition; updateRoom: (u: Partial<EditorRoomDefinition>) => void }) {
  const { state } = useEditor();
  const project = state.currentProject;
  const effects = room.effects ?? [];
  const [newType, setNewType] = useState<RoomEffectType>("glow");
  const [newLayer, setNewLayer] = useState<"background" | "foreground">("background");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function addEffect() {
    const id = crypto.randomUUID().slice(0, 8);
    const W = room.width;
    const H = room.height;
    const TYPE_DEFAULTS: Record<RoomEffectType, Partial<RoomEffect>> = {
      glow:    { x: Math.round(W * 0.25), y: Math.round(H * 0.1),  width: Math.round(W * 0.5), height: Math.round(H * 0.4), color: "#ffe08a", intensity: 0.45, speed: 0.4 },
      dust:    { x: 0,                    y: Math.round(H * 0.55),  width: W,                    height: Math.round(H * 0.45), color: "rgba(210,200,180,0.6)", intensity: 0.4, speed: 0.6 },
      fog:     { x: 0,                    y: Math.round(H * 0.65),  width: W,                    height: Math.round(H * 0.35), color: "rgba(180,200,230,0.7)", intensity: 0.5, speed: 0.8 },
      sparkle: { x: 0,                    y: Math.round(H * 0.25),  width: W,                    height: Math.round(H * 0.6),  color: "rgba(255,245,200,0.9)", intensity: 0.4, speed: 0.6 },
    };
    const defaults = TYPE_DEFAULTS[newType];
    const effect: RoomEffect = {
      id,
      type: newType,
      layer: newLayer,
      x: defaults.x ?? 0,
      y: defaults.y ?? 0,
      width: defaults.width ?? W,
      height: defaults.height ?? H,
      color: defaults.color ?? "#aaccff",
      intensity: defaults.intensity ?? 0.5,
      speed: defaults.speed ?? 1,
      seed: Math.floor(Math.random() * 100),
      visible: true,
    };
    updateRoom({ effects: [...effects, effect] });
    setExpandedId(id);
  }

  function removeEffect(id: string) {
    const next = effects.filter((e) => e.id !== id);
    updateRoom({ effects: next.length > 0 ? next : undefined });
    if (expandedId === id) setExpandedId(null);
  }

  function updateEffect(id: string, updates: Partial<RoomEffect>) {
    updateRoom({ effects: effects.map((e) => e.id === id ? { ...e, ...updates } : e) });
  }

  const effectsLabel = `Room Effects${effects.length > 0 ? ` (${effects.length})` : ""}`;

  const audioAssets = project?.assets.filter((a) => a.type === "audio") ?? [];

  return (
    <details style={{ marginTop: 8, borderTop: "1px solid var(--border-subtle, #333)" }}>
      <summary style={{ cursor: "pointer", userSelect: "none", fontSize: 12, fontWeight: 600, color: "var(--text-muted, #aaa)", padding: "6px 4px", listStyle: "none", display: "flex", alignItems: "center", gap: 4 }}>
        ▸ {effectsLabel}
      </summary>

      {/* ─── Ambient audio ──────────────────────────────────────────────── */}
      <div style={{ padding: "6px 4px 2px" }}>
        <TutorialBubble
          title="Ambient Audio"
          description="A looping audio track that plays automatically when the player enters this room. Stops when leaving. Great for ambient sounds like crickets, wind, or background music."
          preferSide="right"
        >
          <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 2, cursor: "help" }}>
            Ambient Audio
          </label>
        </TutorialBubble>
        <select
          className="ed-input ed-input-sm"
          value={room.ambientAudioPath ?? ""}
          onChange={(e) => updateRoom({ ambientAudioPath: e.target.value || undefined })}
        >
          <option value="">— None —</option>
          {audioAssets.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* ─── Room transition ─────────────────────────────────────────────── */}
      <div style={{ padding: "4px 4px 6px" }}>
        <TutorialBubble
          title="Transition Effect"
          description="Visual effect played when the player enters this room. 'Fade' briefly fades to black then back in. 'Instant' cuts immediately with no animation."
          preferSide="right"
        >
          <label style={{ fontSize: 11, color: "#aaa", display: "block", marginBottom: 2, cursor: "help" }}>
            Room Transition
          </label>
        </TutorialBubble>
        <select
          className="ed-input ed-input-sm"
          value={room.transitionEffect ?? "instant"}
          onChange={(e) => updateRoom({ transitionEffect: e.target.value as TransitionEffect })}
        >
          <option value="instant">Instant (no animation)</option>
          <option value="fade">Fade (black in/out)</option>
        </select>
      </div>

      {/* ─── Visual particle effects ─────────────────────────────────────── */}
      {effects.length > 0 && (
        <div style={{ fontSize: 10, color: "#888", padding: "2px 4px 4px", fontStyle: "italic" }}>
          Effects animate in Play mode — switch to Play to preview.
        </div>
      )}
      {effects.length === 0 && (
        <div className="entity-empty" style={{ fontSize: 11 }}>No particle effects. Add one below to create ambient atmosphere (visible in Play mode).</div>
      )}

      {effects.map((effect) => {
        const isOpen = expandedId === effect.id;
        return (
          <div key={effect.id} style={{ borderBottom: "1px solid var(--border-subtle, #333)" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 4px 4px 8px", cursor: "pointer" }}
              onClick={() => setExpandedId(isOpen ? null : effect.id)}
            >
              <span style={{ fontSize: 10, opacity: 0.5 }}>{isOpen ? "▾" : "▸"}</span>
              <span style={{ fontSize: 11, flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{effect.type}</span>
                <span style={{ opacity: 0.55, marginLeft: 5 }}>· {effect.layer}</span>
                {effect.visible === false && <span style={{ opacity: 0.4, marginLeft: 5 }}>(hidden)</span>}
              </span>
              <button
                className="btn btn-danger btn-xs"
                onClick={(e) => { e.stopPropagation(); removeEffect(effect.id); }}
                title="Remove effect"
              >✕</button>
            </div>

            {isOpen && (
              <div style={{ padding: "4px 8px 8px 8px" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <label style={{ fontSize: 11, flex: 1 }}>
                    <span title="Effect style: glow=soft light bloom, dust=floating particles, fog=rolling mist, sparkle=small bright flecks">Type (?)</span>
                    <select
                      className="ed-input ed-input-sm"
                      value={effect.type}
                      onChange={(e) => updateEffect(effect.id, { type: e.target.value as RoomEffectType })}
                    >
                      <option value="glow">glow — soft light bloom</option>
                      <option value="dust">dust — floating particles</option>
                      <option value="fog">fog — rolling mist</option>
                      <option value="sparkle">sparkle — bright flecks</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 11, flex: 1 }}>
                    <span title="Background: renders under actors and objects. Foreground: renders on top of everything (e.g. rain in front of the scene).">Layer (?)</span>
                    <select
                      className="ed-input ed-input-sm"
                      value={effect.layer}
                      onChange={(e) => updateEffect(effect.id, { layer: e.target.value as "background" | "foreground" })}
                    >
                      <option value="background">background (under actors)</option>
                      <option value="foreground">foreground (over actors)</option>
                    </select>
                  </label>
                </div>

                <div className="detail-row-pair" style={{ marginBottom: 4 }}>
                  <label className="detail-label-sm" title="Left edge of the effect region in room pixels">
                    X
                    <input className="ed-input ed-input-sm" type="number" value={effect.x ?? 0}
                      onChange={(e) => updateEffect(effect.id, { x: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: 60 }} />
                  </label>
                  <label className="detail-label-sm" title="Top edge of the effect region in room pixels">
                    Y
                    <input className="ed-input ed-input-sm" type="number" value={effect.y ?? 0}
                      onChange={(e) => updateEffect(effect.id, { y: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: 60 }} />
                  </label>
                </div>

                <div className="detail-row-pair" style={{ marginBottom: 4 }}>
                  <label className="detail-label-sm" title="Width of the effect region in room pixels">
                    W
                    <input className="ed-input ed-input-sm" type="number" min={1} value={effect.width ?? 400}
                      onChange={(e) => updateEffect(effect.id, { width: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: 60 }} />
                  </label>
                  <label className="detail-label-sm" title="Height of the effect region in room pixels">
                    H
                    <input className="ed-input ed-input-sm" type="number" min={1} value={effect.height ?? 200}
                      onChange={(e) => updateEffect(effect.id, { height: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: 60 }} />
                  </label>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <label style={{ fontSize: 11, flex: 1 }} title="Opacity/strength of the effect. 0 = invisible, 1 = full strength.">
                    Intensity (0–1)
                    <input className="ed-input ed-input-sm" type="number" min={0} max={1} step={0.05}
                      value={effect.intensity ?? 0.5}
                      onChange={(e) => updateEffect(effect.id, { intensity: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) })}
                    />
                  </label>
                  <label style={{ fontSize: 11, flex: 1 }} title="Animation playback speed. 1 = normal. 0.5 = half-speed. 2 = double-speed.">
                    Speed
                    <input className="ed-input ed-input-sm" type="number" min={0} step={0.1}
                      value={effect.speed ?? 1}
                      onChange={(e) => updateEffect(effect.id, { speed: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </label>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <label style={{ fontSize: 11, flex: 1 }} title="Tint colour applied to the effect. CSS hex colour, e.g. #aaccff for a cool blue dust.">
                    Color
                    <input className="ed-input ed-input-sm" type="text"
                      value={effect.color ?? "#aaccff"}
                      onChange={(e) => updateEffect(effect.id, { color: e.target.value })}
                    />
                  </label>
                  <label style={{ fontSize: 11, flex: 1 }} title="Random seed for the effect's particle pattern. Change this to get a different arrangement of the same effect type.">
                    Seed
                    <input className="ed-input ed-input-sm" type="number" min={0} step={1}
                      value={effect.seed ?? 0}
                      onChange={(e) => updateEffect(effect.id, { seed: parseInt(e.target.value, 10) || 0 })}
                    />
                  </label>
                </div>

                <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={effect.visible !== false}
                    onChange={(e) => updateEffect(effect.id, { visible: e.target.checked ? undefined : false })}
                  />
                  Visible
                </label>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ fontSize: 10, color: "#666", padding: "4px 4px 0", lineHeight: 1.4 }}>
        Add particle effect:
      </div>
      <div style={{ display: "flex", gap: 4, padding: "2px 4px 0 4px" }}>
        <select
          className="ed-input ed-input-sm"
          value={newType}
          onChange={(e) => setNewType(e.target.value as RoomEffectType)}
          style={{ flex: 1 }}
          title="Effect type to add"
        >
          <option value="glow">glow</option>
          <option value="dust">dust</option>
          <option value="fog">fog</option>
          <option value="sparkle">sparkle</option>
        </select>
        <select
          className="ed-input ed-input-sm"
          value={newLayer}
          onChange={(e) => setNewLayer(e.target.value as "background" | "foreground")}
          style={{ flex: 1 }}
          title="background = under actors/objects; foreground = above everything"
        >
          <option value="background">background</option>
          <option value="foreground">foreground</option>
        </select>
        <button className="btn btn-primary btn-xs" onClick={addEffect}>+ Add</button>
      </div>
    </details>
  );
}

// ─── RoomScenePropsSection: scene-placed lights, decals, plaques ─────────────
/** Collapsible panel for positioning lights, decal sprites, and text plaques in the room scene. */
function RoomScenePropsSection({ room, updateRoom }: { room: EditorRoomDefinition; updateRoom: (u: Partial<EditorRoomDefinition>) => void }) {
  const props = room.sceneProps ?? [];
  const [newKind, setNewKind] = useState<ScenePropKind>("light");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function addProp() {
    const id = crypto.randomUUID().slice(0, 8);
    const base: RoomSceneProp = {
      id,
      kind: newKind,
      x: Math.round(room.width / 2),
      y: Math.round(room.height / 2),
    };
    const prop: RoomSceneProp = newKind === "light"
      ? { ...base, radius: 60, color: "#ffee88", intensity: 0.6, pulseSpeed: 1.5 }
      : newKind === "plaque"
        ? { ...base, text: "Label", font: "14px monospace", textColor: "#f0e8c8", background: "rgba(0,0,0,0.55)", padding: 6 }
        : { ...base };
    updateRoom({ sceneProps: [...props, prop] });
    setExpandedId(id);
  }

  function removeProp(id: string) {
    const next = props.filter((p) => p.id !== id);
    updateRoom({ sceneProps: next.length > 0 ? next : undefined });
    if (expandedId === id) setExpandedId(null);
  }

  function updateProp(id: string, updates: Partial<RoomSceneProp>) {
    updateRoom({ sceneProps: props.map((p) => p.id === id ? { ...p, ...updates } : p) });
  }

  const propsLabel = `Scene Props${props.length > 0 ? ` (${props.length})` : ""}`;

  return (
    <details style={{ marginTop: 8, borderTop: "1px solid var(--border-subtle, #333)" }}>
      <summary style={{ cursor: "pointer", userSelect: "none", fontSize: 12, fontWeight: 600, color: "var(--text-muted, #aaa)", padding: "6px 4px", listStyle: "none", display: "flex", alignItems: "center", gap: 4 }}>
        ▸ {propsLabel}
      </summary>

      {props.length === 0 && (
        <div className="entity-empty" style={{ fontSize: 11 }}>No scene props. Add a light, decal, or plaque.</div>
      )}

      {props.map((prop) => {
        const isOpen = expandedId === prop.id;
        return (
          <div key={prop.id} style={{ borderBottom: "1px solid var(--border-subtle, #333)" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 4px 4px 8px", cursor: "pointer" }}
              onClick={() => setExpandedId(isOpen ? null : prop.id)}
            >
              <span style={{ fontSize: 10, opacity: 0.5 }}>{isOpen ? "▾" : "▸"}</span>
              <span style={{ fontSize: 11, flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{prop.kind}</span>
                <span style={{ opacity: 0.55, marginLeft: 5 }}>· {prop.id}</span>
                {prop.visible === false && <span style={{ opacity: 0.4, marginLeft: 5 }}>(hidden)</span>}
              </span>
              <button
                className="btn btn-danger btn-xs"
                onClick={(e) => { e.stopPropagation(); removeProp(prop.id); }}
                title="Remove prop"
              >✕</button>
            </div>

            {isOpen && (
              <div style={{ padding: "4px 8px 8px 8px" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <label style={{ fontSize: 11, flex: 1 }}>
                    ID
                    <input className="ed-input ed-input-sm" type="text"
                      value={prop.id}
                      onChange={(e) => updateProp(prop.id, { id: e.target.value })}
                    />
                  </label>
                  <label style={{ fontSize: 11, flex: 1 }}>
                    Kind
                    <select className="ed-input ed-input-sm"
                      value={prop.kind}
                      onChange={(e) => updateProp(prop.id, { kind: e.target.value as ScenePropKind })}
                    >
                      {(["light", "decal", "plaque"] as ScenePropKind[]).map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="detail-row-pair" style={{ marginBottom: 4 }}>
                  <label className="detail-label-sm">
                    X
                    <input className="ed-input ed-input-sm" type="number" value={prop.x}
                      onChange={(e) => updateProp(prop.id, { x: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: 60 }} />
                  </label>
                  <label className="detail-label-sm">
                    Y
                    <input className="ed-input ed-input-sm" type="number" value={prop.y}
                      onChange={(e) => updateProp(prop.id, { y: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: 60 }} />
                  </label>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <label style={{ fontSize: 11, flex: 1 }}>
                    Z Layer
                    <select className="ed-input ed-input-sm"
                      value={prop.zLayer ?? "normal"}
                      onChange={(e) => {
                        const v = e.target.value as "behind" | "normal" | "front";
                        updateProp(prop.id, { zLayer: v === "normal" ? undefined : v });
                      }}
                    >
                      <option value="behind">behind</option>
                      <option value="normal">normal</option>
                      <option value="front">front</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 11, flex: 1 }}>
                    Z Offset
                    <input className="ed-input ed-input-sm" type="number" step={1}
                      value={prop.zOffset ?? 0}
                      onChange={(e) => updateProp(prop.id, { zOffset: parseInt(e.target.value, 10) || 0 })}
                    />
                  </label>
                </div>

                <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={prop.visible !== false}
                    onChange={(e) => updateProp(prop.id, { visible: e.target.checked ? undefined : false })}
                  />
                  Visible
                </label>

                {prop.kind === "light" && (
                  <>
                    <div className="detail-row-pair" style={{ marginBottom: 4 }}>
                      <label className="detail-label-sm">
                        Radius
                        <input className="ed-input ed-input-sm" type="number" min={1}
                          value={prop.radius ?? 60}
                          onChange={(e) => updateProp(prop.id, { radius: parseInt(e.target.value, 10) || 60 })}
                          style={{ width: 60 }} />
                      </label>
                      <label className="detail-label-sm">
                        Intensity
                        <input className="ed-input ed-input-sm" type="number" min={0} max={1} step={0.05}
                          value={prop.intensity ?? 0.6}
                          onChange={(e) => updateProp(prop.id, { intensity: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) })}
                          style={{ width: 60 }} />
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <label style={{ fontSize: 11, flex: 1 }}>
                        Color
                        <input className="ed-input ed-input-sm" type="text"
                          value={prop.color ?? "#ffee88"}
                          onChange={(e) => updateProp(prop.id, { color: e.target.value })}
                        />
                      </label>
                      <label style={{ fontSize: 11, flex: 1 }}>
                        Pulse Speed (0=static)
                        <input className="ed-input ed-input-sm" type="number" min={0} step={0.1}
                          value={prop.pulseSpeed ?? 1.5}
                          onChange={(e) => updateProp(prop.id, { pulseSpeed: Math.max(0, parseFloat(e.target.value) || 0) })}
                        />
                      </label>
                    </div>
                  </>
                )}

                {prop.kind === "decal" && (
                  <>
                    <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                      Asset Path (asset ID)
                      <input className="ed-input ed-input-sm" type="text"
                        value={prop.assetPath ?? ""}
                        onChange={(e) => updateProp(prop.id, { assetPath: e.target.value || undefined })}
                        placeholder="asset ID or path"
                        style={{ display: "block", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <div className="detail-row-pair" style={{ marginBottom: 4 }}>
                      <label className="detail-label-sm">
                        Width
                        <input className="ed-input ed-input-sm" type="number" min={0}
                          value={prop.width ?? ""}
                          placeholder="auto"
                          onChange={(e) => {
                            const v = e.target.value;
                            updateProp(prop.id, { width: v === "" ? undefined : parseInt(v, 10) || undefined });
                          }}
                          style={{ width: 60 }} />
                      </label>
                      <label className="detail-label-sm">
                        Height
                        <input className="ed-input ed-input-sm" type="number" min={0}
                          value={prop.height ?? ""}
                          placeholder="auto"
                          onChange={(e) => {
                            const v = e.target.value;
                            updateProp(prop.id, { height: v === "" ? undefined : parseInt(v, 10) || undefined });
                          }}
                          style={{ width: 60 }} />
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <label style={{ fontSize: 11, flex: 1 }}>
                        Frames
                        <input className="ed-input ed-input-sm" type="number" min={1} step={1}
                          value={prop.frameCount ?? 1}
                          onChange={(e) => updateProp(prop.id, { frameCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        />
                      </label>
                      <label style={{ fontSize: 11, flex: 1 }}>
                        FPS
                        <input className="ed-input ed-input-sm" type="number" min={1} step={1}
                          value={prop.fps ?? 8}
                          onChange={(e) => updateProp(prop.id, { fps: Math.max(1, parseInt(e.target.value, 10) || 8) })}
                        />
                      </label>
                    </div>
                  </>
                )}

                {prop.kind === "plaque" && (
                  <>
                    <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                      Text
                      <input className="ed-input ed-input-sm" type="text"
                        value={prop.text ?? ""}
                        onChange={(e) => updateProp(prop.id, { text: e.target.value || undefined })}
                        placeholder="Plaque text"
                        style={{ display: "block", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                      Font (CSS)
                      <input className="ed-input ed-input-sm" type="text"
                        value={prop.font ?? "14px monospace"}
                        onChange={(e) => updateProp(prop.id, { font: e.target.value || undefined })}
                        style={{ display: "block", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <label style={{ fontSize: 11, flex: 1 }}>
                        Text Color
                        <input className="ed-input ed-input-sm" type="text"
                          value={prop.textColor ?? "#f0e8c8"}
                          onChange={(e) => updateProp(prop.id, { textColor: e.target.value || undefined })}
                        />
                      </label>
                      <label style={{ fontSize: 11, flex: 1 }}>
                        Background
                        <input className="ed-input ed-input-sm" type="text"
                          value={prop.background ?? "rgba(0,0,0,0.55)"}
                          onChange={(e) => updateProp(prop.id, { background: e.target.value || undefined })}
                        />
                      </label>
                    </div>
                    <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                      Padding (px)
                      <input className="ed-input ed-input-sm" type="number" min={0}
                        value={prop.padding ?? 6}
                        onChange={(e) => updateProp(prop.id, { padding: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        style={{ width: 80 }}
                      />
                    </label>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 4, padding: "4px 4px 0 4px" }}>
        <select
          className="ed-input ed-input-sm"
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as ScenePropKind)}
          style={{ flex: 1 }}
        >
          {(["light", "decal", "plaque"] as ScenePropKind[]).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-xs" onClick={addProp}>+ Add</button>
      </div>
    </details>
  );
}
