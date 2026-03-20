import type { GameConfig, GameAction, HitTarget, TargetType, VerbType, Point, Direction } from "../core/types";
import type { InputManager } from "./InputManager";
import type { UIManager } from "../ui/UIManager";
import type { Camera } from "../rendering/Camera";
import type { RoomManager } from "../world/RoomManager";
import type { VerbSystem } from "../interaction/VerbSystem";
import type { DialogueManager } from "../dialogue/DialogueManager";
import type { DebugEventLog } from "../debug/DebugEventLog";
import type { ActorInstance } from "../world/Actor";
import { findWalkboxForPoint, computeWaypointPath } from "../navigation/Walkbox";
import { getOverlayFlagByIndex } from "../debug/DebugState";
import { VERB_CSS_CURSORS, DEFAULT_CURSOR_CONFIG } from "../../shared/cursorConfig";

export interface InputBridgeState {
  lastHitType: string | null;
  lastHitTarget: HitTarget | null;
  lastSentenceVerb: string | null;
  lastSentenceItem: string | null;
  lastCursorVerb: string | null;
  lastCursorWalkable: boolean;
  lastCursorObjectId: string | null;
  lastCursorTargetId: string | null;
  lastCursorInventoryItem: string | null;
  lastWorldX: number;
  lastWorldY: number;
  pathPreviewWaypoints: Point[];
  interactionToken: number;
}

export function createInputBridgeState(): InputBridgeState {
  return {
    lastHitType: null,
    lastHitTarget: null,
    lastSentenceVerb: null,
    lastSentenceItem: null,
    lastCursorVerb: null,
    lastCursorWalkable: false,
    lastCursorObjectId: null,
    lastCursorTargetId: null,
    lastCursorInventoryItem: null,
    lastWorldX: 0,
    lastWorldY: 0,
    pathPreviewWaypoints: [],
    interactionToken: 0,
  };
}

export interface InputBridgeDeps {
  input: InputManager;
  ui: UIManager;
  camera: Camera;
  roomManager: RoomManager;
  verbSystem: VerbSystem;
  dialogueManager: DialogueManager;
  debugEventLog: DebugEventLog;
  config: GameConfig;
  ctx: CanvasRenderingContext2D;
  getPlayer: () => ActorInstance | null;
  loadRoom: (roomId: string, spawnPointId?: string) => Promise<void>;
  quickSave: () => void;
  quickLoad: () => void;
  /** Returns true while the engine is running a blocking cutscene/script. */
  getIsBusy?: () => boolean;
}

export function getSetupInputHandlers(
  deps: InputBridgeDeps,
  state: InputBridgeState
): { markInitialized: () => void } {
  let initialized = false;

  deps.input.on((event) => {
    if (!initialized) return;
    if (event.type === "click" && event.x !== undefined && event.y !== undefined) {
      handleClick(deps, state, event.x, event.y);
    }
    if (event.type === "rightclick" && event.x !== undefined && event.y !== undefined) {
      handleRightClick(deps, state, event.x, event.y);
    }
    if (event.type === "mousemove" && event.x !== undefined && event.y !== undefined) {
      handleMouseMove(deps, state, event.x, event.y);
    }
    if (event.type === "keydown") {
      handleKey(deps, state, event.key ?? "");
    }
  });

  return { markInitialized: () => { initialized = true; } };
}

function buildGameAction(
  deps: InputBridgeDeps,
  hit: HitTarget,
  verb: VerbType,
  playerId: string,
  selectedItem: string | null
): GameAction {
  const resolver = deps.verbSystem.actionResolver;
  const primaryTarget = resolver.makeTarget(hit.id, hit.type as TargetType);
  const secondaryTarget = selectedItem && verb === "use"
    ? resolver.makeTarget(selectedItem, "item")
    : null;
  return resolver.buildAction(verb, playerId, primaryTarget, secondaryTarget);
}

interface StandInfo {
  point: Point;
  direction?: Direction;
  interactDistance?: number;
  isExplicit: boolean;
}

// ─── Direction helpers for verb-aware approach fallback ──────────────────────

const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  N:  { dx: 0,  dy: -1 }, NE: { dx: 1,  dy: -1 }, E:  { dx: 1,  dy: 0  },
  SE: { dx: 1,  dy: 1  }, S:  { dx: 0,  dy: 1  }, SW: { dx: -1, dy: 1  },
  W:  { dx: -1, dy: 0  }, NW: { dx: -1, dy: -1 },
};

const OPPOSITE_DIR: Record<Direction, Direction> = {
  N: "S", NE: "SW", E: "W", SE: "NW", S: "N", SW: "NE", W: "E", NW: "SE",
};

/**
 * Compute a stand point in front of an NPC (the side they are facing) at the
 * given distance.  Returns undefined when facing is not set.
 */
function standInFrontOf(
  actorX: number,
  actorY: number,
  facing: Direction,
  distance: number,
): { point: Point; direction: Direction } {
  const vec = DIR_VECTORS[facing];
  const len = Math.sqrt(vec.dx * vec.dx + vec.dy * vec.dy);
  const nx = vec.dx / len;
  const ny = vec.dy / len;
  return {
    point: { x: Math.round(actorX + nx * distance), y: Math.round(actorY + ny * distance) },
    direction: OPPOSITE_DIR[facing],
  };
}

function getStandPointForTarget(
  deps: InputBridgeDeps,
  hit: { type: string; id: string },
  clickX: number,
  clickY: number,
  verb: VerbType
): StandInfo | null {
  if (hit.type === "object") {
    const obj = deps.roomManager.getAllObjects().find((o) => o.id === hit.id);
    const anchor = obj?.definition.interactionAnchors?.[verb];
    if (anchor) {
      return {
        point: anchor.point,
        direction: anchor.facing,
        interactDistance: anchor.interactDistance ?? obj?.definition.interactDistance,
        isExplicit: true,
      };
    }
    if (obj?.definition.standPoint) {
      return {
        point: obj.definition.standPoint,
        direction: obj.definition.approachDirection,
        interactDistance: obj.definition.interactDistance,
        isExplicit: true,
      };
    }
    const bounds = obj?.getBounds();
    if (bounds) {
      return {
        point: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
        direction: "N",
        interactDistance: obj?.definition.interactDistance,
        isExplicit: false,
      };
    }
  } else if (hit.type === "actor") {
    const actor = deps.roomManager.getAllActors().find((a) => a.id === hit.id);
    const anchor = actor?.definition.interactionAnchors?.[verb];
    if (anchor) {
      return {
        point: anchor.point,
        direction: anchor.facing,
        interactDistance: anchor.interactDistance ?? actor?.definition.interactDistance,
        isExplicit: true,
      };
    }
    if (actor?.definition.standPoint) {
      return {
        point: actor.definition.standPoint,
        direction: actor.definition.approachDirection,
        interactDistance: actor.definition.interactDistance,
        isExplicit: true,
      };
    }
    if (actor) {
      // Use definition.facing (authored value) — actor.facing is always set at
      // runtime (constructor default "S"), so only authored facing activates
      // the verb-aware front-approach; unset facing retains the old heuristic.
      if (actor.definition.facing && (verb === "talk" || verb === "use")) {
        const distance = verb === "talk" ? 70 : 40;
        const approach = standInFrontOf(actor.x, actor.y, actor.facing, distance);
        return {
          point: approach.point,
          direction: approach.direction,
          interactDistance: actor.definition.interactDistance,
          isExplicit: false,
        };
      }
      const offset = 40;
      const dx = clickX < actor.x ? -offset : offset;
      return {
        point: { x: actor.x + dx, y: actor.y },
        interactDistance: actor.definition.interactDistance,
        isExplicit: false,
      };
    }
  } else if (hit.type === "hotspot") {
    const hs = deps.roomManager.getAllHotspots().find((h) => h.id === hit.id);
    const def = hs ? (deps.roomManager.getCurrentRoom()?.hotspots ?? []).find((h) => h.id === hit.id) : null;
    const anchor = def?.interactionAnchors?.[verb];
    if (anchor) {
      return {
        point: anchor.point,
        direction: anchor.facing,
        interactDistance: anchor.interactDistance ?? def?.interactDistance,
        isExplicit: true,
      };
    }
    if (def?.standPoint) {
      return {
        point: def.standPoint,
        direction: def.approachDirection,
        interactDistance: def.interactDistance,
        isExplicit: true,
      };
    }
    if (hs) {
      const b = hs.getBounds();
      return {
        point: { x: b.x + b.width / 2, y: b.y + b.height },
        direction: "N",
        interactDistance: def?.interactDistance,
        isExplicit: false,
      };
    }
  } else if (hit.type === "exit") {
    const exit = deps.roomManager.getAllExits().find((e) => e.id === hit.id);
    if (exit) {
      const b = exit.getBounds();
      return { point: { x: b.x + b.width / 2, y: b.y + b.height / 2 }, isExplicit: false };
    }
  }
  return null;
}

function walkThenInteract(
  deps: InputBridgeDeps,
  iState: InputBridgeState,
  token: number,
  player: ActorInstance,
  hit: { type: string; id: string },
  action: GameAction,
  standInfo: StandInfo
): void {
  const approachDir = standInfo.direction;
  const effectiveDist = standInfo.interactDistance ?? 0;

  const onArrived = () => {
    if (approachDir) {
      player.facing = approachDir;
    } else {
      facePlayerToward(deps, hit);
    }
    if (hit.type === "actor") {
      const npc = deps.roomManager.getAllActors().find((a) => a.id === hit.id);
      if (npc?.definition.facePlayerOnInteract) {
        npc.updateFacingToward({ x: player.x, y: player.y });
      }
    }
    deps.verbSystem.dispatchAction(action).then((result) => {
      if (result.message) {
        if (action.verb === "look") {
          const p = deps.getPlayer();
          if (p) {
            deps.ui.showSpeechBubble(p.id, result.message, p.x, p.y, 4);
          } else {
            deps.ui.showMessage(result.message);
          }
        } else {
          deps.ui.showMessage(result.message);
        }
      }
    });
  };

  if (effectiveDist > 0) {
    const dx = player.x - standInfo.point.x;
    const dy = player.y - standInfo.point.y;
    if (Math.sqrt(dx * dx + dy * dy) <= effectiveDist) {
      player.stopMoving();
      onArrived();
      return;
    }
  }

  const room = deps.roomManager.getCurrentRoom()!;
  const reachable = player.moveTo(standInfo.point, room);
  if (!reachable) {
    deps.debugEventLog.log("room", `⚠ Stand point for "${hit.id}" unreachable; walking to nearest reachable point.`);
  }
  const checkArrival = () => {
    if (iState.interactionToken !== token) return;
    if (!player.isMoving()) {
      onArrived();
      return;
    }
    requestAnimationFrame(checkArrival);
  };
  requestAnimationFrame(checkArrival);
}

function facePlayerToward(deps: InputBridgeDeps, hit: { type: string; id: string }): void {
  const player = deps.getPlayer();
  if (!player) return;
  let targetX = player.x;
  let targetY = player.y;
  if (hit.type === "object") {
    const obj = deps.roomManager.getAllObjects().find((o) => o.id === hit.id);
    if (obj) { targetX = obj.x; targetY = obj.y; }
  } else if (hit.type === "actor") {
    const a = deps.roomManager.getAllActors().find((a) => a.id === hit.id);
    if (a) { targetX = a.x; targetY = a.y; }
  } else if (hit.type === "hotspot") {
    const hs = deps.roomManager.getAllHotspots().find((h) => h.id === hit.id);
    if (hs) { const b = hs.getBounds(); targetX = b.x + b.width / 2; targetY = b.y + b.height / 2; }
  } else if (hit.type === "exit") {
    const ex = deps.roomManager.getAllExits().find((e) => e.id === hit.id);
    if (ex) { const b = ex.getBounds(); targetX = b.x + b.width / 2; targetY = b.y + b.height / 2; }
  }
  if (targetX !== player.x || targetY !== player.y) {
    player.updateFacingToward({ x: targetX, y: targetY });
  }
}

/**
 * Right-click handler: cycles the active verb to the next one in the project's
 * verb list (Sierra/AGI/SCI right-click convention).
 *
 * If a dialogue bubble or message is displayed, right-click dismisses it
 * instead (same behaviour as left-click).
 */
function handleRightClick(deps: InputBridgeDeps, iState: InputBridgeState, _sx: number, _sy: number): void {
  // Dialogue lines advance on right-click too.
  if (deps.dialogueManager.isActive()) {
    if (deps.dialogueManager.canSkipCurrentLine()) {
      deps.dialogueManager.skipCurrentLine();
    }
    return;
  }
  if (deps.ui.hasActiveBubble()) {
    deps.ui.dismissBubble();
    return;
  }
  if (deps.ui.hasActiveMessage()) {
    deps.ui.dismissMessage();
    return;
  }

  // Guard verb cycling: block while input is locked (cutscene / scripted sequence).
  if (deps.input.locked) return;

  const verbs = deps.config.verbs as VerbType[];
  if (verbs.length <= 1) return;

  const current = deps.ui.getVerb();
  const idx = verbs.indexOf(current);
  const nextVerb = verbs[(idx < 0 ? 0 : idx + 1) % verbs.length];
  deps.ui.setVerb(nextVerb);

  // Immediately refresh the hover-label sentence so it shows the new verb
  refreshPendingActionSentence(deps, iState);
}

/**
 * Derives the most contextually-appropriate available verb for the given hit
 * type when the walk verb is the current selection (auto-verb promotion).
 *
 * This is a one-shot fallback: the returned verb is used for the single click
 * that triggered it and is NOT written back to UIManager state, so the player's
 * explicitly-selected verb is preserved for subsequent actions.
 *
 * Priority:
 *   actor   → talk (if available) → look (if available) → null
 *   object  → look (if available) → null      [affordance override happens earlier]
 *   hotspot → look (if available) → null
 *   exit    → open (if available) → null (walk fallback keeps room-transition path intact)
 *
 * Note: when "open" is promoted for an exit, the handleClick room-transition branch
 * accepts both "walk" and "open" on exits so the transition still fires correctly.
 */
function pickAutoVerb(hitType: string, projectVerbs: VerbType[]): VerbType | null {
  const has = (v: string): v is VerbType => projectVerbs.includes(v as VerbType);
  if (hitType === "actor")   return has("talk") ? "talk" : has("look") ? "look" : null;
  if (hitType === "object")  return has("look") ? "look" : null;
  if (hitType === "hotspot") return has("look") ? "look" : null;
  if (hitType === "exit")    return has("open") ? "open" : null;
  return null;
}

function handleClick(deps: InputBridgeDeps, iState: InputBridgeState, sx: number, sy: number): void {
  // Dialogue lines (incl. those shown as canvas bubbles) always advance on click.
  if (deps.dialogueManager.isActive()) {
    if (deps.dialogueManager.canSkipCurrentLine()) {
      deps.dialogueManager.skipCurrentLine();
    }
    return;
  }
  // Non-dialogue bubbles (e.g. sayBlocking) dismiss on click.
  if (deps.ui.hasActiveBubble()) {
    deps.ui.dismissBubble();
    return;
  }
  // Non-dialogue messages dismiss on click.
  if (deps.ui.hasActiveMessage()) {
    deps.ui.dismissMessage();
    return;
  }

  // Guard world interactions: block while input is locked (cutscene / scripted sequence).
  if (deps.input.locked) return;

  const token = ++iState.interactionToken;

  const worldPos = deps.camera.screenToWorld(sx, sy);
  const { x, y } = worldPos;
  const verb = deps.ui.getVerb();
  const selectedItem = deps.ui.getSelectedInventoryItem();

  const hit = deps.roomManager.getHitTarget(x, y);
  const player = deps.getPlayer();
  const playerId = player?.id ?? "player";

  if (deps.ui.getState().debugMode) {
    if (hit) {
      deps.ui.triggerHitFlash(hit.id, hit.type, x, y);
      deps.ui.setDebugInspectedEntity(hit.id);
      deps.debugEventLog.log("verb", `Click hit: ${hit.type} "${hit.id}" at (${Math.round(x)},${Math.round(y)})`);
    } else {
      deps.ui.triggerHitFlashMiss(x, y);
      deps.ui.setDebugInspectedEntity(null);
      deps.debugEventLog.log("verb", `Click miss at (${Math.round(x)},${Math.round(y)})`);
    }
  }

  if (hit) {
    let effectiveVerb = verb;
    // 1. Object affordance override (existing): object has an explicit affordance verb
    if (hit.type === "object" && hit.affordance && hit.affordance !== "none" && verb === "walk") {
      effectiveVerb = hit.affordance as VerbType;
    }
    // 2. Smart auto-verb (new): when walk is still the effective verb, promote to the
    //    most contextually appropriate available verb for the target type.
    //    This does NOT persist to UIManager — it is a one-shot click inference only.
    if (effectiveVerb === "walk") {
      const auto = pickAutoVerb(hit.type, deps.config.verbs as VerbType[]);
      if (auto) effectiveVerb = auto;
    }
    const action = buildGameAction(deps, hit, effectiveVerb, playerId, selectedItem);
    const sentence = deps.verbSystem.actionResolver.formatSentence(action);

    deps.debugEventLog.log("verb", `Action: ${sentence}`);
    if (selectedItem && effectiveVerb === "use") {
      deps.ui.selectInventoryItem(null);
    }

    if ((effectiveVerb === "walk" || effectiveVerb === "open") && hit.type === "exit" && player) {
      deps.verbSystem.dispatchAction(action).then((result) => {
        if (result.message) deps.ui.showMessage(result.message);
        if (result.handled) {
          const exit = deps.roomManager.getAllExits().find((e) => e.id === hit.id);
          if (exit) {
            const bounds = exit.getBounds();
            const targetX = bounds.x + bounds.width / 2;
            const targetY = bounds.y + bounds.height / 2;
            const room = deps.roomManager.getCurrentRoom()!;
            const reachable = player.moveTo({ x: targetX, y: targetY }, room);
            if (!reachable) {
              deps.debugEventLog.log("room", `⚠ Path to exit "${exit.id}" is unreachable; walking to nearest reachable point.`);
            }
            const checkArrival = () => {
              if (iState.interactionToken !== token) return;
              if (!player.isMoving()) {
                if (reachable) {
                  deps.loadRoom(exit.targetRoomId, exit.targetSpawnPointId);
                }
                return;
              }
              requestAnimationFrame(checkArrival);
            };
            requestAnimationFrame(checkArrival);
          }
        }
      });
    } else if (effectiveVerb === "walk" && player && (hit.type === "object" || hit.type === "actor" || hit.type === "hotspot")) {
      deps.verbSystem.dispatchAction(action).then((result) => {
        if (result.message) deps.ui.showMessage(result.message);
      });
      const standInfo = getStandPointForTarget(deps, hit, x, y, effectiveVerb);
      const walkTarget = standInfo?.point ?? { x, y };
      const room = deps.roomManager.getCurrentRoom()!;
      const reachable = player.moveTo(walkTarget, room);
      if (!reachable) {
        deps.debugEventLog.log("room", `⚠ Walk target for "${hit.id}" unreachable; walking to nearest reachable point.`);
      }
      const approachDir = standInfo?.direction;
      const checkArrival = () => {
        if (iState.interactionToken !== token) return;
        if (!player.isMoving()) {
          if (approachDir) {
            player.facing = approachDir;
          } else {
            facePlayerToward(deps, hit);
          }
          return;
        }
        requestAnimationFrame(checkArrival);
      };
      requestAnimationFrame(checkArrival);
    } else if (effectiveVerb === "walk") {
      deps.verbSystem.dispatchAction(action).then((result) => {
        if (result.message) deps.ui.showMessage(result.message);
      });
      if (player) {
        const room = deps.roomManager.getCurrentRoom()!;
        const reachable = player.moveTo({ x, y }, room);
        if (!reachable) {
          deps.debugEventLog.log("room", `⚠ Walk target unreachable; walking to nearest reachable point.`);
        }
      }
    } else if (effectiveVerb === "look" && player && (hit.type === "object" || hit.type === "actor" || hit.type === "hotspot")) {
      const standInfo = getStandPointForTarget(deps, hit, x, y, effectiveVerb);
      if (standInfo?.isExplicit) {
        walkThenInteract(deps, iState, token, player, hit, action, standInfo);
      } else {
        facePlayerToward(deps, hit);
        deps.verbSystem.dispatchAction(action).then((result) => {
          if (result.message) {
            const p = deps.getPlayer();
            if (p) {
              deps.ui.showSpeechBubble(p.id, result.message, p.x, p.y, 4);
            } else {
              deps.ui.showMessage(result.message);
            }
          }
        });
      }
    } else if (player && (hit.type === "object" || hit.type === "actor" || hit.type === "hotspot")) {
      const standInfo = getStandPointForTarget(deps, hit, x, y, effectiveVerb);
      if (standInfo) {
        walkThenInteract(deps, iState, token, player, hit, action, standInfo);
      } else {
        facePlayerToward(deps, hit);
        deps.verbSystem.dispatchAction(action).then((result) => {
          if (result.message) deps.ui.showMessage(result.message);
        });
      }
    } else {
      deps.verbSystem.dispatchAction(action).then((result) => {
        if (result.message) deps.ui.showMessage(result.message);
      });
    }
  } else {
    if (verb === "walk" && player) {
      const room = deps.roomManager.getCurrentRoom()!;
      player.moveTo({ x, y }, room);
      deps.ui.selectInventoryItem(null);
    }
  }
}

function handleMouseMove(deps: InputBridgeDeps, iState: InputBridgeState, sx: number, sy: number): void {
  const worldPos = deps.camera.screenToWorld(sx, sy);
  const hit = deps.roomManager.getHitTarget(worldPos.x, worldPos.y);
  if (deps.ui.getState().debugMode) {
    deps.ui.setDebugInteractionTarget(hit?.id ?? null);
  }
  iState.lastHitTarget = hit;
  if (hit) {
    const resolver = deps.verbSystem.actionResolver;
    const displayName = resolver.resolveTargetName(hit.id, hit.type as TargetType);
    deps.ui.setHoverTarget(displayName);
    refreshPendingActionSentence(deps, iState);
  } else {
    deps.ui.setHoverTarget(null);
    deps.ui.setPendingActionSentence("");
  }

  const room = deps.roomManager.getCurrentRoom();
  const isWalkable = room
    ? !!findWalkboxForPoint(worldPos, room)
    : false;

  const player = deps.getPlayer();
  if (deps.ui.getState().debugMode && deps.ui.getOverlayFlags().paths && player && room) {
    const start = { x: player.x, y: player.y };
    iState.pathPreviewWaypoints = computeWaypointPath(start, worldPos, room);
  } else {
    iState.pathPreviewWaypoints = [];
  }

  iState.lastWorldX = worldPos.x;
  iState.lastWorldY = worldPos.y;
  updateCursor(deps, iState, hit?.type ?? null, isWalkable);
}

function refreshPendingActionSentence(deps: InputBridgeDeps, iState: InputBridgeState): void {
  if (!iState.lastHitTarget) return;
  const resolver = deps.verbSystem.actionResolver;
  const verb = deps.ui.getVerb();
  const selectedItem = deps.ui.getSelectedInventoryItem();
  iState.lastSentenceVerb = verb;
  iState.lastSentenceItem = selectedItem;
  const playerId = deps.getPlayer()?.id ?? "player";
  const action = buildGameAction(
    deps,
    iState.lastHitTarget,
    verb,
    playerId,
    selectedItem
  );
  deps.ui.setPendingActionSentence(resolver.formatSentence(action));
}

export function checkSentenceStale(deps: InputBridgeDeps, iState: InputBridgeState): void {
  if (!iState.lastHitTarget) return;
  const verb = deps.ui.getVerb();
  const selectedItem = deps.ui.getSelectedInventoryItem();
  if (verb !== iState.lastSentenceVerb || selectedItem !== iState.lastSentenceItem) {
    refreshPendingActionSentence(deps, iState);
  }
}

/**
 * Resolves and applies the correct CSS cursor to the canvas element.
 *
 * Priority order (highest wins):
 *   1. BUSY    — engine is in a cutscene (`getIsBusy()` returns true).
 *                Shows `cursorConfig.busyCursor` (default: "wait").
 *   2. INVALID — a recent invalid-action signal is active (UIManager).
 *                Shows `cursorConfig.invalidCursor` (default: "not-allowed").
 *                Active for ~500 ms after a failed action.
 *   3. CARRY   — an inventory item is selected for a "use X with Y" action.
 *                Shows `cursorConfig.inventoryItemCursor` (default: "grabbing").
 *   4. CONTEXT — hover target provides a specific cursor:
 *                  - exit → active verb cursor (or "alias" if none set)
 *                  - actor / hotspot with cursorOverride → that override
 *                  - actor / hotspot → active verb cursor (or "pointer" fallback)
 *                  - object with `cursorOverride` → that override
 *                  - object with affordance → verbCursors[affordance] → VERB_CSS_CURSORS[affordance]
 *   5. VERB    — active verb cursor from config (resolution order):
 *                  cursorConfig.verbCursors > verbCursors > VERB_CSS_CURSORS
 *                  Custom image URLs use hotspotX/Y as the cursor hotspot.
 *   6. DEFAULT — idle / no hover. Shows `cursorConfig.defaultCursor`
 *                (default: "default").
 *
 * The early-return de-duplication guard is intentionally bypassed for BUSY
 * and INVALID so time-based states always re-evaluate.
 */
export function updateCursor(deps: InputBridgeDeps, iState: InputBridgeState, hitType: string | null, isWalkable?: boolean): void {
  const verb = deps.ui.getVerb();
  const walkable = isWalkable ?? iState.lastCursorWalkable;
  const currentObjectId = (hitType === "object" && iState.lastHitTarget) ? iState.lastHitTarget.id : null;

  const isBusy = deps.getIsBusy?.() ?? false;
  const isInvalid = deps.ui.isInvalidFeedbackActive();
  const selectedInventoryItem = deps.ui.getSelectedInventoryItem();
  const currentTargetId = iState.lastHitTarget?.id ?? null;

  if (
    !isBusy &&
    !isInvalid &&
    hitType === iState.lastHitType &&
    verb === iState.lastCursorVerb &&
    walkable === iState.lastCursorWalkable &&
    currentObjectId === iState.lastCursorObjectId &&
    currentTargetId === iState.lastCursorTargetId &&
    selectedInventoryItem === iState.lastCursorInventoryItem
  ) return;

  iState.lastHitType = hitType;
  iState.lastCursorVerb = verb;
  iState.lastCursorWalkable = walkable;
  iState.lastCursorObjectId = currentObjectId;
  iState.lastCursorTargetId = currentTargetId;
  iState.lastCursorInventoryItem = selectedInventoryItem;

  const canvas = deps.ctx.canvas;
  const cc = deps.config.cursorConfig;
  const busyCursor = cc?.busyCursor ?? DEFAULT_CURSOR_CONFIG.busyCursor;
  const invalidCursor = cc?.invalidCursor ?? DEFAULT_CURSOR_CONFIG.invalidCursor;
  const defaultCursor = cc?.defaultCursor ?? DEFAULT_CURSOR_CONFIG.defaultCursor;
  const inventoryItemCursor = cc?.inventoryItemCursor ?? DEFAULT_CURSOR_CONFIG.inventoryItemCursor;
  const hotspotX = cc?.hotspotX ?? DEFAULT_CURSOR_CONFIG.hotspotX;
  const hotspotY = cc?.hotspotY ?? DEFAULT_CURSOR_CONFIG.hotspotY;

  const resolvedVerbCursors = cc?.verbCursors ?? deps.config.verbCursors;
  const cssFallback = VERB_CSS_CURSORS[verb] ?? "default";
  const verbCursorValue = resolvedVerbCursors?.[verb];
  const verbCursor = resolveVerbCursor(verbCursorValue, cssFallback, hotspotX, hotspotY);

  if (isBusy) {
    canvas.style.cursor = busyCursor;
    return;
  }

  if (isInvalid) {
    canvas.style.cursor = invalidCursor;
    return;
  }

  if (selectedInventoryItem) {
    canvas.style.cursor = inventoryItemCursor;
    return;
  }

  if (hitType === "object") {
    const cursorOverride = getObjectCursorOverride(iState, cc?.verbCursors ?? deps.config.verbCursors, hotspotX, hotspotY);
    canvas.style.cursor = cursorOverride ?? verbCursor;
  } else if (hitType === "actor" || hitType === "hotspot") {
    const hitTarget = iState.lastHitTarget;
    if (hitTarget?.cursorOverride) {
      canvas.style.cursor = hitTarget.cursorOverride;
    } else {
      canvas.style.cursor = verbCursor;
    }
  } else if (hitType === "exit") {
    canvas.style.cursor = verbCursor;
  } else if (walkable) {
    canvas.style.cursor = verbCursor;
  } else {
    canvas.style.cursor = defaultCursor;
  }
}

/**
 * Resolves a verb cursor map value into a valid CSS cursor string.
 *
 * Values that look like image URLs (start with "http", "https", "data:",
 * or contain "/" or ".") are wrapped in the `url(...)` syntax with the
 * provided hotspot offsets. Plain CSS cursor keywords ("pointer", "crosshair",
 * "grab", etc.) are used directly, so projects that configure CSS-string verb
 * cursors without image assets work correctly.
 */
function resolveVerbCursor(
  value: string | undefined,
  cssFallback: string,
  hotspotX: number,
  hotspotY: number
): string {
  if (!value) return cssFallback;
  if (isCursorImageUrl(value)) {
    return `url(${value}) ${hotspotX} ${hotspotY}, ${cssFallback}`;
  }
  return value;
}

/**
 * Returns true if `value` looks like a URL or relative image path that should
 * be wrapped in `url(...)` for the CSS cursor property. Returns false for
 * plain CSS cursor keywords like "pointer", "crosshair", "grab", etc.
 */
function isCursorImageUrl(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.includes("/") ||
    value.includes(".")
  );
}

function getObjectCursorOverride(
  iState: InputBridgeState,
  verbCursors: Record<string, string> | undefined,
  hotspotX: number,
  hotspotY: number
): string | null {
  if (!iState.lastHitTarget || iState.lastHitTarget.type !== "object") return null;
  if (iState.lastHitTarget.cursorOverride) return iState.lastHitTarget.cursorOverride;
  const affordance = iState.lastHitTarget.affordance;
  if (affordance && affordance !== "none") {
    const affordanceCssFallback = VERB_CSS_CURSORS[affordance] ?? "pointer";
    const affordanceCursorValue = verbCursors?.[affordance];
    return resolveVerbCursor(affordanceCursorValue, affordanceCssFallback, hotspotX, hotspotY);
  }
  return null;
}

function handleKey(deps: InputBridgeDeps, _iState: InputBridgeState, key: string): void {
  if (key === "F1") {
    deps.ui.toggleDebug();
  }
  if (key === "F5") {
    deps.quickSave();
  }
  if (key === "F9") {
    deps.quickLoad();
  }
  if (deps.ui.getState().debugMode) {
    const num = parseInt(key, 10);
    if (num >= 1 && num <= 9) {
      const flag = getOverlayFlagByIndex(num - 1);
      if (flag) deps.ui.toggleOverlayFlag(flag);
    }
  }
}
