import type { EngagementFrame, HitChanceBreakdown } from "../../sim";
import { setText } from "./controlsDom";
import { formatWithCommas, hitChanceColor } from "./controlsFormat";

export interface ReadoutEls {
  readonly resDistance: HTMLElement;
  readonly resTransversal: HTMLElement;
  readonly resAngular: HTMLElement;
  readonly resRadial: HTMLElement;
  readonly resTrackPen: HTMLElement;
  readonly resRangePen: HTMLElement;
  readonly resHit: HTMLElement;
}

export class EngagementReadout {
  private readonly els: ReadoutEls;

  constructor(els: ReadoutEls) {
    this.els = els;
  }

  update(frame: EngagementFrame, hit: HitChanceBreakdown, t: (key: string) => string): void {
    const trackPenalty = Number.isFinite(hit.trackingTerm) ? (0.5 ** hit.trackingTerm) * 100 : 0;
    const rangePenalty = Number.isFinite(hit.rangeTerm) ? (0.5 ** hit.rangeTerm) * 100 : 0;

    setText(this.els.resDistance, formatDistance(frame.distance, t));
    setText(this.els.resTransversal, `${formatWithCommas(frame.transversalSpeed, 1)} m/s`);
    setText(this.els.resAngular, `${formatWithCommas(frame.angularVelocity, 4)} rad/s`);
    setText(this.els.resRadial, `${formatWithCommas(frame.radialVelocity, 1)} m/s`);
    setText(this.els.resTrackPen, `${formatWithCommas(trackPenalty, 1)}%`);
    setText(this.els.resRangePen, `${formatWithCommas(rangePenalty, 1)}%`);
    setText(this.els.resHit, `${formatWithCommas(hit.chance * 100, 1)}%`);
    this.els.resHit.style.color = hitChanceColor(hit.chance);
  }
}

function formatDistance(m: number, t: (key: string) => string): string {
  if (m >= 10000) return `${formatWithCommas(m / 1000, 1)} ${t("unit.kilometer")}`;
  return `${formatWithCommas(Math.round(m))} ${t("unit.meter")}`;
}
