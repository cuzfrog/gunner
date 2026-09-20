import type { OrbitBody } from "./orbitalMovement";
import { applySeparation, averageDistance, deployBodies, engageBodies, moveBodiesToward } from "./orbitalMovement";
import { Vec2 } from "./vec2";
import type { Restorable } from "./restorable";
import { damageVectorSum, type DamageEvent, type DroneMode, type DroneRuntimeState, type DroneSpec, type EngagementFrame, type Side, type UnitPoolsSpec } from "./types";

export interface DroneBodySnapshot {
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly orbitPhase: number;
}

export interface DroneGroupSnapshot {
  readonly spec: DroneSpec;
  readonly drones: readonly DroneBodySnapshot[];
  readonly mode: DroneMode;
  readonly distanceToTarget: number;
  readonly distanceToSlot: number;
  readonly inControlRange: boolean;
  readonly deployed: boolean;
  readonly orbitAngle: number;
  readonly pools: readonly UnitPools[] | undefined;
}

export interface DroneSimulatorState {
  readonly groups: Record<Side, readonly DroneGroupSnapshot[]>;
}

export interface DroneSimulator extends Restorable<DroneSimulatorState> {
  reset(config: DroneSimConfig): void;
  update(config: DroneSimConfig): void;
  step(dt: number, frame: EngagementFrame, operational: Record<Side, boolean>, events?: readonly DamageEvent[]): void;
  states(side: Side): readonly DroneRuntimeState[];
}

export interface DroneSimConfig {
  readonly shipA: readonly DroneSpec[];
  readonly shipB: readonly DroneSpec[];
}

type DroneBody = OrbitBody;

/** Mutable per-drone hp pools; remaining 0 marks the drone destroyed. */
interface UnitPools {
  shield: number;
  armor: number;
  hull: number;
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
  readonly pools: UnitPools[] | undefined;
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

  update(config: DroneSimConfig): void {
    this.groups = {
      shipA: mergeGroups(this.groups.shipA, config.shipA),
      shipB: mergeGroups(this.groups.shipB, config.shipB),
    };
  }

  step(dt: number, frame: EngagementFrame, operational: Record<Side, boolean>, events: readonly DamageEvent[] = []): void {
    applyUnitEvents(this.groups.shipA, events, "shipA");
    applyUnitEvents(this.groups.shipB, events, "shipB");
    if (operational.shipA) stepSide(this.groups.shipA, frame.shipA.position, frame.shipB.position, frame.distance, dt);
    if (operational.shipB) stepSide(this.groups.shipB, frame.shipB.position, frame.shipA.position, frame.distance, dt);
  }

  states(side: Side): readonly DroneRuntimeState[] {
    return this.groups[side].map((g) => {
      const alive = aliveIndices(g);
      return {
        mode: g.mode,
        positions: alive.map((i) => g.drones[i].position),
        distanceToTarget: g.distanceToTarget,
        distanceToSlot: g.distanceToSlot,
        inControlRange: g.inControlRange,
        aliveCount: alive.length,
        hpFractions: g.pools ? alive.map((i) => hpFraction(g.pools![i], poolsTotal(g.spec.hp))) : alive.map(() => 1),
      };
    });
  }

  capture(): DroneSimulatorState {
    return { groups: snapshotGroups(this.groups) };
  }

  restore(state: DroneSimulatorState): void {
    this.groups = materializeGroups(state.groups);
  }
}

function snapshotGroups(groups: Record<Side, DroneGroupState[]>): Record<Side, readonly DroneGroupSnapshot[]> {
  return { shipA: groups.shipA.map(snapshotGroup), shipB: groups.shipB.map(snapshotGroup) };
}

function materializeGroups(snapshots: Record<Side, readonly DroneGroupSnapshot[]>): Record<Side, DroneGroupState[]> {
  return { shipA: snapshots.shipA.map(materializeGroup), shipB: snapshots.shipB.map(materializeGroup) };
}

function snapshotGroup(group: DroneGroupState): DroneGroupSnapshot {
  return {
    spec: group.spec, drones: group.drones.map(snapshotBody), mode: group.mode, distanceToTarget: group.distanceToTarget,
    distanceToSlot: group.distanceToSlot, inControlRange: group.inControlRange, deployed: group.deployed, orbitAngle: group.orbitAngle,
    pools: group.pools?.map((pools) => ({ ...pools })),
  };
}

function materializeGroup(snapshot: DroneGroupSnapshot): DroneGroupState {
  return {
    spec: snapshot.spec, drones: snapshot.drones.map(materializeBody), mode: snapshot.mode, distanceToTarget: snapshot.distanceToTarget,
    distanceToSlot: snapshot.distanceToSlot, inControlRange: snapshot.inControlRange,
    deployed: snapshot.deployed, orbitAngle: snapshot.orbitAngle,
    pools: snapshot.pools?.map((pools) => ({ ...pools })),
  };
}

function snapshotBody(body: DroneBody): DroneBodySnapshot {
  return { position: body.position, velocity: body.velocity, orbitPhase: body.orbitPhase };
}

function materializeBody(body: DroneBodySnapshot): DroneBody {
  return { position: body.position, velocity: body.velocity, orbitPhase: body.orbitPhase };
}

function createGroupState(spec: DroneSpec): DroneGroupState {
  const count = Math.max(1, spec.droneCount);
  const drones: DroneBody[] = [];
  for (let i = 0; i < count; i++) drones.push({ position: new Vec2(0, 0), velocity: new Vec2(0, 0), orbitPhase: (i / count) * Math.PI * 2 });
  return { spec, drones, mode: "idle", distanceToTarget: 0, distanceToSlot: 0, inControlRange: false, deployed: false, orbitAngle: 0, pools: spec.hp ? freshPools(spec.hp, count) : undefined };
}

function freshPools(spec: UnitPoolsSpec, count: number): UnitPools[] {
  return Array.from({ length: count }, () => ({ shield: spec.shield, armor: spec.armor, hull: spec.hull }));
}

function aliveIndices(group: DroneGroupState): readonly number[] {
  if (!group.pools) return group.drones.map((_, i) => i);
  return group.pools.flatMap((pools, i) => (pools.shield + pools.armor + pools.hull > 0 ? [i] : []));
}

function hpFraction(pools: UnitPools, total: number): number {
  return total > 0 ? (pools.shield + pools.armor + pools.hull) / total : 1;
}

function mergeGroups(existing: DroneGroupState[], specs: readonly DroneSpec[]): DroneGroupState[] {
  return specs.map((spec, i) => {
    const prev = existing[i];
    if (!prev || prev.spec.droneCount !== spec.droneCount || poolsTotal(prev.spec.hp) !== poolsTotal(spec.hp)) return createGroupState(spec);
    return { ...prev, spec };
  });
}

function poolsTotal(spec: UnitPoolsSpec | undefined): number {
  return spec ? spec.shield + spec.armor + spec.hull : 0;
}

/** Applies this frame's unit-targeted damage: every event focuses the first alive drone (drone groups in fit order). */
function applyUnitEvents(groups: DroneGroupState[], events: readonly DamageEvent[], side: Side): void {
  for (const event of events) {
    if (event.target !== side || event.unitTarget !== "drone") continue;
    const group = groups.find((candidate) => aliveIndices(candidate).length > 0 && candidate.pools !== undefined);
    if (!group || !group.pools) continue;
    const index = aliveIndices(group)[0];
    applyDamageToPools(group.pools[index], damageVectorSum(event.rawByType));
  }
}

/** Damage cascades shield -> armor -> hull; a drone with no remaining pool is destroyed. */
function applyDamageToPools(pools: UnitPools, amount: number): void {
  let remaining = amount;
  for (const layer of ["shield", "armor", "hull"] as const) {
    const absorbed = Math.min(pools[layer], remaining);
    pools[layer] -= absorbed;
    remaining -= absorbed;
    if (remaining <= 0) return;
  }
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
    const allAtShip = moveBodiesToward(group.drones, shipPos, group.spec.maxVelocity, dt);
    if (allAtShip) group.mode = "idle";
    group.distanceToTarget = averageDistance(group.drones, targetPos);
    group.distanceToSlot = 0;
    return;
  }

  if (group.mode === "engaging") {
    if (previousMode === "idle") deployBodies(group.drones, shipPos);
    const orbitRange = effectiveOrbitRange(group.spec);
    const angularVelocity = orbitRange > 0 && group.spec.orbitSpeed > 0 ? group.spec.orbitSpeed / orbitRange : 0;
    group.orbitAngle += angularVelocity * dt;
    engageBodies(group.drones, targetPos, orbitRange, group.spec.orbitSpeed, group.spec.maxVelocity, group.orbitAngle, dt);
    applySeparation(group.drones, dt);
    group.distanceToTarget = averageDistance(group.drones, targetPos);
    group.distanceToSlot = averageDistanceToSlot(group.drones, targetPos, orbitRange, group.orbitAngle);
  }
}

function effectiveOrbitRange(spec: DroneSpec): number {
  return spec.orbitRange > 0 ? spec.orbitRange : (spec.optimal > 0 ? spec.optimal : 1000);
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
