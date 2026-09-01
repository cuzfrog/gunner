import { computeExpectedMultiplier } from "./expectedHitMultiplier";
import type { HitChance } from "./hitChance";
import type { DamageAssessment, DroneDamageBreakdown, DroneMode, DroneRuntimeState, DroneSpec, EngagementFrame } from "./types";

export interface DroneApplication {
  compute(frame: EngagementFrame, drone: DroneSpec, opponentSigRadius: number, state?: DroneRuntimeState): DroneDamageBreakdown & DamageAssessment;
}

interface DroneApplicationDeps {
  readonly hitChance: HitChance;
}

export class DroneApplicationImpl implements DroneApplication {
  private readonly hitChance: HitChance;

  constructor({ hitChance }: DroneApplicationDeps) {
    this.hitChance = hitChance;
  }

  compute(frame: EngagementFrame, drone: DroneSpec, opponentSigRadius: number, state?: DroneRuntimeState): DroneDamageBreakdown & DamageAssessment {
    const effective = droneEffectiveFrame(frame, drone, state);
    const hit = this.hitChance.compute(effective.frame, drone, opponentSigRadius);
    const expectedMultiplier = computeExpectedMultiplier(hit.chance);
    const nominalDps = drone.cycleTime > 0 ? (drone.damagePerShot * drone.droneCount) / drone.cycleTime : 0;
    const appliedDps = effective.inRange ? nominalDps * expectedMultiplier : 0;
    const volley = drone.damagePerShot * drone.droneCount;
    return { hit, expectedMultiplier, inRange: effective.inRange, orbiting: effective.orbiting, mode: effective.mode, distanceToTarget: effective.distanceToTarget, inControlRange: effective.inControlRange, nominalDps, appliedDps, application: effective.inRange ? expectedMultiplier : 0, volley };
  }
}

interface DroneEffectiveFrame {
  readonly frame: EngagementFrame;
  readonly inRange: boolean;
  readonly orbiting: boolean;
  readonly mode: DroneMode;
  readonly distanceToTarget: number;
  readonly inControlRange: boolean;
}

function droneEffectiveFrame(frame: EngagementFrame, drone: DroneSpec, state: DroneRuntimeState | undefined): DroneEffectiveFrame {
  if (drone.isSentry) return sentryEffectiveFrame(frame, drone, state);
  if (state) return statefulEffectiveFrame(frame, drone, state);
  return orbitingEffectiveFrame(frame, drone);
}

function sentryEffectiveFrame(frame: EngagementFrame, drone: DroneSpec, state: DroneRuntimeState | undefined): DroneEffectiveFrame {
  const maxRange = drone.optimal + 3 * drone.falloff;
  const inControlRange = state ? state.inControlRange : frame.distance <= drone.controlRange;
  const distanceToTarget = state ? state.distanceToTarget : frame.distance;
  const inRange = inControlRange && distanceToTarget <= maxRange;
  return { frame, inRange, orbiting: false, mode: "orbiting", distanceToTarget, inControlRange };
}

function statefulEffectiveFrame(frame: EngagementFrame, drone: DroneSpec, state: DroneRuntimeState): DroneEffectiveFrame {
  if (state.mode === "orbiting") return orbitingEffectiveFrameFromState(frame, drone, state);
  return { frame, inRange: false, orbiting: false, mode: state.mode, distanceToTarget: state.distanceToTarget, inControlRange: state.inControlRange };
}

function orbitingEffectiveFrameFromState(frame: EngagementFrame, drone: DroneSpec, state: DroneRuntimeState): DroneEffectiveFrame {
  const orbitRange = drone.orbitRange > 0 ? drone.orbitRange : (drone.optimal > 0 ? drone.optimal : state.distanceToTarget);
  const angularVelocity = orbitRange > 0 && drone.orbitSpeed > 0 ? drone.orbitSpeed / orbitRange : 0;
  return { frame: withAngularVelocityAndDistance(frame, angularVelocity, orbitRange), inRange: true, orbiting: true, mode: "orbiting", distanceToTarget: state.distanceToTarget, inControlRange: state.inControlRange };
}

function orbitingEffectiveFrame(frame: EngagementFrame, drone: DroneSpec): DroneEffectiveFrame {
  const orbitRange = drone.orbitRange > 0 ? drone.orbitRange : (drone.optimal > 0 ? drone.optimal : frame.distance);
  const angularVelocity = orbitRange > 0 && drone.orbitSpeed > 0 ? drone.orbitSpeed / orbitRange : 0;
  return { frame: withAngularVelocityAndDistance(frame, angularVelocity, orbitRange), inRange: true, orbiting: true, mode: "orbiting", distanceToTarget: frame.distance, inControlRange: true };
}

function withAngularVelocityAndDistance(frame: EngagementFrame, angularVelocity: number, distance: number): EngagementFrame {
  return { ...frame, angularVelocity, distance };
}
