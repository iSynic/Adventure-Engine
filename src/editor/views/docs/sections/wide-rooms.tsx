export function WideRoomsSection() {
  return (
    <section>
      <h3>Wide &amp; Scrolling Rooms</h3>
      <p>
        Rooms are not limited to the project's display viewport size (set by <code>display.baseWidth</code>{" "}
        and <code>display.baseHeight</code> in the project config). You can make rooms
        any dimensions — for example, 1600×360 for a long horizontal corridor, or 640×480
        for a tall interior space. When a room is wider than the display viewport, the camera
        automatically scrolls to follow the player.
      </p>
      <h4>Setting Room Dimensions</h4>
      <p>
        In code, set the <code>width</code> and <code>height</code> fields on your
        <code>RoomDefinition</code>. In the editor, use the <strong>Room Settings</strong> panel
        below the room list — you'll see Width and Height number inputs.
      </p>
      <pre><code>{`const wideRoom: RoomDefinition = {
  id: "long_corridor",
  name: "Long Corridor",
  backgroundPath: "projects/my-game/backgrounds/corridor.png",
  width: 1600,   // Wider than display.baseWidth — camera will scroll
  height: 400,
  walkboxes: [...],
  // ...
};`}</code></pre>
      <h4>Parallax Layers</h4>
      <p>
        Parallax layers are background images that scroll at different speeds as the camera
        moves, creating a sense of depth. A layer with <code>scrollFactor: 0</code> stays fixed,
        <code>scrollFactor: 0.5</code> scrolls at half the camera speed, and
        <code>scrollFactor: 1</code> scrolls at full speed (same as the main background).
      </p>
      <pre><code>{`const outdoorRoom: RoomDefinition = {
  id: "forest_path",
  width: 1600,
  height: 400,
  parallaxLayers: [
    { imagePath: "projects/my-game/backgrounds/sky.png", scrollFactor: 0 },
    { imagePath: "projects/my-game/backgrounds/mountains.png", scrollFactor: 0.3 },
    { imagePath: "projects/my-game/backgrounds/trees.png", scrollFactor: 0.7 },
  ],
  // ...
};`}</code></pre>
      <h4>Editor Workflow</h4>
      <ol>
        <li>Select a room in the Room List.</li>
        <li>In the <strong>Room Settings</strong> panel, set Width and Height.</li>
        <li>Click <strong>Add Parallax Layer</strong> to add layers. For each, pick an asset image and set a scroll factor between 0 and 1.</li>
        <li>The editor canvas will show scrollbars when the room is larger than the viewport.</li>
      </ol>
    </section>
  );
}
