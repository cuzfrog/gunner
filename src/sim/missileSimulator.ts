import { Vec2 } from "./vec2";
import type { MissileApplication } from "./missileApplication";
import type {
  DamageEvent,
  EngagementFrame,
  MissileApplicationResult,
  MissileAttackFacts,
  MissileLaunchSpec,
  MissileRuntimeState,
  MissileSimConfig,
  MissileSpec,
  Side,
} from "./types";
import { ZERO_DAMAGE, damageVectorScale, damageVectorSum } from "./types";

export interface MissileSimulator {
  reset(config: MissileSimConfig): void;
  update(config: MissileSimConfig): void;
  step(dt: number, frame: EngagementFrame, launches: Record<Side, readonly MissileLaunchSpec[]>): readonly DamageEvent[];
  states(side: Side): readonly MissileRuntimeState[];
  facts(side: Side, weaponIndex: number): MissileAttackFacts;
}

const ACCEL_TAU = 0.5;
const TRAIL_MAX = 8;
const NO_APPLICATION: MissileApplicationResult = { application: 0, signatureTerm: 1, velocityTerm: 1 };

interface MissileBody {
  position: Vec2;
  launchPos: Vec2;
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
  weaponSpecs: Map<number, MissileSpec>;
  lastPaintedSig: Map<number, number>;
  lastTargetVelocity: Vec2;
  targetAcceleration: Vec2;
  lastTargetMaxSpeed: number;
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

  update(_config: MissileSimConfig): void {
    // Weapon specs are pushed per-step via launches; no state needs to change on config update.
  }

  step(dt: number, frame: EngagementFrame, launches: Record<Side, readonly MissileLaunchSpec[]>): readonly DamageEvent[] {
    this.time += dt;
    this.lastFrameShipA = frame.shipA.position;
    this.lastFrameShipB = frame.shipB.position;
    this.lastFrameDistance = frame.distance;
    const shipAEvents = this.stepSide("shipA", dt, frame.shipA.position, frame.shipB.position, frame.shipB.velocity, frame.shipB.maxSpeed, launches.shipA);
    const shipBEvents = this.stepSide("shipB", dt, frame.shipB.position, frame.shipA.position, frame.shipA.velocity, frame.shipA.maxSpeed, launches.shipB);
    return [...shipAEvents, ...shipBEvents];
  }

  states(side: Side): readonly MissileRuntimeState[] {
    return this.sides[side].entities.map((m) => ({ position: m.position, velocity: m.velocity, trail: m.trail, side, weaponIndex: m.weaponIndex }));
  }

  facts(side: Side, weaponIndex: number): MissileAttackFacts {
    const state = this.sides[side];
    const inFlight = state.entities.filter((m) => m.weaponIndex === weaponIndex);
    const spec = state.weaponSpecs.get(weaponIndex);
    const distance = this.targetDistance();
    const interceptable = spec ? distance <= spec.flightRange : false;
    const eta = spec && spec.maxVelocity > 0 ? distance / spec.maxVelocity : 0;
    const nearestTimeToImpact = inFlight.length > 0 ? minTimeToImpact(inFlight, this.targetPos(side)) : eta;
    const predicted = spec ? this.predictApplication(state, spec, weaponIndex, eta, interceptable) : NO_APPLICATION;
    return { inFlightCount: inFlight.length, nearestTimeToImpact, predicted, interceptable };
  }

  private stepSide(side: Side, dt: number, shipPos: Vec2, targetPos: Vec2, targetVel: Vec2, targetMaxSpeed: number, launches: readonly MissileLaunchSpec[]): readonly DamageEvent[] {
    const state = this.sides[side];
    this.updateTargetKinematics(state, targetVel, targetMaxSpeed, dt);
    this.handleLaunches(state, shipPos, launches, dt);
    return this.advanceEntities(side, state, dt, targetPos, targetVel, targetMaxSpeed);
  }

  private updateTargetKinematics(state: SideState, targetVel: Vec2, targetMaxSpeed: number, dt: number): void {
    if (dt > 0) state.targetAcceleration = targetVel.sub(state.lastTargetVelocity).scale(1 / dt);
    state.lastTargetVelocity = targetVel;
    state.lastTargetMaxSpeed = targetMaxSpeed;
  }

  private handleLaunches(state: SideState, shipPos: Vec2, launches: readonly MissileLaunchSpec[], dt: number): void {
    for (const launch of launches) {
      state.weaponSpecs.set(launch.weaponIndex, launch.boosted);
      state.lastPaintedSig.set(launch.weaponIndex, launch.paintedTargetSig);
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

  private advanceEntities(source: Side, state: SideState, dt: number, targetPos: Vec2, targetVel: Vec2, targetMaxSpeed: number): readonly DamageEvent[] {
    const survivors: MissileBody[] = [];
    const events: DamageEvent[] = [];
    const target = source === "shipA" ? "shipB" : "shipA";
    for (const missile of state.entities) {
      missile.fuel -= dt;
      if (missile.fuel <= 0) continue;
      if (missile.position.dist(missile.launchPos) >= missile.spec.flightRange) continue;
      const toTarget = targetPos.sub(missile.position);
      const dist = toTarget.len();
      if (dist <= missile.paintedSig) {
        const event = this.impactEvent(source, target, missile, targetVel, targetMaxSpeed);
        if (event) events.push(event);
        continue;
      }
      const desired = toTarget.norm().scale(missile.spec.maxVelocity);
      missile.velocity = accelerateToward(missile.velocity, desired, dt);
      const step = missile.velocity.scale(dt);
      if (step.len() >= dist) {
        const event = this.impactEvent(source, target, missile, targetVel, targetMaxSpeed);
        if (event) events.push(event);
        continue;
      }
      missile.position = missile.position.add(step);
      pushTrail(missile.trail, missile.position);
      survivors.push(missile);
    }
    state.entities = survivors;
    return events;
  }

  private impactEvent(source: Side, target: Side, missile: MissileBody, targetVel: Vec2, targetMaxSpeed: number): DamageEvent | undefined {
    const targetSpeed = Math.min(targetVel.len(), targetMaxSpeed);
    const result = this.application.compute(missile.spec, targetSpeed, missile.paintedSig);
    if (result.application <= 0) return undefined;
    const rawByType = damageVectorScale(missile.spec.damagePerMissile, result.application);
    if (damageVectorSum(rawByType) <= 0) return undefined;
    return { target, source, weaponIndex: missile.weaponIndex, kind: "missile", rawByType };
  }

  private predictApplication(state: SideState, spec: MissileSpec, weaponIndex: number, eta: number, interceptable: boolean): MissileApplicationResult {
    const paintedSig = state.lastPaintedSig.get(weaponIndex) ?? 0;
    if (paintedSig <= 0) return NO_APPLICATION;
    const predictedVel = state.lastTargetVelocity.add(state.targetAcceleration.scale(eta));
    const predictedSpeed = Math.min(predictedVel.len(), state.lastTargetMaxSpeed);
    const result = this.application.compute(spec, predictedSpeed, paintedSig);
    if (!interceptable) return { application: 0, signatureTerm: result.signatureTerm, velocityTerm: result.velocityTerm };
    return result;
  }

  private targetPos(side: Side): Vec2 {
    return side === "shipA" ? this.lastFrameShipB : this.lastFrameShipA;
  }

  private targetDistance(): number {
    return this.lastFrameDistance;
  }
}

function emptySide(): SideState {
  return { entities: [], cooldowns: new Map(), weaponSpecs: new Map(), lastPaintedSig: new Map(), lastTargetVelocity: new Vec2(0, 0), targetAcceleration: new Vec2(0, 0), lastTargetMaxSpeed: 0 };
}

function createMissile(shipPos: Vec2, launch: MissileLaunchSpec): MissileBody {
  return { position: shipPos, launchPos: shipPos, velocity: new Vec2(0, 0), fuel: launch.boosted.flightTime, trail: [], weaponIndex: launch.weaponIndex, spec: launch.boosted, paintedSig: launch.paintedTargetSig };
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
