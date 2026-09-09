import type { EwarResolver } from "./ewarResolver";
import { computeExpectedMultiplier } from "./expectedHitMultiplier";
import type { HitChance } from "./hitChance";
import type { MissileBoosterResolver } from "./missileBoosterResolver";
import type { TurretBoosterResolver } from "./turretBoosterResolver";
import type { WeaponDamageAssessor } from "./weaponDamageAssessor";
import type { DroneApplication } from "./droneApplication";
import type {
  DamageAssessment,
  DroneDamageBreakdown,
  DroneRuntimeState,
  DroneSpec,
  EngagementFrame,
  MissileAttackFacts,
  MissileDamageBreakdown,
  MissileSpec,
  ShipState,
  Side,
  TurretDamageBreakdown,
  TurretSpec,
  WeaponSpec,
} from "./types";
import { ZERO_DAMAGE, spoolMultiplier } from "./types";

export interface AttackState {
  readonly weapon: WeaponSpec;
  readonly opponentSigRadius: number;
  readonly droneState?: DroneRuntimeState;
  readonly missileFacts?: MissileAttackFacts;
  readonly spoolCycles?: number;
  readonly locked?: boolean;
}

export interface AttackAssessment {
  readonly boostedWeapon: WeaponSpec;
  readonly effectiveWeapon: WeaponSpec;
  readonly damage: DamageAssessment;
  readonly turret?: TurretDamageBreakdown;
  readonly missile?: MissileDamageBreakdown;
  readonly drone?: DroneDamageBreakdown;
}

export interface EngagementEvaluator {
  evaluate(frame: EngagementFrame, attacks: { readonly shipA?: AttackState; readonly shipB?: AttackState }): Record<Side, AttackAssessment | undefined>;
}

export class EngagementEvaluatorImpl implements EngagementEvaluator {
  private readonly hitChance: HitChance;
  private readonly ewarResolver: EwarResolver;
  private readonly boosters: TurretBoosterResolver;
  private readonly missileBoosters: MissileBoosterResolver;
  private readonly weaponDamageAssessor: WeaponDamageAssessor;
  private readonly droneApplication: DroneApplication;

  constructor({ hitChance, ewarResolver, turretBoosterResolver, missileBoosterResolver, weaponDamageAssessor, droneApplication }: {
    hitChance: HitChance;
    ewarResolver: EwarResolver;
    turretBoosterResolver: TurretBoosterResolver;
    missileBoosterResolver: MissileBoosterResolver;
    weaponDamageAssessor: WeaponDamageAssessor;
    droneApplication: DroneApplication;
  }) {
    this.hitChance = hitChance;
    this.ewarResolver = ewarResolver;
    this.boosters = turretBoosterResolver;
    this.missileBoosters = missileBoosterResolver;
    this.weaponDamageAssessor = weaponDamageAssessor;
    this.droneApplication = droneApplication;
  }

  evaluate(frame: EngagementFrame, attacks: { readonly shipA?: AttackState; readonly shipB?: AttackState }): Record<Side, AttackAssessment | undefined> {
    return {
      shipA: attacks.shipA ? this.assess(frame, frame.shipA, frame.shipB, attacks.shipA) : undefined,
      shipB: attacks.shipB ? this.assess(frame, frame.shipB, frame.shipA, attacks.shipB) : undefined,
    };
  }

  private assess(frame: EngagementFrame, ship: ShipState, opponent: ShipState, attack: AttackState): AttackAssessment {
    let assessment: AttackAssessment;
    if (attack.weapon.kind === "turret") {
      assessment = this.assessTurret(frame, ship, opponent, attack.weapon, attack.opponentSigRadius, attack.spoolCycles);
    } else if (attack.weapon.kind === "drone") {
      assessment = this.assessDrone(frame, ship, opponent, attack.weapon, attack.opponentSigRadius, attack.droneState);
    } else {
      if (!attack.missileFacts) throw new Error("MissileAttackFacts are required to assess a missile weapon");
      assessment = this.assessMissile(ship, attack.weapon, attack.missileFacts);
    }
    if (attack.locked === false) return zeroAppliedDps(assessment);
    return assessment;
  }

  private assessTurret(frame: EngagementFrame, ship: ShipState, opponent: ShipState, turret: TurretSpec, opponentSigRadius: number, spoolCycles: number | undefined): AttackAssessment {
    const paintedSig = opponentSigRadius * this.ewarResolver.sigMultiplier(ship.ewar, frame.distance);
    const boosted = this.boosters.boostedTurret(turret, ship.boosts);
    const effectiveTurret = this.ewarResolver.disruptedTurret(boosted, opponent.ewar, frame.distance);
    const hit = this.hitChance.compute(frame, effectiveTurret, paintedSig);
    const expectedMultiplier = computeExpectedMultiplier(hit.chance);
    const inOptimal = frame.distance <= effectiveTurret.optimal;
    const spoolFactor = spoolMultiplier(effectiveTurret.spool, spoolCycles ?? 0);
    // A spooling disintegrator deactivates while its target is beyond optimal; the assessment keeps its
    // spool-inclusive nominal DPS but zeroes application so no damage is applied. Non-spooling turrets
    // keep firing beyond optimal (falloff application still applies).
    const damage = this.weaponDamageAssessor.assess(effectiveTurret, expectedMultiplier, inOptimal || effectiveTurret.spool === undefined, spoolFactor);
    return { boostedWeapon: boosted, effectiveWeapon: effectiveTurret, damage, turret: { hit, expectedMultiplier: damage.application, spoolFactor, inOptimal } };
  }

  private assessMissile(ship: ShipState, missile: MissileSpec, facts: MissileAttackFacts): AttackAssessment {
    const boosted = this.missileBoosters.boostedMissile(missile, ship.missileBoosts);
    const application = facts.predicted.application;
    const breakdown: MissileDamageBreakdown = {
      application,
      signatureTerm: facts.predicted.signatureTerm,
      velocityTerm: facts.predicted.velocityTerm,
      inRange: facts.interceptable,
      timeToImpact: facts.nearestTimeToImpact,
    };
    const damage = this.weaponDamageAssessor.assess(boosted, application, facts.interceptable);
    return { boostedWeapon: boosted, effectiveWeapon: boosted, damage, missile: breakdown };
  }

  private assessDrone(frame: EngagementFrame, ship: ShipState, opponent: ShipState, drone: DroneSpec, opponentSigRadius: number, droneState: DroneRuntimeState | undefined): AttackAssessment {
    const paintedSig = opponentSigRadius * this.ewarResolver.sigMultiplier(ship.ewar, frame.distance);
    const breakdown = this.droneApplication.compute(frame, drone, opponentSigRadius, droneState);
    return { boostedWeapon: drone, effectiveWeapon: drone, damage: breakdown, drone: breakdown };
  }
}

function zeroAppliedDps(assessment: AttackAssessment): AttackAssessment {
  const { nominalDps, volley, baseVolleyByType } = assessment.damage;
  const zeroed: DamageAssessment = { nominalDps, appliedDps: 0, application: 0, volley, baseVolleyByType, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
  return { ...assessment, damage: zeroed };
}
