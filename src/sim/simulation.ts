import { Vec2 } from "./vec2";
import type { Autopilot } from "./autopilot";
import { integrateShip } from "./dynamics";
import type { ShipConfig, ShipState, SimConfig, SimSnapshot } from "./types";

export interface Simulation {
  step(dt: number): void;
  snapshot(): SimSnapshot;
  reset(config: SimConfig): void;
  update(config: SimConfig): void;
}

export class SimulationImpl implements Simulation {
  private readonly attackerSteering: Autopilot;
  private readonly targetSteering: Autopilot;
  private time: number;
  private attacker: ShipState;
  private target: ShipState;

  constructor({ attackerSteering, targetSteering, simConfig }: {
    attackerSteering: Autopilot;
    targetSteering: Autopilot;
    simConfig: SimConfig;
  }) {
    this.attackerSteering = attackerSteering;
    this.targetSteering = targetSteering;
    this.time = 0;
    this.attacker = asState(simConfig.attacker, new Vec2(0, 0));
    this.target = asState(simConfig.target, new Vec2(0, simConfig.initialDistance));
  }

  step(dt: number): void {
    const commands = this.computeCommands();
    this.attacker = { ...this.attacker, ...integrateShip(this.attacker, commands.attacker, dt) };
    this.target = { ...this.target, ...integrateShip(this.target, commands.target, dt) };
    this.time += dt;
  }

  snapshot(): SimSnapshot {
    return {
      time: this.time,
      attacker: this.attacker,
      target: this.target,
      commands: this.computeCommands(),
    };
  }

  reset(config: SimConfig): void {
    this.time = 0;
    this.attacker = asState(config.attacker, new Vec2(0, 0));
    this.target = asState(config.target, new Vec2(0, config.initialDistance));
  }

  update(config: SimConfig): void {
    this.attacker = withConfig(this.attacker, config.attacker);
    this.target = withConfig(this.target, config.target);
  }

  private computeCommands(): { attacker: Vec2; target: Vec2 } {
    const attacker = this.attackerSteering.computeVelocity(this.attacker, this.target, this.time);
    const target = this.targetSteering.computeVelocity(this.target, this.attacker, this.time);
    return { attacker, target };
  }
}

function asState(config: ShipConfig, position: Vec2): ShipState {
  return { ...config, position, velocity: new Vec2(0, 0) };
}

function withConfig(state: ShipState, config: ShipConfig): ShipState {
  return { ...state, ...config };
}
