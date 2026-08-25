import type { AttackAssessment, AttackState, EngagementEvaluator } from "./fireControl";
import type { HitChance } from "./hitChance";
import type { Kinematics } from "./kinematics";
import type { EngagementFrame, HitChanceBreakdown, SimSnapshot, TurretSpec } from "./types";

export interface EngagementInput {
  readonly turret: TurretSpec;
  readonly shipBSigRadius: number;
}

export interface EngagementView {
  readonly frame: EngagementFrame;
  readonly assessment: AttackAssessment | undefined;
  readonly effectiveTurret: TurretSpec;
  readonly hit: HitChanceBreakdown;
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
    const attack: AttackState = { turret: input.turret, shipBSigRadius: input.shipBSigRadius };
    const result = this.engagementEvaluator.evaluate(snapshot, { shipA: attack });
    const assessment = result.shipA;
    const effectiveTurret = assessment?.effectiveTurret ?? input.turret;
    const hit = assessment?.hit ?? this.hitChance.compute(frame, input.turret, input.shipBSigRadius);
    return { frame, assessment, effectiveTurret, hit };
  }
}
