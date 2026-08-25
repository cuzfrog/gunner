import { Vec2, type EngagementFrame, type HitChanceBreakdown, type ShipState, type SimSnapshot, type TurretSpec } from "../sim";
import type { I18n } from "./i18n";
import { PALETTE, withAlpha } from "./palette";

export type RangeOverlayKind = "web" | "grappler" | "scrambler" | "disruptor";

export interface RangeOverlay {
  readonly side: "attacker" | "target";
  readonly kind: RangeOverlayKind;
  readonly radius: number;
  readonly falloffRadius?: number;
}

export interface Renderer {
  setGridBrightness(brightness: number): void;
  setRangeRingsEnabled(enabled: boolean): void;
  draw(snapshot: SimSnapshot, frame: EngagementFrame, hit: HitChanceBreakdown, turret: TurretSpec, overlays: readonly RangeOverlay[]): void;
}

const COLORS = {
  bg: PALETTE.bgDeep,
  attacker: PALETTE.accentTeal,
  target: PALETTE.accentOrange,
  command: PALETTE.textPrimary,
  transversal: PALETTE.warnYellow,
  los: withAlpha(PALETTE.accentTeal, 0.5),
  text: PALETTE.textPrimary,
  scrim: withAlpha(PALETTE.bgDeep, 0.7),
  optimalRing: PALETTE.optimalGreen,
  falloffRing: PALETTE.accentOrange,
  overlayWeb: PALETTE.overlayWeb,
  overlayGrappler: PALETTE.overlayGrappler,
  overlayScrambler: PALETTE.overlayScrambler,
  overlayDisruptor: PALETTE.overlayDisruptor,
} as const;

const OVERLAY_COLORS: { readonly [K in RangeOverlayKind]: string } = {
  web: COLORS.overlayWeb,
  grappler: COLORS.overlayGrappler,
  scrambler: COLORS.overlayScrambler,
  disruptor: COLORS.overlayDisruptor,
};

const GRID_MAX_ALPHA = 0.4;
const DEFAULT_GRID_BRIGHTNESS = 0.5;

const VECTOR_SCALE = 0.5; // seconds of travel shown as an arrow
const MIN_SEPARATION_PX = 140;
const MIN_VIEW_RADIUS = 250;
const FAR_MARGIN = 1.25;
const ZOOM_OUT_MARGIN_PX = 80; // keep ships this far from the canvas edge before zooming out
const MAX_ZOOM_FACTOR = 3; // relative to the far-range fit scale
const SHIP_ICON_SIZE = 8;
const DIRECTION_LINE_LENGTH = SHIP_ICON_SIZE * 4; // 2x the icon's 16px nose-to-tail length

interface Camera {
  readonly center: Vec2;
  readonly scale: number;
}

export class CanvasRenderer implements Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly i18n: I18n;
  private camera: Camera = { center: new Vec2(0, 0), scale: 1 };
  private gridBrightness = DEFAULT_GRID_BRIGHTNESS;
  private rangeRingsEnabled = true;

  constructor({ canvas, i18n }: { canvas: HTMLCanvasElement; i18n: I18n }) {
    this.canvas = canvas;
    this.i18n = i18n;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
  }

  setGridBrightness(brightness: number): void {
    if (!Number.isFinite(brightness)) return;
    this.gridBrightness = Math.max(0, Math.min(1, brightness));
  }

  setRangeRingsEnabled(enabled: boolean): void {
    this.rangeRingsEnabled = enabled;
  }

  draw(snapshot: SimSnapshot, frame: EngagementFrame, hit: HitChanceBreakdown, turret: TurretSpec, overlays: readonly RangeOverlay[]): void {
    this.syncBufferSize();
    this.updateCamera(snapshot, turret);
    this.clear();
    this.drawGrid();
    this.drawRangeRings(snapshot.attacker.position, turret);
    this.drawRangeOverlays(snapshot, overlays);
    this.drawLineOfSight(snapshot.attacker.position, snapshot.target.position, frame.distance);
    this.drawWorldVector(snapshot.attacker.position, snapshot.attacker.velocity, COLORS.attacker);
    this.drawWorldVector(snapshot.target.position, snapshot.target.velocity, COLORS.target);
    this.drawIntendedDirection(snapshot.attacker.position, snapshot.commands.attacker);
    this.drawIntendedDirection(snapshot.target.position, snapshot.commands.target);
    this.drawWorldVector(snapshot.target.position, frame.transversalVelocity, COLORS.transversal);
    this.drawShip(snapshot.attacker, COLORS.attacker);
    this.drawShip(snapshot.target, COLORS.target);
    this.drawSpeedLabel(snapshot.attacker, COLORS.attacker, -20);
    this.drawSpeedLabel(snapshot.target, COLORS.target, 20);
    this.drawReadouts(frame, hit, turret);
  }

  private updateCamera(snapshot: SimSnapshot, turret: TurretSpec): void {
    const { attacker, target } = snapshot;
    const center = attacker.position.add(target.position).scale(0.5);
    const distance = attacker.position.dist(target.position);
    const minDim = Math.min(this.canvas.width, this.canvas.height);

    const farRadius = Math.max(turret.optimal + turret.falloff, attacker.desiredRange, target.desiredRange, 500);
    const farScale = minDim / (2 * farRadius * FAR_MARGIN);

    const closeRadius = Math.max((distance * minDim) / (2 * MIN_SEPARATION_PX), MIN_VIEW_RADIUS);
    const closeScale = minDim / (2 * closeRadius);

    const fitScale = distance > 0 ? (minDim - 2 * ZOOM_OUT_MARGIN_PX) / distance : farScale;
    const cameraScale = Math.min(
      Math.max(closeScale, farScale / MAX_ZOOM_FACTOR, Math.min(farScale, fitScale)),
      farScale * MAX_ZOOM_FACTOR
    );
    this.camera = { center, scale: cameraScale };
  }

  private worldToScreen(p: Vec2): Vec2 {
    return new Vec2(this.canvas.width / 2 + (p.x - this.camera.center.x) * this.camera.scale, this.canvas.height / 2 - (p.y - this.camera.center.y) * this.camera.scale);
  }

  private clear(): void {
    this.ctx.fillStyle = COLORS.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private syncBufferSize(): void {
    const { clientWidth, clientHeight } = this.canvas;
    if (!clientWidth || !clientHeight) return;
    if (this.canvas.width !== clientWidth || this.canvas.height !== clientHeight) {
      this.canvas.width = clientWidth;
      this.canvas.height = clientHeight;
    }
  }

  private drawGrid(): void {
    const spacing = 10000; // 10 km grid
    const half = new Vec2(this.canvas.width, this.canvas.height).scale(0.5 / this.camera.scale);
    const min = this.camera.center.sub(half);
    const max = this.camera.center.add(half);
    const startX = Math.floor(min.x / spacing) * spacing;
    const endX = Math.ceil(max.x / spacing) * spacing;
    const startY = Math.floor(min.y / spacing) * spacing;
    const endY = Math.ceil(max.y / spacing) * spacing;

    const alpha = Math.round(this.gridBrightness * GRID_MAX_ALPHA * 100) / 100;
    this.ctx.strokeStyle = withAlpha(PALETTE.accentTeal, alpha);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = startX; x <= endX; x += spacing) {
      const a = this.worldToScreen(new Vec2(x, min.y));
      const b = this.worldToScreen(new Vec2(x, max.y));
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
    }
    for (let y = startY; y <= endY; y += spacing) {
      const a = this.worldToScreen(new Vec2(min.x, y));
      const b = this.worldToScreen(new Vec2(max.x, y));
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
    }
    this.ctx.stroke();
  }

  private drawRangeRings(center: Vec2, turret: TurretSpec): void {
    if (!this.rangeRingsEnabled) return;
    this.drawRingAt(center, turret.optimal, COLORS.optimalRing, [8, 6]);
    if (turret.falloff > 0) {
      this.drawRingAt(center, turret.optimal + turret.falloff, COLORS.falloffRing, [4, 6]);
    }
  }

  private drawRangeOverlays(snapshot: SimSnapshot, overlays: readonly RangeOverlay[]): void {
    for (const overlay of overlays) {
      const center = overlay.side === "attacker" ? snapshot.attacker.position : snapshot.target.position;
      const color = OVERLAY_COLORS[overlay.kind];
      this.drawRingAt(center, overlay.radius, color, [2, 6]);
      if (overlay.falloffRadius && overlay.falloffRadius > 0) {
        this.drawRingAt(center, overlay.radius + overlay.falloffRadius, color, [2, 6]);
      }
    }
  }

  private drawRingAt(center: Vec2, radius: number, color: string, dash?: number[]): void {
    if (radius <= 0) return;
    const c = this.worldToScreen(center);
    const rPx = radius * this.camera.scale;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash(dash ?? []);
    this.ctx.beginPath();
    this.ctx.arc(c.x, c.y, rPx, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
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

    const mid = sa.add(sb).scale(0.5);
    this.drawTextAt(mid.x, mid.y, this.formatDistance(distance), COLORS.text, true);
  }

  private drawWorldVector(position: Vec2, vector: Vec2, color: string, dash: number[] = []): void {
    const speed = vector.len();
    if (speed < 0.01) return;
    const start = this.worldToScreen(position);
    const arrowLen = speed * VECTOR_SCALE * this.camera.scale;
    const heading = vector.angle();
    const end = start.add(new Vec2(arrowLen * Math.cos(heading), -arrowLen * Math.sin(heading)));
    this.ctx.setLineDash(dash);
    this.drawArrow(start, end, color);
    this.ctx.setLineDash([]);
  }

  private drawIntendedDirection(position: Vec2, vector: Vec2): void {
    if (vector.len() < 0.01) return;
    const start = this.worldToScreen(position);
    const heading = vector.angle();
    const end = start.add(new Vec2(DIRECTION_LINE_LENGTH * Math.cos(heading), -DIRECTION_LINE_LENGTH * Math.sin(heading)));
    this.ctx.save();
    this.ctx.strokeStyle = COLORS.command;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([2, 4]);
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
    this.ctx.restore();
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

  private drawShip(ship: ShipState, color: string): void {
    const p = this.worldToScreen(ship.position);
    const heading = ship.velocity.len() > 0.01 ? ship.velocity.angle() : -Math.PI / 2;

    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(-heading); // screen y is inverted
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    // Chevron triangle pointing in the direction of travel.
    this.ctx.beginPath();
    this.ctx.moveTo(SHIP_ICON_SIZE, 0);
    this.ctx.lineTo(-SHIP_ICON_SIZE, SHIP_ICON_SIZE * 0.75);
    this.ctx.lineTo(-SHIP_ICON_SIZE * 0.5, 0);
    this.ctx.lineTo(-SHIP_ICON_SIZE, -SHIP_ICON_SIZE * 0.75);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawSpeedLabel(ship: ShipState, color: string, dy: number): void {
    const p = this.worldToScreen(ship.position);
    const speed = Math.round(ship.velocity.len());
    this.drawTextAt(p.x, p.y + dy, `${formatWithCommas(speed)} m/s`, color, true, 11);
  }

  private drawReadouts(frame: EngagementFrame, hit: HitChanceBreakdown, turret: TurretSpec): void {
    const lines = [
      `${this.i18n.t("readout.time")}${formatTime(frame.time)}`,
      `${this.i18n.t("readout.range")}${this.formatDistance(frame.distance)}`,
      `${this.i18n.t("readout.angular")}${formatWithCommas(frame.angularVelocity, 4)} rad/s`,
      `${this.i18n.t("readout.transversal")}${formatWithCommas(frame.transversalSpeed, 1)} m/s`,
      `${this.i18n.t("readout.radial")}${formatWithCommas(frame.radialVelocity, 1)} m/s`,
      `${this.i18n.t("readout.optimal")}${this.formatDistance(turret.optimal)}`,
      `${this.i18n.t("readout.falloff")}${turret.falloff > 0 ? this.formatDistance(turret.falloff) : this.i18n.t("readout.none")}`,
      `${this.i18n.t("readout.hitChance")}${formatWithCommas(hit.chance * 100, 1)}%`,
    ];

    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    let y = 10;
    for (const line of lines) {
      this.drawTextAt(12, y, line, COLORS.text, false);
      y += 17;
    }
  }

  private drawTextAt(x: number, y: number, text: string, color: string, center = false, fontSize = 13): void {
    this.ctx.font = `${fontSize}px "Share Tech Mono", monospace`;
    this.ctx.textAlign = center ? "center" : "left";
    this.ctx.textBaseline = center ? "middle" : "top";
    this.ctx.fillStyle = COLORS.scrim;
    const metrics = this.ctx.measureText(text);
    const padding = 4;
    const lineHeight = fontSize + 3;
    this.ctx.fillRect(x - (center ? metrics.width / 2 + padding : padding), y - (center ? lineHeight / 2 : 0), metrics.width + padding * 2, lineHeight);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  private formatDistance(m: number): string {
    if (m >= 10000) return `${formatWithCommas(m / 1000, 1)} ${this.i18n.t("unit.kilometer")}`;
    return `${formatWithCommas(Math.round(m))} ${this.i18n.t("unit.meter")}`;
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}

function formatWithCommas(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
