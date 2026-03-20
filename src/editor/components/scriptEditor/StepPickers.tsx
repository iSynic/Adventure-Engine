import type { EditorProject } from "../../types";

export function ActorPicker({ value, onChange, project }: { value: string; onChange: (v: string) => void; project: EditorProject }) {
  return (
    <select className="ed-input ed-input-sm" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
      <option value="">-- Select Actor --</option>
      {project.actors.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
    </select>
  );
}

export function RoomPicker({ value, onChange, project }: { value: string; onChange: (v: string) => void; project: EditorProject }) {
  return (
    <select className="ed-input ed-input-sm" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
      <option value="">-- Select Room --</option>
      {project.rooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}
    </select>
  );
}

export function ItemPicker({ value, onChange, project }: { value: string; onChange: (v: string) => void; project: EditorProject }) {
  return (
    <select className="ed-input ed-input-sm" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
      <option value="">-- Select Item --</option>
      {project.items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.id})</option>)}
    </select>
  );
}

export function ObjectPicker({ value, onChange, project }: { value: string; onChange: (v: string) => void; project: EditorProject }) {
  return (
    <select className="ed-input ed-input-sm" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
      <option value="">-- Select Object --</option>
      {project.objects.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.id})</option>)}
    </select>
  );
}

export function TreePicker({ value, onChange, project }: { value: string; onChange: (v: string) => void; project: EditorProject }) {
  const trees = project.dialogueTrees ?? [];
  return (
    <select className="ed-input ed-input-sm" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
      <option value="">-- Select Tree --</option>
      {trees.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}
    </select>
  );
}

export function VariablePicker({ value, onChange, project }: { value: string; onChange: (v: string) => void; project: EditorProject }) {
  const vars = project.variableDefinitions ?? [];
  if (vars.length === 0) {
    return <input className="ed-input ed-input-sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Variable name" style={{ flex: 1 }} />;
  }
  return (
    <select className="ed-input ed-input-sm" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
      <option value="">-- Select Variable --</option>
      {vars.map((v) => <option key={v.name} value={v.name}>{v.name}{v.type ? ` (${v.type})` : ""}</option>)}
    </select>
  );
}

export function ScriptPicker({ value, onChange, project, exclude }: { value: string; onChange: (v: string) => void; project: EditorProject; exclude?: string }) {
  return (
    <select className="ed-input ed-input-sm" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
      <option value="">-- Select Script --</option>
      {project.scripts.filter((s) => s.name !== exclude).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
    </select>
  );
}

export function SpawnPointPicker({ value, onChange, project, roomId }: { value: string; onChange: (v: string) => void; project: EditorProject; roomId: string }) {
  const room = project.rooms.find((r) => r.id === roomId);
  const spawns = room?.spawnPoints ?? [];
  if (spawns.length === 0) return null;
  return (
    <select className="ed-input ed-input-sm" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
      <option value="">-- Default spawn --</option>
      {spawns.map((sp) => <option key={sp.id} value={sp.id}>{sp.id}</option>)}
    </select>
  );
}
