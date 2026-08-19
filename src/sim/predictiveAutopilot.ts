import { add, len, scale, sub, vec, type Vec2 } from "../math";
import type { Autopilot } from "./autopilot";
import { clampToMaxSpeed, integrateShip } from "./dynamics";
import type { Kinematics } from "./kinematics";
import type { ShipConfig, ShipState } from "./types";

const REPLAN_INTERVAL = 2; // s
const HORIZON_MARGIN = 1.2;
const MAX_HORIZON = 120; // s
const FINE_WINDOW = 15; // s
const FINE_STEP = 0.5; // s
const COARSE_STEP = 2; // s
const DISCOUNT_PER_SECOND = 0.97;
const RANGE_WEIGHT = 0.003;
const DIRECTION_COUNT = 12;
const SPEED_FRACTIONS = [0.5, 1] as const;
const POLISH_ITERATIONS = 3;
const POLISH_PROBE = 50; // m/s
const POLISH_STEP = 200; // m/s
const HORIZON_EPSILON = 1e-9;

export class PredictiveAutopilot implements Autopilot {
  private readonly targetSteering: Autopilot;
  private readonly kinematics: Kinematics;
  private heldCommand: Vec2 | null = null;
  private lastPlanTime = Number.NEGATIVE_INFINITY;
  private lastShipConfig: ShipConfig | null = null;
  private lastOtherConfig: ShipConfig | null = null;

  constructor({ targetSteering, kinematics }: { targetSteering: Autopilot; kinematics: Kinematics }) {
    this.targetSteering = targetSteering;
    this.kinematics = kinematics;
  }

  computeVelocity(ship: ShipState, other: ShipState, time: number): Vec2 {
    const configChanged = this.lastShipConfig === null || this.lastOtherConfig === null ||
      !shipConfigsEqual(this.lastShipConfig, ship) || !shipConfigsEqual(this.lastOtherConfig, other);
    if (this.heldCommand !== null && !configChanged && time >= this.lastPlanTime && time < this.lastPlanTime + REPLAN_INTERVAL) {
      return this.heldCommand;
    }
    this.heldCommand = this.plan(ship, other, time);
    this.lastPlanTime = time;
    this.lastShipConfig = toShipConfig(ship);
    this.lastOtherConfig = toShipConfig(other);
    return this.heldCommand;
  }

  private plan(ship: ShipState, other: ShipState, time: number): Vec2 {
    const horizon = planningHorizon(ship, other);
    const previous = this.heldCommand;
    let bestCommand = vec(0, 0);
    let bestCost = Number.POSITIVE_INFINITY;
    for (const candidate of candidateCommands(ship, other, previous)) {
      const cost = this.rolloutCost(ship, other, candidate, time, horizon);
      if (cost < bestCost) {
        bestCost = cost;
        bestCommand = candidate;
      }
    }
    return this.polish(ship, other, bestCommand, time, horizon);
  }

  private rolloutCost(ship: ShipState, other: ShipState, command: Vec2, time: number, horizon: number): number {
    let attacker = ship;
    let target = other;
    let cost = 0;
    let elapsed = 0;
    let weight = 1;
    while (elapsed < horizon - HORIZON_EPSILON) {
      const dt = Math.min(elapsed < FINE_WINDOW ? FINE_STEP : COARSE_STEP, horizon - elapsed);
      const targetCommand = this.targetSteering.computeVelocity(target, attacker, time + elapsed);
      attacker = move(attacker, command, dt);
      target = move(target, targetCommand, dt);
      elapsed += dt;
      weight *= DISCOUNT_PER_SECOND ** dt;
      const frame = this.kinematics.computeEngagement(attacker, target, time + elapsed);
      const rangeDeviation = (frame.distance - ship.desiredRange) / Math.max(ship.desiredRange, 1);
      cost += weight * (frame.angularVelocity * frame.angularVelocity + RANGE_WEIGHT * rangeDeviation * rangeDeviation) * dt;
    }
    return cost;
  }

  private polish(ship: ShipState, other: ShipState, command: Vec2, time: number, horizon: number): Vec2 {
    let current = command;
    let currentCost = this.rolloutCost(ship, other, current, time, horizon);
    for (let i = 0; i < POLISH_ITERATIONS; i++) {
      const gradient = this.costGradient(ship, other, current, time, horizon);
      const gradientLen = len(gradient);
      if (gradientLen === 0) return current;
      const step = scale(gradient, -POLISH_STEP / gradientLen);
      const next = clampToMaxSpeed(add(current, step), ship.maxSpeed);
      const nextCost = this.rolloutCost(ship, other, next, time, horizon);
      if (nextCost < currentCost) {
        current = next;
        currentCost = nextCost;
      } else {
        return current;
      }
    }
    return current;
  }

  private costGradient(ship: ShipState, other: ShipState, command: Vec2, time: number, horizon: number): Vec2 {
    const probeXPlus = clampToMaxSpeed(add(command, vec(POLISH_PROBE, 0)), ship.maxSpeed);
    const probeXMinus = clampToMaxSpeed(add(command, vec(-POLISH_PROBE, 0)), ship.maxSpeed);
    const probeYPlus = clampToMaxSpeed(add(command, vec(0, POLISH_PROBE)), ship.maxSpeed);
    const probeYMinus = clampToMaxSpeed(add(command, vec(0, -POLISH_PROBE)), ship.maxSpeed);
    const costXPlus = this.rolloutCost(ship, other, probeXPlus, time, horizon);
    const costXMinus = this.rolloutCost(ship, other, probeXMinus, time, horizon);
    const costYPlus = this.rolloutCost(ship, other, probeYPlus, time, horizon);
    const costYMinus = this.rolloutCost(ship, other, probeYMinus, time, horizon);
    return vec((costXPlus - costXMinus) / (2 * POLISH_PROBE), (costYPlus - costYMinus) / (2 * POLISH_PROBE));
  }
}

function planningHorizon(ship: ShipState, other: ShipState): number {
  const d = Math.max(len(sub(other.position, ship.position)), 0);
  if (other.maxSpeed <= 0) {
    if (ship.maxSpeed <= 0) return MAX_HORIZON;
    const radialError = Math.abs(d - ship.desiredRange);
    const timeToClose = HORIZON_MARGIN * (radialError / ship.maxSpeed);
    return Math.min(MAX_HORIZON, Math.max(FINE_STEP, timeToClose));
  }
  const orbitPeriod = (2 * Math.PI * d) / other.maxSpeed;
  return Math.min(HORIZON_MARGIN * orbitPeriod, MAX_HORIZON);
}

function move(state: ShipState, command: Vec2, dt: number): ShipState {
  const motion = integrateShip(state, command, dt);
  return { ...state, ...motion };
}

function toShipConfig(ship: ShipState): ShipConfig {
  return {
    id: ship.id,
    maxSpeed: ship.maxSpeed,
    mass: ship.mass,
    inertiaModifier: ship.inertiaModifier,
    mode: ship.mode,
    desiredRange: ship.desiredRange,
    rangeWeight: ship.rangeWeight,
    orbitDirection: ship.orbitDirection,
  };
}

function shipConfigsEqual(a: ShipConfig, b: ShipConfig): boolean {
  return a.id === b.id && a.maxSpeed === b.maxSpeed && a.mass === b.mass && a.inertiaModifier === b.inertiaModifier &&
    a.mode === b.mode && a.desiredRange === b.desiredRange && a.rangeWeight === b.rangeWeight && a.orbitDirection === b.orbitDirection;
}

function candidateCommands(ship: ShipState, other: ShipState, previous: Vec2 | null): Vec2[] {
  const candidates: Vec2[] = [vec(0, 0)];
  if (previous !== null) {
    candidates.push(previous);
  }
  const opponentSpeed = len(other.velocity);
  if (opponentSpeed > 0) {
    candidates.push(clampToMaxSpeed(scale(other.velocity, ship.maxSpeed / opponentSpeed), ship.maxSpeed));
  }
  for (let i = 0; i < DIRECTION_COUNT; i++) {
    const angle = (2 * Math.PI * i) / DIRECTION_COUNT;
    for (const fraction of SPEED_FRACTIONS) {
      const speed = ship.maxSpeed * fraction;
      candidates.push(vec(speed * Math.cos(angle), speed * Math.sin(angle)));
    }
  }
  return candidates;
}
