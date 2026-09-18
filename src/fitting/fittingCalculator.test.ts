import { _computeDroneControlRange, _resolveSensorStats } from "./fittingCalculator";
import type { HullBonus, FittingModuleStats, RigDrawback, RigDrawbackReduction } from "../gamedata/fittingDb";
import type { FittedModule } from "./fittingState";
import { toTypeId, type TypeId, type ShipId, type FactionId, type HullTypeId } from "../gamedata/ids";
import type { ShipProfile } from "../ships";

function fittedModule(moduleId: string): FittedModule {
  return { moduleId: toTypeId(moduleId), offline: false };
}

function modules(record: Record<string, Partial<FittingModuleStats>>): Readonly<Record<string, FittingModuleStats>> {
  const result: Record<string, FittingModuleStats> = {};
  for (const [id, stats] of Object.entries(record)) {
    result[id] = { ...stats, id: toTypeId(id), name: `Module ${id}` } as FittingModuleStats;
  }
  return result;
}

describe("_computeDroneControlRange", () => {
  test("base range is 20000 at skill level 0 with no modules", () => {
    expect(_computeDroneControlRange([], modules({}), 0)).toBe(20000);
  });

  test("skill level 5 adds 40000 (8000 per level)", () => {
    expect(_computeDroneControlRange([], modules({}), 5)).toBe(60000);
  });

  test("Drone Link Augmentor I adds 20000", () => {
    const mods: readonly FittedModule[] = [fittedModule("23527")];
    const db = modules({ "23527": { droneControlRangeBonus: 20000 } });
    expect(_computeDroneControlRange(mods, db, 5)).toBe(80000);
  });

  test("multiple Drone Link Augmentors stack additively", () => {
    const mods: readonly FittedModule[] = [fittedModule("23527"), fittedModule("24427")];
    const db = modules({ "23527": { droneControlRangeBonus: 20000 }, "24427": { droneControlRangeBonus: 24000 } });
    expect(_computeDroneControlRange(mods, db, 5)).toBe(104000);
  });

  test("modules without droneControlRangeBonus are ignored", () => {
    const mods: readonly FittedModule[] = [fittedModule("99999")];
    const db = modules({ "99999": {} });
    expect(_computeDroneControlRange(mods, db, 0)).toBe(20000);
  });
});

function sensorProfile(overrides: { maxTargetingRange?: number } = {}): ShipProfile {
  return {
    id: "29984" as ShipId,
    name: "Tengu",
    factionId: "caldari-state" as FactionId,
    hullTypeId: "963" as HullTypeId,
    mass: 5_200_000,
    inertiaModifier: 0.56,
    baseSpeed: 200,
    sigRadius: 150,
    scanResolution: 250,
    maxTargetingRange: overrides.maxTargetingRange ?? 50000,
    maxLockedTargets: 7,
    highSlots: 0,
    medSlots: 0,
    lowSlots: 0,
    rigSlots: 3,
    powerGrid: 1000,
    cpuOutput: 400,
    droneBandwidth: 0,
    droneCapacity: 0,
    maxActiveDrones: 0,
    shieldHp: 2600,
    shieldRechargeTime: 1250,
    armorHp: 2100,
    hullHp: 1700,
    capacitorCapacity: 900,
    capacitorRechargeTime: 750,
    shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    bonuses: [],
  };
}

function flatBonus(attribute: HullBonus["attribute"], magnitude: number): HullBonus {
  return { attribute, magnitude, scalesWithHullSkill: false, sourceId: toTypeId("45626") };
}

describe("_resolveSensorStats", () => {
  test("base sensor stats come from the profile at skill level 0", () => {
    const spec = _resolveSensorStats(sensorProfile(), [], undefined);
    expect(spec).toEqual({ scanResolution: 250, maxTargetingRange: 50000, maxLockedTargets: 7 });
  });

  test("subsystem flat targeting range adds to the base before skill multipliers", () => {
    const profile = sensorProfile();
    const withFlat = _resolveSensorStats(profile, [flatBonus("maxTargetingRangeFlat", 20000)], undefined);
    expect(withFlat.maxTargetingRange).toBe(70000);
    const withSkill = _resolveSensorStats(profile, [flatBonus("maxTargetingRangeFlat", 20000)], { longRangeTargeting: 4, signatureAnalysis: 0, targetManagement: 0, advancedTargetManagement: 0, sensorLinking: 0, signalSuppression: 0, frequencyModulation: 0 });
    expect(withSkill.maxTargetingRange).toBe(84000);
  });
});
