import type { AttackAssessment, EngagementView } from "../../../sim";
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

interface SideDpsEls {
  readonly resNominalDps: HTMLElement;
  readonly resAppliedDps: HTMLElement;
  readonly resApplication: HTMLElement;
  readonly resTimeToImpact: HTMLElement;
  readonly resNominalDpsLabel: HTMLElement;
  readonly resAppliedDpsLabel: HTMLElement;
  readonly resApplicationLabel: HTMLElement;
  readonly resTimeToImpactLabel: HTMLElement;
  readonly resTurretCards: HTMLElement;
  readonly resMissileCards: HTMLElement;
}

export interface ReadoutEls {
  readonly resDistance: HTMLElement;
  readonly shipA: SideHitEls & SideDpsEls;
  readonly shipB: SideHitEls & SideDpsEls;
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

  private updateSide(els: SideHitEls & SideDpsEls, attack: AttackAssessment | undefined, t: (key: string) => string): void {
    els.resHit.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger");
    els.resAppliedDps.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resNominalDps.classList.remove("is-dim");
    els.resApplication.classList.remove("is-dim");
    if (attack?.turret) {
      this.updateTurretSide(els, attack, t);
    } else if (attack?.missile) {
      this.updateMissileSide(els, attack, t);
    } else {
      this.updateNoWeaponSide(els);
    }
  }

  private updateTurretSide(els: SideHitEls & SideDpsEls, attack: AttackAssessment, t: (key: string) => string): void {
    els.resTurretCards.hidden = false;
    els.resMissileCards.hidden = true;
    const hit = attack.turret!.hit;
    setText(els.resHitLabel, t("result.hitChance"));
    setText(els.resTrackPenLabel, t("result.trackingPenalty"));
    setText(els.resRangePenLabel, t("result.rangePenalty"));
    const trackPenalty = Number.isFinite(hit.trackingTerm) ? (0.5 ** hit.trackingTerm) * 100 : 0;
    const rangePenalty = Number.isFinite(hit.rangeTerm) ? (0.5 ** hit.rangeTerm) * 100 : 0;
    setText(els.resTrackPen, `${formatWithCommas(trackPenalty, 1)}%`);
    setText(els.resRangePen, `${formatWithCommas(rangePenalty, 1)}%`);
    setText(els.resHit, `${formatWithCommas(hit.chance * 100, 1)}%`);
    els.resHit.classList.add(hitChanceClass(hit.chance));
    setText(els.resNominalDpsLabel, t("result.nominalDps"));
    setText(els.resAppliedDpsLabel, t("result.appliedDps"));
    setText(els.resApplicationLabel, t("result.application"));
    setText(els.resNominalDps, formatWithCommas(attack.damage.nominalDps, 1));
    setText(els.resAppliedDps, formatWithCommas(attack.damage.appliedDps, 1));
    setText(els.resApplication, `${formatWithCommas(attack.damage.application * 100, 1)}%`);
    if (attack.damage.appliedDps <= 0) {
      els.resAppliedDps.classList.add("is-danger");
    } else {
      els.resAppliedDps.classList.add("is-good");
    }
  }

  private updateMissileSide(els: SideHitEls & SideDpsEls, attack: AttackAssessment, t: (key: string) => string): void {
    els.resTurretCards.hidden = true;
    els.resMissileCards.hidden = false;
    setText(els.resNominalDpsLabel, t("result.nominalDps"));
    setText(els.resAppliedDpsLabel, t("result.appliedDps"));
    setText(els.resApplicationLabel, t("result.application"));
    setText(els.resTimeToImpactLabel, t("result.timeToImpact"));
    setText(els.resNominalDps, formatWithCommas(attack.damage.nominalDps, 1));
    setText(els.resAppliedDps, formatWithCommas(attack.damage.appliedDps, 1));
    setText(els.resApplication, `${formatWithCommas(attack.damage.application * 100, 1)}%`);
    setText(els.resTimeToImpact, `${formatWithCommas(attack.missile!.timeToImpact, 1)}s`);
    if (attack.damage.appliedDps <= 0) {
      els.resAppliedDps.classList.add("is-danger");
    } else {
      els.resAppliedDps.classList.add("is-good");
    }
  }

  private updateNoWeaponSide(els: SideHitEls & SideDpsEls): void {
    els.resTurretCards.hidden = true;
    els.resMissileCards.hidden = true;
    setText(els.resNominalDps, "-");
    setText(els.resAppliedDps, "-");
    setText(els.resApplication, "-");
    els.resNominalDps.classList.add("is-dim");
    els.resAppliedDps.classList.add("is-dim");
    els.resApplication.classList.add("is-dim");
  }
}
