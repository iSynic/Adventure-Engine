import { useState, useEffect } from "react";
import { useEditor } from "../store";
import { generateId } from "../utils/projectStorage";
import type { DialogueNode, DialogueBranch, DialogueAction, DialogueActionType, ConditionExpression } from "../../engine/core/types";
import type { EditorDialogueTree } from "../types";
import ConditionBuilder from "./ConditionBuilder";
import DialogueSimulator from "./DialogueSimulator";
import TutorialBubble from "./TutorialBubble";

function createDefaultNode(x = 100, y = 100): { node: DialogueNode; position: { x: number; y: number } } {
  return {
    node: {
      id: generateId("dnode"),
      speaker: "NPC",
      text: "Hello there!",
      branches: [],
      actions: [],
    },
    position: { x, y },
  };
}

function createDefaultBranch(): DialogueBranch {
  return {
    id: generateId("dbranch"),
    text: "Player response",
    nextNodeId: null,
    condition: "",
  };
}

function createDefaultAction(): DialogueAction {
  return {
    type: "setFlag",
    flag: "",
    flagValue: true,
  };
}

function parseTypedValue(raw: string): boolean | number | string {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const num = Number(raw);
  if (raw !== "" && !isNaN(num)) return num;
  return raw;
}

function ActionEditor({
  action,
  index,
  onUpdate,
  onRemove,
}: {
  action: DialogueAction;
  index: number;
  onUpdate: (index: number, updates: Partial<DialogueAction>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="dialogue-action">
      <select
        className="ed-input ed-input-sm"
        value={action.type}
        onChange={(e) => onUpdate(index, { type: e.target.value as DialogueActionType })}
      >
        <option value="setFlag">Set Flag</option>
        <option value="giveItem">Give Item</option>
        <option value="removeItem">Remove Item</option>
        <option value="gotoRoom">Go to Room</option>
        <option value="setVariable">Set Variable</option>
        <option value="callScript">Call Script</option>
        <option value="setObjectState">Set Object State</option>
        <option value="endDialogue">End Dialogue</option>
      </select>
      {action.type === "setFlag" && (
        <>
          <input
            className="ed-input ed-input-sm"
            value={action.flag ?? ""}
            onChange={(e) => onUpdate(index, { flag: e.target.value })}
            placeholder="Flag name"
          />
          <select
            className="ed-input ed-input-sm"
            value={action.flagValue ? "true" : "false"}
            onChange={(e) => onUpdate(index, { flagValue: e.target.value === "true" })}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </>
      )}
      {action.type === "giveItem" && (
        <>
          <input
            className="ed-input ed-input-sm"
            value={action.actorId ?? ""}
            onChange={(e) => onUpdate(index, { actorId: e.target.value })}
            placeholder="Actor ID"
          />
          <input
            className="ed-input ed-input-sm"
            value={action.itemId ?? ""}
            onChange={(e) => onUpdate(index, { itemId: e.target.value })}
            placeholder="Item ID"
          />
        </>
      )}
      {action.type === "removeItem" && (
        <>
          <input
            className="ed-input ed-input-sm"
            value={action.actorId ?? ""}
            onChange={(e) => onUpdate(index, { actorId: e.target.value })}
            placeholder="Actor ID"
          />
          <input
            className="ed-input ed-input-sm"
            value={action.itemId ?? ""}
            onChange={(e) => onUpdate(index, { itemId: e.target.value })}
            placeholder="Item ID"
          />
        </>
      )}
      {action.type === "gotoRoom" && (
        <>
          <input
            className="ed-input ed-input-sm"
            value={action.roomId ?? ""}
            onChange={(e) => onUpdate(index, { roomId: e.target.value })}
            placeholder="Room ID"
          />
          <input
            className="ed-input ed-input-sm"
            value={action.spawnPointId ?? ""}
            onChange={(e) => onUpdate(index, { spawnPointId: e.target.value })}
            placeholder="Spawn point (optional)"
          />
        </>
      )}
      {action.type === "setVariable" && (
        <>
          <input
            className="ed-input ed-input-sm"
            value={action.variable ?? ""}
            onChange={(e) => onUpdate(index, { variable: e.target.value })}
            placeholder="Variable name"
          />
          <input
            className="ed-input ed-input-sm"
            value={String(action.value ?? "")}
            onChange={(e) => onUpdate(index, { value: parseTypedValue(e.target.value) })}
            placeholder="Value (bool/number/string)"
          />
        </>
      )}
      {action.type === "callScript" && (
        <input
          className="ed-input ed-input-sm"
          value={action.scriptId ?? ""}
          onChange={(e) => onUpdate(index, { scriptId: e.target.value })}
          placeholder="Script ID"
        />
      )}
      {action.type === "setObjectState" && (
        <>
          <input
            className="ed-input ed-input-sm"
            value={action.objectId ?? ""}
            onChange={(e) => onUpdate(index, { objectId: e.target.value })}
            placeholder="Object ID"
          />
          <input
            className="ed-input ed-input-sm"
            value={action.key ?? ""}
            onChange={(e) => onUpdate(index, { key: e.target.value })}
            placeholder="State key"
          />
          <input
            className="ed-input ed-input-sm"
            value={String(action.value ?? "")}
            onChange={(e) => onUpdate(index, { value: parseTypedValue(e.target.value) })}
            placeholder="State value (bool/number/string)"
          />
        </>
      )}
      <button className="btn btn-danger btn-xs" onClick={() => onRemove(index)}>✕</button>
    </div>
  );
}

function NodeEditor({
  node,
  allNodes,
  onUpdate,
  onDelete,
}: {
  node: DialogueNode;
  allNodes: DialogueNode[];
  onUpdate: (updated: DialogueNode) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function updateBranch(index: number, updates: Partial<DialogueBranch>) {
    const branches = node.branches.map((b, i) =>
      i === index ? { ...b, ...updates } : b
    );
    onUpdate({ ...node, branches });
  }

  function addBranch() {
    onUpdate({ ...node, branches: [...node.branches, createDefaultBranch()] });
  }

  function removeBranch(index: number) {
    onUpdate({ ...node, branches: node.branches.filter((_, i) => i !== index) });
  }

  function updateAction(index: number, updates: Partial<DialogueAction>) {
    const actions = (node.actions ?? []).map((a, i) =>
      i === index ? { ...a, ...updates } : a
    );
    onUpdate({ ...node, actions });
  }

  function addAction() {
    onUpdate({ ...node, actions: [...(node.actions ?? []), createDefaultAction()] });
  }

  function removeAction(index: number) {
    onUpdate({ ...node, actions: (node.actions ?? []).filter((_, i) => i !== index) });
  }

  const badges: string[] = [];
  if (node.once) badges.push("once");
  if (node.condition) badges.push("cond");
  if (node.portrait) badges.push("portrait");

  return (
    <div className="dialogue-node-editor" id={`dnode-${node.id}`}>
      <div className="dialogue-node-header" onClick={() => setExpanded(!expanded)}>
        <span className="dialogue-node-expand">{expanded ? "▼" : "▶"}</span>
        <span className="dialogue-node-id">{node.id}</span>
        <span className="dialogue-node-preview">
          {node.speaker}: {node.text.substring(0, 40)}{node.text.length > 40 ? "..." : ""}
        </span>
        {badges.length > 0 && (
          <span className="dialogue-node-badges">
            {badges.map((b) => (
              <span key={b} className="dialogue-badge">[{b}]</span>
            ))}
          </span>
        )}
        <button className="btn btn-danger btn-xs" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          ✕
        </button>
      </div>
      {expanded && (
        <div className="dialogue-node-body">
          <label className="dialogue-field">
            <span>Speaker</span>
            <input
              className="ed-input ed-input-sm"
              value={node.speaker}
              onChange={(e) => onUpdate({ ...node, speaker: e.target.value })}
            />
          </label>
          <label className="dialogue-field">
            <span>Text</span>
            <textarea
              className="ed-input ed-input-sm dialogue-textarea"
              value={node.text}
              onChange={(e) => onUpdate({ ...node, text: e.target.value })}
              rows={2}
            />
          </label>
          <label className="dialogue-field">
            <span>Portrait</span>
            <input
              className="ed-input ed-input-sm"
              value={node.portrait ?? ""}
              onChange={(e) => onUpdate({ ...node, portrait: e.target.value || undefined })}
              placeholder="Portrait image path (optional)"
            />
          </label>
          <label className="dialogue-field dialogue-field-inline">
            <input
              type="checkbox"
              checked={!!node.once}
              onChange={(e) => onUpdate({ ...node, once: e.target.checked || undefined })}
            />
            <span>Show once only</span>
          </label>
          <ConditionBuilder
            label="Node Condition"
            condition={node.condition as ConditionExpression | string | undefined}
            onChange={(c: ConditionExpression | undefined) => onUpdate({ ...node, condition: c })}
          />

          <div className="dialogue-section">
            <div className="dialogue-section-header">
              <span>Branches ({node.branches.length})</span>
              <button className="btn btn-ghost btn-xs" onClick={addBranch}>+ Branch</button>
            </div>
            {node.branches.map((branch, bi) => (
              <div key={branch.id} className="dialogue-branch">
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    className="ed-input ed-input-sm"
                    value={branch.text}
                    onChange={(e) => updateBranch(bi, { text: e.target.value })}
                    placeholder="Player choice text"
                    style={{ flex: 1 }}
                  />
                  <select
                    className="ed-input ed-input-sm"
                    value={branch.nextNodeId ?? ""}
                    onChange={(e) => updateBranch(bi, { nextNodeId: e.target.value || null })}
                  >
                    <option value="">(End dialogue)</option>
                    {allNodes
                      .filter((n) => n.id !== node.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.speaker}: {n.text.substring(0, 30)}{n.text.length > 30 ? "…" : ""}
                        </option>
                      ))}
                  </select>
                  <button className="btn btn-danger btn-xs" onClick={() => removeBranch(bi)}>✕</button>
                </div>
                <label className="dialogue-field dialogue-field-inline" style={{ marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={!!branch.once}
                    onChange={(e) => updateBranch(bi, { once: e.target.checked || undefined })}
                  />
                  <span>Show once only</span>
                </label>
                <ConditionBuilder
                  label="Branch Condition"
                  condition={branch.condition as ConditionExpression | string | undefined}
                  onChange={(c: ConditionExpression | undefined) => updateBranch(bi, { condition: c })}
                />
              </div>
            ))}
          </div>

          <div className="dialogue-section">
            <div className="dialogue-section-header">
              <span>Actions ({(node.actions ?? []).length})</span>
              <button className="btn btn-ghost btn-xs" onClick={addAction}>+ Action</button>
            </div>
            {(node.actions ?? []).map((action, ai) => (
              <ActionEditor
                key={ai}
                action={action}
                index={ai}
                onUpdate={updateAction}
                onRemove={removeAction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TreeEditor({
  tree,
  onUpdate,
  variableDefinitions,
}: {
  tree: EditorDialogueTree;
  onUpdate: (updated: EditorDialogueTree) => void;
  variableDefinitions: import("../../engine/core/types").VariableDefinition[];
}) {
  const [showSim, setShowSim] = useState(false);
  function updateNode(nodeId: string, updated: DialogueNode) {
    onUpdate({
      ...tree,
      nodes: tree.nodes.map((n) => (n.id === nodeId ? updated : n)),
    });
  }

  function deleteNode(nodeId: string) {
    const nodes = tree.nodes.filter((n) => n.id !== nodeId);
    const cleaned = nodes.map((n) => ({
      ...n,
      branches: n.branches.map((b) =>
        b.nextNodeId === nodeId ? { ...b, nextNodeId: null } : b
      ),
    }));
    const startNodeId = tree.startNodeId === nodeId ? (cleaned[0]?.id ?? "") : tree.startNodeId;
    const nodePositions = { ...(tree.nodePositions ?? {}) };
    delete nodePositions[nodeId];
    onUpdate({ ...tree, nodes: cleaned, startNodeId, nodePositions });
  }

  function addNode() {
    const offsetX = 100 + tree.nodes.length * 20;
    const offsetY = 100 + tree.nodes.length * 20;
    const { node: newNode, position } = createDefaultNode(offsetX, offsetY);
    const nodes = [...tree.nodes, newNode];
    const startNodeId = tree.startNodeId || newNode.id;
    const nodePositions = { ...(tree.nodePositions ?? {}), [newNode.id]: position };
    onUpdate({ ...tree, nodes, startNodeId, nodePositions });
  }

  return (
    <div className="dialogue-tree-editor">
      {showSim && (
        <DialogueSimulator
          tree={tree}
          variableDefinitions={variableDefinitions}
          onClose={() => setShowSim(false)}
        />
      )}
      <div className="dialogue-tree-fields">
        <label className="dialogue-field">
          <span>Tree Name</span>
          <input
            className="ed-input ed-input-sm"
            value={tree.name}
            onChange={(e) => onUpdate({ ...tree, name: e.target.value })}
          />
        </label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label className="dialogue-field" style={{ flex: 1, marginBottom: 0 }}>
            <span>Actor ID</span>
            <input
              className="ed-input ed-input-sm"
              value={tree.actorId ?? ""}
              onChange={(e) => onUpdate({ ...tree, actorId: e.target.value })}
              placeholder="Optional NPC actor ID"
            />
          </label>
          <button
            className="btn btn-primary btn-xs"
            onClick={() => setShowSim(true)}
            title="Test this dialogue tree in the simulator"
            style={{ alignSelf: "flex-end", marginBottom: 2 }}
          >
            ▶ Test
          </button>
        </div>
        <label className="dialogue-field">
          <span>Start Node</span>
          <select
            className="ed-input ed-input-sm"
            value={tree.startNodeId}
            onChange={(e) => onUpdate({ ...tree, startNodeId: e.target.value })}
          >
            <option value="">(none)</option>
            {tree.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.speaker}: {n.text.substring(0, 30)}{n.text.length > 30 ? "…" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="dialogue-field">
          <span>On-Start Flag</span>
          <input
            className="ed-input ed-input-sm"
            value={tree.onStartFlag ?? ""}
            onChange={(e) => onUpdate({ ...tree, onStartFlag: e.target.value || undefined })}
            placeholder="Flag set when dialogue starts"
          />
        </label>
        <label className="dialogue-field">
          <span>On-End Flag</span>
          <input
            className="ed-input ed-input-sm"
            value={tree.onEndFlag ?? ""}
            onChange={(e) => onUpdate({ ...tree, onEndFlag: e.target.value || undefined })}
            placeholder="Flag set when dialogue ends"
          />
        </label>
      </div>

      <div className="dialogue-nodes-header">
        <span>Nodes ({tree.nodes.length})</span>
        <div style={{ display: "flex", gap: 4 }}>
          {tree.startNodeId && (
            <button
              className="btn btn-ghost btn-xs"
              title="Scroll to start node"
              onClick={() => {
                const el = document.getElementById(`dnode-${tree.startNodeId}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              ↑ Start Node
            </button>
          )}
          <TutorialBubble title="Add Dialogue Node" description="Add a new dialogue node to this tree. Each node represents one line of NPC speech, optionally with player response branches." preferSide="below">
            <button className="btn btn-ghost btn-xs" onClick={addNode}>+ Add Node</button>
          </TutorialBubble>
        </div>
      </div>
      <div className="dialogue-nodes-list">
        {tree.nodes.map((node) => (
          <NodeEditor
            key={node.id}
            node={node}
            allNodes={tree.nodes}
            onUpdate={(updated) => updateNode(node.id, updated)}
            onDelete={() => deleteNode(node.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function DialogueTreePanel() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (state.pendingDialogueTreeId && project) {
      const trees = project.dialogueTrees ?? [];
      const tree = trees.find((t) => t.id === state.pendingDialogueTreeId);
      if (tree) {
        setSelectedTreeId(tree.id);
      }
      dispatch({ type: "CLEAR_PENDING_DIALOGUE_TREE" });
    }
  }, [state.pendingDialogueTreeId]);

  if (!project) return null;

  const trees = project.dialogueTrees ?? [];
  const selectedTree = trees.find((t) => t.id === selectedTreeId) ?? null;

  function handleAdd() {
    if (!newName.trim()) return;
    const { node: startNode, position } = createDefaultNode();
    const tree: EditorDialogueTree = {
      id: generateId("dtree"),
      name: newName.trim(),
      startNodeId: startNode.id,
      nodes: [startNode],
      nodePositions: { [startNode.id]: position },
    };
    dispatch({ type: "ADD_DIALOGUE_TREE", tree });
    setSelectedTreeId(tree.id);
    setShowNew(false);
    setNewName("");
  }

  function handleUpdate(updated: EditorDialogueTree) {
    dispatch({ type: "UPDATE_DIALOGUE_TREE", treeId: updated.id, tree: updated });
  }

  function handleDelete(treeId: string) {
    dispatch({ type: "DELETE_DIALOGUE_TREE", treeId });
    if (selectedTreeId === treeId) setSelectedTreeId(null);
  }

  return (
    <div className="tab-panel dialogue-panel">
      <div className="panel-header">
        <span>Dialogue Trees</span>
        <TutorialBubble title="New Dialogue Tree" description="Create a new dialogue tree. Each tree is a self-contained conversation with an NPC, containing nodes and branches." preferSide="below">
          <button className="btn btn-ghost btn-xs" onClick={() => setShowNew(true)}>+</button>
        </TutorialBubble>
      </div>
      {showNew && (
        <div className="inline-form">
          <input
            className="ed-input ed-input-sm"
            autoFocus
            placeholder="Dialogue tree name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setShowNew(false); setNewName(""); }
            }}
          />
          <button className="btn btn-primary btn-xs" onClick={handleAdd}>Add</button>
          <button className="btn btn-ghost btn-xs" onClick={() => { setShowNew(false); setNewName(""); }}>✕</button>
        </div>
      )}
      <div className="dialogue-split">
        <div className="dialogue-tree-list">
          {trees.length === 0 && <div className="entity-empty">No dialogue trees yet.</div>}
          {trees.map((t) => (
            <div
              key={t.id}
              className={`entity-row${selectedTreeId === t.id ? " selected" : ""}`}
              onClick={() => setSelectedTreeId(t.id)}
            >
              <span className="entity-icon">💬</span>
              <span className="entity-name">{t.name}</span>
              <span className="entity-id">{t.id}</span>
              <button
                className="btn btn-danger btn-xs"
                onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
              >✕</button>
            </div>
          ))}
        </div>
        {selectedTree && (
          <div className="dialogue-tree-detail">
            <TreeEditor tree={selectedTree} onUpdate={handleUpdate} variableDefinitions={project.variableDefinitions ?? []} />
          </div>
        )}
      </div>
    </div>
  );
}
