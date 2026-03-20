export function InteractionResolutionSection() {
  return (
    <section>
      <h3>Interaction Resolution</h3>
      <p>
        When the player uses a verb on an object, actor, or hotspot, the engine resolves which
        script to run using a <strong>priority chain</strong>. This chain ensures every interaction
        produces a response, even if no specific handler is defined.
      </p>
      <h4>Resolution Order</h4>
      <p>
        For any verb + target combination, the engine checks in this order:
      </p>
      <ol>
        <li><strong>Use-with handler</strong> (for the "use" verb only): If the player is using an
          inventory item on the target, check <code>useWithHandlers[itemId]</code>. If a script
          is mapped for that specific item, run it.</li>
        <li><strong>Verb handler</strong>: Check <code>verbHandlers[verb]</code> on the target
          entity. If a script is mapped for this verb, run it.</li>
        <li><strong>Entity fallback script</strong>: Check the target's <code>fallbackScriptId</code>.
          If set, run it as a catch-all for unhandled verbs.</li>
        <li><strong>Global fallback script</strong>: Check the project-level
          <code>globalFallbackScriptId</code> (configured in Settings). If set, run it.</li>
        <li><strong>Built-in default text</strong>: The engine displays a generic response
          like "That doesn't work" or "You can't do that."</li>
      </ol>
      <h4>Viewing the Resolution Chain</h4>
      <p>
        In the editor, select any object, hotspot, or actor to open its inspector. At the
        bottom, expand <strong>Interaction Resolution Order</strong> to see a visual breakdown
        of how each verb resolves through the chain. Green checkmarks indicate scripts that
        exist; yellow warnings indicate scripts referenced but not defined; gray X marks
        indicate no handler at that level.
      </p>
      <h4>Use-With Handlers</h4>
      <p>
        Use-with handlers are item-specific scripts for the "use" verb. For example, "use
        brass_key on locked_door" maps to <code>useWithHandlers.brass_key</code> on the
        locked_door object. This enables classic two-object puzzles (use key on lock, use
        sword on rope, etc.) without writing complex conditional scripts.
      </p>
      <pre><code>{`{
  "verbHandlers": {"use": "generic_use_door"},
  "useWithHandlers": {
    "brass_key": "unlock_door_with_key",
    "crowbar": "pry_door_with_crowbar"
  }
}`}</code></pre>
    </section>
  );
}
