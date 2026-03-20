export function AssetsSection() {
  return (
    <section>
      <h3>Assets</h3>
      <p>
        The asset library manages all images and audio used by your game. Assets are organized
        by type so you can quickly find what you need.
      </p>
      <h4>Asset Types</h4>
      <table>
        <thead>
          <tr><th>Type</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Background</strong></td><td>Room background images. Appear first in room background pickers.</td></tr>
          <tr><td><strong>Sprite</strong></td><td>Actor and object sprites. Prioritized in object/actor sprite pickers.</td></tr>
          <tr><td><strong>Icon</strong></td><td>Inventory item icons (typically ~32x32). Prioritized in item icon pickers.</td></tr>
          <tr><td><strong>Audio</strong></td><td>Sound effects and music (OGG/MP3).</td></tr>
          <tr><td><strong>Other</strong></td><td>Miscellaneous images (cursors, UI elements, etc.).</td></tr>
        </tbody>
      </table>
      <h4>Asset Library Panel</h4>
      <p>
        The <strong>Assets</strong> tab in the editor provides a full asset management panel:
      </p>
      <ul>
        <li><strong>Type filter bar</strong> — filter the asset list by type. Each button shows a count badge with the number of assets of that type. Types with no assets are hidden.</li>
        <li><strong>Thumbnails</strong> — image assets display a small preview thumbnail in the list. Audio assets show a speaker icon.</li>
        <li><strong>Per-asset type dropdown</strong> — each asset has a dropdown to change its type after import (e.g. re-categorize an "Other" image as a "Sprite").</li>
        <li><strong>Dimensions</strong> — image dimensions (width x height) are displayed next to each asset.</li>
      </ul>
      <h4>Importing Assets</h4>
      <p>
        Click <strong>+ Import</strong> to select image or audio files from your computer.
        The editor automatically guesses the asset type from the filename:
      </p>
      <ul>
        <li>Files containing "bg" or "background" are categorized as <strong>Background</strong>.</li>
        <li>Files containing "sprite" are categorized as <strong>Sprite</strong>.</li>
        <li>Files containing "icon" or "cursor" are categorized as <strong>Icon</strong>.</li>
        <li>Audio files are automatically categorized as <strong>Audio</strong>.</li>
        <li>Everything else defaults to <strong>Other</strong> — you can re-categorize after import.</li>
      </ul>
      <h4>Asset Pickers</h4>
      <p>
        Throughout the editor, asset pickers let you visually select assets from the library
        instead of typing file paths. Each picker shows a thumbnail preview of the selected
        asset and groups the dropdown by relevant type first:
      </p>
      <ul>
        <li><strong>Room Settings</strong> — background picker (prioritizes Background assets).</li>
        <li><strong>Object Inspector</strong> — sprite picker (prioritizes Sprite assets).</li>
        <li><strong>Actor Details</strong> — sprite picker (prioritizes Sprite assets).</li>
        <li><strong>Item Details</strong> — icon picker (prioritizes Icon assets).</li>
      </ul>
      <h4>Code-Based Assets</h4>
      <p>When writing game projects in code, place files in <code>public/projects/&lt;your-game&gt;/</code>:</p>
      <pre><code>{`public/projects/my-game/
  backgrounds/    ← Room backgrounds (PNG, match your room dimensions)
  masks/          ← Foreground occlusion masks (PNG, same size as background)
  actors/         ← Sprite frames for actor animations
    player/       ← Organized by actor (e.g. walk_s_1.png, idle_e_1.png)
  objects/        ← Object sprites (including state variants)
  inventory/      ← Item icons (PNG, ~32×32)
  audio/          ← Sound effects and music (OGG/MP3)`}</code></pre>
      <p>Reference them in content definitions using relative paths from the asset root:</p>
      <pre><code>{`backgroundPath: "projects/my-game/backgrounds/room1.png"
spritePath: "projects/my-game/objects/door.png"`}</code></pre>
    </section>
  );
}
