export function ArchitectureSection() {
  return (
    <section>
      <h3>Architecture</h3>
      <p>
        The engine is organized into four layers, each with a clear responsibility boundary.
      </p>
      <pre><code>{`┌─────────────────────────────────────────────┐
│  Editor          Visual authoring tools     │
│  (src/editor/)   Panels, inspectors, canvas │
├─────────────────────────────────────────────┤
│  Runtime         Boot & packaging layer     │
│  (src/runtime/)  Loads data, starts engine  │
├─────────────────────────────────────────────┤
│  Engine          Game-agnostic core         │
│  (src/engine/)   All gameplay systems       │
├─────────────────────────────────────────────┤
│  Shared          Cross-layer contracts      │
│  (src/shared/)   Export schema, display cfg │
└─────────────────────────────────────────────┘`}</code></pre>

      <h4>Engine (<code>src/engine/</code>)</h4>
      <p>
        The game-agnostic core. It knows how to run an adventure game but knows nothing about
        any specific game's content.
      </p>
      <table>
        <thead>
          <tr><th>Subsystem</th><th>Directory</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td>Core</td><td><code>core/</code></td><td><code>Engine</code> class, <code>Registry</code>, <code>EventBus</code>, type definitions</td></tr>
          <tr><td>Rendering</td><td><code>rendering/</code></td><td><code>Renderer</code>, <code>Camera</code>, sprite animation</td></tr>
          <tr><td>State</td><td><code>state/</code></td><td><code>StateStore</code>, <code>SaveSystem</code>, <code>ConditionEvaluator</code>, <code>StateWatcher</code></td></tr>
          <tr><td>Scripting</td><td><code>scripting/</code></td><td><code>ScriptRunner</code>, <code>ScriptScheduler</code>, <code>VisualScriptInterpreter</code></td></tr>
          <tr><td>World</td><td><code>world/</code></td><td><code>RoomManager</code>, <code>ActorInstance</code>, <code>ObjectEntity</code>, <code>Hotspot</code>, <code>ExitRegion</code></td></tr>
          <tr><td>Interaction</td><td><code>interaction/</code></td><td><code>VerbSystem</code>, <code>ActionResolver</code></td></tr>
          <tr><td>Navigation</td><td><code>navigation/</code></td><td>Walkbox pathfinding (visibility graph)</td></tr>
          <tr><td>Dialogue</td><td><code>dialogue/</code></td><td><code>DialogueManager</code> for branching conversation trees</td></tr>
          <tr><td>Inventory</td><td><code>inventory/</code></td><td><code>InventorySystem</code></td></tr>
          <tr><td>Input</td><td><code>input/</code></td><td><code>InputManager</code>, mouse/keyboard handling</td></tr>
          <tr><td>Audio</td><td><code>audio/</code></td><td><code>AudioManager</code></td></tr>
          <tr><td>UI</td><td><code>ui/</code></td><td><code>UIManager</code>, speech bubbles, message bar</td></tr>
          <tr><td>Assets</td><td><code>assets/</code></td><td><code>AssetLoader</code> with caching</td></tr>
          <tr><td>Debug</td><td><code>debug/</code></td><td><code>DebugOverlay</code>, <code>DebugEventLog</code></td></tr>
          <tr><td>Bootstrap</td><td><code>bootstrap/</code></td><td><code>EngineBootstrap</code> (init, room loading, fades)</td></tr>
        </tbody>
      </table>

      <h4>Editor (<code>src/editor/</code>)</h4>
      <p>
        The visual authoring environment. It manipulates editor-specific data models
        (<code>EditorProject</code>, <code>EditorRoomDefinition</code>, etc.) and converts them
        to engine-compatible formats for playtesting and export. The editor never runs during
        exported gameplay.
      </p>
      <ul>
        <li><strong>Panels</strong> — Room list, actors, settings, linting</li>
        <li><strong>Inspectors</strong> — Per-entity property editors (hotspots, objects, walkboxes, exits)</li>
        <li><strong>Script Editor</strong> — Visual drag-and-drop script builder</li>
        <li><strong>Canvas</strong> — Room layout editor with draggable entities</li>
        <li><strong>Export</strong> — Playable build pipeline</li>
      </ul>

      <h4>Runtime (<code>src/runtime/</code>)</h4>
      <p>
        The boot layer that bridges exported game data with the engine. It handles:
      </p>
      <ul>
        <li>Fetching the <code>manifest.json</code> and all data files</li>
        <li>Compiling scripts (visual scripts → executable functions)</li>
        <li>Constructing a <code>GameConfig</code> and calling <code>bootGame()</code></li>
        <li>Platform-specific data loading (web fetch vs. Tauri filesystem)</li>
      </ul>

      <h4>Shared (<code>src/shared/</code>)</h4>
      <p>
        Types and utilities used by both engine and editor:
      </p>
      <ul>
        <li><code>exportSchema.ts</code> — The <code>ExportManifest</code> contract and versioning</li>
        <li><code>displayConfig.ts</code> — Viewport scaling and alignment settings</li>
        <li><code>overlayConfig.ts</code> — HUD/overlay configuration</li>
        <li><code>validateProject.ts</code> — Cross-cutting validation rules</li>
      </ul>

      <h4>How the Runtime Boots a Project</h4>
      <pre><code>{`bootGame({ canvas, config, scripts })
  → Engine constructor (initializes all subsystems)
  → registry.loadFromConfig(config) (registers all rooms/actors/objects/items)
  → engine.init() (creates player, loads starting room)
  → engine.start() (begins update/render loop)`}</code></pre>
    </section>
  );
}
