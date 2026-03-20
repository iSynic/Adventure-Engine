import type { AssetLoader } from "../assets/AssetLoader";
import type { RoomManager } from "../world/RoomManager";
import type { Camera } from "./Camera";
import type { UIManager } from "../ui/UIManager";
import type { InventorySystem } from "../inventory/InventorySystem";
import type { Registry } from "../core/Registry";
import { DebugOverlay } from "../debug/DebugOverlay";
import { EffectsRenderer } from "./EffectsRenderer";
import type { ActorInstance } from "../world/Actor";
import type { ObjectEntity } from "../world/ObjectEntity";
import type { RoomSceneProp } from "../core/types";

const WALKBOX_COLORS = [
  "rgba(0,200,100,0.25)",
  "rgba(0,100,200,0.25)",
  "rgba(200,0,100,0.25)",
];

function hexToRgbaRenderer(color: string, alpha: number): string {
  const rgbaMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (rgbaMatch) return `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},${alpha.toFixed(3)})`;
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const len = hex.length;
    let r = 0, g = 0, b = 0;
    if (len === 3) {
      r = parseInt(hex[0] + hex[0], 16); g = parseInt(hex[1] + hex[1], 16); b = parseInt(hex[2] + hex[2], 16);
    } else if (len >= 6) {
      r = parseInt(hex.slice(0, 2), 16); g = parseInt(hex.slice(2, 4), 16); b = parseInt(hex.slice(4, 6), 16);
    }
    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  }
  return color;
}

// ─── Renderer ────────────────────────────────────────────────────────────────
// Owns the full canvas draw cycle: background layers → y-sorted world entities
// → foreground mask → speech bubble → debug overlay → fade overlay.
export class Renderer {
  private debugOverlay: DebugOverlay;
  private effectsRenderer = new EffectsRenderer();
  fadeAlpha = 0;
  pixelPerfect: boolean;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private assetLoader: AssetLoader,
    private camera: Camera,
    private registry: Registry,
    pixelPerfect = true
  ) {
    this.pixelPerfect = pixelPerfect;
    this.debugOverlay = new DebugOverlay(ctx);
  }

  render(
    roomManager: RoomManager,
    ui: UIManager,
    inventory: InventorySystem,
    playerId: string,
    debugMode: boolean,
    pathPreview?: { fromX: number; fromY: number; waypoints: import("../core/types").Point[] }
  ): void {
    const canvas = this.ctx.canvas;
    this.ctx.imageSmoothingEnabled = !this.pixelPerfect;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    const room = roomManager.getCurrentRoom();
    if (!room) return;

    if (room.parallaxLayers) {
      for (const layer of room.parallaxLayers) {
        this.drawParallaxLayer(layer.imagePath, layer.scrollFactor, room.width, room.height);
      }
    }

    const timeSec = performance.now() / 1000;

    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);

    this.drawBackground(room.backgroundPath, room.width, room.height);
    this.effectsRenderer.renderLayer(this.ctx, room.effects ?? [], "background", timeSec);

    const actors = roomManager.getAllActors();
    const objects = roomManager.getAllObjects();

    type Renderable = { ySort: number; zLayer: number; draw: () => void };
    const renderables: Renderable[] = [];

    const zLayerOrder = (layer?: "behind" | "normal" | "front"): number => {
      if (layer === "behind") return 0;
      if (layer === "front") return 2;
      return 1;
    };

    for (const obj of objects) {
      if (!obj.visible) continue;
      const y = obj.y + (obj.definition.zOffset ?? 0);
      renderables.push({ ySort: y, zLayer: zLayerOrder(obj.definition.zLayer), draw: () => this.drawObject(obj) });
    }

    for (const actor of actors) {
      if (!actor.visible) continue;
      renderables.push({ ySort: actor.y, zLayer: 1, draw: () => this.drawActor(actor) });
    }

    for (const prop of room.sceneProps ?? []) {
      if (prop.visible === false) continue;
      const ySort = prop.y + (prop.zOffset ?? 0);
      renderables.push({ ySort, zLayer: zLayerOrder(prop.zLayer), draw: () => this.drawSceneProp(prop, timeSec) });
    }

    renderables.sort((a, b) => a.zLayer - b.zLayer || a.ySort - b.ySort);
    for (const r of renderables) r.draw();

    if (room.maskPath) {
      this.drawForegroundMask(room.maskPath);
    }
    this.effectsRenderer.renderLayer(this.ctx, room.effects ?? [], "foreground", timeSec);

    const uiState = ui.getState();
    if (uiState.speechBubble) {
      const elapsed = uiState.bubbleShownAt > 0
        ? (performance.now() - uiState.bubbleShownAt)
        : 0;
      const showHint = uiState.skippable && elapsed > 800;
      this.drawSpeechBubble(uiState.speechBubble.text, uiState.speechBubble.x, uiState.speechBubble.y, showHint);
    }

    if (debugMode) {
      const flags = ui.getOverlayFlags();
      const hotspots = roomManager.getAllHotspots();
      const exits = roomManager.getAllExits();
      if (flags.walkboxes) this.debugOverlay.drawWalkboxes(room.walkboxes, WALKBOX_COLORS);
      if (flags.objects) this.debugOverlay.drawObjectBounds(objects);
      if (flags.actors) this.debugOverlay.drawActorPositions(actors);
      if (flags.hotspots) this.debugOverlay.drawHotspots(hotspots);
      if (flags.exits) this.debugOverlay.drawExits(exits);
      if (flags.paths) {
        this.debugOverlay.drawActorPaths(actors);
        if (pathPreview && pathPreview.waypoints.length > 0) {
          this.debugOverlay.drawPathPreview(pathPreview.fromX, pathPreview.fromY, pathPreview.waypoints);
        }
      }
      if (flags.zSort) this.debugOverlay.drawZSortAnchors(actors, objects, room.width);
      const uiState = ui.getState();
      if (flags.interactionTarget && uiState.debugInteractionTarget) {
        this.debugOverlay.drawInteractionTarget(uiState.debugInteractionTarget, actors, objects, hotspots, exits);
      }
      if (flags.hitResult && uiState.debugHitFlash) {
        const elapsed = performance.now() - uiState.debugHitFlash.startTime;
        const duration = 400;
        if (elapsed < duration) {
          const alpha = 1 - elapsed / duration;
          if (uiState.debugHitFlash.entityId) {
            this.debugOverlay.drawHitFlashEntity(uiState.debugHitFlash.entityId, alpha, actors, objects, hotspots, exits);
          } else {
            this.debugOverlay.drawHitFlashPoint(uiState.debugHitFlash.x, uiState.debugHitFlash.y, alpha);
          }
        }
      }
    }

    this.ctx.restore();

    if (this.fadeAlpha > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = this.fadeAlpha;
      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.ctx.globalAlpha = 1;
      this.ctx.restore();
    }
  }

  // ─── Parallax layers ─────────────────────────────────────────────────────
  private drawParallaxLayer(path: string, scrollFactor: number, roomWidth: number, roomHeight: number): void {
    if (!path) return;
    const viewW = this.ctx.canvas.width;
    const viewH = this.ctx.canvas.height;
    const offsetX = this.camera.x * scrollFactor;
    const offsetY = this.camera.y * scrollFactor;

    this.ctx.save();

    if (path === "__generated_sky__") {
      const skyW = roomWidth;
      const startSkyX = -(offsetX % skyW);
      const adjustedSkyStart = startSkyX > 0 ? startSkyX - skyW : startSkyX;
      for (let x = adjustedSkyStart; x < viewW; x += skyW) {
        this.ctx.save();
        this.ctx.translate(x, -offsetY);
        this.drawGeneratedSkyLayer(skyW, viewH);
        this.ctx.restore();
      }
    } else {
      const img = this.assetLoader.getCachedImage(path);
      if (img && img.width > 1) {
        const imgW = img.width;
        const imgH = img.height;
        const scaleY = viewH / imgH;
        const scaledW = imgW * scaleY;

        const startX = -(offsetX % scaledW);
        const adjustedStart = startX > 0 ? startX - scaledW : startX;

        for (let x = adjustedStart; x < viewW; x += scaledW) {
          this.ctx.drawImage(img.element, x, 0, scaledW, viewH);
        }
      }
    }

    this.ctx.restore();
  }

  private drawGeneratedSkyLayer(w: number, h: number): void {
    const ctx = this.ctx;
    const skyH = Math.floor(h * 0.6);
    const sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0, "#2a4488");
    sky.addColorStop(0.5, "#5588cc");
    sky.addColorStop(1, "#aaccee");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, skyH);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    const clouds = [
      { x: 80, y: 40, rx: 50, ry: 18 },
      { x: 350, y: 60, rx: 70, ry: 22 },
      { x: 600, y: 30, rx: 40, ry: 14 },
      { x: 900, y: 50, rx: 60, ry: 20 },
      { x: 1200, y: 35, rx: 55, ry: 16 },
      { x: 1450, y: 55, rx: 45, ry: 18 },
    ];
    for (const c of clouds) {
      if (c.x > w) continue;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x + c.rx * 0.6, c.y - c.ry * 0.3, c.rx * 0.7, c.ry * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Background ──────────────────────────────────────────────────────────
  private drawBackground(path: string, roomWidth: number, roomHeight: number): void {
    const img = this.assetLoader.getCachedImage(path);
    if (img && img.width > 1) {
      this.ctx.drawImage(img.element, 0, 0, roomWidth, roomHeight);
    } else {
      this.drawGeneratedBackground(path, roomWidth, roomHeight);
    }
  }

  private drawGeneratedBackground(path: string, roomWidth: number, roomHeight: number): void {
    const ctx = this.ctx;
    const W = roomWidth, H = roomHeight;
    const isBack = path.includes("around");

    if (isBack) {
      // Around house generated background
      const sky = ctx.createLinearGradient(0, 0, 0, 190);
      sky.addColorStop(0, "#4477aa");
      sky.addColorStop(1, "#88aacc");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      const ground = ctx.createLinearGradient(0, 175, 0, H);
      ground.addColorStop(0, "#5a8a3a");
      ground.addColorStop(1, "#2a5a1a");
      ctx.fillStyle = ground;
      ctx.fillRect(0, 175, W, H - 175);
      ctx.fillStyle = "#b89858";
      ctx.fillRect(0, 238, W, 28);
      ctx.fillStyle = "#e4e0d0";
      ctx.fillRect(120, 18, 550, 175);
      ctx.strokeStyle = "#bab6a4";
      ctx.lineWidth = 2;
      ctx.strokeRect(120, 18, 550, 175);
      ctx.fillStyle = "#6a4822";
      ctx.fillRect(100, 12, 590, 16);
      ctx.fillStyle = "#887060";
      ctx.fillRect(590, 0, 35, 38);
      for (const wx of [185, 355, 520]) {
        ctx.fillStyle = "#7a9db8";
        ctx.fillRect(wx, 48, 60, 50);
        ctx.strokeStyle = "#667788";
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, 48, 60, 50);
        ctx.beginPath();
        ctx.moveTo(wx + 30, 48); ctx.lineTo(wx + 30, 98);
        ctx.moveTo(wx, 73); ctx.lineTo(wx + 60, 73);
        ctx.stroke();
      }
      ctx.fillStyle = "#3a2810";
      ctx.fillRect(28, 270, 200, 80);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#226622" : "#448844";
        ctx.beginPath();
        ctx.arc(50 + i * 22, 288, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#7a5810";
      ctx.fillRect(555, 244, 68, 52);
      ctx.fillStyle = "#9a7020";
      ctx.fillRect(555, 244, 68, 14);
      ctx.strokeStyle = "#b0a060";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(112, 342, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(118, 342); ctx.lineTo(140, 342);
      ctx.moveTo(136, 338); ctx.lineTo(136, 346);
      ctx.moveTo(129, 338); ctx.lineTo(129, 346);
      ctx.stroke();

      // Placeholder art extension for rooms wider than 800 px (W comes from the
      // room's own width field, not a viewport assumption). This block fills the
      // region beyond the first 800 columns with demo-quality trees and a path so
      // the editor shows something visible in wide rooms that lack a real background.
      if (W > 800) {
        for (let tx = 850; tx < W - 50; tx += 120) {
          ctx.fillStyle = "#1a4a1a";
          ctx.beginPath();
          ctx.moveTo(tx, 100); ctx.lineTo(tx + 40, 240); ctx.lineTo(tx - 40, 240);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#2d6a2d";
          ctx.beginPath();
          ctx.moveTo(tx, 130); ctx.lineTo(tx + 32, 230); ctx.lineTo(tx - 32, 230);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = "#b89858";
        ctx.fillRect(800, 238, W - 800, 28);
        ctx.fillStyle = "#5a7a3a";
        ctx.fillRect(900, 270, 200, 80);
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = i % 2 === 0 ? "#226622" : "#448844";
          ctx.beginPath();
          ctx.arc(910 + i * 20, 288, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#6a6a6a";
        ctx.fillRect(1200, 200, 60, 60);
        ctx.fillStyle = "#888";
        ctx.fillRect(1200, 195, 60, 10);
      }
    } else {
      // Generic outdoor fallback background
      const sky = ctx.createLinearGradient(0, 0, 0, 240);
      sky.addColorStop(0, "#5588cc");
      sky.addColorStop(1, "#aaccee");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      const ground = ctx.createLinearGradient(0, 220, 0, H);
      ground.addColorStop(0, "#6a9a4a");
      ground.addColorStop(1, "#3a6a2a");
      ctx.fillStyle = ground;
      ctx.fillRect(0, 220, W, H - 220);
      ctx.fillStyle = "#c4a870";
      ctx.beginPath();
      ctx.moveTo(50, H); ctx.lineTo(200, 270);
      ctx.lineTo(760, 270); ctx.lineTo(760, H);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const tx = i * 50;
        ctx.fillStyle = "#1a4a1a";
        ctx.beginPath();
        ctx.moveTo(tx + 30, 40); ctx.lineTo(tx + 80, 230); ctx.lineTo(tx - 20, 230);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#2d6a2d";
        ctx.beginPath();
        ctx.moveTo(tx + 30, 70); ctx.lineTo(tx + 72, 215); ctx.lineTo(tx - 12, 215);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#f0ece0";
      ctx.fillRect(300, 65, 340, 210);
      ctx.strokeStyle = "#c0bca8";
      ctx.lineWidth = 2;
      ctx.strokeRect(300, 65, 340, 210);
      ctx.fillStyle = "#7a4e28";
      ctx.beginPath();
      ctx.moveTo(275, 65); ctx.lineTo(470, 5); ctx.lineTo(665, 65);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#9a7060";
      ctx.fillRect(600, 15, 32, 55);
      for (const wx of [325, 540]) {
        ctx.fillStyle = "#88aabb";
        ctx.fillRect(wx, 90, 55, 48);
        ctx.strokeStyle = "#8a8a7a";
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, 90, 55, 48);
        ctx.beginPath();
        ctx.moveTo(wx + 27, 90); ctx.lineTo(wx + 27, 138);
        ctx.moveTo(wx, 114); ctx.lineTo(wx + 55, 114);
        ctx.stroke();
      }
      ctx.fillStyle = "#6a5020";
      ctx.fillRect(430, 160, 60, 115);
      ctx.strokeStyle = "#4a3810";
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(430, 163 + i * 22); ctx.lineTo(490, 163 + i * 22);
        ctx.stroke();
      }
      ctx.fillStyle = "#888";
      ctx.fillRect(500, 230, 6, 42);
      ctx.fillStyle = "#777";
      ctx.fillRect(486, 210, 38, 24);
      ctx.fillStyle = "#aaa";
      ctx.beginPath();
      ctx.arc(524, 222, 12, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.fillStyle = "#aa9060";
      ctx.fillRect(0, 360, W, 40);
      ctx.strokeStyle = "#998050";
      ctx.setLineDash([18, 14]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 380); ctx.lineTo(W, 380);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ─── Foreground mask ─────────────────────────────────────────────────────
  private drawForegroundMask(path: string): void {
    const img = this.assetLoader.getCachedImage(path);
    if (img) {
      this.ctx.drawImage(img.element, 0, 0);
    }
  }

  // ─── Actors ──────────────────────────────────────────────────────────────
  private drawActorSprite(
    actor: ActorInstance,
    img: { element: HTMLImageElement; width: number },
    sw: number,
    sh: number,
    flip: boolean
  ): void {
    this.ctx.save();
    this.ctx.globalAlpha = actor.visible ? 1 : 0.5;
    if (flip) {
      this.ctx.translate(actor.x, 0);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(img.element, -sw / 2, actor.y - sh, sw, sh);
    } else {
      this.ctx.drawImage(img.element, actor.x - sw / 2, actor.y - sh, sw, sh);
    }
    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  private drawActor(actor: ActorInstance): void {
    const w = actor.getSpriteWidth();
    const h = actor.getSpriteHeight();

    const framePath = actor.getCurrentFrameImagePath();
    const flip = actor.shouldFlipHorizontally();

    if (framePath) {
      const img = this.assetLoader.getCachedImage(framePath);
      if (img && img.width > 1) {
        const scale = actor.scale;
        this.drawActorSprite(actor, img, w * scale, h * scale, flip);
        return;
      }
    }

    const spritePath = actor.getSpritePath();
    if (spritePath) {
      const img = this.assetLoader.getCachedImage(spritePath);
      if (img) {
        const scale = actor.scale;
        this.drawActorSprite(actor, img, w * scale, h * scale, flip);
        return;
      }
    }

    this.drawActorPlaceholder(actor, w, h);
  }

  private drawActorPlaceholder(actor: ActorInstance, w: number, h: number): void {
    const isWalking = actor.animationState === "walk";
    const frame = Math.floor(actor.currentFrame % 4);

    this.ctx.save();
    this.ctx.fillStyle = actor.definition.isPlayer ? "#4a9eff" : "#ff9a4a";

    const px = actor.x - w / 2;
    const py = actor.y - h;

    this.ctx.fillRect(px + 8, py, w - 16, h - 12);

    const headSize = 16;
    this.ctx.beginPath();
    this.ctx.arc(actor.x, py - headSize / 2 + 4, headSize / 2, 0, Math.PI * 2);
    this.ctx.fill();

    if (isWalking) {
      const legOffset = frame < 2 ? 4 : -4;
      this.ctx.fillStyle = "#333";
      this.ctx.fillRect(px + 4, actor.y - 12, 8, 12 + legOffset);
      this.ctx.fillRect(px + w - 12, actor.y - 12, 8, 12 - legOffset);
    }

    this.ctx.fillStyle = "#fff";
    this.ctx.font = "10px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(actor.definition.name.substring(0, 6), actor.x, py - headSize);

    this.ctx.restore();
  }

  // ─── Objects ─────────────────────────────────────────────────────────────
  private drawObject(obj: ObjectEntity): void {
    const spritePath = obj.getActiveSpritePath();
    if (spritePath) {
      const img = this.assetLoader.getCachedImage(spritePath);
      if (img) {
        const stateSprite = obj.getActiveStateSprite();
        const fps = stateSprite?.fps;
        const frameCount = stateSprite?.frameCount;
        const w = obj.getSpriteWidth();
        const h = obj.getSpriteHeight();
        this.ctx.save();
        this.ctx.globalAlpha = obj.visible ? 1 : 0;

        const atlasRect = stateSprite?.atlasRect;
        if (atlasRect) {
          this.ctx.drawImage(img.element, atlasRect.x, atlasRect.y, atlasRect.width, atlasRect.height, obj.x - w / 2, obj.y - h, w, h);
        } else if (fps && frameCount && frameCount > 1) {
          const frameIndex = Math.floor((performance.now() / 1000) * fps) % frameCount;
          const frameW = img.element.naturalWidth / frameCount;
          const sx = frameIndex * frameW;
          this.ctx.drawImage(img.element, sx, 0, frameW, img.element.naturalHeight, obj.x - w / 2, obj.y - h, w, h);
        } else {
          this.ctx.drawImage(img.element, obj.x - w / 2, obj.y - h, w, h);
        }

        this.ctx.globalAlpha = 1;
        this.ctx.restore();
        return;
      }
    }

    this.drawObjectPlaceholder(obj);
  }

  // ─── Scene props (lights, decals, plaques) ────────────────────────────────
  private drawSceneProp(prop: RoomSceneProp, timeSec: number): void {
    switch (prop.kind) {
      case "light":  this.drawPropLight(prop, timeSec); break;
      case "decal":  this.drawPropDecal(prop, timeSec); break;
      case "plaque": this.drawPropPlaque(prop); break;
    }
  }

  private drawPropLight(prop: RoomSceneProp, timeSec: number): void {
    const radius    = prop.radius    ?? 60;
    const color     = prop.color     ?? "#ffee88";
    const intensity = prop.intensity ?? 0.6;
    const pulseSpeed = prop.pulseSpeed ?? 1.5;
    const alpha = pulseSpeed === 0
      ? intensity
      : intensity * (0.5 + 0.5 * Math.sin(timeSec * pulseSpeed * Math.PI * 2));

    this.ctx.save();
    const grad = this.ctx.createRadialGradient(prop.x, prop.y, 0, prop.x, prop.y, radius);
    grad.addColorStop(0,   hexToRgbaRenderer(color, Math.min(1, alpha)));
    grad.addColorStop(0.5, hexToRgbaRenderer(color, Math.min(1, alpha * 0.4)));
    grad.addColorStop(1,   "transparent");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(prop.x - radius, prop.y - radius, radius * 2, radius * 2);
    this.ctx.restore();
  }

  private drawPropDecal(prop: RoomSceneProp, timeSec: number): void {
    if (!prop.assetPath) return;
    const img = this.assetLoader.getCachedImage(prop.assetPath);
    if (!img) return;

    const el         = img.element;
    const frameCount = prop.frameCount ?? 1;
    const fps        = prop.fps        ?? 8;
    const frameIndex = frameCount > 1 ? Math.floor(timeSec * fps) % frameCount : 0;
    const frameW     = el.naturalWidth / frameCount;
    const frameH     = el.naturalHeight;
    const drawW      = prop.width  ?? frameW;
    const drawH      = prop.height ?? frameH;
    const sx         = frameIndex * frameW;

    this.ctx.save();
    this.ctx.drawImage(el, sx, 0, frameW, frameH, prop.x - drawW / 2, prop.y - drawH / 2, drawW, drawH);
    this.ctx.restore();
  }

  private drawPropPlaque(prop: RoomSceneProp): void {
    const text       = prop.text       ?? "";
    const font       = prop.font       ?? "14px monospace";
    const textColor  = prop.textColor  ?? "#f0e8c8";
    const background = prop.background ?? "rgba(0,0,0,0.55)";
    const padding    = prop.padding    ?? 6;

    this.ctx.save();
    this.ctx.font = font;
    const measured  = this.ctx.measureText(text);
    const textW     = measured.width;
    const textH     = 14;
    const boxW      = textW + padding * 2;
    const boxH      = textH + padding * 2;
    const boxX      = prop.x - boxW / 2;
    const boxY      = prop.y - boxH / 2;

    this.ctx.fillStyle = background;
    this.ctx.fillRect(boxX, boxY, boxW, boxH);
    this.ctx.fillStyle = textColor;
    this.ctx.fillText(text, boxX + padding, boxY + padding + textH - 2);
    this.ctx.restore();
  }

  // ─── UI overlay: speech bubble ────────────────────────────────────────────
  private drawSpeechBubble(text: string, x: number, y: number, showContinueHint = false): void {
    const ctx = this.ctx;
    const maxWidth = 280;
    const padding = 10;
    const fontSize = 13;
    const lineHeight = 16;
    const tailHeight = 10;
    const hintHeight = showContinueHint ? 14 : 0;

    ctx.save();
    ctx.font = `${fontSize}px monospace`;

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth - padding * 2) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const textWidth = Math.min(
      maxWidth,
      Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2
    );
    const textHeight = lines.length * lineHeight + padding * 2 + hintHeight;

    const bubbleX = x - textWidth / 2;
    const bubbleY = y - 80 - textHeight;

    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.strokeStyle = "#88aaff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    const r = 6;
    const bx = bubbleX;
    const by = bubbleY;
    const bw = textWidth;
    const bh = textHeight;
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(x + 8, by + bh);
    ctx.lineTo(x, by + bh + tailHeight);
    ctx.lineTo(x - 8, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffcc";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, bubbleY + padding + i * lineHeight);
    }

    if (showContinueHint) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 400);
      ctx.globalAlpha = 0.5 + 0.3 * pulse;
      ctx.font = "10px monospace";
      ctx.fillStyle = "#aabbdd";
      ctx.fillText(
        "click to continue \u25BC",
        x,
        bubbleY + padding + lines.length * lineHeight + 4
      );
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private drawObjectPlaceholder(obj: ObjectEntity): void {
    const bounds = obj.getBounds();
    this.ctx.save();
    this.ctx.fillStyle = "#a0522d";
    this.ctx.strokeStyle = "#654321";
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "11px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      obj.definition.name.substring(0, 10),
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2 + 4
    );
    this.ctx.restore();
  }
}
