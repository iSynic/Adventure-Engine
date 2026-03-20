export function ItemsSection() {
  return (
    <section>
      <h3>Items</h3>
      <p>
        Items are inventory objects that the player can carry and use. They appear in the
        inventory bar at the bottom of the screen.
      </p>
      <pre><code>{`const myItem: ItemDefinition = {
  id: "golden_key",
  name: "Golden Key",
  iconPath: "projects/my-game/inventory/golden_key.png",
  description: "A shiny golden key.",
  verbHandlers: {
    look: "examine_key",
    use: "use_key",
  },
};`}</code></pre>
      <p>
        Give items to the player in scripts with <code>ctx.giveItem("player", "golden_key")</code> and
        check if they have one with <code>ctx.hasItem("player", "golden_key")</code>.
      </p>
      <h4>Editor Workflow</h4>
      <p>
        In the editor, open the <strong>Items</strong> tab and click an item to expand the
        <strong> Item Details</strong> panel:
      </p>
      <ul>
        <li><strong>Name</strong> — the display name shown to the player in the inventory bar.</li>
        <li><strong>Description</strong> — a text description shown when the player examines the item. Supports multi-line text.</li>
        <li><strong>Icon picker</strong> — choose an icon from the asset library. Assets categorized as "Icon" appear first in the dropdown, with other images also available. A thumbnail preview shows the selected icon.</li>
      </ul>
    </section>
  );
}
