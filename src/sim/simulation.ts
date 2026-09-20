import { Vec2 } from "./vec2";
import type { Autopilot } from "./autopilot";
import { integrateShip } from "./dynamics";
import type { EwarResolver } from "./ewarResolver";
import type { Restorable } from "./restorable";
import { type BurstModifiers, type CombatantConfig, type EwarProjection, type ShipState, type Side, type SimConfig, type SimSnapshot, IDENTITY_BURST_MODIFIERS } from "./types";

export interface SimulationState {
  readonly time: number;
  readonly shipA: ShipState;
  readonly shipB: ShipState;
}

export interface Simulation extends Restorable<SimulationState> {
  step(dt: number, context?: { readonly propulsionStarved: Record<Side, boolean>; readonly ewarActive: Record<Side, boolean>; readonly bursts?: Record<Side, BurstModifiers> }): void;
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
  private ewarActive: Record<Side, boolean>;

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
    this.ewarActive = { shipA: true, shipB: true };
    this.shipA = asState(simConfig.shipA, new Vec2(0, 0));
    this.shipB = asState(simConfig.shipB, new Vec2(0, simConfig.initialDistance));
  }

  private burstModifiers: Record<Side, BurstModifiers> = { shipA: IDENTITY_BURST_MODIFIERS, shipB: IDENTITY_BURST_MODIFIERS };

  step(dt: number, context?: { readonly propulsionStarved: Record<Side, boolean>; readonly ewarActive: Record<Side, boolean>; readonly bursts?: Record<Side, BurstModifiers> }): void {
    if (context) {
      this.propulsionStarved = context.propulsionStarved;
      this.ewarActive = context.ewarActive;
      this.burstModifiers = context.bursts ?? { shipA: IDENTITY_BURST_MODIFIERS, shipB: IDENTITY_BURST_MODIFIERS };
    }
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
    this.ewarActive = { shipA: true, shipB: true };
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
    const shipA = effectiveState(this.ewarResolver, this.shipA, this.ewarActive.shipB ? this.shipB.ewar : undefined, distance, this.propulsionStarved.shipA, this.burstModifiers.shipA);
    const shipB = effectiveState(this.ewarResolver, this.shipB, this.ewarActive.shipA ? this.shipA.ewar : undefined, distance, this.propulsionStarved.shipB, this.burstModifiers.shipB);
    const commands = {
      shipA: this.shipASteering.computeVelocity(shipA, shipB, this.time),
      shipB: this.shipBSteering.computeVelocity(shipB, shipA, this.time),
    };
    return { shipA, shipB, commands };
  }
}

function effectiveState(resolver: EwarResolver, ship: ShipState, opponentEwar: EwarProjection | undefined, distance: number, propulsionStarved: boolean, bursts: BurstModifiers): ShipState {
  const multiplier = resolver.speedMultiplier(opponentEwar, distance);
  const suppressed = resolver.propulsionSuppressed(opponentEwar, distance) || propulsionStarved;
  const baseSpeed = suppressed ? suppressedSpeed(ship) : propulsionBoostedSpeed(ship, bursts.propulsionSpeed);
  const sig = effectiveSig(ship, suppressed);
  const inertia = ship.inertiaModifier * bursts.inertia;
  if (multiplier === 1 && baseSpeed === ship.maxSpeed && sig === ship.sig && inertia === ship.inertiaModifier) return ship;
  return { ...ship, maxSpeed: baseSpeed * multiplier, sig, inertiaModifier: inertia };
}

/** A propulsion speed burst (Rapid Deployment) scales only the afterburner/MWD contribution above base speed. */
function propulsionBoostedSpeed(ship: ShipState, multiplier: number): number {
  if (multiplier === 1) return ship.maxSpeed;
  const base = ship.baseMaxSpeed;
  if (base === undefined || base >= ship.maxSpeed) return ship.maxSpeed;
  return base + (ship.maxSpeed - base) * multiplier;
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
