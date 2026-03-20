export function ObjectStatesSection() {
  return (
    <section>
      <h3>Object Visual States</h3>
      <p>
        Objects often change appearance when interacted with — a mailbox opens, a light
        switch flips, a chest unlocks. The <strong>state sprites</strong> system lets you
        bind an object's visual appearance to its state values, so the engine automatically
        swaps the displayed sprite when the state changes.
      </p>
      <h4>How It Works</h4>
      <p>
        Each object can have a <code>stateSprites</code> array. Each entry maps a state key
        and value to a sprite image. When the object's state matches an entry, that sprite
        is drawn instead of the default <code>spritePath</code>.
      </p>
      <pre><code>{`const mailbox: ObjectDefinition = {
  id: "mailbox",
  name: "Mailbox",
  spritePath: "projects/my-game/objects/mailbox_closed.png",
  state: { open: false },
  stateSprites: [
    {
      stateKey: "open",
      stateValue: "true",
      spritePath: "projects/my-game/objects/mailbox_open.png",
    },
    {
      stateKey: "open",
      stateValue: "false",
      spritePath: "projects/my-game/objects/mailbox_closed.png",
    },
  ],
  // ...
};`}</code></pre>
      <p>
        In your script, change the state and the sprite updates automatically:
      </p>
      <pre><code>{`open_mailbox: (ctx: ScriptContext) => {
  ctx.state.setObjectState("mailbox", "open", true);
  ctx.say("You open the mailbox.");
}`}</code></pre>
      <h4>Per-State Bounds</h4>
      <p>
        If the open version of an object is a different size than the closed version,
        you can add a <code>bounds</code> override to the state sprite entry. This changes
        the clickable area when that state is active.
      </p>
      <pre><code>{`{
  stateKey: "open",
  stateValue: "true",
  spritePath: "projects/my-game/objects/chest_open.png",
  bounds: { x: -30, y: -70, width: 60, height: 70 },  // Taller bounds for open chest
}`}</code></pre>
      <h4>Editor Workflow</h4>
      <ol>
        <li>Select an object on the room canvas.</li>
        <li>The <strong>Object Inspector</strong> panel opens on the right.</li>
        <li>In the "State Sprites" section, click <strong>Add State Sprite</strong>.</li>
        <li>Enter a state key (e.g. "open"), a state value (e.g. "true"), and pick a sprite from the asset library.</li>
      </ol>
    </section>
  );
}
