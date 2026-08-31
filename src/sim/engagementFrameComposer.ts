import type { AttackAssessment, AttackState, EngagementEvaluator } from "./fireControl";
import type { Kinematics } from "./kinematics";
import type { DamageAssessment, EngagementFrame, Side, SimSnapshot, WeaponSpec } from "./types";

export interface EngagementInput {
  readonly weapons: Record<Side, readonly WeaponSpec[]>;
  readonly sigRadii: Record<Side, number>;
}

export interface WeaponAttack {
  readonly weapon: WeaponSpec;
  readonly assessment: AttackAssessment;
}

export interface EngagementView {
  readonly frame: EngagementFrame;
  readonly attacks: Record<Side, AttackAssessment | undefined>;
  readonly weaponAttacks: Record<Side, readonly WeaponAttack[]>;
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
    if (shipAWeapons.length <= 1 && shipBWeapons.length <= 1) {
      const attacks = this.engagementEvaluator.evaluate(frame, {
        shipA: shipAWeapons.length === 1 ? { weapon: shipAWeapons[0], opponentSigRadius: input.sigRadii.shipB } : undefined,
        shipB: shipBWeapons.length === 1 ? { weapon: shipBWeapons[0], opponentSigRadius: input.sigRadii.shipA } : undefined,
      });
      const weaponAttacks: Record<Side, readonly WeaponAttack[]> = {
        shipA: this.weaponAttacksFrom(attacks.shipA, shipAWeapons[0]),
        shipB: this.weaponAttacksFrom(attacks.shipB, shipBWeapons[0]),
      };
      const effectiveWeapons: Record<Side, WeaponSpec | undefined> = {
        shipA: attacks.shipA?.effectiveWeapon ?? shipAWeapons[0],
        shipB: attacks.shipB?.effectiveWeapon ?? shipBWeapons[0],
      };
      return { frame, attacks, weaponAttacks, effectiveWeapons };
    }
    const shipAResult = this.assessSide(frame, "shipA", shipAWeapons, input.sigRadii.shipB);
    const shipBResult = this.assessSide(frame, "shipB", shipBWeapons, input.sigRadii.shipA);
    const attacks: Record<Side, AttackAssessment | undefined> = { shipA: shipAResult?.combined, shipB: shipBResult?.combined };
    const weaponAttacks: Record<Side, readonly WeaponAttack[]> = { shipA: shipAResult?.weaponAttacks ?? [], shipB: shipBResult?.weaponAttacks ?? [] };
    const effectiveWeapons: Record<Side, WeaponSpec | undefined> = {
      shipA: attacks.shipA?.effectiveWeapon ?? shipAWeapons[0],
      shipB: attacks.shipB?.effectiveWeapon ?? shipBWeapons[0],
    };
    return { frame, attacks, weaponAttacks, effectiveWeapons };
  }

  private assessSide(frame: EngagementFrame, side: Side, weapons: readonly WeaponSpec[], opponentSigRadius: number): { combined: AttackAssessment | undefined; weaponAttacks: readonly WeaponAttack[] } | undefined {
    if (weapons.length === 0) return undefined;
    const weaponAttacks: WeaponAttack[] = [];
    for (const weapon of weapons) {
      const assessment = this.engagementEvaluator.evaluate(frame, this.singleAttack(side, { weapon, opponentSigRadius }))[side];
      if (assessment) weaponAttacks.push({ weapon, assessment });
    }
    if (weaponAttacks.length === 0) return { combined: undefined, weaponAttacks: [] };
    if (weaponAttacks.length === 1) return { combined: weaponAttacks[0].assessment, weaponAttacks };
    const primary = weaponAttacks[0].assessment;
    const totalDamage = weaponAttacks.reduce<DamageAssessment>(this.sumDamage, { nominalDps: 0, appliedDps: 0, application: 0, volley: 0 });
    return { combined: { ...primary, damage: totalDamage }, weaponAttacks };
  }

  private weaponAttacksFrom(assessment: AttackAssessment | undefined, weapon: WeaponSpec | undefined): readonly WeaponAttack[] {
    if (assessment && weapon) return [{ weapon, assessment }];
    return [];
  }

  private singleAttack(side: Side, state: AttackState): { shipA?: AttackState; shipB?: AttackState } {
    return side === "shipA" ? { shipA: state } : { shipB: state };
  }

  private sumDamage(acc: DamageAssessment, weaponAttack: WeaponAttack): DamageAssessment {
    const nominalDps = acc.nominalDps + weaponAttack.assessment.damage.nominalDps;
    const appliedDps = acc.appliedDps + weaponAttack.assessment.damage.appliedDps;
    return {
      nominalDps,
      appliedDps,
      application: nominalDps > 0 ? appliedDps / nominalDps : 0,
      volley: acc.volley + weaponAttack.assessment.damage.volley,
    };
  }
}
