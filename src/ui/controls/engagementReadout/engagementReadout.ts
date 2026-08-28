import type { AttackAssessment, EngagementView, HitChanceBreakdown } from "../../../sim";
import { setText } from "../controlsDom";
import { formatDistance, formatWithCommas, hitChanceClass } from "../controlsFormat";

interface SideHitEls {
  readonly resTrackPen: HTMLElement;
  readonly resRangePen: HTMLElement;
  readonly resHit: HTMLElement;
  readonly resTrackPenLabel: HTMLElement;
  readonly resRangePenLabel: HTMLElement;
  readonly resHitLabel: HTMLElement;
}

export interface ReadoutEls {
  readonly resDistance: HTMLElement;
  readonly shipA: SideHitEls;
  readonly shipB: SideHitEls;
}

export interface EngagementReadout {
  update(view: EngagementView, t: (key: string) => string): void;
}

export class EngagementReadoutImpl implements EngagementReadout {
  private readonly els: ReadoutEls;

  constructor(els: ReadoutEls) {
    this.els = els;
  }

  update(view: EngagementView, t: (key: string) => string): void {
    const { frame, attacks } = view;
    setText(this.els.resDistance, formatDistance(frame.distance, t));
    this.updateSide(this.els.shipA, attacks.shipA, t);
    this.updateSide(this.els.shipB, attacks.shipB, t);
  }

  private updateSide(els: SideHitEls, attack: AttackAssessment | undefined, t: (key: string) => string): void {
    els.resHit.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger");
    if (attack?.turret) {
      this.updateTurretSide(els, attack.turret.hit, t);
    } else if (attack?.missile) {
      this.updateMissileSide(els, attack, t);
    } else {
      this.updateNoWeaponSide(els);
    }
  }

  private updateTurretSide(els: SideHitEls, hit: HitChanceBreakdown, t: (key: string) => string): void {
    setText(els.resHitLabel, t("result.hitChance"));
    setText(els.resTrackPenLabel, t("result.trackingPenalty"));
    setText(els.resRangePenLabel, t("result.rangePenalty"));
    const trackPenalty = Number.isFinite(hit.trackingTerm) ? (0.5 ** hit.trackingTerm) * 100 : 0;
    const rangePenalty = Number.isFinite(hit.rangeTerm) ? (0.5 ** hit.rangeTerm) * 100 : 0;
    setText(els.resTrackPen, `${formatWithCommas(trackPenalty, 1)}%`);
    setText(els.resRangePen, `${formatWithCommas(rangePenalty, 1)}%`);
    setText(els.resHit, `${formatWithCommas(hit.chance * 100, 1)}%`);
    els.resHit.classList.add(hitChanceClass(hit.chance));
  }

  private updateMissileSide(els: SideHitEls, attack: AttackAssessment, t: (key: string) => string): void {
    setText(els.resHitLabel, t("result.appliedDps"));
    setText(els.resTrackPenLabel, t("result.nominalDps"));
    setText(els.resRangePenLabel, t("result.application"));
    setText(els.resHit, formatWithCommas(attack.damage.appliedDps, 1));
    setText(els.resTrackPen, formatWithCommas(attack.damage.nominalDps, 1));
    setText(els.resRangePen, `${formatWithCommas(attack.damage.application * 100, 1)}%`);
    if (attack.damage.appliedDps <= 0) {
      els.resHit.classList.add("is-danger");
    } else {
      els.resHit.classList.add("is-good");
    }
  }

  private updateNoWeaponSide(els: SideHitEls): void {
    setText(els.resHitLabel, "-");
    setText(els.resTrackPenLabel, "-");
    setText(els.resRangePenLabel, "-");
    setText(els.resHit, "-");
    setText(els.resTrackPen, "-");
    setText(els.resRangePen, "-");
  }
}
