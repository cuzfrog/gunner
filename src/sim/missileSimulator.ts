import { Vec2 } from "./vec2";
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
const EWMA_TAU_CYCLES = 3;
const IMPACT_TIMEOUT_CYCLES = 2;
const IMPACT_KEEP_SECONDS = 60;

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
  smoothedApplication: Map<number, number>;
  lastImpactTime: Map<number, number>;
  lastImpactSummary: Map<number, MissileImpactSummary>;
  weaponSpecs: Map<number, MissileSpec>;
}

export class MissileSimulatorImpl implements MissileSimulator {
  private readonly application: MissileApplication;
  private sides: Record<Side, SideState> = { shipA: emptySide(), shipB: emptySide() };
  private time: number;
  private lastFrameShipA: Vec2;
  private lastFrameShipB: Vec2;
  private lastFrameDistance: number;

  constructor({ missileApplication }: { missileApplication: MissileApplication }) {
    this.application = missileApplication;
    this.time = 0;
    this.lastFrameShipA = new Vec2(0, 0);
    this.lastFrameShipB = new Vec2(0, 0);
    this.lastFrameDistance = 0;
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
    this.stepSide("shipA", dt, frame.shipA.position, frame.shipB.position, frame.shipB.velocity, launches.shipA);
    this.stepSide("shipB", dt, frame.shipB.position, frame.shipA.position, frame.shipA.velocity, launches.shipB);
  }

  states(side: Side): readonly MissileRuntimeState[] {
    return this.sides[side].entities.map((m) => ({ position: m.position, velocity: m.velocity, trail: m.trail, side, weaponIndex: m.weaponIndex }));
  }

  facts(side: Side, weaponIndex: number): MissileAttackFacts {
    const state = this.sides[side];
    const inFlight = state.entities.filter((m) => m.weaponIndex === weaponIndex);
    const nearestTimeToImpact = inFlight.length > 0 ? minTimeToImpact(inFlight, this.targetPos(side)) : 0;
    const spec = state.weaponSpecs.get(weaponIndex);
    const interceptable = spec ? this.canIntercept(spec, this.targetDistance()) : false;
    return {
      inFlightCount: inFlight.length,
      nearestTimeToImpact,
      lastImpact: state.lastImpactSummary.get(weaponIndex),
      smoothedApplication: state.smoothedApplication.get(weaponIndex) ?? 0,
      interceptable,
    };
  }

  private stepSide(side: Side, dt: number, shipPos: Vec2, targetPos: Vec2, targetVel: Vec2, launches: readonly MissileLaunchSpec[]): void {
    const state = this.sides[side];
    this.handleLaunches(state, shipPos, launches, dt);
    this.advanceEntities(state, dt, targetPos, targetVel, side);
    this.expireStaleApplications(state);
  }

  private handleLaunches(state: SideState, shipPos: Vec2, launches: readonly MissileLaunchSpec[], dt: number): void {
    for (const launch of launches) {
      state.weaponSpecs.set(launch.weaponIndex, launch.boosted);
      const cooldown = state.cooldowns.get(launch.weaponIndex) ?? 0;
      if (cooldown > 0) {
        const remaining = cooldown - dt;
        state.cooldowns.set(launch.weaponIndex, Math.max(0, remaining));
        if (remaining > 0) continue;
      }
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
        this.recordImpact(state, missile, targetVel, side);
        continue;
      }
      const desired = toTarget.norm().scale(missile.spec.maxVelocity);
      missile.velocity = accelerateToward(missile.velocity, desired, dt);
      const step = missile.velocity.scale(dt);
      const stepLen = step.len();
      if (stepLen >= dist) {
        this.recordImpact(state, missile, targetVel, side);
        continue;
      }
      missile.position = missile.position.add(step);
      pushTrail(missile.trail, missile.position);
      survivors.push(missile);
    }
    state.entities = survivors;
    pruneImpacts(state.impacts, this.time);
  }

  private recordImpact(state: SideState, missile: MissileBody, targetVel: Vec2, side: Side): void {
    const targetSpeed = targetVel.len();
    const result = this.application.compute(missile.spec, targetSpeed, missile.paintedSig);
    const damage = missile.spec.damagePerMissile * missile.spec.launcherCount * result.application;
    const weaponIndex = missile.weaponIndex;
    state.impacts.push({ time: this.time, side, weaponIndex, damage, application: result.application, signatureTerm: result.signatureTerm, velocityTerm: result.velocityTerm });
    state.lastImpactSummary.set(weaponIndex, { application: result.application, signatureTerm: result.signatureTerm, velocityTerm: result.velocityTerm, time: this.time });
    const prevSmoothed = state.smoothedApplication.get(weaponIndex) ?? 0;
    const prevImpactTime = state.lastImpactTime.get(weaponIndex);
    const dtSincePrev = prevImpactTime !== undefined ? this.time - prevImpactTime : missile.spec.cycleTime;
    const tau = EWMA_TAU_CYCLES * missile.spec.cycleTime;
    const alpha = 1 - Math.exp(-dtSincePrev / tau);
    state.smoothedApplication.set(weaponIndex, prevSmoothed * (1 - alpha) + result.application * alpha);
    state.lastImpactTime.set(weaponIndex, this.time);
  }

  private expireStaleApplications(state: SideState): void {
    for (const [weaponIndex, lastTime] of state.lastImpactTime) {
      const spec = state.weaponSpecs.get(weaponIndex);
      if (!spec) continue;
      const timeout = (IMPACT_TIMEOUT_CYCLES * spec.cycleTime) + spec.flightTime;
      if (this.time - lastTime > timeout) {
        state.smoothedApplication.delete(weaponIndex);
        state.lastImpactTime.delete(weaponIndex);
      }
    }
  }

  private canIntercept(spec: MissileSpec, distance: number): boolean {
    return distance <= spec.flightRange;
  }

  private targetPos(side: Side): Vec2 {
    return side === "shipA" ? this.lastFrameShipB : this.lastFrameShipA;
  }

  private targetDistance(): number {
    return this.lastFrameDistance;
  }
}

function emptySide(): SideState {
  return { entities: [], cooldowns: new Map(), impacts: [], smoothedApplication: new Map(), lastImpactTime: new Map(), lastImpactSummary: new Map(), weaponSpecs: new Map() };
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

function pruneImpacts(impacts: MissileImpact[], currentTime: number): void {
  const cutoff = currentTime - IMPACT_KEEP_SECONDS;
  while (impacts.length > 0 && impacts[0].time < cutoff) impacts.shift();
}
