import { Vec2 } from "./vec2";
import type { EngagementFrame, ShipState } from "./types";

export interface Kinematics {
  computeEngagement(attacker: ShipState, target: ShipState, time: number): EngagementFrame;
}

export class KinematicsImpl implements Kinematics {
  computeEngagement(attacker: ShipState, target: ShipState, time: number): EngagementFrame {
    const relPosition = target.position.sub(attacker.position);
    const distance = relPosition.len();
    const relVelocity = target.velocity.sub(attacker.velocity);
    const rHat = distance > 0 ? relPosition.scale(1 / distance) : new Vec2(1, 0);

    const radialVelocity = relVelocity.dot(rHat);
    const transversalVelocity = relVelocity.sub(rHat.scale(radialVelocity));
    const transversalSpeed = transversalVelocity.len();
    const angularVelocity = distance > 0 ? transversalSpeed / distance : 0;

    return {
      time,
      attacker,
      target,
      relPosition,
      distance,
      relVelocity,
      radialVelocity,
      transversalVelocity,
      transversalSpeed,
      angularVelocity,
    };
  }
}
