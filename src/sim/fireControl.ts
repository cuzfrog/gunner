import type { EwarResolver } from "./ewarResolver";
import { computeExpectedMultiplier } from "./expectedHitMultiplier";
import type { HitChance } from "./hitChance";
import type { MissileBoosterResolver } from "./missileBoosterResolver";
import type { TurretBoosterResolver } from "./turretBoosterResolver";
import type { WeaponDamageAssessor } from "./weaponDamageAssessor";
import type { DroneApplication } from "./droneApplication";
import type { FighterApplication } from "./fighterApplication";
import type { VortonApplication } from "./vortonApplication";
import type {
  DamageAssessment,
  DroneDamageBreakdown,
  DroneRuntimeState,
  DroneSpec,
  EngagementFrame,
  FighterDamageBreakdown,
  FighterSpec,
  MissileAttackFacts,
  MissileDamageBreakdown,
  MissileSpec,
  ShipState,
  Side,
  TurretDamageBreakdown,
  TurretSpec,
  VortonDamageBreakdown,
  VortonSpec,
  WeaponSpec,
} from "./types";
import { Vec2 } from "./vec2";
import { ZERO_DAMAGE, deriveEngagementFrame, spoolMultiplier, type UnitTargetKind, type UnitTargetParams } from "./types";

export interface AttackState {
  readonly weapon: WeaponSpec;
  /** Signature radius of the target after the attacker's target painters; derived once per frame by the engine and consumed as-is. */
  readonly paintedTargetSig: number;
  readonly droneState?: DroneRuntimeState;
  readonly missileFacts?: MissileAttackFacts;
  readonly spoolCycles?: number;
  readonly locked?: boolean;
  /** Set when the weapon engages an opponent drone/fighter instead of the ship (attack-drones targeting). */
  readonly unitTarget?: UnitTargetParams;
  /** Alive fighters in the squadron for this weapon index; scales the volley. */
  readonly fighterAliveCount?: number;
}

export interface AttackAssessment {
  readonly boostedWeapon: WeaponSpec;
  readonly effectiveWeapon: WeaponSpec;
  readonly damage: DamageAssessment;
  readonly turret?: TurretDamageBreakdown;
  readonly missile?: MissileDamageBreakdown;
  readonly drone?: DroneDamageBreakdown;
  readonly fighter?: FighterDamageBreakdown;
  readonly vorton?: VortonDamageBreakdown;
  readonly unitTarget?: UnitTargetKind;
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
  private readonly fighterApplication: FighterApplication;
  private readonly vortonApplication: VortonApplication;

  constructor({ hitChance, ewarResolver, turretBoosterResolver, missileBoosterResolver, weaponDamageAssessor, droneApplication, fighterApplication, vortonApplication }: {
    hitChance: HitChance;
    ewarResolver: EwarResolver;
    turretBoosterResolver: TurretBoosterResolver;
    missileBoosterResolver: MissileBoosterResolver;
    weaponDamageAssessor: WeaponDamageAssessor;
    droneApplication: DroneApplication;
    fighterApplication: FighterApplication;
    vortonApplication: VortonApplication;
  }) {
    this.hitChance = hitChance;
    this.ewarResolver = ewarResolver;
    this.boosters = turretBoosterResolver;
    this.missileBoosters = missileBoosterResolver;
    this.weaponDamageAssessor = weaponDamageAssessor;
    this.droneApplication = droneApplication;
    this.fighterApplication = fighterApplication;
    this.vortonApplication = vortonApplication;
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
      assessment = this.assessTurret(frame, ship, opponent, attack.weapon, attack.paintedTargetSig, attack.spoolCycles, attack.unitTarget);
    } else if (attack.weapon.kind === "drone") {
      assessment = this.assessDrone(frame, attack.weapon, attack.paintedTargetSig, attack.droneState);
    } else if (attack.weapon.kind === "fighter") {
      assessment = this.assessFighter(frame, opponent, attack.weapon, attack.paintedTargetSig, attack.fighterAliveCount);
    } else if (attack.weapon.kind === "vorton") {
      assessment = this.assessVorton(frame, opponent, attack.weapon, attack.paintedTargetSig);
    } else {
      if (!attack.missileFacts) throw new Error("MissileAttackFacts are required to assess a missile weapon");
      assessment = this.assessMissile(ship, attack.weapon, attack.missileFacts);
    }
    if (attack.locked === false) return zeroAppliedDps(assessment);
    return assessment;
  }

  private assessTurret(frame: EngagementFrame, ship: ShipState, opponent: ShipState, turret: TurretSpec, paintedTargetSig: number, spoolCycles: number | undefined, unitTarget?: UnitTargetParams): AttackAssessment {
    const boosted = this.boosters.boostedTurret(turret, ship.boosts);
    const effectiveTurret = this.ewarResolver.disruptedTurret(boosted, opponent.ewar, frame.distance);
    // Engaging a non-ship unit swaps the target params: the unit's own signature (never painted) and
    // its speed as transversal, at the unchanged ship-to-ship distance (drones orbit close to their ship).
    const hit = unitTarget ? this.hitChance.compute(unitTargetFrame(frame, unitTarget), effectiveTurret, unitTarget.signatureRadius) : this.hitChance.compute(frame, effectiveTurret, paintedTargetSig);
    const expectedMultiplier = computeExpectedMultiplier(hit.chance);
    const inOptimal = frame.distance <= effectiveTurret.optimal;
    const spoolFactor = spoolMultiplier(effectiveTurret.spool, spoolCycles ?? 0);
    // A spooling disintegrator deactivates while its target is beyond optimal; the assessment keeps its
    // spool-inclusive nominal DPS but zeroes application so no damage is applied. Non-spooling turrets
    // keep firing beyond optimal (falloff application still applies).
    const damage = this.weaponDamageAssessor.assess(effectiveTurret, expectedMultiplier, inOptimal || effectiveTurret.spool === undefined, spoolFactor);
    return { boostedWeapon: boosted, effectiveWeapon: effectiveTurret, damage, turret: { hit, expectedMultiplier: damage.application, spoolFactor, inOptimal }, ...(unitTarget ? { unitTarget: unitTarget.kind } : {}) };
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

  private assessDrone(frame: EngagementFrame, drone: DroneSpec, paintedTargetSig: number, droneState: DroneRuntimeState | undefined): AttackAssessment {
    const breakdown = this.droneApplication.compute(frame, drone, paintedTargetSig, droneState);
    return { boostedWeapon: drone, effectiveWeapon: drone, damage: breakdown, drone: breakdown };
  }

  private assessFighter(frame: EngagementFrame, opponent: ShipState, fighter: FighterSpec, paintedTargetSig: number, aliveCount?: number): AttackAssessment {
    const breakdown = this.fighterApplication.compute(fighter, opponent.velocity.len(), frame.distance, paintedTargetSig, aliveCount);
    return { boostedWeapon: fighter, effectiveWeapon: fighter, damage: breakdown, fighter: breakdown };
  }

  private assessVorton(frame: EngagementFrame, opponent: ShipState, vorton: VortonSpec, paintedTargetSig: number): AttackAssessment {
    const breakdown = this.vortonApplication.compute(vorton, frame.distance, opponent.velocity.len(), paintedTargetSig);
    return { boostedWeapon: vorton, effectiveWeapon: vorton, damage: breakdown, vorton: breakdown };
  }
}

/** Ship-weapon frame for a non-ship target: the unit orbits across the unchanged ship-to-ship LOS, so its speed is pure transversal at that distance. */
function unitTargetFrame(frame: EngagementFrame, unitTarget: UnitTargetParams): EngagementFrame {
  const rHat = frame.distance > 0 ? frame.relPosition.scale(1 / frame.distance) : new Vec2(1, 0);
  return deriveEngagementFrame({ time: frame.time, shipA: frame.shipA, shipB: frame.shipB, relPosition: frame.relPosition, relVelocity: rHat.perpCCW().scale(unitTarget.velocity) });
}

function zeroAppliedDps(assessment: AttackAssessment): AttackAssessment {
  const { nominalDps, volley, baseVolleyByType } = assessment.damage;
  const zeroed: DamageAssessment = { nominalDps, appliedDps: 0, application: 0, volley, baseVolleyByType, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
  return { ...assessment, damage: zeroed };
}
