import { useEffect, useState } from "react";
import {
  OverviewSection,
  ArchitectureSection,
  CreatingProjectsSection,
  RoomsSection,
  WideRoomsSection,
  ActorsSection,
  AnimationsSection,
  ObjectsSection,
  ObjectStatesSection,
  ItemsSection,
  AssetsSection,
  ScriptsSection,
  VisualScriptEditorSection,
  CutscenesSection,
  DialogueSection,
  ClickAdvanceDialogueSection,
  TransitionsSection,
  InteractionResolutionSection,
  CursorsSection,
  InspectorsSection,
  UndoRedoSection,
  LinterSection,
  SaveVersioningSection,
  StateModelSection,
  DebugSection,
  ExportSection,
  ProjectFileSpecSection,
  LLMGuideSection,
  TypesSection,
  SourceCodeSection,
} from "./docs/sections/index";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "creating-projects", label: "Creating Projects" },
  { id: "rooms", label: "Rooms" },
  { id: "wide-rooms", label: "Wide & Scrolling Rooms" },
  { id: "actors", label: "Actors" },
  { id: "animations", label: "Sprite Animations" },
  { id: "objects", label: "Objects" },
  { id: "object-states", label: "Object Visual States" },
  { id: "items", label: "Items" },
  { id: "assets", label: "Assets" },
  { id: "scripts", label: "Scripts & API" },
  { id: "visual-scripts", label: "Visual Script Editor" },
  { id: "cutscenes", label: "Cutscenes" },
  { id: "dialogue", label: "Dialogue Trees" },
  { id: "click-advance-dialogue", label: "Click-to-Advance Dialogue" },
  { id: "transitions", label: "Room Transitions" },
  { id: "interaction-resolution", label: "Interaction Resolution" },
  { id: "cursors", label: "Cursors" },
  { id: "inspectors", label: "Property Inspectors" },
  { id: "undo-redo", label: "Undo / Redo" },
  { id: "linter", label: "Project Linter" },
  { id: "save-versioning", label: "Save Format Versioning" },
  { id: "state-model", label: "State Model" },
  { id: "debug", label: "Debug Tools" },
  { id: "export", label: "Game Export" },
  { id: "project-file-spec", label: "Project File Spec" },
  { id: "llm-guide", label: "Creating from a Prompt" },
  { id: "types", label: "Type System" },
  { id: "source-code", label: "Source Code" },
] as const;

export default function DocsView({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<string>("overview");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="docs-overlay" onClick={onClose}>
      <div className="docs-panel" onClick={(e) => e.stopPropagation()}>
        <div className="docs-header">
          <h2 className="docs-title">Adventure Engine Documentation</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="docs-body">
          <nav className="docs-nav">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`docs-nav-item${activeSection === s.id ? " active" : ""}`}
                onClick={() => setActiveSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <div className="docs-content">
            {activeSection === "overview" && <OverviewSection />}
            {activeSection === "architecture" && <ArchitectureSection />}
            {activeSection === "creating-projects" && <CreatingProjectsSection />}
            {activeSection === "rooms" && <RoomsSection />}
            {activeSection === "wide-rooms" && <WideRoomsSection />}
            {activeSection === "actors" && <ActorsSection />}
            {activeSection === "animations" && <AnimationsSection />}
            {activeSection === "objects" && <ObjectsSection />}
            {activeSection === "object-states" && <ObjectStatesSection />}
            {activeSection === "items" && <ItemsSection />}
            {activeSection === "assets" && <AssetsSection />}
            {activeSection === "scripts" && <ScriptsSection />}
            {activeSection === "visual-scripts" && <VisualScriptEditorSection />}
            {activeSection === "cutscenes" && <CutscenesSection />}
            {activeSection === "dialogue" && <DialogueSection />}
            {activeSection === "click-advance-dialogue" && <ClickAdvanceDialogueSection />}
            {activeSection === "transitions" && <TransitionsSection />}
            {activeSection === "interaction-resolution" && <InteractionResolutionSection />}
            {activeSection === "cursors" && <CursorsSection />}
            {activeSection === "inspectors" && <InspectorsSection />}
            {activeSection === "undo-redo" && <UndoRedoSection />}
            {activeSection === "linter" && <LinterSection />}
            {activeSection === "save-versioning" && <SaveVersioningSection />}
            {activeSection === "state-model" && <StateModelSection />}
            {activeSection === "debug" && <DebugSection />}
            {activeSection === "export" && <ExportSection />}
            {activeSection === "project-file-spec" && <ProjectFileSpecSection />}
            {activeSection === "llm-guide" && <LLMGuideSection />}
            {activeSection === "types" && <TypesSection />}
            {activeSection === "source-code" && <SourceCodeSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
