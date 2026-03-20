export function ProjectFileSpecSection() {
  return (
    <section>
      <h3>Project File Specification (.advproject.json)</h3>
      <p>
        This section is a complete technical reference for the <code>.advproject.json</code> file
        format. It is designed so that an LLM (or any code generator) can produce a valid,
        pre-populated project file that can be imported directly into the editor via
        "Import JSON". The generated file should contain rooms, actors, objects, items, scripts,
        and dialogue trees that form a playable adventure game.
      </p>

      <h4>File Overview</h4>
      <p>
        A project file is a single JSON object with <code>formatVersion: 2</code>. It is entirely
        self-contained — all assets are embedded as Base64 data URLs in the <code>assets</code>
        array, and all scripts are stored either as JavaScript source strings or structured
        visual step arrays. No external files are needed.
      </p>
      <p>
        When imported, the editor assigns a fresh <code>id</code> and updates the
        <code>modified</code> timestamp — so treat those two fields as placeholders.
        The <code>created</code> field is preserved exactly as supplied. All other fields
        are also preserved exactly as written.
      </p>

      <h4>Top-Level Schema</h4>
      <pre><code>{`{
  "formatVersion": 2,
  "id": "placeholder",
  "title": "My Adventure Game",
  "created": 1700000000000,
  "modified": 1700000000000,
  "startingRoom": "room_id_of_first_room",
  "defaultPlayerActorId": "player",
  "defaultPlayerPosition": { "x": 200, "y": 340 },
  "startingItems": [],
  "verbs": ["walk","look","open","close","pickup","use","talk","push","pull","give"],
  "rooms": [],
  "actors": [],
  "objects": [],
  "items": [],
  "scripts": [],
  "assets": [],
  "dialogueTrees": [],
  "uiSettings": {
    "verbBarEnabled": true,
    "inventoryEnabled": true,
    "messageLogEnabled": true,
    "showRoomTitle": true
  },
  "globalFallbackScriptId": "generic_fallback",
  "stateWatchers": [],
  "variableDefinitions": [],
  "display": {
    "baseWidth": 640,
    "baseHeight": 360,
    "scalingMode": "integer",
    "pixelPerfect": true,
    "viewportAlignment": "center",
    "backgroundColor": "#000"
  },
  "overlayConfig": {
    "verbBar": { "visible": true, "verbSelectMode": "rightclick" },
    "inventoryBar": { "visible": true },
    "messageBar": { "visible": true },
    "saveLoadBar": { "visible": true },
    "hoverLabel": { "visible": true },
    "roomTitle": { "visible": true }
  }
}`}</code></pre>

      <h4>Field Reference</h4>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>formatVersion</code></td><td>number</td><td>Yes</td><td>Always <code>2</code>.</td></tr>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Any string (overwritten on import).</td></tr>
          <tr><td><code>title</code></td><td>string</td><td>Yes</td><td>Display name of the game.</td></tr>
          <tr><td><code>created</code></td><td>number</td><td>Yes</td><td>Unix timestamp in milliseconds (e.g. <code>Date.now()</code>).</td></tr>
          <tr><td><code>modified</code></td><td>number</td><td>Yes</td><td>Unix timestamp in milliseconds (overwritten on import).</td></tr>
          <tr><td><code>startingRoom</code></td><td>string</td><td>Yes</td><td>ID of the room the player starts in. Must match one of the room IDs.</td></tr>
          <tr><td><code>defaultPlayerActorId</code></td><td>string</td><td>Yes</td><td>ID of the player actor. Must match one actor with <code>isPlayer: true</code>.</td></tr>
          <tr><td><code>defaultPlayerPosition</code></td><td>{`{x,y}`}</td><td>Yes</td><td>Where the player spawns in the starting room (pixels).</td></tr>
          <tr><td><code>startingItems</code></td><td>string[]</td><td>Yes</td><td>Item IDs the player has at game start. Can be empty <code>[]</code>.</td></tr>
          <tr><td><code>verbs</code></td><td>string[]</td><td>Yes</td><td>Available verbs. Valid values: <code>"walk"</code>, <code>"look"</code>, <code>"open"</code>, <code>"close"</code>, <code>"pickup"</code>, <code>"use"</code>, <code>"talk"</code>, <code>"push"</code>, <code>"pull"</code>, <code>"give"</code>.</td></tr>
          <tr><td><code>rooms</code></td><td>array</td><td>Yes</td><td>Room definitions (see below).</td></tr>
          <tr><td><code>actors</code></td><td>array</td><td>Yes</td><td>Actor definitions (see below). Must include one player actor.</td></tr>
          <tr><td><code>objects</code></td><td>array</td><td>Yes</td><td>Object definitions (see below).</td></tr>
          <tr><td><code>items</code></td><td>array</td><td>Yes</td><td>Inventory item definitions (see below).</td></tr>
          <tr><td><code>scripts</code></td><td>array</td><td>Yes</td><td>Script definitions (see below).</td></tr>
          <tr><td><code>assets</code></td><td>array</td><td>Yes</td><td>Embedded assets as Base64 data URLs (see below). Can be <code>[]</code> — the engine draws placeholder art.</td></tr>
          <tr><td><code>dialogueTrees</code></td><td>array</td><td>No</td><td>Branching dialogue trees (see below).</td></tr>
          <tr><td><code>uiSettings</code></td><td>object</td><td>No</td><td>UI toggle flags (see below).</td></tr>
          <tr><td><code>verbCursors</code></td><td>object</td><td>No</td><td>Maps verb names to asset IDs for custom cursor images.</td></tr>
          <tr><td><code>globalFallbackScriptId</code></td><td>string</td><td>No</td><td>Script run when an interaction is not handled by any entity-level handler. This is the last stop in the resolution chain: <code>useWithHandlers</code> → <code>verbHandlers</code> → entity <code>fallbackScriptId</code> → <code>globalFallbackScriptId</code> → default engine text.</td></tr>
          <tr><td><code>variableDefinitions</code></td><td>array</td><td>No</td><td>Formal definitions for typed game variables. Each entry has <code>name</code>, <code>type</code> (<code>"boolean"</code> | <code>"number"</code> | <code>"string"</code>), optional <code>description</code>, <code>defaultValue</code>, <code>min</code>/<code>max</code> (for numbers), and <code>scope</code> (<code>"global"</code> | <code>"room"</code>).</td></tr>
          <tr><td><code>stateWatchers</code></td><td>array</td><td>No</td><td>Persistent condition monitors that auto-trigger scripts when conditions become true (see State Watchers below).</td></tr>
          <tr><td><code>display</code></td><td>object</td><td>No</td><td>Viewport display config. Fields: <code>baseWidth</code>, <code>baseHeight</code> (canvas resolution), <code>scalingMode</code> (<code>"integer"</code> | <code>"fit"</code> | <code>"stretch"</code> | <code>"none"</code>), <code>pixelPerfect</code> (boolean), <code>viewportAlignment</code> (<code>"center"</code> | <code>"top-left"</code>), <code>backgroundColor</code> (CSS color). Defaults to 640×360, integer scaling.</td></tr>
          <tr><td><code>overlayConfig</code></td><td>object</td><td>No</td><td>HUD overlay visibility. Each panel (<code>verbBar</code>, <code>inventoryBar</code>, <code>messageBar</code>, <code>saveLoadBar</code>, <code>hoverLabel</code>, <code>roomTitle</code>) takes <code>{`{ "visible": true }`}</code>. <code>verbBar</code> also accepts <code>verbSelectMode</code>: <code>"bar"</code> (click verb then target) or <code>"rightclick"</code> (right-click to cycle verb).</td></tr>
        </tbody>
      </table>

      <h4>Coordinate System</h4>
      <p>
        The game viewport size is defined by the project's <code>display</code> config
        (<code>baseWidth</code> × <code>baseHeight</code>). The default — and what the Bork
        sample uses — is <strong>640 × 360</strong>. Origin (0, 0) is top-left.
        X increases rightward, Y increases downward. Room backgrounds can be larger than
        the display viewport — when they are, the camera scrolls to follow the player.
      </p>
      <p>
        Walkable ground is typically in the lower portion of the screen (Y ~220–355).
        Objects and actors placed above Y ~220 are "farther away" and appear smaller if
        depth scaling is configured. Spawn points and actor positions should be inside
        walkbox polygons.
      </p>

      <h4>Room Definition</h4>
      <pre><code>{`{
  "id": "tavern",
  "name": "The Tavern",
  "backgroundPath": "",
  "width": 640,
  "height": 360,
  "walkboxes": [
    {
      "id": "floor",
      "polygon": [
        {"x": 24, "y": 252},
        {"x": 616, "y": 252},
        {"x": 616, "y": 355},
        {"x": 24, "y": 355}
      ],
      "adjacentIds": []
    }
  ],
  "exits": [
    {
      "id": "exit_street",
      "direction": "W",
      "bounds": {"x": 0, "y": 225, "width": 32, "height": 135},
      "targetRoomId": "street",
      "targetSpawnPointId": "from_tavern",
      "label": "Street"
    }
  ],
  "hotspots": [
    {
      "id": "notice_board",
      "name": "Notice Board",
      "roomId": "tavern",
      "bounds": {"x": 240, "y": 90, "width": 64, "height": 90},
      "description": "A wooden board covered in notices.",
      "verbHandlers": {"look": "look_notice_board"}
    }
  ],
  "spawnPoints": [
    {"id": "default", "x": 320, "y": 306},
    {"id": "from_street", "x": 80, "y": 306, "facing": "E"}
  ],
  "objectIds": ["barrel", "mug"],
  "actorIds": ["bartender"],
  "onEnter": "enter_tavern",
  "transitionEffect": "fade"
}`}</code></pre>

      <h4>Room Fields</h4>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique room identifier (snake_case recommended).</td></tr>
          <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Human-readable room name.</td></tr>
          <tr><td><code>backgroundPath</code></td><td>string</td><td>Yes</td><td>Asset path or empty string <code>""</code> (engine draws gradient placeholder).</td></tr>
          <tr><td><code>width</code></td><td>number</td><td>Yes</td><td>Room width in pixels. Set to <code>display.baseWidth</code> for a non-scrolling room; wider = camera follows player.</td></tr>
          <tr><td><code>height</code></td><td>number</td><td>Yes</td><td>Room height in pixels. Should match background image height. Typically matches <code>display.baseHeight</code>.</td></tr>
          <tr><td><code>walkboxes</code></td><td>array</td><td>Yes</td><td>Walkable polygon regions (at least one).</td></tr>
          <tr><td><code>exits</code></td><td>array</td><td>No</td><td>Clickable exit regions linking to other rooms.</td></tr>
          <tr><td><code>hotspots</code></td><td>array</td><td>No</td><td>Invisible interaction zones.</td></tr>
          <tr><td><code>spawnPoints</code></td><td>array</td><td>No</td><td>Named positions for actor placement.</td></tr>
          <tr><td><code>objectIds</code></td><td>string[]</td><td>No</td><td>IDs of objects placed in this room (must match object definitions).</td></tr>
          <tr><td><code>actorIds</code></td><td>string[]</td><td>No</td><td><strong>Required for NPCs to appear.</strong> IDs of NPC actors placed in this room. The engine only instantiates actors listed here — setting <code>defaultRoomId</code> on the actor alone is <em>not</em> sufficient. Both sides of the reference are required: the actor needs <code>defaultRoomId</code> pointing to this room, and this room needs the actor's ID in <code>actorIds</code>.</td></tr>
          <tr><td><code>onEnter</code></td><td>string</td><td>No</td><td>Script name executed when the player enters.</td></tr>
          <tr><td><code>onExit</code></td><td>string</td><td>No</td><td>Script name executed when the player leaves.</td></tr>
          <tr><td><code>transitionEffect</code></td><td>string</td><td>No</td><td><code>"fade"</code> (default) or <code>"instant"</code>.</td></tr>
          <tr><td><code>parallaxLayers</code></td><td>array</td><td>No</td><td>Background layers with <code>{`{imagePath, scrollFactor}`}</code>.</td></tr>
          <tr><td><code>maskPath</code></td><td>string</td><td>No</td><td>Asset path for a room mask image (e.g. for foreground overlays).</td></tr>
          <tr><td><code>ambientAudioPath</code></td><td>string</td><td>No</td><td>Asset path for a looping ambient audio track that plays while in this room.</td></tr>
          <tr><td><code>onUpdate</code></td><td>string</td><td>No</td><td>Script name executed every engine tick while this room is active. Use sparingly — runs at 60 fps.</td></tr>
        </tbody>
      </table>

      <h4>Walkbox Definition</h4>
      <p>
        Walkboxes are convex or concave polygons defining where actors can walk. Each room needs
        at least one. Multiple walkboxes connect via <code>adjacentIds</code> — the engine uses
        BFS pathfinding across connected walkboxes.
      </p>
      <pre><code>{`{
  "id": "main_floor",
  "polygon": [
    {"x": 40, "y": 270}, {"x": 600, "y": 270},
    {"x": 600, "y": 356}, {"x": 40, "y": 356}
  ],
  "adjacentIds": ["side_area"],
  "scale": {
    "near": 1.0, "far": 0.6,
    "yNear": 356, "yFar": 270
  },
  "speedModifier": 1.0
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique within the room.</td></tr>
          <tr><td><code>polygon</code></td><td>{`{x,y}[]`}</td><td>Yes</td><td>Ordered vertices (3+ points). Define clockwise or counter-clockwise.</td></tr>
          <tr><td><code>adjacentIds</code></td><td>string[]</td><td>Yes</td><td>IDs of connected walkboxes in this room. Can be <code>[]</code>.</td></tr>
          <tr><td><code>scale</code></td><td>object</td><td>No</td><td>Depth scaling: <code>near/far</code> = scale factors, <code>yNear/yFar</code> = Y boundaries.</td></tr>
          <tr><td><code>speedModifier</code></td><td>number</td><td>No</td><td>Walk speed multiplier (1.0 = normal, 0.5 = half speed).</td></tr>
        </tbody>
      </table>

      <h4>Exit Definition</h4>
      <pre><code>{`{
  "id": "go_north",
  "direction": "N",
  "bounds": {"x": 350, "y": 0, "width": 100, "height": 40},
  "targetRoomId": "forest",
  "targetSpawnPointId": "from_south",
  "label": "To the Forest"
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique within the room.</td></tr>
          <tr><td><code>direction</code></td><td>string</td><td>Yes</td><td>One of: <code>"N"</code>, <code>"NE"</code>, <code>"E"</code>, <code>"SE"</code>, <code>"S"</code>, <code>"SW"</code>, <code>"W"</code>, <code>"NW"</code>.</td></tr>
          <tr><td><code>bounds</code></td><td>{`{x,y,width,height}`}</td><td>Yes</td><td>Clickable rectangle in room coordinates.</td></tr>
          <tr><td><code>targetRoomId</code></td><td>string</td><td>Yes</td><td>Room to transition to.</td></tr>
          <tr><td><code>targetSpawnPointId</code></td><td>string</td><td>No</td><td>Spawn point in the target room. If omitted, uses "default".</td></tr>
          <tr><td><code>label</code></td><td>string</td><td>No</td><td>Hover text shown to the player.</td></tr>
          <tr><td><code>visibilityCondition</code></td><td>ConditionExpression</td><td>No</td><td>When set, the exit is only visible (and clickable) when this condition is true. See ConditionExpression below.</td></tr>
          <tr><td><code>interactionCondition</code></td><td>ConditionExpression</td><td>No</td><td>When set, the exit is visible but cannot be used unless this condition is true. The player sees it but gets blocked.</td></tr>
        </tbody>
      </table>

      <h4>Actor Definition</h4>
      <pre><code>{`{
  "id": "player",
  "name": "You",
  "isPlayer": true,
  "position": {"x": 200, "y": 340},
  "facing": "E",
  "movementSpeed": 130,
  "spriteWidth": 40,
  "spriteHeight": 60
}

{
  "id": "bartender",
  "name": "Bartender",
  "isPlayer": false,
  "defaultRoomId": "tavern",
  "position": {"x": 600, "y": 310},
  "facing": "W",
  "movementSpeed": 80,
  "spriteWidth": 40,
  "spriteHeight": 60,
  "dialogueId": "bartender_chat",
  "verbHandlers": {
    "look": "look_bartender",
    "talk": "talk_bartender"
  }
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique actor identifier.</td></tr>
          <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Display name.</td></tr>
          <tr><td><code>isPlayer</code></td><td>boolean</td><td>No</td><td>Set <code>true</code> for the player character. Exactly one actor should be the player.</td></tr>
          <tr><td><code>defaultRoomId</code></td><td>string</td><td>No</td><td>Room where this NPC belongs. Required for NPCs. <strong>Important:</strong> this alone does not place the actor — the target room must also list this actor's ID in its <code>actorIds</code> array.</td></tr>
          <tr><td><code>position</code></td><td>{`{x,y}`}</td><td>No</td><td>Starting position in their room.</td></tr>
          <tr><td><code>facing</code></td><td>string</td><td>No</td><td>Initial facing direction (N/NE/E/SE/S/SW/W/NW).</td></tr>
          <tr><td><code>movementSpeed</code></td><td>number</td><td>No</td><td>Pixels per second. Player default ~130, NPCs ~80.</td></tr>
          <tr><td><code>spriteWidth</code></td><td>number</td><td>No</td><td>Width of the sprite/placeholder in pixels.</td></tr>
          <tr><td><code>spriteHeight</code></td><td>number</td><td>No</td><td>Height of the sprite/placeholder in pixels.</td></tr>
          <tr><td><code>dialogueId</code></td><td>string</td><td>No</td><td>Dialogue tree ID triggered by the "Talk" verb.</td></tr>
          <tr><td><code>verbHandlers</code></td><td>object</td><td>No</td><td>Maps verb names to script names (e.g. {`{"look": "look_bartender"}`}).</td></tr>
          <tr><td><code>useWithHandlers</code></td><td>object</td><td>No</td><td>Maps inventory item IDs to script names. When the player uses a specific item on this actor, the mapped script runs instead of the generic <code>"use"</code> verb handler. E.g. <code>{`{"gold_coin": "bribe_guard"}`}</code>.</td></tr>
          <tr><td><code>fallbackScriptId</code></td><td>string</td><td>No</td><td>Catch-all script for unhandled verbs. Runs when the player uses a verb that has no handler in <code>verbHandlers</code> and no match in <code>useWithHandlers</code>.</td></tr>
          <tr><td><code>portraitPath</code></td><td>string</td><td>No</td><td>Asset path for a portrait image shown during dialogue.</td></tr>
          <tr><td><code>standPoint</code></td><td>{`{x,y}`}</td><td>No</td><td>Where the player walks to before interacting with this actor.</td></tr>
          <tr><td><code>approachDirection</code></td><td>string</td><td>No</td><td>Direction the player faces when arriving at the stand point (N/E/S/W/etc.).</td></tr>
          <tr><td><code>visible</code></td><td>boolean</td><td>No</td><td>Whether the actor is drawn. Default <code>true</code>.</td></tr>
          <tr><td><code>scale</code></td><td>number</td><td>No</td><td>Scale multiplier for the actor sprite (1.0 = normal).</td></tr>
        </tbody>
      </table>

      <h4>Object Definition</h4>
      <pre><code>{`{
  "id": "barrel",
  "name": "Barrel",
  "roomId": "tavern",
  "position": {"x": 350, "y": 320},
  "spriteWidth": 40,
  "spriteHeight": 50,
  "bounds": {"x": -20, "y": -50, "width": 40, "height": 50},
  "visible": true,
  "enabled": true,
  "pickupable": false,
  "description": "A large wooden barrel.",
  "verbHandlers": {
    "look": "look_barrel",
    "open": "open_barrel"
  },
  "state": {"open": false},
  "stateSprites": []
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique object identifier.</td></tr>
          <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Display name (shown on hover/click).</td></tr>
          <tr><td><code>roomId</code></td><td>string</td><td>No</td><td>Room where this object exists. Required if listed in a room's <code>objectIds</code>.</td></tr>
          <tr><td><code>position</code></td><td>{`{x,y}`}</td><td>No</td><td>Feet/anchor point of the object in room coordinates (pixels). This is the <strong>bottom-center</strong> of the sprite — the point where the object touches the ground. Bounds are relative to this point (use negative y to extend upward).</td></tr>
          <tr><td><code>spriteWidth/Height</code></td><td>number</td><td>No</td><td>Size of the sprite or placeholder in pixels. Recommended even without art — the engine uses these dimensions to size the colored placeholder rectangle.</td></tr>
          <tr><td><code>bounds</code></td><td>{`{x,y,w,h}`}</td><td>No</td><td>Clickable area <em>relative to position</em>. Negative x/y offsets center the bounds. E.g. position (350,320) with bounds (-20,-50,40,50) makes clickable area from (330,270) to (370,320).</td></tr>
          <tr><td><code>visible</code></td><td>boolean</td><td>No</td><td>Whether the object is drawn. Default <code>true</code>.</td></tr>
          <tr><td><code>enabled</code></td><td>boolean</td><td>No</td><td>Whether the player can interact. Default <code>true</code>.</td></tr>
          <tr><td><code>pickupable</code></td><td>boolean</td><td>No</td><td>If <code>true</code>, "Pick Up" verb automatically adds it to inventory.</td></tr>
          <tr><td><code>description</code></td><td>string</td><td>No</td><td>Text shown when the player looks at it (if no look script).</td></tr>
          <tr><td><code>verbHandlers</code></td><td>object</td><td>No</td><td>Maps verb names to script names.</td></tr>
          <tr><td><code>useWithHandlers</code></td><td>object</td><td>No</td><td>Maps inventory item IDs to script names. The preferred way to handle "use X on Y" puzzles. E.g. <code>{`{"brass_key": "unlock_with_key"}`}</code> — when the player uses the brass_key item on this object, the <code>unlock_with_key</code> script runs. Takes priority over the generic <code>"use"</code> verb handler.</td></tr>
          <tr><td><code>fallbackScriptId</code></td><td>string</td><td>No</td><td>Catch-all script for unhandled verbs. Runs when no matching <code>verbHandlers</code> or <code>useWithHandlers</code> entry exists.</td></tr>
          <tr><td><code>state</code></td><td>object</td><td>No</td><td>Arbitrary key-value state. Changed via scripts.</td></tr>
          <tr><td><code>stateSprites</code></td><td>array</td><td>No</td><td>Array of {`{stateKey, stateValue, spritePath}`} entries for visual state changes.</td></tr>
          <tr><td><code>primaryState</code></td><td>number</td><td>No</td><td>Zero-based index into <code>stateSprites</code> for the initial visual state.</td></tr>
          <tr><td><code>zOffset</code></td><td>number</td><td>No</td><td>Adjusts Y-depth sorting order (positive = drawn later / in front).</td></tr>
          <tr><td><code>zLayer</code></td><td>&quot;behind&quot; | &quot;normal&quot; | &quot;front&quot;</td><td>No</td><td>Rendering layer relative to actors. &quot;behind&quot; always renders under actors, &quot;front&quot; always over. Default is &quot;normal&quot; (Y-sorted with actors).</td></tr>
          <tr><td><code>visibilityCondition</code></td><td>ConditionExpression</td><td>No</td><td>When set, the object is only visible when this condition is true. Powerful for puzzle progression — e.g. reveal a hidden passage after a flag is set. See ConditionExpression below.</td></tr>
          <tr><td><code>interactionCondition</code></td><td>ConditionExpression</td><td>No</td><td>When set, the object is visible but cannot be interacted with unless this condition is true.</td></tr>
          <tr><td><code>tags</code></td><td>string[]</td><td>No</td><td>Arbitrary tags for categorization. Can be checked by <code>hasTag</code> conditions.</td></tr>
          <tr><td><code>affordance</code></td><td>string</td><td>No</td><td>Suggested default verb: <code>"look"</code>, <code>"pickup"</code>, <code>"use"</code>, <code>"talk"</code>, or <code>"none"</code>.</td></tr>
          <tr><td><code>standPoint</code></td><td>{`{x,y}`}</td><td>No</td><td>Where the player walks to before interacting with this object.</td></tr>
          <tr><td><code>approachDirection</code></td><td>string</td><td>No</td><td>Direction the player faces when arriving at the stand point (N/E/S/W/etc.).</td></tr>
          <tr><td><code>interactionHotspot</code></td><td>{`{x,y,width,height}`}</td><td>No</td><td>Custom clickable sub-region of the sprite (relative to position). Overrides <code>bounds</code> for click detection only.</td></tr>
          <tr><td><code>cursorOverride</code></td><td>string</td><td>No</td><td>Custom cursor asset ID shown when hovering over this object.</td></tr>
        </tbody>
      </table>

      <h4>Item Definition (Inventory)</h4>
      <pre><code>{`{
  "id": "rusty_key",
  "name": "Rusty Key",
  "description": "A small rusty key. It might open something.",
  "verbHandlers": {
    "look": "examine_rusty_key",
    "use": "use_rusty_key"
  }
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique item identifier.</td></tr>
          <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Display name in inventory.</td></tr>
          <tr><td><code>description</code></td><td>string</td><td>No</td><td>Shown when examined.</td></tr>
          <tr><td><code>iconPath</code></td><td>string</td><td>No</td><td>Asset path for the inventory icon.</td></tr>
          <tr><td><code>verbHandlers</code></td><td>object</td><td>No</td><td>Maps verb names to script names.</td></tr>
          <tr><td><code>useWithHandlers</code></td><td>object</td><td>No</td><td>Maps target entity IDs (object/actor/hotspot IDs) to script names. When this inventory item is used on a specific target, the mapped script runs. E.g. <code>{`{"locked_door": "use_key_on_door"}`}</code>.</td></tr>
          <tr><td><code>fallbackScriptId</code></td><td>string</td><td>No</td><td>Catch-all script for unhandled verbs on this item.</td></tr>
        </tbody>
      </table>

      <h4>Script Definition</h4>
      <p>
        Scripts are the heart of game logic. Each script has a <code>name</code> (referenced by
        verb handlers, room hooks, etc.) and either a <code>body</code> string (raw JavaScript)
        or a <code>steps</code> array (visual script). The raw body receives a <code>ctx</code>
        parameter — the ScriptContext API.
      </p>
      <pre><code>{`// Raw script (kind: "raw" or omitted):
{
  "name": "open_barrel",
  "body": "if (ctx.getFlag('barrel_open')) { ctx.say('Already open.'); return; } ctx.setFlag('barrel_open', true); ctx.say('You pry open the barrel and find a silver coin!'); ctx.giveItem('player', 'silver_coin');",
  "description": "Opening the barrel puzzle"
}

// Visual script (kind: "visual"):
{
  "name": "open_barrel_visual",
  "kind": "visual",
  "body": "",
  "description": "Same puzzle using visual steps",
  "steps": [
    {
      "type": "if",
      "condition": {"type": "flag", "flag": "barrel_open"},
      "thenSteps": [
        {"type": "say", "text": "Already open."}
      ],
      "elseSteps": [
        {"type": "setFlag", "flag": "barrel_open", "value": true},
        {"type": "say", "text": "You pry open the barrel and find a silver coin!"},
        {"type": "giveItem", "actorId": "player", "itemId": "silver_coin"}
      ]
    }
  ]
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Script identifier. Referenced by <code>verbHandlers</code>, <code>onEnter</code>, etc.</td></tr>
          <tr><td><code>kind</code></td><td>&quot;raw&quot; | &quot;visual&quot;</td><td>No</td><td>Script format. Default is <code>"raw"</code>. When <code>"visual"</code>, the engine compiles <code>steps</code> instead of executing <code>body</code>.</td></tr>
          <tr><td><code>body</code></td><td>string</td><td>Yes</td><td>JavaScript code string for raw scripts. Set to <code>""</code> when using visual steps. Has access to <code>ctx</code> (ScriptContext). The engine wraps the body in an <code>async function</code> automatically, so <code>await</code> is always valid. Errors are caught and logged to the console — they do not crash the engine. Return values are ignored. There are no banned APIs. The context variables <code>ctx.verb</code>, <code>ctx.currentTargetId</code>, <code>ctx.currentTargetType</code>, and <code>ctx.secondaryTargetId</code> are available to inspect which verb triggered the script and what the target was.</td></tr>
          <tr><td><code>steps</code></td><td>array</td><td>No</td><td>Array of structured step objects for visual scripts. Used when <code>kind</code> is <code>"visual"</code>. See Visual Script Steps below.</td></tr>
          <tr><td><code>description</code></td><td>string</td><td>No</td><td>Human-readable note about what this script does.</td></tr>
        </tbody>
      </table>

      <h4>Visual Script Steps</h4>
      <p>
        Visual scripts use structured step objects instead of raw code. Each step has a
        <code>type</code> and type-specific fields. This format is more structured and less
        error-prone than raw JavaScript strings. Available step types:
      </p>
      <table>
        <thead>
          <tr><th>Step Type</th><th>Fields</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>"say"</code></td><td><code>text</code></td><td>Show a message (non-blocking).</td></tr>
          <tr><td><code>"sayBlocking"</code></td><td><code>actorId</code>, <code>text</code></td><td>Show a speech bubble and wait for dismissal.</td></tr>
          <tr><td><code>"setFlag"</code></td><td><code>flag</code>, <code>value</code></td><td>Set a boolean flag.</td></tr>
          <tr><td><code>"setVar"</code></td><td><code>variable</code>, <code>value</code></td><td>Set a variable.</td></tr>
          <tr><td><code>"incrementVar"</code></td><td><code>variable</code>, <code>amount?</code></td><td>Increment a numeric variable.</td></tr>
          <tr><td><code>"giveItem"</code></td><td><code>actorId</code>, <code>itemId</code></td><td>Give an item to an actor.</td></tr>
          <tr><td><code>"removeItem"</code></td><td><code>actorId</code>, <code>itemId</code></td><td>Remove an item from inventory.</td></tr>
          <tr><td><code>"gotoRoom"</code></td><td><code>roomId</code>, <code>spawnPointId?</code></td><td>Transition to a room.</td></tr>
          <tr><td><code>"wait"</code></td><td><code>duration</code></td><td>Pause for N milliseconds.</td></tr>
          <tr><td><code>"walkActorTo"</code></td><td><code>actorId</code>, <code>x</code>, <code>y</code></td><td>Move actor along walkbox path.</td></tr>
          <tr><td><code>"faceActor"</code></td><td><code>actorId</code>, <code>direction</code></td><td>Turn actor to face a direction.</td></tr>
          <tr><td><code>"startDialogue"</code></td><td><code>treeId</code></td><td>Launch a dialogue tree.</td></tr>
          <tr><td><code>"fadeOut"</code></td><td><code>duration?</code></td><td>Fade screen to black.</td></tr>
          <tr><td><code>"fadeIn"</code></td><td><code>duration?</code></td><td>Fade screen from black.</td></tr>
          <tr><td><code>"lockInput"</code></td><td>(none)</td><td>Freeze player interaction.</td></tr>
          <tr><td><code>"unlockInput"</code></td><td>(none)</td><td>Re-enable player interaction.</td></tr>
          <tr><td><code>"beginCutscene"</code></td><td>(none)</td><td>Start cutscene mode (locks input).</td></tr>
          <tr><td><code>"endCutscene"</code></td><td>(none)</td><td>End cutscene mode.</td></tr>
          <tr><td><code>"setObjectState"</code></td><td><code>objectId</code>, <code>key</code>, <code>value</code></td><td>Set a key on an object's state.</td></tr>
          <tr><td><code>"setObjectPrimaryState"</code></td><td><code>objectId</code>, <code>stateIndex</code></td><td>Set the primary state sprite index.</td></tr>
          <tr><td><code>"playAnimation"</code></td><td><code>actorId</code>, <code>animationState</code>, <code>waitForCompletion?</code></td><td>Play an animation.</td></tr>
          <tr><td><code>"emitSignal"</code></td><td><code>signal</code></td><td>Emit a named signal (for inter-script communication).</td></tr>
          <tr><td><code>"scheduleScript"</code></td><td><code>scriptId</code></td><td>Queue another script for execution.</td></tr>
          <tr><td><code>"setRoomVar"</code></td><td><code>roomId</code>, <code>key</code>, <code>value</code></td><td>Set a room-scoped variable.</td></tr>
          <tr><td><code>"if"</code></td><td><code>condition</code>, <code>thenSteps</code>, <code>elseSteps?</code></td><td>Conditional branching. <code>condition</code> is a ConditionExpression object. <code>thenSteps</code> and <code>elseSteps</code> are arrays of steps.</td></tr>
        </tbody>
      </table>

      <h4>ScriptContext API (available as <code>ctx</code> in script bodies)</h4>
      <table>
        <thead>
          <tr><th>Method / Property</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ctx.say(text)</code></td><td>Show a speech bubble / message. Non-blocking.</td></tr>
          <tr><td><code>await ctx.sayBlocking(actorId, text)</code></td><td>Show speech bubble over an actor. Blocks until dismissed.</td></tr>
          <tr><td><code>ctx.setFlag(key, value)</code></td><td>Set a boolean flag (for puzzle state, conditions).</td></tr>
          <tr><td><code>ctx.getFlag(key)</code></td><td>Get a boolean flag value (false if unset).</td></tr>
          <tr><td><code>ctx.setVar(key, value)</code></td><td>Set a numeric/string variable.</td></tr>
          <tr><td><code>ctx.getVar(key)</code></td><td>Get a variable value.</td></tr>
          <tr><td><code>ctx.giveItem(actorId, itemId)</code></td><td>Add an item to an actor's inventory.</td></tr>
          <tr><td><code>ctx.removeItem(actorId, itemId)</code></td><td>Remove an item from inventory.</td></tr>
          <tr><td><code>ctx.hasItem(actorId, itemId)</code></td><td>Check if an actor has an item (returns boolean).</td></tr>
          <tr><td><code>ctx.gotoRoom(roomId, spawnPointId?)</code></td><td>Transition to another room.</td></tr>
          <tr><td><code>await ctx.wait(ms)</code></td><td>Pause script execution for N milliseconds.</td></tr>
          <tr><td><code>await ctx.walkActorTo(actorId, x, y)</code></td><td>Move an actor along walkbox path. Resolves on arrival.</td></tr>
          <tr><td><code>ctx.faceActor(actorId, direction)</code></td><td>Turn an actor to face a direction. Plays a turn animation if one is defined.</td></tr>
          <tr><td><code>ctx.playAnimation(actorId, state, options?)</code></td><td>Play an animation state. Options: waitForCompletion (boolean), loop (boolean).</td></tr>
          <tr><td><code>ctx.setAnimationOverride(actorId, state)</code></td><td>Set a persistent animation override that sticks until cleared.</td></tr>
          <tr><td><code>ctx.clearAnimationOverride(actorId)</code></td><td>Clear a persistent animation override.</td></tr>
          <tr><td><code>await ctx.fadeOut(ms?)</code></td><td>Fade screen to black.</td></tr>
          <tr><td><code>await ctx.fadeIn(ms?)</code></td><td>Fade screen from black.</td></tr>
          <tr><td><code>ctx.lockInput()</code></td><td>Freeze player interaction (for cutscenes).</td></tr>
          <tr><td><code>ctx.unlockInput()</code></td><td>Re-enable player interaction.</td></tr>
          <tr><td><code>await ctx.startDialogue(treeId)</code></td><td>Launch a dialogue tree. Blocks until dialogue ends.</td></tr>
          <tr><td><code>ctx.state</code></td><td>Direct access to the StateStore (flags, vars, visited rooms, object states).</td></tr>
          <tr><td><code>ctx.verb</code></td><td>The verb the player used (e.g. "look", "use").</td></tr>
          <tr><td><code>ctx.currentTargetId</code></td><td>ID of the object/actor/hotspot the player clicked.</td></tr>
          <tr><td><code>ctx.secondaryTargetId</code></td><td>For "use X on Y" — the ID of the secondary target.</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Important:</strong> Script bodies are strings, not functions. Write them as a
        single-line or multi-line string. Use semicolons between statements. For async operations
        (<code>wait</code>, <code>walkActorTo</code>, <code>sayBlocking</code>, <code>fadeOut</code>,
        <code>fadeIn</code>, <code>startDialogue</code>), prefix with <code>await</code>.
      </p>
      <p>
        Example cutscene script body:
      </p>
      <pre><code>{`"ctx.lockInput(); await ctx.sayBlocking('narrator', 'The door creaks open...'); await ctx.fadeOut(500); ctx.gotoRoom('secret_room', 'entrance'); await ctx.fadeIn(500); ctx.unlockInput();"`}</code></pre>

      <h4>Dialogue Tree Definition</h4>
      <p>
        Dialogue trees define branching conversations with NPCs. They are triggered by
        setting an actor's <code>dialogueId</code> or calling <code>ctx.startDialogue(treeId)</code>
        from a script.
      </p>
      <pre><code>{`{
  "id": "bartender_chat",
  "name": "Bartender Conversation",
  "actorId": "bartender",
  "startNodeId": "greeting",
  "nodes": [
    {
      "id": "greeting",
      "speaker": "bartender",
      "text": "Welcome, traveler! What can I get you?",
      "branches": [
        {
          "id": "ask_info",
          "text": "I'm looking for information.",
          "nextNodeId": "info_response"
        },
        {
          "id": "ask_drink",
          "text": "Just an ale, please.",
          "nextNodeId": "drink_response"
        },
        {
          "id": "leave",
          "text": "Nothing, thanks.",
          "nextNodeId": null
        }
      ],
      "actions": []
    },
    {
      "id": "info_response",
      "speaker": "bartender",
      "text": "Information costs coin around here, friend.",
      "branches": [
        {
          "id": "pay",
          "text": "Here, take this silver coin.",
          "nextNodeId": "paid_info",
          "condition": "has_silver_coin"
        },
        {
          "id": "no_money",
          "text": "I don't have any money.",
          "nextNodeId": null
        }
      ]
    },
    {
      "id": "paid_info",
      "speaker": "bartender",
      "text": "The treasure is hidden beneath the old well.",
      "branches": [],
      "actions": [
        {"type": "setFlag", "flag": "knows_treasure_location", "flagValue": true},
        {"type": "endDialogue"}
      ]
    },
    {
      "id": "drink_response",
      "speaker": "bartender",
      "text": "Coming right up!",
      "branches": [],
      "actions": [
        {"type": "giveItem", "itemId": "ale", "actorId": "player"},
        {"type": "endDialogue"}
      ]
    }
  ]
}`}</code></pre>

      <h4>Hotspot Fields</h4>
      <p>
        Hotspots are invisible interactive zones in rooms — used for things like
        signs on walls, background features, or anything that is not a moveable object.
      </p>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique hotspot identifier.</td></tr>
          <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Display name (shown on hover/click).</td></tr>
          <tr><td><code>roomId</code></td><td>string</td><td>Yes</td><td>Must match the room this hotspot belongs to.</td></tr>
          <tr><td><code>bounds</code></td><td>{`{x,y,width,height}`}</td><td>Yes</td><td>Clickable rectangle in room coordinates.</td></tr>
          <tr><td><code>polygon</code></td><td>{`{x,y}[]`}</td><td>No</td><td>Non-rectangular clickable shape. Overrides <code>bounds</code> for hit detection when provided.</td></tr>
          <tr><td><code>description</code></td><td>string</td><td>No</td><td>Text shown when the player looks at it.</td></tr>
          <tr><td><code>verbHandlers</code></td><td>object</td><td>No</td><td>Maps verb names to script names.</td></tr>
          <tr><td><code>useWithHandlers</code></td><td>object</td><td>No</td><td>Maps item IDs to script names for "use X on Y" interactions.</td></tr>
          <tr><td><code>fallbackScriptId</code></td><td>string</td><td>No</td><td>Catch-all script for unhandled verbs.</td></tr>
          <tr><td><code>standPoint</code></td><td>{`{x,y}`}</td><td>No</td><td>Where the player walks to before interacting.</td></tr>
          <tr><td><code>approachDirection</code></td><td>string</td><td>No</td><td>Direction the player faces at the stand point.</td></tr>
          <tr><td><code>visibilityCondition</code></td><td>ConditionExpression</td><td>No</td><td>Hotspot is only visible when condition is true.</td></tr>
          <tr><td><code>interactionCondition</code></td><td>ConditionExpression</td><td>No</td><td>Hotspot is visible but not interactable unless condition is true.</td></tr>
          <tr><td><code>zLayer</code></td><td>&quot;behind&quot; | &quot;normal&quot; | &quot;front&quot;</td><td>No</td><td>Rendering layer. Default <code>"normal"</code>.</td></tr>
        </tbody>
      </table>

      <h4>Dialogue Fields</h4>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique tree identifier. Referenced by actor <code>dialogueId</code> or <code>ctx.startDialogue()</code>.</td></tr>
          <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Human-readable name.</td></tr>
          <tr><td><code>actorId</code></td><td>string</td><td>No</td><td>The NPC this dialogue belongs to.</td></tr>
          <tr><td><code>startNodeId</code></td><td>string</td><td>Yes</td><td>ID of the first node in the conversation.</td></tr>
          <tr><td><code>nodes</code></td><td>array</td><td>Yes</td><td>Array of dialogue node objects.</td></tr>
          <tr><td><code>onStartFlag</code></td><td>string</td><td>No</td><td>Flag name automatically set to <code>true</code> when this dialogue starts.</td></tr>
          <tr><td><code>onEndFlag</code></td><td>string</td><td>No</td><td>Flag name automatically set to <code>true</code> when this dialogue ends.</td></tr>
        </tbody>
      </table>

      <h4>Dialogue Node Fields</h4>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique within the tree.</td></tr>
          <tr><td><code>speaker</code></td><td>string</td><td>Yes</td><td>Actor ID of who is speaking. Must be a valid actor <code>id</code> (not a display name). The engine uses this to position the speech bubble above the correct actor.</td></tr>
          <tr><td><code>text</code></td><td>string</td><td>Yes</td><td>What the speaker says.</td></tr>
          <tr><td><code>branches</code></td><td>array</td><td>Yes</td><td>Player response choices. Empty array <code>[]</code> = NPC statement only (pauses for click, then advances). Always provide this field — use <code>[]</code> for click-to-advance nodes. Nodes with <code>branches: []</code> and no remaining valid sibling nodes end the dialogue.</td></tr>
          <tr><td><code>actions</code></td><td>array</td><td>No</td><td>Side effects when this node is reached. Actions run in order, synchronously. If omitted, no side effects occur. Actions cannot fail — invalid references are silently skipped.</td></tr>
          <tr><td><code>condition</code></td><td>string | ConditionExpression</td><td>No</td><td>Node is skipped when condition is false. Can be a flag name string (shorthand for <code>{`{"type":"flag","flag":"..."}`}</code>) or a full ConditionExpression object.</td></tr>
          <tr><td><code>once</code></td><td>boolean</td><td>No</td><td>If <code>true</code>, the node is skipped after the player has seen it once. The engine falls through to the next node in the <code>nodes</code> array whose conditions are met. This fallthrough is guaranteed — the engine iterates forward through the array until it finds a valid node.</td></tr>
          <tr><td><code>portrait</code></td><td>string</td><td>No</td><td>Asset path overriding the speaker's default portrait for this line.</td></tr>
        </tbody>
      </table>

      <h4>Dialogue Branch Fields</h4>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique within the node.</td></tr>
          <tr><td><code>text</code></td><td>string</td><td>Yes</td><td>Text shown as a player choice.</td></tr>
          <tr><td><code>nextNodeId</code></td><td>string | null</td><td>Yes</td><td>Node to go to next. <code>null</code> = end dialogue.</td></tr>
          <tr><td><code>condition</code></td><td>string | ConditionExpression</td><td>No</td><td>Branch is hidden when condition is false. Can be a flag name string or a full ConditionExpression object.</td></tr>
          <tr><td><code>once</code></td><td>boolean</td><td>No</td><td>If <code>true</code>, the branch is hidden after the player has chosen it once.</td></tr>
        </tbody>
      </table>

      <h4>Dialogue Action Types</h4>
      <table>
        <thead>
          <tr><th>Type</th><th>Fields</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>"setFlag"</code></td><td><code>flag</code>, <code>flagValue</code></td><td>Set a boolean flag.</td></tr>
          <tr><td><code>"giveItem"</code></td><td><code>itemId</code>, <code>actorId</code></td><td>Give an item to an actor.</td></tr>
          <tr><td><code>"removeItem"</code></td><td><code>itemId</code>, <code>actorId</code></td><td>Remove an item from inventory.</td></tr>
          <tr><td><code>"gotoRoom"</code></td><td><code>roomId</code>, <code>spawnPointId</code></td><td>Transition to a room.</td></tr>
          <tr><td><code>"setVariable"</code></td><td><code>variable</code>, <code>value</code></td><td>Set a game variable.</td></tr>
          <tr><td><code>"callScript"</code></td><td><code>scriptId</code></td><td>Execute a script by name.</td></tr>
          <tr><td><code>"setObjectState"</code></td><td><code>objectId</code>, <code>key</code>, <code>value</code></td><td>Change an object's state key.</td></tr>
          <tr><td><code>"endDialogue"</code></td><td>(none)</td><td>End the conversation.</td></tr>
        </tbody>
      </table>

      <h4>ConditionExpression</h4>
      <p>
        Conditions are used by <code>visibilityCondition</code>, <code>interactionCondition</code>,
        <code>stateWatchers</code>, visual script <code>"if"</code> steps, and dialogue
        <code>condition</code> fields. Each is a JSON object with a <code>type</code> discriminator.
        Conditions can be composed with <code>and</code>, <code>or</code>, and <code>not</code>.
      </p>
      <table>
        <thead>
          <tr><th>Type</th><th>Fields</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>"flag"</code></td><td><code>flag</code>, <code>value?</code> (default <code>true</code>)</td><td>True when the flag equals the given value. E.g. <code>{`{"type":"flag","flag":"door_unlocked"}`}</code>.</td></tr>
          <tr><td><code>"variable"</code></td><td><code>variable</code>, <code>operator</code>, <code>value</code></td><td>Compare a variable. Operators: <code>==</code>, <code>!=</code>, <code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code>. E.g. <code>{`{"type":"variable","variable":"coins","operator":">=","value":5}`}</code>.</td></tr>
          <tr><td><code>"inventory"</code></td><td><code>actorId</code>, <code>itemId</code></td><td>True when the actor has the item. E.g. <code>{`{"type":"inventory","actorId":"player","itemId":"lantern"}`}</code>.</td></tr>
          <tr><td><code>"objectState"</code></td><td><code>objectId</code>, <code>key</code>, <code>value</code>, <code>operator?</code></td><td>True when an object's state key matches. Default operator is <code>==</code>.</td></tr>
          <tr><td><code>"roomVisited"</code></td><td><code>roomId</code></td><td>True when the player has visited the specified room.</td></tr>
          <tr><td><code>"dialogueNodeSeen"</code></td><td><code>treeId</code>, <code>nodeId</code></td><td>True when a specific dialogue node has been displayed.</td></tr>
          <tr><td><code>"hasTag"</code></td><td><code>objectId</code>, <code>tag</code></td><td>True when the object has the specified tag.</td></tr>
          <tr><td><code>"and"</code></td><td><code>conditions</code> (array)</td><td>True when ALL sub-conditions are true.</td></tr>
          <tr><td><code>"or"</code></td><td><code>conditions</code> (array)</td><td>True when ANY sub-condition is true.</td></tr>
          <tr><td><code>"not"</code></td><td><code>condition</code> (single)</td><td>Inverts a condition.</td></tr>
        </tbody>
      </table>
      <p>Composed example — object visible only when the player has a lantern AND a flag is set:</p>
      <pre><code>{`{
  "visibilityCondition": {
    "type": "and",
    "conditions": [
      {"type": "flag", "flag": "secret_revealed"},
      {"type": "inventory", "actorId": "player", "itemId": "lantern"}
    ]
  }
}`}</code></pre>

      <h4>State Watchers</h4>
      <p>
        State watchers are project-level monitors that automatically trigger a script when
        a condition becomes true. They are evaluated after every state change. Useful for
        win conditions, multi-flag puzzles, or ambient events.
      </p>
      <pre><code>{`{
  "stateWatchers": [
    {
      "id": "win_condition",
      "condition": {
        "type": "and",
        "conditions": [
          {"type": "flag", "flag": "dragon_defeated"},
          {"type": "inventory", "actorId": "player", "itemId": "crown"}
        ]
      },
      "scriptId": "victory_cutscene",
      "once": true
    }
  ]
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique watcher identifier.</td></tr>
          <tr><td><code>condition</code></td><td>ConditionExpression</td><td>Yes</td><td>The condition to monitor (any ConditionExpression).</td></tr>
          <tr><td><code>scriptId</code></td><td>string</td><td>Yes</td><td>Script to execute when the condition becomes true.</td></tr>
          <tr><td><code>once</code></td><td>boolean</td><td>No</td><td>If <code>true</code>, the watcher fires only once and is then disabled.</td></tr>
        </tbody>
      </table>

      <h4>Interaction Resolution Order</h4>
      <p>
        When the player interacts with an entity, the engine resolves the handler in this order:
      </p>
      <ol>
        <li><strong>useWithHandlers</strong> — if the player is using an inventory item on the target, and the target has a <code>useWithHandlers</code> entry mapping that item ID to a script.</li>
        <li><strong>verbHandlers</strong> — the verb-specific handler on the target entity (e.g. <code>{`"open": "open_chest"`}</code>).</li>
        <li><strong>Entity fallbackScriptId</strong> — the target entity's catch-all fallback script.</li>
        <li><strong>globalFallbackScriptId</strong> — the project-level fallback script.</li>
        <li><strong>Default engine text</strong> — generic text like "That doesn't work."</li>
      </ol>
      <p>
        The <code>useWithHandlers</code> approach is preferred over checking <code>ctx.secondaryTargetId</code>
        in a raw script because it is declarative, easier for LLMs to generate correctly, and
        automatically provides proper "that doesn't work" fallback messages.
      </p>

      <h4>Asset Definition</h4>
      <p>
        Assets are images or audio embedded directly in the project file as Base64 data URLs.
        When generating a project without actual image files, set <code>assets</code> to an
        empty array <code>[]</code> — the engine renders placeholder graphics for all missing
        images (colored rectangles for backgrounds, silhouettes for actors, etc.).
      </p>
      <pre><code>{`{
  "id": "bg_tavern",
  "name": "tavern_background.png",
  "dataUrl": "data:image/png;base64,iVBORw0KGgo...",
  "type": "background",
  "width": 640,
  "height": 360
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique asset identifier.</td></tr>
          <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Original filename.</td></tr>
          <tr><td><code>dataUrl</code></td><td>string</td><td>Yes</td><td>Full Base64 data URL.</td></tr>
          <tr><td><code>type</code></td><td>string</td><td>Yes</td><td>One of: <code>"background"</code>, <code>"sprite"</code>, <code>"icon"</code>, <code>"audio"</code>, <code>"other"</code>.</td></tr>
          <tr><td><code>width</code></td><td>number</td><td>Yes</td><td>Image width in pixels (0 for audio).</td></tr>
          <tr><td><code>height</code></td><td>number</td><td>Yes</td><td>Image height in pixels (0 for audio).</td></tr>
        </tbody>
      </table>

      <h4>How References Connect</h4>
      <p>
        Understanding how IDs reference each other is critical for generating valid projects:
      </p>
      <ul>
        <li><code>startingRoom</code> must match a room's <code>id</code>.</li>
        <li><code>defaultPlayerActorId</code> must match an actor's <code>id</code> (one with <code>isPlayer: true</code>).</li>
        <li>Room <code>objectIds</code> must match object <code>id</code> values. Each referenced object must have <code>roomId</code> matching the room.</li>
        <li><strong>Room <code>actorIds</code> ↔ Actor <code>defaultRoomId</code> (dual reference):</strong> Both sides are required for an NPC to appear. The room must list the actor ID in <code>actorIds</code>, AND the actor must set <code>defaultRoomId</code> to that room's ID. If either side is missing, the NPC will not be instantiated.</li>
        <li>Exit <code>targetRoomId</code> must match another room's <code>id</code>.</li>
        <li>Exit <code>targetSpawnPointId</code> must match a spawn point <code>id</code> in the target room.</li>
        <li>Walkbox <code>adjacentIds</code> must match walkbox <code>id</code> values within the same room.</li>
        <li><code>verbHandlers</code> values must match script <code>name</code> values.</li>
        <li>Room <code>onEnter</code>/<code>onExit</code> must match script <code>name</code> values.</li>
        <li>Actor <code>dialogueId</code> must match a dialogue tree <code>id</code>.</li>
        <li>Hotspot <code>roomId</code> must match the room's <code>id</code> it belongs to.</li>
        <li><code>startingItems</code> must match item <code>id</code> values.</li>
        <li>On objects/actors/hotspots, <code>useWithHandlers</code> keys must match item <code>id</code> values; values must match script <code>name</code> values. On items, <code>useWithHandlers</code> keys must match target entity <code>id</code> values.</li>
        <li><code>fallbackScriptId</code> values must match script <code>name</code> values.</li>
        <li><code>globalFallbackScriptId</code> must match a script <code>name</code>.</li>
        <li>State watcher <code>scriptId</code> values must match script <code>name</code> values.</li>
        <li>Dialogue tree <code>onStartFlag</code>/<code>onEndFlag</code> are auto-set flag names (do not need to be pre-declared).</li>
      </ul>

      <h4>Generation Guidelines for LLMs</h4>
      <ol>
        <li><strong>Start with the game design:</strong> Decide on rooms, characters, objects, and puzzle flow before generating JSON.</li>
        <li><strong>Use snake_case for all IDs</strong> (room IDs, actor IDs, object IDs, script names, etc.).</li>
        <li><strong>Every room needs at least one walkbox</strong> covering the walkable ground area, typically Y range 220–355 for a 640×360 room.</li>
        <li><strong>Every room should have a "default" spawn point</strong> inside a walkbox polygon.</li>
        <li><strong>Connect rooms bidirectionally:</strong> If Room A has an exit to Room B, Room B should have an exit back to Room A with a matching spawn point.</li>
        <li><strong>Player position must be inside a walkbox</strong> — both <code>defaultPlayerPosition</code> and all spawn points.</li>
        <li><strong>Leave assets as an empty array:</strong> The engine draws colored placeholders when no art is provided. This means generated projects are instantly playable without any image files.</li>
        <li><strong>Script bodies are JavaScript strings.</strong> Use semicolons. For async calls, use <code>await</code>. Common pattern: <code>{`"if (ctx.getFlag('x')) { ctx.say('done'); return; } ctx.setFlag('x', true); ctx.say('You did it!');"`}</code></li>
        <li><strong>Object bounds are relative to position.</strong> A 40x50 object at position (350, 320) should have bounds like <code>{`{"x": -20, "y": -50, "width": 40, "height": 50}`}</code> to center the clickable area.</li>
        <li><strong>Keep the verb list consistent.</strong> Only reference verbs in <code>verbHandlers</code> that appear in the top-level <code>verbs</code> array. The verb <code>"walk"</code> is handled by the engine and should never appear in verb handlers.</li>
        <li><strong>Dialogue branches with <code>nextNodeId: null</code></strong> end the conversation.</li>
        <li><strong>Use flags for puzzle state.</strong> Set flags when the player solves something, check flags in scripts with <code>ctx.getFlag()</code> to gate progression.</li>
        <li><strong>Use <code>useWithHandlers</code></strong> for "use item on object" puzzles. Map the item ID to a script on the target object: <code>{`"useWithHandlers": {"brass_key": "unlock_door"}`}</code>. This is preferred over checking <code>ctx.secondaryTargetId</code> in a raw script.</li>
        <li><strong>NPC placement requires a dual reference.</strong> For an NPC to appear in a room, the actor must have <code>defaultRoomId</code> set to the room's ID AND the room must list the actor's ID in its <code>actorIds</code> array. Omitting either side causes the NPC to be invisible. This mirrors the pattern for objects: objects need <code>roomId</code> AND the room's <code>objectIds</code>.</li>
      </ol>

      <h4>ID Namespace Rules</h4>
      <p>
        Understanding ID uniqueness is critical for automated generation:
      </p>
      <ul>
        <li><strong>IDs are unique per type, not globally.</strong> A room can have <code>id: "entrance"</code> and an object can also have <code>id: "entrance"</code> — they are in different namespaces. However, two rooms cannot share the same ID.</li>
        <li><strong>Script names</strong> share no namespace with entity IDs. A script named <code>"entrance"</code> does not conflict with a room or object named <code>"entrance"</code>.</li>
        <li><strong>Dialogue node IDs</strong> are local to their dialogue tree. Two different trees can both have a node with <code>id: "intro"</code>.</li>
        <li><strong>Spawn point IDs</strong> are local to their room. Two different rooms can both have a spawn point with <code>id: "default"</code>.</li>
        <li><strong>Walkbox IDs</strong> are local to their room.</li>
        <li><strong>Exit IDs</strong> are local to their room.</li>
        <li><strong>Branch IDs</strong> are local to their dialogue node.</li>
        <li><strong>Watcher IDs</strong> are global (project-level).</li>
        <li><strong>Recommended format:</strong> <code>snake_case</code> (e.g. <code>rusty_key</code>, <code>dark_cave</code>). No spaces allowed in IDs.</li>
        <li><strong>Case-sensitive:</strong> <code>"tavern"</code> and <code>"Tavern"</code> are different IDs.</li>
        <li><strong>Allowed characters:</strong> Letters, digits, underscores, hyphens. Avoid special characters.</li>
      </ul>

      <h4>Importer Strictness / Validation Policy</h4>
      <p>
        The importer is intentionally lenient to make LLM generation easier:
      </p>
      <ul>
        <li><strong>Unknown fields are ignored.</strong> Extra properties on any object are silently discarded. You can include notes, comments, or metadata fields without causing errors.</li>
        <li><strong>Missing optional fields are auto-filled with defaults.</strong> If you omit <code>visible</code> on an object, it defaults to <code>true</code>. If you omit <code>uiSettings</code>, all UI elements are enabled.</li>
        <li><strong>Empty arrays are acceptable</strong> for all collection fields. <code>"objects": []</code> is valid. Omitting the field entirely is also acceptable for optional collections (e.g. <code>dialogueTrees</code>, <code>stateWatchers</code>).</li>
        <li><strong>Script references are checked at runtime only.</strong> If a <code>verbHandlers</code> entry points to a script name that does not exist, the import succeeds — the error only surfaces when that verb is triggered during gameplay.</li>
        <li><strong>No line-specific error reporting.</strong> Validation errors are reported as generic messages (e.g. "Missing required field: startingRoom"), not with JSON line numbers.</li>
        <li><strong>Required fields that are missing</strong> cause an import rejection with a message naming the missing field.</li>
        <li><strong>Top-level array order does not matter.</strong> You can list <code>scripts</code> before <code>rooms</code> or vice versa.</li>
      </ul>

      <h4>Inventory Semantics</h4>
      <p>
        The inventory system has the following rules:
      </p>
      <ul>
        <li><strong>Inventory belongs to any actor, not just the player.</strong> NPCs can hold items too. All inventory methods (<code>ctx.giveItem</code>, <code>ctx.removeItem</code>, <code>ctx.hasItem</code>) require an <code>actorId</code> parameter. Use the player actor's ID (typically <code>"player"</code>) for the player's inventory.</li>
        <li><strong><code>useWithHandlers</code> does NOT auto-consume items.</strong> When a script runs via <code>useWithHandlers</code>, the item remains in the player's inventory. You must call <code>ctx.removeItem('player', 'item_id')</code> explicitly in the script if you want the item to be consumed.</li>
        <li><strong>No capacity limit.</strong> An actor can hold any number of items. There is no built-in maximum.</li>
        <li><strong>Item order does not matter</strong> for game logic. The inventory bar displays items in the order they were added.</li>
        <li><strong>No built-in inventory verbs.</strong> There are no special verbs like "combine" or "examine" that automatically apply to inventory items. Use <code>verbHandlers</code> on the item definition for look/use/etc.</li>
        <li><strong>Inventory bar visibility</strong> is controlled by <code>uiSettings.inventoryEnabled</code> (default <code>true</code>).</li>
        <li><strong><code>ctx.hasItem(actorId, itemId)</code></strong> checks whether an actor currently holds an item. Always requires both <code>actorId</code> and <code>itemId</code>.</li>
        <li><strong>Collectible world objects</strong> should be defined as both an <code>object</code> (for the in-world representation) and an <code>item</code> (for the inventory representation). When the player picks up the object, use <code>ctx.state.setObjectLocation(objectId, null)</code> to remove it from the room and <code>ctx.giveItem(actorId, itemId)</code> to add it to inventory.</li>
      </ul>

      <h4>Verb Model & Interaction Resolution</h4>
      <p>
        The engine supports these verbs: <code>walk</code>, <code>look</code>, <code>open</code>, <code>close</code>, <code>pickup</code>, <code>use</code>, <code>talk</code>, <code>push</code>, <code>pull</code>, <code>give</code>.
      </p>
      <ul>
        <li><strong><code>walk</code> is the only engine-built-in verb.</strong> It is handled entirely by the engine (pathfinding + movement). Never add <code>"walk"</code> to <code>verbHandlers</code>.</li>
        <li><strong>All other verbs are optional.</strong> A verb only fires if it appears in the project's top-level <code>verbs</code> array. If you omit <code>"push"</code> from the array, the push verb button will not appear and players cannot push anything.</li>
        <li><strong>Standard verb set:</strong> The engine defines 10 verb strings (<code>walk</code>, <code>look</code>, <code>open</code>, <code>close</code>, <code>pickup</code>, <code>use</code>, <code>talk</code>, <code>push</code>, <code>pull</code>, <code>give</code>). The <code>verbHandlers</code> maps accept only these verbs as keys. Custom verb names beyond this set are not recognized by the standard interaction pipeline.</li>
        <li><strong>"use item on target"</strong> is a distinct pathway from plain <code>"use"</code>. When the player uses an inventory item on a target, the engine checks <code>useWithHandlers</code> first (keyed by item ID). If not matched, it falls through to the <code>"use"</code> verbHandler, then the fallback chain.</li>
        <li><strong>Entities without any handlers are valid.</strong> The engine provides default responses for unhandled verbs (e.g. "It's a [name]." for look, "That doesn't work." for others).</li>
      </ul>
      <p>
        <strong>Resolution order for all entity types</strong> (objects, actors, hotspots, items):
      </p>
      <ol>
        <li><code>useWithHandlers[itemId]</code> — if the player is using an inventory item on the target</li>
        <li><code>verbHandlers[verb]</code> — the verb-specific handler</li>
        <li><code>fallbackScriptId</code> — the entity's catch-all script</li>
        <li><code>globalFallbackScriptId</code> — the project-level catch-all</li>
        <li>Default engine text — generic messages like "That doesn't work."</li>
      </ol>
      <p>
        <strong>Exits do not support verb handlers or fallback scripts.</strong> Exits only respond to <code>walk</code> (triggers room transition) and <code>look</code> (shows "It leads somewhere."). All other verbs on exits return "You can't do that there."
      </p>

      <h4>Fallback Behavior</h4>
      <ul>
        <li><strong>Entity types supporting <code>fallbackScriptId</code>:</strong> objects, actors, hotspots, items. NOT exits.</li>
        <li><strong>Fallback is always optional.</strong> If omitted, the engine tries the <code>globalFallbackScriptId</code> next, then default text.</li>
        <li><strong><code>globalFallbackScriptId</code> is optional.</strong> If omitted, the engine falls through to its built-in default text responses.</li>
        <li><strong>Missing fallback is valid.</strong> It simply means the engine uses its default responses for unhandled verbs.</li>
        <li><strong>Fallback scripts receive full context:</strong> <code>ctx.verb</code>, <code>ctx.currentTargetId</code>, <code>ctx.currentTargetType</code>, and <code>ctx.secondaryTargetId</code> are all available. The script can inspect which verb was attempted and respond accordingly.</li>
      </ul>

      <h4>Cross-Entity <code>useWithHandlers</code> Support</h4>
      <p>
        Not all entity types support <code>useWithHandlers</code>. Here is the support matrix:
      </p>
      <table>
        <thead>
          <tr><th>Target Entity</th><th><code>useWithHandlers</code></th><th>Key Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td>Object</td><td>Supported</td><td>Keys are item IDs → scripts run when that item is used on this object</td></tr>
          <tr><td>Actor</td><td>Supported</td><td>Keys are item IDs → scripts run when that item is used on this actor</td></tr>
          <tr><td>Hotspot</td><td>Supported</td><td>Keys are item IDs → scripts run when that item is used on this hotspot</td></tr>
          <tr><td>Item</td><td>Supported</td><td>Keys are target entity IDs → scripts run when this item is used on that target</td></tr>
          <tr><td>Exit</td><td><strong>Not supported</strong></td><td>Exits do not have verb handlers or useWithHandlers</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Item-on-actor</strong> is supported (e.g. give gold coin to guard). <strong>Item-on-hotspot</strong> is supported. <strong>Item-on-exit</strong> is NOT supported — the engine does not check <code>useWithHandlers</code> for exit targets.
      </p>

      <h4>Watcher Evaluation Details</h4>
      <p>
        State watchers are evaluated at specific times, not continuously:
      </p>
      <ul>
        <li><strong>Evaluated after every state change:</strong> flag set, variable set, inventory add/remove. Watchers are NOT evaluated every frame — they only fire in response to actual state mutations.</li>
        <li><strong><code>once: false</code> watchers re-fire</strong> every time the condition becomes true again. If a watcher condition becomes true, fires, then becomes false, then becomes true again — the script runs again.</li>
        <li><strong><code>once: true</code> watchers</strong> fire exactly once and are permanently disabled after firing.</li>
        <li><strong><code>scriptId</code> points to a script <code>name</code></strong>, not a script <code>id</code> (scripts do not have <code>id</code> fields — they are identified by <code>name</code>).</li>
        <li><strong>Watchers cannot trigger dialogue directly.</strong> They can only run scripts. Use a script that calls <code>await ctx.startDialogue('tree_id')</code> if you need a watcher to start a conversation.</li>
        <li><strong>Execution order</strong> follows registration order (the order watchers appear in the <code>stateWatchers</code> array).</li>
        <li><strong>Watchers use <code>id</code> only</strong> (no <code>name</code> field). Watcher IDs must be unique within the project.</li>
        <li><strong>No <code>enabled</code>, <code>runOnLoad</code>, <code>cooldown</code>, or <code>priority</code> fields.</strong> Watchers are always active (unless <code>once: true</code> and already fired). There is no cooldown or priority system. Scripts can dynamically register/unregister watchers via <code>ctx.registerWatcher()</code> and <code>ctx.unregisterWatcher()</code> at runtime.</li>
      </ul>

      <h4>Endgame / Cutscene Behavior</h4>
      <ul>
        <li><strong>There is no formal <code>endGame</code> API.</strong> The engine has no built-in win or lose state.</li>
        <li><strong>To implement a win/lose screen:</strong> Use a state watcher with the win condition, and have it trigger a script that calls <code>ctx.lockInput()</code> (or <code>ctx.beginCutscene()</code>) followed by blocking dialogue with the ending message. Input remains locked — the game effectively ends.</li>
        <li><strong>Cutscenes</strong> are just scripts that lock input. Use <code>beginCutscene</code>/<code>endCutscene</code> visual script steps, or <code>ctx.lockInput()</code>/<code>ctx.unlockInput()</code> in raw scripts.</li>
        <li><strong>Room transitions are allowed during cutscenes.</strong> You can move the player to a different room while input is locked.</li>
        <li><strong>There is no win-state field</strong> on the project schema. All win/lose logic lives in scripts and watchers.</li>
      </ul>

      <h4>Placeholder Rendering Rules</h4>
      <p>
        When no art assets are provided (i.e. <code>assets: []</code>), the engine renders colored
        placeholders for all visual entities. Here are the sizing and rendering rules:
      </p>
      <ul>
        <li><strong>Actors:</strong> Drawn as colored silhouettes. Size is determined by <code>spriteWidth</code> and <code>spriteHeight</code>. If omitted, defaults to ~40x60 pixels. Recommended: always provide dimensions for correct sizing.</li>
        <li><strong>Objects:</strong> Drawn as colored rectangles. Size is determined by <code>spriteWidth</code> and <code>spriteHeight</code>. If omitted, defaults to a small square. Recommended: always provide dimensions.</li>
        <li><strong>Items:</strong> Drawn as small colored squares in the inventory bar. No icon dimensions are needed — the engine auto-sizes inventory icons.</li>
        <li><strong>Room backgrounds:</strong> <code>backgroundPath: ""</code> is valid and renders a gradient placeholder. An empty string and a missing/nonexistent path behave identically — both produce the placeholder gradient.</li>
        <li><strong>Placeholder colors</strong> are auto-assigned by entity type (actors get one color family, objects another, etc.). Colors are <strong>not configurable</strong> in the project file.</li>
        <li><strong>Exits, hotspots, and spawn points</strong> are invisible in gameplay and do not have placeholder graphics (they are shown in the editor only with debug overlays).</li>
      </ul>

      <h4>String Limits & Text Formatting</h4>
      <ul>
        <li><strong>No enforced maximum length</strong> for names, dialogue text, script names, IDs, or descriptions. Practical limits depend on available screen space.</li>
        <li><strong>Line breaks (<code>\n</code>) are supported</strong> in dialogue text and descriptions. They render as actual line breaks in speech bubbles and message displays.</li>
        <li><strong>No special markup, rich text, color tags, or variable interpolation.</strong> Text is rendered as plain text. Emphasis, bold, or colored text is not available.</li>
        <li><strong>Standard JSON escaping rules apply:</strong> Double quotes must be escaped as <code>\"</code> in JSON strings. Backslashes must be escaped as <code>\\</code>. In script body strings, this means a dialogue quote needs double-escaping: <code>ctx.say('He said \\"hello\\".');</code></li>
        <li><strong>Apostrophes and single quotes</strong> do not need special handling in JSON strings. In script bodies, use single quotes for JavaScript strings to avoid double-quote conflicts: <code>ctx.say('It\\'s locked.');</code></li>
      </ul>

      <h4>Room Visit Tracking</h4>
      <ul>
        <li><strong>Room visits are tracked automatically by the engine.</strong> There is no need to set flags manually when entering a room.</li>
        <li><strong><code>roomVisited</code></strong> is a valid ConditionExpression type. Use <code>{`{"type": "roomVisited", "roomId": "cave"}`}</code> in conditions.</li>
        <li><strong><code>ctx.state.hasVisitedRoom(roomId)</code></strong> is available in raw scripts and returns <code>true</code> if the player has been to that room before.</li>
        <li><strong>First-visit logic</strong> should use the built-in visit tracking, not custom flags. Common pattern: <code>{`"if (ctx.state.hasVisitedRoom('cave')) return; // first-visit-only code here"`}</code></li>
      </ul>

      <h4>Decorative vs Interactive Objects</h4>
      <ul>
        <li><strong>Purely decorative objects need no handlers.</strong> An object with no <code>verbHandlers</code>, no <code>useWithHandlers</code>, and no <code>fallbackScriptId</code> is valid. The engine provides default responses for all verbs.</li>
        <li><strong>Disabled objects (<code>enabled: false</code>) still render</strong> but cannot be clicked or interacted with.</li>
        <li><strong>Invisible objects (<code>visible: false</code>) are not drawn and cannot be interacted with.</strong> They are completely hidden from the player.</li>
        <li><strong>Objects can disappear after interaction</strong> by calling <code>ctx.state.setObjectLocation(objectId, null)</code> in a script, which removes the object from all rooms.</li>
        <li><strong>Objects can move between rooms</strong> by calling <code>ctx.state.setObjectLocation(objectId, newRoomId)</code>.</li>
      </ul>

      <h4>Hotspot Full Schema</h4>
      <p>
        Hotspots are invisible interaction zones within rooms. They differ from objects in that
        they have no visual representation — they are clickable rectangular or polygonal regions.
        They do not participate in placeholder rendering.
      </p>
      <pre><code>{`{
  "id": "fireplace",
  "name": "Fireplace",
  "roomId": "tavern",
  "bounds": {"x": 500, "y": 100, "width": 120, "height": 160},
  "description": "A roaring fireplace warms the room.",
  "verbHandlers": {
    "look": "look_fireplace",
    "use": "use_fireplace"
  },
  "useWithHandlers": {
    "kindling": "light_fire_with_kindling"
  },
  "fallbackScriptId": "fireplace_fallback",
  "standPoint": {"x": 550, "y": 330},
  "approachDirection": "N"
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique within the room (not globally).</td></tr>
          <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Display name shown on hover.</td></tr>
          <tr><td><code>roomId</code></td><td>string</td><td>Yes</td><td>Must match the room this hotspot belongs to.</td></tr>
          <tr><td><code>bounds</code></td><td>{`{x,y,width,height}`}</td><td>Yes</td><td>Clickable rectangle in room coordinates (absolute, not relative).</td></tr>
          <tr><td><code>polygon</code></td><td>{`{x,y}[]`}</td><td>No</td><td>Optional polygon shape (overrides <code>bounds</code> for click detection).</td></tr>
          <tr><td><code>description</code></td><td>string</td><td>No</td><td>Text shown for unhandled <code>look</code> verbs.</td></tr>
          <tr><td><code>verbHandlers</code></td><td>object</td><td>No</td><td>Maps verb names to script names.</td></tr>
          <tr><td><code>useWithHandlers</code></td><td>object</td><td>No</td><td>Maps item IDs to script names for "use item on hotspot" interactions.</td></tr>
          <tr><td><code>fallbackScriptId</code></td><td>string</td><td>No</td><td>Catch-all script for unhandled verbs.</td></tr>
          <tr><td><code>visibilityCondition</code></td><td>ConditionExpression</td><td>No</td><td>Hotspot is only active when condition is true.</td></tr>
          <tr><td><code>interactionCondition</code></td><td>ConditionExpression</td><td>No</td><td>Hotspot is visible but not interactable unless condition is true.</td></tr>
          <tr><td><code>standPoint</code></td><td>{`{x,y}`}</td><td>No</td><td>Where the player walks to before interacting.</td></tr>
          <tr><td><code>approachDirection</code></td><td>string</td><td>No</td><td>Direction the player faces at the stand point.</td></tr>
        </tbody>
      </table>

      <h4>Spawn Point Schema</h4>
      <pre><code>{`{
  "id": "from_tavern",
  "x": 100,
  "y": 340,
  "facing": "E"
}`}</code></pre>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Yes</td><td>Unique within the room. Convention: use <code>"default"</code> for the primary spawn, <code>"from_[room_name]"</code> for directional entries.</td></tr>
          <tr><td><code>x</code></td><td>number</td><td>Yes</td><td>X position in room coordinates. Must be inside a walkbox polygon.</td></tr>
          <tr><td><code>y</code></td><td>number</td><td>Yes</td><td>Y position in room coordinates. Must be inside a walkbox polygon.</td></tr>
          <tr><td><code>facing</code></td><td>string</td><td>No</td><td>Direction the actor faces after spawning. Valid values: <code>"N"</code>, <code>"NE"</code>, <code>"E"</code>, <code>"SE"</code>, <code>"S"</code>, <code>"SW"</code>, <code>"W"</code>, <code>"NW"</code>. If omitted, actor keeps current facing. When specified on an exit's <code>targetSpawnPointId</code>, the spawn point's facing overrides the actor's previous facing.</td></tr>
        </tbody>
      </table>
      <p>
        The actor is placed at the exact spawn point coordinates — no "nearest walkable position"
        snapping occurs. This is why it is critical that spawn points be inside walkbox polygons.
      </p>

      <h4>Object/Actor State Systems</h4>
      <ul>
        <li><strong>Objects</strong> have a freeform <code>state</code> object (key-value pairs) that can be read and modified by scripts via <code>ctx.state.getObjectState(objectId, key)</code> and <code>ctx.state.setObjectState(objectId, key, value)</code>. This is separate from flags — object state is local to the object.</li>
        <li><strong>Object state can change appearance</strong> via <code>stateSprites</code>. Each entry maps a <code>stateKey</code>+<code>stateValue</code> pair to a <code>spritePath</code>. When the state matches, the object renders with that sprite.</li>
        <li><strong>Actors do not have a freeform state system.</strong> Use global flags to track actor-related state (e.g. <code>guard_bribed</code>).</li>
        <li><strong>Rooms</strong> support room-scoped variables via <code>ctx.setRoomVar(roomId, key, value)</code> / <code>ctx.getRoomVar(roomId, key)</code>. These are separate from global flags and variables.</li>
        <li><strong><code>visible</code> and <code>enabled</code> are direct booleans</strong>, not state-driven. They can be toggled by scripts and by <code>visibilityCondition</code>/<code>interactionCondition</code>.</li>
      </ul>

      <h4>Dialogue Tree Additional Details</h4>
      <ul>
        <li><strong>Dialogue trees use both <code>id</code> and <code>name</code>.</strong> The <code>id</code> is used for references (<code>dialogueId</code> on actors, <code>ctx.startDialogue()</code>). The <code>name</code> is a human-readable label.</li>
        <li><strong><code>actorId</code> is optional</strong> on dialogue trees. It associates the tree with an NPC for editor organization, but is not required for the tree to function.</li>
        <li><strong>Multiple dialogue trees per actor are supported.</strong> An actor can have multiple trees; <code>dialogueId</code> on the actor definition specifies the default tree for the <code>talk</code> verb. Other trees can be started via scripts with <code>ctx.startDialogue()</code>.</li>
        <li><strong>Narration without a speaker</strong> is not directly supported — every node must have a <code>speaker</code> field with a valid actor ID. For narration, use the player actor as the speaker.</li>
        <li><strong><code>text</code> supports line breaks</strong> (<code>\n</code>) but no markup, variables, or interpolation.</li>
        <li><strong>Nodes do not have a <code>nextNodeId</code> field.</strong> Flow is controlled by branch <code>nextNodeId</code> values. Click-to-advance nodes (empty <code>branches</code>) advance to the next node in the array that passes its conditions.</li>
        <li><strong>Branches do not have <code>actions</code>.</strong> Side effects are on nodes only (via the <code>actions</code> array). Put actions on the destination node, not on the branch.</li>
        <li><strong><code>once: true</code></strong> is valid on both nodes and branches. On nodes, the node is skipped on repeat visits. On branches, the choice disappears after being selected once.</li>
        <li><strong><code>onStartFlag</code> and <code>onEndFlag</code></strong> are plain flag name strings — not action objects. The engine auto-sets these flags to <code>true</code> when the dialogue starts/ends.</li>
        <li><strong>No automatic return to a hub node.</strong> You must manually structure branches to point back to a hub node ID for conversation loops.</li>
      </ul>

      <h4>Common Pitfalls</h4>
      <ul>
        <li><strong>Spawn outside walkbox:</strong> If a spawn point is outside all walkboxes, the player cannot move. Always place spawns within walkbox polygons.</li>
        <li><strong>One-way exits:</strong> Forgetting the return exit traps the player in a room. Always create both directions.</li>
        <li><strong>Missing scripts:</strong> Every script name referenced in <code>verbHandlers</code>, <code>onEnter</code>, <code>onExit</code> must have a matching entry in the <code>scripts</code> array.</li>
        <li><strong>"walk" in verbHandlers:</strong> The "walk" verb is handled by the engine automatically. Never add it to <code>verbHandlers</code>.</li>
        <li><strong>Duplicate IDs:</strong> All IDs (rooms, actors, objects, items, scripts) must be unique across their type.</li>
        <li><strong>Object without roomId:</strong> Objects listed in a room's <code>objectIds</code> must have <code>roomId</code> set to that room's ID.</li>
        <li><strong>NPC missing from room's actorIds:</strong> Setting <code>defaultRoomId</code> on an actor is NOT enough — the target room must also list the actor's ID in its <code>actorIds</code> array. Without this, the engine will never instantiate the NPC. This is a dual reference, analogous to objects needing both <code>roomId</code> and the room's <code>objectIds</code>.</li>
        <li><strong>Items not consumed automatically:</strong> <code>useWithHandlers</code> does NOT remove the item from inventory. Call <code>ctx.removeItem()</code> explicitly in the script.</li>
        <li><strong>Inventory requires actorId:</strong> Always pass the actor ID (e.g. <code>"player"</code>) to <code>ctx.giveItem</code>, <code>ctx.removeItem</code>, <code>ctx.hasItem</code>.</li>
      </ul>

      <h4>Minimal Complete Example</h4>
      <p>
        A two-room adventure with a key puzzle:
      </p>
      <pre><code>{`{
  "formatVersion": 2,
  "id": "generated",
  "title": "The Locked Door",
  "created": 1700000000000,
  "modified": 1700000000000,
  "startingRoom": "hallway",
  "defaultPlayerActorId": "player",
  "defaultPlayerPosition": {"x": 160, "y": 315},
  "startingItems": [],
  "verbs": ["walk", "look", "open", "pickup", "use", "talk"],
  "rooms": [
    {
      "id": "hallway",
      "name": "Hallway",
      "backgroundPath": "",
      "width": 640,
      "height": 360,
      "walkboxes": [
        {
          "id": "floor",
          "polygon": [
            {"x": 24, "y": 270}, {"x": 616, "y": 270},
            {"x": 616, "y": 356}, {"x": 24, "y": 356}
          ],
          "adjacentIds": []
        }
      ],
      "exits": [],
      "hotspots": [],
      "spawnPoints": [{"id": "default", "x": 160, "y": 315}],
      "objectIds": ["key", "locked_door"],
      "onEnter": "enter_hallway"
    },
    {
      "id": "treasure_room",
      "name": "Treasure Room",
      "backgroundPath": "",
      "width": 640,
      "height": 360,
      "walkboxes": [
        {
          "id": "floor",
          "polygon": [
            {"x": 24, "y": 270}, {"x": 616, "y": 270},
            {"x": 616, "y": 356}, {"x": 24, "y": 356}
          ],
          "adjacentIds": []
        }
      ],
      "exits": [
        {
          "id": "back_to_hallway",
          "direction": "W",
          "bounds": {"x": 0, "y": 243, "width": 32, "height": 117},
          "targetRoomId": "hallway",
          "targetSpawnPointId": "default",
          "label": "Back"
        }
      ],
      "hotspots": [],
      "spawnPoints": [{"id": "from_hallway", "x": 80, "y": 315}],
      "objectIds": ["treasure_chest"],
      "onEnter": "enter_treasure_room"
    }
  ],
  "actors": [
    {
      "id": "player",
      "name": "You",
      "isPlayer": true,
      "position": {"x": 160, "y": 315},
      "facing": "E",
      "movementSpeed": 130,
      "spriteWidth": 40,
      "spriteHeight": 60
    }
  ],
  "objects": [
    {
      "id": "key",
      "name": "Brass Key",
      "roomId": "hallway",
      "position": {"x": 480, "y": 306},
      "spriteWidth": 24,
      "spriteHeight": 16,
      "bounds": {"x": -12, "y": -16, "width": 24, "height": 16},
      "visible": true,
      "enabled": true,
      "pickupable": true,
      "description": "A small brass key.",
      "verbHandlers": {
        "look": "look_key",
        "pickup": "pickup_key"
      }
    },
    {
      "id": "locked_door",
      "name": "Heavy Door",
      "roomId": "hallway",
      "position": {"x": 560, "y": 252},
      "spriteWidth": 50,
      "spriteHeight": 100,
      "bounds": {"x": -25, "y": -100, "width": 50, "height": 100},
      "visible": true,
      "enabled": true,
      "pickupable": false,
      "description": "A heavy wooden door with a brass lock.",
      "verbHandlers": {
        "look": "look_door",
        "open": "open_door"
      },
      "useWithHandlers": {
        "brass_key": "unlock_door_with_key"
      },
      "fallbackScriptId": "default_door_response"
    },
    {
      "id": "treasure_chest",
      "name": "Treasure Chest",
      "roomId": "treasure_room",
      "position": {"x": 400, "y": 279},
      "spriteWidth": 64,
      "spriteHeight": 48,
      "bounds": {"x": -32, "y": -48, "width": 64, "height": 48},
      "visible": true,
      "enabled": true,
      "pickupable": false,
      "description": "A gleaming treasure chest!",
      "verbHandlers": {
        "look": "look_treasure",
        "open": "open_treasure"
      }
    }
  ],
  "items": [
    {
      "id": "brass_key",
      "name": "Brass Key",
      "description": "A small brass key. It looks like it fits a door."
    },
    {
      "id": "gold_coins",
      "name": "Gold Coins",
      "description": "A handful of gleaming gold coins!"
    }
  ],
  "scripts": [
    {
      "name": "enter_hallway",
      "body": "if (!ctx.state.hasVisitedRoom('hallway')) { ctx.say('You find yourself in a dim hallway. A heavy door blocks the way east.'); }"
    },
    {
      "name": "enter_treasure_room",
      "body": "if (!ctx.state.hasVisitedRoom('treasure_room')) { ctx.say('The room glitters with gold!'); }"
    },
    {
      "name": "look_key",
      "body": "ctx.say('A small brass key lying on the floor.');"
    },
    {
      "name": "pickup_key",
      "body": "ctx.giveItem('player', 'brass_key'); ctx.say('You pick up the brass key.'); ctx.state.setObjectLocation('key', null);"
    },
    {
      "name": "look_door",
      "body": "ctx.say(ctx.getFlag('door_unlocked') ? 'The door is unlocked.' : 'A heavy wooden door with a brass lock.');"
    },
    {
      "name": "open_door",
      "body": "if (!ctx.getFlag('door_unlocked')) { ctx.say('It is locked. You need a key.'); return; } ctx.gotoRoom('treasure_room', 'from_hallway');"
    },
    {
      "name": "unlock_door_with_key",
      "body": "ctx.setFlag('door_unlocked', true); ctx.removeItem('player', 'brass_key'); ctx.say('The key turns! The door is now unlocked.');"
    },
    {
      "name": "default_door_response",
      "body": "ctx.say('The heavy door does not respond to that.');"
    },
    {
      "name": "look_treasure",
      "body": "ctx.say('A magnificent treasure chest overflowing with gold coins!');"
    },
    {
      "name": "open_treasure",
      "body": "if (ctx.getFlag('treasure_taken')) { ctx.say('The chest is empty.'); return; } ctx.setFlag('treasure_taken', true); ctx.giveItem('player', 'gold_coins'); ctx.say('You scoop up handfuls of gold coins! You win!');"
    }
  ],
  "assets": [],
  "dialogueTrees": []
}`}</code></pre>
    </section>
  );
}
