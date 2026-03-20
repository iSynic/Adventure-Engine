export function CursorsSection() {
  return (
    <section>
      <h3>Context-Sensitive Cursors</h3>
      <p>
        The game cursor changes automatically based on what the player is hovering over,
        which verb is active, and whether an inventory item is held. All cursor behaviour is
        driven by a six-level priority model resolved on every mouse-move event.
      </p>

      <h4>Priority Model</h4>
      <p>The engine resolves the cursor in this order — the first matching level wins:</p>
      <table>
        <thead>
          <tr><th>Priority</th><th>Condition</th><th>Cursor Used</th></tr>
        </thead>
        <tbody>
          <tr><td>1. BUSY</td><td>Engine is running a cutscene or blocking script</td><td><code>cursorConfig.busyCursor</code> (default: <code>wait</code>)</td></tr>
          <tr><td>2. INVALID</td><td>Player just attempted an impossible action (~500 ms window)</td><td><code>cursorConfig.invalidCursor</code> (default: <code>not-allowed</code>)</td></tr>
          <tr><td>3. CARRY</td><td>An inventory item is selected for a "use X with Y" action</td><td><code>cursorConfig.inventoryItemCursor</code> (default: <code>grabbing</code>)</td></tr>
          <tr><td>4. CONTEXT</td><td>Hovering over an interactive entity (see table below)</td><td>Verb-aware cursor or entity override</td></tr>
          <tr><td>5. VERB</td><td>Hovering over walkable space</td><td>Active verb cursor (see resolution chain)</td></tr>
          <tr><td>6. DEFAULT</td><td>No match above (non-walkable, no target)</td><td><code>cursorConfig.defaultCursor</code> (default: <code>default</code>)</td></tr>
        </tbody>
      </table>

      <h4>CONTEXT Level — Hover Targets</h4>
      <p>
        When the player hovers an interactive entity, the cursor reflects the <em>currently
        selected verb</em> rather than a generic pointer. A per-entity <code>cursorOverride</code>
        (set on individual objects, actors, or hotspots) is always the highest-priority escape hatch.
      </p>
      <table>
        <thead>
          <tr><th>Hovering Over</th><th>Cursor Shown</th></tr>
        </thead>
        <tbody>
          <tr><td>Object with <code>cursorOverride</code></td><td>The object's own <code>cursorOverride</code> value</td></tr>
          <tr><td>Object with <code>affordance</code> set</td><td>Verb cursor for that affordance verb (full resolution chain)</td></tr>
          <tr><td>Object (no override/affordance)</td><td>Active verb cursor</td></tr>
          <tr><td>Actor or hotspot with <code>cursorOverride</code></td><td>The entity's own <code>cursorOverride</code> value</td></tr>
          <tr><td>Actor or hotspot (no override)</td><td>Active verb cursor</td></tr>
          <tr><td>Exit region</td><td>Active verb cursor (uses <code>VERB_CSS_CURSORS[verb]</code> as the built-in fallback, e.g. <code>crosshair</code> for the Walk verb)</td></tr>
        </tbody>
      </table>

      <h4>Verb Cursor Resolution Chain</h4>
      <p>When the engine needs to show a verb cursor it checks these sources in order:</p>
      <ol>
        <li><code>cursorConfig.verbCursors[verb]</code> — the primary per-verb map (set in the Settings panel)</li>
        <li><code>VERB_CSS_CURSORS[verb]</code> — built-in CSS fallbacks (see table below)</li>
      </ol>
      <p>Values that look like image URLs are wrapped in <code>url(...) hotspotX hotspotY, fallback</code>. Plain CSS cursor keywords are used directly.</p>

      <h4>Default Verb Cursors</h4>
      <table>
        <thead>
          <tr><th>Verb</th><th>CSS Cursor</th></tr>
        </thead>
        <tbody>
          <tr><td>Walk</td><td><code>crosshair</code></td></tr>
          <tr><td>Look</td><td><code>help</code></td></tr>
          <tr><td>Open / Close</td><td><code>pointer</code></td></tr>
          <tr><td>Pick Up</td><td><code>grab</code></td></tr>
          <tr><td>Use</td><td><code>cell</code></td></tr>
          <tr><td>Talk</td><td><code>text</code></td></tr>
          <tr><td>Push</td><td><code>e-resize</code></td></tr>
          <tr><td>Pull</td><td><code>w-resize</code></td></tr>
          <tr><td>Give</td><td><code>copy</code></td></tr>
        </tbody>
      </table>

      <h4>CursorConfig Fields</h4>
      <p>
        Add a <code>cursorConfig</code> object to your <code>GameConfig</code> to customise any aspect
        of cursor presentation. All fields are optional — omit any you don't need and the built-in
        default applies.
      </p>
      <pre><code>{`const config: GameConfig = {
  // ...
  cursorConfig: {
    // Cursor while idle (no hover target, not walkable)
    defaultCursor: "default",

    // Per-verb cursor map — CSS keywords or image URLs
    verbCursors: {
      walk:   "cursors/walk.png",
      look:   "cursors/magnifier.png",
      pickup: "grab",
    },

    // Cursor during invalid-action feedback (~500 ms)
    invalidCursor: "not-allowed",

    // Cursor while a cutscene is running
    busyCursor: "wait",

    // Cursor when an inventory item is held (use-with mode)
    inventoryItemCursor: "grabbing",

    // Hotspot offsets (px) for custom cursor images
    hotspotX: 16,
    hotspotY: 16,
  },
};`}</code></pre>

      <h4>Editor Workflow</h4>
      <p>
        Open the <strong>Settings</strong> tab to find two cursor-related sections:
      </p>
      <ul>
        <li>
          <strong>Verb Cursor Images</strong> — assign an image asset to each verb. The image
          is used whenever that verb is active (hover over walkable space, actors, hotspots, or exits).
        </li>
        <li>
          <strong>Cursor Settings</strong> — configure the default, invalid, busy, and inventory-carry
          cursors using a CSS keyword quick-pick or a free-text field for custom values. Also set
          the cursor image hotspot offsets (X/Y in pixels).
        </li>
      </ul>
    </section>
  );
}
