import { type CapacitorDrainSources, type CapacitorStats, type FittingImport, type ImportedFitting } from "../../../fitting";
import type { BoostLoadout, EwarLoadout, TurretSpec } from "../../../sim";
import { toTypeId } from "../../../gamedata/ids";
import type { SidePanelState } from "../sidePanel";
import type { UiEvents } from "../../events";
import { CapacitorStatsSourceImpl } from "./capacitorStatsSource";

const STATS: CapacitorStats = { spec: { capacity: 4375, rechargeTime: 656.25 }, peakRecharge: 16.67, rows: [], usagePerSecond: 0, boosters: [] };

const EWAR_MODULE = toTypeId("12271");
const PROPULSION_MODULE = toTypeId("439");

function importedFitting(): ImportedFitting {
  return {
    profile: { id: "621" as never, name: "Harbinger" } as unknown as ImportedFitting["profile"],
    fittingName: "Brawler",
    fitted: {},
    fittingState: {} as never,
    propulsion: { thrust: 1, speedBonus: 1.15, massAddition: 0, sigBloom: 0, capacitorNeed: 32, propulsionId: "ab-1mn", propulsionModuleId: PROPULSION_MODULE },
    turrets: [],
    drones: [],
    cargoCharges: [],
    ewar: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [] },
    energyWarfareResistancePercent: 0,
    boosts: { computers: [], scripts: [] },
    missileBoosts: { launchers: [], scripts: [] },
    sensorSpec: { scanResolution: 200, targetingRange: 30000, maxLockedTargets: 4 },
    sensorBoosts: { boosters: [], amplifiers: [] },
    hullBonuses: [],
    defense: {},
    capacitor: STATS,
  } as unknown as ImportedFitting;
}

function ewarLoadout(webs: number): EwarLoadout {
  const web = { moduleName: "Stasis Webifier II", moduleId: EWAR_MODULE, maxRange: 10000, speedFactor: -0.6, overloadRangeBonusPercent: 0, capacitorNeed: 6, cycleTime: 5 };
  return { webs: Array.from({ length: webs }, () => web), grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [] };
}

function emptyBoost(): BoostLoadout {
  return { computers: [], scripts: [] };
}

function panelState(fittedHull: SidePanelState["fittedHull"]): SidePanelState {
  return {
    speed: 400, baseMaxSpeed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, aggressivity: 1.5,
    skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined,
    fitting: undefined, overrides: {}, fittedHull, sig: undefined, defenseSkills: undefined,
  };
}

const TURRET_SPEC: TurretSpec = { kind: "turret", moduleId: toTypeId("28"), tracking: 0.03, sigResolution: 40, optimal: 9000, falloff: 6000, damagePerShot: { em: 12, thermal: 8, kinetic: 0, explosive: 0 }, cycleTime: 3, turretCount: 2, capacitorNeed: 7 };

function build(overriddenImport?: Partial<ImportedFitting>) {
  const listeners: { fittingImported: (side: "shipA" | "shipB", imported: ImportedFitting) => void }[] = [];
  const events = {
    onFittingImported: vi.fn((listener: (side: "shipA" | "shipB", imported: ImportedFitting) => void) => { listeners.push({ fittingImported: listener }); }),
  } as unknown as UiEvents;
  const imported = overriddenImport ? { ...importedFitting(), ...overriddenImport } : importedFitting();
  const fittingImport = { resolveCapacitorStats: vi.fn(() => STATS) } as unknown as FittingImport & { resolveCapacitorStats: ReturnType<typeof vi.fn> };
  const shipASide = { capture: vi.fn(() => panelState({ propulsionId: "ab-1mn", propulsionModuleId: PROPULSION_MODULE } as never)), skillConditions: vi.fn(() => ({ skillLevel: 5 as const, overloaded: false, weaponOverloaded: false })) };
  const shipBSide = { capture: vi.fn(() => panelState(undefined)), skillConditions: vi.fn(() => ({ skillLevel: 5 as const, overloaded: false, weaponOverloaded: false })) };
  const ewarController = { projection: vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? { loadout: ewarLoadout(2), activation: undefined } : undefined)) };
  const boosterController = { projection: vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? { loadout: emptyBoost(), activation: undefined } : undefined)) };
  const missileBoosterController = { projection: vi.fn((_side: "shipA" | "shipB") => undefined) };
  const sensorBoosterController = { projection: vi.fn((_side: "shipA" | "shipB") => undefined) };
  const turretControllers = { shipA: { currentTurretSpecs: vi.fn(() => [TURRET_SPEC]) }, shipB: { currentTurretSpecs: vi.fn(() => []) } };
  const source = new CapacitorStatsSourceImpl({
    events, fittingImport,
    sides: { shipA: shipASide, shipB: shipBSide },
    ewarController, boosterController, missileBoosterController, sensorBoosterController,
    turretControllers,
  } as never);
  return { source, listeners, fittingImport, shipASide, ewarController, boosterController, missileBoosterController, sensorBoosterController, turretControllers, imported };
}

describe("capacitorStatsSource", () => {
  test("stats returns undefined before a fitting is registered", () => {
    const { source } = build();
    expect(source.stats("shipA")).toBeUndefined();
  });

  test("stats re-resolves from the imported skeleton with live projections and propulsion", () => {
    const { source, listeners, fittingImport, shipASide, ewarController, boosterController, imported } = build();
    listeners[0]?.fittingImported("shipA", imported);
    const result = source.stats("shipA");
    expect(result).toBe(STATS);
    expect(fittingImport.resolveCapacitorStats).toHaveBeenCalledTimes(1);
    const [fittingArg, conditionsArg, sourcesArg] = fittingImport.resolveCapacitorStats.mock.calls[0] as unknown as [ImportedFitting, { skillLevel: number }, CapacitorDrainSources];
    expect(fittingArg).toBe(imported);
    expect(conditionsArg.skillLevel).toBe(5);
    expect(sourcesArg.defense).toBe(imported.defense);
    expect(sourcesArg.turretDrains).toEqual([{ moduleId: TURRET_SPEC.moduleId, capacitorNeed: 7, cycleTime: 3, count: 2 }]);
    expect(sourcesArg.ewar.webs).toHaveLength(2);
    expect(sourcesArg.boosts).toEqual(emptyBoost());
    expect(sourcesArg.propulsionModuleId).toBe(PROPULSION_MODULE);
    expect(shipASide.capture).toHaveBeenCalled();
    expect(ewarController.projection).toHaveBeenCalledWith("shipA");
  });

  test("loadout projection fallback is the imported loadout", () => {
    const { source, listeners, fittingImport, imported } = build();
    listeners[0]?.fittingImported("shipA", imported);
    source.register("shipB", imported);
    fittingImport.resolveCapacitorStats.mockClear();
    source.stats("shipB");
    const [, , sourcesArg] = fittingImport.resolveCapacitorStats.mock.calls[0] as unknown as [ImportedFitting, unknown, CapacitorDrainSources];
    expect(sourcesArg.ewar).toBe(imported.ewar);
    expect(sourcesArg.missileBoosts).toBe(imported.missileBoosts);
    expect(sourcesArg.sensorBoosts).toBe(imported.sensorBoosts);
  });

  test("propulsion module id follows the live fitted hull, not the import", () => {
    const { source, listeners, fittingImport, shipASide, imported } = build();
    listeners[0]?.fittingImported("shipA", imported);
    shipASide.capture.mockReturnValue(panelState(undefined));
    source.stats("shipA");
    const [, , sourcesArg] = fittingImport.resolveCapacitorStats.mock.calls[0] as unknown as [ImportedFitting, unknown, CapacitorDrainSources];
    expect(sourcesArg.propulsionModuleId).toBeUndefined();
  });

  test("toggle-off variant memory does not compose a propulsion drain", () => {
    const { source, listeners, fittingImport, shipASide, imported } = build();
    listeners[0]?.fittingImported("shipA", imported);
    shipASide.capture.mockReturnValue(panelState({ propulsionModuleId: PROPULSION_MODULE } as never));
    source.stats("shipA");
    const [, , sourcesArg] = fittingImport.resolveCapacitorStats.mock.calls[0] as unknown as [ImportedFitting, unknown, CapacitorDrainSources];
    expect(sourcesArg.propulsionModuleId).toBeUndefined();
  });

  test("turret drains follow the live turret controller specs", () => {
    const { source, listeners, fittingImport, imported, turretControllers } = build();
    listeners[0]?.fittingImported("shipA", imported);
    source.stats("shipA");
    expect(turretControllers.shipA.currentTurretSpecs).toHaveBeenCalled();
    turretControllers.shipA.currentTurretSpecs.mockReturnValue([]);
    fittingImport.resolveCapacitorStats.mockClear();
    source.stats("shipA");
    const [, , sourcesArg] = fittingImport.resolveCapacitorStats.mock.calls[0] as unknown as [ImportedFitting, unknown, CapacitorDrainSources];
    expect(sourcesArg.turretDrains).toEqual([]);
  });

  test("register overwrites the skeleton for re-import and restore", () => {
    const { source, fittingImport, imported } = build();
    const reimported = { ...imported, fittingName: "After" } as ImportedFitting;
    source.register("shipA", reimported);
    source.stats("shipA");
    const [fittingArg] = fittingImport.resolveCapacitorStats.mock.calls[0] as unknown as [ImportedFitting, unknown, CapacitorDrainSources];
    expect(fittingArg.fittingName).toBe("After");
  });
});
