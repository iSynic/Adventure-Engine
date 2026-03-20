import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import type { CSSProperties } from "react";
import type { Engine } from "../../engine/core/Engine";
import type { VerbType } from "../../engine/core/types";
import type { UIState } from "../../engine/ui/UIManager";
import { DEFAULT_OVERLAY_FLAGS } from "../../engine/debug/DebugState";
import type { DialogueChoice } from "../../engine/dialogue/DialogueManager";
import { bootGame } from "../../runtime/bootGame";
import { VERB_LIST } from "../../runtime/verbLabels";
import { useEditor } from "../store";
import { projectToConfig } from "../utils/projectToConfig";
import { getStorageProvider } from "../utils/projectStorage";
import { computeScaledViewport } from "../../shared/ViewportScaler";
import { resolveDisplayConfig } from "../../shared/displayConfig";
import { resolveOverlayConfig } from "../../shared/overlayConfig";
import DebugPanel from "../components/DebugPanel";
import DialogueChoiceOverlay from "../../components/DialogueChoiceOverlay";
import MessageBar from "../../components/MessageBar";

const VERBS = VERB_LIST;

interface PlayViewProps {
  startRoomId?: string | null;
}

export default function PlayView({ startRoomId }: PlayViewProps = {}) {
  const { state, dispatch } = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [uiState, setUiState] = useState<UIState>({
    selectedVerb: "walk",
    message: "",
    messageTimer: 0,
    hoverTarget: null,
    pendingActionSentence: "",
    inventoryOpen: false,
    selectedInventoryItem: null,
    showRoomTitle: false,
    roomTitle: "",
    debugMode: false,
    debugOverlayFlags: { ...DEFAULT_OVERLAY_FLAGS },
    debugInteractionTarget: null,
    debugHitFlash: null,
    debugInspectedEntityId: null,
    speechBubble: null,
    bubbleShownAt: 0,
    skippable: false,
  });
  const [inventoryItems, setInventoryItems] = useState<
    { id: string; name: string; iconPath?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [verbBarHovered, setVerbBarHovered] = useState(false);
  const [dialogueActive, setDialogueActive] = useState(false);
  const [dialogueSpeaker, setDialogueSpeaker] = useState("");
  const [dialogueText, setDialogueText] = useState("");
  const [dialogueChoices, setDialogueChoices] = useState<DialogueChoice[]>([]);
  const [dialoguePortrait, setDialoguePortrait] = useState<string | undefined>();
  const [chosenBranchIds, setChosenBranchIds] = useState<string[]>([]);

  const project = state.currentProject;

  const effectiveStartRoomId = startRoomId ?? state.testRoomId ?? project?.startingRoom;
  const startingRoom = project?.rooms.find((r) => r.id === effectiveStartRoomId) ?? project?.rooms.find((r) => r.id === project?.startingRoom) ?? project?.rooms[0];
  const displayCfg = project?.display;
  const resolved = resolveDisplayConfig(displayCfg);
  const canvasW = resolved.baseWidth;
  const canvasH = resolved.baseHeight;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scaledSize, setScaledSize] = useState<{ w: number; h: number; scale: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;
      const vp = computeScaledViewport(width, height, resolved);
      setScaledSize({ w: vp.cssWidth, h: vp.cssHeight, scale: vp.scale });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasW, canvasH, resolved]);

  const refreshInventory = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const items = engine.inventory.getItems(
      engine.getConfig().defaultPlayerActorId
    );
    setInventoryItems(
      items.map((i) => ({ id: i.id, name: i.name, iconPath: i.iconPath }))
    );
  }, []);

  useEffect(() => {
    if (!project) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { config, scripts } = projectToConfig(project, { skipValidation: true });

    const overrideRoom = startRoomId ?? state.testRoomId;
    if (overrideRoom && config.rooms.some((r) => r.id === overrideRoom)) {
      config.startingRoom = overrideRoom;
    }

    if (!config.startingRoom) {
      setError("No starting room set. Go to Project Settings to set one.");
      setLoading(false);
      return;
    }

    let started = false;
    bootGame({ canvas, config, scripts, storageProvider: getStorageProvider() })
      .then((engine) => {
        engineRef.current = engine;
        started = true;
        setLoading(false);
        engine.ui.subscribe((s) => {
          setUiState({ ...s });
          refreshInventory();
        });
        engine.dialogueManager.subscribe((ds) => {
          setDialogueActive(ds.active);
          setDialogueSpeaker(ds.speakerName);
          setDialogueText(ds.speakerText);
          setDialogueChoices(ds.choices);
          setDialoguePortrait(ds.speakerPortrait);
          setChosenBranchIds(ds.chosenBranchIds);
        });
        refreshInventory();
        engine.activateCurrentRoom().catch((e) => {
          setError(String(e));
        });
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });

    return () => {
      if (engineRef.current && started) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, [project, startRoomId, state.testRoomId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "`") {
        e.preventDefault();
        setDebugOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!project) return null;

  const activeVerbs = VERBS.filter((v) =>
    project.verbs.includes(v.id)
  );

  const resolvedOverlay = resolveOverlayConfig(project.overlayConfig);
  const vbCfg = resolvedOverlay.verbBar;
  const showVerbBar = vbCfg.visible;
  const vbDock = vbCfg.dock;
  const vbSize = vbCfg.size;
  const vbMode = vbCfg.visibilityMode;
  const vbIsVertical = vbDock === "left" || vbDock === "right";
  const VB_COLLAPSED_SIZE = 6;

  return (
    <div className="play-view">
      <div className="play-header">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => dispatch({ type: "SET_PLAYING", playing: false })}
        >
          ← Back to Editor
        </button>
        <span className="play-title">{project.title}</span>
        <button
          className={`btn btn-ghost btn-sm${debugOpen ? " active" : ""}`}
          onClick={() => setDebugOpen((prev) => !prev)}
        >
          Debug
        </button>
        <span className="play-hints">[ ` ] Debug &nbsp; [ F1 ] Overlay &nbsp; [ F5 ] Save &nbsp; [ F9 ] Load</span>
      </div>

      <div className="play-canvas-wrap" ref={wrapRef} style={{ alignItems: resolved.viewportAlignment === "top-left" ? "flex-start" : undefined, justifyContent: resolved.viewportAlignment === "top-left" ? "flex-start" : undefined, background: resolved.backgroundColor }}>
        <div style={{ position: "relative", width: scaledSize?.w ?? canvasW, height: scaledSize?.h ?? canvasH }}>
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            data-testid="play-canvas"
            style={{ display: "block", background: resolved.backgroundColor, width: "100%", height: "100%", imageRendering: resolved.pixelPerfect ? "pixelated" as const : undefined }}
          />
          {/* Native-resolution overlay — all coordinates match game pixels, scaled uniformly */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: canvasW,
            height: canvasH,
            transform: `scale(${scaledSize?.scale ?? 1})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}>
            {showVerbBar && (
              <div
                className="play-verbs"
                onContextMenu={(e) => e.preventDefault()}
                onMouseEnter={() => setVerbBarHovered(true)}
                onMouseLeave={() => setVerbBarHovered(false)}
                style={(() => {
                  const COLLAPSED = VB_COLLAPSED_SIZE;
                  const base: CSSProperties = {
                    position: "absolute",
                    display: "flex",
                    flexWrap: "wrap",
                    flexDirection: vbIsVertical ? "column" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: vbCfg.gap,
                    padding: vbCfg.padding,
                    background: "rgba(26,26,46,0.85)",
                    pointerEvents: "auto",
                    overflow: "hidden",
                    zIndex: 5,
                  };
                  if (vbDock === "top")    { base.top = 0; base.left = 0; base.right = 0; base.height = vbSize; }
                  else if (vbDock === "bottom") { base.bottom = 0; base.left = 0; base.right = 0; base.height = vbSize; }
                  else if (vbDock === "left")   { base.top = 0; base.bottom = 0; base.left = 0; base.width = vbSize; }
                  else                          { base.top = 0; base.bottom = 0; base.right = 0; base.width = vbSize; }
                  if (vbMode === "hover") {
                    base.opacity = verbBarHovered ? 1 : 0;
                    base.transition = "opacity 0.2s";
                  } else if (vbMode === "collapsed") {
                    base.transition = vbIsVertical ? "width 0.15s ease" : "height 0.15s ease";
                    if (vbIsVertical) base.width  = verbBarHovered ? vbSize : COLLAPSED;
                    else              base.height = verbBarHovered ? vbSize : COLLAPSED;
                  }
                  return base;
                })()}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: vbCfg.gap }}>
                  {activeVerbs.map((v) => (
                    <button
                      key={v.id}
                      className={`play-verb${uiState.selectedVerb === v.id ? " active" : ""}`}
                      onClick={() => engineRef.current?.ui.setVerb(v.id)}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, borderLeft: "1px solid #333", paddingLeft: 6, marginLeft: 4 }}>
                  {inventoryItems.length === 0 ? (
                    <span style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>no items</span>
                  ) : (
                    inventoryItems.map((item) => (
                      <button
                        key={item.id}
                        className={`inv-item${uiState.selectedInventoryItem === item.id ? " active" : ""}`}
                        onClick={() => {
                          const e = engineRef.current;
                          if (!e) return;
                          const cur = e.ui.getSelectedInventoryItem();
                          e.ui.selectInventoryItem(cur === item.id ? null : item.id);
                        }}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          const e = engineRef.current;
                          if (!e) return;
                          e.verbSystem
                            .dispatch("look", item.id, "item", project.defaultPlayerActorId)
                            .then((r) => {
                              if (!r.message) return;
                              const actor = e.roomManager.getActor(project.defaultPlayerActorId);
                              if (actor) {
                                e.ui.showSpeechBubble(project.defaultPlayerActorId, r.message, actor.x, actor.y, 4);
                              } else {
                                e.ui.showMessage(r.message);
                              }
                            });
                        }}
                      >
                        {item.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {uiState.message && (
              <div
                className="play-narration"
                style={{
                  position: "absolute",
                  top: 36,
                  left: "50%",
                  transform: "translateX(-50%)",
                  maxWidth: "80%",
                  zIndex: 8,
                  pointerEvents: "auto",
                }}
                onClick={() => {
                  const e = engineRef.current;
                  if (!e) return;
                  if (e.dialogueManager.isActive() && e.dialogueManager.canSkipCurrentLine()) {
                    e.dialogueManager.skipCurrentLine();
                  } else if (e.ui.hasActiveBubble()) {
                    e.ui.dismissBubble();
                  } else if (e.ui.hasActiveMessage()) {
                    e.ui.dismissMessage();
                  }
                }}
              >
                <MessageBar message={uiState.message} skippable={uiState.skippable} />
              </div>
            )}
          </div>
          {loading && (
            <div className="play-overlay">Loading game…</div>
          )}
          {error && (
            <div className="play-overlay play-error">{error}</div>
          )}
          {uiState.showRoomTitle && (
            <div className="play-room-title">{uiState.roomTitle}</div>
          )}
          {uiState.hoverTarget && !dialogueActive && (
            <div className="play-hover-label">
              {uiState.selectedVerb} {uiState.hoverTarget}
            </div>
          )}
          {dialogueActive && (
            <DialogueChoiceOverlay
              speakerName={uiState.speechBubble ? "" : dialogueSpeaker}
              speakerText={uiState.speechBubble ? "" : dialogueText}
              speakerPortrait={uiState.speechBubble ? undefined : dialoguePortrait}
              choices={dialogueChoices}
              chosenBranchIds={chosenBranchIds}
              onSelect={(branchIndex) => engineRef.current?.dialogueManager.selectChoice(branchIndex)}
              skippable={dialogueChoices.length === 0}
              onSkip={() => engineRef.current?.dialogueManager.skipCurrentLine()}
            />
          )}
        </div>
        {debugOpen && engineRef.current && (
          <DebugPanel engine={engineRef.current} playerActorId={project.defaultPlayerActorId} />
        )}
      </div>
    </div>
  );
}
