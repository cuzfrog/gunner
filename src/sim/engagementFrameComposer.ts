import type { AttackAssessment, AttackState, EngagementEvaluator } from "./fireControl";
import type { Kinematics } from "./kinematics";
import type { EngagementFrame, Side, SimSnapshot, WeaponSpec } from "./types";

export interface EngagementInput {
  readonly weapons: Record<Side, WeaponSpec | undefined>;
  readonly sigRadii: Record<Side, number>;
}

export interface EngagementView {
  readonly frame: EngagementFrame;
  readonly attacks: Record<Side, AttackAssessment | undefined>;
  readonly effectiveWeapons: Record<Side, WeaponSpec | undefined>;
}

export interface EngagementFrameComposer {
  compose(snapshot: SimSnapshot, input: EngagementInput): EngagementView;
}

export class EngagementFrameComposerImpl implements EngagementFrameComposer {
  private readonly kinematics: Kinematics;
  private readonly engagementEvaluator: EngagementEvaluator;

  constructor({ kinematics, engagementEvaluator }: {
    kinematics: Kinematics;
    engagementEvaluator: EngagementEvaluator;
  }) {
    this.kinematics = kinematics;
    this.engagementEvaluator = engagementEvaluator;
  }

  compose(snapshot: SimSnapshot, input: EngagementInput): EngagementView {
    const frame = this.kinematics.computeEngagement(snapshot.shipA, snapshot.shipB, snapshot.time);
    const attacks = this.engagementEvaluator.evaluate(frame, {
      shipA: input.weapons.shipA ? { weapon: input.weapons.shipA, opponentSigRadius: input.sigRadii.shipB } : undefined,
      shipB: input.weapons.shipB ? { weapon: input.weapons.shipB, opponentSigRadius: input.sigRadii.shipA } : undefined,
    });
    const effectiveWeapons: Record<Side, WeaponSpec | undefined> = {
      shipA: attacks.shipA?.effectiveWeapon ?? input.weapons.shipA,
      shipB: attacks.shipB?.effectiveWeapon ?? input.weapons.shipB,
    };
    return { frame, attacks, effectiveWeapons };
  }
}
