import { Vec2 } from "./vec2";
import type { DroneMode, DroneRuntimeState, DroneSpec, EngagementFrame, Side } from "./types";

export interface DroneSimulator {
  reset(config: DroneSimConfig): void;
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
}

interface DroneGroupState {
  readonly spec: DroneSpec;
  readonly drones: DroneBody[];
  mode: DroneMode;
  distanceToTarget: number;
  inControlRange: boolean;
  deployed: boolean;
}

const DEPLOY_RADIUS = 1000;
const DRONE_ACCEL_TAU = 1.0;
const ORBIT_RADIAL_GAIN = 5.0;

export class DroneSimulatorImpl implements DroneSimulator {
  private groups: Record<Side, DroneGroupState[]> = { shipA: [], shipB: [] };

  constructor() {}

  reset(config: DroneSimConfig): void {
    this.groups = {
      shipA: config.shipA.map((spec) => createGroupState(spec)),
      shipB: config.shipB.map((spec) => createGroupState(spec)),
    };
  }

  step(dt: number, frame: EngagementFrame): void {
    stepSide(this.groups.shipA, frame.shipA.position, frame.shipB.position, frame.distance, dt);
    stepSide(this.groups.shipB, frame.shipB.position, frame.shipA.position, frame.distance, dt);
  }

  states(side: Side): readonly DroneRuntimeState[] {
    return this.groups[side].map((g) => ({ mode: g.mode, positions: g.drones.map((d) => d.position), distanceToTarget: g.distanceToTarget, inControlRange: g.inControlRange }));
  }
}

function createGroupState(spec: DroneSpec): DroneGroupState {
  const count = Math.max(1, spec.droneCount);
  const drones: DroneBody[] = [];
  for (let i = 0; i < count; i++) drones.push({ position: new Vec2(0, 0), velocity: new Vec2(0, 0) });
  return { spec, drones, mode: "idle", distanceToTarget: 0, inControlRange: false, deployed: false };
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
  group.mode = "orbiting";
  group.distanceToTarget = group.drones[0].position.dist(targetPos);
}

function stepCombatDrone(group: DroneGroupState, shipPos: Vec2, targetPos: Vec2, inControlRange: boolean, dt: number): void {
  const previousMode = group.mode;
  if (!inControlRange) {
    if (previousMode === "approaching" || previousMode === "orbiting") group.mode = "returning";
  } else {
    if (previousMode === "idle" || previousMode === "returning") group.mode = "approaching";
  }

  if (group.mode === "idle") {
    for (const drone of group.drones) { drone.position = shipPos; drone.velocity = new Vec2(0, 0); }
    group.distanceToTarget = shipPos.dist(targetPos);
    return;
  }

  if (group.mode === "returning") {
    const allAtShip = moveDronesToward(group.drones, shipPos, group.spec.maxVelocity, dt);
    if (allAtShip) group.mode = "idle";
    group.distanceToTarget = averageDistance(group.drones, targetPos);
    return;
  }

  if (group.mode === "approaching") {
    if (previousMode === "idle") deployDrones(group.drones, shipPos);
    moveDronesToward(group.drones, targetPos, group.spec.maxVelocity, dt);
    group.distanceToTarget = averageDistance(group.drones, targetPos);
    const attackRange = group.spec.optimal > 0 ? group.spec.optimal : 1;
    if (group.distanceToTarget <= attackRange) group.mode = "orbiting";
    return;
  }

  if (group.mode === "orbiting") {
    orbitDrones(group.drones, targetPos, group.spec.optimal, group.spec.orbitSpeed, dt);
    group.distanceToTarget = averageDistance(group.drones, targetPos);
  }
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

function orbitDrones(drones: DroneBody[], targetPos: Vec2, orbitRange: number, orbitSpeed: number, dt: number): void {
  for (const drone of drones) {
    const toTarget = targetPos.sub(drone.position);
    const dist = toTarget.len();
    const radial = dist > 0 ? toTarget.scale(1 / dist) : new Vec2(1, 0);
    const tangential = new Vec2(-radial.y, radial.x);
    const radialError = dist - orbitRange;
    const desired = tangential.scale(orbitSpeed).add(radial.scale(radialError * ORBIT_RADIAL_GAIN));
    drone.velocity = accelerateToward(drone.velocity, desired, dt);
    drone.position = drone.position.add(drone.velocity.scale(dt));
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
