import { useState } from "react";
import { useEditor } from "../store";
import {
  createBlankProject,
  getStorageProvider,
  saveProject,
  loadProject,
  importProjectFromJson,
  exportProjectAsJson,
} from "../utils/projectStorage";
import { createSampleProject } from "../utils/sampleProject";
import DocsView from "./DocsView";
import type { EditorProject } from "../types";
import type { BundledTemplateMeta } from "../../shared/EditorStorageProvider";
import { toast } from "../../hooks/use-toast";

interface BundledTemplateProvider {
  listBundledTemplates?: () => Promise<BundledTemplateMeta[]>;
  createProjectFromBundledTemplate?: (templateId: string) => Promise<EditorProject>;
}

async function createProjectFromBundledTemplate(): Promise<EditorProject | null> {
  const provider = getStorageProvider() as BundledTemplateProvider;
  if (typeof provider.createProjectFromBundledTemplate !== "function") {
    return null;
  }

  let templateId = "bork";
  if (typeof provider.listBundledTemplates === "function") {
    try {
      const templates = await provider.listBundledTemplates();
      const preferred = templates.find((template) => template.id === "bork") ?? templates[0];
      if (preferred) {
        templateId = preferred.id;
      }
    } catch (error) {
      console.warn("[ProjectsView] Could not list bundled templates, defaulting to 'bork'.", error);
    }
  }

  return provider.createProjectFromBundledTemplate(templateId);
}

export default function ProjectsView() {
  const { state, dispatch, openProject, deleteProjectById, deleteInFlightIds } = useEditor();
  const [showNew, setShowNew] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pendingAction, setPendingAction] = useState<null | "create" | "sample" | "import">(null);

  function finishProjectCreation(project: EditorProject) {
    saveProject(project);
    dispatch({ type: "CREATE_PROJECT", project });
  }

  function handleCreate() {
    if (!newTitle.trim() || pendingAction) return;
    setPendingAction("create");
    try {
      const project = createBlankProject(newTitle.trim());
      finishProjectCreation(project);
      setShowNew(false);
      setNewTitle("");
    } catch (error) {
      toast({
        title: "Could not create project",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleLoadSample() {
    if (pendingAction) return;
    setPendingAction("sample");
    try {
      const bundledProject = await createProjectFromBundledTemplate();
      if (bundledProject) {
        dispatch({ type: "CREATE_PROJECT", project: bundledProject });
        return;
      }
    } catch (error) {
      console.error("[ProjectsView] Failed to create bundled sample project:", error);
      toast({
        title: "Could not load sample",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
      setPendingAction(null);
      return;
    }

    try {
      const project = createSampleProject();
      finishProjectCreation(project);
    } catch (error) {
      toast({
        title: "Could not load sample",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleImport() {
    if (pendingAction) return;
    setPendingAction("import");
    const project = await importProjectFromJson();
    try {
      if (project) {
        finishProjectCreation(project);
      }
    } catch (error) {
      toast({
        title: "Could not import project",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  }

  function handleOpen(id: string) {
    openProject(id);
  }

  function handleDelete(id: string) {
    if (confirm("Delete this project? This cannot be undone.")) {
      deleteProjectById(id);
    }
  }

  function handleExport(id: string) {
    const project = loadProject(id);
    if (project) exportProjectAsJson(project);
  }

  return (
    <div className="projects-view">
      <div className="projects-header">
        <div className="projects-logo">
          <span className="logo-icon">🎮</span>
          <span className="logo-text">Adventure Engine</span>
        </div>
        <div className="projects-actions">
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New Project
          </button>
          <button className="btn btn-secondary" onClick={handleLoadSample} disabled={pendingAction !== null}>
            {pendingAction === "sample" ? "Loading Sample..." : "Load Sample"}
          </button>
          <button className="btn btn-ghost" onClick={handleImport} disabled={pendingAction !== null}>
            {pendingAction === "import" ? "Importing..." : "Import JSON"}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowDocs(true)}>
            Docs
          </button>
        </div>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">New Project</div>
            <input
              className="ed-input"
              autoFocus
              placeholder="Project title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleCreate} disabled={pendingAction !== null}>
                {pendingAction === "create" ? "Creating..." : "Create"}
              </button>
              <button
                className="btn btn-ghost"
                disabled={pendingAction !== null}
                onClick={() => setShowNew(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="projects-grid">
        {state.projects.length === 0 ? (
          <div className="projects-empty">
            <div className="empty-icon">📁</div>
            <div className="empty-title">No projects yet</div>
            <div className="empty-sub">
              Create a new project or load the sample to get started.
            </div>
          </div>
        ) : (
          state.projects.map((meta) => (
            <div
              key={meta.id}
              className="project-card"
              onClick={() => handleOpen(meta.id)}
            >
              <div className="project-card-icon">🗺️</div>
              <div className="project-card-info">
                <div className="project-card-title">{meta.title}</div>
                <div className="project-card-meta">
                  {meta.roomCount} room{meta.roomCount !== 1 ? "s" : ""} ·{" "}
                  {new Date(meta.modified).toLocaleDateString()}
                </div>
              </div>
              <div
                className="project-card-actions"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleOpen(meta.id)}
                  title="Open project"
                >
                  Open
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleExport(meta.id)}
                  title="Export as JSON"
                >
                  Export
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  disabled={deleteInFlightIds.includes(meta.id)}
                  onClick={() => handleDelete(meta.id)}
                  title="Delete project"
                >
                  {deleteInFlightIds.includes(meta.id) ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {showDocs && <DocsView onClose={() => setShowDocs(false)} />}
    </div>
  );
}
