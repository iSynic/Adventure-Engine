import type { RoomEffect, RoomEffectLayer } from "../core/types";

export class EffectsRenderer {
  renderLayer(
    ctx: CanvasRenderingContext2D,
    effects: RoomEffect[],
    layer: RoomEffectLayer,
    timeSec: number
  ): void {
    for (const e of effects) {
      if (e.layer !== layer) continue;
      if (e.visible === false) continue;
      switch (e.type) {
        case "glow":    this.drawGlow(ctx, e, timeSec); break;
        case "dust":    this.drawDust(ctx, e, timeSec); break;
        case "fog":     this.drawFog(ctx, e, timeSec); break;
        case "sparkle": this.drawSparkle(ctx, e, timeSec); break;
      }
    }
  }

  private drawGlow(ctx: CanvasRenderingContext2D, e: RoomEffect, t: number): void {
    const speed     = e.speed     ?? 1;
    const intensity = e.intensity ?? 0.5;
    const seed      = e.seed      ?? 0;
    const color     = e.color     ?? "#ffee88";
    const radius    = e.width / 2;
    const cx        = e.x;
    const cy        = e.y;

    const alpha = intensity * (0.5 + 0.5 * Math.sin(t * speed + seed));

    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0,   hexToRgba(color, alpha));
    grad.addColorStop(0.5, hexToRgba(color, alpha * 0.4));
    grad.addColorStop(1,   "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  private drawDust(ctx: CanvasRenderingContext2D, e: RoomEffect, t: number): void {
    const speed     = e.speed     ?? 1;
    const intensity = e.intensity ?? 0.5;
    const seed      = e.seed      ?? 0;
    const color     = e.color     ?? "rgba(210,200,180,0.6)";
    const count     = Math.ceil(intensity * 40);

    ctx.save();
    ctx.fillStyle = color;

    for (let i = 0; i < count; i++) {
      const phase = i * 7.3 + seed;
      const px = e.x + (Math.sin(phase + t * speed * 0.6) * 0.5 + 0.5) * e.width;
      const rawY = ((i * 0.31 + t * speed * 0.08 + seed * 0.1) % 1);
      const py = e.y + rawY * e.height;
      const particleAlpha = intensity * 0.4 * (0.5 + 0.5 * Math.sin(phase + t * speed * 0.3));
      const radius = 1 + Math.sin(phase * 1.7) * 0.5;

      ctx.globalAlpha = Math.max(0, Math.min(1, particleAlpha));
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.5, radius), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawFog(ctx: CanvasRenderingContext2D, e: RoomEffect, t: number): void {
    const speed     = e.speed     ?? 1;
    const intensity = e.intensity ?? 0.5;
    const seed      = e.seed      ?? 0;
    const color     = e.color     ?? "rgba(180,200,230,0.6)";

    const baseAlpha = intensity * (0.4 + 0.3 * Math.sin(t * speed * 0.5 + seed));
    const scrollX   = (t * speed * 12) % e.width;

    ctx.save();
    ctx.beginPath();
    ctx.rect(e.x, e.y, e.width, e.height);
    ctx.clip();
    ctx.globalAlpha = Math.max(0, Math.min(1, baseAlpha));

    for (let copy = -1; copy <= 1; copy++) {
      const ox = e.x + scrollX + copy * e.width;
      const grad = ctx.createLinearGradient(ox, 0, ox + e.width, 0);
      grad.addColorStop(0,   "transparent");
      grad.addColorStop(0.4, color);
      grad.addColorStop(0.6, color);
      grad.addColorStop(1,   "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(ox, e.y, e.width, e.height);
    }

    ctx.restore();
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, e: RoomEffect, t: number): void {
    const speed     = e.speed     ?? 1;
    const intensity = e.intensity ?? 0.5;
    const seed      = e.seed      ?? 0;
    const color     = e.color     ?? "rgba(255,255,200,0.9)";
    const count     = Math.ceil(intensity * 30);

    ctx.save();
    ctx.fillStyle = color;

    for (let i = 0; i < count; i++) {
      const px = e.x + fract(Math.sin(i * 127.1 + seed) * 43758.5) * e.width;
      const py = e.y + fract(Math.sin(i * 311.7 + seed) * 31415.9) * e.height;
      const rawAlpha = Math.sin((i * 2.1 + t * speed + seed) * 3);
      const sparkleAlpha = Math.pow(Math.max(0, rawAlpha), 3);

      if (sparkleAlpha < 0.01) continue;

      ctx.globalAlpha = sparkleAlpha;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function fract(n: number): number {
  return n - Math.floor(n);
}

function hexToRgba(color: string, alpha: number): string {
  const rgbaMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},${alpha.toFixed(3)})`;
  }
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const len = hex.length;
    let r = 0, g = 0, b = 0;
    if (len === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (len >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  }
  return color;
}
