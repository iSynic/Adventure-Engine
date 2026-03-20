export function LinterSection() {
  return (
    <section>
      <h3>Project Linter</h3>
      <p>
        The Project Linter automatically scans your game project for errors and warnings.
        It catches common problems like missing references, orphaned entities, and
        configuration issues before you play or export.
      </p>
      <h4>How to Use</h4>
      <ol>
        <li>Open the <strong>Lint</strong> view by clicking the lint icon in the editor toolbar.</li>
        <li>The linter runs automatically and shows all issues grouped by category.</li>
        <li>Click an issue to navigate directly to the affected entity in the editor.</li>
        <li>Fix the issues and the linter updates in real time.</li>
      </ol>
      <h4>What It Checks</h4>
      <table>
        <thead>
          <tr><th>Category</th><th>Checks</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Rooms</strong></td><td>Missing walkboxes, orphaned object/actor references, missing spawn points, disconnected walkbox graphs.</td></tr>
          <tr><td><strong>Actors</strong></td><td>Missing player actor, invalid default room, unreferenced actors.</td></tr>
          <tr><td><strong>Objects</strong></td><td>Invalid room references, missing verb handler scripts, orphaned state sprite references.</td></tr>
          <tr><td><strong>Items</strong></td><td>Missing icon paths, unreferenced items.</td></tr>
          <tr><td><strong>Scripts</strong></td><td>Empty script bodies, unreferenced scripts, syntax validation.</td></tr>
          <tr><td><strong>Dialogue</strong></td><td>Missing start nodes, broken branch links, orphaned nodes.</td></tr>
          <tr><td><strong>Assets</strong></td><td>Unreferenced assets, missing asset files.</td></tr>
          <tr><td><strong>Settings</strong></td><td>Missing starting room, missing player actor ID.</td></tr>
        </tbody>
      </table>
      <h4>Severity Levels</h4>
      <ul>
        <li><strong style={{ color: "#f87171" }}>Errors</strong> — problems that will break gameplay (e.g., exit pointing to a non-existent room).</li>
        <li><strong style={{ color: "#fbbf24" }}>Warnings</strong> — potential issues that won't crash the game but may indicate bugs (e.g., unreferenced scripts).</li>
      </ul>
      <h4>Navigation</h4>
      <p>
        Each lint issue includes a clickable link that navigates to the relevant tab and
        selects the affected entity — for example, clicking a room error switches to the
        Rooms tab and selects that room, or clicking a script error opens the Scripts tab
        with that script selected.
      </p>
    </section>
  );
}
