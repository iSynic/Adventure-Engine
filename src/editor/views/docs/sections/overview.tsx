export function OverviewSection() {
  return (
    <section>
      <h3>Adventure Game Engine</h3>
      <p>
        <strong>These docs are the primary guide for building games with this engine.</strong>{" "}
        Everything a creator needs — rooms, actors, scripts, dialogue, export, and the project
        file format — is covered here. Use the sections in the sidebar to navigate.
      </p>
      <p>
        A reusable browser-based 2D point-and-click adventure game engine built with
        TypeScript, React, and HTML5 Canvas. It provides SCUMM/SCI-style gameplay — verb-based
        interactions, inventory puzzles, branching dialogue, scripted cutscenes, and room
        navigation — all running in a modern web stack.
      </p>
      <p>
        Games are authored in the visual editor and exported as standalone web packages.
      </p>
      <p>
        To get started quickly, load the built-in <strong>Bork</strong> sample project — a comedic
        farmyard adventure following Russ Toire, a chicken entrusted with recovering the Sacred
        Vestments of Plenty. It demonstrates rooms, actors, objects, inventory items, dialogue trees,
        scripted interactions, and state watchers — a fully playable reference game you can explore
        and modify as a learning resource.
      </p>
      <h4>Four-Layer Architecture</h4>
      <p>
        The engine is organized into four layers with clear responsibility boundaries:
      </p>
      <table>
        <thead>
          <tr><th>Layer</th><th>Location</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td>Editor</td><td><code>src/editor/</code></td><td>Visual authoring tools — panels, inspectors, canvas</td></tr>
          <tr><td>Runtime</td><td><code>src/runtime/</code></td><td>Boot &amp; packaging — loads data, starts engine</td></tr>
          <tr><td>Engine</td><td><code>src/engine/</code></td><td>Game-agnostic core — all gameplay systems</td></tr>
          <tr><td>Shared</td><td><code>src/shared/</code></td><td>Cross-layer contracts — export schema, display config</td></tr>
        </tbody>
      </table>
      <p>
        See the <strong>Architecture</strong> section for a detailed breakdown of each layer
        and its subsystems.
      </p>
      <h4>What Can You Build?</h4>
      <p>
        The engine supports all the hallmarks of classic point-and-click adventures:
        rooms with walkable areas, inventory puzzles, branching dialogue with NPCs,
        scripted cutscenes, sprite-animated characters, scrolling wide rooms with parallax,
        object state changes, room transition effects, and one-click export to a playable
        standalone game. Everything can be built using the visual editor or by writing
        TypeScript definitions directly.
      </p>
    </section>
  );
}
