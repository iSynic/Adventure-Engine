import { useEditor } from "../store";

interface ScriptPickerProps {
  value: string;
  onChange: (scriptId: string) => void;
  entityId?: string;
  verb?: string;
  placeholder?: string;
}

export default function ScriptPicker({ value, onChange, entityId, verb, placeholder }: ScriptPickerProps) {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  const scriptNames = project?.scripts.map((s) => s.name) ?? [];

  function handleCreate() {
    const base = [entityId, verb].filter(Boolean).join("_") || "new_script";
    let name = base;
    let i = 1;
    while (scriptNames.includes(name)) {
      name = `${base}_${i++}`;
    }
    dispatch({
      type: "ADD_SCRIPT",
      script: { name, body: `// ${name}\n`, kind: "visual", steps: [] },
    });
    onChange(name);
    dispatch({ type: "SET_TAB", tab: "scripts" });
    dispatch({ type: "SELECT_SCRIPT", name });
  }

  return (
    <div style={{ display: "flex", gap: 4, flex: 1, minWidth: 0 }}>
      <select
        className="ed-input ed-input-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, minWidth: 0 }}
      >
        <option value="">{placeholder ?? "-- none --"}</option>
        {scriptNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      <button
        className="btn btn-xs"
        onClick={handleCreate}
        title="Create a new script for this handler"
        style={{ flexShrink: 0, fontSize: "0.75em", padding: "2px 6px" }}
      >
        + New
      </button>
    </div>
  );
}
