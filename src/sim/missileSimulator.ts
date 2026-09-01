import { Vec2 } from "./vec2";
import { MissileApplicationImpl } from "./missileApplication";
import type { MissileApplication } from "./missileApplication";
import type {
  EngagementFrame,
  MissileAttackFacts,
  MissileImpact,
  MissileImpactSummary,
  MissileLaunchSpec,
  MissileRuntimeState,
  MissileSimConfig,
  MissileSpec,
  Side,
} from "./types";

export interface MissileSimulator {
  reset(config: MissileSimConfig): void;
  step(dt: number, frame: EngagementFrame, launches: Record<Side, readonly MissileLaunchSpec[]>): void;
  states(side: Side): readonly MissileRuntimeState[];
  facts(side: Side, weaponIndex: number): MissileAttackFacts;
}

const ACCEL_TAU = 0.5;
const TRAIL_MAX = 8;
const ROLLING_WINDOW_MIN = 10;
const ROLLING_WINDOW_MAX = 60;
const ROLLING_WINDOW_CYCLES = 3;

interface MissileBody {
  position: Vec2;
  velocity: Vec2;
  fuel: number;
  trail: Vec2[];
  weaponIndex: number;
  spec: MissileSpec;
  paintedSig: number;
}

interface SideState {
  entities: MissileBody[];
  cooldowns: Map<number, number>;
  impacts: MissileImpact[];
  firstLaunchTime: Map<number, number>;
}

export class MissileSimulatorImpl implements MissileSimulator {
  private readonly application: MissileApplication;
  private sides: Record<Side, SideState> = { shipA: emptySide(), shipB: emptySide() };
  private time: number;

  constructor() {
    this.application = new MissileApplicationImpl();
    this.time = 0;
  }

  reset(_config: MissileSimConfig): void {
    this.sides = { shipA: emptySide(), shipB: emptySide() };
    this.time = 0;
  }

  step(dt: number, frame: EngagementFrame, launches: Record<Side, readonly MissileLaunchSpec[]>): void {
    this.time += dt;
    this.lastFrameShipA = frame.shipA.position;
    this.lastFrameShipB = frame.shipB.position;
    this.lastFrameDistance = frame.distance;
    this.stepSide("shipA", dt, frame, frame.shipA.position, frame.shipB.position, frame.shipB.velocity, launches.shipA);
    this.stepSide("shipB", dt, frame, frame.shipB.position, frame.shipA.position, frame.shipA.velocity, launches.shipB);
  }

  states(side: Side): readonly MissileRuntimeState[] {
    return this.sides[side].entities.map((m) => ({ position: m.position, velocity: m.velocity, trail: m.trail, side, weaponIndex: m.weaponIndex }));
  }

  facts(side: Side, weaponIndex: number): MissileAttackFacts {
    const state = this.sides[side];
    const inFlight = state.entities.filter((m) => m.weaponIndex === weaponIndex);
    const weaponImpacts = state.impacts.filter((m) => m.weaponIndex === weaponIndex);
    const lastImpact = weaponImpacts.length > 0 ? toSummary(weaponImpacts[weaponImpacts.length - 1]) : undefined;
    const nearestTimeToImpact = inFlight.length > 0 ? minTimeToImpact(inFlight, this.targetPos(side, this.sides[side])) : 0;
    const spec = inFlight.length > 0 ? inFlight[0].spec : undefined;
    const interceptable = spec ? this.canIntercept(spec, this.targetDistance(side)) : false;
    return {
      inFlightCount: inFlight.length,
      nearestTimeToImpact,
      lastImpact,
      rollingAppliedDps: rollingDps(state.impacts, weaponIndex, this.time, state.firstLaunchTime.get(weaponIndex), spec?.cycleTime ?? 0),
      interceptable,
    };
  }

  private stepSide(side: Side, dt: number, frame: EngagementFrame, shipPos: Vec2, targetPos: Vec2, targetVel: Vec2, launches: readonly MissileLaunchSpec[]): void {
    const state = this.sides[side];
    this.handleLaunches(state, side, shipPos, targetPos, launches, dt);
    this.advanceEntities(state, dt, targetPos, targetVel, side);
  }

  private handleLaunches(state: SideState, side: Side, shipPos: Vec2, _targetPos: Vec2, launches: readonly MissileLaunchSpec[], dt: number): void {
    for (const launch of launches) {
      const cooldown = state.cooldowns.get(launch.weaponIndex) ?? 0;
      if (cooldown > 0) {
        const remaining = cooldown - dt;
        state.cooldowns.set(launch.weaponIndex, Math.max(0, remaining));
        if (remaining > 0) continue;
      }
      if (!state.firstLaunchTime.has(launch.weaponIndex)) state.firstLaunchTime.set(launch.weaponIndex, this.time);
      state.entities.push(createMissile(shipPos, launch));
      state.cooldowns.set(launch.weaponIndex, launch.boosted.cycleTime);
    }
  }

  private advanceEntities(state: SideState, dt: number, targetPos: Vec2, targetVel: Vec2, side: Side): void {
    const survivors: MissileBody[] = [];
    for (const missile of state.entities) {
      missile.fuel -= dt;
      if (missile.fuel <= 0) continue;
      const toTarget = targetPos.sub(missile.position);
      const dist = toTarget.len();
      const paintedSig = missile.paintedSig;
      if (dist <= paintedSig) {
        const targetSpeed = targetVel.len();
        const result = this.application.compute(missile.spec, targetSpeed, paintedSig);
        const damage = missile.spec.damagePerMissile * missile.spec.launcherCount * result.application;
        state.impacts.push({ time: this.time, side, weaponIndex: missile.weaponIndex, damage, application: result.application, signatureTerm: result.signatureTerm, velocityTerm: result.velocityTerm });
        continue;
      }
      const desired = toTarget.norm().scale(missile.spec.maxVelocity);
      missile.velocity = accelerateToward(missile.velocity, desired, dt);
      const step = missile.velocity.scale(dt);
      const stepLen = step.len();
      if (stepLen >= dist) {
        const targetSpeed = targetVel.len();
        const result = this.application.compute(missile.spec, targetSpeed, paintedSig);
        const damage = missile.spec.damagePerMissile * missile.spec.launcherCount * result.application;
        state.impacts.push({ time: this.time, side, weaponIndex: missile.weaponIndex, damage, application: result.application, signatureTerm: result.signatureTerm, velocityTerm: result.velocityTerm });
        continue;
      }
      missile.position = missile.position.add(step);
      pushTrail(missile.trail, missile.position);
      survivors.push(missile);
    }
    state.entities = survivors;
    pruneImpacts(state.impacts, this.time);
  }

  private canIntercept(spec: MissileSpec, distance: number): boolean {
    return distance <= spec.flightRange;
  }

  private targetPos(side: Side, _state: SideState): Vec2 {
    return side === "shipA" ? this.lastFrameShipB : this.lastFrameShipA;
  }

  private targetDistance(side: Side): number {
    return side === "shipA" ? this.lastFrameDistance : this.lastFrameDistance;
  }

  private lastFrameShipA: Vec2 = new Vec2(0, 0);
  private lastFrameShipB: Vec2 = new Vec2(0, 0);
  private lastFrameDistance: number = 0;
}

function emptySide(): SideState {
  return { entities: [], cooldowns: new Map(), impacts: [], firstLaunchTime: new Map() };
}

function createMissile(shipPos: Vec2, launch: MissileLaunchSpec): MissileBody {
  return { position: shipPos, velocity: new Vec2(0, 0), fuel: launch.boosted.flightTime, trail: [], weaponIndex: launch.weaponIndex, spec: launch.boosted, paintedSig: launch.paintedTargetSig };
}

function accelerateToward(current: Vec2, desired: Vec2, dt: number): Vec2 {
  const factor = 1 - Math.exp(-dt / ACCEL_TAU);
  return desired.add(current.sub(desired).scale(1 - factor));
}

function pushTrail(trail: Vec2[], pos: Vec2): void {
  trail.push(pos);
  if (trail.length > TRAIL_MAX) trail.shift();
}

function toSummary(impact: MissileImpact): MissileImpactSummary {
  return { application: impact.application, signatureTerm: impact.signatureTerm, velocityTerm: impact.velocityTerm, time: impact.time };
}

function minTimeToImpact(entities: readonly MissileBody[], targetPos: Vec2): number {
  let min = Infinity;
  for (const m of entities) {
    const dist = m.position.dist(targetPos);
    const speed = m.velocity.len();
    const eta = speed > 0 ? dist / speed : Infinity;
    if (eta < min) min = eta;
  }
  return min === Infinity ? 0 : min;
}

function rollingDps(impacts: readonly MissileImpact[], weaponIndex: number, currentTime: number, firstLaunchTime: number | undefined, cycleTime: number): number {
  const weaponImpacts = impacts.filter((m) => m.weaponIndex === weaponIndex);
  if (weaponImpacts.length === 0) return 0;
  const window = Math.min(Math.max(ROLLING_WINDOW_MIN, ROLLING_WINDOW_CYCLES * cycleTime), ROLLING_WINDOW_MAX);
  const windowStart = currentTime - window;
  const inWindow = weaponImpacts.filter((m) => m.time >= windowStart);
  if (inWindow.length === 0) return 0;
  const totalDamage = inWindow.reduce((sum, m) => sum + m.damage, 0);
  const elapsed = firstLaunchTime !== undefined ? currentTime - firstLaunchTime : window;
  const effectiveWindow = Math.min(window, Math.max(elapsed, 0.1));
  return totalDamage / effectiveWindow;
}

function pruneImpacts(impacts: MissileImpact[], currentTime: number): void {
  const cutoff = currentTime - ROLLING_WINDOW_MAX;
  while (impacts.length > 0 && impacts[0].time < cutoff) impacts.shift();
}
