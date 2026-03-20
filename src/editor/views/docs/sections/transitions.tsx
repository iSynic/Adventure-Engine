export function TransitionsSection() {
  return (
    <section>
      <h3>Room Transitions</h3>
      <p>
        When the player moves between rooms, the engine can play a smooth transition effect
        instead of snapping instantly. By default, rooms use a <strong>fade-to-black</strong> effect:
        the screen fades out, the new room loads, and the screen fades back in.
      </p>
      <h4>Transition Effects</h4>
      <table>
        <thead>
          <tr><th>Effect</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>"fade"</code></td><td>Smooth fade to black and back (~300ms each way). This is the default.</td></tr>
          <tr><td><code>"instant"</code></td><td>Room changes immediately with no animation.</td></tr>
        </tbody>
      </table>
      <p>
        Set the effect on a room's definition:
      </p>
      <pre><code>{`const myRoom: RoomDefinition = {
  // ...
  transitionEffect: "fade",  // or "instant"
};`}</code></pre>
      <h4>Manual Fade in Scripts</h4>
      <p>
        You can also trigger fades manually in cutscene scripts for dramatic effect:
      </p>
      <pre><code>{`dramatic_scene: async (ctx: ScriptContext) => {
  ctx.lockInput();
  await ctx.sayBlocking("player", "Everything goes dark...");
  await ctx.fadeOut(500);     // Fade to black over 500ms
  await ctx.wait(1000);       // Hold black screen for 1 second
  ctx.gotoRoom("dream_world");
  await ctx.fadeIn(500);      // Fade back in
  ctx.unlockInput();
}`}</code></pre>
      <h4>How It Works</h4>
      <p>
        The fade effect is implemented as a black canvas overlay controlled by the renderer.
        It's drawn on top of all game content, with its opacity animated from 0 to 1 (fade out)
        or 1 to 0 (fade in). This means it works consistently regardless of the room content.
      </p>
    </section>
  );
}
