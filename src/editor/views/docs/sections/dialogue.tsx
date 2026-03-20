export function DialogueSection() {
  return (
    <section>
      <h3>Dialogue Trees</h3>
      <p>
        Dialogue trees let you create branching conversations with NPCs. The player sees
        the NPC speak, then chooses from a list of responses. Each choice can lead to
        different dialogue branches, trigger game actions, and be conditionally shown
        or hidden based on game flags.
      </p>
      <h4>Data Model</h4>
      <p>
        A dialogue tree is made up of <strong>nodes</strong>. Each node has a speaker, text,
        and optional branches (player choices). Each branch can link to another node, creating
        the conversation flow.
      </p>
      <pre><code>{`const hermitDialogue: DialogueTree = {
  id: "hermit_greeting",
  name: "Hermit Conversation",
  actorId: "old_hermit",
  startNodeId: "greeting",
  nodes: [
    {
      id: "greeting",
      speaker: "Old Hermit",
      text: "Well hello there, stranger! What brings you here?",
      branches: [
        { id: "b1", text: "Who are you?", nextNodeId: "who_are_you" },
        { id: "b2", text: "What is this place?", nextNodeId: "about_place" },
        {
          id: "b3",
          text: "I heard you have a key...",
          nextNodeId: "about_key",
          condition: "leaflet_read",  // Only shown if this flag is true
        },
        { id: "b4", text: "Goodbye.", nextNodeId: null },  // Ends dialogue
      ],
    },
    {
      id: "who_are_you",
      speaker: "Old Hermit",
      text: "I'm just an old hermit. Been living here for decades.",
      actions: [
        { type: "setFlag", flag: "met_hermit", flagValue: true },
      ],
      branches: [
        { id: "b5", text: "Tell me more.", nextNodeId: "about_place" },
        { id: "b6", text: "Thanks, goodbye.", nextNodeId: null },
      ],
    },
    // ... more nodes
  ],
};`}</code></pre>
      <h4>Conditions</h4>
      <p>
        Both nodes and branches can have a <code>condition</code> field — a flag name. The node
        or choice is only shown if that flag is currently <code>true</code>. This lets you reveal
        new dialogue options as the player discovers things.
      </p>
      <h4>Actions</h4>
      <p>
        Nodes can trigger actions when reached. Available action types:
      </p>
      <table>
        <thead>
          <tr><th>Action Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>setFlag</code></td><td>Set a boolean flag (e.g. <code>met_hermit = true</code>).</td></tr>
          <tr><td><code>giveItem</code></td><td>Add an item to an actor's inventory.</td></tr>
          <tr><td><code>gotoRoom</code></td><td>Transition to a different room after the dialogue.</td></tr>
          <tr><td><code>endDialogue</code></td><td>End the conversation immediately.</td></tr>
        </tbody>
      </table>
      <h4>Launching Dialogue from Scripts</h4>
      <pre><code>{`talk_hermit: async (ctx: ScriptContext) => {
  await ctx.startDialogue("hermit_greeting");
  // Execution continues here after the dialogue ends
  ctx.say("That was an interesting conversation.");
}`}</code></pre>
      <h4>Visual Editor</h4>
      <p>
        The editor has a <strong>Dialogue</strong> tab where you can build conversation trees visually:
      </p>
      <ol>
        <li>Click <strong>New Dialogue Tree</strong> to create a tree.</li>
        <li>Add nodes — each node has a speaker name, text, and optional condition.</li>
        <li>Add branches to each node — the player's response choices. Set the text, pick which node each choice leads to, and add optional conditions.</li>
        <li>Add actions to nodes (set flags, give items, go to rooms, or end dialogue).</li>
        <li>The first node in the tree is the starting point of the conversation.</li>
      </ol>
    </section>
  );
}
