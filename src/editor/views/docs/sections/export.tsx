export function ExportSection() {
  return (
    <section>
      <h3>Game Export</h3>
      <p>
        The engine's export system packages your game into a standalone web application that
        runs without the editor. The result is a ZIP file you can deploy to any static web host.
      </p>

      <h4>Export Pipeline</h4>
      <p>
        The export process transforms an editor project into an optimized, self-contained package:
      </p>
      <pre><code>{`EditorProject
  → Validation (check for missing rooms, broken script references, etc.)
  → Data Serialization (rooms, actors, objects, items, scripts, dialogue → JSON files)
  → Asset Collection (resolve all image/audio paths, fetch data URLs, rename for uniqueness)
  → Manifest Generation (create manifest.json linking everything together)
  → HTML Generation (embed the playable runtime JS into index.html)
  → ZIP Packaging (bundle everything into a downloadable archive)`}</code></pre>
      <p>
        Before exporting, the engine runs project validation. <strong>Errors</strong> block the
        export (structural problems that would cause crashes). <strong>Warnings</strong> are advisory
        and don't prevent export. After the ZIP is built, a second validation pass verifies that
        every asset referenced in the data files actually exists in the package.
      </p>

      <h4>Exported Package Structure</h4>
      <pre><code>{`game-export.zip
├── index.html              ← Entry point with embedded runtime
├── manifest.json           ← Package descriptor
├── data/
│   ├── rooms.json          ← All room definitions
│   ├── actors.json         ← All actor definitions
│   ├── objects.json        ← All object definitions
│   ├── inventory.json      ← All item definitions
│   ├── scripts.json        ← All scripts (visual + code)
│   ├── dialogue.json       ← All dialogue trees
│   └── project.json        ← Game settings (verbs, UI, display config)
└── assets/
    ├── background_farmyard_gate.png
    ├── player_idle_e.png
    └── ...                 ← All images and audio, renamed for uniqueness`}</code></pre>

      <h4>The Manifest</h4>
      <p>
        <code>manifest.json</code> is the top-level descriptor that the runtime reads first:
      </p>
      <pre><code>{`{
  "gameId": "bork",
  "title": "Bork",
  "version": "1.0.0",
  "exportSchemaVersion": "1.0.0",
  "startRoomId": "farmyard",
  "playerActorId": "russ_toire",
  "assetBasePath": "assets/",
  "data": {
    "rooms": "data/rooms.json",
    "actors": "data/actors.json",
    "objects": "data/objects.json",
    "inventory": "data/inventory.json",
    "scripts": "data/scripts.json",
    "dialogue": "data/dialogue.json",
    "project": "data/project.json"
  },
  "display": {
    "baseWidth": 640,
    "baseHeight": 360,
    "scalingMode": "integer",
    "pixelPerfect": true
  }
}`}</code></pre>
      <p>Key fields:</p>
      <ul>
        <li><code>exportSchemaVersion</code> — format version for future compatibility</li>
        <li><code>data</code> — relative paths to each JSON data file</li>
        <li><code>assetBasePath</code> — prefix for resolving asset URLs within the package</li>
        <li><code>display</code> — viewport configuration (resolution, scaling behavior)</li>
      </ul>

      <h4>Script Compilation</h4>
      <p>
        Exported scripts are stored as JSON objects with a <code>kind</code> field. At boot time:
      </p>
      <ul>
        <li><strong>Visual scripts</strong> (<code>kind: "visual"</code>) are compiled
          by <code>compileVisualScript</code>, which wraps the step array in an async function
          that walks each step through the <code>VisualScriptInterpreter</code>.</li>
        <li><strong>Raw scripts</strong> (<code>kind: "raw"</code>) have a <code>body</code> string
          that is compiled via <code>new AsyncFunction("ctx", body)</code>.</li>
      </ul>

      <h4>Export Settings</h4>
      <p>
        Click the <strong>Export</strong> button in the editor's top bar to open the export
        settings modal. You can configure:
      </p>
      <table>
        <thead>
          <tr><th>Setting</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Game Title</strong></td><td>Displayed in the browser tab and on the game's title screen.</td></tr>
          <tr><td><strong>Author</strong></td><td>Your name or studio name, shown in the exported page.</td></tr>
          <tr><td><strong>Inline (single file)</strong></td><td>Embeds all assets directly in the HTML. Creates one large file — easy to share but bigger.</td></tr>
          <tr><td><strong>Multi-file</strong></td><td>Assets are separate files alongside the HTML. Smaller individual files, better for web hosting.</td></tr>
        </tbody>
      </table>

      <h4>How to Export</h4>
      <ol>
        <li>Open your project in the editor.</li>
        <li>Click the <strong>Export</strong> button in the top bar.</li>
        <li>Fill in the game title and author name.</li>
        <li>Choose inline or multi-file mode.</li>
        <li>Click <strong>Export</strong> — your browser will download a <code>.zip</code> file.</li>
        <li>Unzip and open <code>index.html</code> in any browser to play!</li>
      </ol>

      <h4>Deploying an Exported Build</h4>
      <p>
        The exported ZIP is a standard static website. No server-side processing is required —
        the game runs entirely in the browser. It works on any hosting platform:
      </p>
      <ul>
        <li><strong>GitHub Pages</strong> — push to a <code>gh-pages</code> branch</li>
        <li><strong>Netlify / Vercel</strong> — drag-and-drop the extracted folder</li>
        <li><strong>Cloudflare Pages</strong> — connect a repo or upload directly</li>
        <li><strong>itch.io</strong> — upload the ZIP directly (itch supports HTML5 games)</li>
        <li><strong>Any web server</strong> — Apache, Nginx, Caddy, or a simple <code>python -m http.server</code></li>
      </ul>
      <p>
        The exported game supports save/load via the browser's localStorage, so players
        can save their progress.
      </p>
    </section>
  );
}
