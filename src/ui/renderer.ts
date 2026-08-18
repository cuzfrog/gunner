import { add, angle, dist, len, scale, sub, vec, type Vec2 } from "../math";
import type { EngagementFrame, HitChanceBreakdown, ShipState, SimSnapshot, TurretSpec } from "../sim";
import type { I18n } from "./i18n";

export interface Renderer {
  draw(snapshot: SimSnapshot, frame: EngagementFrame, hit: HitChanceBreakdown, turret: TurretSpec): void;
}

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
} as const;

const VECTOR_SCALE = 0.5; // seconds of travel shown as an arrow

interface Camera {
  readonly center: Vec2;
  readonly scale: number;
}

export class CanvasRenderer implements Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly i18n: I18n;
  private camera: Camera = { center: vec(0, 0), scale: 1 };

  constructor({ canvas, i18n }: { canvas: HTMLCanvasElement; i18n: I18n }) {
    this.canvas = canvas;
    this.i18n = i18n;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
  }

  draw(snapshot: SimSnapshot, frame: EngagementFrame, hit: HitChanceBreakdown, turret: TurretSpec): void {
    this.updateCamera(snapshot, turret);
    this.clear();
    this.drawGrid();
    this.drawRangeRings(snapshot.attacker.position, turret);
    this.drawLineOfSight(snapshot.attacker.position, snapshot.target.position, frame.distance);
    this.drawVelocityVector(snapshot.attacker, COLORS.attacker);
    this.drawVelocityVector(snapshot.target, COLORS.target);
    this.drawCommandedVector(snapshot.attacker.position, snapshot.commands.attacker, COLORS.attacker);
    this.drawCommandedVector(snapshot.target.position, snapshot.commands.target, COLORS.target);
    this.drawTransversalVector(snapshot.target.position, frame.transversalVelocity);
    this.drawShip(snapshot.attacker, COLORS.attacker, true);
    this.drawShip(snapshot.target, COLORS.target, false);
    this.drawReadouts(frame, hit, turret);
  }

  private updateCamera(snapshot: SimSnapshot, turret: TurretSpec): void {
    const { attacker, target } = snapshot;
    const center = scale(add(attacker.position, target.position), 0.5);
    const distance = dist(attacker.position, target.position);
    const viewRadius = Math.max(distance, turret.optimal + turret.falloff, attacker.desiredRange, target.desiredRange, 500) * 1.25;
    const cameraScale = Math.min(this.canvas.width, this.canvas.height) / (2 * viewRadius);
    this.camera = { center, scale: cameraScale };
  }

  private worldToScreen(p: Vec2): Vec2 {
    return vec(
      this.canvas.width / 2 + (p.x - this.camera.center.x) * this.camera.scale,
      this.canvas.height / 2 - (p.y - this.camera.center.y) * this.camera.scale,
    );
  }

  private clear(): void {
    this.ctx.fillStyle = COLORS.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid(): void {
    const spacing = 10000; // 10 km grid
    const half = scale(
      vec(this.canvas.width, this.canvas.height),
      0.5 / this.camera.scale,
    );
    const min = sub(this.camera.center, half);
    const max = add(this.camera.center, half);
    const startX = Math.floor(min.x / spacing) * spacing;
    const endX = Math.ceil(max.x / spacing) * spacing;
    const startY = Math.floor(min.y / spacing) * spacing;
    const endY = Math.ceil(max.y / spacing) * spacing;

    this.ctx.strokeStyle = COLORS.grid;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = startX; x <= endX; x += spacing) {
      const a = this.worldToScreen(vec(x, min.y));
      const b = this.worldToScreen(vec(x, max.y));
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
    }
    for (let y = startY; y <= endY; y += spacing) {
      const a = this.worldToScreen(vec(min.x, y));
      const b = this.worldToScreen(vec(max.x, y));
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
    }
    this.ctx.stroke();
  }

  private drawRangeRings(center: Vec2, turret: TurretSpec): void {
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

  private drawLineOfSight(a: Vec2, b: Vec2, distance: number): void {
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

    const mid = scale(add(sa, sb), 0.5);
    this.drawTextAt(mid.x, mid.y, this.formatDistance(distance), COLORS.text, true);
  }

  private drawVelocityVector(ship: ShipState, color: string): void {
    const speed = len(ship.velocity);
    if (speed < 0.01) return;
    const start = this.worldToScreen(ship.position);
    const arrowLen = speed * VECTOR_SCALE * this.camera.scale;
    const heading = angle(ship.velocity);
    const end = add(start, vec(arrowLen * Math.cos(heading), -arrowLen * Math.sin(heading)));
    this.drawArrow(start, end, color);
  }

  private drawCommandedVector(position: Vec2, commanded: Vec2, color: string): void {
    const speed = len(commanded);
    if (speed < 0.01) return;
    const start = this.worldToScreen(position);
    const arrowLen = speed * VECTOR_SCALE * this.camera.scale;
    const heading = angle(commanded);
    const end = add(start, vec(arrowLen * Math.cos(heading), -arrowLen * Math.sin(heading)));
    this.ctx.setLineDash([5, 5]);
    this.drawArrow(start, end, color);
    this.ctx.setLineDash([]);
  }

  private drawTransversalVector(position: Vec2, transversal: Vec2): void {
    const speed = len(transversal);
    if (speed < 0.01) return;
    const start = this.worldToScreen(position);
    const arrowLen = speed * VECTOR_SCALE * this.camera.scale;
    const heading = angle(transversal);
    const end = add(start, vec(arrowLen * Math.cos(heading), -arrowLen * Math.sin(heading)));
    this.drawArrow(start, end, COLORS.transversal);
  }

  private drawArrow(a: Vec2, b: Vec2, color: string): void {
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();

    const headLen = 8;
    const arrowAngle = Math.atan2(b.y - a.y, b.x - a.x);
    this.ctx.beginPath();
    this.ctx.moveTo(b.x, b.y);
    this.ctx.lineTo(b.x - headLen * Math.cos(arrowAngle - Math.PI / 6), b.y - headLen * Math.sin(arrowAngle - Math.PI / 6));
    this.ctx.lineTo(b.x - headLen * Math.cos(arrowAngle + Math.PI / 6), b.y - headLen * Math.sin(arrowAngle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawShip(ship: ShipState, color: string, isAttacker: boolean): void {
    const p = this.worldToScreen(ship.position);
    const heading = len(ship.velocity) > 0.01 ? angle(ship.velocity) : -Math.PI / 2;
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

  private drawReadouts(frame: EngagementFrame, hit: HitChanceBreakdown, turret: TurretSpec): void {
    const lines = [
      `${this.i18n.t("readout.time")}${formatTime(frame.time)}`,
      `${this.i18n.t("readout.range")}${this.formatDistance(frame.distance)}`,
      `${this.i18n.t("readout.angular")}${frame.angularVelocity.toFixed(4)} rad/s`,
      `${this.i18n.t("readout.transversal")}${frame.transversalSpeed.toFixed(1)} m/s`,
      `${this.i18n.t("readout.radial")}${frame.radialVelocity.toFixed(1)} m/s`,
      `${this.i18n.t("readout.optimal")}${this.formatDistance(turret.optimal)}`,
      `${this.i18n.t("readout.falloff")}${turret.falloff > 0 ? this.formatDistance(turret.falloff) : this.i18n.t("readout.none")}`,
      `${this.i18n.t("readout.hitChance")}${(hit.chance * 100).toFixed(1)}%`,
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

  private drawTextAt(x: number, y: number, text: string, color: string, center = false): void {
    this.ctx.font = '12px "Share Tech Mono", monospace';
    this.ctx.textAlign = center ? "center" : "left";
    this.ctx.textBaseline = center ? "middle" : "top";
    this.ctx.fillStyle = COLORS.bg;
    const metrics = this.ctx.measureText(text);
    const padding = 4;
    this.ctx.fillRect(x - (center ? metrics.width / 2 + padding : 0), y - (center ? 8 : 0), metrics.width + padding * 2, 16);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  private formatDistance(m: number): string {
    if (m >= 10000) return `${(m / 1000).toFixed(1)} ${this.i18n.t("unit.kilometer")}`;
    return `${Math.round(m)} ${this.i18n.t("unit.meter")}`;
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}
