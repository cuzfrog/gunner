import { computeExpectedMultiplier } from "./expectedHitMultiplier";
import type { HitChance } from "./hitChance";
import type { DamageAssessment, DroneDamageBreakdown, DroneMode, DroneRuntimeState, DroneSpec, EngagementFrame } from "./types";
import { ZERO_DAMAGE, damageVectorScale, damageVectorSum } from "./types";

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
    const shotDamage = damageVectorSum(drone.damagePerShot);
    const nominalDps = drone.cycleTime > 0 ? (shotDamage * drone.droneCount) / drone.cycleTime : 0;
    const appliedDps = effective.inRange ? nominalDps * expectedMultiplier : 0;
    const volley = shotDamage * drone.droneCount;
    const appliedByType = effective.inRange
      ? damageVectorScale(drone.damagePerShot, (drone.droneCount * expectedMultiplier) / Math.max(drone.cycleTime, 0))
      : ZERO_DAMAGE;
    const appliedVolleyByType = effective.inRange
      ? damageVectorScale(drone.damagePerShot, drone.droneCount * expectedMultiplier)
      : ZERO_DAMAGE;
    return {
      hit, expectedMultiplier, inRange: effective.inRange, inWeaponRange: effective.inWeaponRange,
      mode: effective.mode, distanceToTarget: effective.distanceToTarget, inControlRange: effective.inControlRange,
      nominalDps, appliedDps, application: effective.inRange ? expectedMultiplier : 0, volley, appliedByType, appliedVolleyByType,
    };
  }
}

interface DroneEffectiveFrame {
  readonly frame: EngagementFrame;
  readonly inRange: boolean;
  readonly inWeaponRange: boolean;
  readonly mode: DroneMode;
  readonly distanceToTarget: number;
  readonly inControlRange: boolean;
}

function droneEffectiveFrame(frame: EngagementFrame, drone: DroneSpec, state: DroneRuntimeState | undefined): DroneEffectiveFrame {
  if (drone.isSentry) return sentryEffectiveFrame(frame, drone, state);
  if (state) return statefulEffectiveFrame(frame, drone, state);
  return defaultEngagingFrame(frame, drone);
}

function sentryEffectiveFrame(frame: EngagementFrame, drone: DroneSpec, state: DroneRuntimeState | undefined): DroneEffectiveFrame {
  const maxRange = drone.optimal + 3 * drone.falloff;
  const inControlRange = state ? state.inControlRange : frame.distance <= drone.controlRange;
  const distanceToTarget = state ? state.distanceToTarget : frame.distance;
  const inWeaponRange = distanceToTarget <= maxRange;
  const inRange = inControlRange && inWeaponRange;
  return { frame, inRange, inWeaponRange, mode: "engaging", distanceToTarget, inControlRange };
}

function statefulEffectiveFrame(frame: EngagementFrame, drone: DroneSpec, state: DroneRuntimeState): DroneEffectiveFrame {
  const maxRange = drone.optimal + 3 * drone.falloff;
  const inWeaponRange = state.distanceToTarget <= maxRange;
  if (state.mode === "idle" || state.mode === "returning") {
    return { frame, inRange: false, inWeaponRange, mode: state.mode, distanceToTarget: state.distanceToTarget, inControlRange: state.inControlRange };
  }
  const orbitRange = drone.orbitRange > 0 ? drone.orbitRange : (drone.optimal > 0 ? drone.optimal : state.distanceToTarget);
  const angularVelocity = orbitAngularVelocity(drone.orbitSpeed, orbitRange, state.distanceToSlot);
  const inRange = state.inControlRange && inWeaponRange;
  return { frame: withAngularVelocityAndDistance(frame, angularVelocity, state.distanceToTarget), inRange, inWeaponRange, mode: state.mode, distanceToTarget: state.distanceToTarget, inControlRange: state.inControlRange };
}

function defaultEngagingFrame(frame: EngagementFrame, drone: DroneSpec): DroneEffectiveFrame {
  const orbitRange = drone.orbitRange > 0 ? drone.orbitRange : (drone.optimal > 0 ? drone.optimal : frame.distance);
  const angularVelocity = orbitRange > 0 && drone.orbitSpeed > 0 ? drone.orbitSpeed / orbitRange : 0;
  const maxRange = drone.optimal + 3 * drone.falloff;
  const inWeaponRange = orbitRange <= maxRange;
  return { frame: withAngularVelocityAndDistance(frame, angularVelocity, orbitRange), inRange: inWeaponRange, inWeaponRange, mode: "engaging", distanceToTarget: orbitRange, inControlRange: true };
}

function orbitAngularVelocity(orbitSpeed: number, orbitRange: number, distanceToSlot: number): number {
  if (orbitRange <= 0 || orbitSpeed <= 0) return 0;
  const baseAngularVelocity = orbitSpeed / orbitRange;
  const mwdFactor = Math.min(distanceToSlot / orbitRange, 1);
  return baseAngularVelocity * (1 - mwdFactor);
}

function withAngularVelocityAndDistance(frame: EngagementFrame, angularVelocity: number, distance: number): EngagementFrame {
  return { ...frame, angularVelocity, distance };
}
