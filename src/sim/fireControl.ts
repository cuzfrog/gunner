import type { EwarResolver } from "./ewarResolver";
import type { HitChance } from "./hitChance";
import type { TurretBoosterResolver } from "./turretBoosterResolver";
import type { EngagementFrame, HitChanceBreakdown, ShipState, Side, TurretSpec } from "./types";

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
  evaluate(frame: EngagementFrame, attacks: { readonly shipA?: AttackState; readonly shipB?: AttackState }): Record<Side, AttackAssessment | undefined>;
}

export class EngagementEvaluatorImpl implements EngagementEvaluator {
  private readonly hitChance: HitChance;
  private readonly ewarResolver: EwarResolver;
  private readonly boosters: TurretBoosterResolver;

  constructor({ hitChance, ewarResolver, turretBoosterResolver }: {
    hitChance: HitChance;
    ewarResolver: EwarResolver;
    turretBoosterResolver: TurretBoosterResolver;
  }) {
    this.hitChance = hitChance;
    this.ewarResolver = ewarResolver;
    this.boosters = turretBoosterResolver;
  }

  evaluate(frame: EngagementFrame, attacks: { readonly shipA?: AttackState; readonly shipB?: AttackState }): Record<Side, AttackAssessment | undefined> {
    return {
      shipA: attacks.shipA ? this.assess(frame, frame.shipA, frame.shipB, attacks.shipA) : undefined,
      shipB: attacks.shipB ? this.assess(frame, frame.shipB, frame.shipA, attacks.shipB) : undefined,
    };
  }

  private assess(frame: EngagementFrame, ship: ShipState, opponent: ShipState, attack: AttackState): AttackAssessment {
    const boosted = this.boosters.boostedTurret(attack.turret, ship.boosts);
    const effectiveTurret = this.ewarResolver.disruptedTurret(boosted, opponent.ewar, frame.distance);
    const hit = this.hitChance.compute(frame, effectiveTurret, attack.targetSigRadius);
    return { boostedTurret: boosted, effectiveTurret, hit };
  }
}
