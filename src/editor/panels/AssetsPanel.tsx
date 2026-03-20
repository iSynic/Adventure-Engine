import { useRef, useState } from "react";
import { useEditor } from "../store";
import type { EditorAsset } from "../types";
import TutorialBubble from "../components/TutorialBubble";
import { generateId, resolveAssetUrl } from "../utils/projectStorage";

const ASSET_TYPES = ["all", "background", "sprite", "icon", "audio", "other"] as const;
type AssetFilter = (typeof ASSET_TYPES)[number];

const ASSET_TYPE_OPTIONS: EditorAsset["type"][] = ["background", "sprite", "icon", "audio", "other"];

function guessAssetType(file: File): EditorAsset["type"] {
  if (file.type.startsWith("audio")) return "audio";
  const n = file.name.toLowerCase();
  if (n.includes("bg") || n.includes("background")) return "background";
  if (n.includes("sprite")) return "sprite";
  if (n.includes("icon") || n.includes("cursor")) return "icon";
  return "other";
}

export default function AssetsPanel() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<AssetFilter>("all");
  if (!project) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (file.type.startsWith("audio")) {
          const asset: EditorAsset = {
            id: generateId("asset"),
            name: file.name,
            dataUrl,
            type: "audio",
            width: 0,
            height: 0,
          };
          dispatch({ type: "ADD_ASSET", asset });
          return;
        }
        const img = new Image();
        img.onload = () => {
          const asset: EditorAsset = {
            id: generateId("asset"),
            name: file.name,
            dataUrl,
            type: guessAssetType(file),
            width: img.width,
            height: img.height,
          };
          dispatch({ type: "ADD_ASSET", asset });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  const filtered = filter === "all"
    ? project.assets
    : project.assets.filter((a) => a.type === filter);

  const counts: Record<string, number> = {};
  for (const a of project.assets) {
    counts[a.type] = (counts[a.type] || 0) + 1;
  }

  return (
    <div className="tab-panel">
      <div className="panel-header">
        <span>Assets</span>
        <button className="btn btn-ghost btn-xs" onClick={() => fileRef.current?.click()}>+ Import</button>
        <input ref={fileRef} type="file" accept="image/*,audio/*" multiple style={{ display: "none" }} onChange={handleFileChange} />
      </div>
      <TutorialBubble
        title="Asset Type Filter"
        description="Filter the asset list by type. Each button shows a count badge with the number of matching assets. Click a type to show only those assets, or click 'All' to see everything."
        preferSide="below"
      >
        <div className="asset-filter-bar">
          {ASSET_TYPES.map((t) => {
            const count = t === "all" ? project.assets.length : (counts[t] || 0);
            if (t !== "all" && count === 0) return null;
            return (
              <button
                key={t}
                className={`asset-filter-btn${filter === t ? " active" : ""}`}
                onClick={() => setFilter(t)}
              >
                {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                <span className="asset-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      </TutorialBubble>
      <div className="entity-list">
        {filtered.length === 0 && (
          <div className="entity-empty">
            {project.assets.length === 0
              ? "No assets yet. Import images or audio files."
              : `No ${filter} assets.`}
          </div>
        )}
        {filtered.map((a) => (
          <div key={a.id} className="entity-row asset-row">
            {a.type !== "audio" ? (
              <img src={resolveAssetUrl(project.id, a.id, a.dataUrl)} alt={a.name} className="asset-thumb" />
            ) : (
              <span className="entity-icon">🔊</span>
            )}
            <div className="entity-info">
              <span className="entity-name" title={a.name}>{a.name}</span>
              <div className="asset-meta-row">
                <select
                  className="asset-type-select"
                  value={a.type}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_ASSET",
                      assetId: a.id,
                      updates: { type: e.target.value as EditorAsset["type"] },
                    })
                  }
                >
                  {ASSET_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
                {a.width > 0 && (
                  <span className="entity-meta">{a.width}×{a.height}</span>
                )}
              </div>
            </div>
            <button
              className="btn btn-danger btn-xs"
              onClick={() => dispatch({ type: "DELETE_ASSET", assetId: a.id })}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
