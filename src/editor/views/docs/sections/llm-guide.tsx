export function LLMGuideSection() {
  return (
    <section>
      <h3>Creating a Project from a Prompt</h3>
      <p>
        This section is a comprehensive guide for generating a complete
        <code>.advproject.json</code> file from a natural-language game description.
        It is designed so that an LLM (or a code generator) reading this documentation
        can produce a valid, playable adventure game project that can be imported directly
        into the editor via "Import JSON".
      </p>
      <p>
        For the full JSON schema reference, see the <strong>Project File Spec</strong> section.
        This section focuses on the <em>generative process</em> — how to translate a game
        concept into a well-structured project file.
      </p>

      <h4>Step 1: Design the Game World</h4>
      <p>
        Before generating JSON, plan the game's structure:
      </p>
      <ol>
        <li><strong>List all rooms</strong> — each distinct location the player can visit (e.g., "Tavern", "Town Square", "Dark Cave").</li>
        <li><strong>Map connections</strong> — which rooms connect to which, and from which edges. Connections should be bidirectional: if Room A exits east to Room B, Room B should exit west back to Room A.</li>
        <li><strong>Identify actors</strong> — the player character (always one, with <code>isPlayer: true</code>) and any NPCs.</li>
        <li><strong>List objects</strong> — interactable things in each room (doors, chests, levers, etc.).</li>
        <li><strong>List items</strong> — things the player can carry in their inventory.</li>
        <li><strong>Design puzzles</strong> — what the player needs to do, in what order, to progress. Use flags to track puzzle state.</li>
      </ol>

      <h4>Step 2: Coordinate System & Layout Rules</h4>
      <p>
        The game viewport is defined by the project's <code>display</code> config. The default —
        and what the Bork sample uses — is <strong>640 × 360</strong>. Origin (0,0) is top-left.
        X increases rightward, Y increases downward.
      </p>
      <table>
        <thead>
          <tr><th>Element</th><th>Typical Placement</th></tr>
        </thead>
        <tbody>
          <tr><td>Sky / ceiling</td><td>Y 0–90</td></tr>
          <tr><td>Background objects (signs, windows)</td><td>Y 70–220</td></tr>
          <tr><td>Walkable ground (walkboxes)</td><td>Y 220–355</td></tr>
          <tr><td>Objects on the ground</td><td>Y 250–325 (position.y should be inside a walkbox)</td></tr>
          <tr><td>Actors</td><td>Y 270–345 (feet position inside walkbox)</td></tr>
          <tr><td>Spawn points</td><td>Y 290–340 (must be inside a walkbox polygon)</td></tr>
        </tbody>
      </table>

      <h4>Step 3: Room Template</h4>
      <p>
        Every room needs at minimum: an id, name, one walkbox, and one spawn point.
      </p>
      <pre><code>{`{
  "id": "room_id",
  "name": "Human-Readable Name",
  "backgroundPath": "",
  "width": 640,
  "height": 360,
  "walkboxes": [{
    "id": "floor",
    "polygon": [
      {"x": 24, "y": 252}, {"x": 616, "y": 252},
      {"x": 616, "y": 356}, {"x": 24, "y": 356}
    ],
    "adjacentIds": []
  }],
  "exits": [],
  "hotspots": [],
  "spawnPoints": [{"id": "default", "x": 320, "y": 306}],
  "objectIds": [],
  "actorIds": []
}`}</code></pre>

      <h4>Step 4: Bidirectional Room Connections</h4>
      <p>
        Every exit must be paired with a matching entry point in the target room. Follow
        this pattern:
      </p>
      <pre><code>{`// Room A: exit on the east edge
{
  "id": "to_room_b",
  "direction": "E",
  "bounds": {"x": 608, "y": 234, "width": 32, "height": 126},
  "targetRoomId": "room_b",
  "targetSpawnPointId": "from_room_a",
  "label": "Go East"
}

// Room B: spawn point on the west side + exit back
// Spawn point:
{"id": "from_room_a", "x": 64, "y": 306, "facing": "E"}
// Exit back:
{
  "id": "to_room_a",
  "direction": "W",
  "bounds": {"x": 0, "y": 234, "width": 32, "height": 126},
  "targetRoomId": "room_a",
  "targetSpawnPointId": "from_room_b",
  "label": "Go West"
}`}</code></pre>
      <p>
        <strong>Exit placement by direction:</strong>
      </p>
      <table>
        <thead>
          <tr><th>Direction</th><th>Typical bounds</th></tr>
        </thead>
        <tbody>
          <tr><td>North</td><td><code>{`{"x": 240, "y": 0, "width": 160, "height": 36}`}</code></td></tr>
          <tr><td>South</td><td><code>{`{"x": 240, "y": 324, "width": 160, "height": 36}`}</code></td></tr>
          <tr><td>East</td><td><code>{`{"x": 608, "y": 225, "width": 32, "height": 135}`}</code></td></tr>
          <tr><td>West</td><td><code>{`{"x": 0, "y": 225, "width": 32, "height": 135}`}</code></td></tr>
        </tbody>
      </table>

      <h4>Step 5: Script Patterns</h4>
      <p>
        Scripts are JavaScript strings with access to <code>ctx</code> (ScriptContext). Common patterns:
      </p>
      <pre><code>{`// Simple look description
"ctx.say('A dusty old bookshelf filled with leather-bound tomes.');"

// One-time pickup with flag guard
"if (ctx.getFlag('took_gem')) { ctx.say('Nothing else here.'); return; } ctx.setFlag('took_gem', true); ctx.giveItem('player', 'ruby_gem'); ctx.say('You pocket the ruby gem.');"

// Room enter cutscene (first visit only)
"if (ctx.state.hasVisitedRoom('cave')) return; ctx.lockInput(); await ctx.sayBlocking('player', 'It is dark in here...'); ctx.unlockInput();"

// NPC talk handler that starts a dialogue tree
"await ctx.startDialogue('merchant_chat');"`}</code></pre>

      <h4>Step 5b: "Use Item on Object" — Preferred Approach</h4>
      <p>
        For puzzles where the player uses an inventory item on something (e.g. use key on door),
        use <code>useWithHandlers</code> on the target object definition instead of writing
        raw script code. This is declarative and the engine handles fallback messages automatically.
      </p>
      <pre><code>{`// On the object definition (JSON):
{
  "id": "locked_chest",
  "name": "Locked Chest",
  "verbHandlers": {"look": "look_chest", "open": "try_open_chest"},
  "useWithHandlers": {
    "silver_key": "unlock_chest_with_key"
  },
  "fallbackScriptId": "chest_fallback"
}

// The unlock script is simple — no need to check secondaryTargetId:
{
  "name": "unlock_chest_with_key",
  "body": "ctx.setFlag('chest_unlocked', true); ctx.removeItem('player', 'silver_key'); ctx.say('The chest clicks open!');"
}`}</code></pre>
      <p>
        The engine automatically checks <code>useWithHandlers</code> first when the player
        uses an item on a target. If the item is not in the map, it falls back to the
        <code>"use"</code> verb handler, then the entity's <code>fallbackScriptId</code>,
        then the project's <code>globalFallbackScriptId</code>.
      </p>

      <h4>Step 6: Dialogue Tree Patterns</h4>
      <p>
        Dialogue trees are conversations with NPCs. Key rules:
      </p>
      <ul>
        <li>Set <code>startNodeId</code> to the first node's ID.</li>
        <li>Branches with <code>nextNodeId: null</code> end the conversation.</li>
        <li>Nodes with empty <code>branches: []</code> are click-to-advance (no player choice).</li>
        <li>Use <code>condition</code> on branches to reveal options based on flags (a string flag name or a ConditionExpression object).</li>
        <li>Use <code>once: true</code> on a branch to hide it after it has been chosen once. Great for "Ask about X" options that should disappear after the topic is exhausted.</li>
        <li>Use <code>once: true</code> on a node for intro lines that only play on the first conversation. The engine falls through to the next valid node.</li>
        <li>Use <code>actions</code> on nodes to set flags, give/remove items, change rooms, set variables, call scripts, or set object state.</li>
        <li>Use <code>onStartFlag</code> and <code>onEndFlag</code> on the dialogue tree to auto-set flags when conversations start/end.</li>
      </ul>
      <pre><code>{`// Example: once-only branch and node
{
  "id": "guard_chat",
  "name": "Guard Conversation",
  "actorId": "guard",
  "startNodeId": "intro",
  "onEndFlag": "talked_to_guard",
  "nodes": [
    {
      "id": "intro",
      "speaker": "guard",
      "text": "Halt! State your business.",
      "once": true,
      "branches": [],
      "actions": []
    },
    {
      "id": "main",
      "speaker": "guard",
      "text": "What do you want now?",
      "branches": [
        {
          "id": "ask_about_key",
          "text": "Do you know where the key is?",
          "nextNodeId": "key_info",
          "once": true
        },
        {
          "id": "ask_passage",
          "text": "Can I pass?",
          "nextNodeId": "passage_check",
          "condition": {"type": "flag", "flag": "knows_password"}
        },
        {
          "id": "bye",
          "text": "Never mind.",
          "nextNodeId": null
        }
      ]
    },
    {
      "id": "key_info",
      "speaker": "guard",
      "text": "The blacksmith keeps a spare. Don't tell him I told you.",
      "branches": [],
      "actions": [
        {"type": "setFlag", "flag": "knows_key_location", "flagValue": true}
      ]
    }
  ]
}`}</code></pre>

      <h4>Step 7: Object Bounds</h4>
      <p>
        Object <code>bounds</code> are <strong>relative to the object's position</strong>.
        To center the clickable area, use negative offsets:
      </p>
      <pre><code>{`// Object at position (400, 320), size 60x80
// Bounds should center: x = -30 (half width), y = -80 (full height above feet)
"position": {"x": 400, "y": 320},
"spriteWidth": 60,
"spriteHeight": 80,
"bounds": {"x": -30, "y": -80, "width": 60, "height": 80}`}</code></pre>

      <h4>Step 8: Assets</h4>
      <p>
        When generating a project from a prompt, set <code>assets</code> to an empty
        array <code>[]</code>. The engine automatically draws colored placeholder graphics
        for all missing images:
      </p>
      <ul>
        <li>Rooms get gradient backgrounds.</li>
        <li>Actors get colored silhouettes.</li>
        <li>Objects get colored rectangles.</li>
        <li>Items get colored squares in the inventory bar.</li>
      </ul>
      <p>
        This means generated projects are <strong>instantly playable</strong> without any image files.
        Art can be added later by importing assets in the editor.
      </p>

      <h4>Step 9: Advanced Features</h4>
      <p>
        These features are optional but enable more sophisticated games:
      </p>

      <h5>Conditional Visibility</h5>
      <p>
        Objects, hotspots, and exits can appear or disappear based on game state using
        <code>visibilityCondition</code>. This is powerful for puzzle progression:
      </p>
      <pre><code>{`// A hidden passage that only appears after pulling a lever
{
  "id": "secret_passage",
  "name": "Secret Passage",
  "roomId": "library",
  "position": {"x": 600, "y": 280},
  "spriteWidth": 60,
  "spriteHeight": 100,
  "bounds": {"x": -30, "y": -100, "width": 60, "height": 100},
  "visible": true,
  "enabled": true,
  "visibilityCondition": {"type": "flag", "flag": "lever_pulled"},
  "verbHandlers": {"open": "enter_secret_room"}
}

// An exit that is only usable after finding a key
{
  "id": "locked_gate",
  "direction": "E",
  "bounds": {"x": 608, "y": 225, "width": 32, "height": 135},
  "targetRoomId": "garden",
  "targetSpawnPointId": "from_courtyard",
  "label": "Garden Gate",
  "interactionCondition": {"type": "flag", "flag": "gate_unlocked"}
}`}</code></pre>

      <h5>State Watchers</h5>
      <p>
        Use <code>stateWatchers</code> at the project level to trigger scripts automatically
        when conditions become true. Perfect for win conditions or multi-step puzzles:
      </p>
      <pre><code>{`"stateWatchers": [
  {
    "id": "all_gems_collected",
    "condition": {
      "type": "and",
      "conditions": [
        {"type": "inventory", "actorId": "player", "itemId": "red_gem"},
        {"type": "inventory", "actorId": "player", "itemId": "blue_gem"},
        {"type": "inventory", "actorId": "player", "itemId": "green_gem"}
      ]
    },
    "scriptId": "gems_complete_cutscene",
    "once": true
  }
]`}</code></pre>

      <h5>Visual Scripts</h5>
      <p>
        Instead of raw JavaScript strings, you can use structured visual scripts.
        These are more verbose but less error-prone — no syntax errors from unmatched
        quotes or missing semicolons:
      </p>
      <pre><code>{`{
  "name": "enter_cave",
  "kind": "visual",
  "body": "",
  "steps": [
    {
      "type": "if",
      "condition": {"type": "roomVisited", "roomId": "cave"},
      "thenSteps": [],
      "elseSteps": [
        {"type": "lockInput"},
        {"type": "sayBlocking", "actorId": "player", "text": "It is dark in here..."},
        {
          "type": "if",
          "condition": {"type": "inventory", "actorId": "player", "itemId": "lantern"},
          "thenSteps": [
            {"type": "say", "text": "Good thing I brought the lantern."}
          ],
          "elseSteps": [
            {"type": "say", "text": "I can barely see a thing."}
          ]
        },
        {"type": "unlockInput"}
      ]
    }
  ]
}`}</code></pre>

      <h4>Step 10: Validation Checklist</h4>
      <p>
        Before finalizing the generated JSON, verify:
      </p>
      <ul>
        <li><code>startingRoom</code> matches a room <code>id</code>.</li>
        <li><code>defaultPlayerActorId</code> matches an actor with <code>isPlayer: true</code>.</li>
        <li><code>defaultPlayerPosition</code> is inside the starting room's walkbox.</li>
        <li>All <code>objectIds</code> in rooms match defined object <code>id</code> values.</li>
        <li>All <code>actorIds</code> in rooms match defined actor <code>id</code> values, and each referenced actor has <code>defaultRoomId</code> set to that room's ID. <strong>Both sides are required</strong> — without <code>actorIds</code> the NPC will not appear.</li>
        <li>All exit <code>targetRoomId</code> values match existing room <code>id</code> values.</li>
        <li>All exit <code>targetSpawnPointId</code> values match spawn points in the target room.</li>
        <li>All <code>verbHandlers</code> values match defined script <code>name</code> values.</li>
        <li>All <code>onEnter</code>/<code>onExit</code>/<code>onUpdate</code> values match defined script <code>name</code> values.</li>
        <li>All actor <code>dialogueId</code> values match defined dialogue tree <code>id</code> values.</li>
        <li>All <code>useWithHandlers</code> values match defined script <code>name</code> values.</li>
        <li>All <code>fallbackScriptId</code> and <code>globalFallbackScriptId</code> values match defined script <code>name</code> values.</li>
        <li>All state watcher <code>scriptId</code> values match defined script <code>name</code> values.</li>
        <li>All spawn points and actor positions are inside walkbox polygons.</li>
        <li>Rooms are connected bidirectionally (exits + matching spawn points).</li>
        <li><code>formatVersion</code> is set to <code>2</code>.</li>
      </ul>

      <h4>Common Pitfalls</h4>
      <ul>
        <li><strong>Spawn outside walkbox:</strong> If a spawn point is outside all walkboxes, the player cannot move. Always place spawns within walkbox polygons.</li>
        <li><strong>One-way exits:</strong> Forgetting the return exit traps the player in a room. Always create both directions.</li>
        <li><strong>Missing scripts:</strong> Every script name referenced in <code>verbHandlers</code>, <code>onEnter</code>, <code>onExit</code> must have a matching entry in the <code>scripts</code> array.</li>
        <li><strong>"walk" in verbHandlers:</strong> The "walk" verb is handled by the engine automatically. Never add it to <code>verbHandlers</code>.</li>
        <li><strong>Duplicate IDs:</strong> All IDs (rooms, actors, objects, items, scripts) must be unique across their type.</li>
        <li><strong>Object without roomId:</strong> Objects listed in a room's <code>objectIds</code> must have <code>roomId</code> set to that room's ID.</li>
        <li><strong>NPC missing from room's actorIds:</strong> Setting <code>defaultRoomId</code> on an actor is NOT enough — the target room must also list the actor's ID in its <code>actorIds</code> array. Without this, the NPC will never appear. This is a dual reference: actor → <code>defaultRoomId</code> AND room → <code>actorIds</code>. (Analogous to how objects need both <code>roomId</code> and the room's <code>objectIds</code>.)</li>
        <li><strong>Items not consumed automatically:</strong> <code>useWithHandlers</code> does NOT remove the item from inventory. Call <code>ctx.removeItem()</code> explicitly in the script.</li>
        <li><strong>Inventory requires actorId:</strong> Always pass the actor ID (e.g. <code>"player"</code>) to <code>ctx.giveItem</code>, <code>ctx.removeItem</code>, <code>ctx.hasItem</code>.</li>
      </ul>

      <h4>Medium Valid Project Example</h4>
      <p>
        A two-room project demonstrating: object, item, NPC with dialogue tree, state watcher,
        <code>useWithHandlers</code>, raw JS script, and visual script — all interconnected.
      </p>
      <pre><code>{`{
  "formatVersion": 2,
  "id": "generated",
  "title": "The Blacksmith's Favor",
  "created": 1700000000000,
  "modified": 1700000000000,
  "startingRoom": "village_square",
  "defaultPlayerActorId": "player",
  "defaultPlayerPosition": {"x": 320, "y": 315},
  "startingItems": [],
  "verbs": ["walk", "look", "open", "pickup", "use", "talk", "give"],
  "rooms": [
    {
      "id": "village_square",
      "name": "Village Square",
      "backgroundPath": "",
      "width": 640,
      "height": 360,
      "walkboxes": [
        {
          "id": "ground",
          "polygon": [
            {"x": 24, "y": 252}, {"x": 616, "y": 252},
            {"x": 616, "y": 356}, {"x": 24, "y": 356}
          ],
          "adjacentIds": []
        }
      ],
      "exits": [
        {
          "id": "to_smithy",
          "direction": "E",
          "bounds": {"x": 608, "y": 225, "width": 32, "height": 135},
          "targetRoomId": "smithy",
          "targetSpawnPointId": "from_square",
          "label": "Smithy"
        }
      ],
      "hotspots": [
        {
          "id": "well",
          "name": "Village Well",
          "roomId": "village_square",
          "bounds": {"x": 280, "y": 135, "width": 80, "height": 108},
          "description": "An old stone well in the center of the square.",
          "verbHandlers": {"look": "look_well", "use": "use_well"}
        }
      ],
      "spawnPoints": [
        {"id": "default", "x": 320, "y": 315},
        {"id": "from_smithy", "x": 560, "y": 306, "facing": "W"}
      ],
      "objectIds": ["herb_pouch"],
      "onEnter": "enter_square"
    },
    {
      "id": "smithy",
      "name": "The Smithy",
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
          "id": "to_square",
          "direction": "W",
          "bounds": {"x": 0, "y": 234, "width": 32, "height": 126},
          "targetRoomId": "village_square",
          "targetSpawnPointId": "from_smithy",
          "label": "Village Square"
        }
      ],
      "hotspots": [],
      "spawnPoints": [
        {"id": "default", "x": 320, "y": 315},
        {"id": "from_square", "x": 64, "y": 306, "facing": "E"}
      ],
      "objectIds": ["anvil"],
      "actorIds": ["blacksmith"]
    }
  ],
  "actors": [
    {
      "id": "player",
      "name": "You",
      "isPlayer": true,
      "position": {"x": 320, "y": 315},
      "facing": "E",
      "movementSpeed": 130,
      "spriteWidth": 40,
      "spriteHeight": 60
    },
    {
      "id": "blacksmith",
      "name": "Blacksmith",
      "isPlayer": false,
      "defaultRoomId": "smithy",
      "position": {"x": 440, "y": 297},
      "facing": "W",
      "movementSpeed": 80,
      "spriteWidth": 48,
      "spriteHeight": 64,
      "dialogueId": "blacksmith_chat",
      "verbHandlers": {
        "look": "look_blacksmith"
      },
      "useWithHandlers": {
        "healing_herbs": "give_herbs_to_smith"
      },
      "fallbackScriptId": "smith_fallback"
    }
  ],
  "objects": [
    {
      "id": "herb_pouch",
      "name": "Herb Pouch",
      "roomId": "village_square",
      "position": {"x": 160, "y": 306},
      "spriteWidth": 24,
      "spriteHeight": 20,
      "bounds": {"x": -12, "y": -20, "width": 24, "height": 20},
      "visible": true,
      "enabled": true,
      "pickupable": true,
      "description": "A small leather pouch of healing herbs.",
      "verbHandlers": {
        "look": "look_herbs",
        "pickup": "pickup_herbs"
      }
    },
    {
      "id": "anvil",
      "name": "Anvil",
      "roomId": "smithy",
      "position": {"x": 320, "y": 306},
      "spriteWidth": 50,
      "spriteHeight": 40,
      "bounds": {"x": -25, "y": -40, "width": 50, "height": 40},
      "visible": true,
      "enabled": true,
      "pickupable": false,
      "description": "A heavy iron anvil. It shows years of use.",
      "verbHandlers": {
        "look": "look_anvil"
      }
    }
  ],
  "items": [
    {
      "id": "healing_herbs",
      "name": "Healing Herbs",
      "description": "A pouch of fragrant healing herbs.",
      "verbHandlers": {
        "look": "examine_herbs"
      }
    },
    {
      "id": "iron_sword",
      "name": "Iron Sword",
      "description": "A finely crafted iron sword, still warm from the forge.",
      "verbHandlers": {
        "look": "examine_sword"
      }
    }
  ],
  "scripts": [
    {
      "name": "enter_square",
      "kind": "visual",
      "body": "",
      "description": "First visit intro using visual script",
      "steps": [
        {
          "type": "if",
          "condition": {"type": "roomVisited", "roomId": "village_square"},
          "thenSteps": [],
          "elseSteps": [
            {"type": "lockInput"},
            {"type": "sayBlocking", "actorId": "player", "text": "The village square is quiet today. I should find the blacksmith."},
            {"type": "unlockInput"}
          ]
        }
      ]
    },
    {
      "name": "look_well",
      "body": "ctx.say('An old stone well. The water looks clean.');"
    },
    {
      "name": "use_well",
      "body": "ctx.say('You splash some cool water on your face. Refreshing!');"
    },
    {
      "name": "look_herbs",
      "body": "ctx.say('A small leather pouch filled with healing herbs.');"
    },
    {
      "name": "pickup_herbs",
      "body": "ctx.giveItem('player', 'healing_herbs'); ctx.say('You pick up the herb pouch.'); ctx.state.setObjectLocation('herb_pouch', null);"
    },
    {
      "name": "examine_herbs",
      "body": "ctx.say('Fragrant healing herbs. The blacksmith might need these.');"
    },
    {
      "name": "look_blacksmith",
      "body": "ctx.say(ctx.getFlag('smith_healed') ? 'The blacksmith looks much healthier now.' : 'The blacksmith looks pale and unwell.');"
    },
    {
      "name": "give_herbs_to_smith",
      "body": "ctx.removeItem('player', 'healing_herbs'); ctx.setFlag('smith_healed', true); await ctx.sayBlocking('blacksmith', 'These herbs are exactly what I needed! Thank you!'); await ctx.sayBlocking('blacksmith', 'Take this sword as my thanks.'); ctx.giveItem('player', 'iron_sword');"
    },
    {
      "name": "smith_fallback",
      "body": "ctx.say('The blacksmith shakes his head.');"
    },
    {
      "name": "look_anvil",
      "body": "ctx.say('A heavy iron anvil, scarred from years of hammering.');"
    },
    {
      "name": "examine_sword",
      "body": "ctx.say('A beautiful iron sword. The blacksmith\\'s finest work.');"
    },
    {
      "name": "victory_cutscene",
      "kind": "visual",
      "body": "",
      "description": "Triggered by watcher when sword is obtained",
      "steps": [
        {"type": "lockInput"},
        {"type": "sayBlocking", "actorId": "player", "text": "With this sword, I can face any challenge. The blacksmith's favor has been repaid!"},
        {"type": "say", "text": "Congratulations! You completed The Blacksmith's Favor!"}
      ]
    }
  ],
  "dialogueTrees": [
    {
      "id": "blacksmith_chat",
      "name": "Blacksmith Conversation",
      "actorId": "blacksmith",
      "startNodeId": "intro",
      "onEndFlag": "talked_to_smith",
      "nodes": [
        {
          "id": "intro",
          "speaker": "blacksmith",
          "text": "Ugh... I feel terrible. Some healing herbs would do wonders.",
          "once": true,
          "branches": [],
          "actions": [
            {"type": "setFlag", "flag": "knows_herbs_needed", "flagValue": true}
          ]
        },
        {
          "id": "main",
          "speaker": "blacksmith",
          "text": "What can I do for you?",
          "branches": [
            {
              "id": "ask_herbs",
              "text": "Where can I find healing herbs?",
              "nextNodeId": "herbs_hint",
              "once": true
            },
            {
              "id": "ask_sword",
              "text": "Can you make me a sword?",
              "nextNodeId": "sword_response"
            },
            {
              "id": "bye",
              "text": "Nothing right now. Goodbye.",
              "nextNodeId": null
            }
          ]
        },
        {
          "id": "herbs_hint",
          "speaker": "blacksmith",
          "text": "Check the village square. I saw some growing near the well.",
          "branches": [],
          "actions": []
        },
        {
          "id": "sword_response",
          "speaker": "blacksmith",
          "text": "I would, but I feel too sick to work the forge. Bring me some healing herbs first.",
          "branches": [],
          "actions": [],
          "condition": {"type": "not", "condition": {"type": "flag", "flag": "smith_healed"}}
        },
        {
          "id": "sword_healed",
          "speaker": "blacksmith",
          "text": "I already gave you my finest sword! Use it well.",
          "branches": [],
          "actions": [],
          "condition": {"type": "flag", "flag": "smith_healed"}
        }
      ]
    }
  ],
  "stateWatchers": [
    {
      "id": "sword_obtained",
      "condition": {
        "type": "inventory",
        "actorId": "player",
        "itemId": "iron_sword"
      },
      "scriptId": "victory_cutscene",
      "once": true
    }
  ],
  "assets": [],
  "uiSettings": {
    "verbBarEnabled": true,
    "inventoryEnabled": true,
    "messageLogEnabled": true,
    "showRoomTitle": true
  },
  "globalFallbackScriptId": "smith_fallback"
}`}</code></pre>
      <p>
        This example demonstrates:
      </p>
      <ul>
        <li><strong>NPC placement (dual reference):</strong> The blacksmith actor has <code>defaultRoomId: "smithy"</code> AND the smithy room has <code>actorIds: ["blacksmith"]</code>. Both sides are required — without <code>actorIds</code>, the NPC would never appear.</li>
        <li><strong>Object + Item pair:</strong> <code>herb_pouch</code> (world object) and <code>healing_herbs</code> (inventory item) — picked up via script, removed from room with <code>setObjectLocation(null)</code>.</li>
        <li><strong>useWithHandlers:</strong> On the blacksmith actor — using the <code>healing_herbs</code> item on the blacksmith triggers the <code>give_herbs_to_smith</code> script (which removes the item explicitly).</li>
        <li><strong>Dialogue tree:</strong> Multi-node conversation with <code>once: true</code> intro node, conditional nodes, <code>onEndFlag</code>, and dialogue actions.</li>
        <li><strong>State watcher:</strong> Monitors when the player has the <code>iron_sword</code> and auto-triggers a victory cutscene.</li>
        <li><strong>Raw JS script:</strong> Most scripts use raw JavaScript (<code>give_herbs_to_smith</code>, <code>look_blacksmith</code>, etc.).</li>
        <li><strong>Visual script:</strong> <code>enter_square</code> and <code>victory_cutscene</code> use structured visual steps with <code>if</code> conditions, <code>lockInput</code>, and <code>sayBlocking</code>.</li>
        <li><strong>Hotspot:</strong> The <code>well</code> hotspot in the village square with verb handlers.</li>
        <li><strong>Fallback:</strong> <code>smith_fallback</code> serves as both the blacksmith's entity fallback and the project's global fallback.</li>
      </ul>
    </section>
  );
}
