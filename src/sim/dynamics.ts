import { add, len, scale, sub, vec, type Vec2 } from "../math";
import type { ShipState } from "./types";

export interface ShipMotion {
  readonly position: Vec2;
  readonly velocity: Vec2;
}

export function integrateShip(state: ShipState, commandedVelocity: Vec2, dt: number): ShipMotion {
  const clampedCommand = clampToMaxSpeed(commandedVelocity, state.maxSpeed);
  if (dt <= 0) {
    return { position: state.position, velocity: state.velocity };
  }
  const tau = state.mass * state.inertiaModifier * 1e-6;
  if (tau <= 0) {
    return { position: add(state.position, scale(clampedCommand, dt)), velocity: clampedCommand };
  }
  const e = Math.exp(-dt / tau);
  const dv = sub(state.velocity, clampedCommand);
  return {
    velocity: add(clampedCommand, scale(dv, e)),
    position: add(state.position, add(scale(clampedCommand, dt), scale(dv, tau * (1 - e)))),
  };
}

function clampToMaxSpeed(velocity: Vec2, maxSpeed: number): Vec2 {
  const budget = Math.max(0, maxSpeed);
  const speed = len(velocity);
  if (speed <= budget) return velocity;
  if (speed === 0) return vec(0, 0);
  return scale(velocity, budget / speed);
}
