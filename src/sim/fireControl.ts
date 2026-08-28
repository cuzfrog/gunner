import type { EwarResolver } from "./ewarResolver";
import type { HitChance } from "./hitChance";
import type { MissileApplication } from "./missileApplication";
import type { TurretBoosterResolver } from "./turretBoosterResolver";
import type { TurretDamage } from "./turretDamage";
import type {
  DamageAssessment,
  EngagementFrame,
  HitChanceBreakdown,
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
}

export interface AttackAssessment {
  readonly boostedWeapon: WeaponSpec;
  readonly effectiveWeapon: WeaponSpec;
  readonly damage: DamageAssessment;
  readonly turret?: TurretDamageBreakdown;
  readonly missile?: MissileDamageBreakdown;
}

export interface EngagementEvaluator {
  evaluate(frame: EngagementFrame, attacks: { readonly shipA?: AttackState; readonly shipB?: AttackState }): Record<Side, AttackAssessment | undefined>;
}

export class EngagementEvaluatorImpl implements EngagementEvaluator {
  private readonly hitChance: HitChance;
  private readonly ewarResolver: EwarResolver;
  private readonly boosters: TurretBoosterResolver;
  private readonly turretDamage: TurretDamage;
  private readonly missileApplication: MissileApplication;

  constructor({ hitChance, ewarResolver, turretBoosterResolver, turretDamage, missileApplication }: {
    hitChance: HitChance;
    ewarResolver: EwarResolver;
    turretBoosterResolver: TurretBoosterResolver;
    turretDamage: TurretDamage;
    missileApplication: MissileApplication;
  }) {
    this.hitChance = hitChance;
    this.ewarResolver = ewarResolver;
    this.boosters = turretBoosterResolver;
    this.turretDamage = turretDamage;
    this.missileApplication = missileApplication;
  }

  evaluate(frame: EngagementFrame, attacks: { readonly shipA?: AttackState; readonly shipB?: AttackState }): Record<Side, AttackAssessment | undefined> {
    return {
      shipA: attacks.shipA ? this.assess(frame, frame.shipA, frame.shipB, attacks.shipA) : undefined,
      shipB: attacks.shipB ? this.assess(frame, frame.shipB, frame.shipA, attacks.shipB) : undefined,
    };
  }

  private assess(frame: EngagementFrame, ship: ShipState, opponent: ShipState, attack: AttackState): AttackAssessment {
    if (attack.weapon.kind === "turret") {
      return this.assessTurret(frame, ship, opponent, attack.weapon, attack.opponentSigRadius);
    }
    return this.assessMissile(frame, opponent, attack.weapon, attack.opponentSigRadius);
  }

  private assessTurret(frame: EngagementFrame, ship: ShipState, opponent: ShipState, turret: TurretSpec, opponentSigRadius: number): AttackAssessment {
    const boosted = this.boosters.boostedTurret(turret, ship.boosts);
    const effectiveTurret = this.ewarResolver.disruptedTurret(boosted, opponent.ewar, frame.distance);
    const hit = this.hitChance.compute(frame, effectiveTurret, opponentSigRadius);
    const damage = this.turretDamage.compute(hit, effectiveTurret);
    return { boostedWeapon: boosted, effectiveWeapon: effectiveTurret, damage, turret: { hit, expectedMultiplier: damage.application } };
  }

  private assessMissile(frame: EngagementFrame, opponent: ShipState, missile: MissileSpec, opponentSigRadius: number): AttackAssessment {
    const breakdown = this.missileApplication.compute(frame, missile, opponent, opponentSigRadius);
    const nominalDps = missile.cycleTime > 0 ? (missile.damagePerMissile * missile.launcherCount) / missile.cycleTime : 0;
    const appliedDps = breakdown.inRange ? nominalDps * breakdown.application : 0;
    const volley = missile.damagePerMissile * missile.launcherCount;
    const damage: DamageAssessment = {
      nominalDps,
      appliedDps,
      application: breakdown.inRange ? breakdown.application : 0,
      volley,
    };
    return { boostedWeapon: missile, effectiveWeapon: missile, damage, missile: breakdown };
  }
}
