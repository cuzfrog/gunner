import { add, scale, vec } from "../math";
import type { Autopilot } from "./autopilot";
import type { ShipConfig, ShipState, SimConfig, SimSnapshot } from "./types";

export interface Simulation {
  step(dt: number): void;
  snapshot(): SimSnapshot;
  reset(config: SimConfig): void;
}

export class SimulationImpl implements Simulation {
  private readonly autopilot: Autopilot;
  private time: number;
  private attacker: ShipState;
  private target: ShipState;

  constructor({ autopilot, simConfig }: { autopilot: Autopilot; simConfig: SimConfig }) {
    this.autopilot = autopilot;
    this.time = 0;
    this.attacker = asState(simConfig.attacker);
    this.target = asState(simConfig.target);
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
    this.attacker = asState(config.attacker);
    this.target = asState(config.target);
    this.updateVelocities();
  }

  private updateVelocities(): void {
    // If the attacker is matching, compute the target first so the match
    // uses the current target velocity. Otherwise compute attacker first.
    if (this.attacker.mode === "match") {
      this.target.velocity = this.autopilot.computeVelocity(this.target, this.attacker);
      this.attacker.velocity = this.autopilot.computeVelocity(this.attacker, this.target);
    } else {
      this.attacker.velocity = this.autopilot.computeVelocity(this.attacker, this.target);
      this.target.velocity = this.autopilot.computeVelocity(this.target, this.attacker);
    }
  }
}

function asState(config: ShipConfig): ShipState {
  return { ...config, velocity: vec(0, 0) };
}
