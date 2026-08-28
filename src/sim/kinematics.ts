import { Vec2 } from "./vec2";
import type { EngagementFrame, ShipState } from "./types";

export interface Kinematics {
  computeEngagement(shipA: ShipState, shipB: ShipState, time: number): EngagementFrame;
}

export class KinematicsImpl implements Kinematics {
  computeEngagement(shipA: ShipState, shipB: ShipState, time: number): EngagementFrame {
    const relPosition = shipB.position.sub(shipA.position);
    const distance = relPosition.len();
    const relVelocity = shipB.velocity.sub(shipA.velocity);
    const rHat = distance > 0 ? relPosition.scale(1 / distance) : new Vec2(1, 0);

    const radialVelocity = relVelocity.dot(rHat);
    const transversalVelocity = relVelocity.sub(rHat.scale(radialVelocity));
    const transversalSpeed = transversalVelocity.len();
    const angularVelocity = distance > 0 ? transversalSpeed / distance : 0;

    return {
      time,
      shipA,
      shipB,
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
