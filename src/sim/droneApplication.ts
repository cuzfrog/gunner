import { computeExpectedMultiplier } from "./expectedHitMultiplier";
import type { HitChance } from "./hitChance";
import type { DamageAssessment, DroneDamageBreakdown, DroneSpec, EngagementFrame } from "./types";

export interface DroneApplication {
  compute(frame: EngagementFrame, drone: DroneSpec, opponentSigRadius: number): DroneDamageBreakdown & DamageAssessment;
}

interface DroneApplicationDeps {
  readonly hitChance: HitChance;
}

export class DroneApplicationImpl implements DroneApplication {
  private readonly hitChance: HitChance;

  constructor({ hitChance }: DroneApplicationDeps) {
    this.hitChance = hitChance;
  }

  compute(frame: EngagementFrame, drone: DroneSpec, opponentSigRadius: number): DroneDamageBreakdown & DamageAssessment {
    const effective = droneEffectiveFrame(frame, drone);
    const hit = this.hitChance.compute(effective.frame, drone, opponentSigRadius);
    const expectedMultiplier = computeExpectedMultiplier(hit.chance);
    const nominalDps = drone.cycleTime > 0 ? (drone.damagePerShot * drone.droneCount) / drone.cycleTime : 0;
    const appliedDps = effective.inRange ? nominalDps * expectedMultiplier : 0;
    const volley = drone.damagePerShot * drone.droneCount;
    return { hit, expectedMultiplier, inRange: effective.inRange, orbiting: effective.orbiting, nominalDps, appliedDps, application: effective.inRange ? expectedMultiplier : 0, volley };
  }
}

interface DroneEffectiveFrame {
  readonly frame: EngagementFrame;
  readonly inRange: boolean;
  readonly orbiting: boolean;
}

function droneEffectiveFrame(frame: EngagementFrame, drone: DroneSpec): DroneEffectiveFrame {
  if (drone.isSentry) return sentryEffectiveFrame(frame, drone);
  return orbitingEffectiveFrame(frame, drone);
}

function sentryEffectiveFrame(frame: EngagementFrame, drone: DroneSpec): DroneEffectiveFrame {
  const maxRange = drone.optimal + 3 * drone.falloff;
  const inRange = frame.distance <= maxRange;
  return { frame, inRange, orbiting: false };
}

function orbitingEffectiveFrame(frame: EngagementFrame, drone: DroneSpec): DroneEffectiveFrame {
  const orbitRange = drone.optimal > 0 ? drone.optimal : frame.distance;
  const angularVelocity = orbitRange > 0 && drone.orbitSpeed > 0 ? drone.orbitSpeed / orbitRange : 0;
  return { frame: withAngularVelocityAndDistance(frame, angularVelocity, orbitRange), inRange: true, orbiting: true };
}

function withAngularVelocityAndDistance(frame: EngagementFrame, angularVelocity: number, distance: number): EngagementFrame {
  return { ...frame, angularVelocity, distance };
}
