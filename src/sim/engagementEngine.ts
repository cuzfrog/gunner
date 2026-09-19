import type { CapacitorSimConfig, CapacitorView } from "./capacitorSimulator";
import type { AppliedEwarEffect, CapacitorEngagement, DamageEvent, DroneRuntimeState, DroneSpec, EwarProjection, FighterRuntimeState, FighterSpec, InflictedDps, IncomingDrain, LayerDamage, LockState, MissileAttackFacts, MissileLaunchSpec, MissileRuntimeState, MissileSimConfig, MissileSpec, SensorSpec, ShipState, Side, SimConfig, SimSnapshot, WeaponSpec, CapacitorSideConfig } from "./types";
import type { TypeId } from "../gamedata/ids";
import type { DefenseSimConfig, DefenseSimulator, DefenseView } from "./defenseSimulator";
import type { DroneSimConfig } from "./droneSimulator";
import type { FighterSimConfig } from "./fighterSimulator";
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
  readonly capacitor: Record<Side, CapacitorSideConfig>;
}

export interface EngineView extends EngagementView {
  readonly snapshot: SimSnapshot;
  readonly defenseRuntime: DefenseView;
  readonly capacitorRuntime: Record<Side, CapacitorView>;
  readonly inflicted: Record<Side, InflictedDps>;
  readonly drones: Record<Side, readonly DroneRuntimeState[]>;
  readonly droneSpecs: Record<Side, readonly DroneSpec[]>;
  readonly fighters: Record<Side, readonly FighterRuntimeState[]>;
  readonly fighterSpecs: Record<Side, readonly FighterSpec[]>;
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
  injectCapBooster(side: Side, boosterIndex: number): EngineView;
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
    const spawn = this.live.simulation.snapshot();
    this.live.droneSimulator.reset(droneSimConfigFrom(config));
    this.live.fighterSimulator.reset(fighterSimConfigFrom(config));
    this.live.missileSimulator.reset(missileSimConfigFrom(config), { shipA: spawn.shipA.position, shipB: spawn.shipB.position });
    this.live.weaponClock.reset();
    this.live.lockClock.reset();
    this.live.defenseSimulator.reset(config.defense);
    this.live.capacitorSimulator.reset(capacitorSimConfigFrom(config));
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
    this.live.fighterSimulator.update(fighterSimConfigFrom(config));
    this.live.missileSimulator.update(missileSimConfigFrom(config));
    this.live.defenseSimulator.update(config.defense);
    this.live.capacitorSimulator.update(capacitorSimConfigFrom(config));
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

  injectCapBooster(side: Side, boosterIndex: number): EngineView {
    if (!this.config || !this.lastView) throw new Error("EngagementEngine.injectCapBooster called before reset");
    this.live.capacitorSimulator.injectBooster(side, boosterIndex);
    this.projectionDirty = true;
    this.lastView = { ...this.lastView, capacitorRuntime: this.live.capacitorSimulator.view() };
    this.publishView(this.lastView);
    return this.lastView;
  }

  onViewUpdated(listener: (view: EngineView) => void): void { this.viewUpdatedListeners.add(listener); }
  offViewUpdated(listener: (view: EngineView) => void): void { this.viewUpdatedListeners.delete(listener); }
  onShipDestroyed(listener: (side: Side) => void): void { this.shipDestroyedListeners.add(listener); }
  offShipDestroyed(listener: (side: Side) => void): void { this.shipDestroyedListeners.delete(listener); }

  private publishView(view: EngineView): void {
    for (const listener of Array.from(this.viewUpdatedListeners)) listener(view);
    this.checkDeath(view);
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
    const distance = snapshot.shipB.position.sub(snapshot.shipA.position).len();
    const input = this.engagementInput(this.live, snapshot, this.live.lockClock.states(), config, this.paintedSigRadii(snapshot, distance));
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
      capacitorRuntime: this.live.capacitorSimulator.view(),
      inflicted: this.projectedInflicted(snapshot.time),
      drones: { shipA: this.live.droneSimulator.states("shipA"), shipB: this.live.droneSimulator.states("shipB") },
      droneSpecs: { shipA: droneSpecsFrom(config.weapons.shipA), shipB: droneSpecsFrom(config.weapons.shipB) },
      fighters: { shipA: this.live.fighterSimulator.states("shipA"), shipB: this.live.fighterSimulator.states("shipB") },
      fighterSpecs: { shipA: fighterSpecsFrom(config.weapons.shipA), shipB: fighterSpecsFrom(config.weapons.shipB) },
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
    world.fighterSimulator.restore(this.live.fighterSimulator.capture());
    world.missileSimulator.restore(this.live.missileSimulator.capture());
    world.weaponClock.restore(this.live.weaponClock.capture());
    world.defenseSimulator.restore(this.live.defenseSimulator.capture());
    world.capacitorSimulator.restore(this.live.capacitorSimulator.capture());
    world.defenseSimulator.flushPendingDamage(world.capacitorSimulator);
    const before = world.defenseSimulator.inflictedTotals();
    const horizon = projectionHorizonSeconds(config.weapons.shipA, config.weapons.shipB);
    for (let elapsed = 0; elapsed < horizon; elapsed += PROJECTION_STEP_SECONDS) {
      this.runStep(world, config, Math.min(PROJECTION_STEP_SECONDS, horizon - elapsed));
    }
    world.defenseSimulator.flushPendingDamage(world.capacitorSimulator);
    const after = world.defenseSimulator.inflictedTotals();
    return { shipA: inflictedDps(before.shipA, after.shipA, horizon), shipB: inflictedDps(before.shipB, after.shipB, horizon) };
  }

  private runStep(world: SimWorld, config: EngineConfig, dt: number): { composed: EngagementView; snapshot: SimSnapshot } {
    const operational = operationalSides(world.defenseSimulator);
    const preSnapshot = mutedDestroyedSnapshot(world.simulation.snapshot(), operational);
    const preDistance = preSnapshot.shipB.position.sub(preSnapshot.shipA.position).len();
    world.capacitorSimulator.incomingDrains("shipA", incomingDrains(this.ewarResolver.appliedEffects(preSnapshot.shipB.ewar, preDistance), config.sim.shipA.energyWarfareResistancePercent ?? 0));
    world.capacitorSimulator.incomingDrains("shipB", incomingDrains(this.ewarResolver.appliedEffects(preSnapshot.shipA.ewar, preDistance), config.sim.shipB.energyWarfareResistancePercent ?? 0));
    const locksBeforeStep = world.lockClock.states();
    world.capacitorSimulator.step(dt, {
      shipA: this.capacitorEngagement(preSnapshot, "shipA", preDistance, locksBeforeStep, operational),
      shipB: this.capacitorEngagement(preSnapshot, "shipB", preDistance, locksBeforeStep, operational),
    });
    world.simulation.step(dt, {
      propulsionStarved: {
        shipA: !operational.shipA || world.capacitorSimulator.propulsionStarved("shipA"),
        shipB: !operational.shipB || world.capacitorSimulator.propulsionStarved("shipB"),
      },
      ewarActive: operational,
    });
    const snapshot = mutedDestroyedSnapshot(world.simulation.snapshot(), operational);
    const distance = snapshot.shipB.position.sub(snapshot.shipA.position).len();
    const painted = this.paintedSigRadii(snapshot, distance);
    const locks = world.lockClock.step(dt, this.lockStepInput(snapshot, distance, painted, operational));
    const input = this.engagementInput(world, snapshot, locks, config, painted);
    const composed = this.engagementFrameComposer.compose(snapshot, input);
    world.droneSimulator.step(dt, composed.frame, operational);
    world.fighterSimulator.step(dt, composed.frame, operational);
    const missileEvents = world.missileSimulator.step(dt, composed.frame, this.missileLaunchSpecs(composed, locks, painted));
    const weaponEvents = world.weaponClock.step(dt, composed, world.capacitorSimulator);
    const events: DamageEvent[] = [...missileEvents, ...weaponEvents];
    world.defenseSimulator.step(dt, events, world.capacitorSimulator);
    return { composed, snapshot };
  }

  private initializeLocks(): void {
    const snapshot = this.live.simulation.snapshot();
    const distance = snapshot.shipB.position.sub(snapshot.shipA.position).len();
    this.live.lockClock.step(0, this.lockStepInput(snapshot, distance, this.paintedSigRadii(snapshot, distance), operationalSides(this.live.defenseSimulator)));
  }

  /** Engagement facts for the capacitor: own hard-range modules that apply nothing, own lock state, opponent suppression. Uses the pre-step snapshot, one frame of latency like the incoming-drain inputs. */
  private capacitorEngagement(snapshot: SimSnapshot, side: Side, distance: number, locks: Record<Side, LockState>, operational: Record<Side, boolean>): CapacitorEngagement {
    const opponent = side === "shipA" ? "shipB" : "shipA";
    return {
      operational: operational[side],
      propulsionSuppressed: this.ewarResolver.propulsionSuppressed(snapshot[opponent].ewar, distance),
      weaponsEngaged: locks[side].status === "locked",
      disengagedModuleIds: disengagedModuleIds(snapshot[side].ewar, distance, this.ewarResolver),
    };
  }

  private lockStepInput(snapshot: SimSnapshot, distance: number, painted: Record<Side, number>, operational: Record<Side, boolean>): LockStepInput {
    return {
      distance,
      sensorA: this.effectiveSensorSpec(snapshot.shipA, snapshot.shipB, distance),
      sensorB: this.effectiveSensorSpec(snapshot.shipB, snapshot.shipA, distance),
      sigA: painted.shipA,
      sigB: painted.shipB,
      operational,
    };
  }

  /** Painted signature of each side's ship, applied by its opponent's target painters; the single per-frame derivation consumed by locks, weapon assessment, and missile launches. */
  private paintedSigRadii(snapshot: SimSnapshot, distance: number): Record<Side, number> {
    return {
      shipA: this.paintedSig(snapshot.shipB, snapshot.shipA, distance),
      shipB: this.paintedSig(snapshot.shipA, snapshot.shipB, distance),
    };
  }

  private engagementInput(world: SimWorld, snapshot: SimSnapshot, locks: Record<Side, LockState>, config: EngineConfig, painted: Record<Side, number>): EngagementInput {
    return {
      weapons: config.weapons,
      paintedSigRadii: painted,
      droneStates: { shipA: world.droneSimulator.states("shipA"), shipB: world.droneSimulator.states("shipB") },
      missileFacts: { shipA: this.missileFactsFor(world, "shipA", config, painted.shipB), shipB: this.missileFactsFor(world, "shipB", config, painted.shipA) },
      spoolCycles: { shipA: this.spoolCyclesFor(world, "shipA", config), shipB: this.spoolCyclesFor(world, "shipB", config) },
      defenses: { shipA: config.defense.shipA, shipB: config.defense.shipB },
      overloaded: config.overloaded,
      locks,
    };
  }

  private spoolCyclesFor(world: SimWorld, side: Side, config: EngineConfig): readonly number[] {
    return config.weapons[side].map((_, index) => world.weaponClock.spoolCycles(side, index));
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

  private missileFactsFor(world: SimWorld, side: Side, config: EngineConfig, paintedTargetSig: number): readonly MissileAttackFacts[] {
    const facts: MissileAttackFacts[] = [];
    let missileIndex = 0;
    for (const weapon of config.weapons[side]) {
      if (weapon.kind === "missile") {
        facts.push(world.missileSimulator.facts(side, missileIndex, weapon, paintedTargetSig));
        missileIndex++;
      }
    }
    return facts;
  }

  private missileLaunchSpecs(view: EngagementView, locks: Record<Side, LockState>, painted: Record<Side, number>): Record<Side, readonly MissileLaunchSpec[]> {
    return {
      shipA: locks.shipA.status === "locked" ? this.buildLaunchSpecs("shipA", view, painted.shipB) : [],
      shipB: locks.shipB.status === "locked" ? this.buildLaunchSpecs("shipB", view, painted.shipA) : [],
    };
  }

  private buildLaunchSpecs(side: Side, view: EngagementView, paintedTargetSig: number): readonly MissileLaunchSpec[] {
    const specs: MissileLaunchSpec[] = [];
    let missileIndex = 0;
    for (const attack of view.weaponAttacks[side]) {
      const boosted = attack.assessment.boostedWeapon;
      if (boosted.kind !== "missile") continue;
      const baseVolleyByType = attack.assessment.damage.baseVolleyByType;
      specs.push({ weaponIndex: missileIndex, boosted, paintedTargetSig, baseVolleyByType });
      missileIndex++;
    }
    return specs;
  }
}

/** A side whose ship is destroyed stops acting: it projects no ewar and every outgoing gate treats it as offline. */
function operationalSides(defense: DefenseSimulator): Record<Side, boolean> {
  const dead = defense.view().dead;
  return { shipA: !dead.shipA, shipB: !dead.shipB };
}

function mutedDestroyedSnapshot(snapshot: SimSnapshot, operational: Record<Side, boolean>): SimSnapshot {
  if (operational.shipA && operational.shipB) return snapshot;
  return {
    ...snapshot,
    shipA: operational.shipA ? snapshot.shipA : withoutEwar(snapshot.shipA),
    shipB: operational.shipB ? snapshot.shipB : withoutEwar(snapshot.shipB),
  };
}

function withoutEwar(ship: ShipState): ShipState {
  return { ...ship, ewar: undefined };
}

function droneSimConfigFrom(config: EngineConfig): DroneSimConfig {
  return { shipA: droneSpecsFrom(config.weapons.shipA), shipB: droneSpecsFrom(config.weapons.shipB) };
}

function fighterSimConfigFrom(config: EngineConfig): FighterSimConfig {
  return { shipA: fighterSpecsFrom(config.weapons.shipA), shipB: fighterSpecsFrom(config.weapons.shipB) };
}

function missileSimConfigFrom(config: EngineConfig): MissileSimConfig {
  return { shipA: missileSpecsFrom(config.weapons.shipA), shipB: missileSpecsFrom(config.weapons.shipB) };
}

function capacitorSimConfigFrom(config: EngineConfig): CapacitorSimConfig {
  return { sim: config.sim, sides: config.capacitor };
}

function droneSpecsFrom(weapons: readonly WeaponSpec[]): readonly DroneSpec[] {
  return weapons.filter((w): w is DroneSpec => w.kind === "drone");
}

function fighterSpecsFrom(weapons: readonly WeaponSpec[]): readonly FighterSpec[] {
  return weapons.filter((w): w is FighterSpec => w.kind === "fighter");
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

function incomingDrains(effects: readonly AppliedEwarEffect[], resistancePercent: number): readonly IncomingDrain[] {
  const byModule = new Map<TypeId, IncomingDrain>();
  for (const effect of effects) {
    if (effect.family !== "neutralizer" && effect.family !== "nosferatu") continue;
    const amount = effect.amountPerCycle * (1 - resistancePercent / 100);
    const existing = byModule.get(effect.moduleId);
    if (existing) {
      byModule.set(effect.moduleId, { ...existing, amount: existing.amount + amount, count: existing.count + 1 });
    } else {
      byModule.set(effect.moduleId, { moduleId: effect.moduleId, amount, interval: effect.cycleTime, transfer: effect.family === "nosferatu", count: 1 });
    }
  }
  return [...byModule.values()];
}

/** Own hard-range modules that apply nothing at this distance: the ewar families minus the ids with an applied effect. Boosters never apply and are never listed. */
function disengagedModuleIds(projection: EwarProjection | undefined, distance: number, resolver: EwarResolver): readonly TypeId[] {
  if (!projection) return [];
  const applied = new Set(resolver.appliedEffects(projection, distance).map((effect) => effect.moduleId));
  const loadout = projection.loadout;
  const families: readonly (readonly { readonly moduleId: TypeId }[])[] = [
    loadout.webs, loadout.grapplers, loadout.disruptors, loadout.scramblers, loadout.painters, loadout.dampeners, loadout.neutralizers, loadout.nosferatu,
  ];
  const ids: TypeId[] = [];
  for (const family of families) {
    for (const spec of family) {
      if (!applied.has(spec.moduleId)) ids.push(spec.moduleId);
    }
  }
  return ids;
}

export { projectionHorizonSeconds as _projectionHorizonSeconds };
