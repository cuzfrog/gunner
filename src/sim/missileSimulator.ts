import { Vec2 } from "./vec2";
import type { MissileApplication } from "./missileApplication";
import type { Restorable } from "./restorable";
import type {
  DamageEvent,
  DamageVector,
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

export interface MissileBodySnapshot {
  readonly position: Vec2;
  readonly launchPos: Vec2;
  readonly velocity: Vec2;
  readonly fuel: number;
  readonly spec: MissileSpec;
  readonly trail: readonly Vec2[];
  readonly weaponIndex: number;
  readonly paintedSig: number;
  readonly baseVolleyByType: DamageVector;
}

export interface MissileSideSnapshot {
  readonly entities: readonly MissileBodySnapshot[];
  readonly cooldowns: ReadonlyMap<number, number>;
  readonly weaponSpecs: ReadonlyMap<number, MissileSpec>;
  readonly lastPaintedSig: ReadonlyMap<number, number>;
  readonly lastTargetVelocity: Vec2;
  readonly lastTargetMaxSpeed: number;
}

export interface MissileSimulatorState {
  readonly sides: Record<Side, MissileSideSnapshot>;
  readonly time: number;
  readonly lastFrameShipA: Vec2;
  readonly lastFrameShipB: Vec2;
}

export interface MissileSimulator extends Restorable<MissileSimulatorState> {
  reset(config: MissileSimConfig): void;
  update(config: MissileSimConfig): void;
  step(dt: number, frame: EngagementFrame, launches: Record<Side, readonly MissileLaunchSpec[]>): readonly DamageEvent[];
  states(side: Side): readonly MissileRuntimeState[];
  facts(side: Side, weaponIndex: number): MissileAttackFacts;
}

const ACCEL_TAU = 0.5;
const TRAIL_MAX = 8;
const NO_APPLICATION: MissileApplicationResult = { application: 0, signatureTerm: 1, velocityTerm: 1 };
const PREDICTION_DT = 0.1;

interface PursuitBody {
  position: Vec2;
  launchPos: Vec2;
  velocity: Vec2;
  fuel: number;
  spec: MissileSpec;
}

interface MissileBody extends PursuitBody {
  trail: Vec2[];
  weaponIndex: number;
  paintedSig: number;
  baseVolleyByType: DamageVector;
}

type PursuitOutcome = "impact" | "lost" | "flying";

interface SideState {
  entities: MissileBody[];
  cooldowns: Map<number, number>;
  weaponSpecs: Map<number, MissileSpec>;
  lastPaintedSig: Map<number, number>;
  lastTargetVelocity: Vec2;
  lastTargetMaxSpeed: number;
}

export class MissileSimulatorImpl implements MissileSimulator {
  private readonly application: MissileApplication;
  private sides: Record<Side, SideState> = { shipA: emptySide(), shipB: emptySide() };
  private time: number;
  private lastFrameShipA: Vec2;
  private lastFrameShipB: Vec2;

  constructor({ missileApplication }: { missileApplication: MissileApplication }) {
    this.application = missileApplication;
    this.time = 0;
    this.lastFrameShipA = new Vec2(0, 0);
    this.lastFrameShipB = new Vec2(0, 0);
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
    if (!spec) return { inFlightCount: inFlight.length, nearestTimeToImpact: 0, predicted: NO_APPLICATION, interceptable: false };
    const targetStart = this.targetPos(side);
    const targetVel = clampToMaxSpeed(state.lastTargetVelocity, state.lastTargetMaxSpeed);
    const paintedSig = state.lastPaintedSig.get(weaponIndex) ?? 0;
    const impactTimes: number[] = inFlight.map((m) => pursuitImpactTime(m, targetStart, targetVel)).filter((t) => t !== undefined);
    if (paintedSig > 0) {
      const launch = simulateIntercept(spec, this.shipPos(side), targetStart, targetVel, paintedSig);
      if (launch.interceptable) impactTimes.push(launch.timeToImpact);
    }
    const nearestTimeToImpact = impactTimes.length > 0 ? Math.min(...impactTimes) : 0;
    const interceptable = impactTimes.length > 0;
    const predicted = this.predictApplication(state, spec, weaponIndex, interceptable);
    return { inFlightCount: inFlight.length, nearestTimeToImpact, predicted, interceptable };
  }

  capture(): MissileSimulatorState {
    return {
      sides: { shipA: snapshotSide(this.sides.shipA), shipB: snapshotSide(this.sides.shipB) },
      time: this.time, lastFrameShipA: this.lastFrameShipA, lastFrameShipB: this.lastFrameShipB,
    };
  }

  restore(state: MissileSimulatorState): void {
    this.sides = { shipA: materializeSide(state.sides.shipA), shipB: materializeSide(state.sides.shipB) };
    this.time = state.time;
    this.lastFrameShipA = state.lastFrameShipA;
    this.lastFrameShipB = state.lastFrameShipB;
  }

  private stepSide(side: Side, dt: number, shipPos: Vec2, targetPos: Vec2, targetVel: Vec2, targetMaxSpeed: number, launches: readonly MissileLaunchSpec[]): readonly DamageEvent[] {
    const state = this.sides[side];
    this.updateTargetKinematics(state, targetVel, targetMaxSpeed);
    this.handleLaunches(state, shipPos, launches, dt);
    return this.advanceEntities(side, state, dt, targetPos, targetVel);
  }

  private updateTargetKinematics(state: SideState, targetVel: Vec2, targetMaxSpeed: number): void {
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

  private advanceEntities(source: Side, state: SideState, dt: number, targetPos: Vec2, targetVel: Vec2): readonly DamageEvent[] {
    const survivors: MissileBody[] = [];
    const events: DamageEvent[] = [];
    const target = source === "shipA" ? "shipB" : "shipA";
    for (const missile of state.entities) {
      const outcome = advancePursuit(missile, dt, targetPos, missile.paintedSig);
      if (outcome === "impact") {
        const event = this.impactEvent(source, target, missile, targetVel);
        if (event) events.push(event);
        continue;
      }
      if (outcome === "flying") {
        pushTrail(missile.trail, missile.position);
        survivors.push(missile);
      }
    }
    state.entities = survivors;
    return events;
  }

  private impactEvent(source: Side, target: Side, missile: MissileBody, targetVel: Vec2): DamageEvent | undefined {
    const result = this.application.compute(missile.spec, targetVel.len(), missile.paintedSig);
    if (result.application <= 0) return undefined;
    const rawByType = damageVectorScale(missile.baseVolleyByType, result.application);
    if (damageVectorSum(rawByType) <= 0) return undefined;
    return { target, source, weaponIndex: missile.weaponIndex, kind: "missile", rawByType };
  }

  private predictApplication(state: SideState, spec: MissileSpec, weaponIndex: number, interceptable: boolean): MissileApplicationResult {
    const paintedSig = state.lastPaintedSig.get(weaponIndex) ?? 0;
    if (paintedSig <= 0) return NO_APPLICATION;
    const predictedSpeed = Math.min(state.lastTargetVelocity.len(), state.lastTargetMaxSpeed);
    const result = this.application.compute(spec, predictedSpeed, paintedSig);
    if (!interceptable) return { application: 0, signatureTerm: result.signatureTerm, velocityTerm: result.velocityTerm };
    return result;
  }

  private targetPos(side: Side): Vec2 {
    return side === "shipA" ? this.lastFrameShipB : this.lastFrameShipA;
  }

  private shipPos(side: Side): Vec2 {
    return side === "shipA" ? this.lastFrameShipA : this.lastFrameShipB;
  }
}

function emptySide(): SideState {
  return { entities: [], cooldowns: new Map(), weaponSpecs: new Map(), lastPaintedSig: new Map(), lastTargetVelocity: new Vec2(0, 0), lastTargetMaxSpeed: 0 };
}

function snapshotSide(state: SideState): MissileSideSnapshot {
  return {
    entities: state.entities.map(snapshotBody), cooldowns: new Map(state.cooldowns), weaponSpecs: new Map(state.weaponSpecs),
    lastPaintedSig: new Map(state.lastPaintedSig), lastTargetVelocity: state.lastTargetVelocity,
    lastTargetMaxSpeed: state.lastTargetMaxSpeed,
  };
}

function materializeSide(snapshot: MissileSideSnapshot): SideState {
  return {
    entities: snapshot.entities.map(materializeBody), cooldowns: new Map(snapshot.cooldowns), weaponSpecs: new Map(snapshot.weaponSpecs),
    lastPaintedSig: new Map(snapshot.lastPaintedSig), lastTargetVelocity: snapshot.lastTargetVelocity,
    lastTargetMaxSpeed: snapshot.lastTargetMaxSpeed,
  };
}

function snapshotBody(missile: MissileBody): MissileBodySnapshot {
  return {
    position: missile.position, launchPos: missile.launchPos, velocity: missile.velocity, fuel: missile.fuel, spec: missile.spec,
    trail: [...missile.trail], weaponIndex: missile.weaponIndex, paintedSig: missile.paintedSig, baseVolleyByType: missile.baseVolleyByType,
  };
}

function materializeBody(snapshot: MissileBodySnapshot): MissileBody {
  return {
    position: snapshot.position, launchPos: snapshot.launchPos, velocity: snapshot.velocity, fuel: snapshot.fuel, spec: snapshot.spec,
    trail: [...snapshot.trail], weaponIndex: snapshot.weaponIndex,
    paintedSig: snapshot.paintedSig, baseVolleyByType: snapshot.baseVolleyByType,
  };
}

function createMissile(shipPos: Vec2, launch: MissileLaunchSpec): MissileBody {
  return { position: shipPos, launchPos: shipPos, velocity: new Vec2(0, 0), fuel: launch.boosted.flightTime, trail: [], weaponIndex: launch.weaponIndex, spec: launch.boosted, paintedSig: launch.paintedTargetSig, baseVolleyByType: launch.baseVolleyByType };
}

function advancePursuit(body: PursuitBody, dt: number, targetPos: Vec2, paintedSig: number): PursuitOutcome {
  body.fuel -= dt;
  if (body.fuel <= 0) return "lost";
  if (body.position.dist(body.launchPos) >= body.spec.flightRange) return "lost";
  const toTarget = targetPos.sub(body.position);
  const dist = toTarget.len();
  if (dist <= paintedSig) return "impact";
  const desired = toTarget.norm().scale(body.spec.maxVelocity);
  body.velocity = accelerateToward(body.velocity, desired, dt);
  const step = body.velocity.scale(dt);
  if (step.len() >= dist) return "impact";
  body.position = body.position.add(step);
  return "flying";
}

function simulateIntercept(spec: MissileSpec, launchPos: Vec2, targetStart: Vec2, targetVel: Vec2, paintedSig: number): { interceptable: boolean; timeToImpact: number } {
  const body: PursuitBody = { position: launchPos, launchPos, velocity: new Vec2(0, 0), fuel: spec.flightTime, spec };
  const steps = Math.ceil(spec.flightTime / PREDICTION_DT);
  for (let i = 0; i < steps; i++) {
    const targetPos = targetStart.add(targetVel.scale((i + 1) * PREDICTION_DT));
    if (advancePursuit(body, PREDICTION_DT, targetPos, paintedSig) === "impact") return { interceptable: true, timeToImpact: (i + 1) * PREDICTION_DT };
  }
  return { interceptable: false, timeToImpact: 0 };
}

function pursuitImpactTime(missile: MissileBody, targetStart: Vec2, targetVel: Vec2): number | undefined {
  const body: PursuitBody = { ...missile };
  const steps = Math.ceil(body.fuel / PREDICTION_DT);
  for (let i = 0; i < steps; i++) {
    const targetPos = targetStart.add(targetVel.scale((i + 1) * PREDICTION_DT));
    if (advancePursuit(body, PREDICTION_DT, targetPos, missile.paintedSig) === "impact") return (i + 1) * PREDICTION_DT;
  }
  return undefined;
}

function clampToMaxSpeed(velocity: Vec2, maxSpeed: number): Vec2 {
  return velocity.len() > maxSpeed ? velocity.norm().scale(maxSpeed) : velocity;
}

function accelerateToward(current: Vec2, desired: Vec2, dt: number): Vec2 {
  const factor = 1 - Math.exp(-dt / ACCEL_TAU);
  return desired.add(current.sub(desired).scale(1 - factor));
}

function pushTrail(trail: Vec2[], pos: Vec2): void {
  trail.push(pos);
  if (trail.length > TRAIL_MAX) trail.shift();
}
