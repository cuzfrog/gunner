import type { OrbitBody } from "./orbitalMovement";
import { applySeparation, averageDistance, deployBodies, engageBodies } from "./orbitalMovement";
import { Vec2 } from "./vec2";
import type { Restorable } from "./restorable";
import { damageVectorSum, type DamageEvent, type EngagementFrame, type FighterRuntimeState, type FighterSpec, type Side, type UnitPoolsSpec } from "./types";

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
  readonly pools: readonly UnitPools[] | undefined;
}

export interface FighterSimulatorState {
  readonly groups: Record<Side, readonly FighterGroupSnapshot[]>;
}

export interface FighterSimulator extends Restorable<FighterSimulatorState> {
  reset(config: FighterSimConfig): void;
  update(config: FighterSimConfig): void;
  step(dt: number, frame: EngagementFrame, operational: Record<Side, boolean>, events?: readonly DamageEvent[]): void;
  states(side: Side): readonly FighterRuntimeState[];
}

export interface FighterSimConfig {
  readonly shipA: readonly FighterSpec[];
  readonly shipB: readonly FighterSpec[];
}

/** Mutable per-fighter hp pools; remaining 0 marks the fighter destroyed. */
interface UnitPools {
  shield: number;
  armor: number;
  hull: number;
}

interface FighterGroupState {
  readonly spec: FighterSpec;
  readonly fighters: OrbitBody[];
  orbitAngle: number;
  launched: boolean;
  distanceToTarget: number;
  readonly pools: UnitPools[] | undefined;
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

  step(dt: number, frame: EngagementFrame, operational: Record<Side, boolean>, events: readonly DamageEvent[] = []): void {
    applyUnitEvents(this.groups.shipA, events, "shipA");
    applyUnitEvents(this.groups.shipB, events, "shipB");
    if (operational.shipA) stepSide(this.groups.shipA, frame.shipA.position, frame.shipB.position, dt);
    if (operational.shipB) stepSide(this.groups.shipB, frame.shipB.position, frame.shipA.position, dt);
  }

  states(side: Side): readonly FighterRuntimeState[] {
    return this.groups[side].map((g) => {
      const alive = aliveIndices(g);
      return {
        positions: alive.map((i) => g.fighters[i].position),
        distanceToTarget: g.distanceToTarget,
        aliveCount: alive.length,
        hpFractions: g.pools ? alive.map((i) => hpFraction(g.pools![i], poolsTotal(g.spec.hp))) : alive.map(() => 1),
      };
    });
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
  return { spec, fighters, orbitAngle: 0, launched: false, distanceToTarget: 0, pools: spec.hp ? freshPools(spec.hp, count) : undefined };
}

function freshPools(spec: UnitPoolsSpec, count: number): UnitPools[] {
  return Array.from({ length: count }, () => ({ shield: spec.shield, armor: spec.armor, hull: spec.hull }));
}

function aliveIndices(group: FighterGroupState): readonly number[] {
  if (!group.pools) return group.fighters.map((_, i) => i);
  return group.pools.flatMap((pools, i) => (pools.shield + pools.armor + pools.hull > 0 ? [i] : []));
}

function hpFraction(pools: UnitPools, total: number): number {
  return total > 0 ? (pools.shield + pools.armor + pools.hull) / total : 1;
}

function poolsTotal(spec: UnitPoolsSpec | undefined): number {
  return spec ? spec.shield + spec.armor + spec.hull : 0;
}

/** Applies this frame's unit-targeted damage: every event focuses the first alive fighter (fighter groups in fit order). */
function applyUnitEvents(groups: FighterGroupState[], events: readonly DamageEvent[], side: Side): void {
  for (const event of events) {
    if (event.target !== side || event.unitTarget !== "fighter") continue;
    const group = groups.find((candidate) => aliveIndices(candidate).length > 0 && candidate.pools !== undefined);
    if (!group || !group.pools) continue;
    const index = aliveIndices(group)[0];
    applyDamageToPools(group.pools[index], damageVectorSum(event.rawByType));
  }
}

/** Damage cascades shield -> armor -> hull; a fighter with no remaining pool is destroyed. */
function applyDamageToPools(pools: UnitPools, amount: number): void {
  let remaining = amount;
  for (const layer of ["shield", "armor", "hull"] as const) {
    const absorbed = Math.min(pools[layer], remaining);
    pools[layer] -= absorbed;
    remaining -= absorbed;
    if (remaining <= 0) return;
  }
}

function mergeGroups(existing: FighterGroupState[], specs: readonly FighterSpec[]): FighterGroupState[] {
  return specs.map((spec, i) => {
    const prev = existing[i];
    if (!prev || prev.spec.fighterCount !== spec.fighterCount || poolsTotal(prev.spec.hp) !== poolsTotal(spec.hp)) return createGroupState(spec);
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
  return { spec: group.spec, fighters: group.fighters.map((f) => ({ position: f.position, velocity: f.velocity, orbitPhase: f.orbitPhase })), orbitAngle: group.orbitAngle, distanceToTarget: group.distanceToTarget, pools: group.pools?.map((pools) => ({ ...pools })) };
}

function materializeGroup(snapshot: FighterGroupSnapshot): FighterGroupState {
  return { spec: snapshot.spec, fighters: snapshot.fighters.map((f) => ({ position: f.position, velocity: f.velocity, orbitPhase: f.orbitPhase })), orbitAngle: snapshot.orbitAngle, launched: true, distanceToTarget: snapshot.distanceToTarget, pools: snapshot.pools?.map((pools) => ({ ...pools })) };
}
