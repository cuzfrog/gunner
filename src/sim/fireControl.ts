import type { EwarResolver } from "./ewarResolver";
import type { HitChance } from "./hitChance";
import type { Kinematics } from "./kinematics";
import type { TurretBoosterResolver } from "./turretBoosterResolver";
import type { EngagementFrame, HitChanceBreakdown, ShipState, SimSnapshot, TurretSpec } from "./types";

export interface AttackState {
  readonly turret: TurretSpec;
  readonly shipBSigRadius: number;
}

export interface AttackAssessment {
  readonly boostedTurret: TurretSpec;
  readonly effectiveTurret: TurretSpec;
  readonly hit: HitChanceBreakdown;
}

export interface EngagementEvaluator {
  evaluate(snapshot: SimSnapshot, attacks: { readonly shipA?: AttackState; readonly shipB?: AttackState }): {
    readonly shipA?: AttackAssessment;
    readonly shipB?: AttackAssessment;
  };
}

export class EngagementEvaluatorImpl implements EngagementEvaluator {
  private readonly kinematics: Kinematics;
  private readonly hitChance: HitChance;
  private readonly ewarResolver: EwarResolver;
  private readonly boosters: TurretBoosterResolver;

  constructor({ kinematics, hitChance, ewarResolver, turretBoosterResolver }: {
    kinematics: Kinematics;
    hitChance: HitChance;
    ewarResolver: EwarResolver;
    turretBoosterResolver: TurretBoosterResolver;
  }) {
    this.kinematics = kinematics;
    this.hitChance = hitChance;
    this.ewarResolver = ewarResolver;
    this.boosters = turretBoosterResolver;
  }

  evaluate(snapshot: SimSnapshot, attacks: { readonly shipA?: AttackState; readonly shipB?: AttackState }): {
    readonly shipA?: AttackAssessment;
    readonly shipB?: AttackAssessment;
  } {
    const result: { shipA?: AttackAssessment; shipB?: AttackAssessment } = {};
    if (attacks.shipA) {
      result.shipA = this.assess(snapshot.shipA, snapshot.shipB, snapshot.time, attacks.shipA);
    }
    if (attacks.shipB) {
      result.shipB = this.assess(snapshot.shipB, snapshot.shipA, snapshot.time, attacks.shipB);
    }
    return result;
  }

  private assess(ship: ShipState, opponent: ShipState, time: number, attack: AttackState): AttackAssessment {
    const frame = this.kinematics.computeEngagement(ship, opponent, time);
    const boosted = this.boosters.boostedTurret(attack.turret, ship.boosts);
    const effectiveTurret = this.ewarResolver.disruptedTurret(boosted, opponent.ewar, frame.distance);
    const hit = this.hitChance.compute(frame, effectiveTurret, attack.shipBSigRadius);
    return { boostedTurret: boosted, effectiveTurret, hit };
  }
}
