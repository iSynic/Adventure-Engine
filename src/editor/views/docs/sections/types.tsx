export function TypesSection() {
  return (
    <section>
      <h3>Type System</h3>
      <p>
        All content is strongly typed via <code>src/engine/core/types.ts</code>.
        Here is the complete list of types available:
      </p>
      <table>
        <thead>
          <tr><th>Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>GameConfig</code></td><td>Top-level project manifest (rooms, actors, objects, items, dialogues, settings).</td></tr>
          <tr><td><code>RoomDefinition</code></td><td>Room structure: background, walkboxes, exits, hotspots, dimensions, parallax, transition effect.</td></tr>
          <tr><td><code>WalkboxDefinition</code></td><td>Polygon navigation area with optional scale and speed modifiers.</td></tr>
          <tr><td><code>ExitDefinition</code></td><td>Room transition region with target room and spawn point.</td></tr>
          <tr><td><code>SpawnPoint</code></td><td>Named position where actors appear when entering a room.</td></tr>
          <tr><td><code>ParallaxLayer</code></td><td>Background layer with image path and scroll factor (0–1).</td></tr>
          <tr><td><code>TransitionEffect</code></td><td><code>"fade"</code> or <code>"instant"</code> — how rooms transition.</td></tr>
          <tr><td><code>ActorDefinition</code></td><td>Character/NPC: position, speed, sprite, animations, dialogue.</td></tr>
          <tr><td><code>ActorAnimationSet</code></td><td>Direction-keyed map of animation states to frame sequences.</td></tr>
          <tr><td><code>AnimationDefinition</code></td><td>Named animation with frames and loop flag.</td></tr>
          <tr><td><code>AnimationFrame</code></td><td>Single frame: image path and duration in milliseconds.</td></tr>
          <tr><td><code>ObjectDefinition</code></td><td>Interactable world object with state, stateSprites, and verb handlers.</td></tr>
          <tr><td><code>StateSpriteEntry</code></td><td>Maps a state key/value pair to a sprite path and optional bounds override.</td></tr>
          <tr><td><code>HotspotDefinition</code></td><td>Invisible interaction zone with verb handlers.</td></tr>
          <tr><td><code>ItemDefinition</code></td><td>Inventory item with icon and verb handlers.</td></tr>
          <tr><td><code>DialogueTree</code></td><td>Branching conversation: nodes, branches, start node.</td></tr>
          <tr><td><code>DialogueNode</code></td><td>Conversation node: speaker, text, branches, actions, condition.</td></tr>
          <tr><td><code>DialogueBranch</code></td><td>Player choice: text, target node, optional condition.</td></tr>
          <tr><td><code>DialogueAction</code></td><td>Side effect triggered by a dialogue node (setFlag, giveItem, etc.).</td></tr>
          <tr><td><code>VerbCursorMap</code></td><td>Maps verb names to custom cursor image paths.</td></tr>
          <tr><td><code>ScriptContext</code></td><td>Full scripting API passed to all script handlers.</td></tr>
          <tr><td><code>GameState</code></td><td>Serializable snapshot of all game state (flags, vars, inventory, positions).</td></tr>
          <tr><td><code>SaveGameData</code></td><td>Save slot format with timestamp and full state.</td></tr>
          <tr><td><code>VerbType</code></td><td>Available interaction verbs (walk, look, open, close, pickup, use, talk, push, pull, give).</td></tr>
          <tr><td><code>Direction</code></td><td>Eight compass directions: N, NE, E, SE, S, SW, W, NW.</td></tr>
          <tr><td><code>AnimationState</code></td><td>Actor animation states: idle, walk, talk, face, interact_low, interact_mid, interact_high, interact, pickup, push_pull, special_use, emote.</td></tr>
        </tbody>
      </table>
    </section>
  );
}
