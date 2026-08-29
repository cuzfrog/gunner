import { join } from "path";
import type { PropulsionModule, ShipNameLanguage, ShipProfile, Ships, StatConditions } from "../ships";
import { toTypeId, type FactionId, type HullTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import type { DisruptionScriptSpec, StackingPenalty } from "../sim";
import { ChargeCatalogImpl } from "./chargeCatalog";
import { FittingImportImpl } from "./fittingImport";
import { GunFamiliesImpl } from "./gunFamilies";
import { MissileCatalogImpl } from "./missileCatalog";
import { MissileSkillModelImpl } from "./missileStats";
import { StaticItemNameCatalog, StaticItemNameResolver, type ItemNameCatalog, type ItemNameResolver } from "../gamedata/itemNames";
import {
  CHARGES,
  DISRUPTION_SCRIPTS,
  DRONES,
  FITTING_MODULES,
  HULL_BONUSES,
  LAUNCHERS,
  MISSILES,
  SCRIPTS,
  STASIS_GRAPPLERS,
  STASIS_WEBS,
  TRACKING_COMPUTERS,
  TRACKING_DISRUPTORS,
  TURRETS,
  WARP_SCRAMBLERS,
  type FittingDb,
} from "../gamedata/fittingDb";
import { MODULE_SLOTS_BY_NAME, MODULE_SLOT_CATALOG } from "../gamedata/moduleSlots";
import { moduleLines, parseEft, type EftDocument } from "./eft";
import { _detectionOrder } from "./fittingImport";

const OPTIMAL_RANGE_STAT = Object.values(DISRUPTION_SCRIPTS).find((s) => s.name === "Optimal Range Disruption Script")!;
const TRACKING_SPEED_STAT = Object.values(DISRUPTION_SCRIPTS).find((s) => s.name === "Tracking Speed Disruption Script")!;
const OPTIMAL_RANGE_SCRIPT: DisruptionScriptSpec = {
  name: OPTIMAL_RANGE_STAT.name,
  moduleId: OPTIMAL_RANGE_STAT.id,
  trackingMultiplier: 1 + OPTIMAL_RANGE_STAT.trackingDeltaBonus / 100,
  optimalMultiplier: 1 + OPTIMAL_RANGE_STAT.rangeDeltaBonus / 100,
  falloffMultiplier: 1 + OPTIMAL_RANGE_STAT.falloffDeltaBonus / 100,
};
const TRACKING_SPEED_SCRIPT: DisruptionScriptSpec = {
  name: TRACKING_SPEED_STAT.name,
  moduleId: TRACKING_SPEED_STAT.id,
  trackingMultiplier: 1 + TRACKING_SPEED_STAT.trackingDeltaBonus / 100,
  optimalMultiplier: 1 + TRACKING_SPEED_STAT.rangeDeltaBonus / 100,
  falloffMultiplier: 1 + TRACKING_SPEED_STAT.falloffDeltaBonus / 100,
};
const DISRUPTION_SCRIPT_CATALOG: readonly DisruptionScriptSpec[] = [OPTIMAL_RANGE_SCRIPT, TRACKING_SPEED_SCRIPT];

class TestStackingPenalty implements StackingPenalty {
  // Mirrors the sim StackingPenaltyImpl so fitting tests can assert expected
  // multipliers without instantiating the full sim module. Keep in sync.
  apply(multipliers: readonly number[]): number {
    const values = multipliers.filter((value) => value !== 1);
    const positive = values.filter((value) => value > 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));
    const negative = values.filter((value) => value < 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));

    let product = 1;
    for (const list of [positive, negative]) {
      for (let i = 0; i < list.length; i++) {
        const bonus = list[i];
        product *= 1 + (bonus - 1) * Math.exp(-(i * i) / 7.1289);
      }
    }
    return product;
  }
}

const stackingPenalty = new TestStackingPenalty();

class TestItemNames implements ItemNameCatalog {
  nameForId(id: TypeId, language: ShipNameLanguage): string {
    if (language === "zh") return `${id} (zh)`;
    if (language === "ja") return `${id} (ja)`;
    return String(id);
  }
}

const itemNameCatalog = new StaticItemNameCatalog();
const moduleSlotCatalog = MODULE_SLOT_CATALOG;
const testResolver: ItemNameResolver = { idsForName: (name: string, _language: ShipNameLanguage) => [name as TypeId] };
const fullResolver = new StaticItemNameResolver();

function row<T>(id: string, name: string, stats: T): T & { readonly id: TypeId; readonly name: string } {
  return { id: id as TypeId, name, ...stats };
}

const profile: ShipProfile = {
  id: "24696" as ShipId,
  name: "Harbinger",
  factionId: "amarr-empire" as FactionId,
  hullTypeId: "419" as HullTypeId,
  mass: 15_500_000,
  inertiaModifier: 0.45,
  baseSpeed: 165,
  sigRadius: 270,
};

const frigateProfile: ShipProfile = {
  id: "587" as ShipId,
  name: "Rifter",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "25" as HullTypeId,
  mass: 1_067_000,
  inertiaModifier: 3.2,
  baseSpeed: 365,
  sigRadius: 35,
};

const bonusProfile: ShipProfile = {
  id: "11999" as ShipId,
  name: "Vagabond",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "358" as HullTypeId,
  mass: 10_500_000,
  inertiaModifier: 0.5,
  baseSpeed: 205,
  sigRadius: 130,
};

const roleBonusProfile: ShipProfile = {
  id: "12015" as ShipId,
  name: "Muninn",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "358" as HullTypeId,
  mass: 10_800_000,
  inertiaModifier: 0.51,
  baseSpeed: 195,
  sigRadius: 135,
};

const abaddonProfile: ShipProfile = {
  id: "24692" as ShipId,
  name: "Abaddon",
  factionId: "amarr-empire" as FactionId,
  hullTypeId: "27" as HullTypeId,
  mass: 103_200_000,
  inertiaModifier: 0.14,
  baseSpeed: 89,
  sigRadius: 470,
};

const kestrelProfile: ShipProfile = {
  id: "602" as ShipId,
  name: "Kestrel",
  factionId: "caldari-state" as FactionId,
  hullTypeId: "25" as HullTypeId,
  mass: 1_210_000,
  inertiaModifier: 3.1,
  baseSpeed: 325,
  sigRadius: 38,
};

const propulsionModules: readonly PropulsionModule[] = [
  { id: "ab-1mn", kind: "afterburner", sizeTier: "small", label: "1MN Afterburner I", iconId: toTypeId("439"), defaultModuleId: toTypeId("439"), thrust: 1.5e6, massAddition: 500_000, speedBonus: 1.15, sigBloom: 0 },
  { id: "mwd-5mn", kind: "microwarpdrive", sizeTier: "small", label: "5MN MWD", iconId: toTypeId("434"), defaultModuleId: toTypeId("434"), thrust: 1.5e6, massAddition: 500_000, speedBonus: 5, sigBloom: 5 },
  { id: "ab-10mn", kind: "afterburner", sizeTier: "medium", label: "10MN AB", iconId: toTypeId("12056"), defaultModuleId: toTypeId("12056"), thrust: 15e6, massAddition: 5_000_000, speedBonus: 1.15, sigBloom: 0 },
  { id: "ab-100mn", kind: "afterburner", sizeTier: "large", label: "100MN AB", iconId: toTypeId("12066"), defaultModuleId: toTypeId("12066"), thrust: 150e6, massAddition: 50_000_000, speedBonus: 1.15, sigBloom: 0 },
];

const ships = vi.mocked<Ships>({
  hulls: vi.fn(),
  hullView: vi.fn(),
  findHull: vi.fn(),
  findHullById: vi.fn(),
  findHullByName: vi.fn(),
  parsePropulsionId: vi.fn(),
  fittingOptions: vi.fn(),
  allFittingOptions: vi.fn(),
  fittingOption: vi.fn(),
  turretSizeOptions: vi.fn(),
  shipTier: vi.fn(),
  fittedStats: vi.fn(),
  maxSpeedForFittedMass: vi.fn(),
  alignTime: vi.fn(),
} as unknown as Ships);

const db: FittingDb = {
  modules: {
    "1600mm Steel Plates II": row("1600mm Steel Plates II", "1600mm Steel Plates II", { massAddition: 3_750_000 }),
    "Reinforced Bulkheads II": row("Reinforced Bulkheads II", "Reinforced Bulkheads II", { agilityMultiplier: 1.05 }),
    "5MN Microwarpdrive I": row("5MN Microwarpdrive I", "5MN Microwarpdrive I", {
      propulsion: {
        kind: "microwarpdrive",
        sizeTier: "small",
        thrust: 1_500_000,
        speedBonus: 5,
        massAddition: 500_000,
        sigBloom: 5,
      },
    }),
    "100MN Y-S8 Compact Afterburner": row("100MN Y-S8 Compact Afterburner", "100MN Y-S8 Compact Afterburner", {
      propulsion: {
        kind: "afterburner",
        sizeTier: "large",
        thrust: 150_000_000,
        speedBonus: 1.25,
        massAddition: 50_000_000,
        sigBloom: 0,
      },
    }),
    "Inertial Stabilizers II": row("Inertial Stabilizers II", "Inertial Stabilizers II", { agilityMultiplier: 0.8, sigBonusPercent: 11 }),
    "Nanofiber Internal Structure II": row("Nanofiber Internal Structure II", "Nanofiber Internal Structure II", { speedBonusPercent: 9.5, agilityMultiplier: 0.8425 }),
    "Medium Shield Extender II": row("Medium Shield Extender II", "Medium Shield Extender II", { sigRadiusAdd: 7 }),
    "Medium Higgs Anchor I": row("Medium Higgs Anchor I", "Medium Higgs Anchor I", { massBonusPercentage: 100, agilityMultiplier: 0.45, speedBonusPercent: -75 }),
    "Overdrive Injector System II": row("Overdrive Injector System II", "Overdrive Injector System II", { speedBonusPercent: 12.5 }),
    "Medium Trimark Armor Pump II": row("Medium Trimark Armor Pump II", "Medium Trimark Armor Pump II", { agilityDrawbackPercent: 10 }),
    "Medium Core Defense Field Extender I": row("Medium Core Defense Field Extender I", "Medium Core Defense Field Extender I", { sigDrawbackPercent: 10 }),
    "Tracking Enhancer II": row("Tracking Enhancer II", "Tracking Enhancer II", { turretTrackingPercent: 9.5, turretOptimalPercent: 10, turretFalloffPercent: 20 }),
    "Caldari Navy Tracking Enhancer": row("Caldari Navy Tracking Enhancer", "Caldari Navy Tracking Enhancer", { turretTrackingPercent: 12, turretOptimalPercent: 7.5, turretFalloffPercent: 15 }),
    "Medium Energy Metastasis Adjuster II": row("Medium Energy Metastasis Adjuster II", "Medium Energy Metastasis Adjuster II", { turretTrackingPercent: 20 }),
  },
  turrets: {
    "Heavy Pulse Laser II": row("Heavy Pulse Laser II", "Heavy Pulse Laser II", { tracking: 26, optimal: 12_600, falloff: 5_000, chargeSize: 2, damageMultiplier: 3, cycleTime: 5, turretSkill: "Medium Energy Turret" }),
    "200mm AutoCannon II": row("200mm AutoCannon II", "200mm AutoCannon II", { tracking: 315, optimal: 1_200, falloff: 5_160, chargeSize: 1, damageMultiplier: 3, cycleTime: 5, turretSkill: "Small Projectile Turret" }),
  },
  charges: {
    "Conflagration M": row("Conflagration M", "Conflagration M", { trackingMultiplier: 0.7, rangeMultiplier: 0.5 }),
    "EMP S": row("EMP S", "EMP S", { rangeMultiplier: 0.5 }),
  },
  launchers: {},
  missiles: {},
  scripts: {
    "Tracking Speed Script": row("Tracking Speed Script", "Tracking Speed Script", { trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0 }),
    "Optimal Range Script": row("Optimal Range Script", "Optimal Range Script", { trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2 }),
  },
  stasisWebs: {},
  stasisGrapplers: {},
  trackingComputers: {},
  trackingDisruptors: {},
  warpScramblers: {},
  disruptionScripts: {},
  hullBonuses: {},
  drones: {},
};

const hullBonusDb: FittingDb = {
  ...db,
  hullBonuses: {
    [bonusProfile.id]: [
      { attribute: "maxVelocity", magnitude: 5, skill: "Minmatar Cruiser" },
      { attribute: "agility", magnitude: -4, skill: "Minmatar Cruiser" },
      { attribute: "turretTracking", magnitude: 10, skill: "Minmatar Cruiser", turretSkill: "Small Projectile Turret" },
      { attribute: "turretFalloff", magnitude: 10 },
      { attribute: "turretOptimal", magnitude: 25, turretSkill: "Medium Projectile Turret" },
    ],
    [roleBonusProfile.id]: [
      { attribute: "maxVelocity", magnitude: 50 },
      { attribute: "agility", magnitude: -5 },
    ],
  },
};

const gunFamilies = new GunFamiliesImpl({ fittingDb: db });

const chargeCatalog = new ChargeCatalogImpl({ fittingDb: db, gunFamilies });
const missileSkillModel = new MissileSkillModelImpl({ stackingPenalty });
const missileCatalog = new MissileCatalogImpl({ fittingDb: db, missileSkillModel });

const fullFittingDb: FittingDb = {
  modules: FITTING_MODULES,
  turrets: TURRETS,
  charges: CHARGES,
  launchers: LAUNCHERS,
  missiles: MISSILES,
  scripts: SCRIPTS,
  stasisWebs: STASIS_WEBS,
  stasisGrapplers: STASIS_GRAPPLERS,
  trackingComputers: TRACKING_COMPUTERS,
  trackingDisruptors: TRACKING_DISRUPTORS,
  warpScramblers: WARP_SCRAMBLERS,
  disruptionScripts: DISRUPTION_SCRIPTS,
  hullBonuses: HULL_BONUSES,
  drones: DRONES,
};
const fullGunFamilies = new GunFamiliesImpl({ fittingDb: fullFittingDb });
const fullChargeCatalog = new ChargeCatalogImpl({ fittingDb: fullFittingDb, gunFamilies: fullGunFamilies });
const fullMissileSkillModel = new MissileSkillModelImpl({ stackingPenalty });
const fullMissileCatalog = new MissileCatalogImpl({ fittingDb: fullFittingDb, missileSkillModel: fullMissileSkillModel });

const conditions: StatConditions = { skillLevel: 0, overloaded: false };

const skillConditions: StatConditions = { skillLevel: 4, overloaded: false };

function stackingPenaltyForTwo(first: number, second: number): number {
  const penalty = Math.exp(-1 / 7.1289);
  return first * (1 + (second - 1) * penalty);
}

describe("FittingImportImpl", () => {
  beforeEach(() => {
    ships.findHullByName.mockReturnValue(profile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
  });

  test("returns undefined for non-EFT text", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    expect(importer.importFitting("not a fitting", conditions)).toBeUndefined();
  });

  test("returns undefined when hull is unknown", () => {
    ships.findHullByName.mockReturnValue(undefined);
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    expect(importer.importFitting("[Unknown Hull, fit]\n5MN Microwarpdrive I", conditions)).toBeUndefined();
  });

  test("resolves hull and fitting name", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting("[Harbinger, Brawler]\n5MN Microwarpdrive I", conditions);
    expect(result).toBeDefined();
    expect(result!.profile).toBe(profile);
    expect(result!.fittingName).toBe("Brawler");
  });

  test("sums flat mass from plates without bulkhead item mass fallback", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Tank]\n1600mm Steel Plates II\nReinforced Bulkheads II`,
      conditions,
    );
    expect(result!.fitted.mass).toBe(profile.mass + 3_750_000);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(1.05, 6);
  });

  test("adds shield extender signature radius", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(`[Harbinger, Shieldy]\nMedium Shield Extender II`, conditions);
    expect(result!.fitted.sigRadiusAdd).toBe(7);
    expect(result!.fitted.sigMultiplier).toBe(1);
  });

  test("applies stacking penalty to two agility modules", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Agile]\nInertial Stabilizers II\nNanofiber Internal Structure II`,
      conditions,
    );
    const first = 0.8;
    const second = 0.8425;
    const expected = stackingPenaltyForTwo(first, second);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(expected, 6);
  });

  test("two inertial stabilizers apply stacking-penalized signature bonus", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Siggy]\nInertial Stabilizers II\nInertial Stabilizers II`,
      conditions,
    );
    const first = 1.11;
    const second = 1.11;
    const expected = stackingPenaltyForTwo(first, second);
    expect(result!.fitted.sigMultiplier).toBeCloseTo(expected, 6);
  });

  test("three trimarks stack-penalize agility drawback", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Armor]\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II`,
      conditions,
    );
    const expected = stackingPenalty.apply([1.1, 1.1, 1.1]);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(expected, 6);
    expect(result!.fitted.sigMultiplier).toBe(1);
  });

  test("shield extender rig multiplies signature by 1.1", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(`[Harbinger, Shield Rig]\nMedium Core Defense Field Extender I`, conditions);
    const expected = stackingPenalty.apply([1.1]);
    expect(result!.fitted.sigMultiplier).toBeCloseTo(expected, 6);
    expect(result!.fitted.inertiaMultiplier).toBe(1);
  });

  test("inertial stabilizer and trimarks share the same agility stacking chain", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Mixed]\nInertial Stabilizers II\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II`,
      conditions,
    );
    const expected = stackingPenalty.apply([0.8, 1.1, 1.1, 1.1]);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(expected, 6);
  });

  test("inertial stabilizer and shield rig share the same signature stacking chain", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Sig Rig]\nInertial Stabilizers II\nMedium Core Defense Field Extender I`,
      conditions,
    );
    const expected = stackingPenalty.apply([1.11, 1.1]);
    expect(result!.fitted.sigMultiplier).toBeCloseTo(expected, 6);
  });

  test("overdrive applies speed bonus percent", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(`[Harbinger, Kiter]\nOverdrive Injector System II`, conditions);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1.125, 6);
  });

  test("applies mass percentage bonuses with stacking penalty", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Heavy]\nMedium Higgs Anchor I\n1600mm Steel Plates II`,
      conditions,
    );
    expect(result!.fitted.mass).toBe(profile.mass + 3_750_000);
    expect(result!.fitted.massMultiplier).toBeCloseTo(2, 6);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(0.25, 6);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(0.45, 6);
  });

  test("maps exact propulsion to a generic propulsion id", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, AB]\n100MN Y-S8 Compact Afterburner`,
      conditions,
    );
    expect(result!.propulsion).toBeDefined();
    expect(result!.propulsion!.propulsionId).toBe("ab-100mn");
    expect(result!.propulsion!.propulsionModuleId).toBe("100MN Y-S8 Compact Afterburner" as TypeId);
    expect(result!.propulsion!.propulsionName).toBe("100MN Y-S8 Compact Afterburner");
    expect(result!.propulsion!.speedBonus).toBe(1.25);
    expect(result!.propulsion!.massAddition).toBe(50_000_000);
  });

  test("propulsionVariantNames returns matching module names and ids", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const mwd = propulsionModules.find((m) => m.id === "mwd-5mn")!;
    expect(importer.propulsionVariantNames(mwd)).toEqual([{ id: "5MN Microwarpdrive I" as TypeId, name: "5MN Microwarpdrive I" }]);
  });

  test("propulsionVariantNames returns an empty list when no variants match", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const ab10 = propulsionModules.find((m) => m.id === "ab-10mn")!;
    expect(importer.propulsionVariantNames(ab10)).toEqual([]);
  });

  test("propulsionStats returns stats for a named propulsion module", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    expect(importer.propulsionStats("5MN Microwarpdrive I")).toEqual({
      thrust: 1_500_000,
      speedBonus: 5,
      massAddition: 500_000,
      sigBloom: 5,
    });
    expect(importer.propulsionStats("100MN Y-S8 Compact Afterburner")).toEqual({
      thrust: 150_000_000,
      speedBonus: 1.25,
      massAddition: 50_000_000,
      sigBloom: 0,
    });
  });

  test("propulsionStats returns undefined for an unknown or non-propulsion module", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    expect(importer.propulsionStats("1600mm Steel Plates II")).toBeUndefined();
    expect(importer.propulsionStats("Unknown")).toBeUndefined();
  });

  test("propulsionStatsById returns stats for a known propulsion module id", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    expect(importer.propulsionStatsById("100MN Y-S8 Compact Afterburner" as TypeId)).toEqual({
      thrust: 150_000_000,
      speedBonus: 1.25,
      massAddition: 50_000_000,
      sigBloom: 0,
    });
    expect(importer.propulsionStatsById("1600mm Steel Plates II" as TypeId)).toBeUndefined();
  });

  test("skips unknown module names", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Mixed]\n1600mm Steel Plates II\nUnknown module that does not exist\nMedium Shield Extender II`,
      conditions,
    );
    expect(result!.fitted.mass).toBe(profile.mass + 3_750_000);
    expect(result!.fitted.sigRadiusAdd).toBe(7);
  });

  test("resolves the first turret and charge", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Conflagration M\nMedium Shield Extender II`,
      conditions,
    );
    expect(result!.turret).toBeDefined();
    expect(importer.itemNameForId(result!.turret!.moduleId, "en")).toBe("Heavy Pulse Laser II");
    expect(importer.itemNameForId(result!.turret!.chargeId, "en")).toBe("Conflagration M");
    expect(result!.turret!.chargeSize).toBe(2);
    expect(result!.turret!.optimal).toBe(12_600 * 0.5);
    expect(result!.turret!.falloff).toBe(5_000);
    expect(result!.turret!.sigResolutionClass).toBe("M");
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 125) / 40_000, 10);
    expect(result!.turret!.base.optimal).toBe(12_600);
    expect(result!.turret!.base.falloff).toBe(5_000);
    expect(result!.turret!.base.tracking).toBeCloseTo((26 * 125) / 40_000, 10);
  });

  test("turret skill level scales tracking, optimal and falloff", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Conflagration M`,
      skillConditions,
    );
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 1.2 * 125) / 40_000, 10);
    expect(result!.turret!.optimal).toBe(12_600 * 0.5 * 1.2);
    expect(result!.turret!.falloff).toBe(5_000 * 1.2);
  });

  test("turret without loaded charge selects the usual ammo", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II\nHeavy Pulse Laser II, Conflagration M`,
      conditions,
    );
    expect(importer.itemNameForId(result!.turret!.chargeId, "en")).toBe("Conflagration M");
    expect(result!.turret!.chargeSize).toBe(2);
    expect(result!.turret!.optimal).toBe(12_600 * 0.5);
    expect(result!.turret!.falloff).toBe(5_000);
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 125) / 40_000, 10);
    expect(result!.turret!.base.optimal).toBe(12_600);
    expect(result!.turret!.base.falloff).toBe(5_000);
    expect(result!.turret!.base.tracking).toBeCloseTo((26 * 125) / 40_000, 10);
  });

  test("unknown loaded charge is replaced by the usual ammo", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Mjolnir Rocket`,
      conditions,
    );
    expect(importer.itemNameForId(result!.turret!.chargeId, "en")).toBe("Conflagration M");
    expect(result!.turret!.optimal).toBe(12_600 * 0.5);
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 125) / 40_000, 10);
  });

  test("cargoCharges filters cargo to known charges in EFT order", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]
Heavy Pulse Laser II, Conflagration M
Mjolnir Rocket x400
EMP S x2000
Conflagration M x100`,
      conditions,
    );
    expect(result!.cargoCharges).toEqual([
      { id: "EMP S" as TypeId, quantity: 2000 },
      { id: "Conflagration M" as TypeId, quantity: 100 },
    ]);
  });

  test("three metastasis rigs stack-penalize tracking", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Rigs]
Heavy Pulse Laser II, Conflagration M
Medium Energy Metastasis Adjuster II
Medium Energy Metastasis Adjuster II
Medium Energy Metastasis Adjuster II`,
      conditions,
    );
    const trackingBonus = stackingPenalty.apply([1.2, 1.2, 1.2]);
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * trackingBonus * 125) / 40_000, 3);
    expect(result!.turret!.optimal).toBeCloseTo(12_600 * 0.5, 6);
    expect(result!.turret!.falloff).toBeCloseTo(5_000, 6);
  });

  test("two tracking enhancers and a rig share one stacking chain per attribute", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Tracking]
Heavy Pulse Laser II, Conflagration M
Tracking Enhancer II
Caldari Navy Tracking Enhancer
Medium Energy Metastasis Adjuster II`,
      conditions,
    );
    const trackingBonus = stackingPenalty.apply([1.2, 1.12, 1.095]);
    const optimalBonus = stackingPenalty.apply([1.075, 1.1]);
    const falloffBonus = stackingPenalty.apply([1.15, 1.2]);
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * trackingBonus * 125) / 40_000, 3);
    expect(result!.turret!.optimal).toBeCloseTo(12_600 * 0.5 * optimalBonus, 6);
    expect(result!.turret!.falloff).toBeCloseTo(5_000 * falloffBonus, 6);
  });

  test("offline turret line is skipped and a later online turret is resolved", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Offline]\nHeavy Pulse Laser II /OFFLINE\n200mm AutoCannon II, EMP S`,
      conditions,
    );
    expect(result!.turret).toBeDefined();
    expect(result!.turret!.sigResolutionClass).toBe("S");
  });

  test("all-offline propulsion is not applied", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Offline]\n100MN Y-S8 Compact Afterburner /OFFLINE\n5MN Microwarpdrive I /OFFLINE`,
      conditions,
    );
    expect(result!.propulsion).toBeUndefined();
  });

  test("maps small turret to S sig resolution class", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, AC]\n200mm AutoCannon II, EMP S`,
      conditions,
    );
    expect(result!.turret!.sigResolutionClass).toBe("S");
    expect(result!.turret!.tracking).toBe((315 * 40) / 40_000);
  });

  test("autocannon without a charge picks a projectile charge, not a hybrid charge", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Merlin, Autocannon]\n200mm AutoCannon I`,
      conditions,
    );
    expect(result!.turret).toBeDefined();
    expect(importer.itemNameForId(result!.turret!.chargeId, "en")).toBe("Republic Fleet EMP S");
  });

  test("skill-scaled hull velocity and agility bonuses apply", () => {
    ships.findHullByName.mockReturnValue(bonusProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: hullBonusDb, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting("[Vagabond, Bonuses]\n200mm AutoCannon II, EMP S", skillConditions);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1.2, 6);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(0.84, 6);
  });

  test("hull velocity and agility bonuses are flat without a skill", () => {
    ships.findHullByName.mockReturnValue(roleBonusProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: hullBonusDb, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting("[Muninn, Role]\n200mm AutoCannon II, EMP S", conditions);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1.5, 6);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(0.95, 6);
  });

  test("hull turret bonuses match turret skill and share the module stacking chain", () => {
    ships.findHullByName.mockReturnValue(bonusProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: hullBonusDb, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: testResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Vagabond, Turrets]
200mm AutoCannon II, EMP S
Tracking Enhancer II`,
      skillConditions,
    );
    const trackingBonus = stackingPenalty.apply([1.095, 1.4]);
    expect(result!.turret!.tracking).toBeCloseTo((315 * 1.2 * trackingBonus * 40) / 40_000, 6);
    const falloffBonus = stackingPenalty.apply([1.2, 1.1]);
    expect(result!.turret!.falloff).toBeCloseTo(5_160 * 1.2 * falloffBonus, 3);
    expect(result!.turret!.optimal).toBeCloseTo(1_200 * 0.5 * 1.2 * 1.1, 3);
  });

  test("resolves stasis webs and tracking disruptors with converted fractions and scripts", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Ewar]
Stasis Webifier II
Tracking Disruptor II, Optimal Range Disruption Script`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.webs).toEqual([
      expect.objectContaining({ moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }),
    ]);
    expect(result!.ewar.scripts).toEqual(DISRUPTION_SCRIPT_CATALOG);
    expect(result!.ewar.disruptors).toEqual([
      expect.objectContaining({
        moduleName: "Tracking Disruptor II",
        optimal: 48000,
        falloff: 24000,
        disruption: 0.1719,
        defaultScript: OPTIMAL_RANGE_SCRIPT,
        overloadStrengthBonusPercent: 20,
      }),
    ]);
  });

  test("ignores offline ewar and returns empty ewar loadout when none are fitted", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, No Ewar]
200mm AutoCannon I, Hail S
Stasis Webifier II/OFFLINE`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.webs).toEqual([]);
    expect(result!.ewar.grapplers).toEqual([]);
    expect(result!.ewar.disruptors).toEqual([]);
    expect(result!.ewar.scramblers).toEqual([]);
  });

  test("preserves duplicate ewar instances and mixed variants", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Duplicates]
200mm AutoCannon I, Hail S
Stasis Webifier II
Fleeting Compact Stasis Webifier
Tracking Disruptor II
Balmer Series Compact Tracking Disruptor I, Tracking Speed Disruption Script`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.webs.length).toBe(2);
    expect(result!.ewar.disruptors.length).toBe(2);
    expect(result!.ewar.disruptors[0].defaultScript).toBeUndefined();
    expect(result!.ewar.disruptors[1].defaultScript).toEqual(TRACKING_SPEED_SCRIPT);
    expect(result!.ewar.scripts).toEqual(DISRUPTION_SCRIPT_CATALOG);
  });

  test("tracking disruptor without a charge defaults to none", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Unscripted TD]
200mm AutoCannon I, Hail S
Tracking Disruptor II`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.disruptors).toEqual([
      expect.objectContaining({
        moduleName: "Tracking Disruptor II",
        optimal: 48000,
        falloff: 24000,
        disruption: 0.1719,
        defaultScript: undefined,
        overloadStrengthBonusPercent: 20,
      }),
    ]);
    expect(result!.ewar.scripts).toEqual(DISRUPTION_SCRIPT_CATALOG);
  });

  test("resolves warp scramblers and ignores long warp disruptors", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Scram]
Warp Scrambler II
Warp Disruptor II`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.scramblers).toEqual([
      expect.objectContaining({ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }),
    ]);
    expect(result!.ewar.webs).toEqual([]);
    expect(result!.ewar.grapplers).toEqual([]);
    expect(result!.ewar.disruptors).toEqual([]);
  });

  test("resolves heavy stasis grapplers with falloff and optimal overload", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Grappler]
200mm AutoCannon I, Hail S
Heavy Stasis Grappler I`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.grapplers).toEqual([
      expect.objectContaining({ moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 }),
    ]);
    expect(result!.ewar.webs).toEqual([]);
    expect(result!.ewar.disruptors).toEqual([]);
    expect(result!.ewar.scramblers).toEqual([]);
  });

  test("resolves a tracking computer and its default script", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Tc]
200mm AutoCannon I, Hail S
Tracking Computer I, Optimal Range Script`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.boosts.computers).toEqual([
      expect.objectContaining({ moduleName: "Tracking Computer I", trackingBonusPercent: 10, optimalBonusPercent: 5, falloffBonusPercent: 10, defaultScript: result!.boosts.scripts.find((s) => s.name === "Optimal Range Script") }),
    ]);
    expect(result!.boosts.scripts).toEqual([
      { name: "Optimal Range Script", moduleId: "28999" as TypeId, trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2 },
      { name: "Tracking Speed Script", moduleId: "29001" as TypeId, trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0 },
    ]);
  });

  test("ignores an offline tracking computer", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Tc]
200mm AutoCannon I, Hail S
Tracking Computer I/OFFLINE`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.boosts.computers).toEqual([]);
  });

  test("resolves a warp scrambler with a charge line", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, ScramCharge]
Warp Scrambler II, Gremlin K5`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.scramblers).toEqual([
      expect.objectContaining({ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }),
    ]);
    expect(result!.ewar.webs).toEqual([]);
    expect(result!.ewar.disruptors).toEqual([]);
  });

  test("imports a real preset and resolves cargo charges with drones before cargo", async () => {
    const path = join(import.meta.dir, "..", "..", "data", "ship-fittings", "Abaddon", "Pulse_Armor_Abaddon.txt");
    const text = await Bun.file(path).text();
    ships.findHullByName.mockReturnValue(abaddonProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(text, conditions);
    expect(result).toBeDefined();
    const names = result!.cargoCharges.map((charge) => importer.itemNameForId(charge.id, "en"));
    expect(names).toContain("Conflagration L");
    expect(names).toContain("Scorch L");
  });

  test("classifies charges in a first quantity block as cargo", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(RIFTER_EXTRA_CHARGE_IN_DRONE_BLOCK, conditions);
    expect(result).toBeDefined();
    const names = result!.cargoCharges.map((charge) => importer.itemNameForId(charge.id, "en"));
    expect(names).toEqual(["Hail S", "Republic Fleet EMP S"]);
  });

  test("classifies cargo before drones by item kind", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(RIFTER_DRONE_AFTER_CARGO, conditions);
    expect(result).toBeDefined();
    const names = result!.cargoCharges.map((charge) => importer.itemNameForId(charge.id, "en"));
    expect(names).toEqual(["Republic Fleet EMP S"]);
  });

  test("itemNameForId delegates to ItemNameCatalog", () => {
    const mock = new TestItemNames();
    const mockResolver: ItemNameResolver = { idsForName: (name: string) => [name as TypeId] };
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog: mock, itemNameResolver: mockResolver, moduleSlotCatalog });
    expect(importer.itemNameForId("X" as TypeId, "zh")).toBe("X (zh)");
    expect(importer.itemNameForId("X" as TypeId, "ja")).toBe("X (ja)");
    expect(importer.itemNameForId("X" as TypeId, "en")).toBe("X");
  });

  test("pure missile fit resolves launcher with count and charge", () => {
    ships.findHullByName.mockReturnValue(kestrelProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Kestrel, Missile]
Arbalest Compact Light Missile Launcher, Caldari Navy Inferno Light Missile
Arbalest Compact Light Missile Launcher, Caldari Navy Inferno Light Missile
Arbalest Compact Light Missile Launcher, Caldari Navy Inferno Light Missile
1MN Afterburner II`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.launcher).toBeDefined();
    expect(result!.launcher!.count).toBe(3);
    expect(result!.launcher!.name).toBe("Arbalest Compact Light Missile Launcher");
    expect(result!.launcher!.chargeName).toBe("Caldari Navy Inferno Light Missile");
    expect(result!.launcher!.damagePerMissile).toBeGreaterThan(0);
    expect(result!.launcher!.cycleTime).toBeGreaterThan(0);
    expect(result!.launcher!.explosionRadius).toBeGreaterThan(0);
    expect(result!.launcher!.maxVelocity).toBeGreaterThan(0);
    expect(result!.launcher!.flightTime).toBeGreaterThan(0);
    expect(result!.turret).toBeUndefined();
  });

  test("missile fit with skills applies damage and ROF bonuses", () => {
    ships.findHullByName.mockReturnValue(kestrelProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Kestrel, Missile]
Arbalest Compact Light Missile Launcher, Caldari Navy Inferno Light Missile
1MN Afterburner II`,
      skillConditions,
    );
    expect(result!.launcher).toBeDefined();
    const baseDamage = 95;
    const skillDamageMultiplier = 1 + 0.02 * 4;
    const hullDamagePercent = 5 * 4;
    const hullDamageMultiplier = stackingPenalty.apply([1 + hullDamagePercent / 100]);
    expect(result!.launcher!.damagePerMissile).toBeCloseTo(baseDamage * skillDamageMultiplier * hullDamageMultiplier, 4);
    const skillRofMultiplier = (1 - 0.02 * 4) * (1 - 0.03 * 4);
    expect(result!.launcher!.cycleTime).toBeCloseTo(13.6 * skillRofMultiplier, 4);
  });

  test("mixed fit resolves both turret and launcher", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Mixed]
200mm AutoCannon I, EMP S
Arbalest Compact Light Missile Launcher, Caldari Navy Inferno Light Missile
1MN Afterburner II`,
      conditions,
    );
    expect(result!.turret).toBeDefined();
    expect(result!.launcher).toBeDefined();
    expect(result!.launcher!.count).toBe(1);
  });

  test("gun-less drone boat resolves neither turret nor launcher", () => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Drones]
1MN Afterburner II
Stasis Webifier II`,
      conditions,
    );
    expect(result!.turret).toBeUndefined();
    expect(result!.launcher).toBeUndefined();
  });

  test("multiple launcher types picks the most numerous", () => {
    ships.findHullByName.mockReturnValue(kestrelProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Kestrel, Mixed Launchers]
Arbalest Compact Light Missile Launcher, Caldari Navy Inferno Light Missile
Arbalest Compact Light Missile Launcher, Caldari Navy Inferno Light Missile
'Arbalest' Rocket Launcher I, Caldari Navy Inferno Rocket
1MN Afterburner II`,
      conditions,
    );
    expect(result!.launcher).toBeDefined();
    expect(result!.launcher!.count).toBe(2);
    expect(result!.launcher!.name).toBe("Arbalest Compact Light Missile Launcher");
  });
});

const RIFTER_BRAWLER = `[Rifter, Brawler]
200mm AutoCannon I, Hail S
200mm AutoCannon I, Hail S
5MN Microwarpdrive I
400mm Steel Plates II
Inertial Stabilizers II
Small Trimark Armor Pump I
Small Projectile Ambit Extension I

Hobgoblin I x3

Hail S x1000
Republic Fleet EMP S x500
`;

const RIFTER_EXTRA_CHARGE_IN_DRONE_BLOCK = `[Rifter, Brawler]
200mm AutoCannon I, Hail S
5MN Microwarpdrive I

Hail S x1000

Republic Fleet EMP S x500
`;

const RIFTER_DRONE_AFTER_CARGO = `[Rifter, Brawler]
200mm AutoCannon I, Hail S
5MN Microwarpdrive I

Republic Fleet EMP S x500

Hobgoblin I x3
`;

const INVALID_TEXT = `not a fitting
some line`;

function summarizeDb(): FittingDb {
  return { modules: {}, turrets: {}, charges: CHARGES, launchers: {}, missiles: {}, scripts: {}, stasisWebs: {}, stasisGrapplers: {}, trackingComputers: {}, trackingDisruptors: {}, warpScramblers: {}, disruptionScripts: {}, hullBonuses: {}, drones: DRONES };
}

describe("FittingImportImpl.summarize", () => {
  beforeEach(() => {
    ships.findHullByName.mockReturnValue(frigateProfile);
  });

  test("parses hull and fitting names", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    expect(summary).toBeDefined();
    expect(summary!.hullName).toBe("Rifter");
    expect(summary!.fittingName).toBe("Brawler");
  });

  test("groups modules by slot in fixed order", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    expect(summary).toBeDefined();
    const kinds = summary!.sections.map((section) => section.kind);
    expect(kinds).toEqual(["high", "mid", "low", "rig", "cargo", "drones"]);
  });

  test("captures charges and ids on module rows", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    const high = summary!.sections.find((section) => section.kind === "high");
    expect(high!.rows[0].charge).toBe("Hail S");
    expect(high!.rows[0].chargeId).toBeDefined();
    expect(high!.rows[0].id).toBeDefined();
    expect(high!.rows[1].charge).toBe("Hail S");
    expect(high!.rows[1].chargeId).toBeDefined();
    expect(high!.rows[1].id).toBeDefined();
  });

  test("captures cargo quantities with resolved ids", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    const cargo = summary!.sections.find((section) => section.kind === "cargo");
    expect(cargo!.rows).toEqual([
      expect.objectContaining({ name: "Hail S", quantity: 1000 }),
      expect.objectContaining({ name: "Republic Fleet EMP S", quantity: 500 }),
    ]);
    expect(cargo!.rows[0].id).toBeDefined();
    expect(cargo!.rows[1].id).toBeDefined();
  });

  test("captures drone quantities with resolved ids", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    const drones = summary!.sections.find((section) => section.kind === "drones");
    expect(drones!.rows).toEqual([expect.objectContaining({ name: "Hobgoblin I", quantity: 3 })]);
    expect(drones!.rows[0].id).toBeDefined();
  });

  test("classifies cargo and drones by item kind regardless of position", () => {
    const text = `[Rifter, Mixed]
200mm AutoCannon I, Hail S
5MN Microwarpdrive I

Republic Fleet EMP S x500

Hobgoblin I x3
`;
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(text);
    const cargo = summary!.sections.find((section) => section.kind === "cargo");
    const drones = summary!.sections.find((section) => section.kind === "drones");
    expect(cargo!.rows).toEqual([expect.objectContaining({ name: "Republic Fleet EMP S", quantity: 500 })]);
    expect(drones!.rows).toEqual([expect.objectContaining({ name: "Hobgoblin I", quantity: 3 })]);
    expect(cargo!.rows[0].id).toBeDefined();
    expect(drones!.rows[0].id).toBeDefined();
  });

  test("places shield extenders in the mid section", async () => {
    const path = join(import.meta.dir, "..", "..", "data", "ship-fittings", "Widow", "Missile_Shield_Widow.txt");
    const text = await Bun.file(path).text();
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(text);
    const mid = summary!.sections.find((section) => section.kind === "mid");
    expect(mid).toBeDefined();
    const names = mid!.rows.map((row) => row.name);
    expect(names).toContain("Thukker Large Shield Extender");
  });

  test("renders empty slots and subsystem sections in order", () => {
    const text = `[Tengu, Subsystem]
[Empty High slot]
[Empty High slot]

Republic Fleet 10MN Afterburner

[Empty Low slot]

Tengu Defensive - Adaptive Shielding
[Empty Subsystem slot]
Tengu Engineering - Capacitor Regenerative Matrix

Hobgoblin II x5
`;
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(text);
    const kinds = summary!.sections.map((section) => section.kind);
    expect(kinds).toEqual(["high", "mid", "low", "subsystem", "drones"]);
    const high = summary!.sections.find((section) => section.kind === "high");
    expect(high!.rows[0]).toEqual({ name: "[Empty High slot]", empty: true });
    expect(high!.rows[1]).toEqual({ name: "[Empty High slot]", empty: true });
    const subsystem = summary!.sections.find((section) => section.kind === "subsystem");
    expect(subsystem!.rows.map((row) => row.name)).toEqual([
      "Tengu Defensive - Adaptive Shielding",
      "[Empty Subsystem slot]",
      "Tengu Engineering - Capacitor Regenerative Matrix",
    ]);
  });

  test("moves charge quantity items from the first quantity block to cargo", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_EXTRA_CHARGE_IN_DRONE_BLOCK);
    const kinds = summary!.sections.map((section) => section.kind);
    expect(kinds).toEqual(["high", "mid", "cargo"]);
    const cargo = summary!.sections.find((section) => section.kind === "cargo");
    expect(cargo!.rows).toEqual([
      expect.objectContaining({ name: "Hail S", quantity: 1000 }),
      expect.objectContaining({ name: "Republic Fleet EMP S", quantity: 500 }),
    ]);
    expect(cargo!.rows[0].id).toBeDefined();
    expect(cargo!.rows[1].id).toBeDefined();
  });

  test("returns undefined for unparseable text", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    expect(importer.summarize(INVALID_TEXT)).toBeUndefined();
  });

  test("places unknown module names in the block's intended bank", () => {
    const text = `[Rifter, Unknown]\nUnknown Module Name\n5MN Microwarpdrive I\n`;
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, missileCatalog, missileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(text);
    expect(summary!.sections).toHaveLength(2);
    expect(summary!.sections[0].kind).toBe("mid");
    expect(summary!.sections[1].kind).toBe("low");
  });

  test("fixture modules are all present in the generated slot map", () => {
    const parsed = parseEft(RIFTER_BRAWLER);
    for (const line of moduleLines(parsed!)) {
      expect(MODULE_SLOTS_BY_NAME[line.name]).toBeDefined();
    }
  });
});

describe("FittingImportImpl.canonicalEftText", () => {
  beforeEach(() => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
  });

  const RIFTER_DRONE_ONLY = `[Rifter, Drone Only]
200mm AutoCannon I, Hail S

Hobgoblin I x3`;

  const RIFTER_CARGO_ONLY = `[Rifter, Cargo Only]
200mm AutoCannon I, Hail S
Hail S x1000
Republic Fleet EMP S x500`;

  const RIFTER_UNKNOWN_DRONE = `[Rifter, Unknown Drone]
200mm AutoCannon I, Hail S

Unknown Drone I x3

Hail S x1000`;

  test("separates drone and cargo blocks with two blank lines", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(RIFTER_BRAWLER);
    expect(canonical).toBeDefined();
    const parts = canonical!.split("\n\n\n");
    expect(parts).toHaveLength(3);
    expect(parts[1]).toBe("Hobgoblin I x3");
    expect(parts[2]).toBe("Hail S x1000\nRepublic Fleet EMP S x500");
  });

  test("drone-only fit has no stray blank lines", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(RIFTER_DRONE_ONLY);
    expect(canonical).toBeDefined();
    const parts = canonical!.split("\n\n\n");
    expect(parts).toHaveLength(2);
    expect(parts[1]).toBe("Hobgoblin I x3");
  });

  test("cargo-only fit has no stray blank lines", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(RIFTER_CARGO_ONLY);
    expect(canonical).toBeDefined();
    const parts = canonical!.split("\n\n\n");
    expect(parts).toHaveLength(2);
    expect(parts[1]).toBe("Hail S x1000\nRepublic Fleet EMP S x500");
  });

  test("unrecognized drone name stays in the drone section", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(RIFTER_UNKNOWN_DRONE);
    expect(canonical).toBeDefined();
    const parts = canonical!.split("\n\n\n");
    expect(parts).toHaveLength(3);
    expect(parts[1]).toBe("Unknown Drone I x3");
    expect(parts[2]).toBe("Hail S x1000");
  });

  test("round-trip preserves the drone and cargo partition", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const original = parseEft(RIFTER_BRAWLER);
    const canonical = importer.canonicalEftText(RIFTER_BRAWLER);
    expect(canonical).toBeDefined();
    const reparsed = parseEft(canonical!);
    expect(reparsed!.drones).toEqual(original!.drones);
    expect(reparsed!.cargo).toEqual(original!.cargo);
  });

  test("moves a charge in the first quantity block to the cargo section", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(RIFTER_EXTRA_CHARGE_IN_DRONE_BLOCK);
    expect(canonical).toBeDefined();
    const parts = canonical!.split("\n\n\n");
    expect(parts).toHaveLength(2);
    expect(parts[1]).toBe("Hail S x1000\nRepublic Fleet EMP S x500");
  });

  test("moves a drone in the second quantity block to the drone section", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(RIFTER_DRONE_AFTER_CARGO);
    expect(canonical).toBeDefined();
    const parts = canonical!.split("\n\n\n");
    expect(parts).toHaveLength(3);
    expect(parts[1]).toBe("Hobgoblin I x3");
    expect(parts[2]).toBe("Republic Fleet EMP S x500");
  });

  test("adds one blank line between the header and the first module bank", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(`[Rifter, Header]\n200mm AutoCannon I, Hail S\n`);
    expect(canonical).toBe(`[Rifter, Header]\n\n200mm AutoCannon I, Hail S`);
  });
});

describe("FittingImportImpl localization", () => {
  const RIFTER_BRAWLER_ZH = `[裂谷级, Brawler]
200mm自动加农炮 I, 冰雹 S
200mm自动加农炮 I, 冰雹 S
5MN微型跃迁推进器 I
400mm钢附甲板 II
惯性稳定器 II
小型三角装甲聚合器 I
小型射弹武器范围扩大装置 I

地精灵 I x3

冰雹 S x1000
共和舰队电磁脉冲弹 S x500
`;

  const RIFTER_BRAWLER_JA = `[リフター, Brawler]
200mmオートキャノンI, ヘイル弾S
200mmオートキャノンI, ヘイル弾S
5MNマイクロワープドライブI
400mm スチールプレートII
慣性スタビライザーII
小型トライマークアーマーポンプI
小型プロジェクタイルアンビットエクステンションI

ホブゴブリンI x3

ヘイル弾S x1000
共和国海軍仕様EMP弾S x500
`;

  const conditions: StatConditions = { skillLevel: 5, overloaded: true };

  beforeEach(() => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
  });

  test("imports a Chinese EFT to the same canonical result as English", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const english = importer.importFitting(RIFTER_BRAWLER, conditions);
    const chinese = importer.importFitting(RIFTER_BRAWLER_ZH, conditions);
    expect(chinese).toBeDefined();
    expect(english?.turret?.chargeId).toBe(chinese?.turret?.chargeId);
    expect(english?.cargoCharges.map((c) => c.id)).toEqual(chinese?.cargoCharges.map((c) => c.id));
    expect(english?.fitted.mass).toBe(chinese?.fitted.mass);
  });

  test("imports a Japanese EFT to the same canonical result as English", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const english = importer.importFitting(RIFTER_BRAWLER, conditions);
    const japanese = importer.importFitting(RIFTER_BRAWLER_JA, conditions);
    expect(japanese).toBeDefined();
    expect(english?.turret?.chargeId).toBe(japanese?.turret?.chargeId);
    expect(english?.cargoCharges.map((c) => c.id)).toEqual(japanese?.cargoCharges.map((c) => c.id));
    expect(english?.fitted.mass).toBe(japanese?.fitted.mass);
  });

  test("summarize canonicalizes localized item names to English and resolves ids", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER_ZH);
    expect(summary).toBeDefined();
    const high = summary!.sections.find((section) => section.kind === "high");
    expect(high!.rows[0].name).toBe("200mm AutoCannon I");
    expect(high!.rows[0].id).toBeDefined();
    expect(high!.rows[0].charge).toBe("Hail S");
    expect(high!.rows[0].chargeId).toBeDefined();
    const drones = summary!.sections.find((section) => section.kind === "drones");
    expect(drones!.rows[0].name).toBe("Hobgoblin I");
    expect(drones!.rows[0].id).toBeDefined();
  });

  test("canonicalEftText produces English-only EFT from localized input", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(RIFTER_BRAWLER_ZH);
    expect(canonical).toBeDefined();
    expect(canonical).not.toContain("200mm自动加农炮 I");
    expect(canonical).toContain("200mm AutoCannon I");
    expect(canonical).toContain("Hail S");
    expect(canonical).toContain("Hobgoblin I");
  });

  test("canonicalEftText preserves fitting name and unknown or mixed names", () => {
    const text = `[裂谷级, Brawler]
200mm自动加农炮 I, 冰雹 S
Unknown Custom Module I
5MN微型跃迁推进器 I
`;
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, missileCatalog: fullMissileCatalog, missileSkillModel: fullMissileSkillModel, stackingPenalty, itemNameCatalog, itemNameResolver: fullResolver, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(text);
    expect(canonical).toBeDefined();
    expect(canonical).toContain("Brawler");
    expect(canonical).toContain("Unknown Custom Module I");
    expect(canonical).toContain("5MN Microwarpdrive I");
  });
});

describe("FittingImportImpl identity resolution", () => {
  const importer = new FittingImportImpl({
    ships,
    fittingDb: fullFittingDb,
    chargeCatalog: fullChargeCatalog,
    missileCatalog: fullMissileCatalog,
    missileSkillModel: fullMissileSkillModel,
    stackingPenalty,
    itemNameCatalog,
    itemNameResolver: fullResolver,
    moduleSlotCatalog,
  });

  beforeEach(() => {
    ships.findHullByName.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
  });

  test("attaches an identity id to a non-db damage mod in the low bank", () => {
    const summary = importer.summarize(`[Rifter, Damage Mod]\nMagnetic Field Stabilizer II\n`);
    expect(summary).toBeDefined();
    const low = summary!.sections.find((section) => section.kind === "low");
    expect(low).toBeDefined();
    expect(low!.rows).toHaveLength(1);
    expect(low!.rows[0]).toEqual({ name: "Magnetic Field Stabilizer II", id: toTypeId("10190") });
  });

  test("attaches identity ids to a non-db launcher and its faction charge", () => {
    const summary = importer.summarize(`[Rifter, Faction]\nCaldari Navy Rocket Launcher, Caldari Navy Inferno Rocket\n`);
    expect(summary).toBeDefined();
    const low = summary!.sections.find((section) => section.kind === "low");
    expect(low).toBeDefined();
    const row = low!.rows.find((r) => r.name === "Caldari Navy Rocket Launcher");
    expect(row).toBeDefined();
    expect(row!.id).toBe(toTypeId("16065"));
    expect(row!.chargeId).toBe(toTypeId("27315"));
    expect(row!.charge).toBe("Caldari Navy Inferno Rocket");
  });

  test("attaches an identity id to a cargo item that is neither drone nor charge role", () => {
    const summary = importer.summarize(`[Rifter, Cargo]\n200mm AutoCannon I, Hail S\nNanite Repair Paste x5\n`);
    expect(summary).toBeDefined();
    const cargo = summary!.sections.find((section) => section.kind === "cargo");
    expect(cargo).toBeDefined();
    expect(cargo!.rows).toContainEqual({ name: "Nanite Repair Paste", id: toTypeId("28668"), quantity: 5 });
  });

  test("leaves a fully unknown name id-less without throwing", () => {
    const summary = importer.summarize(`[Rifter, Unknown]\nZor's Custom Hyperblaster\n`);
    expect(summary).toBeDefined();
    const row = summary!.sections.flatMap((section) => section.rows).find((r) => r.name === "Zor's Custom Hyperblaster");
    expect(row).toBeDefined();
    expect(row!.id).toBeUndefined();
  });

  test("stats aggregation is unaffected by an identity-only damage mod", () => {
    const without = importer.importFitting(`[Rifter, Stats]\n200mm AutoCannon I, Hail S\n`, conditions);
    const withDamageMod = importer.importFitting(`[Rifter, Stats]\n200mm AutoCannon I, Hail S\nMagnetic Field Stabilizer II\n`, conditions);
    expect(withDamageMod).toBeDefined();
    expect(without).toBeDefined();
    expect(withDamageMod).toEqual(without);
  });

  test("a db turret keeps a charge identity even when the charge is not in db.charges", () => {
    const summary = importer.summarize(`[Rifter, Mixed]\nHeavy Pulse Laser II, Caldari Navy Inferno Rocket\n`);
    expect(summary).toBeDefined();
    const row = summary!.sections.flatMap((section) => section.rows).find((r) => r.name === "Heavy Pulse Laser II");
    expect(row).toBeDefined();
    expect(row!.id).toBe(toTypeId("3520"));
    expect(row!.chargeId).toBe(toTypeId("27315"));
  });

  test("canonicalEftText preserves a non-db charge name on a db turret line", () => {
    const canonical = importer.canonicalEftText(`[Rifter, Mixed]\nHeavy Pulse Laser II, Caldari Navy Inferno Rocket\n`);
    expect(canonical).toBe(`[Rifter, Mixed]\n\nHeavy Pulse Laser II, Caldari Navy Inferno Rocket`);
  });

  test("canonicalEftText is stable under repeated canonicalization", () => {
    const text = `[Rifter, Brawler]\n200mm AutoCannon I, Hail S\nMagnetic Field Stabilizer II\n\nHobgoblin I x3\nHail S x100`;
    const once = importer.canonicalEftText(text);
    const twice = importer.canonicalEftText(once!);
    expect(twice).toBe(once);
  });

  test("canonicalEftText is stable for a fitting using an aliased legacy name", () => {
    const text = `[Rifter, Legacy]\nAdaptive Invulnerability Field II\n\nHobgoblin I x3`;
    const once = importer.canonicalEftText(text);
    expect(once).toBeDefined();
    const twice = importer.canonicalEftText(once!);
    expect(twice).toBe(once);
  });
});

function eftDocument(hullName: string, names: readonly string[] = []): EftDocument {
  const lines = names.map((name) => ({ kind: "module" as const, name, offline: false }));
  return { hullName, fittingName: "Test", banks: [{ bank: "low" as const, lines }], drones: [], cargo: [] };
}

describe("_detectionOrder", () => {
  test("latin-only names return en first", () => {
    expect(_detectionOrder(eftDocument("Rifter", ["200mm AutoCannon I"]))).toEqual(["en", "zh", "ja"]);
  });

  test("kana anywhere in the document returns ja first", () => {
    expect(_detectionOrder(eftDocument("リフター"))).toEqual(["ja", "zh", "en"]);
    expect(_detectionOrder(eftDocument("Rifter", ["200mm AC", "リフター"]))).toEqual(["ja", "zh", "en"]);
  });

  test("Han ideographs without kana return zh first", () => {
    expect(_detectionOrder(eftDocument("裂谷级"))).toEqual(["zh", "ja", "en"]);
    expect(_detectionOrder(eftDocument("Rifter", ["裂谷级"]))).toEqual(["zh", "ja", "en"]);
  });

  test("mixed kana and Han gives ja first", () => {
    expect(_detectionOrder(eftDocument("裂谷级", ["リフター"]))).toEqual(["ja", "zh", "en"]);
  });

  test("fitting name is excluded from language detection", () => {
    expect(_detectionOrder({ ...eftDocument("Rifter"), fittingName: "裂谷级" })).toEqual(["en", "zh", "ja"]);
    expect(_detectionOrder({ ...eftDocument("Rifter"), fittingName: "リフター" })).toEqual(["en", "zh", "ja"]);
  });
});
