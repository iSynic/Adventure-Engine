export function ClickAdvanceDialogueSection() {
  return (
    <section>
      <h3>Click-to-Advance Dialogue</h3>
      <p>
        When a dialogue node has <strong>no branches</strong> (an empty branches array), the
        engine displays the NPC's speech text and waits for the player to click anywhere on
        the screen to advance. This is the "click-to-advance" behavior — useful for NPC
        monologues, narration, and linear storytelling sequences where the player has no
        choices to make.
      </p>
      <h4>How It Works</h4>
      <ol>
        <li>The dialogue system shows the current node's speaker and text.</li>
        <li>If <code>branches</code> is empty, no player choices appear — just the speech text.</li>
        <li>The player clicks anywhere (or presses a key) to proceed.</li>
        <li>If the node has actions, they execute after the click.</li>
        <li>If the node doesn't link to a next node, the dialogue ends.</li>
      </ol>
      <h4>Example</h4>
      <pre><code>{`{
  "id": "narrator_intro",
  "speaker": "Narrator",
  "text": "The wind howled through the empty streets...",
  "branches": [],
  "actions": [
    {"type": "setFlag", "flag": "intro_seen", "flagValue": true}
  ]
}`}</code></pre>
      <p>
        Chain multiple branchless nodes together to create multi-line narration sequences.
        Each click advances to the next node in the chain.
      </p>
      <h4>Mixing with Branching</h4>
      <p>
        A dialogue tree can freely mix branchless nodes (click-to-advance) with branching nodes
        (player choices). For example, an NPC might deliver a speech (click-to-advance), then
        ask a question (branching), then respond with another statement (click-to-advance).
      </p>
    </section>
  );
}
