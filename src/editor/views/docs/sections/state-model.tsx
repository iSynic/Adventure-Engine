export function StateModelSection() {
  return (
    <section>
      <h3>State Model</h3>
      <p>
        All runtime game data lives in the <code>StateStore</code> — a centralized, mutable data
        store that every engine subsystem reads from and writes to. Understanding the state model
        is essential for building game logic and debugging unexpected behavior.
      </p>

      <h4>Why Centralized State?</h4>
      <p>
        Adventure games have deeply interconnected systems. A single player action might set a flag,
        change an object's visual state, add an item to inventory, update a room-local variable,
        and trigger a state watcher that runs another script. Centralizing all of this in one store
        provides:
      </p>
      <ul>
        <li><strong>Single source of truth</strong> — no conflicting copies of game data</li>
        <li><strong>Reactivity</strong> — change listeners notify other systems whenever state mutates</li>
        <li><strong>Serialization</strong> — save/load is a single JSON snapshot of the entire game state</li>
        <li><strong>Debug visibility</strong> — the debug panel can display and edit everything in one place</li>
      </ul>

      <h4>State Domains</h4>

      <h5>Current Room</h5>
      <p>
        <code>currentRoomId</code> identifies the room the player is in. <code>visitedRooms</code> is
        a list of all rooms the player has entered. Scripts can check this with
        the <code>roomVisited</code> condition.
      </p>

      <h5>Actors</h5>
      <p>Each actor's runtime state tracks:</p>
      <ul>
        <li><code>roomId</code> — which room the actor is in</li>
        <li><code>x</code>, <code>y</code> — current position</li>
        <li><code>facing</code> — compass direction (N, NE, E, SE, S, SW, W, NW)</li>
        <li><code>animState</code> — current animation (idle, walk, talk, etc.)</li>
        <li><code>walking</code>, <code>talking</code>, <code>busy</code> — activity flags</li>
        <li><code>visible</code>, <code>controlEnabled</code> — visibility and input flags</li>
      </ul>

      <h5>Objects</h5>
      <p>Each object's runtime state tracks:</p>
      <ul>
        <li><code>roomId</code> — which room the object is in (or <code>null</code> if picked up)</li>
        <li><code>visible</code>, <code>enabled</code>, <code>interactionEnabled</code> — status flags</li>
        <li><code>currentState</code> — key-value pairs for game logic (e.g., <code>{"{"} isOpen: true, timesUsed: 3 {"}"}</code>)</li>
        <li><code>primaryState</code> — integer index selecting which sprite to display</li>
        <li><code>x</code>, <code>y</code> — position in the room</li>
        <li><code>classFlags</code> — string tags for grouping/querying (used by <code>hasTag</code> conditions)</li>
      </ul>
      <p>
        <strong>State vs Primary State:</strong> <code>currentState</code> is a flexible key-value
        store for arbitrary game logic data. <code>primaryState</code> is an integer index into the
        object's <code>stateSprites</code> array, controlling which sprite is displayed.
      </p>

      <h5>Flags</h5>
      <p>
        Simple boolean toggles for tracking game progress.
        Examples: <code>has_met_guard</code>, <code>puzzle_solved</code>, <code>intro_complete</code>.
        Flags default to <code>false</code> when unset.
      </p>

      <h5>Variables</h5>
      <p>
        Typed values for tracking numeric or string data.
        Examples: <code>score = 42</code>, <code>player_name = "Guybrush"</code>, <code>attempts = 3</code>.
        Variables support comparison operators (<code>==</code>, <code>!=</code>, <code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code>) in conditions.
      </p>

      <h5>Room-Local Variables</h5>
      <p>
        Each room can have its own <code>localVariables</code> — scoped data that doesn't pollute the
        global namespace. Useful for room-specific puzzle state (e.g., how many times a lever has been
        pulled in this room).
      </p>

      <h5>Inventory</h5>
      <p>
        Maps actor IDs to lists of item IDs. The player actor's inventory is the one shown in the UI.
        NPCs can also hold items (useful for trading puzzles).
      </p>

      <h5>Dialogue</h5>
      <p>
        <code>dialogue</code> tracks whether a conversation is active, which tree is running, and the
        current node. This is transient — it resets when the dialogue ends.
      </p>
      <p>
        <code>dialogueSeen</code> is persistent across the game session. For each dialogue tree, it
        records which nodes the player has seen and which response options the player has chosen. This
        enables features like hiding already-chosen dialogue options (<code>once</code> branches) or
        triggering events after specific conversation paths have been explored.
      </p>

      <h5>Camera</h5>
      <p>
        Tracks the camera's position, viewport dimensions, zoom level, and which actor it is following.
        For rooms wider than the viewport, the camera scrolls to keep the followed actor visible.
      </p>

      <h4>Reactivity</h4>
      <p>
        The <code>StateStore</code> supports change listeners. When a flag, variable, object state,
        or room variable changes, all registered callbacks are notified with the change type and key.
        This drives:
      </p>
      <ul>
        <li><strong>State Watchers</strong> — re-evaluate conditions and fire scripts when relevant state changes</li>
        <li><strong>Debug Panel</strong> — live-update the state display</li>
        <li><strong>Event Bus</strong> — emit typed engine events for flag/variable changes</li>
      </ul>

      <h4>Save and Load</h4>
      <p>
        The entire game state is JSON-serializable. Saving creates a snapshot
        containing the full state, player position, current room, and a timestamp. When a save is
        loaded:
      </p>
      <ol>
        <li>All running scripts are cancelled</li>
        <li>Active dialogues are force-reset</li>
        <li>The full state is replaced with the saved snapshot</li>
        <li>The player's position and facing are restored</li>
        <li>The camera state is restored</li>
        <li>The saved room is loaded (triggering asset preloading and onEnter scripts)</li>
      </ol>

      <h4>Version Migration</h4>
      <p>
        The <code>StateStore</code> includes a <code>migrateState</code> function that fills in any
        missing fields with defaults. This allows saves from older engine versions to load safely —
        new state domains are initialized to their empty defaults rather than crashing.
      </p>
    </section>
  );
}
