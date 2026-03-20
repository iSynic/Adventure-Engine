export function ActorsSection() {
  return (
    <section>
      <h3>Actors</h3>
      <p>
        Actors are characters in the game world — the player character and any NPCs. Every
        game must have at least one actor with <code>isPlayer: true</code>.
      </p>
      <pre><code>{`const playerActor: ActorDefinition = {
  id: "player",
  name: "You",
  isPlayer: true,
  position: { x: 200, y: 340 },
  facing: "E",
  movementSpeed: 130,
  spriteWidth: 40,
  spriteHeight: 60,
};

const npcActor: ActorDefinition = {
  id: "old_hermit",
  name: "Old Hermit",
  isPlayer: false,
  defaultRoomId: "farmyard_gate",
  position: { x: 550, y: 320 },
  facing: "W",
  movementSpeed: 80,
  spriteWidth: 40,
  spriteHeight: 60,
  dialogueId: "hermit_greeting",  // Dialogue tree to start on Talk verb
};`}</code></pre>
      <h4>Key Fields</h4>
      <table>
        <thead>
          <tr><th>Field</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>isPlayer</code></td><td>If true, this actor is controlled by the player.</td></tr>
          <tr><td><code>defaultRoomId</code></td><td>Which room the NPC appears in.</td></tr>
          <tr><td><code>movementSpeed</code></td><td>Walking speed in pixels per second.</td></tr>
          <tr><td><code>facing</code></td><td>Direction the actor faces: N, NE, E, SE, S, SW, W, NW.</td></tr>
          <tr><td><code>spritePath</code></td><td>Asset ID or path for the actor's default sprite image.</td></tr>
          <tr><td><code>spriteWidth</code> / <code>spriteHeight</code></td><td>Display dimensions of the actor's sprite in pixels.</td></tr>
          <tr><td><code>scale</code></td><td>Uniform scale factor (e.g. <code>1.0</code> = 100%). Range 0.1 to 5.</td></tr>
          <tr><td><code>animations</code></td><td>Sprite animation sets for walk cycles, idle, talk, etc. (see Sprite Animations).</td></tr>
          <tr><td><code>dialogueId</code></td><td>Dialogue tree ID launched when the player uses "Talk" on this actor.</td></tr>
        </tbody>
      </table>
      <h4>Editor Workflow</h4>
      <p>
        In the editor, open the <strong>Actors</strong> tab and click an actor to expand
        the <strong>Actor Details</strong> panel. This panel lets you configure every property
        visually:
      </p>
      <ul>
        <li><strong>Sprite picker</strong> — choose a sprite image from the asset library (sprites are prioritized in the dropdown, with other images available too). A thumbnail preview shows the selected sprite.</li>
        <li><strong>Starting Room</strong> — dropdown listing all rooms in the project.</li>
        <li><strong>Position</strong> — X and Y coordinates for the actor's starting position.</li>
        <li><strong>Sprite Size</strong> — width and height of the sprite for rendering.</li>
        <li><strong>Scale</strong> — uniform scale multiplier (0.1 to 5).</li>
        <li><strong>Movement Speed</strong> — walking speed in pixels per second (10 to 500).</li>
        <li><strong>Is Player Character</strong> — checkbox that marks this actor as the player-controlled character.</li>
      </ul>
    </section>
  );
}
