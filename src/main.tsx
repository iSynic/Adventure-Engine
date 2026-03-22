import { createRoot, type Root } from "react-dom/client";
import EditorPage from "./pages/EditorPage";
import type { StorageProvider } from "./shared/StorageProvider";
import "./index.css";

interface DesktopEditorBootConfig {
  mount: HTMLElement;
  mode: "desktop";
  storageProvider?: StorageProvider;
  projectsRoot?: string;
  bundledProjectsRoot?: string;
}

interface DesktopEditorApi {
  bootEditor: (config: DesktopEditorBootConfig) => Promise<void>;
}

declare global {
  interface Window {
    AdventureEditor?: DesktopEditorApi;
    bootAdventureEditor?: (config: DesktopEditorBootConfig) => Promise<void>;
  }
}

let root: Root | null = null;
let rootMount: HTMLElement | null = null;

function renderEditor(mount: HTMLElement, storageProvider?: StorageProvider): void {
  if (root && rootMount !== mount) {
    root.unmount();
    root = null;
  }

  if (!root) {
    root = createRoot(mount);
    rootMount = mount;
  }

  root.render(<EditorPage storageProvider={storageProvider} />);
}

async function bootEditor(config: DesktopEditorBootConfig): Promise<void> {
  renderEditor(config.mount, config.storageProvider);
}

window.AdventureEditor = { bootEditor };
window.bootAdventureEditor = bootEditor;

const defaultMount = document.getElementById("root");
if (defaultMount) {
  renderEditor(defaultMount);
}
