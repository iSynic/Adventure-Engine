import { useState, useCallback } from "react";
import type { DialogueTree, DialogueNode, DialogueBranch, ConditionExpression, VariableDefinition } from "../../engine/core/types";
import type { StateStore } from "../../engine/state/StateStore";
import type { InventorySystem } from "../../engine/inventory/InventorySystem";
import { evaluateCondition } from "../../engine/state/ConditionEvaluator";

interface SimState {
  flags: Record<string, boolean>;
  variables: Record<string, boolean | number | string>;
  seenNodes: Record<string, string[]>;
  seenBranches: Record<string, string[]>;
  inventory: Record<string, string[]>;
}

type SimStateAdapter = Pick<StateStore,
  "getFlag" | "getVariable" | "getObjectState" | "hasVisitedRoom" | "hasSeenDialogueNode"
>;

type SimInventoryAdapter = Pick<InventorySystem, "hasItem">;

function createSimStateAdapter(sim: SimState): SimStateAdapter {
  return {
    getFlag: (f: string) => sim.flags[f] ?? false,
    getVariable: (v: string) => sim.variables[v],
    getObjectState: () => undefined,
    hasVisitedRoom: () => false,
    hasSeenDialogueNode: (treeId: string, nodeId: string) =>
      sim.seenNodes[treeId]?.includes(nodeId) ?? false,
  };
}

function createSimInventoryAdapter(sim: SimState): SimInventoryAdapter {
  return {
    hasItem: (actorId: string, itemId: string) =>
      sim.inventory[actorId]?.includes(itemId) ?? false,
  };
}

function evalCond(
  condition: string | ConditionExpression | undefined,
  sim: SimState
): boolean {
  if (condition === undefined || condition === null) return true;
  if (typeof condition === "string" && condition.trim() === "") return true;
  const store = createSimStateAdapter(sim);
  const inv = createSimInventoryAdapter(sim);
  return evaluateCondition(condition, store as StateStore, inv as InventorySystem);
}

function getVisibleBranches(
  node: DialogueNode,
  treeId: string,
  sim: SimState
): { branch: DialogueBranch; index: number }[] {
  const result: { branch: DialogueBranch; index: number }[] = [];
  node.branches.forEach((branch, index) => {
    if (branch.once && (sim.seenBranches[treeId]?.includes(branch.id) ?? false)) return;
    if (evalCond(branch.condition, sim)) {
      result.push({ branch, index });
    }
  });
  return result;
}

function findNextFallthrough(
  tree: DialogueTree,
  skipNodeId: string,
  sim: SimState
): DialogueNode | null {
  const idx = tree.nodes.findIndex((n) => n.id === skipNodeId);
  if (idx < 0) return null;
  for (let i = idx + 1; i < tree.nodes.length; i++) {
    const candidate = tree.nodes[i];
    if (!evalCond(candidate.condition, sim)) continue;
    if (candidate.once && (sim.seenNodes[tree.id]?.includes(candidate.id) ?? false)) continue;
    return candidate;
  }
  return null;
}

interface SimulatorProps {
  tree: DialogueTree;
  variableDefinitions: VariableDefinition[];
  onClose: () => void;
}

interface TrailEntry {
  nodeId: string;
  speaker: string;
  text: string;
}

export default function DialogueSimulator({ tree, variableDefinitions, onClose }: SimulatorProps) {
  function resolveNodeStatic(node: DialogueNode | null, t: DialogueTree, s: SimState): DialogueNode | null {
    if (!node) return null;
    if (!evalCond(node.condition, s)) {
      return findNextFallthrough(t, node.id, s);
    }
    if (node.once && (s.seenNodes[t.id]?.includes(node.id) ?? false)) {
      return findNextFallthrough(t, node.id, s);
    }
    return node;
  }

  function applyNodeActions(s: SimState, node: DialogueNode): { state: SimState; endRequested: boolean } {
    let next = { ...s };
    for (const action of node.actions ?? []) {
      switch (action.type) {
        case "setFlag":
          if (action.flag) next = { ...next, flags: { ...next.flags, [action.flag]: action.flagValue ?? true } };
          break;
        case "setVariable":
          if (action.variable && action.value !== undefined) next = { ...next, variables: { ...next.variables, [action.variable]: action.value } };
          break;
        case "endDialogue":
          return { state: next, endRequested: true };
      }
    }
    return { state: next, endRequested: false };
  }

  function markNodeSeenImmediate(s: SimState, treeId: string, nodeId: string): SimState {
    const nodes = s.seenNodes[treeId] ? [...s.seenNodes[treeId]] : [];
    if (!nodes.includes(nodeId)) nodes.push(nodeId);
    return { ...s, seenNodes: { ...s.seenNodes, [treeId]: nodes } };
  }

  function enterNode(
    node: DialogueNode | null,
    t: DialogueTree,
    s: SimState
  ): { sim: SimState; node: DialogueNode | null; ended: boolean } {
    const resolved = resolveNodeStatic(node, t, s);
    if (!resolved) return { sim: s, node: null, ended: true };
    let next = markNodeSeenImmediate(s, t.id, resolved.id);
    const { state: afterActions, endRequested } = applyNodeActions(next, resolved);
    if (endRequested) return { sim: afterActions, node: resolved, ended: true };
    return { sim: afterActions, node: resolved, ended: false };
  }

  const [initState] = useState(() => {
    const vars: Record<string, boolean | number | string> = {};
    for (const def of variableDefinitions) {
      if (def.defaultValue !== undefined) vars[def.name] = def.defaultValue;
    }
    const freshSim: SimState = { flags: {}, variables: vars, seenNodes: {}, seenBranches: {}, inventory: {} };
    const start = tree.nodes.find((n) => n.id === tree.startNodeId) ?? null;
    const entry = enterNode(start, tree, freshSim);
    return {
      sim: entry.sim,
      node: entry.node,
      trail: entry.node ? [{ nodeId: entry.node.id, speaker: entry.node.speaker, text: entry.node.text }] as TrailEntry[] : [] as TrailEntry[],
      ended: entry.ended,
    };
  });
  const [sim, setSim] = useState<SimState>(initState.sim);
  const [currentNode, setCurrentNode] = useState<DialogueNode | null>(initState.node);
  const [trail, setTrail] = useState<TrailEntry[]>(initState.trail);
  const [ended, setEnded] = useState(initState.ended);
  const [stateOpen, setStateOpen] = useState(false);
  const [flagInput, setFlagInput] = useState("");

  const markBranchChosen = useCallback((s: SimState, branchId: string) => {
    const branches = s.seenBranches[tree.id] ? [...s.seenBranches[tree.id]] : [];
    if (!branches.includes(branchId)) branches.push(branchId);
    return { ...s, seenBranches: { ...s.seenBranches, [tree.id]: branches } };
  }, [tree.id]);

  function handleChoice(branchIndex: number) {
    if (!currentNode || ended) return;
    const branch = currentNode.branches[branchIndex];
    if (!branch) return;

    let nextSim = markBranchChosen(sim, branch.id);

    if (branch.nextNodeId === null) {
      setSim(nextSim);
      setCurrentNode(null);
      setEnded(true);
      return;
    }

    const rawNext = tree.nodes.find((n) => n.id === branch.nextNodeId) ?? null;
    const entry = enterNode(rawNext, tree, nextSim);

    setSim(entry.sim);
    if (!entry.node) {
      setCurrentNode(null);
      setEnded(true);
      return;
    }

    setCurrentNode(entry.node);
    setTrail((prev) => [...prev, { nodeId: entry.node!.id, speaker: entry.node!.speaker, text: entry.node!.text }]);
    setEnded(entry.ended);
  }

  function handleContinue() {
    if (!currentNode || ended) return;
    setSim(sim);
    setCurrentNode(null);
    setEnded(true);
  }

  function handleRestart() {
    const vars: Record<string, boolean | number | string> = {};
    for (const def of variableDefinitions) {
      if (def.defaultValue !== undefined) vars[def.name] = def.defaultValue;
    }
    const fresh: SimState = { flags: {}, variables: vars, seenNodes: {}, seenBranches: {}, inventory: {} };
    const start = tree.nodes.find((n) => n.id === tree.startNodeId) ?? null;
    const entry = enterNode(start, tree, fresh);
    setSim(entry.sim);
    setCurrentNode(entry.node);
    setTrail(entry.node ? [{ nodeId: entry.node.id, speaker: entry.node.speaker, text: entry.node.text }] : []);
    setEnded(entry.ended);
    setFlagInput("");
  }

  function addFlag() {
    const name = flagInput.trim();
    if (!name) return;
    setSim((prev) => ({ ...prev, flags: { ...prev.flags, [name]: true } }));
    setFlagInput("");
  }

  const visibleBranches = currentNode ? getVisibleBranches(currentNode, tree.id, sim) : [];
  const chosenBranchIds = sim.seenBranches[tree.id] ?? [];

  return (
    <div className="sim-backdrop" onClick={onClose}>
      <div className="sim-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sim-header">
          <span className="sim-title">Test: {tree.name}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn btn-ghost btn-xs" onClick={handleRestart}>Restart</button>
            <button className="btn btn-ghost btn-xs" onClick={() => setStateOpen(!stateOpen)}>
              {stateOpen ? "Hide" : "Sim"} State
            </button>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="sim-body">
          {stateOpen && (
            <div className="sim-state-sidebar">
              <div className="sim-state-section">
                <div className="sim-state-label">Flags</div>
                {Object.entries(sim.flags).map(([k, v]) => (
                  <label key={k} className="sim-state-row">
                    <input
                      type="checkbox"
                      checked={v}
                      onChange={(e) => setSim((prev) => ({ ...prev, flags: { ...prev.flags, [k]: e.target.checked } }))}
                    />
                    <span>{k}</span>
                  </label>
                ))}
                <div className="sim-add-flag">
                  <input
                    className="ed-input ed-input-sm"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    placeholder="Add flag..."
                    onKeyDown={(e) => { if (e.key === "Enter") addFlag(); }}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-ghost btn-xs" onClick={addFlag}>+</button>
                </div>
              </div>
              {variableDefinitions.length > 0 && (
                <div className="sim-state-section">
                  <div className="sim-state-label">Variables</div>
                  {variableDefinitions.map((def) => (
                    <div key={def.name} className="sim-state-row">
                      <span className="sim-var-name">{def.name}</span>
                      <input
                        className="ed-input ed-input-sm"
                        value={String(sim.variables[def.name] ?? def.defaultValue ?? "")}
                        onChange={(e) => {
                          const raw = e.target.value;
                          let val: boolean | number | string = raw;
                          if (raw === "true") val = true;
                          else if (raw === "false") val = false;
                          else { const n = Number(raw); if (raw !== "" && !isNaN(n)) val = n; }
                          setSim((prev) => ({ ...prev, variables: { ...prev.variables, [def.name]: val } }));
                        }}
                        style={{ width: 60 }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="sim-main">
            <div className="sim-trail">
              <div className="sim-trail-label">Visited nodes</div>
              {trail.map((entry, i) => (
                <div key={i} className={`sim-trail-entry${currentNode?.id === entry.nodeId && !ended ? " sim-trail-active" : ""}`}>
                  <span className="sim-trail-num">{i + 1}.</span>
                  <span className="sim-trail-speaker">[{entry.nodeId}]</span>
                  <span className="sim-trail-speaker">{entry.speaker}:</span>
                  <span className="sim-trail-text">{entry.text.substring(0, 50)}{entry.text.length > 50 ? "..." : ""}</span>
                </div>
              ))}
            </div>

            <div className="sim-dialogue-area">
              {ended && (
                <div className="sim-ended">— Dialogue ended —</div>
              )}
              {currentNode && !ended && (
                <div className="dialogue-overlay sim-dialogue-overlay">
                  <div className="dialogue-speaker-box">
                    <div className="dialogue-speaker-content">
                      <span className="dialogue-speaker-name">{currentNode.speaker}</span>
                      <span className="dialogue-speaker-text">{currentNode.text}</span>
                    </div>
                  </div>
                  {visibleBranches.length > 0 ? (
                    <div className="dialogue-choices">
                      {visibleBranches.map(({ branch, index }, i) => {
                        const wasSeen = chosenBranchIds.includes(branch.id);
                        return (
                          <button
                            key={branch.id}
                            className={`dialogue-choice-btn${wasSeen ? " dialogue-choice-btn--seen" : ""}`}
                            onClick={() => handleChoice(index)}
                          >
                            <span className="dialogue-choice-num">{i + 1}.</span>
                            {wasSeen && <span className="dialogue-choice-seen-dot">•</span>}
                            {branch.text}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm sim-continue-btn" onClick={handleContinue}>
                      click to continue ▼
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

