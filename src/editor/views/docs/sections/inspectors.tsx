export function InspectorsSection() {
  return (
    <section>
      <h3>Property Inspectors</h3>
      <p>
        When you select an entity on the room canvas (or in the sidebar), a <strong>Property
        Inspector</strong> panel opens on the right side of the editor. Each entity type has
        a specialized inspector with relevant fields and controls.
      </p>
      <h4>Walkbox Inspector</h4>
      <p>
        Select a walkbox (green polygon) on the canvas to open its inspector:
      </p>
      <ul>
        <li><strong>ID</strong> — the walkbox identifier (used for adjacency connections).</li>
        <li><strong>Vertices</strong> — number of polygon points. Edit vertices by dragging handles on the canvas.</li>
        <li><strong>Shape Locked</strong> — when checked, dragging moves the entire polygon instead of individual vertices.</li>
        <li><strong>Adjacent Walkboxes</strong> — checkboxes for connecting to other walkboxes in the same room (enables pathfinding across areas).</li>
        <li><strong>Depth Scale</strong> — controls character size based on Y position (near/far scale factors and Y boundaries).</li>
        <li><strong>Speed Modifier</strong> — walk speed multiplier within this walkbox (e.g., 0.5 for slow areas like mud).</li>
        <li><strong>Delete</strong> — removes the walkbox from the room.</li>
      </ul>
      <h4>Exit Inspector</h4>
      <p>
        Select an exit region (orange rectangle) to configure room transitions:
      </p>
      <ul>
        <li><strong>Label</strong> — hover text shown to the player (e.g., "Go to Garden").</li>
        <li><strong>Target Room</strong> — dropdown of all rooms in the project.</li>
        <li><strong>Target Spawn Point</strong> — where the player appears in the target room.</li>
        <li><strong>Direction</strong> — compass direction (N/NE/E/SE/S/SW/W/NW).</li>
        <li><strong>Bounds</strong> — the clickable rectangle (edit by dragging on canvas).</li>
        <li><strong>Visibility Condition</strong> — hide the exit unless a condition is met.</li>
        <li><strong>Interaction Condition</strong> — block the exit unless a condition is met.</li>
      </ul>
      <h4>Hotspot Inspector</h4>
      <p>
        Select a hotspot (yellow region) to configure invisible interaction zones:
      </p>
      <ul>
        <li><strong>Name</strong> — display name shown on hover.</li>
        <li><strong>Description</strong> — text shown when the player looks at it.</li>
        <li><strong>Z Layer</strong> — rendering order (behind, normal, or front relative to actors).</li>
        <li><strong>Verb Handlers</strong> — map verbs to scripts. Add handlers with the verb picker.</li>
        <li><strong>Use-With Section</strong> — item-specific handlers for the "use" verb.</li>
        <li><strong>Fallback Script</strong> — catch-all script for unhandled verbs.</li>
        <li><strong>Stand Point</strong> — where the player walks to before interacting.</li>
        <li><strong>Approach Direction</strong> — which way the player faces at the stand point.</li>
        <li><strong>Shape</strong> — polygon or rectangle, with shape lock option.</li>
        <li><strong>Conditions</strong> — visibility and interaction conditions.</li>
      </ul>
      <h4>Spawn Point Inspector</h4>
      <p>
        Select a spawn point (cyan marker) to configure actor entry positions:
      </p>
      <ul>
        <li><strong>ID</strong> — the spawn point identifier (referenced by exits and scripts).</li>
        <li><strong>Position</strong> — x, y coordinates (move by dragging on canvas).</li>
        <li><strong>Facing Direction</strong> — which way the player faces when spawning here.</li>
        <li><strong>Delete</strong> — removes the spawn point (at least one must remain).</li>
      </ul>
    </section>
  );
}
