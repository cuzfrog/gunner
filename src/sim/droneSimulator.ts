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

interface DroneGroupState {
  readonly spec: DroneSpec;
  position: Vec2;
  mode: DroneMode;
  distanceToTarget: number;
  inControlRange: boolean;
  deployed: boolean;
}

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
    return this.groups[side].map((g) => ({ mode: g.mode, position: g.position, distanceToTarget: g.distanceToTarget, inControlRange: g.inControlRange }));
  }
}

function createGroupState(spec: DroneSpec): DroneGroupState {
  return { spec, position: new Vec2(0, 0), mode: "idle", distanceToTarget: 0, inControlRange: false, deployed: false };
}

function stepSide(groups: DroneGroupState[], shipPos: Vec2, targetPos: Vec2, shipToTargetDistance: number, dt: number): void {
  for (const group of groups) {
    const controlRange = group.spec.controlRange;
    const inControlRange = shipToTargetDistance <= controlRange;
    group.inControlRange = inControlRange;

    if (group.spec.isSentry) {
      stepSentry(group, shipPos, targetPos);
    } else {
      stepCombatDrone(group, shipPos, targetPos, inControlRange, dt);
    }
  }
}

function stepSentry(group: DroneGroupState, shipPos: Vec2, targetPos: Vec2): void {
  if (!group.deployed) {
    group.position = shipPos;
    group.deployed = true;
  }
  group.mode = "orbiting";
  group.distanceToTarget = group.position.dist(targetPos);
}

function stepCombatDrone(group: DroneGroupState, shipPos: Vec2, targetPos: Vec2, inControlRange: boolean, dt: number): void {
  const previousMode = group.mode;

  if (!inControlRange) {
    if (previousMode === "approaching" || previousMode === "orbiting") {
      group.mode = "returning";
    }
  } else {
    if (previousMode === "idle" || previousMode === "returning") {
      group.mode = "approaching";
    }
  }

  if (group.mode === "idle") {
    group.position = shipPos;
    group.distanceToTarget = shipPos.dist(targetPos);
    return;
  }

  if (group.mode === "returning") {
    if (group.position.dist(shipPos) <= 1) {
      group.position = shipPos;
      group.mode = "idle";
      group.distanceToTarget = shipPos.dist(targetPos);
      return;
    }
    moveToward(group, shipPos, group.spec.maxVelocity, dt);
    group.distanceToTarget = group.position.dist(targetPos);
    if (group.position.dist(shipPos) <= 1) {
      group.position = shipPos;
      group.mode = "idle";
    }
    return;
  }

  if (group.mode === "approaching") {
    if (previousMode === "idle") group.position = shipPos;
    moveToward(group, targetPos, group.spec.maxVelocity, dt);
    group.distanceToTarget = group.position.dist(targetPos);
    const attackRange = group.spec.optimal > 0 ? group.spec.optimal : 1;
    if (group.distanceToTarget <= attackRange) {
      group.mode = "orbiting";
    }
    return;
  }

  if (group.mode === "orbiting") {
    group.distanceToTarget = group.spec.optimal > 0 ? group.spec.optimal : group.position.dist(targetPos);
  }
}

function moveToward(group: DroneGroupState, destination: Vec2, speed: number, dt: number): void {
  if (speed <= 0 || dt <= 0) return;
  const toDest = destination.sub(group.position);
  const dist = toDest.len();
  if (dist <= 1) {
    group.position = destination;
    return;
  }
  const step = speed * dt;
  if (step >= dist) {
    group.position = destination;
  } else {
    group.position = group.position.add(toDest.norm().scale(step));
  }
}

export { stepSide as _stepSide, stepCombatDrone as _stepCombatDrone, stepSentry as _stepSentry, moveToward as _moveToward };
