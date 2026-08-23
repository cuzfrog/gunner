import { Vec2 } from "./vec2";
import type { Autopilot } from "./autopilot";
import { integrateShip } from "./dynamics";
import type { EwarResolver } from "./ewarResolver";
import type { CombatantConfig, ShipState, SimConfig, SimSnapshot } from "./types";

export interface Simulation {
  step(dt: number): void;
  snapshot(): SimSnapshot;
  reset(config: SimConfig): void;
  update(config: SimConfig): void;
}

export class SimulationImpl implements Simulation {
  private readonly attackerSteering: Autopilot;
  private readonly targetSteering: Autopilot;
  private readonly ewarResolver: EwarResolver;
  private time: number;
  private attacker: ShipState;
  private target: ShipState;

  constructor({ attackerSteering, targetSteering, ewarResolver, simConfig }: {
    attackerSteering: Autopilot;
    targetSteering: Autopilot;
    ewarResolver: EwarResolver;
    simConfig: SimConfig;
  }) {
    this.attackerSteering = attackerSteering;
    this.targetSteering = targetSteering;
    this.ewarResolver = ewarResolver;
    this.time = 0;
    this.attacker = asState(simConfig.attacker, new Vec2(0, 0));
    this.target = asState(simConfig.target, new Vec2(0, simConfig.initialDistance));
  }

  step(dt: number): void {
    const frame = this.computeFrame();
    this.attacker = { ...this.attacker, ...integrateShip(frame.attacker, frame.commands.attacker, dt) };
    this.target = { ...this.target, ...integrateShip(frame.target, frame.commands.target, dt) };
    this.time += dt;
  }

  snapshot(): SimSnapshot {
    const frame = this.computeFrame();
    return {
      time: this.time,
      attacker: this.attacker,
      target: this.target,
      commands: frame.commands,
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

  private computeFrame(): { attacker: ShipState; target: ShipState; commands: { attacker: Vec2; target: Vec2 } } {
    const distance = this.target.position.sub(this.attacker.position).len();
    const attacker = effectiveState(this.ewarResolver, this.attacker, this.target, distance);
    const target = effectiveState(this.ewarResolver, this.target, this.attacker, distance);
    const commands = {
      attacker: this.attackerSteering.computeVelocity(attacker, target, this.time),
      target: this.targetSteering.computeVelocity(target, attacker, this.time),
    };
    return { attacker, target, commands };
  }
}

function effectiveState(resolver: EwarResolver, ship: ShipState, opponent: ShipState, distance: number): ShipState {
  const multiplier = resolver.webSpeedMultiplier(opponent.ewar, distance);
  if (multiplier === 1) return ship;
  return { ...ship, maxSpeed: ship.maxSpeed * multiplier };
}

function asState(config: CombatantConfig, position: Vec2): ShipState {
  return { ...config, position, velocity: new Vec2(0, 0) };
}

function withConfig(state: ShipState, config: CombatantConfig): ShipState {
  return { ...state, ...config };
}
