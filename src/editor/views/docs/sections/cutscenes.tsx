export function CutscenesSection() {
  return (
    <section>
      <h3>Cutscenes</h3>
      <p>
        Cutscenes are scripted sequences where you take control away from the player and
        choreograph a series of actions — characters walk to positions, say lines, objects
        change state, and the camera may fade in and out. Think of the dramatic opening
        scenes in classic adventure games.
      </p>
      <h4>How It Works</h4>
      <p>
        Scripts can be <code>async</code> functions. When a script returns a Promise, the engine
        awaits it before resuming normal gameplay. Combined with <code>beginCutscene()</code> to
        lock player input and mark the scheduler as being in cutscene mode, you can build
        cinematic sequences. Calling <code>endCutscene()</code> unlocks input and clears the
        cutscene flag.
      </p>
      <p>
        You can also use <code>lockInput()</code> / <code>unlockInput()</code> directly without
        the cutscene flag if you just need to freeze controls briefly.
      </p>
      <h4>Complete Cutscene Example</h4>
      <pre><code>{`enter_farmyard_gate: async (ctx: ScriptContext) => {
  // Only play the intro cutscene on the first visit
  if (ctx.state.hasVisitedRoom("farmyard_gate")) return;

  ctx.beginCutscene();  // Lock input + mark cutscene mode

  // Actor walks to a position
  await ctx.walkActorTo("player", 350, 320);

  // Actor turns to face a direction
  ctx.faceActor("player", "N");

  // Speech bubble appears over the actor and waits
  await ctx.sayBlocking("player", "What a strange old house...");

  // Pause for dramatic effect
  await ctx.wait(800);

  await ctx.sayBlocking("player", "I should explore.");

  ctx.endCutscene();  // Unlock input + clear cutscene mode
}`}</code></pre>
      <h4>Safety Features</h4>
      <ul>
        <li><strong>30-second timeout:</strong> If a script takes longer than 30 seconds, the engine
          automatically stops it and logs an error. This prevents the game from freezing
          if a script has a bug.</li>
        <li><strong>Auto-unlock:</strong> If a script crashes or times out while input is locked,
          the engine automatically unlocks input so the player isn't stuck.</li>
      </ul>
      <h4>Tips</h4>
      <ul>
        <li>Always pair <code>beginCutscene()</code> with <code>endCutscene()</code> (or <code>lockInput()</code> with <code>unlockInput()</code>).</li>
        <li>Use <code>ctx.state.hasVisitedRoom(roomId)</code> to play a cutscene only on the first visit.</li>
        <li>You can use <code>fadeOut</code> and <code>fadeIn</code> to create dramatic scene transitions within a cutscene.</li>
        <li>NPC actors can be moved and spoken through just like the player actor.</li>
      </ul>
    </section>
  );
}
