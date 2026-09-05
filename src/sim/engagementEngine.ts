import { ZERO_DAMAGE } from "./types";
import type { DamageEvent, DamageVector, DroneRuntimeState, DroneSpec, LockState, MissileAttackFacts, MissileLaunchSpec, MissileRuntimeState, MissileSimConfig, MissileSpec, SensorSpec, ShipState, Side, SimConfig, SimSnapshot, WeaponSpec } from "./types";
import type { DefenseSimConfig, DefenseSimulator, DefenseView, RepairMode } from "./defenseSimulator";
import type { DroneSimConfig, DroneSimulator } from "./droneSimulator";
import type { EngagementFrameComposer, EngagementInput, EngagementView } from "./engagementFrameComposer";
import type { EwarResolver } from "./ewarResolver";
import type { LockClock, LockStepInput } from "./lockClock";
import type { MissileSimulator } from "./missileSimulator";
import type { SensorBoosterResolver } from "./sensorBoosterResolver";
import type { Simulation } from "./simulation";
import type { WeaponClock } from "./weaponClock";

export interface EngineConfig {
  readonly sim: SimConfig;
  readonly weapons: Record<Side, readonly WeaponSpec[]>;
  readonly sigRadii: Record<Side, number>;
  readonly defense: DefenseSimConfig;
  readonly overloaded: Record<Side, boolean>;
}

export interface EngineView extends EngagementView {
  readonly snapshot: SimSnapshot;
  readonly defenseRuntime: DefenseView;
  readonly drones: Record<Side, readonly DroneRuntimeState[]>;
  readonly missiles: Record<Side, readonly MissileRuntimeState[]>;
}

export interface EngagementEngine {
  reset(config: EngineConfig): EngineView;
  update(config: EngineConfig): EngineView;
  step(dt: number): EngineView;
  view(): EngineView;
  setDamageEnabled(side: Side, enabled: boolean): void;
  setRepairMode(side: Side, mode: RepairMode): void;
  setRepairerActivation(side: Side, index: number, active: boolean, overloaded: boolean): void;
  setRahActivation(side: Side, active: boolean, overloaded: boolean): void;
}

const PROJECTION_HORIZON_SECONDS = 1;

export class EngagementEngineImpl implements EngagementEngine {
  private readonly simulation: Simulation;
  private readonly lockClock: LockClock;
  private readonly droneSimulator: DroneSimulator;
  private readonly missileSimulator: MissileSimulator;
  private readonly weaponClock: WeaponClock;
  private readonly defenseSimulator: DefenseSimulator;
  private readonly engagementFrameComposer: EngagementFrameComposer;
  private readonly ewarResolver: EwarResolver;
  private readonly sensorBoosterResolver: SensorBoosterResolver;
  private config: EngineConfig | undefined;
  private lastView: EngineView | undefined;

  constructor(deps: {
    simulation: Simulation;
    lockClock: LockClock;
    droneSimulator: DroneSimulator;
    missileSimulator: MissileSimulator;
    weaponClock: WeaponClock;
    defenseSimulator: DefenseSimulator;
    engagementFrameComposer: EngagementFrameComposer;
    ewarResolver: EwarResolver;
    sensorBoosterResolver: SensorBoosterResolver;
  }) {
    this.simulation = deps.simulation;
    this.lockClock = deps.lockClock;
    this.droneSimulator = deps.droneSimulator;
    this.missileSimulator = deps.missileSimulator;
    this.weaponClock = deps.weaponClock;
    this.defenseSimulator = deps.defenseSimulator;
    this.engagementFrameComposer = deps.engagementFrameComposer;
    this.ewarResolver = deps.ewarResolver;
    this.sensorBoosterResolver = deps.sensorBoosterResolver;
  }

  reset(config: EngineConfig): EngineView {
    this.config = config;
    this.simulation.reset(config.sim);
    this.droneSimulator.reset(droneSimConfigFrom(config));
    this.missileSimulator.reset(missileSimConfigFrom(config));
    this.weaponClock.reset();
    this.lockClock.reset();
    this.defenseSimulator.reset(config.defense);
    this.initializeLocks();
    this.lastView = this.composeView();
    return this.lastView;
  }

  update(config: EngineConfig): EngineView {
    this.config = config;
    this.simulation.update(config.sim);
    this.droneSimulator.update(droneSimConfigFrom(config));
    this.missileSimulator.update(missileSimConfigFrom(config));
    this.defenseSimulator.update(config.defense);
    this.lastView = this.composeView();
    return this.lastView;
  }

  step(dt: number): EngineView {
    const config = this.config;
    if (!config) throw new Error("EngagementEngine.step called before reset");
    this.simulation.step(dt);
    const snapshot = this.simulation.snapshot();
    const distance = snapshot.shipB.position.sub(snapshot.shipA.position).len();
    const locks = this.lockClock.step(dt, this.lockStepInput(snapshot, distance));
    const input = this.engagementInput(snapshot, locks, config);
    const composed = this.engagementFrameComposer.compose(snapshot, input);
    this.droneSimulator.step(dt, composed.frame);
    const missileEvents = this.missileSimulator.step(dt, composed.frame, this.missileLaunchSpecs(composed, locks, config));
    const weaponEvents = this.weaponClock.step(dt, composed);
    const events: DamageEvent[] = [...missileEvents, ...weaponEvents];
    this.defenseSimulator.step(dt, events);
    this.lastView = this.buildView(composed, snapshot);
    return this.lastView;
  }

  view(): EngineView {
    if (!this.lastView) throw new Error("EngagementEngine.view called before reset");
    return this.lastView;
  }

  setDamageEnabled(side: Side, enabled: boolean): void { this.defenseSimulator.setDamageEnabled(side, enabled); }
  setRepairMode(side: Side, mode: RepairMode): void { this.defenseSimulator.setRepairMode(side, mode); }
  setRepairerActivation(side: Side, index: number, active: boolean, overloaded: boolean): void { this.defenseSimulator.setRepairerActivation(side, index, active, overloaded); }
  setRahActivation(side: Side, active: boolean, overloaded: boolean): void { this.defenseSimulator.setRahActivation(side, active, overloaded); }

  private composeView(): EngineView {
    const config = this.config;
    if (!config) throw new Error("composeView called before config set");
    const snapshot = this.simulation.snapshot();
    const composed = this.engagementFrameComposer.compose(snapshot, this.engagementInput(snapshot, this.lockClock.states(), config));
    return this.buildView(composed, snapshot);
  }

  private buildView(composed: EngagementView, snapshot: SimSnapshot): EngineView {
    const incoming = incomingByTarget(composed);
    const projection = this.defenseSimulator.project(incoming, PROJECTION_HORIZON_SECONDS);
    return {
      ...composed,
      projection,
      snapshot,
      defenseRuntime: this.defenseSimulator.view(),
      drones: { shipA: this.droneSimulator.states("shipA"), shipB: this.droneSimulator.states("shipB") },
      missiles: { shipA: this.missileSimulator.states("shipA"), shipB: this.missileSimulator.states("shipB") },
    };
  }

  private initializeLocks(): void {
    const snapshot = this.simulation.snapshot();
    const distance = snapshot.shipB.position.sub(snapshot.shipA.position).len();
    this.lockClock.step(0, this.lockStepInput(snapshot, distance));
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

  private engagementInput(snapshot: SimSnapshot, locks: Record<Side, LockState>, config: EngineConfig): EngagementInput {
    return {
      weapons: config.weapons,
      sigRadii: config.sigRadii,
      droneStates: { shipA: this.droneSimulator.states("shipA"), shipB: this.droneSimulator.states("shipB") },
      missileFacts: { shipA: this.missileFactsFor("shipA", config), shipB: this.missileFactsFor("shipB", config) },
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

  private missileFactsFor(side: Side, config: EngineConfig): readonly MissileAttackFacts[] {
    const facts: MissileAttackFacts[] = [];
    let missileIndex = 0;
    for (const weapon of config.weapons[side]) {
      if (weapon.kind === "missile") {
        facts.push(this.missileSimulator.facts(side, missileIndex));
        missileIndex++;
      }
    }
    return facts;
  }

  private missileLaunchSpecs(view: EngagementView, locks: Record<Side, LockState>, config: EngineConfig): Record<Side, readonly MissileLaunchSpec[]> {
    return {
      shipA: locks.shipA.status === "locked" ? this.buildLaunchSpecs("shipA", view, config) : [],
      shipB: locks.shipB.status === "locked" ? this.buildLaunchSpecs("shipB", view, config) : [],
    };
  }

  private buildLaunchSpecs(side: Side, view: EngagementView, config: EngineConfig): readonly MissileLaunchSpec[] {
    const shipState = side === "shipA" ? view.frame.shipA : view.frame.shipB;
    const opponentSig = side === "shipA" ? config.sigRadii.shipB : config.sigRadii.shipA;
    const painted = opponentSig * this.ewarResolver.sigMultiplier(shipState.ewar, view.frame.distance);
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

function incomingByTarget(view: EngagementView): Record<Side, DamageVector> {
  return {
    shipA: view.attacks.shipB?.damage.appliedByType ?? ZERO_DAMAGE,
    shipB: view.attacks.shipA?.damage.appliedByType ?? ZERO_DAMAGE,
  };
}
