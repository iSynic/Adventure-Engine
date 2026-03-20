export function AnimationsSection() {
  return (
    <section>
      <h3>Sprite Animations</h3>
      <p>
        Actors can have frame-by-frame sprite animations for different states (idle, walk,
        talk, interact) and facing directions (N, NE, E, SE, S, SW, W, NW). The engine
        cycles through frames at the durations you specify, giving characters walk cycles,
        idle loops, and talk animations.
      </p>
      <h4>How It Works</h4>
      <p>
        The animation system uses a three-level lookup to find frames to play:
      </p>
      <ol>
        <li><strong>Exact match</strong>: looks for the actor's current direction + current state (e.g. <code>walk</code> while facing <code>E</code>).</li>
        <li><strong>Nearest direction</strong>: if no exact match, finds the closest available direction with frames (e.g. <code>SE</code> falls back to <code>S</code> or <code>E</code>).</li>
        <li><strong>Base direction</strong>: a universal fallback direction keyed as <code>"*"</code> that works for all directions.</li>
      </ol>
      <p>
        If no animation frames are defined at all, the engine draws a procedural placeholder
        so nothing breaks.
      </p>
      <h4>Animation Definition</h4>
      <pre><code>{`const playerActor: ActorDefinition = {
  id: "player",
  name: "You",
  isPlayer: true,
  animations: {
    // Direction key → animation states
    "S": {
      idle: {
        id: "player_idle_s",
        frames: [
          { imagePath: "projects/my-game/actors/player/idle_s_1.png", duration: 400 },
          { imagePath: "projects/my-game/actors/player/idle_s_2.png", duration: 400 },
        ],
        loop: true,
      },
      walk: {
        id: "player_walk_s",
        frames: [
          { imagePath: "projects/my-game/actors/player/walk_s_1.png", duration: 150 },
          { imagePath: "projects/my-game/actors/player/walk_s_2.png", duration: 150 },
          { imagePath: "projects/my-game/actors/player/walk_s_3.png", duration: 150 },
          { imagePath: "projects/my-game/actors/player/walk_s_4.png", duration: 150 },
        ],
        loop: true,
      },
    },
    "E": { /* same structure for east-facing */ },
    // Use "*" as a base fallback for all directions:
    "*": {
      idle: { id: "player_idle_base", frames: [...], loop: true },
    },
  },
  // ...
};`}</code></pre>
      <h4>Frame Properties</h4>
      <table>
        <thead>
          <tr><th>Property</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>imagePath</code></td><td>Path to the frame image (relative to asset root).</td></tr>
          <tr><td><code>duration</code></td><td>How long this frame is displayed, in milliseconds. Lower = faster animation.</td></tr>
          <tr><td><code>loop</code></td><td>Whether the animation repeats. Typically <code>true</code> for idle and walk cycles.</td></tr>
        </tbody>
      </table>
      <h4>Editor Workflow</h4>
      <ol>
        <li>Open the <strong>Actors</strong> tab in the editor.</li>
        <li>Select an actor from the list.</li>
        <li>The <strong>Animation Panel</strong> appears. Choose an animation state (idle, walk, talk, face, interact_low, interact_mid, interact_high, interact, pickup, push_pull, special_use, emote) and a direction.</li>
        <li>Add frames by picking images from the asset library or entering paths manually. Set the duration for each frame.</li>
        <li>Use the live preview to see the animation loop in real time.</li>
        <li>The direction coverage grid shows which directions have animations defined.</li>
      </ol>
      <h4>Asset Preloading</h4>
      <p>
        The engine automatically preloads all animation frame images when a room loads.
        Every frame referenced in an actor's <code>AnimationSet</code> is fetched and cached
        before the actor appears on screen, so animations play smoothly without stutter
        or pop-in. Make sure all image paths in your frame definitions point to valid files
        in your project's assets folder.
      </p>
      <p>
        <strong>Tip:</strong> You only need to define a few directions — the engine will
        find the nearest available direction automatically. For simple games, using the
        base <code>"*"</code> direction gives you one animation set that works everywhere.
      </p>
    </section>
  );
}
