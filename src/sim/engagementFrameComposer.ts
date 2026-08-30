import type { AttackAssessment, AttackState, EngagementEvaluator } from "./fireControl";
import type { Kinematics } from "./kinematics";
import type { DamageAssessment, EngagementFrame, Side, SimSnapshot, WeaponSpec } from "./types";

export interface EngagementInput {
  readonly weapons: Record<Side, readonly WeaponSpec[]>;
  readonly sigRadii: Record<Side, number>;
}

export interface EngagementView {
  readonly frame: EngagementFrame;
  readonly attacks: Record<Side, AttackAssessment | undefined>;
  readonly effectiveWeapons: Record<Side, WeaponSpec | undefined>;
}

export interface EngagementFrameComposer {
  compose(snapshot: SimSnapshot, input: EngagementInput): EngagementView;
}

export class EngagementFrameComposerImpl implements EngagementFrameComposer {
  private readonly kinematics: Kinematics;
  private readonly engagementEvaluator: EngagementEvaluator;

  constructor({ kinematics, engagementEvaluator }: {
    kinematics: Kinematics;
    engagementEvaluator: EngagementEvaluator;
  }) {
    this.kinematics = kinematics;
    this.engagementEvaluator = engagementEvaluator;
  }

  compose(snapshot: SimSnapshot, input: EngagementInput): EngagementView {
    const frame = this.kinematics.computeEngagement(snapshot.shipA, snapshot.shipB, snapshot.time);
    const shipAWeapons = input.weapons.shipA;
    const shipBWeapons = input.weapons.shipB;
    let attacks: Record<Side, AttackAssessment | undefined>;
    if (shipAWeapons.length <= 1 && shipBWeapons.length <= 1) {
      attacks = this.engagementEvaluator.evaluate(frame, {
        shipA: shipAWeapons.length === 1 ? { weapon: shipAWeapons[0], opponentSigRadius: input.sigRadii.shipB } : undefined,
        shipB: shipBWeapons.length === 1 ? { weapon: shipBWeapons[0], opponentSigRadius: input.sigRadii.shipA } : undefined,
      });
    } else {
      attacks = {
        shipA: this.assessSide(frame, "shipA", shipAWeapons, input.sigRadii.shipB),
        shipB: this.assessSide(frame, "shipB", shipBWeapons, input.sigRadii.shipA),
      };
    }
    const effectiveWeapons: Record<Side, WeaponSpec | undefined> = {
      shipA: attacks.shipA?.effectiveWeapon ?? shipAWeapons[0],
      shipB: attacks.shipB?.effectiveWeapon ?? shipBWeapons[0],
    };
    return { frame, attacks, effectiveWeapons };
  }

  private assessSide(frame: EngagementFrame, side: Side, weapons: readonly WeaponSpec[], opponentSigRadius: number): AttackAssessment | undefined {
    if (weapons.length === 0) return undefined;
    if (weapons.length === 1) {
      return this.engagementEvaluator.evaluate(frame, this.singleAttack(side, { weapon: weapons[0], opponentSigRadius }))[side];
    }
    const assessments: AttackAssessment[] = [];
    for (const weapon of weapons) {
      const result = this.engagementEvaluator.evaluate(frame, this.singleAttack(side, { weapon, opponentSigRadius }))[side];
      if (result) assessments.push(result);
    }
    if (assessments.length === 0) return undefined;
    const primary = assessments[0];
    const totalDamage = assessments.reduce<DamageAssessment>(this.sumDamage, { nominalDps: 0, appliedDps: 0, application: 0, volley: 0 });
    return { ...primary, damage: totalDamage };
  }

  private singleAttack(side: Side, state: AttackState): { shipA?: AttackState; shipB?: AttackState } {
    return side === "shipA" ? { shipA: state } : { shipB: state };
  }

  private sumDamage(acc: DamageAssessment, assessment: AttackAssessment): DamageAssessment {
    const nominalDps = acc.nominalDps + assessment.damage.nominalDps;
    const appliedDps = acc.appliedDps + assessment.damage.appliedDps;
    return {
      nominalDps,
      appliedDps,
      application: nominalDps > 0 ? appliedDps / nominalDps : 0,
      volley: acc.volley + assessment.damage.volley,
    };
  }
}
