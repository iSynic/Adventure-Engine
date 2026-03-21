import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useEditor } from "../store";
import type { ValidationError } from "../../shared/exportSchema";
import { validateProject, validateScriptBodiesAsync } from "../../shared/validateProject";
import type { EditorProject, EditorTab } from "../types";
import TutorialBubble from "../components/TutorialBubble";

interface CategorizedIssue {
  category: string;
  severity: "error" | "warning";
  message: string;
  entityName?: string;
  navigateTo?: {
    tab: EditorTab;
    roomId?: string;
    scriptName?: string;
    treeId?: string;
  };
}

function categorizeIssue(err: ValidationError, project: EditorProject): CategorizedIssue {
  const msg = err.message;
  let category = "Other";
  let entityName: string | undefined;
  let navigateTo: CategorizedIssue["navigateTo"] | undefined;

  const roomMatch = msg.match(/^Room "([^"]+)"/);
  const actorMatch = msg.match(/^Actor "([^"]+)"/);
  const objectMatch = msg.match(/^Object "([^"]+)"/);
  const itemMatch = msg.match(/^Item "([^"]+)"/);
  const scriptMatch = msg.match(/^Script "([^"]+)"/);
  const dialogueMatch = msg.match(/^Dialogue tree "([^"]+)"/);
  const assetMatch = msg.match(/^Asset "([^"]+)"/);

  if (roomMatch) {
    category = "Rooms";
    entityName = roomMatch[1];
    const room = project.rooms.find((r) => r.name === entityName);
    navigateTo = { tab: "rooms", roomId: room?.id };
  } else if (actorMatch) {
    category = "Actors";
    entityName = actorMatch[1];
    navigateTo = { tab: "actors" };
  } else if (objectMatch) {
    category = "Objects";
    entityName = objectMatch[1];
    const obj = project.objects.find((o) => o.name === entityName);
    const roomId = obj?.roomId;
    navigateTo = { tab: "rooms", roomId };
  } else if (itemMatch) {
    category = "Items";
    entityName = itemMatch[1];
    navigateTo = { tab: "items" };
  } else if (scriptMatch) {
    category = "Scripts";
    entityName = scriptMatch[1];
    navigateTo = { tab: "scripts", scriptName: scriptMatch[1] };
  } else if (dialogueMatch) {
    category = "Dialogue";
    entityName = dialogueMatch[1];
    const tree = (project.dialogueTrees ?? []).find((t) => t.name === entityName);
    navigateTo = { tab: "dialogue", treeId: tree?.id };
  } else if (assetMatch) {
    category = "Assets";
    entityName = assetMatch[1];
    navigateTo = { tab: "assets" };
  } else if (msg.includes("starting room") || msg.includes("Starting room") || msg.includes("no rooms") || msg.includes("Project has no rooms")) {
    category = "Rooms";
    navigateTo = { tab: "rooms" };
  } else if (msg.includes("player actor") || msg.includes("Player actor")) {
    category = "Actors";
    navigateTo = { tab: "actors" };
  } else if (msg.includes("Starting item")) {
    category = "Items";
    navigateTo = { tab: "items" };
  } else if (msg.includes("Duplicate script")) {
    category = "Scripts";
    navigateTo = { tab: "scripts" };
  } else if (msg.includes("Duplicate asset")) {
    category = "Assets";
    navigateTo = { tab: "assets" };
  } else if (msg.includes("Verb cursor")) {
    category = "Assets";
    navigateTo = { tab: "settings" };
  } else if (msg.includes("Global fallback")) {
    category = "Scripts";
    navigateTo = { tab: "settings" };
  } else if (msg.startsWith("Variable ")) {
    category = "Settings";
    const varMatch = msg.match(/^Variable "([^"]+)"/);
    entityName = varMatch?.[1];
    navigateTo = { tab: "settings" };
  } else if (msg.startsWith("State watcher ")) {
    category = "Scripts";
    const watcherMatch = msg.match(/^State watcher "([^"]+)"/);
    entityName = watcherMatch?.[1];
    navigateTo = { tab: "settings" };
  } else if (msg.startsWith("Display config") || msg.startsWith("Display:")) {
    category = "Settings";
    navigateTo = { tab: "settings" };
  } else if (msg.startsWith("Overlay config")) {
    category = "Settings";
    navigateTo = { tab: "settings" };
  } else if (msg.startsWith("Overlay ")) {
    category = "Settings";
    navigateTo = { tab: "settings" };
  }

  return {
    category,
    severity: err.severity,
    message: msg,
    entityName,
    navigateTo,
  };
}

const CATEGORY_ORDER = ["Rooms", "Actors", "Objects", "Items", "Scripts", "Dialogue", "Assets", "Settings", "Other"];

export default function LintView() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  const [issues, setIssues] = useState<CategorizedIssue[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const lintVersionRef = useRef(0);

  const runLint = useCallback(async () => {
    if (!project) return;
    const version = ++lintVersionRef.current;
    const validatable = {
      ...project,
      scripts: project.scripts.map((s) => ({ name: s.name, body: s.body, steps: s.steps })),
    };
    const result = validateProject(validatable);
    const syntaxErrors = await validateScriptBodiesAsync(validatable.scripts);
    if (version !== lintVersionRef.current) return;
    const allErrors = [...result.errors, ...syntaxErrors];
    setIssues(allErrors.map((e) => categorizeIssue(e, project)));
    setLastRun(new Date());
  }, [project]);

  useEffect(() => {
    runLint();
  }, [project]);

  const grouped = useMemo(() => {
    const map = new Map<string, CategorizedIssue[]>();
    for (const issue of issues) {
      const list = map.get(issue.category) ?? [];
      list.push(issue);
      map.set(issue.category, list);
    }
    return CATEGORY_ORDER
      .filter((cat) => map.has(cat))
      .map((cat) => ({ category: cat, issues: map.get(cat)! }));
  }, [issues]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  function toggleCategory(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function handleNavigate(issue: CategorizedIssue) {
    if (!issue.navigateTo || !project) return;

    if (issue.navigateTo.scriptName) {
      dispatch({ type: "SELECT_SCRIPT", name: issue.navigateTo.scriptName });
      return;
    }

    if (issue.navigateTo.treeId) {
      dispatch({ type: "SELECT_DIALOGUE_TREE", treeId: issue.navigateTo.treeId });
      return;
    }

    dispatch({ type: "SET_TAB", tab: issue.navigateTo.tab });

    if (issue.navigateTo.roomId) {
      dispatch({ type: "SELECT_ROOM", roomId: issue.navigateTo.roomId });
    }
  }

  if (!project) return null;

  return (
    <div className="tab-panel lint-panel">
      <div className="panel-header">
        <span>Linter</span>
        <TutorialBubble title="Re-run Linter" description="Re-scan the project for errors and warnings. The linter checks for missing references, orphaned entities, and configuration problems." preferSide="left">
          <button className="btn btn-primary btn-xs" onClick={runLint}>
            Re-run
          </button>
        </TutorialBubble>
      </div>

      <div style={{ fontSize: 12, color: "#999", padding: "4px 8px" }}>
        {lastRun && (
          <span>Last checked: {lastRun.toLocaleTimeString()}</span>
        )}
        {" — "}
        {errorCount > 0 && (
          <span style={{ color: "#f87171" }}>
            {errorCount} error{errorCount !== 1 ? "s" : ""}
          </span>
        )}
        {errorCount > 0 && warningCount > 0 && ", "}
        {warningCount > 0 && (
          <span style={{ color: "#fbbf24" }}>
            {warningCount} warning{warningCount !== 1 ? "s" : ""}
          </span>
        )}
        {errorCount === 0 && warningCount === 0 && (
          <span style={{ color: "#4ade80" }}>No issues found</span>
        )}
      </div>

      <div className="lint-results" style={{ overflowY: "auto", flex: 1, padding: "0 8px 8px" }}>
        {grouped.length === 0 && (
          <div style={{ textAlign: "center", color: "#4ade80", padding: 24, fontSize: 13 }}>
            All checks passed. Your project looks good!
          </div>
        )}
        {grouped.map(({ category, issues: catIssues }) => {
          const isCollapsed = collapsed.has(category);
          const catErrors = catIssues.filter((i) => i.severity === "error").length;
          const catWarnings = catIssues.filter((i) => i.severity === "warning").length;
          return (
            <div key={category} style={{ marginBottom: 8 }}>
              <button
                onClick={() => toggleCategory(category)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid #333",
                  borderRadius: 4,
                  padding: "4px 8px",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#ddd",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 10, width: 12 }}>{isCollapsed ? "▶" : "▼"}</span>
                <span>{category}</span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {catErrors > 0 && (
                    <span style={{
                      background: "rgba(248,113,113,0.2)",
                      color: "#f87171",
                      padding: "0 5px",
                      borderRadius: 8,
                      fontSize: 10,
                    }}>
                      {catErrors}
                    </span>
                  )}
                  {catWarnings > 0 && (
                    <span style={{
                      background: "rgba(251,191,36,0.2)",
                      color: "#fbbf24",
                      padding: "0 5px",
                      borderRadius: 8,
                      fontSize: 10,
                    }}>
                      {catWarnings}
                    </span>
                  )}
                </span>
              </button>
              {!isCollapsed && (
                <div style={{ borderLeft: "2px solid #333", marginLeft: 6, paddingLeft: 8, marginTop: 2 }}>
                  {catIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleNavigate(issue)}
                      style={{
                        fontSize: 11,
                        padding: "4px 6px",
                        borderBottom: "1px solid #1a1a1a",
                        cursor: issue.navigateTo ? "pointer" : "default",
                        display: "flex",
                        gap: 6,
                        alignItems: "flex-start",
                      }}
                      title={issue.navigateTo ? "Click to navigate" : undefined}
                    >
                      <span style={{
                        color: issue.severity === "error" ? "#f87171" : "#fbbf24",
                        flexShrink: 0,
                        fontSize: 12,
                      }}>
                        {issue.severity === "error" ? "\u2716" : "\u26A0"}
                      </span>
                      <span style={{
                        color: issue.severity === "error" ? "#f87171" : "#fbbf24",
                        lineHeight: 1.4,
                      }}>
                        {issue.entityName && (
                          <strong style={{ color: "#ddd" }}>{issue.entityName}: </strong>
                        )}
                        {issue.entityName ? issue.message.replace(new RegExp(`^[^"]*"${issue.entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[:\\s]*`), '') : issue.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
