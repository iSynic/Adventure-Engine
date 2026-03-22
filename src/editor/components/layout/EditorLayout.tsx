import { useState, useMemo } from "react";
import { useEditor } from "../../store";
import { useTutorial } from "../../context/TutorialContext";
import TutorialBubble from "../TutorialBubble";
import RoomCanvas from "../RoomCanvas";
import RoomList from "../RoomList";
import ToolBar from "../ToolBar";
import ObjectInspector from "../ObjectInspector";
import ExitInspector from "../ExitInspector";
import HotspotInspector from "../HotspotInspector";
import WalkboxInspector from "../WalkboxInspector";
import SpawnPointInspector from "../SpawnPointInspector";
import ActorInspector from "../ActorInspector";
import ExportModal from "../ExportModal";
import ValidationPanel from "../ValidationPanel";
import AnimationPanel from "../AnimationPanel";
import DialogueTreePanel from "../DialogueTreePanel";
import DocsView from "../../views/DocsView";
import LintView from "../../views/LintView";
import ActorsPanel from "../../panels/ActorsPanel";
import ItemsPanel from "../../panels/ItemsPanel";
import AssetsPanel from "../../panels/AssetsPanel";
import ScriptsPanel from "../../panels/ScriptsPanel";
import SettingsPanel from "../../panels/SettingsPanel";
import { useEditorShortcuts, useProjectValidation } from "../../hooks/useEditorShortcuts";
import type { EditorTab } from "../../types";
import { validateProject } from "../../../shared/validateProject";

const TABS: {
  id: EditorTab;
  label: string;
  tutorialTitle: string;
  tutorialDesc: string;
  tutorialTip?: string;
}[] = [
  {
    id: "rooms",
    label: "Rooms",
    tutorialTitle: "Rooms",
    tutorialDesc:
      "Every scene in your game is a room. Use the canvas to draw walkboxes (where the player walks), exits (doors to other rooms), hotspots (interactive areas), and spawn points (where actors appear). Select a room to open Room Settings where you can pick a background image, set dimensions, and add parallax layers.",
    tutorialTip: "Set the starting room by clicking the ▶ icon next to a room in the list.",
  },
  {
    id: "actors",
    label: "Actors",
    tutorialTitle: "Actors",
    tutorialDesc:
      "Actors are characters in your game — the player, NPCs, or anyone the player can talk to or interact with. Click an actor to open the detail panel where you can set their sprite, starting room, position, size, scale, movement speed, and player status.",
    tutorialTip: "Use the sprite picker to choose an image from the asset library instead of typing a path.",
  },
  {
    id: "items",
    label: "Items",
    tutorialTitle: "Inventory Items",
    tutorialDesc:
      "Items are objects the player picks up and carries in their inventory. Click an item to open the detail panel where you can set its name, description, and icon. The icon picker lets you choose from assets categorized as icons.",
    tutorialTip: "Items need verb handlers (e.g. 'use key on door') defined in the Scripts tab to do anything.",
  },
  {
    id: "assets",
    label: "Assets",
    tutorialTitle: "Assets",
    tutorialDesc:
      "Import images and audio files here. Use the type filter bar to browse by category — Background, Sprite, Icon, Audio, or Other. Each filter shows a count badge. Assets are used throughout the editor via dropdown pickers with thumbnail previews.",
    tutorialTip: "The editor auto-detects asset types from filenames on import. You can re-categorize any asset using its type dropdown.",
  },
  {
    id: "scripts",
    label: "Scripts",
    tutorialTitle: "Scripts",
    tutorialDesc:
      "Scripts are JavaScript functions that run when events happen — entering a room, clicking a hotspot, or using an item. Use ctx.say(), ctx.setFlag(), ctx.gotoRoom(), and more.",
    tutorialTip: "Open the documentation for the full scripting API reference.",
  },
  {
    id: "dialogue",
    label: "Dialogue",
    tutorialTitle: "Dialogue Trees",
    tutorialDesc:
      "Build branching conversations with NPCs. Create dialogue trees with speaker text, player choices, conditions, and actions. Use ctx.startDialogue(treeId) in scripts to trigger conversations.",
    tutorialTip: "Link a dialogue tree to an NPC actor's talk verb handler to start it when the player talks to them.",
  },
  {
    id: "settings",
    label: "Settings",
    tutorialTitle: "Project Settings",
    tutorialDesc:
      "Configure project-wide settings including per-verb cursor images. Assign imported image assets to verbs so the cursor changes based on the active interaction mode.",
    tutorialTip: "Import cursor images in the Assets tab first, then assign them here.",
  },
  {
    id: "linter",
    label: "Linter",
    tutorialTitle: "Project Linter",
    tutorialDesc:
      "See all validation issues in your project at a glance. Missing assets, broken references, unreachable rooms, and more are checked automatically. Click an issue to navigate to the relevant entity.",
    tutorialTip: "The linter re-runs automatically when your project changes.",
  },
];

export default function EditorLayout() {
  const { state, dispatch, saveCurrentProject, closeProject, canUndo, canRedo, saveInFlight, desktopDiagnostics } = useEditor();
  const { enabled: tutorialEnabled, toggle: toggleTutorial } = useTutorial();
  const [showDocs, setShowDocs] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEditorShortcuts(saveCurrentProject, dispatch);

  const {
    validationErrors,
    validationAction,
    handlePlayClick,
    handleTestRoomClick,
    handleExportClick,
    dismissValidation,
    proceedValidation,
  } = useProjectValidation(state.currentProject, state.selectedRoomId, dispatch, setShowExport);

  const project = state.currentProject;

  const lintCounts = useMemo(() => {
    if (!project) return { errors: 0, warnings: 0, total: 0 };
    const validatable = {
      ...project,
      scripts: project.scripts.map((s) => ({ name: s.name, body: s.body, steps: s.steps })),
    };
    const result = validateProject(validatable);
    const errors = result.errors.filter((e) => e.severity === "error").length;
    const warnings = result.errors.filter((e) => e.severity === "warning").length;
    return { errors, warnings, total: errors + warnings };
  }, [project]);

  if (!project) return null;

  const activeTab = state.activeTab;

  return (
    <div className="editor-layout">
      <div className="editor-topbar">
        <button className="btn btn-ghost btn-sm" onClick={closeProject}>
          ← Projects
        </button>
        <span className="editor-project-title">
          {project.title}
          {state.isDirty && <span className="dirty-dot" title="Unsaved changes"> •</span>}
        </span>
        <div className="editor-undo-redo">
          <button
            className="btn btn-ghost btn-sm"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={() => dispatch({ type: "UNDO" })}
          >
            ↩
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo}
            onClick={() => dispatch({ type: "REDO" })}
          >
            ↪
          </button>
        </div>
        <div className="editor-topbar-actions">
          <TutorialBubble
            title="Documentation"
            description="Open the built-in Adventure Engine documentation. Browse the scripting API, room configuration guide, and game project tutorials without leaving the editor."
            preferSide="below"
          >
            <button
              className="btn btn-ghost btn-sm"
              title="Open documentation"
              onClick={() => setShowDocs(true)}
            >
              Docs
            </button>
          </TutorialBubble>
          <TutorialBubble
            title="Tutorial Mode"
            description="When enabled, hover over any tool, tab, or button to see a floating description of what it does and how to use it."
            preferSide="below"
          >
            <button
              className={`btn btn-sm tutorial-toggle${tutorialEnabled ? " tutorial-toggle--on" : ""}`}
              onClick={toggleTutorial}
              title={tutorialEnabled ? "Disable tutorial hints" : "Enable tutorial hints"}
            >
              {tutorialEnabled ? "? On" : "? Off"}
            </button>
          </TutorialBubble>
          <TutorialBubble
            title="Export"
            description="Export your game as a downloadable .zip file. All assets, scripts, and content are bundled together so you can share or host your game."
            preferSide="below"
          >
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleExportClick}
              title="Export game as playable zip"
            >
              Export
            </button>
          </TutorialBubble>
          <TutorialBubble
            title="Save"
            description="Save your project to browser storage. You can also press Ctrl+S (Cmd+S on Mac) to quick-save at any time."
            preferSide="below"
          >
            <button
              className="btn btn-ghost btn-sm"
              onClick={saveCurrentProject}
              title={saveInFlight ? "Save is currently being written to disk" : "Save (Ctrl+S)"}
              disabled={saveInFlight}
            >
              {saveInFlight ? "Saving..." : "Save"}
            </button>
          </TutorialBubble>
          {desktopDiagnostics?.projectsRoot && (
            <span
              className="btn btn-ghost btn-sm"
              title={`Desktop projects root: ${desktopDiagnostics.projectsRoot}`}
              style={{ cursor: "default", opacity: 0.8 }}
            >
              Desktop
            </span>
          )}
          {state.selectedRoomId && (
            <TutorialBubble
              title="Test Room"
              description="Launch the game starting directly in the currently selected room, skipping the configured starting room. Great for testing individual rooms without replaying from the beginning."
              preferSide="below"
            >
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleTestRoomClick}
                title={`Test room: ${state.selectedRoomId}`}
              >
                ⚡ Test Room
              </button>
            </TutorialBubble>
          )}
          <TutorialBubble
            title="Play"
            description="Launch your game in the built-in player. Test your rooms, interactions, dialogue, and scripts in real time. Click 'Back to Editor' to return to the editor."
            preferSide="below"
          >
            <button
              className="btn btn-primary btn-sm"
              onClick={handlePlayClick}
            >
              ▶ Play
            </button>
          </TutorialBubble>
        </div>
      </div>

      <div className="editor-tabs">
        {TABS.map((tab) => (
          <TutorialBubble
            key={tab.id}
            title={tab.tutorialTitle}
            description={tab.tutorialDesc}
            tip={tab.tutorialTip}
            preferSide="below"
          >
            <button
              className={`editor-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => dispatch({ type: "SET_TAB", tab: tab.id })}
            >
              {tab.label}
              {tab.id === "linter" && lintCounts.total > 0 && (
                <span
                  style={{
                    marginLeft: 4,
                    background: lintCounts.errors > 0 ? "#f87171" : "#fbbf24",
                    color: "#000",
                    borderRadius: 8,
                    padding: "0 5px",
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: "16px",
                    display: "inline-block",
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {lintCounts.total}
                </span>
              )}
            </button>
          </TutorialBubble>
        ))}
      </div>

      <div className="editor-body">
        {activeTab === "rooms" && (
          <>
            <div className="editor-sidebar">
              <RoomList />
            </div>
            <div className="editor-canvas-area">
              <ToolBar />
              <RoomCanvas />
            </div>
            {state.selectedEntity && (
              <div className="editor-inspector">
                {state.selectedEntity.type === "object" && <ObjectInspector />}
                {state.selectedEntity.type === "exit" && <ExitInspector />}
                {state.selectedEntity.type === "hotspot" && <HotspotInspector />}
                {state.selectedEntity.type === "walkbox" && <WalkboxInspector />}
                {state.selectedEntity.type === "spawn" && <SpawnPointInspector />}
                {state.selectedEntity.type === "actor" && (() => {
                  const actor = project.actors.find((a) => a.id === state.selectedEntity!.id);
                  return actor ? <ActorInspector actor={actor} project={project} dispatch={dispatch} /> : null;
                })()}
              </div>
            )}
          </>
        )}
        {activeTab === "actors" && (
          <div className="editor-full-panel actors-full-panel">
            <ActorsPanel />
            <AnimationPanel />
          </div>
        )}
        {activeTab === "items" && (
          <div className="editor-full-panel">
            <ItemsPanel />
          </div>
        )}
        {activeTab === "assets" && (
          <div className="editor-full-panel">
            <AssetsPanel />
          </div>
        )}
        {activeTab === "scripts" && (
          <div className="editor-full-panel">
            <ScriptsPanel />
          </div>
        )}
        {activeTab === "dialogue" && (
          <div className="editor-full-panel">
            <DialogueTreePanel />
          </div>
        )}
        {activeTab === "settings" && (
          <div className="editor-full-panel">
            <SettingsPanel />
          </div>
        )}
        {activeTab === "linter" && (
          <div className="editor-full-panel">
            <LintView />
          </div>
        )}
      </div>
      {showDocs && <DocsView onClose={() => setShowDocs(false)} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {validationAction && (
        <ValidationPanel
          errors={validationErrors}
          action={validationAction}
          onDismiss={dismissValidation}
          onProceed={proceedValidation}
        />
      )}
    </div>
  );
}
