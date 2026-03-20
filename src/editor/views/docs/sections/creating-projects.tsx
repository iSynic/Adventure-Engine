export function CreatingProjectsSection() {
  return (
    <section>
      <h3>Creating a New Game Project</h3>

      <h4>Option A — Visual Editor (no code required)</h4>
      <ol>
        <li>Click <strong>+ New Project</strong> on the home screen</li>
        <li>Build rooms, actors, objects, hotspots, and scripts using the editor UI</li>
        <li>Hit the <strong>▶ Play</strong> button in the toolbar to test at any time</li>
      </ol>

      {/* TODO: Option B describes the old TypeScript code-first workflow (game.config.ts).
          The current primary workflow is JSON-in / JSON-out via the editor.
          Option B should be updated to describe: authoring JSON directly or via an LLM,
          then importing via File → Import JSON. The src/projects/ directory path is no
          longer the recommended place to create new games. */}
      <h4>Option B — Import JSON</h4>
      <ol>
        <li>Create a project JSON file (by hand, via the LLM Guide, or with an AI assistant)</li>
        <li>Use <strong>File → Import JSON</strong> to load it into the editor</li>
        <li>Use the editor's Play button to test and the inspector panels to refine</li>
      </ol>

      {/* TODO: The game.config.ts example below is the legacy TypeScript code-first
          format. It still works for contributors who author projects in TypeScript directly,
          but it is no longer the recommended creator path. Consider replacing this with
          a minimal bork.json example showing the JSON project format. */}
      <h4>Legacy: Minimal game.config.ts</h4>
      <pre><code>{`import type { GameConfig } from "../../engine/core/types";

export const myGameConfig: GameConfig = {
  id: "my-game",
  title: "My Adventure",
  startingRoom: "intro_room",
  assetRoot: import.meta.env.BASE_URL || "/",
  defaultPlayerActorId: "player",
  verbs: ["walk", "look", "open", "pickup", "use", "talk"],
  rooms: [...roomDefinitions],
  actors: [...actorDefinitions],
  objects: [...objectDefinitions],
  items: [...itemDefinitions],
  dialogueTrees: [...dialogueTreeDefinitions],  // optional
};`}</code></pre>
      <p>
        Load the built-in <strong>Bork</strong> sample project to see a complete working example
        with rooms, actors, objects, scripts, and inventory items already wired up.
      </p>
    </section>
  );
}
