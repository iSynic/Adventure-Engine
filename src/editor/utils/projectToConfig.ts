import type { GameConfig, RoomDefinition, WalkboxDefinition, HotspotDefinition, ActorDefinition, ObjectDefinition, ItemDefinition, DialogueTree, DialogueNode } from "../../engine/core/types";
import type { EditorProject, EditorScript, EditorRoomDefinition, EditorDialogueTree, EditorActorDefinition, EditorObjectDefinition } from "../types";
import type { ScriptHandlerFn } from "../../engine/scripting/ScriptRunner";
import { compileVisualScript } from "../../engine/scripting/VisualScriptInterpreter";
import { validateProject as runValidation } from "../../shared/validateProject";
import type { ValidationResult } from "../../shared/exportSchema";
import { resolveAssetUrl } from "./projectStorage";

/**
 * Converts an EditorProject into a GameConfig suitable for the runtime engine.
 *
 * IMPORTANT: Every field that crosses into GameConfig is listed explicitly.
 * Do NOT use object spread (...room, ...actor, etc.) to avoid leaking
 * editor-only fields (shapeLocked, nodePositions, etc.) into the runtime.
 */
export function validateProjectForExport(project: EditorProject): ValidationResult {
  const validatable = {
    ...project,
    scripts: project.scripts.map((s) => ({ name: s.name, body: s.body, steps: s.steps })),
  };
  return runValidation(validatable);
}

export function projectToConfig(project: EditorProject, opts?: { skipValidation?: boolean }): {
  config: GameConfig;
  scripts: Record<string, ScriptHandlerFn>;
} {
  if (!opts?.skipValidation) {
    const result = validateProjectForExport(project);
    const criticalErrors = result.errors.filter((e) => e.severity === "error");
    if (criticalErrors.length > 0) {
      const summary = criticalErrors.slice(0, 10).map((e) => e.message).join("\n");
      const suffix = criticalErrors.length > 10 ? `\n…and ${criticalErrors.length - 10} more error(s).` : "";
      throw new Error(`Export blocked by ${criticalErrors.length} validation error(s):\n${summary}${suffix}`);
    }
  }

  const assetMap = new Map(
    project.assets.map((a) => [a.id, resolveAssetUrl(project.id, a.id, a.dataUrl)])
  );

  function resolveAsset(pathOrId: string | undefined): string {
    if (!pathOrId) return "";
    if (assetMap.has(pathOrId)) return assetMap.get(pathOrId)!;
    return pathOrId;
  }

  const verbCursors = project.verbCursors
    ? Object.fromEntries(
        Object.entries(project.verbCursors)
          .map(([verb, assetId]) => [verb, resolveAsset(assetId)])
          .filter(([, url]) => url)
      )
    : undefined;

  const cursorConfig = project.cursorConfig
    ? {
        ...project.cursorConfig,
        verbCursors: project.cursorConfig.verbCursors
          ? Object.fromEntries(
              Object.entries(project.cursorConfig.verbCursors)
                .map(([verb, assetId]) => [verb, resolveAsset(assetId)])
                .filter(([, url]) => url)
            )
          : undefined,
      }
    : undefined;

  const config: GameConfig = {
    id: project.id,
    title: project.title,
    startingRoom: project.startingRoom,
    assetRoot: "",
    defaultPlayerActorId: project.defaultPlayerActorId,
    defaultPlayerPosition: project.defaultPlayerPosition,
    startingItems: project.startingItems,
    verbs: project.verbs,
    uiSettings: project.uiSettings,
    dialogueTrees: project.dialogueTrees
      ? project.dialogueTrees.map(stripDialogueTreeEditorFields)
      : [],
    verbCursors,
    rooms: project.rooms.map((room) => stripRoomEditorFields(room, resolveAsset, project)),
    actors: project.actors.map((actor) => mapActorFields(actor, resolveAsset)),
    objects: project.objects.map((obj) => mapObjectFields(obj, resolveAsset)),
    items: project.items.map((item) => mapItemFields(item, resolveAsset)),
    variableDefinitions: project.variableDefinitions?.map((v) => ({
      name: v.name,
      type: v.type,
      description: v.description,
      defaultValue: v.defaultValue,
      min: v.min,
      max: v.max,
      scope: v.scope,
      roomId: v.roomId,
    })),
    stateWatchers: project.stateWatchers?.map((w) => ({
      id: w.id,
      condition: w.condition,
      scriptId: w.scriptId,
      once: w.once,
    })),
    globalFallbackScriptId: project.globalFallbackScriptId,
    display: project.display,
    overlayConfig: project.overlayConfig ? resolveOverlayConfigForExport(project, resolveAsset) : undefined,
    cursorConfig,
  };

  const compiledScripts: Record<string, ScriptHandlerFn> = {};
  for (const script of project.scripts) {
    try {
      if (script.kind === "visual" && script.steps) {
        compiledScripts[script.name] = compileVisualScript(script.steps);
      } else {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction("ctx", script.body) as ScriptHandlerFn;
        compiledScripts[script.name] = fn;
      }
    } catch (e) {
      console.error(`[Editor] Failed to compile script "${script.name}":`, e);
    }
  }

  return { config, scripts: compiledScripts };
}

function collectRoomAssetIds(room: EditorRoomDefinition, project: EditorProject): string[] {
  const ids: string[] = [];
  if (room.backgroundPath) ids.push(room.backgroundPath);
  if (room.maskPath) ids.push(room.maskPath);
  if (room.parallaxLayers) {
    for (const layer of room.parallaxLayers) {
      if (layer.imagePath) ids.push(layer.imagePath);
    }
  }
  if (room.ambientAudioPath) ids.push(room.ambientAudioPath);
  if (room.sceneProps) {
    for (const prop of room.sceneProps) {
      if (prop.assetPath) ids.push(prop.assetPath);
    }
  }
  const objectIds = room.objectIds ?? [];
  for (const objId of objectIds) {
    const obj = project.objects.find((o) => o.id === objId);
    if (!obj) continue;
    if (obj.spritePath) ids.push(obj.spritePath);
    if (obj.stateSprites) {
      for (const entry of obj.stateSprites) {
        ids.push(entry.spritePath);
      }
    }
  }
  const actorIds = room.actorIds ?? [];
  for (const actorId of actorIds) {
    const actor = project.actors.find((a) => a.id === actorId);
    if (!actor) continue;
    if (actor.spritePath) ids.push(actor.spritePath);
    if (actor.animations) {
      for (const dir of Object.keys(actor.animations)) {
        const dirAnims = actor.animations[dir];
        for (const state of Object.keys(dirAnims)) {
          const anim = dirAnims[state as keyof typeof dirAnims];
          if (anim?.frames) {
            for (const frame of anim.frames) {
              if (frame.imagePath) ids.push(frame.imagePath);
            }
          }
        }
      }
    }
  }
  return [...new Set(ids)];
}

function stripRoomEditorFields(
  room: EditorRoomDefinition,
  resolveAsset: (p: string | undefined) => string,
  project: EditorProject
): RoomDefinition {
  const assetIds = collectRoomAssetIds(room, project);
  const assetManifest = assetIds.map((id) => resolveAsset(id)).filter(Boolean);

  return {
    id: room.id,
    name: room.name,
    backgroundPath: resolveAsset(room.backgroundPath),
    maskPath: room.maskPath ? resolveAsset(room.maskPath) : undefined,
    width: room.width,
    height: room.height,
    parallaxLayers: room.parallaxLayers?.map((layer) => ({
      imagePath: resolveAsset(layer.imagePath),
      scrollFactor: layer.scrollFactor,
    })),
    walkboxes: room.walkboxes.map((wb): WalkboxDefinition => ({
      id: wb.id,
      polygon: wb.polygon,
      adjacentIds: wb.adjacentIds,
      scale: wb.scale,
      speedModifier: wb.speedModifier,
      // shapeLocked is editor-only — intentionally excluded
    })),
    exits: room.exits,
    objectIds: room.objectIds,
    hotspots: room.hotspots?.map((hs): HotspotDefinition => ({
      id: hs.id,
      name: hs.name,
      roomId: hs.roomId,
      bounds: hs.bounds,
      polygon: hs.polygon,
      description: hs.description,
      verbHandlers: hs.verbHandlers,
      useWithHandlers: hs.useWithHandlers,
      fallbackScriptId: hs.fallbackScriptId,
      zLayer: hs.zLayer,
      standPoint: hs.standPoint,
      approachDirection: hs.approachDirection,
      interactionAnchors: hs.interactionAnchors,
      interactDistance: hs.interactDistance,
      visibilityCondition: hs.visibilityCondition,
      interactionCondition: hs.interactionCondition,
      // shapeLocked is editor-only — intentionally excluded
    })),
    actorIds: room.actorIds,
    spawnPoints: room.spawnPoints,
    ambientAudioPath: room.ambientAudioPath,
    onEnter: room.onEnter,
    onExit: room.onExit,
    onUpdate: room.onUpdate,
    transitionEffect: room.transitionEffect,
    effects: room.effects,
    sceneProps: room.sceneProps?.map((prop) => ({
      ...prop,
      assetPath: prop.assetPath ? resolveAsset(prop.assetPath) : undefined,
    })),
    assetManifest: assetManifest.length > 0 ? assetManifest : undefined,
  };
}

function stripDialogueTreeEditorFields(tree: EditorDialogueTree): DialogueTree {
  return {
    id: tree.id,
    name: tree.name,
    actorId: tree.actorId,
    startNodeId: tree.startNodeId,
    onStartFlag: tree.onStartFlag,
    onEndFlag: tree.onEndFlag,
    nodes: tree.nodes.map((node): DialogueNode => ({
      id: node.id,
      speaker: node.speaker,
      text: node.text,
      branches: node.branches,
      actions: node.actions,
      condition: node.condition,
      once: node.once,
      portrait: node.portrait,
    })),
  };
}

function mapActorFields(
  actor: EditorActorDefinition,
  resolveAsset: (p: string | undefined) => string
): ActorDefinition {
  return {
    id: actor.id,
    name: actor.name,
    defaultRoomId: actor.defaultRoomId,
    position: actor.position,
    facing: actor.facing,
    visible: actor.visible,
    scale: actor.scale,
    movementSpeed: actor.movementSpeed,
    spritePath: resolveAsset(actor.spritePath),
    spriteWidth: actor.spriteWidth,
    spriteHeight: actor.spriteHeight,
    animations: actor.animations
      ? Object.fromEntries(
          Object.entries(actor.animations).map(([dir, states]) => [
            dir,
            Object.fromEntries(
              Object.entries(states).map(([state, anim]) => [
                state,
                anim
                  ? { ...anim, frames: anim.frames.map((f) => ({ ...f, imagePath: resolveAsset(f.imagePath) })) }
                  : anim,
              ])
            ),
          ])
        )
      : undefined,
    isPlayer: actor.isPlayer,
    verbHandlers: actor.verbHandlers,
    useWithHandlers: actor.useWithHandlers,
    fallbackScriptId: actor.fallbackScriptId,
    dialogueId: actor.dialogueId,
    standPoint: actor.standPoint,
    approachDirection: actor.approachDirection,
    interactionAnchors: actor.interactionAnchors,
    interactDistance: actor.interactDistance,
    facePlayerOnInteract: actor.facePlayerOnInteract,
    portraitPath: actor.portraitPath ? resolveAsset(actor.portraitPath) : undefined,
  };
}

function mapObjectFields(
  obj: EditorObjectDefinition,
  resolveAsset: (p: string | undefined) => string
): ObjectDefinition {
  return {
    id: obj.id,
    name: obj.name,
    roomId: obj.roomId,
    position: obj.position,
    spritePath: resolveAsset(obj.spritePath),
    spriteWidth: obj.spriteWidth,
    spriteHeight: obj.spriteHeight,
    bounds: obj.bounds,
    visible: obj.visible,
    enabled: obj.enabled,
    pickupable: obj.pickupable,
    description: obj.description,
    state: obj.state,
    stateSprites: obj.stateSprites?.map((entry) => ({
      stateKey: entry.stateKey,
      stateValue: entry.stateValue,
      spritePath: resolveAsset(entry.spritePath),
      bounds: entry.bounds,
      fps: entry.fps,
      frameCount: entry.frameCount,
      atlasRect: entry.atlasRect,
    })),
    verbHandlers: obj.verbHandlers,
    useWithHandlers: obj.useWithHandlers,
    fallbackScriptId: obj.fallbackScriptId,
    zOffset: obj.zOffset,
    zLayer: obj.zLayer,
    interactionAnimation: obj.interactionAnimation,
    standPoint: obj.standPoint,
    approachDirection: obj.approachDirection,
    interactionAnchors: obj.interactionAnchors,
    interactDistance: obj.interactDistance,
    visibilityCondition: obj.visibilityCondition,
    interactionCondition: obj.interactionCondition,
    tags: obj.tags,
    primaryState: obj.primaryState,
    interactionHotspot: obj.interactionHotspot,
    cursorOverride: obj.cursorOverride,
    affordance: obj.affordance,
  };
}

function resolveOverlayConfigForExport(
  project: EditorProject,
  resolveAsset: (p: string | undefined) => string
): EditorProject["overlayConfig"] | undefined {
  if (!project.overlayConfig) return undefined;
  const oc = { ...project.overlayConfig };
  if (oc.verbBar?.buttons) {
    oc.verbBar = {
      ...oc.verbBar,
      buttons: oc.verbBar.buttons.map((b) => ({
        ...b,
        imagePath: b.imagePath ? resolveAsset(b.imagePath) : undefined,
      })),
    };
  }
  return oc;
}

function mapItemFields(
  item: ItemDefinition,
  resolveAsset: (p: string | undefined) => string
): ItemDefinition {
  return {
    id: item.id,
    name: item.name,
    iconPath: resolveAsset(item.iconPath),
    description: item.description,
    ownerId: item.ownerId,
    verbHandlers: item.verbHandlers,
    useWithHandlers: item.useWithHandlers,
    fallbackScriptId: item.fallbackScriptId,
  };
}
