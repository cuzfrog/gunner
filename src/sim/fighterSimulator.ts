import type { OrbitBody } from "./orbitalMovement";
import { applySeparation, averageDistance, deployBodies, engageBodies } from "./orbitalMovement";
import { Vec2 } from "./vec2";
import type { Restorable } from "./restorable";
import type { EngagementFrame, FighterRuntimeState, FighterSpec, Side } from "./types";

export interface FighterBodySnapshot {
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly orbitPhase: number;
}

export interface FighterGroupSnapshot {
  readonly spec: FighterSpec;
  readonly fighters: readonly FighterBodySnapshot[];
  readonly orbitAngle: number;
  readonly distanceToTarget: number;
}

export interface FighterSimulatorState {
  readonly groups: Record<Side, readonly FighterGroupSnapshot[]>;
}

export interface FighterSimulator extends Restorable<FighterSimulatorState> {
  reset(config: FighterSimConfig): void;
  update(config: FighterSimConfig): void;
  step(dt: number, frame: EngagementFrame, operational: Record<Side, boolean>): void;
  states(side: Side): readonly FighterRuntimeState[];
}

export interface FighterSimConfig {
  readonly shipA: readonly FighterSpec[];
  readonly shipB: readonly FighterSpec[];
}

interface FighterGroupState {
  readonly spec: FighterSpec;
  readonly fighters: OrbitBody[];
  orbitAngle: number;
  launched: boolean;
  distanceToTarget: number;
}

/** Squadrons always engage: fighters have no control-range limit, no idle/return states, and orbit the target at full speed. */
export class FighterSimulatorImpl implements FighterSimulator {
  private groups: Record<Side, FighterGroupState[]> = { shipA: [], shipB: [] };

  reset(config: FighterSimConfig): void {
    this.groups = {
      shipA: config.shipA.map((spec) => createGroupState(spec)),
      shipB: config.shipB.map((spec) => createGroupState(spec)),
    };
  }

  update(config: FighterSimConfig): void {
    this.groups = {
      shipA: mergeGroups(this.groups.shipA, config.shipA),
      shipB: mergeGroups(this.groups.shipB, config.shipB),
    };
  }

  step(dt: number, frame: EngagementFrame, operational: Record<Side, boolean>): void {
    if (operational.shipA) stepSide(this.groups.shipA, frame.shipA.position, frame.shipB.position, dt);
    if (operational.shipB) stepSide(this.groups.shipB, frame.shipB.position, frame.shipA.position, dt);
  }

  states(side: Side): readonly FighterRuntimeState[] {
    return this.groups[side].map((g) => ({ positions: g.fighters.map((f) => f.position), distanceToTarget: g.distanceToTarget }));
  }

  capture(): FighterSimulatorState {
    return { groups: { shipA: this.groups.shipA.map(snapshotGroup), shipB: this.groups.shipB.map(snapshotGroup) } };
  }

  restore(state: FighterSimulatorState): void {
    this.groups = { shipA: state.groups.shipA.map(materializeGroup), shipB: state.groups.shipB.map(materializeGroup) };
  }
}

function createGroupState(spec: FighterSpec): FighterGroupState {
  const count = Math.max(1, spec.fighterCount);
  const fighters: OrbitBody[] = [];
  for (let i = 0; i < count; i++) fighters.push({ position: new Vec2(0, 0), velocity: new Vec2(0, 0), orbitPhase: (i / count) * Math.PI * 2 });
  return { spec, fighters, orbitAngle: 0, launched: false, distanceToTarget: 0 };
}

function mergeGroups(existing: FighterGroupState[], specs: readonly FighterSpec[]): FighterGroupState[] {
  return specs.map((spec, i) => {
    const prev = existing[i];
    if (!prev || prev.spec.fighterCount !== spec.fighterCount) return createGroupState(spec);
    return { ...prev, spec };
  });
}

function stepSide(groups: FighterGroupState[], shipPos: Vec2, targetPos: Vec2, dt: number): void {
  for (const group of groups) {
    if (!group.launched) {
      deployBodies(group.fighters, shipPos);
      group.launched = true;
    }
    const orbitRange = group.spec.orbitRange > 0 ? group.spec.orbitRange : 1000;
    const angularVelocity = group.spec.maxVelocity > 0 ? group.spec.maxVelocity / orbitRange : 0;
    group.orbitAngle += angularVelocity * dt;
    engageBodies(group.fighters, targetPos, orbitRange, group.spec.maxVelocity, group.spec.maxVelocity, group.orbitAngle, dt);
    applySeparation(group.fighters, dt);
    group.distanceToTarget = averageDistance(group.fighters, targetPos);
  }
}

function snapshotGroup(group: FighterGroupState): FighterGroupSnapshot {
  return { spec: group.spec, fighters: group.fighters.map((f) => ({ position: f.position, velocity: f.velocity, orbitPhase: f.orbitPhase })), orbitAngle: group.orbitAngle, distanceToTarget: group.distanceToTarget };
}

function materializeGroup(snapshot: FighterGroupSnapshot): FighterGroupState {
  return { spec: snapshot.spec, fighters: snapshot.fighters.map((f) => ({ position: f.position, velocity: f.velocity, orbitPhase: f.orbitPhase })), orbitAngle: snapshot.orbitAngle, launched: true, distanceToTarget: snapshot.distanceToTarget };
}
