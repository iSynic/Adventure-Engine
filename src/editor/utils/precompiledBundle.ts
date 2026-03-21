import JSZip from "jszip";

type ViteManifestEntry = {
  file: string;
  src?: string;
  isEntry?: boolean;
  css?: string[];
  assets?: string[];
  imports?: string[];
};

type ViteManifest = Record<string, ViteManifestEntry>;

const RUNTIME_FILES: { zipPath: string; fetchPath: string }[] = [
  { zipPath: "launcher-runtime/runtime.js", fetchPath: "/launcher-runtime/runtime.js" },
  { zipPath: "playable-runtime/playable.js", fetchPath: "/playable-runtime/playable.js" },
  { zipPath: "player-runtime/player.js",     fetchPath: "/player-runtime/player.js" },
  { zipPath: "index.html",                   fetchPath: "/index.html" },
];

const README = [
  "# Adventure Engine — Precompiled Build",
  "",
  "This archive contains the compiled runtime artifacts for the Adventure Engine.",
  "These are the files a Tauri desktop launcher (or any custom host) needs at",
  "runtime — no Node.js, pnpm, or build step required.",
  "",
  "## Contents",
  "",
  "| File | Role |",
  "|---|---|",
  "| `index.html` | Engine entry point (load this in Tauri's webview) |",
  "| `assets/index-*.js` | Compiled engine + editor application bundle |",
  "| `assets/index-*.css` | Compiled styles |",
  "| `assets/*.png` | Bork sample-project sprites, backgrounds and objects |",
  "| `launcher-runtime/runtime.js` | Full engine + editor bundle for Tauri launchers |",
  "| `playable-runtime/playable.js` | Standalone web-playable runtime (exported games) |",
  "| `player-runtime/player.js` | Embedded player runtime (iframe / widget use) |",
  "",
  "## Tauri Integration",
  "",
  "Point your Tauri `tauri.conf.json` at `index.html` and serve the entire",
  "archive root as the webview asset directory. The app bundle and all image",
  "assets must be reachable at their original paths relative to `index.html`.",
  "See `docs/TAURI_INTEGRATION_HANDOFF.md` in the source repository for the",
  "full integration guide.",
  "",
  "## Notes",
  "",
  "- `index.html` already contains `<script src=\"/tauri-shim.js\">` and",
  "  `<script src=\"/_tauri/provider.js\">` — these are no-ops in web mode",
  "  and are resolved by the Tauri launcher in desktop mode.",
  "- Exported game assets (sprites, audio) for games you create are bundled",
  "  separately per-project by the editor's Export function.",
  "",
].join("\n");

async function fetchManifestAssets(): Promise<{ zipPath: string; blob: Blob }[]> {
  const manifestRes = await fetch("/asset-manifest.json");
  if (!manifestRes.ok) {
    throw new Error(
      `Failed to fetch Vite build manifest (/asset-manifest.json): ${manifestRes.status} ${manifestRes.statusText}. ` +
      `Make sure the engine has been built with "pnpm build" before downloading.`
    );
  }

  const manifest: ViteManifest = await manifestRes.json();

  const outputFiles = new Set<string>();
  for (const entry of Object.values(manifest)) {
    outputFiles.add(entry.file);
    for (const css of entry.css ?? []) outputFiles.add(css);
    for (const asset of entry.assets ?? []) outputFiles.add(asset);
  }

  return Promise.all(
    [...outputFiles].map(async (file) => {
      const fetchPath = `/${file}`;
      const res = await fetch(fetchPath);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch asset "${fetchPath}": ${res.status} ${res.statusText}`
        );
      }
      const blob = await res.blob();
      return { zipPath: file, blob };
    })
  );
}

export async function generatePrecompiledZip(): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder("adventure-engine-precompiled")!;

  const [runtimeResults, manifestAssets] = await Promise.all([
    Promise.all(
      RUNTIME_FILES.map(async ({ zipPath, fetchPath }) => {
        const res = await fetch(fetchPath);
        if (!res.ok) {
          throw new Error(
            `Failed to fetch precompiled file "${fetchPath}": ${res.status} ${res.statusText}`
          );
        }
        const blob = await res.blob();
        return { zipPath, blob };
      })
    ),
    fetchManifestAssets(),
  ]);

  for (const { zipPath, blob } of runtimeResults) {
    root.file(zipPath, blob);
  }

  for (const { zipPath, blob } of manifestAssets) {
    root.file(zipPath, blob);
  }

  root.file("README.md", README);

  return zip.generateAsync({ type: "blob" });
}
