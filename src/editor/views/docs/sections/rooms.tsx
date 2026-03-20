export function RoomsSection() {
  return (
    <section>
      <h3>Rooms</h3>
      <p>
        Every scene in your game is a <strong>room</strong>. Rooms define the background image,
        walkable areas (walkboxes), exits to other rooms, objects placed in the scene,
        hotspots (invisible interaction zones), and spawn points where actors appear.
      </p>
      <h4>Setting a Background</h4>
      <p>
        In the editor, select a room and open the <strong>Room Settings</strong> panel. Use
        the <strong>Background</strong> dropdown to pick an image from the asset library.
        Assets categorized as "Background" appear first, followed by other image types.
        A thumbnail preview appears next to the dropdown so you can confirm the correct
        image is selected.
      </p>
      <h4>Room Definition</h4>
      <pre><code>{`const myRoom: RoomDefinition = {
  id: "intro_room",
  name: "The Beginning",
  backgroundPath: "projects/my-game/backgrounds/intro.png",
  width: 640,             // Room width in pixels — should match background image width
  height: 360,            // Room height in pixels — should match background image height
  transitionEffect: "fade", // "fade" (default) or "instant"
  walkboxes: [
    {
      id: "main",
      polygon: [
        { x: 0, y: 252 },
        { x: 640, y: 252 },
        { x: 640, y: 356 },
        { x: 0, y: 356 },
      ],
      adjacentIds: [],
    },
  ],
  exits: [
    {
      id: "go_east",
      direction: "E",
      bounds: { x: 600, y: 225, width: 40, height: 135 },
      targetRoomId: "east_room",
    },
  ],
  objectIds: ["my_object"],
  hotspots: [],
  spawnPoints: [{ id: "default", x: 160, y: 306 }],
  onEnter: "enter_intro_room",  // Script hook ID
};`}</code></pre>
      <h4>Key Fields</h4>
      <table>
        <thead>
          <tr><th>Field</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>width</code> / <code>height</code></td><td>Room dimensions in pixels. Set these to match your background image. Rooms wider than <code>display.baseWidth</code> (the project's display config) will cause the camera to scroll horizontally.</td></tr>
          <tr><td><code>walkboxes</code></td><td>Polygon areas where actors can walk. Connect multiple walkboxes via <code>adjacentIds</code>.</td></tr>
          <tr><td><code>exits</code></td><td>Clickable regions that transition to another room.</td></tr>
          <tr><td><code>spawnPoints</code></td><td>Named positions where the player appears when entering the room.</td></tr>
          <tr><td><code>transitionEffect</code></td><td>How the room fades in: <code>"fade"</code> (smooth fade-to-black) or <code>"instant"</code>.</td></tr>
          <tr><td><code>parallaxLayers</code></td><td>Background layers that scroll at different speeds (see Wide Rooms section).</td></tr>
          <tr><td><code>onEnter</code> / <code>onExit</code></td><td>Script hook IDs that fire when the player enters or leaves the room.</td></tr>
        </tbody>
      </table>
    </section>
  );
}
