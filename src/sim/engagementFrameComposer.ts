import type { AttackAssessment, AttackState, EngagementEvaluator } from "./fireControl";
import type { Kinematics } from "./kinematics";
import type { DefenseAssessor, DefenseAssessment } from "./defenseAssessment";
import type { DamageAssessment, DefenseSpec, DroneRuntimeState, EngagementFrame, MissileAttackFacts, Side, SimSnapshot, WeaponSpec } from "./types";
import { ZERO_DAMAGE, damageVectorAdd } from "./types";

export interface EngagementInput {
  readonly weapons: Record<Side, readonly WeaponSpec[]>;
  readonly sigRadii: Record<Side, number>;
  readonly droneStates: Record<Side, readonly DroneRuntimeState[]>;
  readonly missileFacts: Record<Side, readonly MissileAttackFacts[]>;
  readonly defenses: Record<Side, DefenseSpec>;
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
  readonly defenses: Record<Side, DefenseAssessment>;
}

export interface EngagementFrameComposer {
  compose(snapshot: SimSnapshot, input: EngagementInput): EngagementView;
}

export class EngagementFrameComposerImpl implements EngagementFrameComposer {
  private readonly kinematics: Kinematics;
  private readonly engagementEvaluator: EngagementEvaluator;
  private readonly defenseAssessor: DefenseAssessor;

  constructor({ kinematics, engagementEvaluator, defenseAssessor }: {
    kinematics: Kinematics;
    engagementEvaluator: EngagementEvaluator;
    defenseAssessor: DefenseAssessor;
  }) {
    this.kinematics = kinematics;
    this.engagementEvaluator = engagementEvaluator;
    this.defenseAssessor = defenseAssessor;
  }

  compose(snapshot: SimSnapshot, input: EngagementInput): EngagementView {
    const frame = this.kinematics.computeEngagement(snapshot.shipA, snapshot.shipB, snapshot.time);
    const shipAWeapons = input.weapons.shipA;
    const shipBWeapons = input.weapons.shipB;
    if (shipAWeapons.length <= 1 && shipBWeapons.length <= 1) {
      const attacks = this.engagementEvaluator.evaluate(frame, {
        shipA: shipAWeapons.length === 1 ? { weapon: shipAWeapons[0], opponentSigRadius: input.sigRadii.shipB, droneState: droneStateFor(input.droneStates.shipA, shipAWeapons[0], 0), missileFacts: missileFactsFor(input.missileFacts.shipA, shipAWeapons[0], 0) } : undefined,
        shipB: shipBWeapons.length === 1 ? { weapon: shipBWeapons[0], opponentSigRadius: input.sigRadii.shipA, droneState: droneStateFor(input.droneStates.shipB, shipBWeapons[0], 0), missileFacts: missileFactsFor(input.missileFacts.shipB, shipBWeapons[0], 0) } : undefined,
      });
      const weaponAttacks: Record<Side, readonly WeaponAttack[]> = {
        shipA: weaponAttacksFrom(attacks.shipA, shipAWeapons[0]),
        shipB: weaponAttacksFrom(attacks.shipB, shipBWeapons[0]),
      };
      const effectiveWeapons: Record<Side, WeaponSpec | undefined> = {
        shipA: attacks.shipA?.effectiveWeapon ?? shipAWeapons[0],
        shipB: attacks.shipB?.effectiveWeapon ?? shipBWeapons[0],
      };
      const defenses = this.assessDefenses(input, attacks);
      return { frame, attacks, weaponAttacks, effectiveWeapons, defenses };
    }
    const shipAResult = this.assessSide(frame, "shipA", shipAWeapons, input.sigRadii.shipB, input.droneStates.shipA, input.missileFacts.shipA);
    const shipBResult = this.assessSide(frame, "shipB", shipBWeapons, input.sigRadii.shipA, input.droneStates.shipB, input.missileFacts.shipB);
    const attacks: Record<Side, AttackAssessment | undefined> = { shipA: shipAResult.combined, shipB: shipBResult.combined };
    const weaponAttacks: Record<Side, readonly WeaponAttack[]> = { shipA: shipAResult.weaponAttacks, shipB: shipBResult.weaponAttacks };
    const effectiveWeapons: Record<Side, WeaponSpec | undefined> = {
      shipA: attacks.shipA?.effectiveWeapon ?? shipAWeapons[0],
      shipB: attacks.shipB?.effectiveWeapon ?? shipBWeapons[0],
    };
    const defenses = this.assessDefenses(input, attacks);
    return { frame, attacks, weaponAttacks, effectiveWeapons, defenses };
  }

  private assessDefenses(input: EngagementInput, attacks: Record<Side, AttackAssessment | undefined>): Record<Side, DefenseAssessment> {
    const shipAIncoming = attacks.shipB?.damage.appliedByType ?? ZERO_DAMAGE;
    const shipBIncoming = attacks.shipA?.damage.appliedByType ?? ZERO_DAMAGE;
    return {
      shipA: this.defenseAssessor.assess(input.defenses.shipA, shipAIncoming),
      shipB: this.defenseAssessor.assess(input.defenses.shipB, shipBIncoming),
    };
  }

  private assessSide(frame: EngagementFrame, side: Side, weapons: readonly WeaponSpec[], opponentSigRadius: number, droneStates: readonly DroneRuntimeState[], missileFacts: readonly MissileAttackFacts[]): { combined: AttackAssessment | undefined; weaponAttacks: readonly WeaponAttack[] } {
    const weaponAttacks: WeaponAttack[] = [];
    let droneIndex = 0;
    let missileIndex = 0;
    for (const weapon of weapons) {
      const droneState = droneStateFor(droneStates, weapon, droneIndex);
      const facts = missileFactsFor(missileFacts, weapon, missileIndex);
      if (weapon.kind === "drone") droneIndex++;
      if (weapon.kind === "missile") missileIndex++;
      const assessment = this.engagementEvaluator.evaluate(frame, singleAttack(side, { weapon, opponentSigRadius, droneState, missileFacts: facts }))[side];
      if (assessment) weaponAttacks.push({ weapon, assessment });
    }
    if (weaponAttacks.length === 0) return { combined: undefined, weaponAttacks: [] };
    if (weaponAttacks.length === 1) return { combined: weaponAttacks[0].assessment, weaponAttacks };
    const primary = weaponAttacks[0].assessment;
    const initialDamage: DamageAssessment = { nominalDps: 0, appliedDps: 0, application: 0, volley: 0, appliedByType: ZERO_DAMAGE };
    const totalDamage = weaponAttacks.reduce<DamageAssessment>(sumDamage, initialDamage);
    return { combined: { ...primary, damage: totalDamage }, weaponAttacks };
  }
}

function weaponAttacksFrom(assessment: AttackAssessment | undefined, weapon: WeaponSpec | undefined): readonly WeaponAttack[] {
  if (assessment && weapon) return [{ weapon, assessment }];
  return [];
}

function singleAttack(side: Side, state: AttackState): { shipA?: AttackState; shipB?: AttackState } {
  return side === "shipA" ? { shipA: state } : { shipB: state };
}

function sumDamage(acc: DamageAssessment, weaponAttack: WeaponAttack): DamageAssessment {
  const nominalDps = acc.nominalDps + weaponAttack.assessment.damage.nominalDps;
  const appliedDps = acc.appliedDps + weaponAttack.assessment.damage.appliedDps;
  return {
    nominalDps,
    appliedDps,
    application: nominalDps > 0 ? appliedDps / nominalDps : 0,
    volley: acc.volley + weaponAttack.assessment.damage.volley,
    appliedByType: damageVectorAdd(acc.appliedByType, weaponAttack.assessment.damage.appliedByType),
  };
}

function droneStateFor(states: readonly DroneRuntimeState[], weapon: WeaponSpec, index: number): DroneRuntimeState | undefined {
  if (weapon.kind !== "drone") return undefined;
  return states[index];
}

function missileFactsFor(facts: readonly MissileAttackFacts[], weapon: WeaponSpec, index: number): MissileAttackFacts | undefined {
  if (weapon.kind !== "missile") return undefined;
  return facts[index];
}
