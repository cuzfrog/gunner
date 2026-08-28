import type { EngagementView, HitChanceBreakdown } from "../../../sim";
import { setText } from "../controlsDom";
import { formatDistance, formatWithCommas, hitChanceClass } from "../controlsFormat";

interface SideHitEls {
  readonly resTrackPen: HTMLElement;
  readonly resRangePen: HTMLElement;
  readonly resHit: HTMLElement;
}

export interface ReadoutEls {
  readonly resDistance: HTMLElement;
  readonly shipA: SideHitEls;
  readonly shipB: SideHitEls;
}

export interface EngagementReadout {
  update(view: EngagementView, t: (key: string) => string): void;
}

const DEFAULT_HIT: HitChanceBreakdown = { chance: 0, trackingTerm: 0, rangeTerm: 0 };

export class EngagementReadoutImpl implements EngagementReadout {
  private readonly els: ReadoutEls;

  constructor(els: ReadoutEls) {
    this.els = els;
  }

  update(view: EngagementView, t: (key: string) => string): void {
    const { frame, attacks } = view;
    setText(this.els.resDistance, formatDistance(frame.distance, t));
    this.updateSide(this.els.shipA, attacks.shipA?.turret?.hit ?? DEFAULT_HIT);
    this.updateSide(this.els.shipB, attacks.shipB?.turret?.hit ?? DEFAULT_HIT);
  }

  private updateSide(els: SideHitEls, hit: HitChanceBreakdown): void {
    const trackPenalty = Number.isFinite(hit.trackingTerm) ? (0.5 ** hit.trackingTerm) * 100 : 0;
    const rangePenalty = Number.isFinite(hit.rangeTerm) ? (0.5 ** hit.rangeTerm) * 100 : 0;

    setText(els.resTrackPen, `${formatWithCommas(trackPenalty, 1)}%`);
    setText(els.resRangePen, `${formatWithCommas(rangePenalty, 1)}%`);
    setText(els.resHit, `${formatWithCommas(hit.chance * 100, 1)}%`);
    els.resHit.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger");
    els.resHit.classList.add(hitChanceClass(hit.chance));
  }
}
