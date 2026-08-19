import { add, dot, len, perpCCW, perpCW, scale, sub, vec, type Vec2 } from "../math";
import { timeConstant } from "./dynamics";
import type { ShipState } from "./types";

export interface Autopilot {
  computeVelocity(ship: ShipState, other: ShipState, time: number): Vec2;
}

export class ReactiveAutopilot implements Autopilot {
  computeVelocity(ship: ShipState, other: ShipState, _time: number): Vec2 {
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
      default:
        return vec(0, 0);
    }
  }
}

const ORBIT_RANGE_GAIN = 20.0;
const KEEP_RANGE_GAIN = 2.0;

function orbit(ship: ShipState, other: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  // From-center vector is the opposite of to-other; it points from the
  // reference ship (orbit center) to this ship.
  const rHat = scale(toOtherHat, -1);

  const tHat = (ship.orbitDirection ?? "cw") === "cw" ? perpCW(rHat) : perpCCW(rHat);

  const desiredRange = Math.max(ship.desiredRange, 1);
  const maxSpeed = ship.maxSpeed;
  const tau = timeConstant(ship.mass, ship.inertiaModifier);

  const vtRel = dot(sub(ship.velocity, other.velocity), tHat);
  const lagLead = (tau * vtRel * vtRel) / d;
  const rangeCmd = clampSpeed((ORBIT_RANGE_GAIN * maxSpeed * (desiredRange - d)) / desiredRange, maxSpeed);
  const vrRel = dot(sub(ship.velocity, other.velocity), rHat);
  const kd = dampingGain(ship, ORBIT_RANGE_GAIN);
  const relRadial = clampSpeed(rangeCmd - kd * vrRel - lagLead, maxSpeed);

  const otherOutward = dot(other.velocity, rHat);
  const outward = clampSpeed(otherOutward + relRadial, maxSpeed);
  const budget = Math.sqrt(Math.max(maxSpeed * maxSpeed - outward * outward, 0));
  const relTangential = Math.sqrt(Math.max(maxSpeed * maxSpeed - relRadial * relRadial, 0));
  const otherTangential = dot(other.velocity, tHat);
  const tangential = clampSpeed(otherTangential + relTangential, budget);

  return add(scale(rHat, outward), scale(tHat, tangential));
}

function keepAtRange(ship: ShipState, other: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  const desiredRange = Math.max(ship.desiredRange, 1);
  const otherOutward = dot(other.velocity, toOtherHat);
  const openingRate = (KEEP_RANGE_GAIN * ship.maxSpeed * (desiredRange - d)) / desiredRange;
  const vrRel = dot(sub(ship.velocity, other.velocity), toOtherHat);
  const kd = dampingGain(ship, KEEP_RANGE_GAIN);
  const radialSpeed = clampSpeed(otherOutward - openingRate - kd * vrRel, ship.maxSpeed);
  return scale(toOtherHat, radialSpeed);
}

function clampSpeed(value: number, maxSpeed: number): number {
  return Math.max(-maxSpeed, Math.min(maxSpeed, value));
}

const AGGRESSIVITY_MIN = 0.01;
const AGGRESSIVITY_MAX = 100;

function dampingGain(ship: ShipState, gain: number): number {
  const zeta = zetaFromAggressivity(ship.aggressivity);
  const tau = timeConstant(ship.mass, ship.inertiaModifier);
  const natural = Math.sqrt((tau * gain * ship.maxSpeed) / Math.max(ship.desiredRange, 1));
  return Math.max(2 * zeta * natural - 1, 0);
}

function zetaFromAggressivity(aggressivity: number): number {
  const clamped = Math.max(AGGRESSIVITY_MIN, Math.min(AGGRESSIVITY_MAX, aggressivity));
  const span = Math.log10(AGGRESSIVITY_MAX) - Math.log10(AGGRESSIVITY_MIN);
  return Math.max(0, Math.min(1, (Math.log10(AGGRESSIVITY_MAX) - Math.log10(clamped)) / span));
}
