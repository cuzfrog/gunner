import * as v from "../math/vec2.js";
import type { EngagementFrame, HitChanceBreakdown, ShipState, TurretSpec } from "../sim/types.js";

const COLORS = {
  bg: "#05080c",
  grid: "rgba(92, 203, 203, 0.08)",
  attacker: "#5ccbcb",
  target: "#f67c0f",
  transversal: "#fce447",
  los: "rgba(92, 203, 203, 0.5)",
  text: "#e8eef0",
  optimalRing: "#9cc954",
  falloffRing: "#f67c0f",
};

const VECTOR_SCALE = 0.5; // seconds of travel shown as an arrow

export interface Camera {
  center: v.Vec2;
  scale: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera = { center: v.vec(0, 0), scale: 1 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
  }

  draw(
    snapshot: { time: number; attacker: ShipState; target: ShipState },
    frame: EngagementFrame,
    hit: HitChanceBreakdown,
    turret: TurretSpec,
  ) {
    this.updateCamera(snapshot, turret);
    this.clear();
    this.drawGrid();
    this.drawRangeRings(snapshot.attacker.position, turret);
    this.drawLineOfSight(snapshot.attacker.position, snapshot.target.position, frame.distance);
    this.drawVelocityVector(snapshot.attacker, COLORS.attacker);
    this.drawVelocityVector(snapshot.target, COLORS.target);
    this.drawTransversalVector(snapshot.target.position, frame.transversalVelocity);
    this.drawShip(snapshot.attacker, COLORS.attacker, true);
    this.drawShip(snapshot.target, COLORS.target, false);
    this.drawReadouts(frame, hit, turret);
  }

  private updateCamera(snapshot: { attacker: ShipState; target: ShipState }, turret: TurretSpec) {
    const { attacker, target } = snapshot;
    const center = v.scale(v.add(attacker.position, target.position), 0.5);
    const dist = v.dist(attacker.position, target.position);
    const viewRadius = Math.max(dist, turret.optimal + turret.falloff, attacker.desiredRange, target.desiredRange, 500) * 1.25;
    const scale = Math.min(this.canvas.width, this.canvas.height) / (2 * viewRadius);
    this.camera = { center, scale };
  }

  private worldToScreen(p: v.Vec2): v.Vec2 {
    return v.vec(
      this.canvas.width / 2 + (p.x - this.camera.center.x) * this.camera.scale,
      this.canvas.height / 2 - (p.y - this.camera.center.y) * this.camera.scale,
    );
  }

  private clear() {
    this.ctx.fillStyle = COLORS.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid() {
    const spacing = 10000; // 10 km grid
    const min = v.sub(this.camera.center, v.scale(v.vec(1, 1), this.canvas.width / this.camera.scale));
    const max = v.add(this.camera.center, v.scale(v.vec(1, 1), this.canvas.width / this.camera.scale));
    const startX = Math.floor(min.x / spacing) * spacing;
    const endX = Math.ceil(max.x / spacing) * spacing;
    const startY = Math.floor(min.y / spacing) * spacing;
    const endY = Math.ceil(max.y / spacing) * spacing;

    this.ctx.strokeStyle = COLORS.grid;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = startX; x <= endX; x += spacing) {
      const a = this.worldToScreen(v.vec(x, min.y));
      const b = this.worldToScreen(v.vec(x, max.y));
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
    }
    for (let y = startY; y <= endY; y += spacing) {
      const a = this.worldToScreen(v.vec(min.x, y));
      const b = this.worldToScreen(v.vec(max.x, y));
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
    }
    this.ctx.stroke();
  }

  private drawRangeRings(center: v.Vec2, turret: TurretSpec) {
    const c = this.worldToScreen(center);
    const drawRing = (radius: number, color: string, dash?: number[]) => {
      if (radius <= 0) return;
      const rPx = radius * this.camera.scale;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash(dash ?? []);
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, rPx, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    };

    drawRing(turret.optimal, COLORS.optimalRing, [8, 6]);
    if (turret.falloff > 0) {
      drawRing(turret.optimal + turret.falloff, COLORS.falloffRing, [4, 6]);
    }
  }

  private drawLineOfSight(a: v.Vec2, b: v.Vec2, distance: number) {
    const sa = this.worldToScreen(a);
    const sb = this.worldToScreen(b);
    this.ctx.strokeStyle = COLORS.los;
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([8, 6]);
    this.ctx.beginPath();
    this.ctx.moveTo(sa.x, sa.y);
    this.ctx.lineTo(sb.x, sb.y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    const mid = v.scale(v.add(sa, sb), 0.5);
    const label = formatDistance(distance);
    this.drawTextAt(mid.x, mid.y, label, COLORS.text, true);
  }

  private drawVelocityVector(ship: ShipState, color: string) {
    const speed = v.len(ship.velocity);
    if (speed < 0.01) return;
    const start = this.worldToScreen(ship.position);
    const arrowLen = speed * VECTOR_SCALE * this.camera.scale;
    const heading = v.angle(ship.velocity);
    const end = v.add(start, v.vec(arrowLen * Math.cos(heading), -arrowLen * Math.sin(heading)));
    this.drawArrow(start, end, color);
  }

  private drawTransversalVector(position: v.Vec2, transversal: v.Vec2) {
    const speed = v.len(transversal);
    if (speed < 0.01) return;
    const start = this.worldToScreen(position);
    const arrowLen = speed * VECTOR_SCALE * this.camera.scale;
    const heading = v.angle(transversal);
    const end = v.add(start, v.vec(arrowLen * Math.cos(heading), -arrowLen * Math.sin(heading)));
    this.drawArrow(start, end, COLORS.transversal);
  }

  private drawArrow(a: v.Vec2, b: v.Vec2, color: string) {
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();

    const headLen = 8;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    this.ctx.beginPath();
    this.ctx.moveTo(b.x, b.y);
    this.ctx.lineTo(b.x - headLen * Math.cos(angle - Math.PI / 6), b.y - headLen * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(b.x - headLen * Math.cos(angle + Math.PI / 6), b.y - headLen * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawShip(ship: ShipState, color: string, isAttacker: boolean) {
    const p = this.worldToScreen(ship.position);
    const heading = v.len(ship.velocity) > 0.01 ? v.angle(ship.velocity) : -Math.PI / 2;
    const size = isAttacker ? 8 : 7;

    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(-heading); // screen y is inverted
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    if (isAttacker) {
      // Chevron triangle pointing in the direction of travel.
      this.ctx.beginPath();
      this.ctx.moveTo(size, 0);
      this.ctx.lineTo(-size, size * 0.75);
      this.ctx.lineTo(-size * 0.5, 0);
      this.ctx.lineTo(-size, -size * 0.75);
      this.ctx.closePath();
      this.ctx.fill();
    } else {
      // Diamond for the target.
      this.ctx.beginPath();
      this.ctx.moveTo(size, 0);
      this.ctx.lineTo(0, size);
      this.ctx.lineTo(-size, 0);
      this.ctx.lineTo(0, -size);
      this.ctx.closePath();
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawReadouts(frame: EngagementFrame, hit: HitChanceBreakdown, turret: TurretSpec) {
    const lines = [
      `T +${formatTime(frame.time)}`,
      `Range: ${formatDistance(frame.distance)}`,
      `Angular: ${frame.angularVelocity.toFixed(4)} rad/s`,
      `Transversal: ${frame.transversalSpeed.toFixed(1)} m/s`,
      `Radial: ${frame.radialVelocity.toFixed(1)} m/s`,
      `Optimal: ${formatDistance(turret.optimal)}`,
      `Falloff: ${turret.falloff > 0 ? formatDistance(turret.falloff) : "none"}`,
      `Hit chance: ${(hit.chance * 100).toFixed(1)}%`,
    ];

    this.ctx.font = '14px "Share Tech Mono", monospace';
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    let y = 12;
    for (const line of lines) {
      this.drawTextAt(12, y, line, COLORS.text, false);
      y += 18;
    }
  }

  private drawTextAt(x: number, y: number, text: string, color: string, center = false) {
    this.ctx.font = '12px "Share Tech Mono", monospace';
    this.ctx.textAlign = center ? "center" : "left";
    this.ctx.textBaseline = center ? "middle" : "top";
    this.ctx.fillStyle = COLORS.bg;
    const metrics = this.ctx.measureText(text);
    const padding = 4;
    this.ctx.fillRect(x - (center ? metrics.width / 2 + padding : 0), y - (center ? 8 : 0), metrics.width + padding * 2, 16);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x + (center ? 0 : 0), y);
  }
}

function formatDistance(m: number): string {
  if (m >= 10000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}
