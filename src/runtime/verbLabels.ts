import type { VerbType } from "../engine/core/types";

export const VERB_LABELS: Record<string, string> = {
  walk: "Walk",
  look: "Look",
  open: "Open",
  close: "Close",
  pickup: "Pick Up",
  use: "Use",
  talk: "Talk To",
  push: "Push",
  pull: "Pull",
  give: "Give",
};

export const VERB_LIST: { id: VerbType; label: string }[] = Object.entries(
  VERB_LABELS
).map(([id, label]) => ({ id: id as VerbType, label }));
