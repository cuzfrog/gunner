import { EngagementEngineImpl, _projectionHorizonSeconds } from "./engagementEngine";
import { EwarResolverImpl } from "./ewarResolver";
import type { JammerSpec, SensorSpec } from "./types";
import { Vec2 } from "./vec2";
import { SimWorldFactoryImpl } from "./simWorld";
import { KinematicsImpl } from "./kinematics";
import { MissileApplicationImpl } from "./missileApplication";
import { Mulberry32RngFactory } from "./rng";
import { StackingPenaltyImpl } from "./stackingPenalty";
import { SensorBoosterResolverImpl } from "./sensorBoosterResolver";
import { toTypeId } from "../gamedata/ids";
import { EMPTY_DEFENSE_SPEC, EMPTY_EWAR_LOADOUT, ZERO_DAMAGE, type AppliedEwarEffect, type EnergyNeutralizerSpec, type EngagementFrame, type EwarProjection, type HitChanceBreakdown, type LayerDamage, type LockState, type NosferatuSpec, type ShipState, type SimConfig, type SimSnapshot, type TurretSpec } from "./types";
import { EMPTY_DEFENSE_ASSESSMENT } from "./defenseAssessment";
import type { AttackAssessment } from "./fireControl";
import type { DefenseSimulator, DefenseSimulatorState, DefenseView, SidePoolsSnapshot } from "./defenseSimulator";
import type { InflictedDps } from "./types";
import type { DroneSimulator, DroneSimulatorState } from "./droneSimulator";
import type { FighterSimulator, FighterSimulatorState } from "./fighterSimulator";
import type { EngagementFrameComposer, EngagementView } from "./engagementFrameComposer";
import type { EwarResolver } from "./ewarResolver";
import type { LockClock, LockClockState } from "./lockClock";
import type { JamClock, JamClockState } from "./jamClock";
import type { MissileSimulator, MissileSimulatorState } from "./missileSimulator";
import type { SensorBoosterResolver } from "./sensorBoosterResolver";
import type { Simulation, SimulationState } from "./simulation";
import type { SimWorld } from "./simWorld";
import type { WeaponClock, WeaponClockState } from "./weaponClock";
import type { CapacitorSimulator, CapacitorSimulatorState, CapacitorView } from "./capacitorSimulator";
import type { EngineConfig } from "./engagementEngine";
import type { CapacitorSideConfig } from "./types";

const LOCKED_STATE: LockState = { status: "locked", progress: 1, remaining: 0, lockTime: 0, inRange: true };
const IDLE_STATE: LockState = { status: "idle", progress: 0, remaining: 0, lockTime: 0, inRange: true };

const ship: ShipState = {
  id: "shipA", position: new Vec2(0, 0), velocity: new Vec2(0, 0), maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1,
};
const snapshot: SimSnapshot = { time: 0, shipA: ship, shipB: { ...ship, id: "shipB", position: new Vec2(0, 5000) }, commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) } };
const frame: EngagementFrame = {
  time: 0, shipA: ship, shipB: { ...ship, id: "shipB" }, relPosition: new Vec2(0, 5000), distance: 5000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
};
const turret: TurretSpec = { kind: "turret", moduleId: toTypeId("1"), tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: ZERO_DAMAGE, cycleTime: 1, turretCount: 1 };
const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0, trackingPenalty: 1, rangePenalty: 1 };
const shipConfig: SimConfig = {
  shipA: { id: "shipA", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1 },
  shipB: { id: "shipB", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1 },
  initialDistance: 5000,
};

function baseView(): EngagementView {
  const assessment: AttackAssessment = {
    boostedWeapon: turret, effectiveWeapon: turret,
    damage: { nominalDps: 0, appliedDps: 0, application: 1, volley: 0, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE },
    turret: { hit, expectedMultiplier: 1, spoolFactor: 1, inOptimal: true },
  };
  return {
    frame, attacks: { shipA: assessment, shipB: assessment }, weaponAttacks: { shipA: [], shipB: [] },
    effectiveWeapons: { shipA: turret, shipB: turret },
    defenses: { shipA: EMPTY_DEFENSE_ASSESSMENT, shipB: EMPTY_DEFENSE_ASSESSMENT },
    locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE }, jammed: { shipA: false, shipB: false },
    readouts: { shipA: { kind: "none", speed: 0 }, shipB: { kind: "none", speed: 0 } },
    incomingOffensiveModules: { shipA: [], shipB: [] },
  };
}

const emptyDefenseView: DefenseView = {
  pools: { shipA: { shield: 0, armor: 0, hull: 0 }, shipB: { shield: 0, armor: 0, hull: 0 } },
  poolMaxes: { shipA: { shield: 0, armor: 0, hull: 0 }, shipB: { shield: 0, armor: 0, hull: 0 } },
  poolPercentages: { shipA: { shield: 0, armor: 0, hull: 0 }, shipB: { shield: 0, armor: 0, hull: 0 } },
  hardeners: { shipA: [], shipB: [] },
  dead: { shipA: false, shipB: false },
  deadAt: { shipA: undefined, shipB: undefined },
  damageEnabled: { shipA: true, shipB: true },
  shieldRegenPerSecond: { shipA: 0, shipB: 0 },
  repairers: { shipA: [], shipB: [] },
  repairMode: { shipA: "auto", shipB: "auto" },
  rah: { shipA: undefined, shipB: undefined },
};

const ZERO_LAYER: LayerDamage = { shield: 0, armor: 0, hull: 0 };

function simulationState(): SimulationState {
  return { time: 0, shipA: ship, shipB: { ...ship, id: "shipB", position: new Vec2(0, 5000) } };
}

function lockClockState(): LockClockState {
  return { shipA: LOCKED_STATE, shipB: LOCKED_STATE };
}

function jamClockState(): JamClockState {
  return { time: 0, seed: 0, jamUntil: { shipA: Number.NEGATIVE_INFINITY, shipB: Number.NEGATIVE_INFINITY }, timers: { shipA: [], shipB: [] } };
}

function droneSimulatorState(): DroneSimulatorState {
  return { groups: { shipA: [], shipB: [] } };
}

function fighterSimulatorState(): FighterSimulatorState {
  return { groups: { shipA: [], shipB: [] } };
}

function missileSimulatorState(): MissileSimulatorState {
  const side = { entities: [], cooldowns: new Map(), weaponSpecs: new Map(), lastTargetVelocity: new Vec2(0, 0), lastTargetMaxSpeed: 0 };
  return { sides: { shipA: side, shipB: { ...side } }, time: 0, lastFrameShipA: new Vec2(0, 0), lastFrameShipB: new Vec2(0, 0) };
}

function weaponClockState(): WeaponClockState {
  const side = { cooldowns: new Map() };
  return { seed: 0, sides: { shipA: side, shipB: { ...side } } };
}

function emptyPoolsSnapshot(): SidePoolsSnapshot {
  return {
    shield: 0, armor: 0, hull: 0, shieldMax: 0, armorMax: 0, hullMax: 0,
    shieldRechargeTime: 0, shieldUniformity: 0.25,
    baseResists: { shield: ZERO_DAMAGE, armor: ZERO_DAMAGE, hull: ZERO_DAMAGE },
    hardeners: [], hardenerStates: [], overloaded: false,
    resists: { shield: ZERO_DAMAGE, armor: ZERO_DAMAGE, hull: ZERO_DAMAGE },
    dead: false, deadAt: undefined, damageEnabled: true,
    repairers: [], repairerStates: [], repairMode: "auto", rahSpec: undefined, rahState: undefined,
    inflicted: { ...ZERO_LAYER },
  };
}

function defenseSimulatorState(): DefenseSimulatorState {
  const side = emptyPoolsSnapshot();
  return { sides: { shipA: side, shipB: { ...side } }, time: 0, eventBuffer: [], nextTickBoundary: 1 };
}

function zeroTotals(): Record<"shipA" | "shipB", LayerDamage> {
  return { shipA: { ...ZERO_LAYER }, shipB: { ...ZERO_LAYER } };
}

function mockWorld() {
  return {
    simulation: vi.mocked<Simulation>({ step: vi.fnUntracked(), snapshot: vi.fnUntracked(() => snapshot), reset: vi.fnUntracked(), update: vi.fnUntracked(), capture: vi.fnUntracked(simulationState), restore: vi.fnUntracked() }),
    lockClock: vi.mocked<LockClock>({ reset: vi.fnUntracked(), step: vi.fnUntracked(() => ({ shipA: LOCKED_STATE, shipB: LOCKED_STATE })), states: vi.fnUntracked(() => ({ shipA: LOCKED_STATE, shipB: LOCKED_STATE })), capture: vi.fnUntracked(lockClockState), restore: vi.fnUntracked() }),
    jamClock: vi.mocked<JamClock>({ reset: vi.fnUntracked(), step: vi.fnUntracked(), jammed: vi.fnUntracked(() => ({ shipA: false, shipB: false })), capture: vi.fnUntracked(jamClockState), restore: vi.fnUntracked() }),
    droneSimulator: vi.mocked<DroneSimulator>({ reset: vi.fnUntracked(), update: vi.fnUntracked(), step: vi.fnUntracked(), states: vi.fnUntracked(() => []), capture: vi.fnUntracked(droneSimulatorState), restore: vi.fnUntracked() }),
    fighterSimulator: vi.mocked<FighterSimulator>({ reset: vi.fnUntracked(), update: vi.fnUntracked(), step: vi.fnUntracked(), states: vi.fnUntracked(() => []), capture: vi.fnUntracked(fighterSimulatorState), restore: vi.fnUntracked() }),
    missileSimulator: vi.mocked<MissileSimulator>({ reset: vi.fnUntracked(), update: vi.fnUntracked(), step: vi.fnUntracked(() => []), states: vi.fnUntracked(() => []), facts: vi.fnUntracked(() => ({ inFlightCount: 0, nearestTimeToImpact: 0, predicted: { application: 0, signatureTerm: 1, velocityTerm: 1 }, interceptable: false })), capture: vi.fnUntracked(missileSimulatorState), restore: vi.fnUntracked() }),
    weaponClock: vi.mocked<WeaponClock>({ reset: vi.fnUntracked(), step: vi.fnUntracked(() => []), capture: vi.fnUntracked(weaponClockState), restore: vi.fnUntracked(), spoolCycles: vi.fnUntracked(() => 0) }),
    defenseSimulator: vi.mocked<DefenseSimulator>({ reset: vi.fnUntracked(), update: vi.fnUntracked(), step: vi.fnUntracked(), flushPendingDamage: vi.fnUntracked(), view: vi.fnUntracked(() => emptyDefenseView), inflictedTotals: vi.fnUntracked(zeroTotals), capture: vi.fnUntracked(defenseSimulatorState), restore: vi.fnUntracked() }),
    capacitorSimulator: vi.mocked<CapacitorSimulator>({ reset: vi.fnUntracked(), update: vi.fnUntracked(), step: vi.fnUntracked(), view: vi.fnUntracked(() => emptyCapacitorView), attemptDebit: vi.fnUntracked(() => true), incomingDrains: vi.fnUntracked(), propulsionStarved: vi.fnUntracked(() => false), injectBooster: vi.fnUntracked(), capture: vi.fnUntracked(capacitorSimulatorState), restore: vi.fnUntracked() }),
  };
}

function capacitorSimulatorState(): CapacitorSimulatorState {
  return { time: 0, sides: { shipA: emptyCapacitorSnapshot(), shipB: emptyCapacitorSnapshot() } };
}

function emptyCapacitorSnapshot(): import("./capacitorSimulator").SideCapacitorSnapshot {
  return { spec: undefined, infinite: false, cap: 0, drains: [], boosters: [], incoming: [], propulsion: undefined, fittedDrainPerSecond: 0, weaponsDrainPerSecond: 0 };
}

const emptyCapacitorView: Record<"shipA" | "shipB", CapacitorView> = {
  shipA: { cap: 0, capacity: 0, percentage: 100, regenPerSecond: 0, netPerSecond: 0, drainPerSecond: 0, starved: false, starvedModuleIds: [], propulsion: undefined, drains: [], boosters: [], incoming: [] },
  shipB: { cap: 0, capacity: 0, percentage: 100, regenPerSecond: 0, netPerSecond: 0, drainPerSecond: 0, starved: false, starvedModuleIds: [], propulsion: undefined, drains: [], boosters: [], incoming: [] },
  };

const EMPTY_CAPACITOR_SIDE: CapacitorSideConfig = { infinite: false, drains: [], boosters: [], fittedDrainPerSecond: 0, weaponsDrainPerSecond: 0 };;

function makeEngine() {
  const live = mockWorld();
  const projection = mockWorld();
  const engagementFrameComposer = vi.mocked<EngagementFrameComposer>({ compose: vi.fnUntracked(() => baseView()) });
  const ewarResolver = vi.mocked<Required<EwarResolver>>({
    speedMultiplier: vi.fnUntracked(() => 1), speedMultiplierIgnoringRange: vi.fnUntracked(() => 1),
    sigMultiplier: vi.fnUntracked(() => 1), sigMultiplierIgnoringRange: vi.fnUntracked(() => 1),
    disruptedTurret: vi.fnUntracked((t) => t), disruptedTurretIgnoringRange: vi.fnUntracked((t) => t),
    propulsionSuppressed: vi.fnUntracked(() => false), propulsionSuppressedIgnoringRange: vi.fnUntracked(() => false),
    appliedEffects: vi.fnUntracked(() => []),
    speedBreakdown: vi.fnUntracked(() => ({ effects: [], propulsionSuppressed: false })),
    disruptionBreakdown: vi.fnUntracked(() => ({ tracking: [], optimal: [], falloff: [] })),
    disruptionMultipliers: vi.fnUntracked(() => ({ tracking: 1, optimal: 1, falloff: 1 })),
    dampenedSensorSpec: vi.fnUntracked((s) => s), dampenedSensorSpecIgnoringRange: vi.fnUntracked((s) => s),
    dampenerBreakdown: vi.fnUntracked(() => ({ scanResolution: [], maxTargetRange: [] })),
    reach: vi.fnUntracked(() => ({ web: 0, grappler: 0, scrambler: 0, disruptor: 0, painter: 0, dampener: 0, neutralizer: 0, nosferatu: 0, jammer: 0 })),
    jammerChances: vi.fnUntracked(() => []),
    jammerChance: vi.fnUntracked(() => 0),
    potentials: vi.fnUntracked(() => ({ speedMultiplier: 1, sigMultiplier: 1, propulsionSuppressed: false, trackingMultiplier: 1, optimalMultiplier: 1, falloffMultiplier: 1, scanResolutionMultiplier: 1, targetingRangeMultiplier: 1 })),
  });
  const sensorBoosterResolver = vi.mocked<SensorBoosterResolver>({ boostedSensorSpec: vi.fnUntracked((s) => s) });
  const engine = new EngagementEngineImpl({ live, projection, engagementFrameComposer, ewarResolver, sensorBoosterResolver });
  return { engine, live, projection, engagementFrameComposer, ewarResolver, sensorBoosterResolver };
}

function engineConfig(): import("./engagementEngine").EngineConfig {
  return {
    sim: shipConfig,
    weapons: { shipA: [turret], shipB: [turret] },
    defense: {
      shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC,
      damageEnabled: { shipA: true, shipB: true },
      repairMode: { shipA: "auto", shipB: "auto" },
      repairerActivation: { shipA: [], shipB: [] },
      rahActivation: { shipA: undefined, shipB: undefined },
      overloaded: { shipA: false, shipB: false },
    },
    overloaded: { shipA: false, shipB: false },
    capacitor: { shipA: EMPTY_CAPACITOR_SIDE, shipB: EMPTY_CAPACITOR_SIDE },
  };
}

describe("EngagementEngineImpl", () => {
  test("reset clears all live sub-simulators and returns a view", () => {
    const deps = makeEngine();
    const view = deps.engine.reset(engineConfig());
    expect(deps.live.simulation.reset).toHaveBeenCalledTimes(1);
    expect(deps.live.lockClock.reset).toHaveBeenCalledTimes(1);
    expect(deps.live.droneSimulator.reset).toHaveBeenCalledTimes(1);
    expect(deps.live.missileSimulator.reset).toHaveBeenCalledTimes(1);
    expect(deps.live.weaponClock.reset).toHaveBeenCalledTimes(1);
    expect(deps.live.defenseSimulator.reset).toHaveBeenCalledTimes(1);
    expect(view.snapshot).toBe(snapshot);
    expect(view.defenseRuntime).toBe(emptyDefenseView);
    expect(view.drones).toEqual({ shipA: [], shipB: [] });
    expect(view.missiles).toEqual({ shipA: [], shipB: [] });
  });

  test("reset initializes locks with a zero-step lockClock call", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    expect(deps.live.lockClock.step).toHaveBeenCalledWith(0, expect.any(Object));
  });

  test("update preserves runtime by calling update instead of reset", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    deps.engine.update(engineConfig());
    expect(deps.live.simulation.update).toHaveBeenCalledTimes(1);
    expect(deps.live.droneSimulator.update).toHaveBeenCalledTimes(1);
    expect(deps.live.missileSimulator.update).toHaveBeenCalledTimes(1);
    expect(deps.live.defenseSimulator.update).toHaveBeenCalledTimes(1);
    expect(deps.live.simulation.reset).toHaveBeenCalledTimes(1);
    expect(deps.live.droneSimulator.reset).toHaveBeenCalledTimes(1);
  });

  test("step calls live sub-simulators in the correct order: capacitor, simulation, lock, compose, drone, missile, weapon, defense", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    const order: string[] = [];
    deps.live.capacitorSimulator.step.mockImplementation(() => { order.push("capacitor"); });
    deps.live.simulation.step.mockImplementation(() => { order.push("simulation"); });
    deps.live.lockClock.step.mockImplementation(() => { order.push("lock"); return { shipA: LOCKED_STATE, shipB: LOCKED_STATE }; });
    deps.engagementFrameComposer.compose.mockImplementation(() => { order.push("compose"); return baseView(); });
    deps.live.droneSimulator.step.mockImplementation(() => { order.push("drone"); });
    deps.live.missileSimulator.step.mockImplementation(() => { order.push("missile"); return []; });
    deps.live.weaponClock.step.mockImplementation(() => { order.push("weapon"); return []; });
    deps.live.defenseSimulator.step.mockImplementation(() => { order.push("defense"); });
    deps.engine.step(0.1);
    expect(order).toEqual(["capacitor", "simulation", "lock", "compose", "drone", "missile", "weapon", "defense"]);
  });

  test("capacitor.step precedes simulation.step and receives ewar suppression with the pre-step distance", () => {
    const deps = makeEngine();
    deps.ewarResolver.propulsionSuppressed = vi.fnUntracked(() => true);
    deps.engine.reset(engineConfig());
    deps.engine.step(0.1);
    expect(deps.live.capacitorSimulator.step).toHaveBeenCalledWith(0.1, {
      shipA: { operational: true, propulsionSuppressed: true, weaponsEngaged: true, disengagedModuleIds: [] },
      shipB: { operational: true, propulsionSuppressed: true, weaponsEngaged: true, disengagedModuleIds: [] },
    });
    expect(deps.live.simulation.step).toHaveBeenCalledWith(0.1, { propulsionStarved: { shipA: false, shipB: false }, ewarActive: { shipA: true, shipB: true } });
  });

  test("capacitor.step receives disengaged ids for own ewar modules without an applied effect and weapons engagement from the lock", () => {
    const deps = makeEngine();
    const webId = toTypeId("4027");
    const painterId = toTypeId("12709");
    const projection: EwarProjection = {
      loadout: {
        webs: [{ moduleName: "Web", moduleId: webId, maxRange: 10000, speedFactor: -0.5, overloadRangeBonusPercent: 0, capacitorNeed: 6, cycleTime: 5 }], grapplers: [], disruptors: [], scramblers: [],
        painters: [{ moduleName: "Painter", moduleId: painterId, maxRange: 30000, falloff: 7500, signatureRadiusBonusPercent: 30, overloadStrengthBonusPercent: 0, capacitorNeed: 8, cycleTime: 5 }],
        dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [],
      },
      activation: undefined,
    };
    const withEwar: SimSnapshot = { ...snapshot, shipA: { ...snapshot.shipA, ewar: projection } };
    deps.live.simulation.snapshot = vi.fnUntracked(() => withEwar);
    deps.ewarResolver.appliedEffects = vi.fnUntracked(() => [{ family: "web", moduleId: webId, speedMultiplier: 0.6 }]);
    deps.engine.reset(engineConfig());
    deps.engine.step(0.1);
    expect(deps.live.capacitorSimulator.step).toHaveBeenCalledWith(0.1, {
      shipA: { operational: true, propulsionSuppressed: false, weaponsEngaged: true, disengagedModuleIds: [painterId] },
      shipB: { operational: true, propulsionSuppressed: false, weaponsEngaged: true, disengagedModuleIds: [] },
    });
  });

  test("capacitor.step marks weapons disengaged while the lock is not established", () => {
    const deps = makeEngine();
    const locking: LockState = { status: "locking", progress: 0.5, remaining: 5, lockTime: 10, inRange: true };
    deps.live.lockClock.states = vi.fnUntracked(() => ({ shipA: locking, shipB: LOCKED_STATE }));
    deps.engine.reset(engineConfig());
    deps.engine.step(0.1);
    expect(deps.live.capacitorSimulator.step).toHaveBeenCalledWith(0.1, {
      shipA: { operational: true, propulsionSuppressed: false, weaponsEngaged: false, disengagedModuleIds: [] },
      shipB: { operational: true, propulsionSuppressed: false, weaponsEngaged: true, disengagedModuleIds: [] },
    });
  });

  test("capacitor starvation from the simulator suppresses propulsion in simulation.step", () => {
    const deps = makeEngine();
    deps.live.capacitorSimulator.propulsionStarved = vi.fnUntracked((side: "shipA" | "shipB") => side === "shipA");
    deps.engine.reset(engineConfig());
    deps.engine.step(0.1);
    expect(deps.live.simulation.step).toHaveBeenCalledWith(0.1, { propulsionStarved: { shipA: true, shipB: false }, ewarActive: { shipA: true, shipB: true } });
  });

  test("weaponClock.step and defenseSimulator.step receive the capacitor gate", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    deps.engine.step(0.1);
    expect(deps.live.weaponClock.step).toHaveBeenCalledWith(0.1, expect.anything(), deps.live.capacitorSimulator);
    expect(deps.live.defenseSimulator.step).toHaveBeenCalledWith(0.1, expect.anything(), deps.live.capacitorSimulator);
  });

  test("reset and update wire the capacitor simulator config", () => {
    const deps = makeEngine();
    const config = engineConfig();
    deps.engine.reset(config);
    expect(deps.live.capacitorSimulator.reset).toHaveBeenCalledWith({ sim: config.sim, sides: config.capacitor });
    deps.engine.update(config);
    expect(deps.live.capacitorSimulator.update).toHaveBeenCalledWith({ sim: config.sim, sides: config.capacitor });
  });

  test("projection restores the capacitor simulator and flushes pending damage through the gate", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    expect(deps.projection.capacitorSimulator.restore).toHaveBeenCalledWith(deps.live.capacitorSimulator.capture());
    expect(deps.projection.defenseSimulator.flushPendingDamage).toHaveBeenCalledWith(deps.projection.capacitorSimulator);
  });

  test("view carries capacitorRuntime from the live capacitor simulator", () => {
    const deps = makeEngine();
    const view = deps.engine.reset(engineConfig());
    expect(view.capacitorRuntime).toBe(emptyCapacitorView);
  });

  test("injectCapBooster delegates to the live simulator, republishes the view, and marks projection dirty", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    const listener = vi.fnUntracked();
    deps.engine.events().onViewUpdated(listener);
    deps.live.capacitorSimulator.injectBooster.mockClear();
    const view = deps.engine.injectCapBooster("shipA", 2);
    expect(deps.live.capacitorSimulator.injectBooster).toHaveBeenCalledWith("shipA", 2);
    expect(view.capacitorRuntime).toBe(emptyCapacitorView);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBe(view);
    deps.projection.defenseSimulator.inflictedTotals.mockClear();
    deps.live.simulation.snapshot.mockReturnValue({ ...snapshot, time: 0.5 });
    deps.engine.step(0.1);
    expect(deps.projection.defenseSimulator.inflictedTotals).toHaveBeenCalledTimes(2);
  });

  test("projection restores the live state into the projection world and steps it over the horizon", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    expect(deps.projection.simulation.restore).toHaveBeenCalledWith(deps.live.simulation.capture());
    expect(deps.projection.defenseSimulator.restore).toHaveBeenCalledWith(deps.live.defenseSimulator.capture());
    expect(deps.projection.defenseSimulator.step).toHaveBeenCalledTimes(20);
    expect(deps.projection.defenseSimulator.step.mock.calls.every(([dt]) => dt === 0.5)).toBe(true);
    expect(deps.projection.simulation.capture).not.toHaveBeenCalled();
  });

  test("view inflicts are the projection-world layer deltas divided by the horizon", () => {
    const deps = makeEngine();
    let calls = 0;
    const before: LayerDamage = { shield: 10, armor: 0, hull: 0 };
    const after: LayerDamage = { shield: 110, armor: 40, hull: 0 };
    deps.projection.defenseSimulator.inflictedTotals.mockImplementation(() => {
      calls++;
      return { shipA: calls <= 1 ? before : after, shipB: { ...ZERO_LAYER } };
    });
    const view = deps.engine.reset(engineConfig());
    expect(view.inflicted.shipA).toEqual({ total: 14, byLayer: { shield: 10, armor: 4, hull: 0 } });
    expect(view.inflicted.shipB).toEqual({ total: 0, byLayer: { shield: 0, armor: 0, hull: 0 } });
  });

  test("projection is cached until sim time advances by the cadence", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    deps.projection.defenseSimulator.inflictedTotals.mockClear();
    deps.engine.step(0.1);
    expect(deps.projection.defenseSimulator.inflictedTotals).not.toHaveBeenCalled();
    deps.live.simulation.snapshot.mockReturnValue({ ...snapshot, time: 0.5 });
    deps.engine.step(0.1);
    expect(deps.projection.defenseSimulator.inflictedTotals).toHaveBeenCalledTimes(2);
  });

  test("projection recomputes after config update marks it dirty", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    deps.projection.defenseSimulator.inflictedTotals.mockClear();
    deps.engine.update(engineConfig());
    expect(deps.projection.defenseSimulator.inflictedTotals).toHaveBeenCalledTimes(2);
    deps.projection.defenseSimulator.inflictedTotals.mockClear();
    deps.engine.step(0.1);
    expect(deps.projection.defenseSimulator.inflictedTotals).not.toHaveBeenCalled();
    deps.engine.update(engineConfig());
    deps.engine.step(0.1);
    expect(deps.projection.defenseSimulator.inflictedTotals).toHaveBeenCalledTimes(2);
  });

  test("step passes painted signature to lock input", () => {
    const deps = makeEngine();
    deps.ewarResolver.sigMultiplier.mockReturnValue(2);
    const shipWithSig: ShipState = { ...ship, sig: 40 };
    const snapshotWithSig: SimSnapshot = { ...snapshot, shipA: shipWithSig, shipB: { ...ship, id: "shipB", position: new Vec2(0, 5000), sig: 40 } };
    deps.live.simulation.snapshot.mockReturnValue(snapshotWithSig);
    deps.engine.reset(engineConfig());
    deps.live.lockClock.step.mockClear();
    deps.engine.step(0.1);
    const input = deps.live.lockClock.step.mock.calls[deps.live.lockClock.step.mock.calls.length - 1][1];
    expect(input.sigA).toBe(80);
    expect(input.sigB).toBe(80);
  });

  test("compose input paints each side's sig with only the opponent's painters", () => {
    const deps = makeEngine();
    const painterProjection: EwarProjection = { loadout: { ...EMPTY_EWAR_LOADOUT, painters: [{ moduleName: "Painter", moduleId: toTypeId("12709"), maxRange: 30000, falloff: 7500, signatureRadiusBonusPercent: 30, overloadStrengthBonusPercent: 0, capacitorNeed: 8, cycleTime: 5 }] }, activation: undefined };
    const withEwar: SimSnapshot = { ...snapshot, shipA: { ...snapshot.shipA, sig: 100, ewar: painterProjection }, shipB: { ...snapshot.shipB, sig: 40 } };
    deps.live.simulation.snapshot.mockReturnValue(withEwar);
    deps.ewarResolver.sigMultiplier.mockImplementation((candidate) => (candidate === painterProjection ? 1.3 : 1));
    deps.engine.reset(engineConfig());
    deps.engagementFrameComposer.compose.mockClear();
    deps.engine.step(0.1);
    const input = deps.engagementFrameComposer.compose.mock.calls[deps.engagementFrameComposer.compose.mock.calls.length - 1][1];
    expect(input.paintedSigRadii).toEqual({ shipA: 100, shipB: 52 });
  });

  test("step throws if called before reset", () => {
    const deps = makeEngine();
    expect(() => deps.engine.step(0.1)).toThrow();
  });

  test("view returns the last composed view without re-stepping", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    const v1 = deps.engine.view();
    deps.live.simulation.step.mockClear();
    deps.live.lockClock.step.mockClear();
    const v2 = deps.engine.view();
    expect(v2).toBe(v1);
    expect(deps.live.simulation.step).not.toHaveBeenCalled();
  });

  test("view throws if called before reset", () => {
    const deps = makeEngine();
    expect(() => deps.engine.view()).toThrow();
  });

  test("projection flushes the pending tick buffer before reading both totals", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    deps.live.simulation.snapshot.mockReturnValue({ ...snapshot, time: 0.5 });
    deps.projection.defenseSimulator.flushPendingDamage.mockClear();
    deps.engine.step(0.1);
    expect(deps.projection.defenseSimulator.flushPendingDamage).toHaveBeenCalledTimes(2);
    expect(deps.live.defenseSimulator.flushPendingDamage).not.toHaveBeenCalled();
  });

  test("step surfaces death state from defenseSimulator view", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    const deadView: DefenseView = { ...emptyDefenseView, dead: { shipA: true, shipB: false } };
    deps.live.defenseSimulator.view.mockReturnValue(deadView);
    const view = deps.engine.step(0.1);
    expect(view.defenseRuntime.dead.shipA).toBe(true);
  });

  test("step does not launch missiles when lock is not locked", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    deps.live.lockClock.step.mockReturnValue({ shipA: IDLE_STATE, shipB: IDLE_STATE });
    deps.live.missileSimulator.step.mockClear();
    deps.engine.step(0.1);
    const launches = deps.live.missileSimulator.step.mock.calls[deps.live.missileSimulator.step.mock.calls.length - 1][2];
    expect(launches.shipA).toEqual([]);
    expect(launches.shipB).toEqual([]);
  });

  test("step uses painted signature from ship state for missile launch specs", () => {
    const deps = makeEngine();
    deps.ewarResolver.sigMultiplier.mockReturnValue(2);
    const shipWithSig: ShipState = { ...ship, sig: 50 };
    const opponentWithSig: ShipState = { ...ship, id: "shipB", position: new Vec2(0, 5000), sig: 60 };
    const snapshotWithSig: SimSnapshot = { ...snapshot, shipA: shipWithSig, shipB: opponentWithSig };
    deps.live.simulation.snapshot.mockReturnValue(snapshotWithSig);
    const frameWithSig: EngagementFrame = { ...frame, shipA: shipWithSig, shipB: opponentWithSig };
    const missile: import("./types").MissileSpec = { kind: "missile", moduleId: toTypeId("2"), damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 10, launcherCount: 1, explosionRadius: 40, explosionVelocity: 170, damageReductionFactor: 0.5, maxVelocity: 5000, flightTime: 5, flightRange: 25000 };
    const missileAssessment: AttackAssessment = {
      boostedWeapon: missile, effectiveWeapon: missile,
      damage: { nominalDps: 10, appliedDps: 8, application: 0.8, volley: 100, baseVolleyByType: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, appliedByType: { em: 0, thermal: 0, kinetic: 80, explosive: 0 }, appliedVolleyByType: { em: 0, thermal: 0, kinetic: 80, explosive: 0 } },
      missile: { application: 0.8, signatureTerm: 1, velocityTerm: 0.8, inRange: true, timeToImpact: 1 },
    };
    const viewWithMissile: EngagementView = {
      ...baseView(),
      frame: frameWithSig,
      weaponAttacks: { shipA: [{ weapon: missile, assessment: missileAssessment }], shipB: [] },
    };
    deps.engagementFrameComposer.compose.mockReturnValue(viewWithMissile);
    const configWithMissile: import("./engagementEngine").EngineConfig = {
      ...engineConfig(),
      weapons: { shipA: [missile], shipB: [turret] },
    };
    deps.engine.reset(configWithMissile);
    deps.live.missileSimulator.step.mockClear();
    deps.engine.step(0.1);
    const launches = deps.live.missileSimulator.step.mock.calls[deps.live.missileSimulator.step.mock.calls.length - 1][2];
    expect(launches.shipA).toHaveLength(1);
    expect(launches.shipA[0].paintedTargetSig).toBe(120);
  });

  test("viewUpdated fires once per reset, update, and step with the returned view", () => {
    const deps = makeEngine();
    const views: import("./engagementEngine").EngineView[] = [];
    const listener = (view: import("./engagementEngine").EngineView) => views.push(view);
    deps.engine.events().onViewUpdated(listener);
    const resetView = deps.engine.reset(engineConfig());
    const updateView = deps.engine.update(engineConfig());
    const stepView = deps.engine.step(0.1);
    expect(views).toEqual([resetView, updateView, stepView]);
    expect(views).toHaveLength(3);
    deps.engine.events().offViewUpdated(listener);
    deps.engine.step(0.1);
    expect(views).toHaveLength(3);
  });

  test("viewUpdated is delivered before shipDestroyed so consumers observe death in the view", () => {
    const deps = makeEngine();
    const deadView: import("./engagementEngine").EngineView = { ...deps.engine.reset(engineConfig()), defenseRuntime: { ...emptyDefenseView, dead: { shipA: true, shipB: false } } };
    deps.live.defenseSimulator.view.mockReturnValue(deadView.defenseRuntime);
    deps.engagementFrameComposer.compose.mockReturnValue(deadView);
    const order: string[] = [];
    deps.engine.events().onViewUpdated((view) => {
      order.push("view");
      expect(view.defenseRuntime.dead.shipA).toBe(true);
    });
    deps.engine.events().onShipDestroyed(() => order.push("destroyed"));
    deps.engine.step(0.1);
    expect(order).toEqual(["view", "destroyed"]);
  });

  test("shipDestroyed fires exactly once per side even if dead persists across steps", () => {
    const deps = makeEngine();
    const deadView: import("./engagementEngine").EngineView = { ...deps.engine.reset(engineConfig()), defenseRuntime: { ...emptyDefenseView, dead: { shipA: true, shipB: false } } };
    deps.live.defenseSimulator.view.mockReturnValue(deadView.defenseRuntime);
    deps.engagementFrameComposer.compose.mockReturnValue(deadView);
    const destroyed: import("./types").Side[] = [];
    deps.engine.events().onShipDestroyed((side) => destroyed.push(side));
    deps.engine.step(0.1);
    deps.engine.step(0.1);
    deps.engine.step(0.1);
    expect(destroyed).toEqual(["shipA"]);
  });

  test("reset clears the destroyed-sides tracker so shipDestroyed can fire again", () => {
    const deps = makeEngine();
    const deadView: import("./engagementEngine").EngineView = { ...deps.engine.reset(engineConfig()), defenseRuntime: { ...emptyDefenseView, dead: { shipA: true, shipB: false } } };
    deps.live.defenseSimulator.view.mockReturnValue(deadView.defenseRuntime);
    deps.engagementFrameComposer.compose.mockReturnValue(deadView);
    const destroyed: import("./types").Side[] = [];
    deps.engine.events().onShipDestroyed((side) => destroyed.push(side));
    deps.engine.step(0.1);
    expect(destroyed).toEqual(["shipA"]);
    deps.engine.reset(engineConfig());
    deps.live.defenseSimulator.view.mockReturnValue(deadView.defenseRuntime);
    deps.engagementFrameComposer.compose.mockReturnValue(deadView);
    deps.engine.step(0.1);
    expect(destroyed).toEqual(["shipA", "shipA"]);
  });

  describe("incoming cap warfare", () => {
    const NEUT_ID = toTypeId("12271");
    const NOS_ID = toTypeId("12259");
    const NEUT: EnergyNeutralizerSpec = { moduleName: "Heavy Energy Neutralizer II", moduleId: NEUT_ID, amount: 600, cycleTime: 24, capacitorNeed: 500, maxRange: 20000, falloff: 10000 };
    const NOS: NosferatuSpec = { moduleName: "Medium Energy Nosferatu II", moduleId: NOS_ID, amount: 36, cycleTime: 5, maxRange: 10000, falloff: 5000 };

    function ewarProjection(): EwarProjection {
      return { loadout: { ...EMPTY_EWAR_LOADOUT, neutralizers: [NEUT, NEUT], nosferatu: [NOS] }, activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [{ active: true }, { active: true }], nosferatu: [{ active: true }], jammers: [] } };
    }

    function capWarfareEffects(): readonly AppliedEwarEffect[] {
      return [
        { family: "neutralizer", moduleId: NEUT_ID, amountPerCycle: 600, cycleTime: 24 },
        { family: "neutralizer", moduleId: NEUT_ID, amountPerCycle: 600, cycleTime: 24 },
        { family: "nosferatu", moduleId: NOS_ID, amountPerCycle: 36, cycleTime: 5 },
      ];
    }

    function stepWithOpponentEwar(deps: ReturnType<typeof makeEngine>, config = engineConfig()): void {
      const projection = ewarProjection();
      const withEwar: SimSnapshot = { ...snapshot, shipB: { ...snapshot.shipB, ewar: projection } };
      deps.live.simulation.snapshot.mockReturnValue(withEwar);
      deps.ewarResolver.appliedEffects.mockImplementation((candidate) => (candidate === projection ? capWarfareEffects() : []));
      deps.engine.reset(config);
      deps.engine.step(0.1);
    }

    test("step feeds the opponent's aggregated cap warfare effects as incoming drains", () => {
      const deps = makeEngine();
      stepWithOpponentEwar(deps);
      expect(deps.live.capacitorSimulator.incomingDrains).toHaveBeenCalledWith("shipA", [
        { moduleId: NEUT_ID, amount: 1200, interval: 24, transfer: false, count: 2 },
        { moduleId: NOS_ID, amount: 36, interval: 5, transfer: true, count: 1 },
      ]);
      expect(deps.live.capacitorSimulator.incomingDrains).toHaveBeenCalledWith("shipB", []);
    });

    test("the victim's energy warfare resistance scales incoming amounts", () => {
      const deps = makeEngine();
      const base = engineConfig();
      const config: EngineConfig = { ...base, sim: { ...base.sim, shipA: { ...base.sim.shipA, energyWarfareResistancePercent: 25 } } };
      stepWithOpponentEwar(deps, config);
      expect(deps.live.capacitorSimulator.incomingDrains).toHaveBeenCalledWith("shipA", [
        { moduleId: NEUT_ID, amount: 900, interval: 24, transfer: false, count: 2 },
        { moduleId: NOS_ID, amount: 27, interval: 5, transfer: true, count: 1 },
      ]);
    });
  });

  describe("destroyed side gating", () => {
    const NEUT_ID = toTypeId("12271");
    const NEUT: EnergyNeutralizerSpec = { moduleName: "Heavy Energy Neutralizer II", moduleId: NEUT_ID, amount: 600, cycleTime: 24, capacitorNeed: 500, maxRange: 20000, falloff: 10000 };

    function ewarProjection(): EwarProjection {
      return { loadout: { ...EMPTY_EWAR_LOADOUT, neutralizers: [NEUT] }, activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [{ active: true }], nosferatu: [], jammers: [] } };
    }

    function stepWithDestroyedShipB(deps: ReturnType<typeof makeEngine>): void {
      const projection = ewarProjection();
      const withEwar: SimSnapshot = { ...snapshot, shipB: { ...snapshot.shipB, ewar: projection } };
      const deadView: DefenseView = { ...emptyDefenseView, dead: { shipA: false, shipB: true } };
      deps.live.simulation.snapshot.mockReturnValue(withEwar);
      deps.projection.simulation.snapshot.mockReturnValue(withEwar);
      deps.live.defenseSimulator.view.mockReturnValue(deadView);
      deps.projection.defenseSimulator.view.mockReturnValue(deadView);
      deps.ewarResolver.appliedEffects.mockImplementation((candidate) => (candidate === projection ? [{ family: "neutralizer", moduleId: NEUT_ID, amountPerCycle: 600, cycleTime: 24 }] : []));
      deps.engine.reset(engineConfig());
      deps.engine.step(0.1);
    }

    test("a destroyed side is frozen in the capacitor and its ewar projects nothing", () => {
      const deps = makeEngine();
      stepWithDestroyedShipB(deps);
      expect(deps.live.capacitorSimulator.step).toHaveBeenCalledWith(0.1, {
        shipA: { operational: true, propulsionSuppressed: false, weaponsEngaged: true, disengagedModuleIds: [] },
        shipB: { operational: false, propulsionSuppressed: false, weaponsEngaged: true, disengagedModuleIds: [] },
      });
      // shipB is destroyed: its neutralizers no longer drain shipA.
      expect(deps.live.capacitorSimulator.incomingDrains).toHaveBeenCalledWith("shipA", []);
      expect(deps.live.capacitorSimulator.incomingDrains).toHaveBeenCalledWith("shipB", []);
    });

    test("a destroyed side loses its locks, its propulsion, and its drones freeze", () => {
      const deps = makeEngine();
      stepWithDestroyedShipB(deps);
      const lockInput = deps.live.lockClock.step.mock.calls[0][1];
      expect(lockInput.operational).toEqual({ shipA: true, shipB: false });
      expect(deps.live.simulation.step).toHaveBeenCalledWith(0.1, { propulsionStarved: { shipA: false, shipB: true }, ewarActive: { shipA: true, shipB: false } });
      expect(deps.live.droneSimulator.step).toHaveBeenCalledWith(0.1, expect.anything(), { shipA: true, shipB: false });
      expect(deps.live.fighterSimulator.step).toHaveBeenCalledWith(0.1, expect.anything(), { shipA: true, shipB: false });
    });
  });
});

describe("_projectionHorizonSeconds", () => {
  test("returns the floor when all weapons cycle faster than half the floor", () => {
    expect(_projectionHorizonSeconds([], [])).toBe(10);
    expect(_projectionHorizonSeconds([{ ...turret, cycleTime: 3 }], [{ ...turret, cycleTime: 4 }])).toBe(10);
  });

  test("covers at least two cycles of the slowest weapon on either side", () => {
    expect(_projectionHorizonSeconds([{ ...turret, cycleTime: 8 }], [])).toBe(16);
    expect(_projectionHorizonSeconds([{ ...turret, cycleTime: 1 }], [{ ...turret, cycleTime: 9 }])).toBe(18);
  });
});

describe("ECM jamming integration", () => {
  const JAMMER: JammerSpec = { moduleName: "Gravimetric ECM II", moduleId: toTypeId("2571"), strengths: { gravimetric: 4, ladar: 1.3, magnetometric: 1.3, radar: 1.3 }, optimal: 34560, falloff: 32400, overloadStrengthBonusPercent: 20, capacitorNeed: 58, cycleTime: 20 };
  const TARGET_SENSORS: SensorSpec = { scanResolution: 200, maxTargetingRange: 30000, maxLockedTargets: 4, strengths: { gravimetric: 4, ladar: 0, magnetometric: 0, radar: 0 } };

  function jamSimConfig(): SimConfig {
    return {
      shipA: { id: "shipA", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1, ewar: { loadout: { ...EMPTY_EWAR_LOADOUT, jammers: [JAMMER] }, activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [], jammers: [{ active: true, overloaded: false }] } } },
      shipB: { id: "shipB", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1, sensorSpec: TARGET_SENSORS },
      initialDistance: 5000,
    };
  }

  function jamEngine() {
    const stacking = new StackingPenaltyImpl();
    const resolver = new EwarResolverImpl({ stackingPenalty: stacking });
    const factory = new SimWorldFactoryImpl({ simConfig: jamSimConfig(), ewarResolver: resolver, kinematics: new KinematicsImpl(), missileApplication: new MissileApplicationImpl(), rngFactory: new Mulberry32RngFactory(), stackingPenalty: stacking });
    const composer = vi.mocked<EngagementFrameComposer>({ compose: vi.fnUntracked((_snapshot, input) => ({ ...baseView(), jammed: input.jammed, locks: input.locks })) });
    const engine = new EngagementEngineImpl({ live: factory.createExpected(), projection: factory.createExpected(), engagementFrameComposer: composer, ewarResolver: resolver, sensorBoosterResolver: new SensorBoosterResolverImpl({ stackingPenalty: stacking }) });
    return engine;
  }

  function jamConfig(): import("./engagementEngine").EngineConfig {
    return {
      sim: jamSimConfig(),
      weapons: { shipA: [], shipB: [] },
      defense: {
        shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC,
        damageEnabled: { shipA: true, shipB: true },
        repairMode: { shipA: "auto", shipB: "auto" },
        repairerActivation: { shipA: [], shipB: [] },
        rahActivation: { shipA: undefined, shipB: undefined },
        overloaded: { shipA: false, shipB: false },
      },
      overloaded: { shipA: false, shipB: false },
      capacitor: { shipA: EMPTY_CAPACITOR_SIDE, shipB: EMPTY_CAPACITOR_SIDE },
    };
  }

  test("an active jammer breaks the target's locks at cycle completion and keeps them jammed while cycles land", () => {
    const engine = jamEngine();
    engine.reset(jamConfig());
    for (let i = 0; i < 39; i++) engine.step(0.5);
    expect(engine.view().jammed.shipB).toBe(false);
    expect(engine.view().locks.shipB.status).not.toBe("idle");
    engine.step(0.5);
    expect(engine.view().jammed.shipB).toBe(true);
    expect(engine.view().locks.shipB.status).toBe("idle");
    for (let i = 0; i < 39; i++) engine.step(0.5);
    expect(engine.view().jammed.shipB).toBe(true);
    expect(engine.view().jammed.shipA).toBe(false);
  });
});
