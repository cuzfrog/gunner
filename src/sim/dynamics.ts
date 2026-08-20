import type { Vec2 } from "./vec2";
import type { ShipState } from "./types";

export interface ShipMotion {
  readonly position: Vec2;
  readonly velocity: Vec2;
}

export function timeConstant(mass: number, inertiaModifier: number): number {
  return mass * inertiaModifier * 1e-6;
}

export function alignTime(mass: number, inertiaModifier: number): number {
  return Math.log(4) * timeConstant(mass, inertiaModifier);
}

export function integrateShip(state: ShipState, commandedVelocity: Vec2, dt: number): ShipMotion {
  const clampedCommand = clampToMaxSpeed(commandedVelocity, state.maxSpeed);
  if (dt <= 0) {
    return { position: state.position, velocity: state.velocity };
  }
  const tau = timeConstant(state.mass, state.inertiaModifier);
  if (tau <= 0) {
    return { position: state.position.add(clampedCommand.scale(dt)), velocity: clampedCommand };
  }
  const e = Math.exp(-dt / tau);
  const dv = state.velocity.sub(clampedCommand);
  return {
    velocity: clampedCommand.add(dv.scale(e)),
    position: state.position.add(clampedCommand.scale(dt).add(dv.scale(tau * (1 - e)))),
  };
}

export function clampToMaxSpeed(velocity: Vec2, maxSpeed: number): Vec2 {
  const budget = Math.max(0, maxSpeed);
  const speed = velocity.len();
  if (speed <= budget) return velocity;
  return velocity.scale(budget / speed);
}
