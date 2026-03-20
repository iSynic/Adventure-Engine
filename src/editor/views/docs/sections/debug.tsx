export function DebugSection() {
  return (
    <section>
      <h3>Debug Tools</h3>
      <p>
        The engine includes a comprehensive debugging toolkit accessible from the editor's play
        mode. Debug tools help you inspect game state, visualize hidden structures, test
        interactions, and diagnose problems without modifying your game.
      </p>

      <h4>Enabling Debug Mode</h4>
      <p>
        In the editor's play mode, the debug panel is always available in the sidebar. Debug
        overlays can be toggled individually. In exported/standalone builds,
        press <kbd>F1</kbd> to toggle debug mode (overlay visibility).
      </p>
      <p>Quick keys:</p>
      <ul>
        <li><kbd>F5</kbd> — Quick save</li>
        <li><kbd>F9</kbd> — Quick load</li>
      </ul>

      <h4>Debug Overlays</h4>
      <p>
        Overlays render visual information directly on the game canvas. Each can be toggled
        independently using keyboard shortcuts (keys <kbd>1</kbd>–<kbd>9</kbd>) or the Overlays
        tab in the debug panel.
      </p>
      <table>
        <thead>
          <tr><th>Key</th><th>Overlay</th><th>What It Shows</th></tr>
        </thead>
        <tbody>
          <tr><td><kbd>1</kbd></td><td><strong>Walkboxes</strong></td><td>Walkable area polygons with IDs and adjacency connections. Shows where actors can and cannot walk.</td></tr>
          <tr><td><kbd>2</kbd></td><td><strong>Hotspots</strong></td><td>Interactive hotspot bounding rectangles. Hotspots are invisible during gameplay — this reveals their click regions.</td></tr>
          <tr><td><kbd>3</kbd></td><td><strong>Exits</strong></td><td>Room exit trigger regions with destination room IDs. Shows exactly where the player needs to click or walk to transition.</td></tr>
          <tr><td><kbd>4</kbd></td><td><strong>Objects</strong></td><td>Object bounding boxes and anchor positions. Helps verify click targets and sprite placement.</td></tr>
          <tr><td><kbd>5</kbd></td><td><strong>Actors</strong></td><td>Actor anchor positions, facing directions, and coordinate readouts. Shows where the engine thinks each character is standing.</td></tr>
          <tr><td><kbd>6</kbd></td><td><strong>Paths</strong></td><td>Active pathfinding routes. Draws the waypoint chain an actor is currently following, including the destination marker.</td></tr>
          <tr><td><kbd>7</kbd></td><td><strong>Z-Sort</strong></td><td>Y-sort anchor lines. Shows the horizontal lines used to determine draw order — entities with higher Y values render in front.</td></tr>
          <tr><td><kbd>8</kbd></td><td><strong>Interaction Target</strong></td><td>Highlights the entity currently under the cursor with a glowing outline. Confirms what the engine thinks you're pointing at.</td></tr>
          <tr><td><kbd>9</kbd></td><td><strong>Hit Flash</strong></td><td>Flashes a yellow highlight on the entity or point that was clicked. Confirms click hit-testing is working correctly.</td></tr>
        </tbody>
      </table>

      <h4>Debug Panel Tabs</h4>
      <p>
        The debug panel (in the editor sidebar during play mode) has several tabs for deeper
        inspection.
      </p>

      <h5>Context Bar</h5>
      <p>Always visible at the top of the debug panel. Shows:</p>
      <ul>
        <li><strong>Current Room</strong> — the room ID you're in</li>
        <li><strong>Active Verb</strong> — the currently selected verb</li>
        <li><strong>Sentence</strong> — the constructed interaction sentence (e.g., "Use key on door")</li>
        <li><strong>Cutscene</strong> — shows a "CUTSCENE" indicator when player input is locked</li>
        <li><strong>Mouse Position</strong> — real-time game-space coordinates of the cursor</li>
      </ul>

      <h5>Actions Tab</h5>
      <p>High-level commands for testing:</p>
      <ul>
        <li><strong>Jump to Room</strong> — teleport the player to any room instantly</li>
        <li><strong>Reload Room</strong> — re-enter the current room (re-triggers onEnter scripts)</li>
        <li><strong>Run Script</strong> — manually trigger any script by ID</li>
        <li><strong>Spawn Item</strong> — add any item to the player's inventory</li>
      </ul>

      <h5>Inspector Tab</h5>
      <p>Displays detailed properties of the last-clicked entity:</p>
      <ul>
        <li>For <strong>actors</strong>: position, facing, animation state, room, visibility</li>
        <li>For <strong>objects</strong>: position, state properties, primary state, visibility, enabled status</li>
        <li>For <strong>hotspots</strong>: bounds, verb handlers, conditions</li>
        <li>For <strong>exits</strong>: bounds, target room, conditions</li>
      </ul>

      <h5>Events Tab</h5>
      <p>A real-time log of engine events:</p>
      <ul>
        <li>Verb interactions (what was clicked, which script ran)</li>
        <li>Script lifecycle events (start, complete, error, cancel)</li>
        <li>Room changes</li>
        <li>Flag and variable updates</li>
        <li>Inventory changes</li>
      </ul>
      <p>Events can be filtered by category. The log keeps the most recent 500 entries.</p>

      <h5>State / Flags / Variables Tabs</h5>
      <p>Live views of the StateStore:</p>
      <ul>
        <li><strong>Flags</strong> — view and toggle all boolean flags</li>
        <li><strong>Variables</strong> — view and edit all global variables</li>
        <li><strong>Room Variables</strong> — view and edit room-local variables</li>
        <li><strong>Object States</strong> — view and edit per-object key-value state</li>
      </ul>
      <p>All values are <strong>live-editable</strong> — changes take effect immediately in the running game.</p>

      <h5>Scripts Tab</h5>
      <p>Lists all currently executing or waiting scripts:</p>
      <ul>
        <li>Script ID, ownership, priority</li>
        <li>Current state (running, waiting, paused)</li>
        <li>What the script is waiting for (timer, actor movement, dialogue, signal, etc.)</li>
        <li>Whether the script is interruptible</li>
      </ul>
      <p>You can <strong>force-cancel</strong> individual script instances from this tab.</p>

      <h5>Inventory Tab</h5>
      <p>Shows the player's current inventory items. Individual items can be removed for testing.</p>

      <h5>Dialogue Tab</h5>
      <p>Monitors the active dialogue tree — current tree ID, node, history of seen nodes and chosen branches.</p>

      <h4>Troubleshooting Workflows</h4>

      <h5>"The player can't walk to a spot"</h5>
      <ol>
        <li>Toggle <strong>Walkboxes</strong> (<kbd>1</kbd>) to see walkable areas</li>
        <li>Check that the target spot is inside a walkbox polygon</li>
        <li>Check <strong>Adjacent</strong> connections — walkboxes only connect if explicitly linked</li>
        <li>Toggle <strong>Paths</strong> (<kbd>6</kbd>) and click the problem spot — if no path appears, the destination is unreachable</li>
      </ol>

      <h5>"Clicking an object does nothing"</h5>
      <ol>
        <li>Toggle <strong>Objects</strong> (<kbd>4</kbd>) to verify the bounding box covers the clickable area</li>
        <li>Toggle <strong>Interaction Target</strong> (<kbd>8</kbd>) and hover — confirm the object highlights</li>
        <li>Toggle <strong>Hit Flash</strong> (<kbd>9</kbd>) and click — confirm the hit registers on the right entity</li>
        <li>Check the <strong>Events Tab</strong> — look for the verb event and see if a script was found</li>
        <li>Verify the object has a <code>verbHandler</code> for the active verb in its inspector</li>
      </ol>

      <h5>"A script isn't running"</h5>
      <ol>
        <li>Open the <strong>Scripts Tab</strong> to see if the script is listed</li>
        <li>Check <strong>Events Tab</strong> for script start/error events</li>
        <li>If the script is listed as "waiting," check what it's blocked on (the wait reason is shown)</li>
        <li>Use <strong>Run Script</strong> in the Actions Tab to trigger it manually</li>
      </ol>

      <h5>"An object looks wrong"</h5>
      <ol>
        <li>Check the object's <strong>primary state</strong> in the Inspector Tab — it controls which sprite is displayed</li>
        <li>Check the object's <strong>state properties</strong> for unexpected values</li>
        <li>Toggle <strong>Objects</strong> (<kbd>4</kbd>) to verify bounds and position</li>
      </ol>

      <h5>"State seems incorrect"</h5>
      <ol>
        <li>Open <strong>Flags</strong>, <strong>Variables</strong>, or <strong>Object States</strong> tab</li>
        <li>Find the relevant key and check its value</li>
        <li>Edit the value live to test if changing it fixes the behavior</li>
        <li>Use the <strong>Events Tab</strong> to trace what set the value and when</li>
      </ol>

      <h5>"The game is stuck"</h5>
      <ol>
        <li>Check <strong>Scripts Tab</strong> — a script might be stuck waiting for something that will never happen</li>
        <li>Check if a <strong>cutscene</strong> is active (shown in the Context Bar) — input is locked during cutscenes</li>
        <li>Force-cancel any stuck scripts from the Scripts Tab</li>
        <li>Use <strong>Quick Load</strong> (<kbd>F9</kbd>) to revert to the last save</li>
      </ol>
    </section>
  );
}
