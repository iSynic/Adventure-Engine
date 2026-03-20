import { useState } from "react";
import { useEditor } from "../store";
import type { VerbType } from "../../engine/core/types";

const ALL_VERBS: VerbType[] = ["look", "open", "close", "pickup", "use", "talk", "push", "pull", "give"];

interface InteractionResolutionProps {
  verbHandlers: Partial<Record<VerbType, string>>;
  useWithHandlers?: Record<string, string>;
  fallbackScriptId?: string;
}

export default function InteractionResolution({ verbHandlers, useWithHandlers, fallbackScriptId }: InteractionResolutionProps) {
  const [expanded, setExpanded] = useState(false);
  const { state } = useEditor();
  const project = state.currentProject;
  const scriptNames = new Set(project?.scripts.map((s) => s.name) ?? []);
  const globalFallback = project?.globalFallbackScriptId;

  const assignedVerbs = ALL_VERBS.filter((v) => v in verbHandlers);
  const unassignedVerbs = ALL_VERBS.filter((v) => !(v in verbHandlers));

  function scriptStatus(scriptId: string | undefined): "set" | "missing" | "none" {
    if (!scriptId) return "none";
    return scriptNames.has(scriptId) ? "set" : "missing";
  }

  function icon(status: "set" | "missing" | "none") {
    if (status === "set") return <span style={{ color: "#4ade80" }}>✓</span>;
    if (status === "missing") return <span style={{ color: "#fbbf24" }}>⚠</span>;
    return <span style={{ color: "#666" }}>✗</span>;
  }

  const useWithEntries = Object.entries(useWithHandlers ?? {});

  return (
    <div className="inspector-section">
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          color: "#aaa",
          cursor: "pointer",
          padding: 0,
          fontSize: "0.8em",
          display: "flex",
          alignItems: "center",
          gap: 4,
          width: "100%",
        }}
      >
        <span style={{ fontSize: "0.7em" }}>{expanded ? "▼" : "▶"}</span>
        Interaction Resolution Order
      </button>

      {expanded && (
        <div style={{ marginTop: 6, fontSize: "0.75em", color: "#bbb" }}>
          {assignedVerbs.map((verb) => {
            const handlerStatus = scriptStatus(verbHandlers[verb]);
            const fbStatus = scriptStatus(fallbackScriptId);
            const globalStatus = scriptStatus(globalFallback);

            return (
              <div key={verb} style={{ marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid #333" }}>
                <div style={{ fontWeight: 600, color: "#c0d0ff", marginBottom: 2 }}>{verb}</div>
                <div style={{ paddingLeft: 8 }}>
                  {verb === "use" && useWithEntries.length > 0 && (
                    <>
                      {useWithEntries.map(([itemId, scriptId]) => (
                        <div key={itemId}>
                          {icon(scriptStatus(scriptId))} Use-with "{itemId}": {scriptId || "(empty)"}
                        </div>
                      ))}
                    </>
                  )}
                  <div>{icon(handlerStatus)} Verb handler: {verbHandlers[verb] || "(empty)"}</div>
                  <div>{icon(fbStatus)} Entity fallback: {fallbackScriptId || "(none)"}</div>
                  <div>{icon(globalStatus)} Global fallback: {globalFallback || "(none)"}</div>
                  <div style={{ color: "#666" }}>✗ Built-in default text</div>
                </div>
              </div>
            );
          })}

          {unassignedVerbs.length > 0 && (
            <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: "2px solid #333" }}>
              <div style={{ color: "#888", marginBottom: 2 }}>
                Unassigned verbs: {unassignedVerbs.join(", ")}
              </div>
              <div style={{ paddingLeft: 8 }}>
                <div>{icon(scriptStatus(fallbackScriptId))} Entity fallback: {fallbackScriptId || "(none)"}</div>
                <div>{icon(scriptStatus(globalFallback))} Global fallback: {globalFallback || "(none)"}</div>
                <div style={{ color: "#666" }}>✗ Built-in default text</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
