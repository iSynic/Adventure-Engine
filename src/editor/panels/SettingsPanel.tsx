import { useEditor } from "../store";
import ScriptPicker from "../components/ScriptPicker";
import TutorialBubble from "../components/TutorialBubble";
import { resolveAssetUrl } from "../utils/projectStorage";
import type { OverlayConfig, VerbBarDock, VerbBarVisibilityMode } from "../../shared/overlayConfig";
import { resolveOverlayConfig } from "../../shared/overlayConfig";
import type { DisplayConfig, ScalingMode } from "../../shared/displayConfig";
import { resolveDisplayConfig } from "../../shared/displayConfig";
import type { CursorConfig } from "../../shared/cursorConfig";
import { DEFAULT_CURSOR_CONFIG } from "../../shared/cursorConfig";

const VERB_LABELS: Record<string, string> = {
  walk: "Walk",
  look: "Look",
  open: "Open",
  close: "Close",
  pickup: "Pick Up",
  use: "Use",
  talk: "Talk To",
  push: "Push",
  pull: "Pull",
  give: "Give",
};

export default function SettingsPanel() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  if (!project) return null;

  const imageAssets = project.assets.filter(
    (a) => a.type !== "audio"
  );

  return (
    <div className="tab-panel">
      <div className="panel-header">
        <span>Project Settings</span>
      </div>
      <div className="settings-section">
        <TutorialBubble title="Verb Cursor Images" description="Assign custom cursor images for each verb. When the player selects a verb, the mouse cursor changes to the assigned image, providing visual feedback." preferSide="right">
          <h3 className="settings-title">Verb Cursor Images</h3>
        </TutorialBubble>
        <p className="settings-desc">
          Assign a cursor image to each verb. When the player selects that verb, the cursor changes to the assigned image.
        </p>
        <div className="verb-cursor-list">
          {project.verbs.map((verb) => {
            const currentAssetId = project.cursorConfig?.verbCursors?.[verb] ?? project.verbCursors?.[verb] ?? "";
            return (
              <div key={verb} className="verb-cursor-row">
                <span className="verb-cursor-label">
                  {VERB_LABELS[verb] ?? verb}
                </span>
                <select
                  className="ed-input ed-input-sm verb-cursor-select"
                  value={currentAssetId}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_VERB_CURSOR",
                      verb,
                      assetId: e.target.value || null,
                    })
                  }
                >
                  <option value="">Default cursor</option>
                  {imageAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {currentAssetId && (
                  <img
                    src={
                      (() => {
                        const a = imageAssets.find((a) => a.id === currentAssetId);
                        return a ? resolveAssetUrl(project.id, a.id, a.dataUrl) : "";
                      })()
                    }
                    alt="cursor preview"
                    className="verb-cursor-preview"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <CursorSettingsSection />

      <div className="settings-section">
        <TutorialBubble title="Global Fallback Script" description="The last-resort script when no entity-level handler matches the player's action. Runs before the built-in default text. Typically used for a generic 'I can't do that' response." preferSide="right">
          <h3 className="settings-title">Global Fallback Script</h3>
        </TutorialBubble>
        <p className="settings-desc">
          When the player performs an action and no verb handler or entity fallback handles it, this script runs before the built-in default text. Useful for a generic "I can't do that" response.
        </p>
        <ScriptPicker
          value={project.globalFallbackScriptId ?? ""}
          onChange={(s) =>
            dispatch({
              type: "UPDATE_PROJECT",
              updates: { globalFallbackScriptId: s || undefined },
            })
          }
          entityId="global"
          verb="fallback"
        />
      </div>

      <DisplaySettingsSection />
      <OverlaySettingsSection />
    </div>
  );
}

const CSS_CURSOR_KEYWORDS = [
  "default",
  "none",
  "pointer",
  "crosshair",
  "grab",
  "grabbing",
  "not-allowed",
  "wait",
  "text",
  "help",
  "move",
  "copy",
  "alias",
  "cell",
  "e-resize",
  "w-resize",
];

function CursorSettingsSection() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  if (!project) return null;

  const cc = project.cursorConfig ?? {};

  const update = (patch: Partial<CursorConfig>) => {
    dispatch({
      type: "UPDATE_PROJECT",
      updates: { cursorConfig: { ...project.cursorConfig, ...patch } },
    });
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#999", marginBottom: 2, display: "block" };

  function CursorValueInput({ field, defaultVal, label, description }: {
    field: keyof Pick<CursorConfig, "defaultCursor" | "invalidCursor" | "busyCursor" | "inventoryItemCursor">;
    defaultVal: string;
    label: string;
    description: string;
  }) {
    const value = cc[field] ?? defaultVal;
    const isKeyword = CSS_CURSOR_KEYWORDS.includes(value);
    const selectVal = isKeyword ? value : "__custom__";

    return (
      <div>
        <TutorialBubble title={label} description={description} preferSide="right">
          <label style={{ ...labelStyle, cursor: "help" }}>{label}</label>
        </TutorialBubble>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <select
            className="ed-input ed-input-sm"
            style={{ width: 140 }}
            value={selectVal}
            onChange={(e) => {
              if (e.target.value !== "__custom__") {
                update({ [field]: e.target.value });
              }
            }}
          >
            {CSS_CURSOR_KEYWORDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
            <option value="__custom__">{isKeyword ? "image asset / custom..." : value}</option>
          </select>
          <input
            className="ed-input ed-input-sm"
            type="text"
            style={{ width: 120 }}
            value={isKeyword ? "" : value}
            placeholder="image URL or CSS value"
            onChange={(e) => {
              const v = e.target.value.trim();
              update({ [field]: v || undefined });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <TutorialBubble
        title="Cursor Settings"
        description="Configure how the cursor looks in different game states. All fields accept CSS cursor keywords (e.g. 'default', 'pointer') or image asset URLs. Omit any field to use the built-in default."
        preferSide="right"
      >
        <h3 className="settings-title" style={{ cursor: "help" }}>Cursor Settings</h3>
      </TutorialBubble>
      <p className="settings-desc">
        Set the cursor appearance for different engine states. CSS keywords or image URLs are both accepted.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <CursorValueInput
          field="defaultCursor"
          defaultVal={DEFAULT_CURSOR_CONFIG.defaultCursor}
          label="Default Cursor"
          description="Shown when hovering over non-walkable space with no active target. Default: 'default'."
        />
        <CursorValueInput
          field="invalidCursor"
          defaultVal={DEFAULT_CURSOR_CONFIG.invalidCursor}
          label="Invalid Action Cursor"
          description="Shown for ~500 ms after the player attempts an impossible action. Default: 'not-allowed'."
        />
        <CursorValueInput
          field="busyCursor"
          defaultVal={DEFAULT_CURSOR_CONFIG.busyCursor}
          label="Busy Cursor"
          description="Shown while the engine is running a cutscene or blocking script. Default: 'wait'."
        />
        <CursorValueInput
          field="inventoryItemCursor"
          defaultVal={DEFAULT_CURSOR_CONFIG.inventoryItemCursor}
          label="Inventory Carry Cursor"
          description="Shown when the player has an inventory item selected for a 'use X with Y' action. Default: 'grabbing'."
        />

        <div>
          <TutorialBubble
            title="Cursor Hotspot Offsets"
            description="When a custom cursor image URL is used, these offsets (in pixels) define which point in the image acts as the click target. (0, 0) is the top-left corner. Default: 16, 16."
            preferSide="right"
          >
            <label style={{ ...labelStyle, cursor: "help" }}>Cursor Image Hotspot (px)</label>
          </TutorialBubble>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div>
              <label style={{ fontSize: 11, color: "#777" }}>X</label>
              <input
                className="ed-input ed-input-sm"
                type="number"
                min={0}
                max={128}
                style={{ width: 60, display: "block" }}
                value={cc.hotspotX ?? DEFAULT_CURSOR_CONFIG.hotspotX}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) update({ hotspotX: n });
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#777" }}>Y</label>
              <input
                className="ed-input ed-input-sm"
                type="number"
                min={0}
                max={128}
                style={{ width: 60, display: "block" }}
                value={cc.hotspotY ?? DEFAULT_CURSOR_CONFIG.hotspotY}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) update({ hotspotY: n });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverlaySettingsSection() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  if (!project) return null;

  const resolved = resolveOverlayConfig(project.overlayConfig);

  const update = (patch: Partial<OverlayConfig>) => {
    dispatch({
      type: "UPDATE_PROJECT",
      updates: { overlayConfig: { ...project.overlayConfig, ...patch } },
    });
  };

  return (
    <div className="settings-section">
      <TutorialBubble title="Overlay / HUD" description="Controls which UI elements appear during gameplay — the verb bar, inventory strip, message area, and save/load buttons. Hiding an element removes it from the in-game interface." preferSide="right">
        <h3 className="settings-title">Overlay / HUD</h3>
      </TutorialBubble>
      <p className="settings-desc">
        Configure the in-game overlay bars (verb bar, inventory, message area, save/load buttons).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={resolved.verbBar.visible}
            onChange={(e) =>
              update({ verbBar: { ...project.overlayConfig?.verbBar, visible: e.target.checked } })
            }
          />
          Show Verb Bar
        </label>

        <div style={{ marginLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <TutorialBubble
              title="Verb Bar Dock"
              description="Which edge of the game display the verb bar attaches to. Top/Bottom span the full width; Left/Right span the full height."
              preferSide="right"
            >
              <label style={{ fontSize: 12, color: "#999", marginBottom: 2, display: "block", cursor: "help" }}>
                Verb Bar Dock
              </label>
            </TutorialBubble>
            <select
              className="ed-input ed-input-sm"
              value={resolved.verbBar.dock}
              onChange={(e) =>
                update({ verbBar: { ...project.overlayConfig?.verbBar, dock: e.target.value as VerbBarDock } })
              }
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div>
            <TutorialBubble
              title="Verb Bar Size"
              description="Thickness of the verb bar in pixels. For top/bottom docks this sets the height; for left/right it sets the width."
              preferSide="right"
            >
              <label style={{ fontSize: 12, color: "#999", marginBottom: 2, display: "block", cursor: "help" }}>
                Verb Bar Size (px)
              </label>
            </TutorialBubble>
            <input
              type="number"
              className="ed-input ed-input-sm"
              style={{ width: 80 }}
              min={20}
              max={200}
              value={resolved.verbBar.size}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 20 && v <= 200) {
                  update({ verbBar: { ...project.overlayConfig?.verbBar, size: v } });
                }
              }}
            />
          </div>

          <div>
            <TutorialBubble
              title="Verb Bar Visibility"
              description='Controls how the verb bar appears. "Always" keeps it permanently visible. "Hover" hides it until the mouse approaches the dock edge. "Collapsed" shows a thin strip that expands on hover.'
              preferSide="right"
            >
              <label style={{ fontSize: 12, color: "#999", marginBottom: 2, display: "block", cursor: "help" }}>
                Verb Bar Visibility
              </label>
            </TutorialBubble>
            <select
              className="ed-input ed-input-sm"
              value={resolved.verbBar.visibilityMode}
              onChange={(e) =>
                update({ verbBar: { ...project.overlayConfig?.verbBar, visibilityMode: e.target.value as VerbBarVisibilityMode } })
              }
            >
              <option value="always">Always visible</option>
              <option value="hover">Show on hover</option>
              <option value="collapsed">Collapsed strip</option>
            </select>
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={resolved.inventoryBar.visible}
            onChange={(e) =>
              update({ inventoryBar: { ...project.overlayConfig?.inventoryBar, visible: e.target.checked } })
            }
          />
          Show Inventory Bar
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={resolved.messageBar.visible}
            onChange={(e) =>
              update({ messageBar: { ...project.overlayConfig?.messageBar, visible: e.target.checked } })
            }
          />
          Show Message Bar
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={resolved.saveLoadBar.visible}
            onChange={(e) =>
              update({ saveLoadBar: { visible: e.target.checked } })
            }
          />
          Show Save/Load Buttons
        </label>

        <div style={{ marginTop: 4 }}>
          <TutorialBubble
            title="Message Bar Placement"
            description="Where the message strip appears on screen. Bottom is the classic adventure-game layout. Top can work better with full-width HUD designs."
            preferSide="right"
          >
            <label style={{ fontSize: 12, color: "#999", marginBottom: 2, display: "block", cursor: "help" }}>
              Message Bar Placement
            </label>
          </TutorialBubble>
          <select
            className="ed-input ed-input-sm"
            value={resolved.messageBar.placement}
            onChange={(e) =>
              update({ messageBar: { ...project.overlayConfig?.messageBar, placement: e.target.value as "top" | "bottom" } })
            }
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
          </select>
        </div>

        <div>
          <TutorialBubble
            title="Inventory Label"
            description='Text shown before the inventory item strip, e.g. "Items:" or "Inventory". Check "Hide" to remove the label entirely for a cleaner layout.'
            preferSide="right"
          >
            <label style={{ fontSize: 12, color: "#999", marginBottom: 2, display: "block", cursor: "help" }}>
              Inventory Label
            </label>
          </TutorialBubble>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              className="ed-input ed-input-sm"
              style={{ width: 120 }}
              value={resolved.inventoryBar.labelText}
              onChange={(e) =>
                update({ inventoryBar: { ...project.overlayConfig?.inventoryBar, labelText: e.target.value } })
              }
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#999" }}>
              <input
                type="checkbox"
                checked={resolved.inventoryBar.hideLabel}
                onChange={(e) =>
                  update({ inventoryBar: { ...project.overlayConfig?.inventoryBar, hideLabel: e.target.checked } })
                }
              />
              Hide label
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DisplaySettingsSection ───────────────────────────────────────────────────

function DisplaySettingsSection() {
  const { state, dispatch } = useEditor();
  const project = state.currentProject;
  if (!project) return null;

  const resolved = resolveDisplayConfig(project.display);

  const update = (patch: Partial<DisplayConfig>) => {
    dispatch({
      type: "UPDATE_PROJECT",
      updates: { display: { ...project.display, ...patch } },
    });
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#999", marginBottom: 2, display: "block" };
  const rowStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "flex-end" };

  return (
    <div className="settings-section">
      <TutorialBubble
        title="Display / Viewport"
        description="Sets the game's native canvas resolution and how it scales to fill the player's screen. These values apply globally — individual room dimensions can be larger than the viewport (for scrolling rooms)."
        preferSide="right"
      >
        <h3 className="settings-title" style={{ cursor: "help" }}>Display Settings</h3>
      </TutorialBubble>
      <p className="settings-desc">
        Native canvas size and scaling behaviour for the exported game.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {/* Base resolution */}
        <div>
          <TutorialBubble
            title="Base Resolution"
            description="The internal canvas size in pixels. All room art should be designed for this resolution. The engine scales this up or down to fill the player's screen based on the Scaling Mode."
            tip="640×360 (16:9) or 320×200 (classic 16:10) are common adventure-game choices."
            preferSide="right"
          >
            <label style={{ ...labelStyle, cursor: "help" }}>Base Resolution (px)</label>
          </TutorialBubble>
          <div style={rowStyle}>
            <div>
              <label style={{ fontSize: 11, color: "#777" }}>Width</label>
              <input
                className="ed-input ed-input-sm"
                type="number"
                min={160}
                max={3840}
                step={8}
                value={resolved.baseWidth}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) update({ baseWidth: n });
                }}
                style={{ width: 72, display: "block" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#777" }}>Height</label>
              <input
                className="ed-input ed-input-sm"
                type="number"
                min={90}
                max={2160}
                step={8}
                value={resolved.baseHeight}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) update({ baseHeight: n });
                }}
                style={{ width: 72, display: "block" }}
              />
            </div>
          </div>
        </div>

        {/* Scaling mode */}
        <div>
          <TutorialBubble
            title="Scaling Mode"
            description={
              "Controls how the canvas grows to fit the player's screen.\n" +
              "• Integer — scales by whole numbers only (no blur, retro look).\n" +
              "• Fit — scales as large as possible while maintaining aspect ratio.\n" +
              "• Stretch — fills the screen exactly, ignoring aspect ratio.\n" +
              "• None — renders at the base resolution with no scaling."
            }
            preferSide="right"
          >
            <label style={{ ...labelStyle, cursor: "help" }}>Scaling Mode</label>
          </TutorialBubble>
          <select
            className="ed-input ed-input-sm"
            value={resolved.scalingMode}
            onChange={(e) => update({ scalingMode: e.target.value as ScalingMode })}
          >
            <option value="integer">Integer (pixel-perfect steps)</option>
            <option value="fit">Fit (letterboxed)</option>
            <option value="stretch">Stretch (fills screen)</option>
            <option value="none">None (no scaling)</option>
          </select>
        </div>

        {/* Pixel-perfect */}
        <TutorialBubble
          title="Pixel-Perfect Rendering"
          description="Renders the canvas with image-rendering: pixelated so pixel art stays crisp. Turn off for smooth scaling of photography or hand-drawn art."
          preferSide="right"
        >
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "help" }}>
            <input
              type="checkbox"
              checked={resolved.pixelPerfect}
              onChange={(e) => update({ pixelPerfect: e.target.checked })}
            />
            Pixel-perfect rendering
          </label>
        </TutorialBubble>

        {/* Background colour */}
        <div>
          <TutorialBubble
            title="Letterbox Color"
            description="The colour shown in the empty bars around the canvas when the aspect ratio doesn't fill the screen exactly (e.g. Integer or Fit mode)."
            preferSide="right"
          >
            <label style={{ ...labelStyle, cursor: "help" }}>Letterbox Color</label>
          </TutorialBubble>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="color"
              value={resolved.backgroundColor}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              style={{ width: 36, height: 28, padding: 2, border: "1px solid #444", borderRadius: 4, background: "none", cursor: "pointer" }}
            />
            <input
              className="ed-input ed-input-sm"
              type="text"
              value={resolved.backgroundColor}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              style={{ width: 80 }}
              placeholder="#000000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
