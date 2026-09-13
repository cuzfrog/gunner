import { EMPTY_DEFENSE_SPEC, EMPTY_EWAR_LOADOUT, type EwarProjection, type MissileBoosterProjection, type MissileSpec, type SensorBoostProjection, type TurretBoostProjection, type TurretSpec, type WeaponSpec } from "../../../sim";
import { toTypeId } from "../../../gamedata/ids";
import type { CapacitorStats } from "../../../fitting";
import type { FittedHullSummary } from "../../../appstate";
import type { SidePanelState } from "../sidePanel";
import type { EwarController } from "../ewar";
import type { BoosterController } from "../booster";
import type { MissileBoosterController } from "../missileBooster";
import type { SensorBoosterController } from "../sensorBooster";
import type { DefenseController } from "../defense";
import type { CapacitorController } from "../capacitor";
import type { DroneController } from "../drone";
import type { LauncherController } from "../launcher";
import type { TurretController } from "../turret";
import type { WeaponSystemSwitch } from "../sidePanel";
import type { CapacitorStatsSource } from "./capacitorStatsSource";
import { SimConfigSourceImpl } from "./simConfigSource";

function baseShipAState(): SidePanelState {
  return {
    speed: 400,
    baseMaxSpeed: 300,
    mass: 1_000_000,
    inertia: 3,
    mode: "orbit",
    range: 5000,
    aggressivity: 1.5,
    skillLevel: 5,
    overload: true, weaponOverload: false,
    hull: undefined,
    propulsion: undefined,
    fitting: undefined,
    overrides: {},
    fittedHull: undefined,
    sig: undefined,
    defenseSkills: undefined,
  };
}

function baseShipBState(): SidePanelState {
  return {
    speed: 250,
    baseMaxSpeed: 250,
    mass: 1_000_000,
    inertia: 3,
    mode: "orbit",
    range: 6000,
    aggressivity: 1,
    skillLevel: 5,
    overload: true, weaponOverload: false,
    hull: undefined,
    propulsion: undefined,
    fitting: undefined,
    overrides: {},
    fittedHull: undefined,
    sig: 40,
    defenseSkills: undefined,
  };
}

function ewarProjection(): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], },
    activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [], },
  };
}

function boostProjection(): TurretBoostProjection {
  return { loadout: { computers: [], scripts: [] }, activation: { computers: [] } };
}

function fittedHull(propulsionKind: "afterburner" | "microwarpdrive" | undefined): FittedHullSummary {
  return {
    fittingName: "Brawler",
    fitted: { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0, mwdSigBloomMultiplier: 1 },
    propulsionKind,
    capacitor: { capacity: 4375, rechargeTime: 656.25 },
    energyWarfareResistancePercent: 0,
  };
}

function build() {
  const shipAState = baseShipAState();
  const shipBState = baseShipBState();
  const ewar = ewarProjection();
  const boost = boostProjection();
  const ewarController = vi.mocked<EwarController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? ewar : undefined)),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
    updateStarvedModules: vi.fn(),
  });
  const boosterController = vi.mocked<BoosterController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? boost : undefined)),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const missileBoost: MissileBoosterProjection | undefined = undefined;
  const missileBoosterController = vi.mocked<MissileBoosterController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? missileBoost : undefined)),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const sensorBoost: SensorBoostProjection | undefined = undefined;
  const sensorBoosterController = vi.mocked<SensorBoosterController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? sensorBoost : undefined)),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const shipASide = { capture: vi.fn(() => shipAState), skillConditions: vi.fn(() => ({ overloaded: true, skillLevel: 5 as const, weaponOverloaded: false, defenseSkills: undefined, targetingSkills: undefined })) };
  const shipBSide = { capture: vi.fn(() => shipBState), skillConditions: vi.fn(() => ({ overloaded: true, skillLevel: 5 as const, weaponOverloaded: false, defenseSkills: undefined, targetingSkills: undefined })) };
  const distanceSource = { getInitialDistance: vi.fn(() => 6000) };
  const turretSpec: TurretSpec = { kind: "turret", moduleId: toTypeId("1"), tracking: 0.3, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
  const missileSpec: MissileSpec = { kind: "missile", moduleId: toTypeId("2"), damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 10, launcherCount: 1, explosionRadius: 40, explosionVelocity: 170, damageReductionFactor: 0.5, maxVelocity: 5000, flightTime: 5, flightRange: 25000 };
  const weaponSystemSwitches = {
    shipA: { activeKind: vi.fn(() => "turret" as const) } as unknown as WeaponSystemSwitch,
    shipB: { activeKind: vi.fn(() => "turret" as const) } as unknown as WeaponSystemSwitch,
  };
  const turretControllers = {
    shipA: { currentTurretSpecs: vi.fn(() => [turretSpec]) } as unknown as TurretController,
    shipB: { currentTurretSpecs: vi.fn(() => [turretSpec]) } as unknown as TurretController,
  };
  const launcherControllers = {
    shipA: { currentMissileSpec: vi.fn(() => missileSpec) } as unknown as LauncherController,
    shipB: { currentMissileSpec: vi.fn(() => missileSpec) } as unknown as LauncherController,
  };
  const droneControllers = {
    shipA: { currentDroneSpecs: vi.fn(() => []) } as unknown as DroneController,
    shipB: { currentDroneSpecs: vi.fn(() => []) } as unknown as DroneController,
  };
  const defenseController = {
    spec: vi.fn(() => EMPTY_DEFENSE_SPEC),
    damageEnabled: vi.fn(() => true),
    repairMode: vi.fn(() => "auto" as const),
    repairerActivation: vi.fn(() => []),
    rahActivation: vi.fn(() => undefined),
  } as unknown as DefenseController;
  const capacitorController = {
    infiniteCapacitor: vi.fn(() => false),
    capBoosterSpecs: vi.fn(() => []),
  } as unknown as CapacitorController;
  const capacitorStatsSource = { stats: vi.fn((_side: "shipA" | "shipB") => undefined as CapacitorStats | undefined) } as unknown as CapacitorStatsSource & { stats: ReturnType<typeof vi.fn> };
  return { shipASide, shipBSide, ewarController, boosterController, missileBoosterController, sensorBoosterController, distanceSource, ewar, boost, missileBoost, sensorBoost, weaponSystemSwitches, turretControllers, launcherControllers, droneControllers, defenseController, capacitorController, capacitorStatsSource, turretSpec, missileSpec };
}

function makeSource(deps: ReturnType<typeof build>) {
  return new SimConfigSourceImpl({
    shipASide: deps.shipASide,
    shipBSide: deps.shipBSide,
    ewarController: deps.ewarController,
    boosterController: deps.boosterController,
    missileBoosterController: deps.missileBoosterController,
    sensorBoosterController: deps.sensorBoosterController,
    distanceSource: deps.distanceSource,
    weaponSystemSwitches: deps.weaponSystemSwitches,
    turretControllers: deps.turretControllers,
    launcherControllers: deps.launcherControllers,
    droneControllers: deps.droneControllers,
    defenseController: deps.defenseController,
    capacitorController: deps.capacitorController,
    capacitorStatsSource: deps.capacitorStatsSource,
  });
}

describe("SimConfigSourceImpl", () => {
  test("getConfig assembles shipA and shipB from side state, ewar, boosters and distance", () => {
    const deps = build();
    const source = makeSource(deps);
    const config = source.getConfig();
    expect(config.shipA.id).toBe("shipA");
    expect(config.shipA.maxSpeed).toBe(400);
    expect(config.shipA.baseMaxSpeed).toBe(300);
    expect(config.shipA.mass).toBe(1_000_000);
    expect(config.shipA.inertiaModifier).toBe(3);
    expect(config.shipA.mode).toBe("orbit");
    expect(config.shipA.desiredRange).toBe(5000);
    expect(config.shipA.aggressivity).toBe(1.5);
    expect(config.shipA.ewar).toBe(deps.ewar);
    expect(config.shipA.boosts).toBe(deps.boost);
    expect(config.shipA.missileBoosts).toBe(deps.missileBoost);
    expect(config.shipA.sensorBoosts).toBe(deps.sensorBoost);
    expect(deps.sensorBoosterController.projection).toHaveBeenCalledWith("shipA");
    expect(deps.sensorBoosterController.projection).toHaveBeenCalledWith("shipB");
    expect(config.shipB.id).toBe("shipB");
    expect(config.shipB.maxSpeed).toBe(250);
    expect(config.shipB.baseMaxSpeed).toBe(250);
    expect(config.shipB.aggressivity).toBe(1);
    expect(config.shipB.ewar).toBeUndefined();
    expect(config.shipB.boosts).toBeUndefined();
    expect(config.shipB.missileBoosts).toBeUndefined();
    expect(config.initialDistance).toBe(6000);
    expect(deps.shipASide.capture).toHaveBeenCalled();
    expect(deps.shipBSide.capture).toHaveBeenCalled();
    expect(deps.distanceSource.getInitialDistance).toHaveBeenCalled();
  });

  test("getConfig falls back to current speed when baseMaxSpeed is missing", () => {
    const deps = build();
    deps.shipASide.capture = vi.fn(() => ({ ...baseShipAState(), baseMaxSpeed: undefined }));
    const source = makeSource(deps);
    const config = source.getConfig();
    expect(config.shipA.baseMaxSpeed).toBe(400);
  });

  test("getConfig passes propulsionKind for an afterburner fitted hull", () => {
    const deps = build();
    deps.shipASide.capture = vi.fn(() => ({ ...baseShipAState(), fittedHull: fittedHull("afterburner") }));
    const source = makeSource(deps);
    const config = source.getConfig();
    expect(config.shipA.propulsionKind).toBe("afterburner");
  });

  test("getConfig passes propulsionKind for a microwarpdrive fitted hull", () => {
    const deps = build();
    deps.shipASide.capture = vi.fn(() => ({ ...baseShipAState(), fittedHull: fittedHull("microwarpdrive") }));
    const source = makeSource(deps);
    const config = source.getConfig();
    expect(config.shipA.propulsionKind).toBe("microwarpdrive");
  });

  test("getConfig leaves propulsionKind undefined when fittedHull is missing", () => {
    const deps = build();
    const source = makeSource(deps);
    const config = source.getConfig();
    expect(config.shipA.propulsionKind).toBeUndefined();
    expect(config.shipB.propulsionKind).toBeUndefined();
  });

  test("getEngineConfig assembles sim, weapons, defense, and overloaded", () => {
    const deps = build();
    const source = makeSource(deps);
    const engineConfig = source.getEngineConfig();
    expect(engineConfig.sim.initialDistance).toBe(6000);
    expect(engineConfig.sim.shipA.id).toBe("shipA");
    expect(engineConfig.weapons.shipA).toEqual([deps.turretSpec, deps.missileSpec]);
    expect(engineConfig.weapons.shipB).toEqual([deps.turretSpec, deps.missileSpec]);
    expect(engineConfig.defense.shipA).toBe(EMPTY_DEFENSE_SPEC);
    expect(engineConfig.defense.shipB).toBe(EMPTY_DEFENSE_SPEC);
    expect(engineConfig.defense.damageEnabled).toEqual({ shipA: true, shipB: true });
    expect(engineConfig.defense.repairMode).toEqual({ shipA: "auto", shipB: "auto" });
    expect(engineConfig.overloaded).toEqual({ shipA: true, shipB: true });
  });

  test("getEngineConfig carries capacitor spec, capacity multiplier, and composes the propulsion drain from the stats source", () => {
    const deps = build();
    const base = deps.shipASide.capture();
    const PROPULSION_MODULE = toTypeId("439");
    const statsWithRow: CapacitorStats = { spec: { capacity: 4375, rechargeTime: 656.25 }, peakRecharge: 16.67, rows: [{ moduleId: PROPULSION_MODULE, moduleName: "1MN Afterburner I", amount: 320, cycleTime: 10, perSecond: 32, count: 1 }], usagePerSecond: 32, weaponsPerSecond: 20, boosters: [] };
    deps.shipASide.capture = vi.fn(() => ({ ...base, capacitor: { capacity: 6375, rechargeTime: 1250 }, fittedHull: { ...fittedHull("afterburner"), propulsionId: "ab-1mn", propulsionModuleId: PROPULSION_MODULE }, propulsionCapacityMultiplier: 0.75 }));
    deps.capacitorStatsSource.stats = vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? statsWithRow : undefined));
    const engineConfig = makeSource(deps).getEngineConfig();
    expect(engineConfig.sim.shipA.capacitor).toEqual({ capacity: 6375, rechargeTime: 1250 });
    expect(engineConfig.sim.shipA.propulsionCapacityMultiplier).toBe(0.75);
    expect(engineConfig.sim.shipB.capacitor).toBeUndefined();
    expect(engineConfig.capacitor.shipA.propulsion).toEqual({ moduleId: PROPULSION_MODULE, amount: 320, interval: 10 });
    expect(engineConfig.capacitor.shipB.propulsion).toBeUndefined();
    expect(engineConfig.capacitor.shipA.fittedDrainPerSecond).toBe(32);
    expect(engineConfig.capacitor.shipA.weaponsDrainPerSecond).toBe(20);
    expect(engineConfig.capacitor.shipB.fittedDrainPerSecond).toBe(0);
    expect(engineConfig.capacitor.shipB.weaponsDrainPerSecond).toBe(0);
  });

  test("getEngineConfig omits the propulsion drain when the module is toggled off", () => {
    const deps = build();
    const base = deps.shipASide.capture();
    // Variant-selection memory: propulsionModuleId survives toggle-off (propulsionId cleared).
    deps.shipASide.capture = vi.fn(() => ({ ...base, fittedHull: { ...fittedHull("afterburner"), propulsionModuleId: toTypeId("439") } }));
    const engineConfig = makeSource(deps).getEngineConfig();
    expect(engineConfig.capacitor.shipA.propulsion).toBeUndefined();
  });

  test("getEngineConfig builds drains from active ewar and booster modules only", () => {
    const deps = build();
    const web: import("../../../sim").StasisWebSpec = { moduleName: "Web", moduleId: toTypeId("526"), maxRange: 10000, speedFactor: -0.5, overloadRangeBonusPercent: 0, capacitorNeed: 6, cycleTime: 5 };
    const painter: import("../../../sim").TargetPainterSpec = { moduleName: "Painter", moduleId: toTypeId("12709"), maxRange: 30000, falloff: 7500, signatureRadiusBonusPercent: 30, overloadStrengthBonusPercent: 0, capacitorNeed: 8, cycleTime: 5 };
    const computer: import("../../../sim").TrackingBoosterSpec = { moduleName: "Computer", moduleId: toTypeId("1978"), trackingBonusPercent: 15, optimalBonusPercent: 7.5, falloffBonusPercent: 15, defaultScript: undefined, capacitorNeed: 10, cycleTime: 10 };
    const sensor: import("../../../sim").SensorBoosterSpec = { moduleName: "Booster", moduleId: toTypeId("1952"), scanResolutionBonusPercent: 30, maxTargetRangeBonusPercent: 30, overloadStrengthBonusPercent: 15, defaultScript: undefined, capacitorNeed: 12, cycleTime: 10 };
    const ewar: EwarProjection = { loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], painters: [painter], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], }, activation: { webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: [], painters: [{ active: false, overloaded: false }], dampeners: [], neutralizers: [], nosferatu: [] } };
    const boost: TurretBoostProjection = { loadout: { computers: [computer], scripts: [] }, activation: { computers: [{ active: true, overloaded: false, script: undefined }] } };
    deps.ewarController.projection = vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? ewar : undefined));
    deps.boosterController.projection = vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? boost : undefined));
    deps.sensorBoosterController.projection = vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? { loadout: { boosters: [sensor], amplifiers: [], boosterScripts: [] }, activation: [{ active: false, overloaded: false, script: undefined }] } : undefined));
    const engineConfig = makeSource(deps).getEngineConfig();
    expect(engineConfig.capacitor.shipA.drains).toEqual([
      { moduleId: web.moduleId, amount: 6, interval: 5, active: true },
      { moduleId: painter.moduleId, amount: 8, interval: 5, active: false },
      { moduleId: computer.moduleId, amount: 10, interval: 10, active: true },
      { moduleId: sensor.moduleId, amount: 12, interval: 10, active: false },
    ]);
    expect(engineConfig.capacitor.shipB.drains).toEqual([]);
    expect(engineConfig.capacitor.shipA.fittedDrainPerSecond).toBe(0);
    expect(engineConfig.capacitor.shipA.boosters).toEqual([]);
    expect(engineConfig.capacitor.shipA.infinite).toBe(false);
  });

  test("getEngineConfig builds drains when activation is absent (defaults to active)", () => {
    const deps = build();
    const web: import("../../../sim").StasisWebSpec = { moduleName: "Web", moduleId: toTypeId("526"), maxRange: 10000, speedFactor: -0.5, overloadRangeBonusPercent: 0, capacitorNeed: 6, cycleTime: 5 };
    const ewar: EwarProjection = { loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], }, activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [] } };
    deps.ewarController.projection = vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? ewar : undefined));
    const engineConfig = makeSource(deps).getEngineConfig();
    expect(engineConfig.capacitor.shipA.drains).toEqual([{ moduleId: web.moduleId, amount: 6, interval: 5, active: true }]);
  });

  test("getEngineConfig drops drains for specs without capacitor data", () => {
    const deps = build();
    const computer: import("../../../sim").TrackingBoosterSpec = { moduleName: "Computer", moduleId: toTypeId("1978"), trackingBonusPercent: 15, optimalBonusPercent: 7.5, falloffBonusPercent: 15, defaultScript: undefined };
    const boost: TurretBoostProjection = { loadout: { computers: [computer], scripts: [] }, activation: { computers: [] } };
    deps.boosterController.projection = vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? boost : undefined));
    const engineConfig = makeSource(deps).getEngineConfig();
    expect(engineConfig.capacitor.shipA.drains).toEqual([]);
  });

  test("getEngineConfig builds a scheduled drain for each active neutralizer", () => {
    const deps = build();
    const neutralizer: import("../../../sim").EnergyNeutralizerSpec = { moduleName: "Neut", moduleId: toTypeId("12271"), amount: 600, cycleTime: 24, capacitorNeed: 500, maxRange: 20000, falloff: 10000 };
    const ewar: EwarProjection = { loadout: { ...EMPTY_EWAR_LOADOUT, neutralizers: [neutralizer] }, activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [{ active: true }], nosferatu: [] } };
    deps.ewarController.projection = vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? ewar : undefined));
    const engineConfig = makeSource(deps).getEngineConfig();
    expect(engineConfig.capacitor.shipA.drains).toEqual([{ moduleId: neutralizer.moduleId, amount: 500, interval: 24, active: true }]);
  });

  test("getConfig carries the side's energy warfare resistance percent into the combatant config", () => {
    const deps = build();
    deps.shipASide.capture = vi.fn(() => ({ ...baseShipAState(), energyWarfareResistancePercent: 25 }));
    expect(makeSource(deps).getConfig().shipA.energyWarfareResistancePercent).toBe(25);
  });

  test("getEngineConfig weapons reflect the active weapon system switch kind", () => {
    const deps = build();
    deps.weaponSystemSwitches.shipA.activeKind = vi.fn(() => "missile" as const);
    const source = makeSource(deps);
    const engineConfig = source.getEngineConfig();
    expect(engineConfig.weapons.shipA).toEqual([deps.missileSpec, deps.turretSpec]);
  });

  test("getConfig carries sigBloom and sigPenalty from state and defense spec", () => {
    const deps = build();
    deps.shipASide.capture = vi.fn(() => ({ ...baseShipAState(), sig: 36, sigBloomFactor: 5 }));
    deps.defenseController.spec = vi.fn(() => ({ ...EMPTY_DEFENSE_SPEC, signaturePenalty: 10 }));
    const source = makeSource(deps);
    const config = source.getConfig();
    expect(config.shipA.sig).toBe(36);
    expect(config.shipA.sigBloom).toBe(5);
    expect(config.shipA.sigPenalty).toBe(10);
  });

  test("getEngineConfig overloaded reflects skill conditions", () => {
    const deps = build();
    deps.shipBSide.skillConditions = vi.fn(() => ({ overloaded: false, skillLevel: 5 as const, weaponOverloaded: false, defenseSkills: undefined, targetingSkills: undefined }));
    const source = makeSource(deps);
    const engineConfig = source.getEngineConfig();
    expect(engineConfig.overloaded.shipA).toBe(true);
    expect(engineConfig.overloaded.shipB).toBe(false);
  });
});
