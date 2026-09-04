import type { AttackAssessment, DefenseAssessment, EngagementView, HitChanceBreakdown, LockState } from "../../../sim";
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
  readonly resLockState: HTMLElement;
  readonly resAppliedDps: HTMLElement;
  readonly resAppliedDpsApplication: HTMLElement;
  readonly resActualDps: HTMLElement;
  readonly resTimeToImpact: HTMLElement;
  readonly resSigFactor: HTMLElement;
  readonly resVelocityFactor: HTMLElement;
  readonly resNominalDpsLabel: HTMLElement;
  readonly resLockStateLabel: HTMLElement;
  readonly resAppliedDpsLabel: HTMLElement;
  readonly resActualDpsLabel: HTMLElement;
  readonly resTimeToImpactLabel: HTMLElement;
  readonly resSigFactorLabel: HTMLElement;
  readonly resVelocityFactorLabel: HTMLElement;
  readonly resSide: HTMLElement;
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
    const { frame, attacks, locks, defenses } = view;
    setText(this.els.resDistance, formatDistance(frame.distance, t));
    this.updateSide(this.els.shipA, attacks.shipA, defenses.shipB, locks.shipA, t);
    this.updateSide(this.els.shipB, attacks.shipB, defenses.shipA, locks.shipB, t);
  }

  private updateSide(els: SideHitEls & SideDpsEls, attack: AttackAssessment | undefined, opponentDefense: DefenseAssessment, lock: LockState | undefined, t: (key: string) => string): void {
    this.clearColorClasses(els);
    this.updateLockState(els, lock, t);
    const hitChance = attack?.turret?.hit ?? attack?.drone?.hit;
    if (hitChance) {
      this.updateHitChanceSide(els, attack!, opponentDefense, hitChance, t);
    } else if (attack?.missile) {
      this.updateMissileSide(els, attack, opponentDefense, t);
    } else {
      this.updateNoWeaponSide(els);
    }
  }

  private updateLockState(els: SideHitEls & SideDpsEls, lock: LockState | undefined, t: (key: string) => string): void {
    setText(els.resLockStateLabel, t("result.lockState"));
    if (lock === undefined || lock.lockTime === 0) {
      setText(els.resLockState, "-");
      els.resLockState.classList.add("is-dim");
      return;
    }
    els.resLockState.classList.remove("is-dim");
    if (lock.status === "locked") {
      setText(els.resLockState, t("lockHint.locked"));
      els.resLockState.classList.add("is-optimal");
    } else if (lock.status === "locking") {
      setText(els.resLockState, `${Math.round(lock.progress * 100)}%`);
      els.resLockState.classList.add("is-caution");
    } else {
      setText(els.resLockState, t("lockHint.idle"));
      els.resLockState.classList.add("is-dim");
    }
  }

  private clearColorClasses(els: SideHitEls & SideDpsEls): void {
    els.resHit.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resTrackPen.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resRangePen.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resAppliedDps.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resAppliedDpsApplication.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resActualDps.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resNominalDps.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resLockState.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resSigFactor.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resVelocityFactor.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
    els.resTimeToImpact.classList.remove("is-optimal", "is-good", "is-caution", "is-warn", "is-danger", "is-dim");
  }

  private updateHitChanceSide(els: SideHitEls & SideDpsEls, attack: AttackAssessment, opponentDefense: DefenseAssessment, hit: HitChanceBreakdown, t: (key: string) => string): void {
    setWeaponMode(els, "turret");
    setText(els.resHitLabel, t("result.hitChance"));
    setText(els.resTrackPenLabel, t("result.trackingPenalty"));
    setText(els.resRangePenLabel, t("result.rangePenalty"));
    const trackPenalty = Number.isFinite(hit.trackingTerm) ? (0.5 ** hit.trackingTerm) * 100 : 0;
    const rangePenalty = Number.isFinite(hit.rangeTerm) ? (0.5 ** hit.rangeTerm) * 100 : 0;
    setText(els.resTrackPen, `${formatWithCommas(trackPenalty, 1)}%`);
    setText(els.resRangePen, `${formatWithCommas(rangePenalty, 1)}%`);
    setText(els.resHit, `${formatWithCommas(hit.chance * 100, 1)}%`);
    els.resHit.classList.add(hitChanceClass(hit.chance));
    els.resTrackPen.classList.add(hitChanceClass(trackPenalty / 100));
    els.resRangePen.classList.add(hitChanceClass(rangePenalty / 100));
    writeDpsFields(els, attack, opponentDefense, t);
  }

  private updateMissileSide(els: SideHitEls & SideDpsEls, attack: AttackAssessment, opponentDefense: DefenseAssessment, t: (key: string) => string): void {
    setWeaponMode(els, "missile");
    const missile = attack.missile!;
    setText(els.resTimeToImpactLabel, t("result.timeToImpact"));
    setText(els.resSigFactorLabel, t("result.signatureFactor"));
    setText(els.resVelocityFactorLabel, t("result.velocityFactor"));
    writeDpsFields(els, attack, opponentDefense, t);
    setText(els.resTimeToImpact, `${formatWithCommas(missile.timeToImpact, 1)}s`);
    const sigPercent = Math.min(1, missile.signatureTerm) * 100;
    const velPercent = Math.min(1, missile.velocityTerm) * 100;
    setText(els.resSigFactor, `${formatWithCommas(sigPercent, 1)}%`);
    setText(els.resVelocityFactor, `${formatWithCommas(velPercent, 1)}%`);
    els.resSigFactor.classList.add(hitChanceClass(sigPercent / 100));
    els.resVelocityFactor.classList.add(hitChanceClass(velPercent / 100));
  }

  private updateNoWeaponSide(els: SideHitEls & SideDpsEls): void {
    setWeaponMode(els, "turret");
    setText(els.resHit, "-");
    setText(els.resTrackPen, "-");
    setText(els.resRangePen, "-");
    setText(els.resNominalDps, "-");
    setText(els.resAppliedDps, "-");
    setText(els.resAppliedDpsApplication, "-");
    setText(els.resActualDps, "-");
    setText(els.resTimeToImpact, "-");
    setText(els.resSigFactor, "-");
    setText(els.resVelocityFactor, "-");
    els.resHit.classList.add("is-dim");
    els.resTrackPen.classList.add("is-dim");
    els.resRangePen.classList.add("is-dim");
    els.resNominalDps.classList.add("is-dim");
    els.resAppliedDps.classList.add("is-dim");
    els.resAppliedDpsApplication.classList.add("is-dim");
    els.resActualDps.classList.add("is-dim");
    els.resSigFactor.classList.add("is-dim");
    els.resVelocityFactor.classList.add("is-dim");
    els.resTimeToImpact.classList.add("is-dim");
  }
}

type WeaponMode = "turret" | "missile";

function setWeaponMode(els: SideDpsEls, mode: WeaponMode): void {
  els.resSide.classList.remove("is-turret", "is-missile");
  els.resSide.classList.add(`is-${mode}`);
}

function writeDpsFields(els: SideDpsEls, attack: AttackAssessment, opponentDefense: DefenseAssessment, t: (key: string) => string): void {
  setText(els.resNominalDpsLabel, t("result.nominalDps"));
  setText(els.resAppliedDpsLabel, t("result.appliedDps"));
  setText(els.resActualDpsLabel, t("result.actualDps"));
  setText(els.resNominalDps, formatWithCommas(attack.damage.nominalDps, 1));
  setText(els.resAppliedDps, formatWithCommas(attack.damage.appliedDps, 1));
  setText(els.resAppliedDpsApplication, `(${formatWithCommas(attack.damage.application * 100, 1)}%)`);
  els.resAppliedDpsApplication.classList.add(hitChanceClass(attack.damage.application));
  setText(els.resActualDps, formatWithCommas(opponentDefense.actualIncomingDps, 1));
}
