import type { EwarResolver } from "./ewarResolver";
import type { HitChance } from "./hitChance";
import type { MissileApplication } from "./missileApplication";
import type { MissileBoosterResolver } from "./missileBoosterResolver";
import type { TurretBoosterResolver } from "./turretBoosterResolver";
import type { TurretDamage } from "./turretDamage";
import type { DroneApplication } from "./droneApplication";
import type {
  DamageAssessment,
  DroneDamageBreakdown,
  DroneRuntimeState,
  DroneSpec,
  EngagementFrame,
  HitChanceBreakdown,
  MissileAttackFacts,
  MissileDamageBreakdown,
  MissileSpec,
  ShipState,
  Side,
  TurretDamageBreakdown,
  TurretSpec,
  WeaponSpec,
} from "./types";

export interface AttackState {
  readonly weapon: WeaponSpec;
  readonly opponentSigRadius: number;
  readonly droneState?: DroneRuntimeState;
  readonly missileFacts?: MissileAttackFacts;
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
  private readonly turretDamage: TurretDamage;
  private readonly missileApplication: MissileApplication;
  private readonly droneApplication: DroneApplication;

  constructor({ hitChance, ewarResolver, turretBoosterResolver, missileBoosterResolver, turretDamage, missileApplication, droneApplication }: {
    hitChance: HitChance;
    ewarResolver: EwarResolver;
    turretBoosterResolver: TurretBoosterResolver;
    missileBoosterResolver: MissileBoosterResolver;
    turretDamage: TurretDamage;
    missileApplication: MissileApplication;
    droneApplication: DroneApplication;
  }) {
    this.hitChance = hitChance;
    this.ewarResolver = ewarResolver;
    this.boosters = turretBoosterResolver;
    this.missileBoosters = missileBoosterResolver;
    this.turretDamage = turretDamage;
    this.missileApplication = missileApplication;
    this.droneApplication = droneApplication;
  }

  evaluate(frame: EngagementFrame, attacks: { readonly shipA?: AttackState; readonly shipB?: AttackState }): Record<Side, AttackAssessment | undefined> {
    return {
      shipA: attacks.shipA ? this.assess(frame, frame.shipA, frame.shipB, attacks.shipA) : undefined,
      shipB: attacks.shipB ? this.assess(frame, frame.shipB, frame.shipA, attacks.shipB) : undefined,
    };
  }

  private assess(frame: EngagementFrame, ship: ShipState, opponent: ShipState, attack: AttackState): AttackAssessment {
    const paintedSig = attack.opponentSigRadius * this.ewarResolver.sigMultiplier(ship.ewar, frame.distance);
    if (attack.weapon.kind === "turret") {
      return this.assessTurret(frame, ship, opponent, attack.weapon, paintedSig);
    }
    if (attack.weapon.kind === "drone") {
      return this.assessDrone(frame, ship, opponent, attack.weapon, paintedSig, attack.droneState);
    }
    return this.assessMissile(frame, ship, opponent, attack.weapon, paintedSig, attack.missileFacts);
  }

  private assessTurret(frame: EngagementFrame, ship: ShipState, opponent: ShipState, turret: TurretSpec, opponentSigRadius: number): AttackAssessment {
    const boosted = this.boosters.boostedTurret(turret, ship.boosts);
    const effectiveTurret = this.ewarResolver.disruptedTurret(boosted, opponent.ewar, frame.distance);
    const hit = this.hitChance.compute(frame, effectiveTurret, opponentSigRadius);
    const damage = this.turretDamage.compute(hit, effectiveTurret);
    return { boostedWeapon: boosted, effectiveWeapon: effectiveTurret, damage, turret: { hit, expectedMultiplier: damage.application } };
  }

  private assessMissile(frame: EngagementFrame, ship: ShipState, opponent: ShipState, missile: MissileSpec, opponentSigRadius: number, facts?: MissileAttackFacts): AttackAssessment {
    const boosted = this.missileBoosters.boostedMissile(missile, ship.missileBoosts);
    const nominalDps = boosted.cycleTime > 0 ? (boosted.damagePerMissile * boosted.launcherCount) / boosted.cycleTime : 0;
    const volley = boosted.damagePerMissile * boosted.launcherCount;
    if (facts) {
      const appliedDps = facts.rollingAppliedDps;
      const application = nominalDps > 0 ? appliedDps / nominalDps : 0;
      const breakdown: MissileDamageBreakdown = {
        application: facts.lastImpact?.application ?? 0,
        signatureTerm: facts.lastImpact?.signatureTerm ?? 1,
        velocityTerm: facts.lastImpact?.velocityTerm ?? 1,
        inRange: facts.interceptable,
        timeToImpact: facts.nearestTimeToImpact,
      };
      return { boostedWeapon: boosted, effectiveWeapon: boosted, damage: { nominalDps, appliedDps, application, volley }, missile: breakdown };
    }
    const result = this.missileApplication.compute(boosted, opponent.velocity.len(), opponentSigRadius);
    const inRange = frame.distance <= boosted.flightRange;
    const timeToImpact = boosted.maxVelocity > 0 ? frame.distance / boosted.maxVelocity : 0;
    const breakdown: MissileDamageBreakdown = { ...result, inRange, timeToImpact };
    const appliedDps = inRange ? nominalDps * result.application : 0;
    return { boostedWeapon: boosted, effectiveWeapon: boosted, damage: { nominalDps, appliedDps, application: inRange ? result.application : 0, volley }, missile: breakdown };
  }

  private assessDrone(frame: EngagementFrame, ship: ShipState, opponent: ShipState, drone: DroneSpec, opponentSigRadius: number, droneState: DroneRuntimeState | undefined): AttackAssessment {
    const breakdown = this.droneApplication.compute(frame, drone, opponentSigRadius, droneState);
    return { boostedWeapon: drone, effectiveWeapon: drone, damage: breakdown, drone: breakdown };
  }
}
