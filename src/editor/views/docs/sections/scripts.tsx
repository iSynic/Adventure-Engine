export function ScriptsSection() {
  return (
    <section>
      <h3>Scripts &amp; ScriptContext API</h3>
      <p>
        Scripts are TypeScript functions that respond to game events — a player entering a room,
        clicking an object, using an item. They receive a <code>ScriptContext</code> object with
        methods to control the game.
      </p>
      <pre><code>{`import type { ScriptContext } from "../../../engine/scripting/ScriptRunner";

export const myScripts = {
  enter_intro_room: async (ctx: ScriptContext) => {
    if (!ctx.state.hasVisitedRoom("intro_room")) {
      ctx.lockInput();
      await ctx.sayBlocking("player", "Where am I?");
      await ctx.wait(500);
      await ctx.sayBlocking("player", "I should look around.");
      ctx.unlockInput();
    }
  },

  look_box: (ctx: ScriptContext) => {
    ctx.say("A very strange box. You wonder what's inside.");
  },

  open_box: (ctx: ScriptContext) => {
    if (ctx.getFlag("box_opened")) {
      ctx.say("You already opened it.");
      return;
    }
    ctx.setFlag("box_opened", true);
    ctx.giveItem("player", "golden_key");
    ctx.say("Inside the box is a golden key!");
  },
};`}</code></pre>
      <p>
        Notice that scripts can be <code>async</code> functions. The engine will await them
        before resuming normal gameplay. This is essential for cutscenes and dialogue.
        See the <strong>Cutscenes</strong> section for details.
      </p>
      <h4>ScriptContext API Reference</h4>
      <h5>Basic</h5>
      <table>
        <thead>
          <tr><th>Method</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ctx.say(text)</code></td><td>Show a message to the player (non-blocking).</td></tr>
          <tr><td><code>ctx.gotoRoom(roomId, spawnPointId?)</code></td><td>Transition to another room.</td></tr>
          <tr><td><code>ctx.setFlag(key, value)</code></td><td>Set a boolean game flag.</td></tr>
          <tr><td><code>ctx.getFlag(key)</code></td><td>Read a boolean flag.</td></tr>
          <tr><td><code>ctx.setVar(key, value)</code></td><td>Set a numeric or string variable.</td></tr>
          <tr><td><code>ctx.getVar(key)</code></td><td>Read a variable.</td></tr>
          <tr><td><code>ctx.giveItem(actorId, itemId)</code></td><td>Add an item to an actor's inventory.</td></tr>
          <tr><td><code>ctx.removeItem(actorId, itemId)</code></td><td>Remove an item from inventory.</td></tr>
          <tr><td><code>ctx.hasItem(actorId, itemId)</code></td><td>Check if an actor has an item.</td></tr>
        </tbody>
      </table>
      <h5>Blocking / Async (for cutscenes)</h5>
      <table>
        <thead>
          <tr><th>Method</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>await ctx.sayBlocking(actorId, text)</code></td><td>Show a speech bubble over an actor and wait until the line finishes.</td></tr>
          <tr><td><code>await ctx.walkActorTo(actorId, x, y)</code></td><td>Move an actor along the walkbox path. Resolves when they arrive.</td></tr>
          <tr><td><code>ctx.faceActor(actorId, direction)</code></td><td>Turn an actor to face a direction. Plays a turn animation if defined, otherwise snaps instantly.</td></tr>
          <tr><td><code>await ctx.wait(ms)</code></td><td>Pause script execution for a number of milliseconds.</td></tr>
        </tbody>
      </table>
      <h5>Animation Control</h5>
      <table>
        <thead>
          <tr><th>Method</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ctx.playAnimation(actorId, state, options?)</code></td><td>Play an animation state on an actor. Options: {"{"} waitForCompletion: boolean, loop: boolean {"}"}</td></tr>
          <tr><td><code>ctx.setAnimationOverride(actorId, state)</code></td><td>Set a persistent animation override that sticks until cleared.</td></tr>
          <tr><td><code>ctx.clearAnimationOverride(actorId)</code></td><td>Remove a persistent animation override.</td></tr>
        </tbody>
      </table>
      <h5>Input Control</h5>
      <table>
        <thead>
          <tr><th>Method</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ctx.lockInput()</code></td><td>Disable player mouse/keyboard interaction (for cutscenes).</td></tr>
          <tr><td><code>ctx.unlockInput()</code></td><td>Re-enable player interaction.</td></tr>
        </tbody>
      </table>
      <h5>Dialogue</h5>
      <table>
        <thead>
          <tr><th>Method</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>await ctx.startDialogue(treeId)</code></td><td>Launch a branching dialogue conversation. Resolves when the dialogue ends.</td></tr>
        </tbody>
      </table>
      <h5>Transitions</h5>
      <table>
        <thead>
          <tr><th>Method</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>await ctx.fadeOut(ms?)</code></td><td>Fade the screen to black over the given duration (default ~300ms).</td></tr>
          <tr><td><code>await ctx.fadeIn(ms?)</code></td><td>Fade the screen back in from black.</td></tr>
        </tbody>
      </table>
      <h5>Direct Subsystem Access</h5>
      <table>
        <thead>
          <tr><th>Property</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ctx.state</code></td><td>Direct access to the StateStore (flags, variables, object states, visited rooms).</td></tr>
          <tr><td><code>ctx.audio</code></td><td>Audio manager for playing sounds and music.</td></tr>
          <tr><td><code>ctx.inventory</code></td><td>Inventory system for advanced inventory operations.</td></tr>
        </tbody>
      </table>
    </section>
  );
}
