import { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
import { useEditor } from "../store";
import { exportGame } from "../utils/exportGame";
import type { ExportSettings } from "../utils/playerTemplate";
import {
  exportPlayableBuild,
  type PlayableExportResult,
  type PlayableExportOptions,
} from "../export/exportPlayableBuild";
import { validateProject } from "../export/validateProject";
import { validateManifestCompleteness } from "../../shared/validateProject";
import type { ValidationError, ValidationResult, ExportManifest } from "../../shared/exportSchema";
import { EXPORT_SCHEMA_VERSION } from "../../shared/exportSchema";
import TutorialBubble from "./TutorialBubble";

type ExportTab = "zip" | "playable";
type ExportPhase = "idle" | "validating" | "exporting" | "done";

interface ExportModalProps {
  onClose: () => void;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

// ─── ValidationPanel ──────────────────────────────────────────────────────────

interface ValidationPanelProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  phase: ExportPhase;
  exportError: string | null;
}

function ValidationPanel({ errors, warnings, phase, exportError }: ValidationPanelProps) {
  const hasAny = errors.length > 0 || warnings.length > 0;
  return (
    <>
      {hasAny && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #444",
            borderRadius: 4,
            padding: "8px 10px",
            marginBottom: 10,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 10, color: "#888", marginBottom: 6 }}>
            Errors block the export and must be fixed. Warnings are advisory — you can export with warnings.
          </div>
          {errors.length > 0 && (
            <div style={{ marginBottom: warnings.length > 0 ? 8 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#f87171", marginBottom: 4 }}>
                Errors ({errors.length})
              </div>
              {errors.map((err, i) => (
                <div key={`err-${i}`} style={{ fontSize: 11, color: "#f87171", padding: "2px 0" }}>
                  ✖ {err.message}
                </div>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#fbbf24", marginBottom: 4 }}>
                Warnings ({warnings.length})
              </div>
              {warnings.map((warn, i) => (
                <div key={`warn-${i}`} style={{ fontSize: 11, color: "#fbbf24", padding: "2px 0" }}>
                  ⚠ {warn.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {phase === "done" && errors.length === 0 && warnings.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: "#4ade80",
            marginBottom: 10,
            padding: "6px 10px",
            background: "#1a2a1a",
            border: "1px solid #4ade80",
            borderRadius: 4,
          }}
        >
          ✓ Export completed successfully.
        </div>
      )}
      {exportError && <div className="export-error">{exportError}</div>}
    </>
  );
}

// ─── DownloadPanel ────────────────────────────────────────────────────────────

interface DownloadPanelProps {
  activeTab: ExportTab;
  phase: ExportPhase;
  pendingWarnings: boolean;
  runtimeChecking: boolean;
  runtimeAvailable: boolean | null;
  onOpenPreview: () => void;
  onConfirmWarningsAndExport: () => void;
  onValidateAndExport: () => void;
  onZipExport: () => void;
  onClose: () => void;
}

function DownloadPanel({
  activeTab, phase, pendingWarnings,
  runtimeChecking, runtimeAvailable,
  onOpenPreview, onConfirmWarningsAndExport, onValidateAndExport, onZipExport, onClose,
}: DownloadPanelProps) {
  if (activeTab === "zip") {
    return (
      <>
        <button className="btn btn-primary" onClick={onZipExport} disabled={phase === "exporting"}>
          {phase === "exporting" ? "Exporting..." : "Download .zip"}
        </button>
        <button className="btn btn-ghost" onClick={onClose} disabled={phase === "exporting"}>
          Cancel
        </button>
      </>
    );
  }

  if (phase === "done") {
    return (
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <button className="btn btn-primary" onClick={onOpenPreview} style={{ flex: 1 }}>
          Open Preview
        </button>
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  if (pendingWarnings) {
    return (
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <button
          className="btn btn-primary"
          onClick={onConfirmWarningsAndExport}
          style={{ flex: 1, background: "#78350f", borderColor: "#fbbf24" }}
        >
          Export with Warnings
        </button>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        className="btn btn-primary"
        onClick={onValidateAndExport}
        disabled={phase === "validating" || phase === "exporting" || runtimeChecking || runtimeAvailable === false}
      >
        {phase === "validating" ? "Validating..." : phase === "exporting" ? "Exporting..." : "Validate & Export"}
      </button>
      <button className="btn btn-ghost" onClick={onClose} disabled={phase === "exporting" || phase === "validating"}>
        Cancel
      </button>
    </>
  );
}

function resolvePublicUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (path.startsWith("/")) return path;
  return base + "/" + path;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const { state } = useEditor();
  const project = state.currentProject;

  const [activeTab, setActiveTab] = useState<ExportTab>("playable");
  const [gameTitle, setGameTitle] = useState(project?.title || "");
  const [authorName, setAuthorName] = useState("");
  const [mode, setMode] = useState<"inline" | "multifile">("multifile");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [runtimeAvailable, setRuntimeAvailable] = useState<boolean | null>(null);
  const [runtimeChecking, setRuntimeChecking] = useState(true);
  const [pendingWarnings, setPendingWarnings] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastZipBlob, setLastZipBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkRuntime() {
      setRuntimeChecking(true);
      try {
        const url = resolvePublicUrl("playable-runtime/playable.js");
        const resp = await fetch(url, { method: "HEAD" });
        if (cancelled) return;
        if (!resp.ok) {
          setRuntimeAvailable(false);
        } else {
          const len = resp.headers.get("content-length");
          if (len !== null && parseInt(len, 10) === 0) {
            setRuntimeAvailable(false);
          } else if (len !== null) {
            setRuntimeAvailable(true);
          } else {
            const probeResp = await fetch(url);
            if (cancelled) return;
            const text = await probeResp.text();
            setRuntimeAvailable(text.length > 0);
          }
        }
      } catch {
        if (!cancelled) setRuntimeAvailable(false);
      } finally {
        if (!cancelled) setRuntimeChecking(false);
      }
    }
    checkRuntime();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetState = useCallback(() => {
    setPhase("idle");
    setError(null);
    setValidationErrors([]);
    setPendingWarnings(false);
    setPreviewUrl(null);
    setLastZipBlob(null);
  }, []);

  if (!project) return null;

  const preflightErrors = validationErrors.filter((e) => e.severity === "error");
  const preflightWarnings = validationErrors.filter((e) => e.severity === "warning");

  async function doExport() {
    if (!project) return;
    setPhase("exporting");
    setError(null);
    try {
      const exportOpts: PlayableExportOptions = {
        title: gameTitle.trim() || undefined,
        author: authorName.trim() || undefined,
      };
      const result: PlayableExportResult = await exportPlayableBuild(project, exportOpts);
      if (!result.success) {
        setValidationErrors(result.validation.errors);
        setError(result.error || "Export failed.");
        setPhase("idle");
        return;
      }

      if (result.zipBlob) {
        setLastZipBlob(result.zipBlob);
        const exportedTitle = gameTitle.trim() || project.title;
        const url = URL.createObjectURL(result.zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = sanitizeFileName(exportedTitle || "game") + "-playable.zip";
        a.click();
        URL.revokeObjectURL(url);
      }

      const allWarnings = result.validation.errors.filter((e) => e.severity === "warning");
      if (allWarnings.length > 0) {
        setValidationErrors(allWarnings);
      }
      setPhase("done");
    } catch (e) {
      setError(String(e));
      setPhase("idle");
    }
  }

  async function handleValidateAndExport() {
    if (!project) return;
    setPhase("validating");
    setError(null);
    setValidationErrors([]);
    setPendingWarnings(false);

    const result: ValidationResult = validateProject(project);
    const allErrors = [...result.errors];

    const resolvedTitle = gameTitle.trim() || project.title;
    const manifest: ExportManifest = {
      gameId: project.id,
      title: resolvedTitle,
      version: "1.0.0",
      exportSchemaVersion: EXPORT_SCHEMA_VERSION,
      startRoomId: project.startingRoom,
      playerActorId: project.defaultPlayerActorId,
      assetBasePath: "assets/",
      data: {
        rooms: "data/rooms.json",
        actors: "data/actors.json",
        objects: "data/objects.json",
        inventory: "data/inventory.json",
        scripts: "data/scripts.json",
        dialogue: "data/dialogue.json",
        project: "data/project.json",
      },
    };
    const manifestResult = validateManifestCompleteness(manifest, project);
    allErrors.push(...manifestResult.errors);

    const errors = allErrors.filter((e) => e.severity === "error");
    const warnings = allErrors.filter((e) => e.severity === "warning");

    setValidationErrors(allErrors);

    if (errors.length > 0) {
      setError("Validation failed. Fix the errors above before exporting.");
      setPhase("idle");
      return;
    }

    if (warnings.length > 0) {
      setPendingWarnings(true);
      setPhase("idle");
      return;
    }

    await doExport();
  }

  async function handleConfirmWarningsAndExport() {
    setPendingWarnings(false);
    await doExport();
  }

  async function handleZipExport() {
    if (!project) return;
    setPhase("exporting");
    setError(null);
    setValidationErrors([]);
    try {
      const settings: ExportSettings = {
        gameTitle: gameTitle.trim() || project.title,
        authorName: authorName.trim(),
        mode,
      };
      await exportGame(project, settings);
      onClose();
    } catch (e) {
      setError(String(e));
      setPhase("idle");
    }
  }

  function getMimeForExt(ext: string): string {
    const mimeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      mp3: "audio/mpeg",
      ogg: "audio/ogg",
      wav: "audio/wav",
      json: "application/json",
      js: "application/javascript",
      css: "text/css",
      html: "text/html",
      txt: "text/plain",
    };
    return mimeMap[ext] || "application/octet-stream";
  }

  async function fileToDataUrl(entry: JSZip.JSZipObject, name: string): Promise<string> {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const mime = getMimeForExt(ext);
    const isText = /\.(json|js|css|html|txt|svg)$/i.test(name);
    if (isText) {
      const text = await entry.async("text");
      return `data:${mime};base64,` + btoa(unescape(encodeURIComponent(text)));
    }
    const arrayBuf = await entry.async("arraybuffer");
    const uint8 = new Uint8Array(arrayBuf);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return `data:${mime};base64,${btoa(binary)}`;
  }

  function rewriteAssetPaths(jsonStr: string, assetDataUrls: Record<string, string>): string {
    let result = jsonStr;
    const sortedKeys = Object.keys(assetDataUrls).sort((a, b) => b.length - a.length);
    for (const assetPath of sortedKeys) {
      const dataUrl = assetDataUrls[assetPath];
      const escaped = JSON.stringify(assetPath).slice(1, -1);
      const escapedDataUrl = JSON.stringify(dataUrl).slice(1, -1);
      result = result.split(escaped).join(escapedDataUrl);
    }
    return result;
  }

  async function handleOpenPreview() {
    if (!lastZipBlob) return;
    try {
      const zip = await JSZip.loadAsync(lastZipBlob);
      const indexFile = zip.file("index.html");
      if (!indexFile) {
        setError("Could not find index.html in the exported ZIP.");
        return;
      }

      const assetDataUrls: Record<string, string> = {};
      const dataFileContents: Record<string, string> = {};
      const fileMap: Record<string, string> = {};

      const fileEntries = zip.filter((_, file) => !file.dir && file.name !== "index.html");
      for (const entry of fileEntries) {
        const name = entry.name;
        const dataUrl = await fileToDataUrl(entry, name);
        fileMap[name] = dataUrl;
        fileMap["./" + name] = dataUrl;

        if (name.startsWith("assets/")) {
          assetDataUrls[name] = dataUrl;
        }
        if (name.startsWith("data/") && name.endsWith(".json")) {
          dataFileContents[name] = await entry.async("text");
        }
      }

      for (const [dataPath, content] of Object.entries(dataFileContents)) {
        const rewritten = rewriteAssetPaths(content, assetDataUrls);
        const mime = "application/json";
        const encoded = btoa(unescape(encodeURIComponent(rewritten)));
        const dataUrl = `data:${mime};base64,${encoded}`;
        fileMap[dataPath] = dataUrl;
        fileMap["./" + dataPath] = dataUrl;
      }

      const manifestFile = zip.file("manifest.json");
      if (manifestFile) {
        const manifestText = await manifestFile.async("text");
        const rewritten = rewriteAssetPaths(manifestText, assetDataUrls);
        const encoded = btoa(unescape(encodeURIComponent(rewritten)));
        const dataUrl = `data:application/json;base64,${encoded}`;
        fileMap["manifest.json"] = dataUrl;
        fileMap["./manifest.json"] = dataUrl;
      }

      const originalHtml = await indexFile.async("text");

      const fetchInterceptScript = `<script>
(function() {
  var __ZIP_FILES__ = ${JSON.stringify(fileMap)};
  var _origFetch = window.fetch;
  window.fetch = function(url, opts) {
    var key = (typeof url === 'string') ? url : url.toString();
    if (key.startsWith('./')) key = key;
    else if (!key.startsWith('http') && !key.startsWith('data:')) key = './' + key;
    if (__ZIP_FILES__[key]) {
      return _origFetch(__ZIP_FILES__[key], opts);
    }
    return _origFetch(url, opts);
  };
})();
</script>`;

      const modifiedHtml = originalHtml.replace("<head>", "<head>" + fetchInterceptScript);

      const blob = new Blob([modifiedHtml], { type: "text/html" });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError("Failed to load preview: " + String(e));
    }
  }

  if (previewUrl) {
    return (
      <div
        className="modal-overlay"
        style={{
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "90vw",
            height: "90vh",
            background: "#111",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            border: "1px solid #333",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
              borderBottom: "1px solid #333",
            }}
          >
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
              Export Preview
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
              style={{ padding: "4px 12px", fontSize: 12 }}
            >
              Close Preview
            </button>
          </div>
          <iframe
            src={previewUrl}
            sandbox="allow-scripts"
            style={{
              flex: 1,
              border: "none",
              borderRadius: "0 0 8px 8px",
              background: "#000",
            }}
            title="Export Preview"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal export-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 440 }}
      >
        <div className="modal-title">Export Game</div>

        {/* ─── Tab bar ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "1px solid #333",
            marginBottom: 12,
          }}
        >
          <TutorialBubble title="Playable Build" description="Export a self-contained playable game as a ZIP. The output can be served from any static file host. Includes the runtime engine, all assets, and game data." preferSide="below">
            <button
              style={{
                flex: 1,
                padding: "8px 12px",
                background: activeTab === "playable" ? "#2a2a3e" : "transparent",
                color: activeTab === "playable" ? "#fff" : "#888",
                border: "none",
                borderBottom:
                  activeTab === "playable"
                    ? "2px solid #6366f1"
                    : "2px solid transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeTab === "playable" ? 600 : 400,
              }}
              onClick={() => {
                setActiveTab("playable");
                resetState();
              }}
            >
              Playable Build
            </button>
          </TutorialBubble>
          <TutorialBubble title="ZIP Export" description="Export the raw project files as a ZIP archive. Contains the JSON project file and all assets. Useful for backup or sharing with other users." preferSide="below">
            <button
              style={{
                flex: 1,
                padding: "8px 12px",
                background: activeTab === "zip" ? "#2a2a3e" : "transparent",
                color: activeTab === "zip" ? "#fff" : "#888",
                border: "none",
                borderBottom:
                  activeTab === "zip"
                    ? "2px solid #6366f1"
                    : "2px solid transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeTab === "zip" ? 600 : 400,
              }}
              onClick={() => {
              setActiveTab("zip");
              resetState();
            }}
          >
            ZIP Export
          </button>
          </TutorialBubble>
        </div>

        {/* ─── Playable tab form ───────────────────────────────────────────── */}
        {activeTab === "playable" && (
          <div className="export-form">
            <p
              style={{
                fontSize: 12,
                color: "#999",
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              Export a self-contained playable build. The output ZIP can be
              extracted and served from any static file host.
            </p>

            {runtimeChecking && (
              <div
                style={{
                  background: "#1a1a2e",
                  border: "1px solid #444",
                  borderRadius: 4,
                  padding: "8px 12px",
                  marginBottom: 10,
                  fontSize: 12,
                  color: "#888",
                }}
              >
                Checking runtime bundle...
              </div>
            )}

            {!runtimeChecking && runtimeAvailable === false && (
              <div
                style={{
                  background: "#2a1a1a",
                  border: "1px solid #f87171",
                  borderRadius: 4,
                  padding: "10px 12px",
                  marginBottom: 10,
                  fontSize: 12,
                  color: "#f87171",
                  lineHeight: 1.5,
                }}
              >
                <strong>Runtime not built</strong> — The playable runtime bundle
                was not found. Run{" "}
                <code
                  style={{
                    background: "#333",
                    padding: "1px 4px",
                    borderRadius: 2,
                  }}
                >
                  pnpm run build:runtime
                </code>{" "}
                to generate it, then reopen this dialog.
              </div>
            )}

            <button
              style={{
                cursor: "pointer",
                background: "none",
                border: "1px solid #444",
                borderRadius: 4,
                color: "#aaa",
                padding: "6px 10px",
                fontSize: 12,
                width: "100%",
                textAlign: "left",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <span
                style={{
                  display: "inline-block",
                  transform: advancedOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                  fontSize: 10,
                }}
              >
                ▶
              </span>
              Advanced Options
            </button>

            {advancedOpen && (
              <div
                style={{
                  border: "1px solid #333",
                  borderRadius: 4,
                  padding: "8px 10px",
                  marginBottom: 10,
                  background: "#1a1a2e",
                }}
              >
                <label
                  className="export-label"
                  style={{ marginBottom: 6, display: "block" }}
                >
                  Game Title
                  <input
                    className="ed-input"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    placeholder={project.title || "My Adventure Game"}
                    style={{ marginTop: 4 }}
                  />
                </label>
                <label
                  className="export-label"
                  style={{ marginBottom: 0, display: "block" }}
                >
                  Author Name
                  <input
                    className="ed-input"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="(optional)"
                    style={{ marginTop: 4 }}
                  />
                </label>
              </div>
            )}

            <ValidationPanel
              errors={preflightErrors}
              warnings={preflightWarnings}
              phase={phase}
              exportError={error}
            />
          </div>
        )}

        {/* ─── ZIP tab form ────────────────────────────────────────────────── */}
        {activeTab === "zip" && (
          <div className="export-form">
            <label className="export-label">
              Game Title
              <input
                className="ed-input"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder="My Adventure Game"
              />
            </label>

            <label className="export-label">
              Author Name
              <input
                className="ed-input"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="(optional)"
              />
            </label>

            <div className="export-label">
              Export Mode
              <div className="export-radio-group">
                <label className="export-radio">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={mode === "multifile"}
                    onChange={() => setMode("multifile")}
                  />
                  <div>
                    <strong>Multi-file (recommended)</strong>
                    <div className="export-radio-desc">
                      Assets are saved as separate files. Smaller HTML, better
                      for hosting.
                    </div>
                  </div>
                </label>
                <label className="export-radio">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={mode === "inline"}
                    onChange={() => setMode("inline")}
                  />
                  <div>
                    <strong>Single file</strong>
                    <div className="export-radio-desc">
                      All assets embedded in one HTML file. Easier to share,
                      larger file size.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {error && <div className="export-error">{error}</div>}
          </div>
        )}

        {/* ─── Action buttons ──────────────────────────────────────────────── */}
        <div className="modal-actions">
          <DownloadPanel
            activeTab={activeTab}
            phase={phase}
            pendingWarnings={pendingWarnings}
            runtimeChecking={runtimeChecking}
            runtimeAvailable={runtimeAvailable}
            onOpenPreview={handleOpenPreview}
            onConfirmWarningsAndExport={handleConfirmWarningsAndExport}
            onValidateAndExport={handleValidateAndExport}
            onZipExport={handleZipExport}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
