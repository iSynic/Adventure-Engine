import type { ExportManifest } from "../shared/exportSchema";
import { bootRuntime } from "./launcherBoot";

function resolveManifestUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("manifest") ?? "./manifest.json";
}

function resolvePackageRoot(manifestUrl: string): string {
  const lastSlash = manifestUrl.lastIndexOf("/");
  if (lastSlash >= 0) {
    return manifestUrl.slice(0, lastSlash + 1);
  }
  return "./";
}

async function boot() {
  const loadingStatus = document.getElementById("loading-status");
  const onStatusUpdate = (msg: string) => {
    if (loadingStatus) loadingStatus.textContent = msg;
  };

  onStatusUpdate("Fetching manifest...");

  const manifestUrl = resolveManifestUrl();
  const packageRoot = resolvePackageRoot(manifestUrl);

  let manifest: ExportManifest;
  try {
    const resp = await fetch(manifestUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    manifest = await resp.json();
  } catch (e) {
    onStatusUpdate("Error: Could not load manifest.json");
    console.error("[PlayablePlayer] Manifest load error:", e);
    return;
  }

  onStatusUpdate("Booting runtime...");

  const mount = document.getElementById("canvas-wrap")?.parentElement
    ?? document.body;

  try {
    await bootRuntime({
      packageRoot,
      manifest,
      mode: "web",
      mount,
      onStatusUpdate,
      scalingContainer: document.getElementById("game-container") ?? undefined,
    });
  } catch (e) {
    console.error("[PlayablePlayer] Boot error:", e);
  }

  onStatusUpdate("");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
