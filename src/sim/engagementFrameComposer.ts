import type { AttackAssessment, AttackState, EngagementEvaluator } from "./fireControl";
import type { HitChance } from "./hitChance";
import type { Kinematics } from "./kinematics";
import type { EngagementFrame, HitChanceBreakdown, Side, SimSnapshot, TurretSpec } from "./types";

export interface EngagementInput {
  readonly turrets: Record<Side, TurretSpec>;
  readonly sigRadii: Record<Side, number>;
}

export interface EngagementView {
  readonly frame: EngagementFrame;
  readonly attacks: Record<Side, AttackAssessment | undefined>;
  readonly effectiveTurrets: Record<Side, TurretSpec>;
  readonly hits: Record<Side, HitChanceBreakdown>;
}

export interface EngagementFrameComposer {
  compose(snapshot: SimSnapshot, input: EngagementInput): EngagementView;
}

export class EngagementFrameComposerImpl implements EngagementFrameComposer {
  private readonly kinematics: Kinematics;
  private readonly hitChance: HitChance;
  private readonly engagementEvaluator: EngagementEvaluator;

  constructor({ kinematics, hitChance, engagementEvaluator }: {
    kinematics: Kinematics;
    hitChance: HitChance;
    engagementEvaluator: EngagementEvaluator;
  }) {
    this.kinematics = kinematics;
    this.hitChance = hitChance;
    this.engagementEvaluator = engagementEvaluator;
  }

  compose(snapshot: SimSnapshot, input: EngagementInput): EngagementView {
    const frame = this.kinematics.computeEngagement(snapshot.shipA, snapshot.shipB, snapshot.time);
    const attacks = this.engagementEvaluator.evaluate(frame, {
      shipA: { turret: input.turrets.shipA, opponentSigRadius: input.sigRadii.shipB },
      shipB: { turret: input.turrets.shipB, opponentSigRadius: input.sigRadii.shipA },
    });
    const effectiveTurrets: Record<Side, TurretSpec> = {
      shipA: attacks.shipA?.effectiveTurret ?? input.turrets.shipA,
      shipB: attacks.shipB?.effectiveTurret ?? input.turrets.shipB,
    };
    const hits: Record<Side, HitChanceBreakdown> = {
      shipA: attacks.shipA?.hit ?? this.hitChance.compute(frame, effectiveTurrets.shipA, input.sigRadii.shipB),
      shipB: attacks.shipB?.hit ?? this.hitChance.compute(frame, effectiveTurrets.shipB, input.sigRadii.shipA),
    };
    return { frame, attacks, effectiveTurrets, hits };
  }
}
