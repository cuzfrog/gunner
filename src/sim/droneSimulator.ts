import { Vec2 } from "./vec2";
import type { DroneMode, DroneRuntimeState, DroneSpec, EngagementFrame, Side } from "./types";

export interface DroneSimulator {
  reset(config: DroneSimConfig): void;
  update(config: DroneSimConfig): void;
  step(dt: number, frame: EngagementFrame): void;
  states(side: Side): readonly DroneRuntimeState[];
}

export interface DroneSimConfig {
  readonly shipA: readonly DroneSpec[];
  readonly shipB: readonly DroneSpec[];
}

interface DroneBody {
  position: Vec2;
  velocity: Vec2;
  orbitPhase: number;
}

interface DroneGroupState {
  readonly spec: DroneSpec;
  readonly drones: DroneBody[];
  mode: DroneMode;
  distanceToTarget: number;
  distanceToSlot: number;
  inControlRange: boolean;
  deployed: boolean;
  orbitAngle: number;
}

const DEPLOY_RADIUS = 1000;
const DRONE_ACCEL_TAU = 1.0;
const SEPARATION_RADIUS = 300;
const SEPARATION_GAIN = 3.0;

export class DroneSimulatorImpl implements DroneSimulator {
  private groups: Record<Side, DroneGroupState[]> = { shipA: [], shipB: [] };

  constructor() {}

  reset(config: DroneSimConfig): void {
    this.groups = {
      shipA: config.shipA.map((spec) => createGroupState(spec)),
      shipB: config.shipB.map((spec) => createGroupState(spec)),
    };
  }

  update(config: DroneSimConfig): void {
    this.groups = {
      shipA: mergeGroups(this.groups.shipA, config.shipA),
      shipB: mergeGroups(this.groups.shipB, config.shipB),
    };
  }

  step(dt: number, frame: EngagementFrame): void {
    stepSide(this.groups.shipA, frame.shipA.position, frame.shipB.position, frame.distance, dt);
    stepSide(this.groups.shipB, frame.shipB.position, frame.shipA.position, frame.distance, dt);
  }

  states(side: Side): readonly DroneRuntimeState[] {
    return this.groups[side].map((g) => ({ mode: g.mode, positions: g.drones.map((d) => d.position), distanceToTarget: g.distanceToTarget, distanceToSlot: g.distanceToSlot, inControlRange: g.inControlRange }));
  }
}

function createGroupState(spec: DroneSpec): DroneGroupState {
  const count = Math.max(1, spec.droneCount);
  const drones: DroneBody[] = [];
  for (let i = 0; i < count; i++) drones.push({ position: new Vec2(0, 0), velocity: new Vec2(0, 0), orbitPhase: (i / count) * Math.PI * 2 });
  return { spec, drones, mode: "idle", distanceToTarget: 0, distanceToSlot: 0, inControlRange: false, deployed: false, orbitAngle: 0 };
}

function mergeGroups(existing: DroneGroupState[], specs: readonly DroneSpec[]): DroneGroupState[] {
  return specs.map((spec, i) => {
    const prev = existing[i];
    if (!prev || prev.spec.droneCount !== spec.droneCount) return createGroupState(spec);
    return { ...prev, spec };
  });
}

function stepSide(groups: DroneGroupState[], shipPos: Vec2, targetPos: Vec2, shipToTargetDistance: number, dt: number): void {
  for (const group of groups) {
    group.inControlRange = shipToTargetDistance <= group.spec.controlRange;
    if (group.spec.isSentry) stepSentry(group, shipPos, targetPos);
    else stepCombatDrone(group, shipPos, targetPos, group.inControlRange, dt);
  }
}

function stepSentry(group: DroneGroupState, shipPos: Vec2, targetPos: Vec2): void {
  if (!group.deployed) {
    for (const drone of group.drones) drone.position = shipPos;
    group.deployed = true;
  }
  group.mode = "engaging";
  group.distanceToTarget = group.drones[0].position.dist(targetPos);
  group.distanceToSlot = 0;
}

function stepCombatDrone(group: DroneGroupState, shipPos: Vec2, targetPos: Vec2, inControlRange: boolean, dt: number): void {
  const previousMode = group.mode;
  if (!inControlRange) {
    if (previousMode === "engaging") group.mode = "returning";
  } else {
    if (previousMode === "idle" || previousMode === "returning") group.mode = "engaging";
  }

  if (group.mode === "idle") {
    for (const drone of group.drones) { drone.position = shipPos; drone.velocity = new Vec2(0, 0); }
    group.distanceToTarget = shipPos.dist(targetPos);
    group.distanceToSlot = 0;
    return;
  }

  if (group.mode === "returning") {
    const allAtShip = moveDronesToward(group.drones, shipPos, group.spec.maxVelocity, dt);
    if (allAtShip) group.mode = "idle";
    group.distanceToTarget = averageDistance(group.drones, targetPos);
    group.distanceToSlot = 0;
    return;
  }

  if (group.mode === "engaging") {
    if (previousMode === "idle") deployDrones(group.drones, shipPos);
    const orbitRange = effectiveOrbitRange(group.spec);
    const angularVelocity = orbitRange > 0 && group.spec.orbitSpeed > 0 ? group.spec.orbitSpeed / orbitRange : 0;
    group.orbitAngle += angularVelocity * dt;
    engageDrones(group.drones, targetPos, orbitRange, group.spec.orbitSpeed, group.spec.maxVelocity, group.orbitAngle, dt);
    applySeparation(group.drones, dt);
    group.distanceToTarget = averageDistance(group.drones, targetPos);
    group.distanceToSlot = averageDistanceToSlot(group.drones, targetPos, orbitRange, group.orbitAngle);
  }
}

function effectiveOrbitRange(spec: DroneSpec): number {
  return spec.orbitRange > 0 ? spec.orbitRange : (spec.optimal > 0 ? spec.optimal : 1000);
}

function deployDrones(drones: DroneBody[], shipPos: Vec2): void {
  for (let i = 0; i < drones.length; i++) {
    const angle = (i / drones.length) * Math.PI * 2;
    drones[i].position = shipPos.add(new Vec2(Math.cos(angle) * DEPLOY_RADIUS, Math.sin(angle) * DEPLOY_RADIUS));
    drones[i].velocity = new Vec2(0, 0);
  }
}

function moveDronesToward(drones: DroneBody[], destination: Vec2, maxSpeed: number, dt: number): boolean {
  let allArrived = true;
  for (const drone of drones) {
    const toDest = destination.sub(drone.position);
    const dist = toDest.len();
    if (dist <= 1) { drone.position = destination; drone.velocity = new Vec2(0, 0); continue; }
    allArrived = false;
    const desired = toDest.norm().scale(maxSpeed);
    drone.velocity = accelerateToward(drone.velocity, desired, dt);
    const step = drone.velocity.scale(dt);
    if (step.len() >= dist) { drone.position = destination; drone.velocity = new Vec2(0, 0); }
    else drone.position = drone.position.add(step);
  }
  return allArrived;
}

function engageDrones(drones: DroneBody[], targetPos: Vec2, orbitRange: number, orbitSpeed: number, maxVelocity: number, orbitAngle: number, dt: number): void {
  for (let i = 0; i < drones.length; i++) {
    const drone = drones[i];
    const angle = drone.orbitPhase + orbitAngle;
    const desiredPos = targetPos.add(new Vec2(Math.cos(angle) * orbitRange, Math.sin(angle) * orbitRange));
    const toDesired = desiredPos.sub(drone.position);
    const dist = toDesired.len();
    if (dist <= 1) { drone.position = desiredPos; continue; }
    const mwdFactor = Math.min(dist / orbitRange, 1);
    const speed = orbitSpeed + (maxVelocity - orbitSpeed) * mwdFactor;
    const desired = toDesired.norm().scale(speed);
    drone.velocity = accelerateToward(drone.velocity, desired, dt);
    const maxStep = speed * dt;
    const step = drone.velocity.scale(dt);
    const capped = step.len() > maxStep ? step.norm().scale(maxStep) : step;
    if (capped.len() >= dist) drone.position = desiredPos;
    else drone.position = drone.position.add(capped);
  }
}

function applySeparation(drones: DroneBody[], dt: number): void {
  for (let i = 0; i < drones.length; i++) {
    let separation = new Vec2(0, 0);
    for (let j = 0; j < drones.length; j++) {
      if (i === j) continue;
      const diff = drones[i].position.sub(drones[j].position);
      const dist = diff.len();
      if (dist > 0 && dist < SEPARATION_RADIUS) separation = separation.add(diff.norm().scale((SEPARATION_RADIUS - dist) / SEPARATION_RADIUS));
    }
    if (separation.len() > 0) {
      const correction = separation.scale(SEPARATION_GAIN * dt);
      drones[i].position = drones[i].position.add(correction);
    }
  }
}

function accelerateToward(current: Vec2, desired: Vec2, dt: number): Vec2 {
  const factor = 1 - Math.exp(-dt / DRONE_ACCEL_TAU);
  return desired.add(current.sub(desired).scale(1 - factor));
}

function averageDistance(drones: readonly DroneBody[], target: Vec2): number {
  if (drones.length === 0) return 0;
  let sum = 0;
  for (const drone of drones) sum += drone.position.dist(target);
  return sum / drones.length;
}

function averageDistanceToSlot(drones: readonly DroneBody[], targetPos: Vec2, orbitRange: number, orbitAngle: number): number {
  if (drones.length === 0) return 0;
  let sum = 0;
  for (const drone of drones) {
    const angle = drone.orbitPhase + orbitAngle;
    const slot = targetPos.add(new Vec2(Math.cos(angle) * orbitRange, Math.sin(angle) * orbitRange));
    sum += drone.position.dist(slot);
  }
  return sum / drones.length;
}
