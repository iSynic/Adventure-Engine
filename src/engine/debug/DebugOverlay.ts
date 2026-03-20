import type { WalkboxDefinition, Point } from "../core/types";
import type { ActorInstance } from "../world/Actor";
import type { ObjectEntity } from "../world/ObjectEntity";
import type { HotspotInstance } from "../world/Hotspot";
import type { ExitRegion } from "../world/ExitRegion";

export class DebugOverlay {
  constructor(private ctx: CanvasRenderingContext2D) {}

  drawWalkboxes(walkboxes: WalkboxDefinition[], colors: string[]): void {
    for (let i = 0; i < walkboxes.length; i++) {
      const wb = walkboxes[i];
      const color = colors[i % colors.length];
      this.ctx.save();
      this.ctx.fillStyle = color;
      this.ctx.strokeStyle = "rgba(0,255,0,0.8)";
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      if (wb.polygon.length > 0) {
        this.ctx.moveTo(wb.polygon[0].x, wb.polygon[0].y);
        for (let j = 1; j < wb.polygon.length; j++) {
          this.ctx.lineTo(wb.polygon[j].x, wb.polygon[j].y);
        }
        this.ctx.closePath();
      }
      this.ctx.fill();
      this.ctx.stroke();

      let cx = 0, cy = 0;
      for (const p of wb.polygon) { cx += p.x; cy += p.y; }
      cx /= wb.polygon.length;
      cy /= wb.polygon.length;

      this.ctx.fillStyle = "rgba(0,255,0,1)";
      this.ctx.font = "10px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(wb.id, cx, cy);
      this.ctx.restore();
    }
  }

  drawObjectBounds(objects: ObjectEntity[]): void {
    for (const obj of objects) {
      const bounds = obj.getBounds();
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(255,165,0,0.9)";
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      this.ctx.fillStyle = "rgba(255,165,0,0.9)";
      this.ctx.font = "10px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(obj.id, bounds.x + bounds.width / 2, bounds.y - 3);
      this.ctx.restore();
    }
  }

  drawActorPositions(actors: ActorInstance[]): void {
    for (const actor of actors) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0,200,255,0.9)";
      this.ctx.beginPath();
      this.ctx.arc(actor.x, actor.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "rgba(0,200,255,0.9)";
      this.ctx.font = "10px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(`${actor.id} (${actor.facing})`, actor.x, actor.y + 14);
      this.ctx.fillText(`(${Math.round(actor.x)},${Math.round(actor.y)})`, actor.x, actor.y + 24);
      this.ctx.restore();
    }
  }

  drawHotspots(hotspots: HotspotInstance[]): void {
    for (const hs of hotspots) {
      const b = hs.getBounds();
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(255,0,200,0.8)";
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 4]);
      this.ctx.strokeRect(b.x, b.y, b.width, b.height);
      this.ctx.fillStyle = "rgba(255,0,200,0.7)";
      this.ctx.font = "10px monospace";
      this.ctx.fillText(hs.name, b.x + 2, b.y + 12);
      this.ctx.restore();
    }
  }

  drawExits(exits: ExitRegion[]): void {
    for (const ex of exits) {
      const b = ex.getBounds();
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(255,255,0,0.9)";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 3]);
      this.ctx.strokeRect(b.x, b.y, b.width, b.height);
      this.ctx.fillStyle = "rgba(255,255,0,1)";
      this.ctx.font = "11px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        `→ ${ex.targetRoomId}`,
        b.x + b.width / 2,
        b.y + b.height / 2 + 4
      );
      this.ctx.restore();
    }
  }

  drawActorPaths(actors: ActorInstance[]): void {
    for (const actor of actors) {
      const waypoints = actor.getWaypoints();
      if (waypoints.length === 0) continue;

      this.ctx.save();
      this.ctx.strokeStyle = "rgba(100,255,100,0.7)";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([3, 3]);
      this.ctx.beginPath();
      this.ctx.moveTo(actor.x, actor.y);
      for (const wp of waypoints) {
        this.ctx.lineTo(wp.x, wp.y);
      }
      this.ctx.stroke();

      for (const wp of waypoints) {
        this.ctx.fillStyle = "rgba(100,255,100,0.9)";
        this.ctx.beginPath();
        this.ctx.arc(wp.x, wp.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }

      const dest = waypoints[waypoints.length - 1];
      this.ctx.strokeStyle = "rgba(100,255,100,0.9)";
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([]);
      this.ctx.beginPath();
      this.ctx.arc(dest.x, dest.y, 6, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  drawZSortAnchors(actors: ActorInstance[], objects: ObjectEntity[], roomWidth?: number): void {
    const lineEnd = roomWidth ?? this.ctx.canvas.width;
    this.ctx.save();
    this.ctx.setLineDash([2, 4]);
    this.ctx.lineWidth = 1;

    for (const actor of actors) {
      if (!actor.visible) continue;
      this.ctx.strokeStyle = "rgba(0,200,255,0.4)";
      this.ctx.beginPath();
      this.ctx.moveTo(0, actor.y);
      this.ctx.lineTo(lineEnd, actor.y);
      this.ctx.stroke();

      this.ctx.fillStyle = "rgba(0,200,255,0.6)";
      this.ctx.font = "9px monospace";
      this.ctx.textAlign = "left";
      this.ctx.fillText(`z:${Math.round(actor.y)}`, 4, actor.y - 2);
    }

    for (const obj of objects) {
      if (!obj.visible) continue;
      this.ctx.strokeStyle = "rgba(255,165,0,0.3)";
      this.ctx.beginPath();
      this.ctx.moveTo(0, obj.y);
      this.ctx.lineTo(lineEnd, obj.y);
      this.ctx.stroke();

      this.ctx.fillStyle = "rgba(255,165,0,0.5)";
      this.ctx.font = "9px monospace";
      this.ctx.textAlign = "left";
      this.ctx.fillText(`z:${Math.round(obj.y)}`, 4, obj.y - 2);
    }

    this.ctx.restore();
  }

  drawInteractionTarget(targetId: string | null, actors: ActorInstance[], objects: ObjectEntity[], hotspots: HotspotInstance[], exits: ExitRegion[]): void {
    if (!targetId) return;

    this.ctx.save();
    this.ctx.strokeStyle = "rgba(255,255,255,0.9)";
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = "rgba(255,255,255,0.8)";
    this.ctx.shadowBlur = 8;

    for (const actor of actors) {
      if (actor.id === targetId) {
        const hw = actor.getSpriteWidth() / 2;
        const hh = actor.getSpriteHeight();
        this.ctx.strokeRect(actor.x - hw - 2, actor.y - hh - 2, hw * 2 + 4, hh + 4);
        this.ctx.restore();
        return;
      }
    }

    for (const obj of objects) {
      if (obj.id === targetId) {
        const b = obj.getBounds();
        this.ctx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
        this.ctx.restore();
        return;
      }
    }

    for (const hs of hotspots) {
      if (hs.id === targetId) {
        const b = hs.getBounds();
        this.ctx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
        this.ctx.restore();
        return;
      }
    }

    for (const ex of exits) {
      if (ex.id === targetId) {
        const b = ex.getBounds();
        this.ctx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
        this.ctx.restore();
        return;
      }
    }

    this.ctx.restore();
  }

  drawHitFlashEntity(entityId: string, alpha: number, actors: ActorInstance[], objects: ObjectEntity[], hotspots: HotspotInstance[], exits: ExitRegion[]): void {
    if (alpha <= 0 || !entityId) return;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = "rgba(255,255,0,0.9)";
    this.ctx.fillStyle = "rgba(255,255,0,0.15)";
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = "rgba(255,255,0,0.8)";
    this.ctx.shadowBlur = 10;

    for (const actor of actors) {
      if (actor.id === entityId) {
        const hw = actor.getSpriteWidth() / 2;
        const hh = actor.getSpriteHeight();
        this.ctx.fillRect(actor.x - hw, actor.y - hh, hw * 2, hh);
        this.ctx.strokeRect(actor.x - hw, actor.y - hh, hw * 2, hh);
        this.ctx.restore();
        return;
      }
    }

    for (const obj of objects) {
      if (obj.id === entityId) {
        const b = obj.getBounds();
        this.ctx.fillRect(b.x, b.y, b.width, b.height);
        this.ctx.strokeRect(b.x, b.y, b.width, b.height);
        this.ctx.restore();
        return;
      }
    }

    for (const hs of hotspots) {
      if (hs.id === entityId) {
        const b = hs.getBounds();
        this.ctx.fillRect(b.x, b.y, b.width, b.height);
        this.ctx.strokeRect(b.x, b.y, b.width, b.height);
        this.ctx.restore();
        return;
      }
    }

    for (const ex of exits) {
      if (ex.id === entityId) {
        const b = ex.getBounds();
        this.ctx.fillRect(b.x, b.y, b.width, b.height);
        this.ctx.strokeRect(b.x, b.y, b.width, b.height);
        this.ctx.restore();
        return;
      }
    }

    this.ctx.restore();
  }

  drawHitFlashPoint(x: number, y: number, alpha: number): void {
    if (alpha <= 0) return;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = "rgba(255,255,0,0.6)";
    this.ctx.beginPath();
    this.ctx.arc(x, y, 12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = "rgba(255,255,0,0.9)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 12, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawPathPreview(fromX: number, fromY: number, waypoints: Point[]): void {
    if (waypoints.length === 0) return;
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(100,150,255,0.6)";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    for (const wp of waypoints) {
      this.ctx.lineTo(wp.x, wp.y);
    }
    this.ctx.stroke();

    for (const wp of waypoints) {
      this.ctx.fillStyle = "rgba(100,150,255,0.7)";
      this.ctx.beginPath();
      this.ctx.arc(wp.x, wp.y, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const dest = waypoints[waypoints.length - 1];
    this.ctx.strokeStyle = "rgba(100,150,255,0.8)";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([]);
    this.ctx.beginPath();
    this.ctx.arc(dest.x, dest.y, 5, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawText(text: string, x: number, y: number, color = "#fff"): void {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0,0,0,0.6)";
    this.ctx.fillRect(x - 2, y - 12, text.length * 7 + 4, 16);
    this.ctx.fillStyle = color;
    this.ctx.font = "12px monospace";
    this.ctx.textAlign = "left";
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }

}
