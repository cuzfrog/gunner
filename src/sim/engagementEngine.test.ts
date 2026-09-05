import { EngagementEngineImpl } from "./engagementEngine";
import { Vec2 } from "./vec2";
import { EMPTY_DEFENSE_SPEC, EMPTY_PROJECTION, ZERO_DAMAGE, type EngagementFrame, type HitChanceBreakdown, type LockState, type ShipState, type SimConfig, type SimSnapshot, type TurretSpec } from "./types";
import { EMPTY_DEFENSE_ASSESSMENT } from "./defenseAssessment";
import type { AttackAssessment } from "./fireControl";
import type { DefenseSimulator, DefenseView } from "./defenseSimulator";
import type { DroneSimulator } from "./droneSimulator";
import type { EngagementFrameComposer, EngagementView } from "./engagementFrameComposer";
import type { EwarResolver } from "./ewarResolver";
import type { LockClock } from "./lockClock";
import type { MissileSimulator } from "./missileSimulator";
import type { SensorBoosterResolver } from "./sensorBoosterResolver";
import type { Simulation } from "./simulation";
import type { WeaponClock } from "./weaponClock";

const LOCKED_STATE: LockState = { status: "locked", progress: 1, remaining: 0, lockTime: 0, inRange: true };
const IDLE_STATE: LockState = { status: "idle", progress: 0, remaining: 0, lockTime: 0, inRange: true };

const ship: ShipState = {
  id: "shipA", position: new Vec2(0, 0), velocity: new Vec2(0, 0), maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1,
};
const snapshot: SimSnapshot = { time: 0, shipA: ship, shipB: { ...ship, id: "shipB", position: new Vec2(0, 5000) }, commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) } };
const frame: EngagementFrame = {
  time: 0, shipA: ship, shipB: { ...ship, id: "shipB" }, relPosition: new Vec2(0, 5000), distance: 5000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
};
const turret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: ZERO_DAMAGE, cycleTime: 1, turretCount: 1 };
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
    projection: { shipA: EMPTY_PROJECTION, shipB: EMPTY_PROJECTION },
    locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE },
    readouts: { shipA: { kind: "none", speed: 0 }, shipB: { kind: "none", speed: 0 } },
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

function makeEngine() {
  const simulation = vi.mocked<Simulation>({ step: vi.fn(), snapshot: vi.fn(() => snapshot), reset: vi.fn(), update: vi.fn() });
  const lockClock = vi.mocked<LockClock>({ reset: vi.fn(), step: vi.fn(() => ({ shipA: LOCKED_STATE, shipB: LOCKED_STATE })), states: vi.fn(() => ({ shipA: LOCKED_STATE, shipB: LOCKED_STATE })) });
  const droneSimulator = vi.mocked<DroneSimulator>({ reset: vi.fn(), update: vi.fn(), step: vi.fn(), states: vi.fn(() => []) });
  const missileSimulator = vi.mocked<MissileSimulator>({ reset: vi.fn(), update: vi.fn(), step: vi.fn(() => []), states: vi.fn(() => []), facts: vi.fn(() => ({ inFlightCount: 0, nearestTimeToImpact: 0, predicted: { application: 0, signatureTerm: 1, velocityTerm: 1 }, interceptable: false })) });
  const weaponClock = vi.mocked<WeaponClock>({ reset: vi.fn(), step: vi.fn(() => []) });
  const defenseSimulator = vi.mocked<DefenseSimulator>({ reset: vi.fn(), update: vi.fn(), step: vi.fn(), view: vi.fn(() => emptyDefenseView), setDamageEnabled: vi.fn(), setRepairMode: vi.fn(), setRepairerActivation: vi.fn(), setRahActivation: vi.fn(), project: vi.fn(() => ({ shipA: EMPTY_PROJECTION, shipB: EMPTY_PROJECTION })) });
  const engagementFrameComposer = vi.mocked<EngagementFrameComposer>({ compose: vi.fn(() => baseView()) });
  const ewarResolver = vi.mocked<Required<EwarResolver>>({
    speedMultiplier: vi.fn(() => 1), speedMultiplierIgnoringRange: vi.fn(() => 1),
    sigMultiplier: vi.fn(() => 1), sigMultiplierIgnoringRange: vi.fn(() => 1),
    disruptedTurret: vi.fn((t) => t), disruptedTurretIgnoringRange: vi.fn((t) => t),
    propulsionSuppressed: vi.fn(() => false), propulsionSuppressedIgnoringRange: vi.fn(() => false),
    appliedEffects: vi.fn(() => []),
    speedBreakdown: vi.fn(() => ({ effects: [], propulsionSuppressed: false })),
    disruptionBreakdown: vi.fn(() => ({ tracking: [], optimal: [], falloff: [] })),
    dampenedSensorSpec: vi.fn((s) => s), dampenedSensorSpecIgnoringRange: vi.fn((s) => s),
    dampenerBreakdown: vi.fn(() => ({ scanResolution: [], maxTargetRange: [] })),
    reach: vi.fn(() => ({ web: 0, grappler: 0, scrambler: 0, disruptor: 0, painter: 0, dampener: 0 })),
    potentials: vi.fn(() => ({ speedMultiplier: 1, sigMultiplier: 1, propulsionSuppressed: false, trackingMultiplier: 1, optimalMultiplier: 1, falloffMultiplier: 1, scanResolutionMultiplier: 1, targetingRangeMultiplier: 1 })),
  });
  const sensorBoosterResolver = vi.mocked<SensorBoosterResolver>({ boostedSensorSpec: vi.fn((s) => s) });
  const engine = new EngagementEngineImpl({ simulation, lockClock, droneSimulator, missileSimulator, weaponClock, defenseSimulator, engagementFrameComposer, ewarResolver, sensorBoosterResolver });
  return { engine, simulation, lockClock, droneSimulator, missileSimulator, weaponClock, defenseSimulator, engagementFrameComposer, ewarResolver, sensorBoosterResolver };
}

function engineConfig(): import("./engagementEngine").EngineConfig {
  return {
    sim: shipConfig,
    weapons: { shipA: [turret], shipB: [turret] },
    sigRadii: { shipA: 40, shipB: 40 },
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
  test("reset clears all sub-simulators and returns a view", () => {
    const deps = makeEngine();
    const view = deps.engine.reset(engineConfig());
    expect(deps.simulation.reset).toHaveBeenCalledTimes(1);
    expect(deps.lockClock.reset).toHaveBeenCalledTimes(1);
    expect(deps.droneSimulator.reset).toHaveBeenCalledTimes(1);
    expect(deps.missileSimulator.reset).toHaveBeenCalledTimes(1);
    expect(deps.weaponClock.reset).toHaveBeenCalledTimes(1);
    expect(deps.defenseSimulator.reset).toHaveBeenCalledTimes(1);
    expect(view.snapshot).toBe(snapshot);
    expect(view.defenseRuntime).toBe(emptyDefenseView);
    expect(view.drones).toEqual({ shipA: [], shipB: [] });
    expect(view.missiles).toEqual({ shipA: [], shipB: [] });
  });

  test("reset initializes locks with a zero-step lockClock call", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    expect(deps.lockClock.step).toHaveBeenCalledWith(0, expect.any(Object));
  });

  test("update preserves runtime by calling update instead of reset", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    deps.engine.update(engineConfig());
    expect(deps.simulation.update).toHaveBeenCalledTimes(1);
    expect(deps.droneSimulator.update).toHaveBeenCalledTimes(1);
    expect(deps.missileSimulator.update).toHaveBeenCalledTimes(1);
    expect(deps.defenseSimulator.update).toHaveBeenCalledTimes(1);
    expect(deps.simulation.reset).toHaveBeenCalledTimes(1);
    expect(deps.droneSimulator.reset).toHaveBeenCalledTimes(1);
  });

  test("step calls sub-simulators in the correct order: simulation, lock, compose, drone, missile, weapon, defense", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    const order: string[] = [];
    deps.simulation.step.mockImplementation(() => { order.push("simulation"); });
    deps.lockClock.step.mockImplementation(() => { order.push("lock"); return { shipA: LOCKED_STATE, shipB: LOCKED_STATE }; });
    deps.engagementFrameComposer.compose.mockImplementation(() => { order.push("compose"); return baseView(); });
    deps.droneSimulator.step.mockImplementation(() => { order.push("drone"); });
    deps.missileSimulator.step.mockImplementation(() => { order.push("missile"); return []; });
    deps.weaponClock.step.mockImplementation(() => { order.push("weapon"); return []; });
    deps.defenseSimulator.step.mockImplementation(() => { order.push("defense"); });
    deps.engine.step(0.1);
    expect(order).toEqual(["simulation", "lock", "compose", "drone", "missile", "weapon", "defense"]);
  });

  test("step passes painted signature to lock input", () => {
    const deps = makeEngine();
    deps.ewarResolver.sigMultiplier.mockReturnValue(2);
    const shipWithSig: ShipState = { ...ship, sig: 40 };
    const snapshotWithSig: SimSnapshot = { ...snapshot, shipA: shipWithSig, shipB: { ...ship, id: "shipB", position: new Vec2(0, 5000), sig: 40 } };
    deps.simulation.snapshot.mockReturnValue(snapshotWithSig);
    deps.engine.reset(engineConfig());
    deps.lockClock.step.mockClear();
    deps.engine.step(0.1);
    const input = deps.lockClock.step.mock.calls[0][1];
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
    deps.simulation.step.mockClear();
    deps.lockClock.step.mockClear();
    const v2 = deps.engine.view();
    expect(v2).toBe(v1);
    expect(deps.simulation.step).not.toHaveBeenCalled();
  });

  test("view throws if called before reset", () => {
    const deps = makeEngine();
    expect(() => deps.engine.view()).toThrow();
  });

  test("defense setters delegate to defenseSimulator", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    deps.engine.setDamageEnabled("shipA", false);
    deps.engine.setRepairMode("shipB", "manual");
    deps.engine.setRepairerActivation("shipA", 0, true, false);
    deps.engine.setRahActivation("shipB", true, true);
    expect(deps.defenseSimulator.setDamageEnabled).toHaveBeenCalledWith("shipA", false);
    expect(deps.defenseSimulator.setRepairMode).toHaveBeenCalledWith("shipB", "manual");
    expect(deps.defenseSimulator.setRepairerActivation).toHaveBeenCalledWith("shipA", 0, true, false);
    expect(deps.defenseSimulator.setRahActivation).toHaveBeenCalledWith("shipB", true, true);
  });

  test("step surfaces death state from defenseSimulator view", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    const deadView: DefenseView = { ...emptyDefenseView, dead: { shipA: true, shipB: false } };
    deps.defenseSimulator.view.mockReturnValue(deadView);
    const view = deps.engine.step(0.1);
    expect(view.defenseRuntime.dead.shipA).toBe(true);
  });

  test("step does not launch missiles when lock is not locked", () => {
    const deps = makeEngine();
    deps.engine.reset(engineConfig());
    deps.lockClock.step.mockReturnValue({ shipA: IDLE_STATE, shipB: IDLE_STATE });
    deps.missileSimulator.step.mockClear();
    deps.engine.step(0.1);
    const launches = deps.missileSimulator.step.mock.calls[0][2];
    expect(launches.shipA).toEqual([]);
    expect(launches.shipB).toEqual([]);
  });

  test("step uses painted signature from ship state for missile launch specs", () => {
    const deps = makeEngine();
    deps.ewarResolver.sigMultiplier.mockReturnValue(2);
    const shipWithSig: ShipState = { ...ship, sig: 50 };
    const opponentWithSig: ShipState = { ...ship, id: "shipB", position: new Vec2(0, 5000), sig: 60 };
    const snapshotWithSig: SimSnapshot = { ...snapshot, shipA: shipWithSig, shipB: opponentWithSig };
    deps.simulation.snapshot.mockReturnValue(snapshotWithSig);
    const frameWithSig: EngagementFrame = { ...frame, shipA: shipWithSig, shipB: opponentWithSig };
    const missile: import("./types").MissileSpec = { kind: "missile", damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 10, launcherCount: 1, explosionRadius: 40, explosionVelocity: 170, damageReductionFactor: 0.5, maxVelocity: 5000, flightTime: 5, flightRange: 25000 };
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
    deps.missileSimulator.step.mockClear();
    deps.engine.step(0.1);
    const launches = deps.missileSimulator.step.mock.calls[0][2];
    expect(launches.shipA).toHaveLength(1);
    expect(launches.shipA[0].paintedTargetSig).toBe(120);
  });
});
