import * as v from "../math/vec2.js";
import type { ShipState } from "./types.js";

const ORBIT_RANGE_GAIN = 0.5;
const KEEP_RANGE_GAIN = 2.0;
const APPROACH_STOP_RANGE = 100; // m

export function computeVelocity(ship: ShipState, other: ShipState): v.Vec2 {
  const toOther = v.sub(other.position, ship.position);
  const d = v.len(toOther);
  if (d === 0) {
    // Directly on top of the other ship: no meaningful direction.
    return v.vec(0, 0);
  }

  const toOtherHat = v.scale(toOther, 1 / d);

  switch (ship.mode) {
    case "orbit":
      return orbit(ship, d, toOtherHat);
    case "keepAtRange":
      return keepAtRange(ship, d, toOtherHat);
    case "approach":
      return approach(ship, d, toOtherHat);
    case "retreat":
      return v.scale(toOtherHat, -ship.maxSpeed);
    case "match":
      return match(ship, other);
    default:
      return v.vec(0, 0);
  }
}

function orbit(ship: ShipState, d: number, toOtherHat: v.Vec2): v.Vec2 {
  // From-center vector is the opposite of to-other; it points from the
  // reference ship (orbit center) to this ship.
  const fromCenterHat = v.scale(toOtherHat, -1);

  const tHat = (ship.orbitDirection ?? "cw") === "cw"
    ? v.perpCW(fromCenterHat)
    : v.perpCCW(fromCenterHat);

  const desiredRange = Math.max(ship.desiredRange, 1);
  const error = (d - desiredRange) / desiredRange;

  // Negative error term pulls the ship toward the desired range.
  const dir = v.norm(v.add(tHat, v.scale(fromCenterHat, -ORBIT_RANGE_GAIN * error)));
  return v.scale(dir, ship.maxSpeed);
}

function keepAtRange(ship: ShipState, d: number, toOtherHat: v.Vec2): v.Vec2 {
  const desiredRange = Math.max(ship.desiredRange, 1);
  const error = (d - desiredRange) / desiredRange;
  const control = Math.max(-1, Math.min(1, KEEP_RANGE_GAIN * error));
  return v.scale(toOtherHat, ship.maxSpeed * control);
}

function approach(ship: ShipState, d: number, toOtherHat: v.Vec2): v.Vec2 {
  if (d <= APPROACH_STOP_RANGE) {
    return v.vec(0, 0);
  }
  return v.scale(toOtherHat, ship.maxSpeed);
}

function match(ship: ShipState, other: ShipState): v.Vec2 {
  const otherSpeed = v.len(other.velocity);
  if (otherSpeed === 0) {
    return v.vec(0, 0);
  }
  const dir = v.scale(other.velocity, 1 / otherSpeed);
  const speed = Math.min(ship.maxSpeed, otherSpeed);
  return v.scale(dir, speed);
}
