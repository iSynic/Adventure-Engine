export interface EditState {
  editingKey: string | null;
  editValue: string;
  startEdit: (key: string, currentValue: string) => void;
  setEditingKey: (key: string | null) => void;
  setEditValue: (value: string) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}
