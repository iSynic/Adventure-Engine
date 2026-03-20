import { useState } from "react";
import type { EditorProject, EditorAction, EditorActorDefinition } from "../types";
import type { Direction, VerbType } from "../../engine/core/types";
import ScriptPicker from "./ScriptPicker";
import UseWithSection from "./UseWithSection";
import InteractionResolution from "./InteractionResolution";
import TutorialBubble from "./TutorialBubble";
import InteractionAnchorsSection from "./InteractionAnchorsSection";
import { resolveAssetUrl } from "../utils/projectStorage";

export default function ActorInspector({ actor, project, dispatch }: { actor: EditorActorDefinition; project: EditorProject; dispatch: (a: EditorAction) => void }) {
  function updateActor(updates: Partial<EditorActorDefinition>) {
    dispatch({ type: "UPDATE_ACTOR", actorId: actor.id, updates });
  }

  const imageAssets = project.assets.filter((a) => a.type !== "audio");
  const spriteAssets = imageAssets.filter((a) => a.type === "sprite");
  const otherImageAssets = imageAssets.filter((a) => a.type !== "sprite");
  const currentSpriteAsset = actor.spritePath
    ? project.assets.find((a) => a.id === actor.spritePath)
    : null;

  return (
    <div className="entity-detail">
      <div className="panel-header"><span>Actor Details</span></div>
      <div className="entity-detail-fields">
        <div className="inspector-section">
          <label className="inspector-label">Name</label>
          <input
            className="ed-input ed-input-sm"
            value={actor.name}
            onChange={(e) => updateActor({ name: e.target.value })}
          />
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Sprite</label>
          <TutorialBubble
            title="Actor Sprite"
            description="Choose a sprite image for this actor from the asset library. Sprites are listed first, followed by other image types. A thumbnail preview shows the selected image."
            preferSide="right"
          >
            <div className="bg-picker-row">
              {currentSpriteAsset && (
                <img src={resolveAssetUrl(project.id, currentSpriteAsset.id, currentSpriteAsset.dataUrl)} alt="Sprite" className="bg-picker-thumb" />
              )}
              <select
                className="ed-input ed-input-sm bg-picker-select"
                value={actor.spritePath ?? ""}
                onChange={(e) => updateActor({ spritePath: e.target.value || undefined })}
              >
                <option value="">-- None --</option>
                {spriteAssets.length > 0 && (
                  <optgroup label="Sprites">
                    {spriteAssets.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </optgroup>
                )}
                {otherImageAssets.length > 0 && (
                  <optgroup label="Other Images">
                    {otherImageAssets.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </TutorialBubble>
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Starting Room</label>
          <select
            className="ed-input ed-input-sm"
            value={actor.defaultRoomId ?? ""}
            onChange={(e) => updateActor({ defaultRoomId: e.target.value || undefined })}
          >
            <option value="">-- None --</option>
            {project.rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Position</label>
          <div className="detail-row-pair">
            <label className="detail-label-sm">
              X
              <input
                className="ed-input ed-input-sm"
                type="number"
                value={actor.position?.x ?? 0}
                onChange={(e) => updateActor({ position: { x: parseInt(e.target.value) || 0, y: actor.position?.y ?? 0 } })}
              />
            </label>
            <label className="detail-label-sm">
              Y
              <input
                className="ed-input ed-input-sm"
                type="number"
                value={actor.position?.y ?? 0}
                onChange={(e) => updateActor({ position: { x: actor.position?.x ?? 0, y: parseInt(e.target.value) || 0 } })}
              />
            </label>
          </div>
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Sprite Size</label>
          <div className="inspector-hint">
            Width and height of a single frame in the sprite sheet (pixels).
          </div>
          <div className="detail-row-pair">
            <label className="detail-label-sm">
              W
              <input
                className="ed-input ed-input-sm"
                type="number"
                min={1}
                value={actor.spriteWidth ?? 48}
                onChange={(e) => updateActor({ spriteWidth: parseInt(e.target.value) || 48 })}
              />
            </label>
            <label className="detail-label-sm">
              H
              <input
                className="ed-input ed-input-sm"
                type="number"
                min={1}
                value={actor.spriteHeight ?? 96}
                onChange={(e) => updateActor({ spriteHeight: parseInt(e.target.value) || 96 })}
              />
            </label>
          </div>
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Scale</label>
          <input
            className="ed-input ed-input-sm"
            type="number"
            min={0.1}
            max={5}
            step={0.1}
            value={actor.scale ?? 1}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) updateActor({ scale: Math.max(0.1, Math.min(5, v)) });
            }}
          />
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Movement Speed</label>
          <div className="inspector-hint">
            Pixels per second when walking. Default is 120.
          </div>
          <input
            className="ed-input ed-input-sm"
            type="number"
            min={10}
            max={500}
            step={10}
            value={actor.movementSpeed ?? 120}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v)) updateActor({ movementSpeed: v });
            }}
          />
        </div>

        <div className="inspector-section">
          <TutorialBubble title="Player Character" description="The player character is controlled by mouse clicks and verb interactions. Only one actor should have this enabled — if multiple actors are marked, only one will be used." preferSide="right">
            <label className="inspector-label">
              <input
                type="checkbox"
                checked={actor.isPlayer ?? false}
                onChange={(e) => updateActor({ isPlayer: e.target.checked })}
                style={{ marginRight: 6 }}
              />
              Is Player Character
            </label>
          </TutorialBubble>
          <div className="inspector-hint">
            The player character is controlled by mouse clicks and verb interactions. Only one actor should have this enabled.
          </div>
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Stand Point</label>
          <div className="inspector-hint">
            Where the player walks to before interacting with this actor. Leave blank to auto-compute.
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              className="ed-input ed-input-sm"
              type="number"
              placeholder="X"
              value={actor.standPoint?.x ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  updateActor({ standPoint: undefined });
                } else {
                  updateActor({ standPoint: { x: Number(val), y: actor.standPoint?.y ?? 0 } });
                }
              }}
              style={{ width: 64 }}
            />
            <input
              className="ed-input ed-input-sm"
              type="number"
              placeholder="Y"
              value={actor.standPoint?.y ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  updateActor({ standPoint: undefined });
                } else {
                  updateActor({ standPoint: { x: actor.standPoint?.x ?? 0, y: Number(val) } });
                }
              }}
              style={{ width: 64 }}
            />
          </div>
        </div>

        <div className="inspector-section">
          <label className="inspector-label">Approach Direction</label>
          <select
            className="ed-input ed-input-sm"
            value={actor.approachDirection ?? ""}
            onChange={(e) =>
              updateActor({
                approachDirection: (e.target.value || undefined) as Direction | undefined,
              })
            }
          >
            <option value="">-- Auto --</option>
            {(["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as Direction[]).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <div className="inspector-hint">
            Direction the player faces after arriving at the stand point.
          </div>
        </div>

        <InteractionAnchorsSection
          anchors={actor.interactionAnchors ?? {}}
          interactDistance={actor.interactDistance}
          facePlayerOnInteract={actor.facePlayerOnInteract}
          showFacePlayer
          onChange={(a) => updateActor({ interactionAnchors: Object.keys(a).length > 0 ? a : undefined })}
          onChangeDistance={(v) => updateActor({ interactDistance: v })}
          onChangeFacePlayer={(v) => updateActor({ facePlayerOnInteract: v || undefined })}
        />

        <ActorVerbHandlers actor={actor} updateActor={updateActor} />
      </div>
    </div>
  );
}

function ActorVerbHandlers({ actor, updateActor }: { actor: EditorActorDefinition; updateActor: (u: Partial<EditorActorDefinition>) => void }) {
  const ACTOR_VERB_OPTIONS: VerbType[] = ["look", "open", "close", "use", "talk", "push", "pull", "give"];
  const handlers = actor.verbHandlers ?? {};
  const usedVerbs = Object.keys(handlers) as VerbType[];
  const availableVerbs = ACTOR_VERB_OPTIONS.filter((v) => !usedVerbs.includes(v));
  const [newVerb, setNewVerb] = useState<VerbType>(availableVerbs[0] ?? "look");
  const hasUseVerb = "use" in handlers;

  function addHandler() {
    if (!newVerb || usedVerbs.includes(newVerb)) return;
    updateActor({ verbHandlers: { ...handlers, [newVerb]: "" } });
    const remaining = ACTOR_VERB_OPTIONS.filter((v) => v !== newVerb && !usedVerbs.includes(v));
    if (remaining.length > 0) setNewVerb(remaining[0]);
  }

  function removeHandler(verb: string) {
    const updated = { ...handlers };
    delete updated[verb as VerbType];
    updateActor({ verbHandlers: updated });
  }

  function updateHandlerScript(verb: string, scriptId: string) {
    updateActor({ verbHandlers: { ...handlers, [verb]: scriptId } });
  }

  function changeHandlerVerb(oldVerb: string, newVerbVal: string) {
    const scriptId = handlers[oldVerb as VerbType] ?? "";
    const updated = { ...handlers };
    delete updated[oldVerb as VerbType];
    updated[newVerbVal as VerbType] = scriptId;
    updateActor({ verbHandlers: updated });
  }

  return (
    <>
      <div className="inspector-section">
        <label className="inspector-label">Verb Handlers</label>
        <div className="inspector-hint">
          Map verbs to scripts. The script runs when the player uses that verb on this actor.
        </div>

        {usedVerbs.length > 0 && (
          <div className="verb-handler-list">
            {usedVerbs.map((verb) => {
              const otherAvailable = ACTOR_VERB_OPTIONS.filter(
                (v) => v === verb || !usedVerbs.includes(v)
              );
              return (
                <div key={verb} className="verb-handler-row">
                  <select
                    className="ed-input ed-input-sm"
                    value={verb}
                    onChange={(e) => changeHandlerVerb(verb, e.target.value)}
                    style={{ width: 72, flexShrink: 0 }}
                  >
                    {otherAvailable.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <ScriptPicker
                    value={handlers[verb] ?? ""}
                    onChange={(s) => updateHandlerScript(verb, s)}
                    entityId={actor.id}
                    verb={verb}
                  />
                  <button
                    className="btn btn-danger btn-xs"
                    onClick={() => removeHandler(verb)}
                    title="Remove handler"
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}

        {availableVerbs.length > 0 && (
          <div className="verb-handler-add">
            <select
              className="ed-input ed-input-sm"
              value={newVerb}
              onChange={(e) => setNewVerb(e.target.value as VerbType)}
              style={{ flex: 1, minWidth: 0 }}
            >
              {availableVerbs.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <button className="btn btn-primary btn-xs" onClick={addHandler}>+ Add</button>
          </div>
        )}
      </div>

      {hasUseVerb && (
        <UseWithSection
          useWithHandlers={actor.useWithHandlers ?? {}}
          onChange={(uwh) => updateActor({ useWithHandlers: Object.keys(uwh).length > 0 ? uwh : undefined })}
          entityId={actor.id}
        />
      )}

      <div className="inspector-section">
        <label className="inspector-label">Default / Fallback Script</label>
        <div className="inspector-hint">
          Runs when no verb handler matches. Leave empty for built-in default response.
        </div>
        <ScriptPicker
          value={actor.fallbackScriptId ?? ""}
          onChange={(s) => updateActor({ fallbackScriptId: s || undefined })}
          entityId={actor.id}
          verb="fallback"
        />
      </div>

      <InteractionResolution
        verbHandlers={handlers}
        useWithHandlers={actor.useWithHandlers}
        fallbackScriptId={actor.fallbackScriptId}
      />
    </>
  );
}
