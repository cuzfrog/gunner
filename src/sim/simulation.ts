import { Vec2 } from "./vec2";
import type { Autopilot } from "./autopilot";
import { integrateShip } from "./dynamics";
import type { EwarResolver } from "./ewarResolver";
import type { Restorable } from "./restorable";
import type { CombatantConfig, ShipState, Side, SimConfig, SimSnapshot } from "./types";

export interface SimulationState {
  readonly time: number;
  readonly shipA: ShipState;
  readonly shipB: ShipState;
}

export interface Simulation extends Restorable<SimulationState> {
  step(dt: number, context?: { readonly propulsionStarved: Record<Side, boolean> }): void;
  snapshot(): SimSnapshot;
  reset(config: SimConfig): void;
  update(config: SimConfig): void;
}

export class SimulationImpl implements Simulation {
  private readonly shipASteering: Autopilot;
  private readonly shipBSteering: Autopilot;
  private readonly ewarResolver: EwarResolver;
  private time: number;
  private shipA: ShipState;
  private shipB: ShipState;
  private propulsionStarved: Record<Side, boolean>;

  constructor({ shipASteering, shipBSteering, ewarResolver, simConfig }: {
    shipASteering: Autopilot;
    shipBSteering: Autopilot;
    ewarResolver: EwarResolver;
    simConfig: SimConfig;
  }) {
    this.shipASteering = shipASteering;
    this.shipBSteering = shipBSteering;
    this.ewarResolver = ewarResolver;
    this.time = 0;
    this.propulsionStarved = { shipA: false, shipB: false };
    this.shipA = asState(simConfig.shipA, new Vec2(0, 0));
    this.shipB = asState(simConfig.shipB, new Vec2(0, simConfig.initialDistance));
  }

  step(dt: number, context?: { readonly propulsionStarved: Record<Side, boolean> }): void {
    if (context) this.propulsionStarved = context.propulsionStarved;
    const frame = this.computeFrame();
    this.shipA = { ...this.shipA, ...integrateShip(frame.shipA, frame.commands.shipA, dt) };
    this.shipB = { ...this.shipB, ...integrateShip(frame.shipB, frame.commands.shipB, dt) };
    this.time += dt;
  }

  snapshot(): SimSnapshot {
    const frame = this.computeFrame();
    return {
      time: this.time,
      shipA: frame.shipA,
      shipB: frame.shipB,
      commands: frame.commands,
    };
  }

  reset(config: SimConfig): void {
    this.time = 0;
    this.propulsionStarved = { shipA: false, shipB: false };
    this.shipA = asState(config.shipA, new Vec2(0, 0));
    this.shipB = asState(config.shipB, new Vec2(0, config.initialDistance));
  }

  update(config: SimConfig): void {
    this.shipA = withConfig(this.shipA, config.shipA);
    this.shipB = withConfig(this.shipB, config.shipB);
  }

  capture(): SimulationState {
    return { time: this.time, shipA: this.shipA, shipB: this.shipB };
  }

  restore(state: SimulationState): void {
    this.time = state.time;
    this.shipA = state.shipA;
    this.shipB = state.shipB;
  }

  private computeFrame(): { shipA: ShipState; shipB: ShipState; commands: { shipA: Vec2; shipB: Vec2 } } {
    const distance = this.shipB.position.sub(this.shipA.position).len();
    const shipA = effectiveState(this.ewarResolver, this.shipA, this.shipB, distance, this.propulsionStarved.shipA);
    const shipB = effectiveState(this.ewarResolver, this.shipB, this.shipA, distance, this.propulsionStarved.shipB);
    const commands = {
      shipA: this.shipASteering.computeVelocity(shipA, shipB, this.time),
      shipB: this.shipBSteering.computeVelocity(shipB, shipA, this.time),
    };
    return { shipA, shipB, commands };
  }
}

function effectiveState(resolver: EwarResolver, ship: ShipState, opponent: ShipState, distance: number, propulsionStarved: boolean): ShipState {
  const multiplier = resolver.speedMultiplier(opponent.ewar, distance);
  const suppressed = resolver.propulsionSuppressed(opponent.ewar, distance) || propulsionStarved;
  const baseSpeed = suppressed ? suppressedSpeed(ship) : ship.maxSpeed;
  const sig = effectiveSig(ship, suppressed);
  if (multiplier === 1 && baseSpeed === ship.maxSpeed && sig === ship.sig) return ship;
  return { ...ship, maxSpeed: baseSpeed * multiplier, sig };
}

function effectiveSig(ship: ShipState, suppressed: boolean): number | undefined {
  const base = ship.sig;
  if (base === undefined) return undefined;
  if (suppressed) return base + (ship.sigPenalty ?? 0);
  return (base + (ship.sigPenalty ?? 0)) * (1 + (ship.sigBloom ?? 0));
}

function suppressedSpeed(ship: ShipState): number {
  if (ship.propulsionKind === "microwarpdrive") return ship.baseMaxSpeed ?? ship.maxSpeed;
  return ship.maxSpeed;
}

function asState(config: CombatantConfig, position: Vec2): ShipState {
  return { ...config, position, velocity: new Vec2(0, 0) };
}

function withConfig(state: ShipState, config: CombatantConfig): ShipState {
  return { ...state, ...config };
}
