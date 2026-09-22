import { type EngagementFrame, type ShipState, deriveEngagementFrame } from "./types";

export interface Kinematics {
  computeEngagement(shipA: ShipState, shipB: ShipState, time: number): EngagementFrame;
}

export class KinematicsImpl implements Kinematics {
  computeEngagement(shipA: ShipState, shipB: ShipState, time: number): EngagementFrame {
    return deriveEngagementFrame({ time, shipA, shipB, relPosition: shipB.position.sub(shipA.position), relVelocity: shipB.velocity.sub(shipA.velocity) });
  }
}
