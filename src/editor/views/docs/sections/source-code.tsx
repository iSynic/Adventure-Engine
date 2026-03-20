import { useState } from "react";
import { generateSourceZip, getSourceFileCount, getSourceCategories } from "../../../utils/sourceBundle";

export function SourceCodeSection() {
  const [downloading, setDownloading] = useState(false);
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
    </section>
  );
}
