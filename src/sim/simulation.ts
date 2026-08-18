import { add, len, scale, sub, vec } from "../math";
import type { Vec2 } from "../math";
import type { Autopilot } from "./autopilot";
import type { ShipConfig, ShipState, SimConfig, SimSnapshot } from "./types";

export interface Simulation {
  step(dt: number): void;
  snapshot(): SimSnapshot;
  reset(config: SimConfig): void;
  update(config: SimConfig): void;
}

export class SimulationImpl implements Simulation {
  private readonly autopilot: Autopilot;
  private time: number;
  private attacker: ShipState;
  private target: ShipState;

  constructor({ autopilot, simConfig }: { autopilot: Autopilot; simConfig: SimConfig }) {
    this.autopilot = autopilot;
    this.time = 0;
    this.attacker = asState(simConfig.attacker, vec(0, 0));
    this.target = asState(simConfig.target, vec(0, simConfig.initialDistance));
    this.updateVelocities();
  }

  step(dt: number): void {
    this.updateVelocities();
    this.attacker.position = add(this.attacker.position, scale(this.attacker.velocity, dt));
    this.target.position = add(this.target.position, scale(this.target.velocity, dt));
    this.time += dt;
  }

  snapshot(): SimSnapshot {
    return {
      time: this.time,
      attacker: this.attacker,
      target: this.target,
    };
  }

  reset(config: SimConfig): void {
    this.time = 0;
    this.attacker = asState(config.attacker, vec(0, 0));
    this.target = asState(config.target, vec(0, config.initialDistance));
    this.updateVelocities();
  }

  update(config: SimConfig): void {
    this.attacker = withConfig(this.attacker, config.attacker);
    this.target = withConfig(this.target, config.target);
    this.target.position = this.placeTarget(this.attacker.position, this.target.position, config.initialDistance);
    this.updateVelocities();
  }

  private placeTarget(attackerPosition: Vec2, targetPosition: Vec2, initialDistance: number): Vec2 {
    const offset = sub(targetPosition, attackerPosition);
    const distance = len(offset);
    const dir = distance > 0 ? scale(offset, 1 / distance) : vec(0, 1);
    return add(attackerPosition, scale(dir, initialDistance));
  }

  private updateVelocities(): void {
    if (this.attacker.mode === "match") {
      this.target.velocity = this.autopilot.computeVelocity(this.target, this.attacker);
      this.attacker.velocity = this.autopilot.computeVelocity(this.attacker, this.target);
    } else {
      this.attacker.velocity = this.autopilot.computeVelocity(this.attacker, this.target);
      this.target.velocity = this.autopilot.computeVelocity(this.target, this.attacker);
    }
  }
}

function asState(config: ShipConfig, position: Vec2): ShipState {
  return { ...config, position, velocity: vec(0, 0) };
}

function withConfig(state: ShipState, config: ShipConfig): ShipState {
  return { ...state, ...config };
}
