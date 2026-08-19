import { add, len, scale, sub, vec, type Vec2 } from "../math";
import type { ShipState } from "./types";

export interface ShipMotion {
  readonly position: Vec2;
  readonly velocity: Vec2;
}

export function timeConstant(mass: number, inertiaModifier: number): number {
  return mass * inertiaModifier * 1e-6;
}

export function integrateShip(state: ShipState, commandedVelocity: Vec2, dt: number): ShipMotion {
  const clampedCommand = clampToMaxSpeed(commandedVelocity, state.maxSpeed);
  if (dt <= 0) {
    return { position: state.position, velocity: state.velocity };
  }
  const tau = timeConstant(state.mass, state.inertiaModifier);
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

export function clampToMaxSpeed(velocity: Vec2, maxSpeed: number): Vec2 {
  const budget = Math.max(0, maxSpeed);
  const speed = len(velocity);
  if (speed <= budget) return velocity;
  return scale(velocity, budget / speed);
}
