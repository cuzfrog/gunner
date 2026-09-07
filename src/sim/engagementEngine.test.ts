import { EngagementEngineImpl, _projectionHorizonSeconds } from "./engagementEngine";
import { Vec2 } from "./vec2";
import { toTypeId } from "../gamedata/ids";
import { EMPTY_DEFENSE_SPEC, ZERO_DAMAGE, type EngagementFrame, type HitChanceBreakdown, type LayerDamage, type LockState, type ShipState, type SimConfig, type SimSnapshot, type TurretSpec } from "./types";
import { EMPTY_DEFENSE_ASSESSMENT } from "./defenseAssessment";
import type { AttackAssessment } from "./fireControl";
import type { DefenseSimulator, DefenseSimulatorState, DefenseView, SidePoolsSnapshot } from "./defenseSimulator";
import type { InflictedDps } from "./types";
import type { DroneSimulator, DroneSimulatorState } from "./droneSimulator";
import type { EngagementFrameComposer, EngagementView } from "./engagementFrameComposer";
import type { EwarResolver } from "./ewarResolver";
import type { LockClock, LockClockState } from "./lockClock";
import type { MissileSimulator, MissileSimulatorState } from "./missileSimulator";
import type { SensorBoosterResolver } from "./sensorBoosterResolver";
import type { Simulation, SimulationState } from "./simulation";
import type { SimWorld } from "./simWorld";
import type { WeaponClock, WeaponClockState } from "./weaponClock";

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
    turret: { hit, expectedMultiplier: 1 },
  };
  return {
    frame, attacks: { shipA: assessment, shipB: assessment }, weaponAttacks: { shipA: [], shipB: [] },
    effectiveWeapons: { shipA: turret, shipB: turret },
    defenses: { shipA: EMPTY_DEFENSE_ASSESSMENT, shipB: EMPTY_DEFENSE_ASSESSMENT },
    locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE },
    readouts: { shipA: { kind: "none", speed: 0 }, shipB: { kind: "none", speed: 0 } },
    incomingOffensiveModules: { shipA: [], shipB: [] },
  };
}

const emptyDefenseView: DefenseView = {
  pools: { shipA: { shield: 0, armor: 0, hull: 0 }, shipB: { shield: 0, armor: 0, hull: 0 } },
  poolPercentages: { shipA: { shield: 0, armor: 0, hull: 0 }, shipB: { shield: 0, armor: 0, hull: 0 } },
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

function droneSimulatorState(): DroneSimulatorState {
  return { groups: { shipA: [], shipB: [] } };
}

function missileSimulatorState(): MissileSimulatorState {
  const side = { entities: [], cooldowns: new Map(), weaponSpecs: new Map(), lastPaintedSig: new Map(), lastTargetVelocity: new Vec2(0, 0), lastTargetMaxSpeed: 0 };
  return { sides: { shipA: side, shipB: { ...side } }, time: 0, lastFrameShipA: new Vec2(0, 0), lastFrameShipB: new Vec2(0, 0) };
}

function weaponClockState(): WeaponClockState {
  const side = { cooldowns: new Map(), weaponSignature: "" };
  return { seed: 0, sides: { shipA: side, shipB: { ...side } } };
}

function emptyPoolsSnapshot(): SidePoolsSnapshot {
  return {
    shield: 0, armor: 0, hull: 0, shieldMax: 0, armorMax: 0, hullMax: 0,
    shieldRechargeTime: 0, shieldUniformity: 0.25, baseArmorResists: ZERO_DAMAGE,
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
    simulation: vi.mocked<Simulation>({ step: vi.fn(), snapshot: vi.fn(() => snapshot), reset: vi.fn(), update: vi.fn(), capture: vi.fn(simulationState), restore: vi.fn() }),
    lockClock: vi.mocked<LockClock>({ reset: vi.fn(), step: vi.fn(() => ({ shipA: LOCKED_STATE, shipB: LOCKED_STATE })), states: vi.fn(() => ({ shipA: LOCKED_STATE, shipB: LOCKED_STATE })), capture: vi.fn(lockClockState), restore: vi.fn() }),
    droneSimulator: vi.mocked<DroneSimulator>({ reset: vi.fn(), update: vi.fn(), step: vi.fn(), states: vi.fn(() => []), capture: vi.fn(droneSimulatorState), restore: vi.fn() }),
    missileSimulator: vi.mocked<MissileSimulator>({ reset: vi.fn(), update: vi.fn(), step: vi.fn(() => []), states: vi.fn(() => []), facts: vi.fn(() => ({ inFlightCount: 0, nearestTimeToImpact: 0, predicted: { application: 0, signatureTerm: 1, velocityTerm: 1 }, interceptable: false })), capture: vi.fn(missileSimulatorState), restore: vi.fn() }),
    weaponClock: vi.mocked<WeaponClock>({ reset: vi.fn(), step: vi.fn(() => []), capture: vi.fn(weaponClockState), restore: vi.fn() }),
    defenseSimulator: vi.mocked<DefenseSimulator>({ reset: vi.fn(), update: vi.fn(), step: vi.fn(), flushPendingDamage: vi.fn(), view: vi.fn(() => emptyDefenseView), inflictedTotals: vi.fn(zeroTotals), capture: vi.fn(defenseSimulatorState), restore: vi.fn() }),
  };
}

function makeEngine() {
  const live = mockWorld();
  const projection = mockWorld();
  const engagementFrameComposer = vi.mocked<EngagementFrameComposer>({ compose: vi.fn(() => baseView()) });
  const ewarResolver = vi.mocked<Required<EwarResolver>>({
    speedMultiplier: vi.fn(() => 1), speedMultiplierIgnoringRange: vi.fn(() => 1),
    sigMultiplier: vi.fn(() => 1), sigMultiplierIgnoringRange: vi.fn(() => 1),
    disruptedTurret: vi.fn((t) => t), disruptedTurretIgnoringRange: vi.fn((t) => t),
    propulsionSuppressed: vi.fn(() => false), propulsionSuppressedIgnoringRange: vi.fn(() => false),
    appliedEffects: vi.fn(() => []),
    speedBreakdown: vi.fn(() => ({ effects: [], propulsionSuppressed: false })),
    disruptionBreakdown: vi.fn(() => ({ tracking: [], optimal: [], falloff: [] })),
    disruptionMultipliers: vi.fn(() => ({ tracking: 1, optimal: 1, falloff: 1 })),
    dampenedSensorSpec: vi.fn((s) => s), dampenedSensorSpecIgnoringRange: vi.fn((s) => s),
    dampenerBreakdown: vi.fn(() => ({ scanResolution: [], maxTargetRange: [] })),
    reach: vi.fn(() => ({ web: 0, grappler: 0, scrambler: 0, disruptor: 0, painter: 0, dampener: 0 })),
    potentials: vi.fn(() => ({ speedMultiplier: 1, sigMultiplier: 1, propulsionSuppressed: false, trackingMultiplier: 1, optimalMultiplier: 1, falloffMultiplier: 1, scanResolutionMultiplier: 1, targetingRangeMultiplier: 1 })),
  });
  const sensorBoosterResolver = vi.mocked<SensorBoosterResolver>({ boostedSensorSpec: vi.fn((s) => s) });
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
    },
    overloaded: { shipA: false, shipB: false },
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

  test("step calls live sub-simulators in the correct order: simulation, lock, compose, drone, missile, weapon, defense", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    const order: string[] = [];
    deps.live.simulation.step.mockImplementation(() => { order.push("simulation"); });
    deps.live.lockClock.step.mockImplementation(() => { order.push("lock"); return { shipA: LOCKED_STATE, shipB: LOCKED_STATE }; });
    deps.engagementFrameComposer.compose.mockImplementation(() => { order.push("compose"); return baseView(); });
    deps.live.droneSimulator.step.mockImplementation(() => { order.push("drone"); });
    deps.live.missileSimulator.step.mockImplementation(() => { order.push("missile"); return []; });
    deps.live.weaponClock.step.mockImplementation(() => { order.push("weapon"); return []; });
    deps.live.defenseSimulator.step.mockImplementation(() => { order.push("defense"); });
    deps.engine.step(0.1);
    expect(order).toEqual(["simulation", "lock", "compose", "drone", "missile", "weapon", "defense"]);
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
