import type { DamageEvent, DroneRuntimeState, DroneSpec, InflictedDps, LayerDamage, LockState, MissileAttackFacts, MissileLaunchSpec, MissileRuntimeState, MissileSimConfig, MissileSpec, SensorSpec, ShipState, Side, SimConfig, SimSnapshot, WeaponSpec } from "./types";
import type { DefenseSimConfig, DefenseView } from "./defenseSimulator";
import type { DroneSimConfig } from "./droneSimulator";
import type { EngagementFrameComposer, EngagementInput, EngagementView } from "./engagementFrameComposer";
import type { EwarResolver } from "./ewarResolver";
import type { LockStepInput } from "./lockClock";
import type { SensorBoosterResolver } from "./sensorBoosterResolver";
import type { SimWorld } from "./simWorld";

export interface EngineConfig {
  readonly sim: SimConfig;
  readonly weapons: Record<Side, readonly WeaponSpec[]>;
  readonly defense: DefenseSimConfig;
  readonly overloaded: Record<Side, boolean>;
}

export interface EngineView extends EngagementView {
  readonly snapshot: SimSnapshot;
  readonly defenseRuntime: DefenseView;
  readonly inflicted: Record<Side, InflictedDps>;
  readonly drones: Record<Side, readonly DroneRuntimeState[]>;
  readonly droneSpecs: Record<Side, readonly DroneSpec[]>;
  readonly missiles: Record<Side, readonly MissileRuntimeState[]>;
}

export interface EngineEvents {
  onViewUpdated(listener: (view: EngineView) => void): void;
  offViewUpdated(listener: (view: EngineView) => void): void;
  onShipDestroyed(listener: (side: Side) => void): void;
  offShipDestroyed(listener: (side: Side) => void): void;
}

export interface EngagementEngine {
  reset(config: EngineConfig): EngineView;
  update(config: EngineConfig): EngineView;
  step(dt: number): EngineView;
  view(): EngineView;
  events(): EngineEvents;
}

const PROJECTION_HORIZON_FLOOR_SECONDS = 10;
const PROJECTION_HORIZON_CYCLE_MULTIPLIER = 2;
const PROJECTION_STEP_SECONDS = 0.5;
const PROJECTION_CADENCE_SECONDS = 0.5;

export class EngagementEngineImpl implements EngagementEngine {
  private readonly live: SimWorld;
  private readonly projection: SimWorld;
  private readonly engagementFrameComposer: EngagementFrameComposer;
  private readonly ewarResolver: EwarResolver;
  private readonly sensorBoosterResolver: SensorBoosterResolver;
  private readonly viewUpdatedListeners = new Set<(view: EngineView) => void>();
  private readonly shipDestroyedListeners = new Set<(side: Side) => void>();
  private readonly destroyedSides = new Set<Side>();
  private config: EngineConfig | undefined;
  private lastView: EngineView | undefined;
  private projectionCache: Record<Side, InflictedDps> | undefined;
  private projectionAtTime = Number.NEGATIVE_INFINITY;
  private projectionDirty = true;

  constructor(deps: {
    live: SimWorld;
    projection: SimWorld;
    engagementFrameComposer: EngagementFrameComposer;
    ewarResolver: EwarResolver;
    sensorBoosterResolver: SensorBoosterResolver;
  }) {
    this.live = deps.live;
    this.projection = deps.projection;
    this.engagementFrameComposer = deps.engagementFrameComposer;
    this.ewarResolver = deps.ewarResolver;
    this.sensorBoosterResolver = deps.sensorBoosterResolver;
  }

  reset(config: EngineConfig): EngineView {
    this.config = config;
    this.destroyedSides.clear();
    this.live.simulation.reset(config.sim);
    this.live.droneSimulator.reset(droneSimConfigFrom(config));
    this.live.missileSimulator.reset(missileSimConfigFrom(config));
    this.live.weaponClock.reset();
    this.live.lockClock.reset();
    this.live.defenseSimulator.reset(config.defense);
    this.initializeLocks();
    this.projectionDirty = true;
    this.lastView = this.composeView();
    this.publishView(this.lastView);
    return this.lastView;
  }

  update(config: EngineConfig): EngineView {
    this.config = config;
    this.live.simulation.update(config.sim);
    this.live.droneSimulator.update(droneSimConfigFrom(config));
    this.live.missileSimulator.update(missileSimConfigFrom(config));
    this.live.defenseSimulator.update(config.defense);
    this.projectionDirty = true;
    this.lastView = this.composeView();
    this.publishView(this.lastView);
    return this.lastView;
  }

  step(dt: number): EngineView {
    const config = this.config;
    if (!config) throw new Error("EngagementEngine.step called before reset");
    const { composed, snapshot } = this.runStep(this.live, config, dt);
    this.lastView = this.buildView(composed, snapshot);
    this.publishView(this.lastView);
    return this.lastView;
  }

  view(): EngineView {
    if (!this.lastView) throw new Error("EngagementEngine.view called before reset");
    return this.lastView;
  }

  events(): EngineEvents { return this; }

  onViewUpdated(listener: (view: EngineView) => void): void { this.viewUpdatedListeners.add(listener); }
  offViewUpdated(listener: (view: EngineView) => void): void { this.viewUpdatedListeners.delete(listener); }
  onShipDestroyed(listener: (side: Side) => void): void { this.shipDestroyedListeners.add(listener); }
  offShipDestroyed(listener: (side: Side) => void): void { this.shipDestroyedListeners.delete(listener); }

  private publishView(view: EngineView): void {
    this.checkDeath(view);
    for (const listener of Array.from(this.viewUpdatedListeners)) listener(view);
  }

  private checkDeath(view: EngineView): void {
    if (view.defenseRuntime.dead.shipA && !this.destroyedSides.has("shipA")) {
      this.destroyedSides.add("shipA");
      for (const listener of Array.from(this.shipDestroyedListeners)) listener("shipA");
    }
    if (view.defenseRuntime.dead.shipB && !this.destroyedSides.has("shipB")) {
      this.destroyedSides.add("shipB");
      for (const listener of Array.from(this.shipDestroyedListeners)) listener("shipB");
    }
  }

  private composeView(): EngineView {
    const config = this.config;
    if (!config) throw new Error("composeView called before config set");
    const snapshot = this.live.simulation.snapshot();
    const input = this.engagementInput(this.live, snapshot, this.live.lockClock.states(), config);
    const composed = this.engagementFrameComposer.compose(snapshot, input);
    return this.buildView(composed, snapshot);
  }

  private buildView(composed: EngagementView, snapshot: SimSnapshot): EngineView {
    const config = this.config;
    if (!config) throw new Error("buildView called before config set");
    const defenseRuntime = this.live.defenseSimulator.view();
    return {
      ...composed,
      snapshot,
      defenseRuntime,
      inflicted: this.projectedInflicted(snapshot.time),
      drones: { shipA: this.live.droneSimulator.states("shipA"), shipB: this.live.droneSimulator.states("shipB") },
      droneSpecs: { shipA: droneSpecsFrom(config.weapons.shipA), shipB: droneSpecsFrom(config.weapons.shipB) },
      missiles: { shipA: this.live.missileSimulator.states("shipA"), shipB: this.live.missileSimulator.states("shipB") },
    };
  }

  private projectedInflicted(time: number): Record<Side, InflictedDps> {
    const config = this.config;
    if (!config) throw new Error("projectedInflicted called before config set");
    const cacheFresh = !this.projectionDirty && time - this.projectionAtTime < PROJECTION_CADENCE_SECONDS;
    if (this.projectionCache && cacheFresh) return this.projectionCache;
    this.projectionCache = this.projectInflicted(config);
    this.projectionAtTime = time;
    this.projectionDirty = false;
    return this.projectionCache;
  }

  private projectInflicted(config: EngineConfig): Record<Side, InflictedDps> {
    const world = this.projection;
    world.simulation.restore(this.live.simulation.capture());
    world.lockClock.restore(this.live.lockClock.capture());
    world.droneSimulator.restore(this.live.droneSimulator.capture());
    world.missileSimulator.restore(this.live.missileSimulator.capture());
    world.weaponClock.restore(this.live.weaponClock.capture());
    world.defenseSimulator.restore(this.live.defenseSimulator.capture());
    world.defenseSimulator.flushPendingDamage();
    const before = world.defenseSimulator.inflictedTotals();
    const horizon = projectionHorizonSeconds(config.weapons.shipA, config.weapons.shipB);
    for (let elapsed = 0; elapsed < horizon; elapsed += PROJECTION_STEP_SECONDS) {
      this.runStep(world, config, Math.min(PROJECTION_STEP_SECONDS, horizon - elapsed));
    }
    world.defenseSimulator.flushPendingDamage();
    const after = world.defenseSimulator.inflictedTotals();
    return { shipA: inflictedDps(before.shipA, after.shipA, horizon), shipB: inflictedDps(before.shipB, after.shipB, horizon) };
  }

  private runStep(world: SimWorld, config: EngineConfig, dt: number): { composed: EngagementView; snapshot: SimSnapshot } {
    world.simulation.step(dt);
    const snapshot = world.simulation.snapshot();
    const distance = snapshot.shipB.position.sub(snapshot.shipA.position).len();
    const locks = world.lockClock.step(dt, this.lockStepInput(snapshot, distance));
    const input = this.engagementInput(world, snapshot, locks, config);
    const composed = this.engagementFrameComposer.compose(snapshot, input);
    world.droneSimulator.step(dt, composed.frame);
    const missileEvents = world.missileSimulator.step(dt, composed.frame, this.missileLaunchSpecs(composed, locks));
    const weaponEvents = world.weaponClock.step(dt, composed);
    const events: DamageEvent[] = [...missileEvents, ...weaponEvents];
    world.defenseSimulator.step(dt, events);
    return { composed, snapshot };
  }

  private initializeLocks(): void {
    const snapshot = this.live.simulation.snapshot();
    const distance = snapshot.shipB.position.sub(snapshot.shipA.position).len();
    this.live.lockClock.step(0, this.lockStepInput(snapshot, distance));
  }

  private lockStepInput(snapshot: SimSnapshot, distance: number): LockStepInput {
    return {
      distance,
      sensorA: this.effectiveSensorSpec(snapshot.shipA, snapshot.shipB, distance),
      sensorB: this.effectiveSensorSpec(snapshot.shipB, snapshot.shipA, distance),
      sigA: this.paintedSig(snapshot.shipB, snapshot.shipA, distance),
      sigB: this.paintedSig(snapshot.shipA, snapshot.shipB, distance),
    };
  }

  private engagementInput(world: SimWorld, snapshot: SimSnapshot, locks: Record<Side, LockState>, config: EngineConfig): EngagementInput {
    return {
      weapons: config.weapons,
      sigRadii: { shipA: snapshot.shipA.sig ?? 1, shipB: snapshot.shipB.sig ?? 1 },
      droneStates: { shipA: world.droneSimulator.states("shipA"), shipB: world.droneSimulator.states("shipB") },
      missileFacts: { shipA: this.missileFactsFor(world, "shipA", config), shipB: this.missileFactsFor(world, "shipB", config) },
      defenses: { shipA: config.defense.shipA, shipB: config.defense.shipB },
      overloaded: config.overloaded,
      locks,
    };
  }

  private effectiveSensorSpec(ship: ShipState, opponent: ShipState, distance: number): SensorSpec | undefined {
    if (!ship.sensorSpec) return undefined;
    const boosted = this.sensorBoosterResolver.boostedSensorSpec(ship.sensorSpec, ship.sensorBoosts);
    return this.ewarResolver.dampenedSensorSpec(boosted, opponent.ewar, distance);
  }

  private paintedSig(ship: ShipState, opponent: ShipState, distance: number): number {
    const baseSig = opponent.sig ?? 1;
    return baseSig * this.ewarResolver.sigMultiplier(ship.ewar, distance);
  }

  private missileFactsFor(world: SimWorld, side: Side, config: EngineConfig): readonly MissileAttackFacts[] {
    const facts: MissileAttackFacts[] = [];
    let missileIndex = 0;
    for (const weapon of config.weapons[side]) {
      if (weapon.kind === "missile") {
        facts.push(world.missileSimulator.facts(side, missileIndex));
        missileIndex++;
      }
    }
    return facts;
  }

  private missileLaunchSpecs(view: EngagementView, locks: Record<Side, LockState>): Record<Side, readonly MissileLaunchSpec[]> {
    return {
      shipA: locks.shipA.status === "locked" ? this.buildLaunchSpecs("shipA", view) : [],
      shipB: locks.shipB.status === "locked" ? this.buildLaunchSpecs("shipB", view) : [],
    };
  }

  private buildLaunchSpecs(side: Side, view: EngagementView): readonly MissileLaunchSpec[] {
    const shipState = side === "shipA" ? view.frame.shipA : view.frame.shipB;
    const opponent = side === "shipA" ? view.frame.shipB : view.frame.shipA;
    const painted = this.paintedSig(shipState, opponent, view.frame.distance);
    const specs: MissileLaunchSpec[] = [];
    let missileIndex = 0;
    for (const attack of view.weaponAttacks[side]) {
      const boosted = attack.assessment.boostedWeapon;
      if (boosted.kind !== "missile") continue;
      const baseVolleyByType = attack.assessment.damage.baseVolleyByType;
      specs.push({ weaponIndex: missileIndex, boosted, paintedTargetSig: painted, baseVolleyByType });
      missileIndex++;
    }
    return specs;
  }
}

function droneSimConfigFrom(config: EngineConfig): DroneSimConfig {
  return { shipA: droneSpecsFrom(config.weapons.shipA), shipB: droneSpecsFrom(config.weapons.shipB) };
}

function missileSimConfigFrom(config: EngineConfig): MissileSimConfig {
  return { shipA: missileSpecsFrom(config.weapons.shipA), shipB: missileSpecsFrom(config.weapons.shipB) };
}

function droneSpecsFrom(weapons: readonly WeaponSpec[]): readonly DroneSpec[] {
  return weapons.filter((w): w is DroneSpec => w.kind === "drone");
}

function missileSpecsFrom(weapons: readonly WeaponSpec[]): readonly MissileSpec[] {
  return weapons.filter((w): w is MissileSpec => w.kind === "missile");
}

function projectionHorizonSeconds(shipAWeapons: readonly WeaponSpec[], shipBWeapons: readonly WeaponSpec[]): number {
  const slowestCycleTime = [...shipAWeapons, ...shipBWeapons].reduce((slowest, weapon) => Math.max(slowest, weapon.cycleTime), 0);
  return Math.max(PROJECTION_HORIZON_FLOOR_SECONDS, PROJECTION_HORIZON_CYCLE_MULTIPLIER * slowestCycleTime);
}

function inflictedDps(before: LayerDamage, after: LayerDamage, horizon: number): InflictedDps {
  const byLayer: LayerDamage = {
    shield: (after.shield - before.shield) / horizon,
    armor: (after.armor - before.armor) / horizon,
    hull: (after.hull - before.hull) / horizon,
  };
  return { total: byLayer.shield + byLayer.armor + byLayer.hull, byLayer };
}

export { projectionHorizonSeconds as _projectionHorizonSeconds };
