import * as v from "../math/vec2.js";
import { computeVelocity } from "./autopilot.js";
import type { ShipConfig, ShipState } from "./types.js";

export interface SimConfig {
  attacker: ShipConfig;
  target: ShipConfig;
}

export class Simulation {
  time: number;
  attacker: ShipState;
  target: ShipState;

  constructor(config: SimConfig) {
    this.time = 0;
    this.attacker = asState(config.attacker);
    this.target = asState(config.target);
    this.updateVelocities();
  }

  private updateVelocities() {
    // If the attacker is matching, compute the target first so the match
    // uses the current target velocity. Otherwise compute attacker first.
    if (this.attacker.mode === "match") {
      this.target.velocity = computeVelocity(this.target, this.attacker);
      this.attacker.velocity = computeVelocity(this.attacker, this.target);
    } else {
      this.attacker.velocity = computeVelocity(this.attacker, this.target);
      this.target.velocity = computeVelocity(this.target, this.attacker);
    }
  }

  step(dt: number) {
    this.updateVelocities();
    this.attacker.position = v.add(
      this.attacker.position,
      v.scale(this.attacker.velocity, dt),
    );
    this.target.position = v.add(
      this.target.position,
      v.scale(this.target.velocity, dt),
    );
    this.time += dt;
  }

  snapshot() {
    return {
      time: this.time,
      attacker: this.attacker,
      target: this.target,
    };
  }

  reset(config: SimConfig) {
    this.time = 0;
    this.attacker = asState(config.attacker);
    this.target = asState(config.target);
    this.updateVelocities();
  }
}

function asState(config: ShipConfig): ShipState {
  return { ...config, velocity: v.vec(0, 0) };
}
