import { add, len, norm, perpCCW, perpCW, scale, sub, vec, type Vec2 } from "../math";
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
        return orbit(ship, d, toOtherHat);
      case "keepAtRange":
        return keepAtRange(ship, d, toOtherHat);
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

function orbit(ship: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  // From-center vector is the opposite of to-other; it points from the
  // reference ship (orbit center) to this ship.
  const fromCenterHat = scale(toOtherHat, -1);

  const tHat = (ship.orbitDirection ?? "cw") === "cw" ? perpCW(fromCenterHat) : perpCCW(fromCenterHat);

  const desiredRange = Math.max(ship.desiredRange, 1);
  const error = (d - desiredRange) / desiredRange;

  // Negative error term pulls the ship toward the desired range.
  const dir = norm(add(tHat, scale(fromCenterHat, -ORBIT_RANGE_GAIN * error)));
  return scale(dir, ship.maxSpeed);
}

function keepAtRange(ship: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  const desiredRange = Math.max(ship.desiredRange, 1);
  const error = (d - desiredRange) / desiredRange;
  const control = Math.max(-1, Math.min(1, KEEP_RANGE_GAIN * error));
  return scale(toOtherHat, ship.maxSpeed * control);
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
