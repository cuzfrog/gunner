import { add, dot, len, perpCCW, perpCW, scale, sub, vec, type Vec2 } from "../math";
import type { AutopilotMode, ShipState } from "./types";

export interface Autopilot {
  computeVelocity(ship: ShipState, other: ShipState): Vec2;
}

export class AutopilotImpl implements Autopilot {
  computeVelocity(ship: ShipState, other: ShipState): Vec2 {
    const toOther = sub(other.position, ship.position);
    const d = len(toOther);
    if (d === 0) {
      // Directly on top of the other ship: no meaningful direction.
      return vec(0, 0);
    }

    const toOtherHat = scale(toOther, 1 / d);

    switch (ship.mode) {
      case "orbit":
        return orbit(ship, other, d, toOtherHat);
      case "keepAtRange":
        return keepAtRange(ship, other, d, toOtherHat);
      case "approach":
        return approach(ship, d, toOtherHat);
      case "retreat":
        return scale(toOtherHat, -ship.maxSpeed);
      case "match":
        return match(ship, other);
      default:
        return vec(0, 0);
    }
  }
}

const ORBIT_RANGE_GAIN = 0.5;
const KEEP_RANGE_GAIN = 2.0;
const APPROACH_STOP_RANGE = 100; // m

function contending(mode: AutopilotMode): boolean {
  return mode === "keepAtRange" || mode === "orbit";
}

function resolvedRange(ship: ShipState, other: ShipState): number {
  if (contending(other.mode) && other.maxSpeed > ship.maxSpeed) {
    return Math.max(other.desiredRange, 1);
  }
  return Math.max(ship.desiredRange, 1);
}

function orbit(ship: ShipState, other: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  // From-center vector is the opposite of to-other; it points from the
  // reference ship (orbit center) to this ship.
  const fromCenterHat = scale(toOtherHat, -1);

  const tHat = (ship.orbitDirection ?? "cw") === "cw" ? perpCW(fromCenterHat) : perpCCW(fromCenterHat);

  const desiredRange = resolvedRange(ship, other);
  const openingRate = (ORBIT_RANGE_GAIN * ship.maxSpeed * (desiredRange - d)) / desiredRange;

  const otherOutward = dot(other.velocity, toOtherHat);
  const radialSpeed = contending(other.mode)
    ? Math.max(-ship.maxSpeed, Math.min(ship.maxSpeed, openingRate))
    : Math.max(-ship.maxSpeed, Math.min(ship.maxSpeed, openingRate - otherOutward));

  const radialVel = scale(fromCenterHat, radialSpeed);
  const tangentialSpeed = Math.sqrt(ship.maxSpeed * ship.maxSpeed - radialSpeed * radialSpeed);
  const tangentialVel = scale(tHat, tangentialSpeed);

  return add(radialVel, tangentialVel);
}

function keepAtRange(ship: ShipState, other: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  const desiredRange = resolvedRange(ship, other);
  const radialSpeed = commandedRadialSpeed(ship, other, d, toOtherHat, desiredRange);
  return scale(toOtherHat, radialSpeed);
}

function commandedRadialSpeed(ship: ShipState, other: ShipState, d: number, toOtherHat: Vec2, desiredRange: number): number {
  if (contending(other.mode)) {
    const error = (d - desiredRange) / desiredRange;
    const control = Math.max(-1, Math.min(1, KEEP_RANGE_GAIN * error));
    return ship.maxSpeed * control;
  }

  const otherOutward = dot(other.velocity, toOtherHat);
  const openingRate = (KEEP_RANGE_GAIN * ship.maxSpeed * (desiredRange - d)) / desiredRange;
  return Math.max(-ship.maxSpeed, Math.min(ship.maxSpeed, otherOutward - openingRate));
}

function approach(ship: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  if (d <= APPROACH_STOP_RANGE) {
    return vec(0, 0);
  }
  return scale(toOtherHat, ship.maxSpeed);
}

function match(ship: ShipState, other: ShipState): Vec2 {
  const otherSpeed = len(other.velocity);
  if (otherSpeed === 0) {
    return vec(0, 0);
  }
  const dir = scale(other.velocity, 1 / otherSpeed);
  const speed = Math.min(ship.maxSpeed, otherSpeed);
  return scale(dir, speed);
}
