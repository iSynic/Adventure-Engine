export function ObjectsSection() {
  return (
    <section>
      <h3>Objects</h3>
      <p>
        Objects are interactable entities placed in rooms. They can be looked at, opened,
        picked up, used, and more via verb handlers defined in your scripts.
      </p>
      <pre><code>{`const myObject: ObjectDefinition = {
  id: "my_object",
  name: "Strange Box",
  roomId: "intro_room",
  position: { x: 320, y: 280 },
  spriteWidth: 48,
  spriteHeight: 48,
  spritePath: "projects/my-game/objects/box.png",
  bounds: { x: -24, y: -48, width: 48, height: 48 },
  visible: true,
  enabled: true,
  pickupable: false,
  description: "A very strange box.",
  verbHandlers: {
    look: "look_box",
    open: "open_box",
  },
};`}</code></pre>
      <h4>Key Fields</h4>
      <table>
        <thead>
          <tr><th>Field</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>visible</code></td><td>Whether the object is drawn on screen.</td></tr>
          <tr><td><code>enabled</code></td><td>Whether the player can interact with it.</td></tr>
          <tr><td><code>pickupable</code></td><td>If true, the "Pick Up" verb adds it to inventory.</td></tr>
          <tr><td><code>bounds</code></td><td>Clickable area relative to the object's position.</td></tr>
          <tr><td><code>state</code></td><td>Arbitrary key/value state (e.g. <code>{`{ open: false }`}</code>). Changed via scripts.</td></tr>
          <tr><td><code>stateSprites</code></td><td>Swap the displayed sprite based on state values (see Object Visual States).</td></tr>
          <tr><td><code>verbHandlers</code></td><td>Maps verbs to script hook IDs.</td></tr>
        </tbody>
      </table>
      <h4>Editor Workflow</h4>
      <p>
        Select an object on the room canvas to open the <strong>Object Inspector</strong>
        panel on the right. In the inspector you can edit the object name, description,
        pickupable checkbox, and state sprites. The <strong>Sprite</strong> field uses an
        asset picker — select an image from the dropdown, which prioritizes assets categorized
        as "Sprite" while also listing all other images. A thumbnail preview appears beside
        the dropdown.
      </p>
    </section>
  );
}
