import { useState } from "react";
import { generateSourceZip, getSourceFileCount, getSourceCategories } from "../../../utils/sourceBundle";
import { generatePrecompiledZip } from "../../../utils/precompiledBundle";

export function SourceCodeSection() {
  const [downloading, setDownloading] = useState(false);
  const [downloadingPrecompiled, setDownloadingPrecompiled] = useState(false);
  const [precompiledError, setPrecompiledError] = useState<string | null>(null);
  const fileCount = getSourceFileCount();
  const categories = getSourceCategories();

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await generateSourceZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "adventure-engine-source.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function handlePrecompiledDownload() {
    setDownloadingPrecompiled(true);
    setPrecompiledError(null);
    try {
      const blob = await generatePrecompiledZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "adventure-engine-precompiled.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setPrecompiledError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloadingPrecompiled(false);
    }
  }

  return (
    <section className="docs-section">
      <h3>Source Code Download</h3>
      <p>
        Download the complete Adventure Engine source code as a zip archive.
        This includes the full engine, visual editor, sample project data,
        and all configuration files needed to run the project locally.
      </p>

      <h4>What's Included</h4>
      <table className="docs-table">
        <thead>
          <tr><th>Category</th><th>Files</th></tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.label}><td>{c.label}</td><td>{c.count}</td></tr>
          ))}
          <tr style={{ fontWeight: 600 }}><td>Total</td><td>{fileCount}</td></tr>
        </tbody>
      </table>

      <h4>Contents</h4>
      <ul>
        <li><code>src/engine/</code> — Game-agnostic engine core (rendering, input, pathfinding, scripting, state)</li>
        <li><code>src/editor/</code> — Visual editor (room canvas, inspectors, toolbar, project management, documentation)</li>
        <li><code>src/runtime/</code> — Game bootstrap that loads project config into the engine</li>
        <li><code>src/projects/</code> — Sample game project data (scripts, scene definitions)</li>
        <li><code>src/components/</code>, <code>src/pages/</code> — App shell and UI components</li>
        <li>Config: <code>package.json</code>, <code>tsconfig.json</code>, <code>vite.config.ts</code>, <code>index.html</code></li>
      </ul>

      <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 12 }}>
        Note: This archive is a source code snapshot for reference and study.
        The project is part of a pnpm monorepo — config files reference workspace
        dependencies. Clone the full workspace or adapt the configs for standalone use.
        Sample image/audio assets are not included due to file size; missing assets
        display as colored placeholders.
      </p>

      <button
        className="btn btn-primary"
        onClick={handleDownload}
        disabled={downloading}
        style={{ marginTop: 16, minWidth: 260 }}
      >
        {downloading ? "Generating zip…" : `Download Source Code (.zip) — ${fileCount} files`}
      </button>

      <h3 style={{ marginTop: 32 }}>Precompiled Build Download</h3>
      <p>
        Download the compiled runtime artifacts — ready to embed in a Tauri desktop
        launcher or any custom host without a build step.
      </p>

      <h4>What's Included</h4>
      <table className="docs-table">
        <thead>
          <tr><th>File</th><th>Role</th></tr>
        </thead>
        <tbody>
          <tr><td><code>launcher-runtime/runtime.js</code></td><td>Full engine + editor bundle for Tauri launchers</td></tr>
          <tr><td><code>playable-runtime/playable.js</code></td><td>Standalone web-playable runtime (exported games)</td></tr>
          <tr><td><code>player-runtime/player.js</code></td><td>Embedded player runtime (iframe / widget use)</td></tr>
          <tr><td><code>index.html</code></td><td>Engine entry point (already includes Tauri shim tags)</td></tr>
          <tr><td><code>README.md</code></td><td>Integration notes and file reference</td></tr>
        </tbody>
      </table>

      {precompiledError && (
        <p style={{ color: "var(--color-error, #f55)", fontSize: "0.85rem", marginTop: 8 }}>
          Error: {precompiledError}
        </p>
      )}

      <button
        className="btn btn-secondary"
        onClick={handlePrecompiledDownload}
        disabled={downloadingPrecompiled}
        style={{ marginTop: 16, minWidth: 260 }}
      >
        {downloadingPrecompiled ? "Fetching runtimes…" : "Download Precompiled Build (.zip)"}
      </button>
    </section>
  );
}
