import type {
  ScriptStep,
  Direction,
  AnimationState,
} from "../../../engine/core/types";
import type { EditorProject } from "../../types";
import type { StepValidationError } from "../../utils/validateVisualScript";
import { DIRECTIONS, ANIMATION_STATES } from "./scriptEditorUtils";
import {
  ActorPicker,
  RoomPicker,
  ItemPicker,
  ObjectPicker,
  TreePicker,
  VariablePicker,
  ScriptPicker,
  SpawnPointPicker,
} from "./StepPickers";

export function FieldError({ errors, field }: { errors: StepValidationError[]; field: string }) {
  const match = errors.find((e) => e.field === field);
  if (!match) return null;
  return <div style={{ color: "#ff6b6b", fontSize: "0.75em", marginTop: 2 }}>{match.message}</div>;
}

export function StepForm({
  step,
  onChange,
  errors,
  project,
  scriptName,
}: {
  step: ScriptStep;
  onChange: (s: ScriptStep) => void;
  errors: StepValidationError[];
  project: EditorProject;
  scriptName?: string;
}) {
  const fieldStyle = { display: "flex", gap: 4, alignItems: "center", marginBottom: 4 } as const;
  const labelStyle = { color: "#999", fontSize: "0.8em", minWidth: 40, flexShrink: 0 } as const;

  switch (step.type) {
    case "say":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Text</span>
            <input className="ed-input ed-input-sm" value={step.text} onChange={(e) => onChange({ ...step, text: e.target.value })} placeholder="Message text..." style={{ flex: 1 }} />
          </div>
          <FieldError errors={errors} field="text" />
        </div>
      );

    case "sayBlocking":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Actor</span>
            <ActorPicker value={step.actorId} onChange={(v) => onChange({ ...step, actorId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="actorId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Text</span>
            <input className="ed-input ed-input-sm" value={step.text} onChange={(e) => onChange({ ...step, text: e.target.value })} placeholder="Speech text..." style={{ flex: 1 }} />
          </div>
          <FieldError errors={errors} field="text" />
        </div>
      );

    case "gotoRoom":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Room</span>
            <RoomPicker value={step.roomId} onChange={(v) => onChange({ ...step, roomId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="roomId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Spawn</span>
            <SpawnPointPicker value={step.spawnPointId ?? ""} onChange={(v) => onChange({ ...step, spawnPointId: v || undefined })} project={project} roomId={step.roomId} />
          </div>
        </div>
      );

    case "setFlag":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Flag</span>
            <input className="ed-input ed-input-sm" value={step.flag} onChange={(e) => onChange({ ...step, flag: e.target.value })} placeholder="Flag name" style={{ flex: 1 }} />
          </div>
          <FieldError errors={errors} field="flag" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Value</span>
            <select className="ed-input ed-input-sm" value={String(step.value)} onChange={(e) => onChange({ ...step, value: e.target.value === "true" })} style={{ width: 80 }}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </div>
      );

    case "setVar":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Var</span>
            <VariablePicker value={step.variable} onChange={(v) => onChange({ ...step, variable: v })} project={project} />
          </div>
          <FieldError errors={errors} field="variable" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Value</span>
            <input className="ed-input ed-input-sm" value={String(step.value)} onChange={(e) => {
              const raw = e.target.value;
              let parsed: boolean | number | string;
              if (raw === "true") parsed = true;
              else if (raw === "false") parsed = false;
              else { const num = Number(raw); parsed = isNaN(num) ? raw : num; }
              onChange({ ...step, value: parsed });
            }} placeholder="Value" style={{ flex: 1 }} />
          </div>
        </div>
      );

    case "incrementVar":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Var</span>
            <VariablePicker value={step.variable} onChange={(v) => onChange({ ...step, variable: v })} project={project} />
          </div>
          <FieldError errors={errors} field="variable" />
          <div style={fieldStyle}>
            <span style={labelStyle}>By</span>
            <input type="number" className="ed-input ed-input-sm" value={step.amount ?? 1} onChange={(e) => onChange({ ...step, amount: Number(e.target.value) || 1 })} style={{ width: 60 }} title="Amount to add (use negative values to subtract)" />
          </div>
          <div style={{ color: "#888", fontSize: "0.7em", marginTop: 2 }}>Use negative values to decrement.</div>
        </div>
      );

    case "giveItem":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Actor</span>
            <ActorPicker value={step.actorId} onChange={(v) => onChange({ ...step, actorId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="actorId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Item</span>
            <ItemPicker value={step.itemId} onChange={(v) => onChange({ ...step, itemId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="itemId" />
        </div>
      );

    case "removeItem":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Actor</span>
            <ActorPicker value={step.actorId} onChange={(v) => onChange({ ...step, actorId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="actorId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Item</span>
            <ItemPicker value={step.itemId} onChange={(v) => onChange({ ...step, itemId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="itemId" />
        </div>
      );

    case "fadeOut":
    case "fadeIn":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>ms</span>
            <input type="number" className="ed-input ed-input-sm" value={step.duration ?? 500} onChange={(e) => onChange({ ...step, duration: Number(e.target.value) || 500 })} style={{ width: 80 }} />
          </div>
          <FieldError errors={errors} field="duration" />
        </div>
      );

    case "wait":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>ms</span>
            <input type="number" className="ed-input ed-input-sm" value={step.duration} onChange={(e) => onChange({ ...step, duration: Number(e.target.value) || 1000 })} style={{ width: 80 }} />
          </div>
          <FieldError errors={errors} field="duration" />
        </div>
      );

    case "walkActorTo":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Actor</span>
            <ActorPicker value={step.actorId} onChange={(v) => onChange({ ...step, actorId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="actorId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>X</span>
            <input type="number" className="ed-input ed-input-sm" value={step.x} onChange={(e) => onChange({ ...step, x: Number(e.target.value) || 0 })} style={{ width: 60 }} title="Target X position in room coordinates" />
            <span style={labelStyle}>Y</span>
            <input type="number" className="ed-input ed-input-sm" value={step.y} onChange={(e) => onChange({ ...step, y: Number(e.target.value) || 0 })} style={{ width: 60 }} title="Target Y position in room coordinates" />
          </div>
          <div style={{ color: "#888", fontSize: "0.7em", marginTop: 2 }}>Room-space coordinates. The actor pathfinds via walkboxes.</div>
        </div>
      );

    case "faceActor":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Actor</span>
            <ActorPicker value={step.actorId} onChange={(v) => onChange({ ...step, actorId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="actorId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Dir</span>
            <select className="ed-input ed-input-sm" value={step.direction} onChange={(e) => onChange({ ...step, direction: e.target.value as Direction })} style={{ width: 60 }}>
              {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      );

    case "startDialogue":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Tree</span>
            <TreePicker value={step.treeId} onChange={(v) => onChange({ ...step, treeId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="treeId" />
        </div>
      );

    case "setObjectState":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Obj</span>
            <ObjectPicker value={step.objectId} onChange={(v) => onChange({ ...step, objectId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="objectId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Key</span>
            <input className="ed-input ed-input-sm" value={step.key} onChange={(e) => onChange({ ...step, key: e.target.value })} placeholder="State key" style={{ flex: 1 }} title="The state property name (must match state sprite entries)" />
          </div>
          <FieldError errors={errors} field="key" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Value</span>
            <input className="ed-input ed-input-sm" value={step.value} onChange={(e) => onChange({ ...step, value: e.target.value })} placeholder="Value" style={{ flex: 1 }} />
          </div>
          <div style={{ color: "#888", fontSize: "0.7em", marginTop: 2 }}>Matching a state sprite entry changes the sprite; other keys can be used for logic/conditions.</div>
        </div>
      );

    case "setObjectPrimaryState":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Obj</span>
            <ObjectPicker value={step.objectId} onChange={(v) => onChange({ ...step, objectId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="objectId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>State #</span>
            <input className="ed-input ed-input-sm" type="number" min={0} value={step.stateIndex} onChange={(e) => onChange({ ...step, stateIndex: parseInt(e.target.value, 10) || 0 })} style={{ flex: 1 }} title="0-based index into the object's state sprites list" />
          </div>
          <div style={{ color: "#888", fontSize: "0.7em", marginTop: 2 }}>Index into the state sprites list (0-based). Changes the object's current sprite.</div>
        </div>
      );

    case "playAnimation":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Actor</span>
            <ActorPicker value={step.actorId} onChange={(v) => onChange({ ...step, actorId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="actorId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Anim</span>
            <select className="ed-input ed-input-sm" value={step.animationState} onChange={(e) => onChange({ ...step, animationState: e.target.value as AnimationState })} style={{ flex: 1 }}>
              {ANIMATION_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" checked={step.waitForCompletion ?? false} onChange={(e) => onChange({ ...step, waitForCompletion: e.target.checked })} />
              Wait for completion
            </label>
          </div>
        </div>
      );

    case "emitSignal":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Signal</span>
            <input className="ed-input ed-input-sm" value={step.signal} onChange={(e) => onChange({ ...step, signal: e.target.value })} placeholder="Signal name" style={{ flex: 1 }} />
          </div>
          <FieldError errors={errors} field="signal" />
        </div>
      );

    case "scheduleScript":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Script</span>
            <ScriptPicker value={step.scriptId} onChange={(v) => onChange({ ...step, scriptId: v })} project={project} exclude={scriptName} />
          </div>
          <FieldError errors={errors} field="scriptId" />
          <div style={{ color: "#888", fontSize: "0.7em", marginTop: 2 }}>The scheduled script runs in parallel — it does not block this script.</div>
        </div>
      );

    case "setRoomVar":
      return (
        <div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Room</span>
            <RoomPicker value={step.roomId} onChange={(v) => onChange({ ...step, roomId: v })} project={project} />
          </div>
          <FieldError errors={errors} field="roomId" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Key</span>
            <input className="ed-input ed-input-sm" value={step.key} onChange={(e) => onChange({ ...step, key: e.target.value })} placeholder="Variable key" style={{ flex: 1 }} />
          </div>
          <FieldError errors={errors} field="key" />
          <div style={fieldStyle}>
            <span style={labelStyle}>Value</span>
            <input className="ed-input ed-input-sm" value={String(step.value)} onChange={(e) => {
              const raw = e.target.value;
              let parsed: boolean | number | string;
              if (raw === "true") parsed = true;
              else if (raw === "false") parsed = false;
              else { const num = Number(raw); parsed = isNaN(num) ? raw : num; }
              onChange({ ...step, value: parsed });
            }} placeholder="Value" style={{ flex: 1 }} />
          </div>
          <div style={{ color: "#888", fontSize: "0.7em", marginTop: 2 }}>Room variables are local to a specific room and persist across visits.</div>
        </div>
      );

    case "beginCutscene":
    case "endCutscene":
    case "lockInput":
    case "unlockInput":
      return null;

    case "if":
      return null;

    default:
      return null;
  }
}
