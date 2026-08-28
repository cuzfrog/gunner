import { Vec2 } from "./vec2";
import { timeConstant } from "./dynamics";
import { AGGRESSIVITY_MAX, AGGRESSIVITY_MIN, type ShipState } from "./types";
import { normalizeAggressivity } from "./simValueParser";

export interface Autopilot {
  computeVelocity(ship: ShipState, other: ShipState, time: number): Vec2;
}

export class ReactiveAutopilot implements Autopilot {
  computeVelocity(ship: ShipState, other: ShipState, _time: number): Vec2 {
    const toOther = other.position.sub(ship.position);
    const d = toOther.len();
    if (ship.mode === "midships") {
      return midships(ship, other, d);
    }
    if (d === 0) {
      // Directly on top of the other ship: no meaningful direction.
      return new Vec2(0, 0);
    }

    const toOtherHat = toOther.scale(1 / d);

    switch (ship.mode) {
      case "orbit":
        return orbit(ship, other, d, toOtherHat);
      case "keepAtRange":
        return keepAtRange(ship, other, d, toOtherHat);
      default:
        return new Vec2(0, 0);
    }
  }
}

const ORBIT_RANGE_GAIN = 20.0;
const KEEP_RANGE_GAIN = 2.0;

function orbit(ship: ShipState, other: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  // From-center vector is the opposite of to-other; it points from the
  // reference ship (orbit center) to this ship.
  const rHat = toOtherHat.scale(-1);

  const tHat = (ship.orbitDirection ?? "cw") === "cw" ? rHat.perpCW() : rHat.perpCCW();

  const desiredRange = Math.max(ship.desiredRange, 1);
  const maxSpeed = ship.maxSpeed;
  const tau = timeConstant(ship.mass, ship.inertiaModifier);

  const vtRel = ship.velocity.sub(other.velocity).dot(tHat);
  const lagLead = (tau * vtRel * vtRel) / d;
  const rangeCmd = clampSpeed((ORBIT_RANGE_GAIN * maxSpeed * (desiredRange - d)) / desiredRange, maxSpeed);
  const vrRel = ship.velocity.sub(other.velocity).dot(rHat);
  const kd = dampingGain(ship, ORBIT_RANGE_GAIN);
  const relRadial = clampSpeed(rangeCmd - kd * vrRel - lagLead, maxSpeed);

  const otherOutward = other.velocity.dot(rHat);
  const outward = clampSpeed(otherOutward + relRadial, maxSpeed);
  const budget = Math.sqrt(Math.max(maxSpeed * maxSpeed - outward * outward, 0));
  const relTangential = Math.sqrt(Math.max(maxSpeed * maxSpeed - relRadial * relRadial, 0));
  const otherTangential = other.velocity.dot(tHat);
  const tangential = clampSpeed(otherTangential + relTangential, budget);

  return rHat.scale(outward).add(tHat.scale(tangential));
}

function keepAtRange(ship: ShipState, other: ShipState, d: number, toOtherHat: Vec2): Vec2 {
  const desiredRange = Math.max(ship.desiredRange, 1);
  const otherOutward = other.velocity.dot(toOtherHat);
  const openingRate = (KEEP_RANGE_GAIN * ship.maxSpeed * (desiredRange - d)) / desiredRange;
  const vrRel = ship.velocity.sub(other.velocity).dot(toOtherHat);
  const kd = dampingGain(ship, KEEP_RANGE_GAIN);
  const radialSpeed = clampSpeed(otherOutward - openingRate - kd * vrRel, ship.maxSpeed);
  return toOtherHat.scale(radialSpeed);
}

function clampSpeed(value: number, maxSpeed: number): number {
  return Math.max(-maxSpeed, Math.min(maxSpeed, value));
}

function dampingGain(ship: ShipState, gain: number): number {
  const zeta = zetaFromAggressivity(ship.aggressivity);
  const tau = timeConstant(ship.mass, ship.inertiaModifier);
  const natural = Math.sqrt((tau * gain * ship.maxSpeed) / Math.max(ship.desiredRange, 1));
  return Math.max(2 * zeta * natural - 1, 0);
}

function zetaFromAggressivity(aggressivity: number): number {
  const clamped = normalizeAggressivity(aggressivity);
  const span = Math.log10(AGGRESSIVITY_MAX) - Math.log10(AGGRESSIVITY_MIN);
  return Math.max(0, Math.min(1, (Math.log10(AGGRESSIVITY_MAX) - Math.log10(clamped)) / span));
}

function midships(ship: ShipState, other: ShipState, distance: number): Vec2 {
  const velocity = ship.velocity;
  const speed = ship.maxSpeed;
  if (velocity.len() > 0) {
    return velocity.norm().scale(speed);
  }
  if (distance === 0) {
    return new Vec2(0, 0);
  }
  const toOtherHat = other.position.sub(ship.position).scale(1 / distance);
  const tHat = (ship.orbitDirection ?? "cw") === "cw" ? toOtherHat.perpCW() : toOtherHat.perpCCW();
  return tHat.scale(speed);
}
