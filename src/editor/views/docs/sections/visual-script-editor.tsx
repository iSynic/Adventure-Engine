export function VisualScriptEditorSection() {
  return (
    <section>
      <h3>Visual Script Editor</h3>
      <p>
        The Visual Script Editor is a no-code alternative to writing raw JavaScript scripts.
        Instead of typing code, you build scripts by adding <strong>steps</strong> from a
        categorized action picker. Each step is a single instruction — say a line of dialogue,
        set a flag, move an actor, give an item, and so on.
      </p>
      <h4>How to Use</h4>
      <ol>
        <li>Open the <strong>Scripts</strong> tab in the editor.</li>
        <li>Create a new script or select an existing one.</li>
        <li>Toggle the script mode from <strong>Raw</strong> to <strong>Visual</strong>.</li>
        <li>Click <strong>+ Add Step</strong> to open the step catalog.</li>
        <li>Pick an action from the categorized list (Dialogue, State, Navigation, Inventory, Timing, Animation, Control, Logic).</li>
        <li>Configure the step's parameters using the inline form fields (dropdowns for actors, rooms, items; text inputs for messages).</li>
        <li>Reorder steps by dragging or using the up/down buttons.</li>
      </ol>
      <h4>Step Categories</h4>
      <table>
        <thead>
          <tr><th>Category</th><th>Steps</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Dialogue</strong></td><td>Say (non-blocking), Say (blocking), Start Dialogue Tree</td></tr>
          <tr><td><strong>State</strong></td><td>Set Flag, Set Variable, Increment Variable, Set Object State, Set Object Primary State, Set Room Variable</td></tr>
          <tr><td><strong>Navigation</strong></td><td>Go to Room, Walk Actor To, Face Direction</td></tr>
          <tr><td><strong>Inventory</strong></td><td>Give Item, Remove Item</td></tr>
          <tr><td><strong>Timing</strong></td><td>Fade Out, Fade In, Wait</td></tr>
          <tr><td><strong>Animation</strong></td><td>Play Animation</td></tr>
          <tr><td><strong>Control</strong></td><td>Begin Cutscene, End Cutscene, Lock Input, Unlock Input, Emit Signal, Schedule Script</td></tr>
          <tr><td><strong>Logic</strong></td><td>If / Else (with nested condition builder and sub-steps)</td></tr>
        </tbody>
      </table>
      <h4>If / Else Logic</h4>
      <p>
        The <strong>If / Else</strong> step lets you branch based on conditions. Use the
        built-in <strong>Condition Builder</strong> to define conditions (flag checks, variable
        comparisons, inventory checks, object state checks, etc.) with compound AND/OR/NOT logic.
        The "then" branch runs when the condition is true; the optional "else" branch runs otherwise.
        Both branches can contain any number of nested steps.
      </p>
      <h4>Inline Validation</h4>
      <p>
        The visual editor validates steps in real time. Missing fields (e.g., no actor selected,
        empty text) are highlighted with red error messages directly on the step. Invalid
        references (e.g., a deleted room or actor ID) are caught immediately.
      </p>
      <h4>Export</h4>
      <p>
        Visual scripts are compiled to executable functions at export time by the
        <code>VisualScriptInterpreter</code>. They flow through the same export pipeline as
        raw scripts, so both modes produce identical runtime behavior.
      </p>
    </section>
  );
}
