import { useState } from "react";
import { useEditor } from "../store";
import {
  createBlankProject,
  saveProject,
  loadProject,
  importProjectFromJson,
  exportProjectAsJson,
} from "../utils/projectStorage";
import { createSampleProject } from "../utils/sampleProject";
import DocsView from "./DocsView";

export default function ProjectsView() {
  const { state, dispatch, openProject, deleteProjectById } = useEditor();
  const [showNew, setShowNew] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function handleCreate() {
    if (!newTitle.trim()) return;
    const project = createBlankProject(newTitle.trim());
    saveProject(project);
    dispatch({ type: "CREATE_PROJECT", project });
    setShowNew(false);
    setNewTitle("");
  }

  function handleLoadSample() {
    const project = createSampleProject();
    saveProject(project);
    dispatch({ type: "CREATE_PROJECT", project });
  }

  async function handleImport() {
    const project = await importProjectFromJson();
    if (project) {
      saveProject(project);
      dispatch({ type: "CREATE_PROJECT", project });
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
          <button className="btn btn-secondary" onClick={handleLoadSample}>
            Load Sample
          </button>
          <button className="btn btn-ghost" onClick={handleImport}>
            Import JSON
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
              <button className="btn btn-primary" onClick={handleCreate}>
                Create
              </button>
              <button
                className="btn btn-ghost"
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
                  onClick={() => handleDelete(meta.id)}
                  title="Delete project"
                >
                  Delete
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
