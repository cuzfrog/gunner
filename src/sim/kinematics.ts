import { dot, len, scale, sub, vec } from "../math";
import type { EngagementFrame, ShipState } from "./types";

export interface Kinematics {
  computeEngagement(attacker: ShipState, target: ShipState, time: number): EngagementFrame;
}

export class KinematicsImpl implements Kinematics {
  computeEngagement(attacker: ShipState, target: ShipState, time: number): EngagementFrame {
    const relPosition = sub(target.position, attacker.position);
    const distance = len(relPosition);
    const relVelocity = sub(target.velocity, attacker.velocity);
    const rHat = distance > 0 ? scale(relPosition, 1 / distance) : vec(1, 0);

    const radialVelocity = dot(relVelocity, rHat);
    const transversalVelocity = sub(relVelocity, scale(rHat, radialVelocity));
    const transversalSpeed = len(transversalVelocity);
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
