import { add, dot, len, perpCCW, perpCW, scale, sub, vec, type Vec2 } from "../math";
import { timeConstant } from "./dynamics";
import type { ShipState } from "./types";

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

function orbit(ship: ShipState, other: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  // From-center vector is the opposite of to-other; it points from the
  // reference ship (orbit center) to this ship.
  const fromCenterHat = scale(toOtherHat, -1);

  const tHat = (ship.orbitDirection ?? "cw") === "cw" ? perpCW(fromCenterHat) : perpCCW(fromCenterHat);

  const desiredRange = Math.max(ship.desiredRange, 1);
  const openingRate = (ORBIT_RANGE_GAIN * ship.maxSpeed * (desiredRange - d)) / desiredRange;

  const otherOutward = dot(other.velocity, toOtherHat);
  const tangentialVelocity = dot(ship.velocity, tHat);
  const lagLead = (timeConstant(ship.mass, ship.inertiaModifier) * tangentialVelocity * tangentialVelocity) / d;
  const radialSpeed = clampSpeed(openingRate - otherOutward - lagLead, ship.maxSpeed);

  const radialVel = scale(fromCenterHat, radialSpeed);
  const tangentialSpeed = Math.sqrt(ship.maxSpeed * ship.maxSpeed - radialSpeed * radialSpeed);
  const tangentialVel = scale(tHat, tangentialSpeed);

  return add(radialVel, tangentialVel);
}

function keepAtRange(ship: ShipState, other: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  const desiredRange = Math.max(ship.desiredRange, 1);
  const otherOutward = dot(other.velocity, toOtherHat);
  const openingRate = (KEEP_RANGE_GAIN * ship.maxSpeed * (desiredRange - d)) / desiredRange;
  const radialSpeed = clampSpeed(otherOutward - openingRate, ship.maxSpeed);
  return scale(toOtherHat, radialSpeed);
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

function clampSpeed(value: number, maxSpeed: number): number {
  return Math.max(-maxSpeed, Math.min(maxSpeed, value));
}
