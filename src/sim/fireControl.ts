import type { EwarResolver } from "./ewarResolver";
import type { HitChance } from "./hitChance";
import type { Kinematics } from "./kinematics";
import type { TurretBoosterResolver } from "./turretBoosterResolver";
import type { EngagementFrame, HitChanceBreakdown, ShipState, SimSnapshot, TurretSpec } from "./types";

export interface AttackState {
  readonly turret: TurretSpec;
  readonly targetSigRadius: number;
}

export interface AttackAssessment {
  readonly boostedTurret: TurretSpec;
  readonly effectiveTurret: TurretSpec;
  readonly hit: HitChanceBreakdown;
}

export interface EngagementEvaluator {
  evaluate(snapshot: SimSnapshot, attacks: { readonly attacker?: AttackState; readonly target?: AttackState }): {
    readonly attacker?: AttackAssessment;
    readonly target?: AttackAssessment;
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

  evaluate(snapshot: SimSnapshot, attacks: { readonly attacker?: AttackState; readonly target?: AttackState }): {
    readonly attacker?: AttackAssessment;
    readonly target?: AttackAssessment;
  } {
    const result: { attacker?: AttackAssessment; target?: AttackAssessment } = {};
    if (attacks.attacker) {
      result.attacker = this.assess(snapshot.attacker, snapshot.target, snapshot.time, attacks.attacker);
    }
    if (attacks.target) {
      result.target = this.assess(snapshot.target, snapshot.attacker, snapshot.time, attacks.target);
    }
    return result;
  }

  private assess(ship: ShipState, opponent: ShipState, time: number, attack: AttackState): AttackAssessment {
    const frame = this.kinematics.computeEngagement(ship, opponent, time);
    const boosted = this.boosters.boostedTurret(attack.turret, ship.boosts);
    const effectiveTurret = this.ewarResolver.disruptedTurret(boosted, opponent.ewar, frame.distance);
    const hit = this.hitChance.compute(frame, effectiveTurret, attack.targetSigRadius);
    return { boostedTurret: boosted, effectiveTurret, hit };
  }
}
