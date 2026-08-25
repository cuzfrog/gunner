import { join } from "path";
import type { PropulsionModule, ShipNameLanguage, ShipProfile, Ships, StatConditions } from "../ships";
import type { DisruptionScriptSpec, StackingPenalty } from "../sim";
import { ChargeCatalogImpl } from "./chargeCatalog";
import { FittingImportImpl } from "./fittingImport";
import { GunFamiliesImpl } from "./gunFamilies";
import { StaticItemNameCatalog, type ItemNameCatalog } from "../gamedata/itemNames";
import {
  CHARGES,
  DISRUPTION_SCRIPTS,
  DRONES,
  FITTING_MODULES,
  HULL_BONUSES,
  SCRIPTS,
  STASIS_GRAPPLERS,
  STASIS_WEBS,
  TRACKING_COMPUTERS,
  TRACKING_DISRUPTORS,
  TURRETS,
  WARP_SCRAMBLERS,
  type FittingDb,
} from "../gamedata/fittingDb";
import { MODULE_SLOTS, MODULE_SLOT_CATALOG } from "../gamedata/moduleSlots";
import { moduleLines, parseEft } from "./eft";

const OPTIMAL_RANGE_SCRIPT: DisruptionScriptSpec = {
  name: "Optimal Range Disruption Script",
  trackingMultiplier: 1 + DISRUPTION_SCRIPTS["Optimal Range Disruption Script"].trackingDeltaBonus / 100,
  optimalMultiplier: 1 + DISRUPTION_SCRIPTS["Optimal Range Disruption Script"].rangeDeltaBonus / 100,
  falloffMultiplier: 1 + DISRUPTION_SCRIPTS["Optimal Range Disruption Script"].falloffDeltaBonus / 100,
};
const TRACKING_SPEED_SCRIPT: DisruptionScriptSpec = {
  name: "Tracking Speed Disruption Script",
  trackingMultiplier: 1 + DISRUPTION_SCRIPTS["Tracking Speed Disruption Script"].trackingDeltaBonus / 100,
  optimalMultiplier: 1 + DISRUPTION_SCRIPTS["Tracking Speed Disruption Script"].rangeDeltaBonus / 100,
  falloffMultiplier: 1 + DISRUPTION_SCRIPTS["Tracking Speed Disruption Script"].falloffDeltaBonus / 100,
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
  name(name: string, language: ShipNameLanguage): string {
    if (language === "zh") return `${name} (zh)`;
    if (language === "ja") return `${name} (ja)`;
    return name;
  }

  canonicalName(name: string): string {
    return name.replace(" (zh)", "").replace(" (ja)", "");
  }

  ensureLanguage(_language: ShipNameLanguage): Promise<void> {
    return Promise.resolve();
  }
}

const itemNameCatalog = new StaticItemNameCatalog();
const moduleSlotCatalog = MODULE_SLOT_CATALOG;

const profile: ShipProfile = {
  name: "Harbinger",
  faction: "Amarr Empire",
  hullType: "Standard Battlecruisers",
  mass: 15_500_000,
  inertiaModifier: 0.45,
  baseSpeed: 165,
  sigRadius: 270,
};

const frigateProfile: ShipProfile = {
  name: "Rifter",
  faction: "Minmatar Republic",
  hullType: "Standard Frigates",
  mass: 1_067_000,
  inertiaModifier: 3.2,
  baseSpeed: 365,
  sigRadius: 35,
};

const bonusProfile: ShipProfile = {
  name: "Vagabond",
  faction: "Minmatar Republic",
  hullType: "Heavy Assault Cruisers",
  mass: 10_500_000,
  inertiaModifier: 0.5,
  baseSpeed: 205,
  sigRadius: 130,
};

const roleBonusProfile: ShipProfile = {
  name: "Muninn",
  faction: "Minmatar Republic",
  hullType: "Heavy Assault Cruisers",
  mass: 10_800_000,
  inertiaModifier: 0.51,
  baseSpeed: 195,
  sigRadius: 135,
};

const abaddonProfile: ShipProfile = {
  name: "Abaddon",
  faction: "Amarr Empire",
  hullType: "Standard Battleships",
  mass: 103_200_000,
  inertiaModifier: 0.14,
  baseSpeed: 89,
  sigRadius: 470,
};

const propulsionModules: readonly PropulsionModule[] = [
  { id: "ab-1mn", kind: "afterburner", sizeTier: "small", label: "1MN Afterburner I", thrust: 1.5e6, massAddition: 500_000, speedBonus: 1.15, sigBloom: 0 },
  { id: "mwd-5mn", kind: "microwarpdrive", sizeTier: "small", label: "5MN MWD", thrust: 1.5e6, massAddition: 500_000, speedBonus: 5, sigBloom: 5 },
  { id: "ab-10mn", kind: "afterburner", sizeTier: "medium", label: "10MN AB", thrust: 15e6, massAddition: 5_000_000, speedBonus: 1.15, sigBloom: 0 },
  { id: "ab-100mn", kind: "afterburner", sizeTier: "large", label: "100MN AB", thrust: 150e6, massAddition: 50_000_000, speedBonus: 1.15, sigBloom: 0 },
];

const ships = vi.mocked<Ships>({
  findHull: vi.fn(),
  fittingOptions: vi.fn(),
} as unknown as Ships);

const db: FittingDb = {
  modules: {
    "1600mm Steel Plates II": { massAddition: 3_750_000 },
    "Reinforced Bulkheads II": { agilityMultiplier: 1.05 },
    "5MN Microwarpdrive I": {
      propulsion: {
        kind: "microwarpdrive",
        sizeTier: "small",
        thrust: 1_500_000,
        speedBonus: 5,
        massAddition: 500_000,
        sigBloom: 5,
      },
    },
    "100MN Y-S8 Compact Afterburner": {
      propulsion: {
        kind: "afterburner",
        sizeTier: "large",
        thrust: 150_000_000,
        speedBonus: 1.25,
        massAddition: 50_000_000,
        sigBloom: 0,
      },
    },
    "Inertial Stabilizers II": { agilityMultiplier: 0.8, sigBonusPercent: 11 },
    "Nanofiber Internal Structure II": { speedBonusPercent: 9.5, agilityMultiplier: 0.8425 },
    "Medium Shield Extender II": { sigRadiusAdd: 7 },
    "Medium Higgs Anchor I": { massBonusPercentage: 100, agilityMultiplier: 0.45, speedBonusPercent: -75 },
    "Overdrive Injector System II": { speedBonusPercent: 12.5 },
    "Medium Trimark Armor Pump II": { agilityDrawbackPercent: 10 },
    "Medium Core Defense Field Extender I": { sigDrawbackPercent: 10 },
    "Tracking Enhancer II": { turretTrackingPercent: 9.5, turretOptimalPercent: 10, turretFalloffPercent: 20 },
    "Caldari Navy Tracking Enhancer": { turretTrackingPercent: 12, turretOptimalPercent: 7.5, turretFalloffPercent: 15 },
    "Medium Energy Metastasis Adjuster II": { turretTrackingPercent: 20 },
  },
  turrets: {
    "Heavy Pulse Laser II": { tracking: 26, optimal: 12_600, falloff: 5_000, chargeSize: 2, turretSkill: "Medium Energy Turret" },
    "200mm AutoCannon II": { tracking: 315, optimal: 1_200, falloff: 5_160, chargeSize: 1, turretSkill: "Small Projectile Turret" },
  },
  charges: {
    "Conflagration M": { trackingMultiplier: 0.7, rangeMultiplier: 0.5 },
    "EMP S": { rangeMultiplier: 0.5 },
  },
  scripts: {
    "Tracking Speed Script": { trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0 },
    "Optimal Range Script": { trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2 },
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
    Vagabond: [
      { attribute: "maxVelocity", magnitude: 5, skill: "Minmatar Cruiser" },
      { attribute: "agility", magnitude: -4, skill: "Minmatar Cruiser" },
      { attribute: "turretTracking", magnitude: 10, skill: "Minmatar Cruiser", turretSkill: "Small Projectile Turret" },
      { attribute: "turretFalloff", magnitude: 10 },
      { attribute: "turretOptimal", magnitude: 25, turretSkill: "Medium Projectile Turret" },
    ],
    Muninn: [
      { attribute: "maxVelocity", magnitude: 50 },
      { attribute: "agility", magnitude: -5 },
    ],
  },
};

const gunFamilies = new GunFamiliesImpl();

const chargeCatalog = new ChargeCatalogImpl({ fittingDb: db, gunFamilies });

const fullFittingDb: FittingDb = {
  modules: FITTING_MODULES,
  turrets: TURRETS,
  charges: CHARGES,
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
const fullChargeCatalog = new ChargeCatalogImpl({ fittingDb: fullFittingDb, gunFamilies });

const conditions: StatConditions = { skillLevel: 0, overloaded: false };

const skillConditions: StatConditions = { skillLevel: 4, overloaded: false };

function stackingPenaltyForTwo(first: number, second: number): number {
  const penalty = Math.exp(-1 / 7.1289);
  return first * (1 + (second - 1) * penalty);
}

describe("FittingImportImpl", () => {
  beforeEach(() => {
    ships.findHull.mockReturnValue(profile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
  });

  test("returns undefined for non-EFT text", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    expect(importer.importFitting("not a fitting", conditions)).toBeUndefined();
  });

  test("returns undefined when hull is unknown", () => {
    ships.findHull.mockReturnValue(undefined);
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    expect(importer.importFitting("[Unknown Hull, fit]\n5MN Microwarpdrive I", conditions)).toBeUndefined();
  });

  test("resolves hull and fitting name", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting("[Harbinger, Brawler]\n5MN Microwarpdrive I", conditions);
    expect(result).toBeDefined();
    expect(result!.profile).toBe(profile);
    expect(result!.fittingName).toBe("Brawler");
  });

  test("sums flat mass from plates without bulkhead item mass fallback", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Tank]\n1600mm Steel Plates II\nReinforced Bulkheads II`,
      conditions,
    );
    expect(result!.fitted.mass).toBe(profile.mass + 3_750_000);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(1.05, 6);
  });

  test("adds shield extender signature radius", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(`[Harbinger, Shieldy]\nMedium Shield Extender II`, conditions);
    expect(result!.fitted.sigRadiusAdd).toBe(7);
    expect(result!.fitted.sigMultiplier).toBe(1);
  });

  test("applies stacking penalty to two agility modules", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Armor]\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II`,
      conditions,
    );
    const expected = stackingPenalty.apply([1.1, 1.1, 1.1]);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(expected, 6);
    expect(result!.fitted.sigMultiplier).toBe(1);
  });

  test("shield extender rig multiplies signature by 1.1", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(`[Harbinger, Shield Rig]\nMedium Core Defense Field Extender I`, conditions);
    const expected = stackingPenalty.apply([1.1]);
    expect(result!.fitted.sigMultiplier).toBeCloseTo(expected, 6);
    expect(result!.fitted.inertiaMultiplier).toBe(1);
  });

  test("inertial stabilizer and trimarks share the same agility stacking chain", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Mixed]\nInertial Stabilizers II\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II`,
      conditions,
    );
    const expected = stackingPenalty.apply([0.8, 1.1, 1.1, 1.1]);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(expected, 6);
  });

  test("inertial stabilizer and shield rig share the same signature stacking chain", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Sig Rig]\nInertial Stabilizers II\nMedium Core Defense Field Extender I`,
      conditions,
    );
    const expected = stackingPenalty.apply([1.11, 1.1]);
    expect(result!.fitted.sigMultiplier).toBeCloseTo(expected, 6);
  });

  test("overdrive applies speed bonus percent", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(`[Harbinger, Kiter]\nOverdrive Injector System II`, conditions);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1.125, 6);
  });

  test("applies mass percentage bonuses with stacking penalty", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, AB]\n100MN Y-S8 Compact Afterburner`,
      conditions,
    );
    expect(result!.propulsion).toBeDefined();
    expect(result!.propulsion!.propulsionId).toBe("ab-100mn");
    expect(result!.propulsion!.propulsionName).toBe("100MN Y-S8 Compact Afterburner");
    expect(result!.propulsion!.speedBonus).toBe(1.25);
    expect(result!.propulsion!.massAddition).toBe(50_000_000);
  });

  test("propulsionVariantNames returns matching module names", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const mwd = propulsionModules.find((m) => m.id === "mwd-5mn")!;
    expect(importer.propulsionVariantNames(mwd)).toEqual(["5MN Microwarpdrive I"]);
  });

  test("propulsionVariantNames returns an empty list when no variants match", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const ab10 = propulsionModules.find((m) => m.id === "ab-10mn")!;
    expect(importer.propulsionVariantNames(ab10)).toEqual([]);
  });

  test("propulsionStats returns stats for a named propulsion module", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    expect(importer.propulsionStats("1600mm Steel Plates II")).toBeUndefined();
    expect(importer.propulsionStats("Unknown")).toBeUndefined();
  });

  test("skips unknown module names", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Mixed]\n1600mm Steel Plates II\nUnknown module that does not exist\nMedium Shield Extender II`,
      conditions,
    );
    expect(result!.fitted.mass).toBe(profile.mass + 3_750_000);
    expect(result!.fitted.sigRadiusAdd).toBe(7);
  });

  test("resolves the first turret and charge", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Conflagration M\nMedium Shield Extender II`,
      conditions,
    );
    expect(result!.turret).toBeDefined();
    expect(result!.turret!.moduleName).toBe("Heavy Pulse Laser II");
    expect(result!.turret!.charge).toBe("Conflagration M");
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Conflagration M`,
      skillConditions,
    );
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 1.2 * 125) / 40_000, 10);
    expect(result!.turret!.optimal).toBe(12_600 * 0.5 * 1.2);
    expect(result!.turret!.falloff).toBe(5_000 * 1.2);
  });

  test("turret without loaded charge selects the usual ammo", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II\nHeavy Pulse Laser II, Conflagration M`,
      conditions,
    );
    expect(result!.turret!.charge).toBe("Conflagration M");
    expect(result!.turret!.chargeSize).toBe(2);
    expect(result!.turret!.optimal).toBe(12_600 * 0.5);
    expect(result!.turret!.falloff).toBe(5_000);
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 125) / 40_000, 10);
    expect(result!.turret!.base.optimal).toBe(12_600);
    expect(result!.turret!.base.falloff).toBe(5_000);
    expect(result!.turret!.base.tracking).toBeCloseTo((26 * 125) / 40_000, 10);
  });

  test("unknown loaded charge is replaced by the usual ammo", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Mjolnir Rocket`,
      conditions,
    );
    expect(result!.turret!.charge).toBe("Conflagration M");
    expect(result!.turret!.optimal).toBe(12_600 * 0.5);
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 125) / 40_000, 10);
  });

  test("cargoCharges filters cargo to known charges in EFT order", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]
Heavy Pulse Laser II, Conflagration M
Mjolnir Rocket x400
EMP S x2000
Conflagration M x100`,
      conditions,
    );
    expect(result!.cargoCharges).toEqual([
      { name: "EMP S", quantity: 2000 },
      { name: "Conflagration M", quantity: 100 },
    ]);
  });

  test("three metastasis rigs stack-penalize tracking", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Offline]\nHeavy Pulse Laser II /OFFLINE\n200mm AutoCannon II, EMP S`,
      conditions,
    );
    expect(result!.turret).toBeDefined();
    expect(result!.turret!.sigResolutionClass).toBe("S");
  });

  test("all-offline propulsion is not applied", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Harbinger, Offline]\n100MN Y-S8 Compact Afterburner /OFFLINE\n5MN Microwarpdrive I /OFFLINE`,
      conditions,
    );
    expect(result!.propulsion).toBeUndefined();
  });

  test("maps small turret to S sig resolution class", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, AC]\n200mm AutoCannon II, EMP S`,
      conditions,
    );
    expect(result!.turret!.sigResolutionClass).toBe("S");
    expect(result!.turret!.tracking).toBe((315 * 40) / 40_000);
  });

  test("skill-scaled hull velocity and agility bonuses apply", () => {
    ships.findHull.mockReturnValueOnce(bonusProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: hullBonusDb, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting("[Vagabond, Bonuses]\n200mm AutoCannon II, EMP S", skillConditions);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1.2, 6);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(0.84, 6);
  });

  test("hull velocity and agility bonuses are flat without a skill", () => {
    ships.findHull.mockReturnValueOnce(roleBonusProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: hullBonusDb, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting("[Muninn, Role]\n200mm AutoCannon II, EMP S", conditions);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1.5, 6);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(0.95, 6);
  });

  test("hull turret bonuses match turret skill and share the module stacking chain", () => {
    ships.findHull.mockReturnValueOnce(bonusProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: hullBonusDb, chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Ewar]
Stasis Webifier II
Tracking Disruptor II, Optimal Range Disruption Script`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.webs).toEqual([
      { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 },
    ]);
    expect(result!.ewar.scripts).toEqual(DISRUPTION_SCRIPT_CATALOG);
    expect(result!.ewar.disruptors).toEqual([
      {
        moduleName: "Tracking Disruptor II",
        optimal: 48000,
        falloff: 24000,
        disruption: 0.1719,
        defaultScript: OPTIMAL_RANGE_SCRIPT,
        overloadStrengthBonusPercent: 20,
      },
    ]);
  });

  test("ignores offline ewar and returns empty ewar loadout when none are fitted", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Unscripted TD]
200mm AutoCannon I, Hail S
Tracking Disruptor II`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.disruptors).toEqual([
      {
        moduleName: "Tracking Disruptor II",
        optimal: 48000,
        falloff: 24000,
        disruption: 0.1719,
        defaultScript: undefined,
        overloadStrengthBonusPercent: 20,
      },
    ]);
    expect(result!.ewar.scripts).toEqual(DISRUPTION_SCRIPT_CATALOG);
  });

  test("resolves warp scramblers and ignores long warp disruptors", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Scram]
Warp Scrambler II
Warp Disruptor II`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.scramblers).toEqual([
      { moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 },
    ]);
    expect(result!.ewar.webs).toEqual([]);
    expect(result!.ewar.grapplers).toEqual([]);
    expect(result!.ewar.disruptors).toEqual([]);
  });

  test("resolves heavy stasis grapplers with falloff and optimal overload", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Grappler]
200mm AutoCannon I, Hail S
Heavy Stasis Grappler I`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.grapplers).toEqual([
      { moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 },
    ]);
    expect(result!.ewar.webs).toEqual([]);
    expect(result!.ewar.disruptors).toEqual([]);
    expect(result!.ewar.scramblers).toEqual([]);
  });

  test("resolves a tracking computer and its default script", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, Tc]
200mm AutoCannon I, Hail S
Tracking Computer I, Optimal Range Script`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.boosts.computers).toEqual([
      { moduleName: "Tracking Computer I", trackingBonusPercent: 10, optimalBonusPercent: 5, falloffBonusPercent: 10, defaultScript: result!.boosts.scripts.find((s) => s.name === "Optimal Range Script") },
    ]);
    expect(result!.boosts.scripts).toEqual([
      { name: "Optimal Range Script", trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2 },
      { name: "Tracking Speed Script", trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0 },
    ]);
  });

  test("ignores an offline tracking computer", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(
      `[Rifter, ScramCharge]
Warp Scrambler II, Gremlin K5`,
      conditions,
    );
    expect(result).toBeDefined();
    expect(result!.ewar.scramblers).toEqual([
      { moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 },
    ]);
    expect(result!.ewar.webs).toEqual([]);
    expect(result!.ewar.disruptors).toEqual([]);
  });

  test("imports a real preset and resolves cargo charges with drones before cargo", async () => {
    const path = join(import.meta.dir, "..", "..", "data", "ship-fittings", "Abaddon", "Pulse_Armor_Abaddon.txt");
    const text = await Bun.file(path).text();
    ships.findHull.mockReturnValueOnce(abaddonProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(text, conditions);
    expect(result).toBeDefined();
    const names = result!.cargoCharges.map((charge) => charge.name);
    expect(names).toContain("Conflagration L");
    expect(names).toContain("Scorch L");
  });

  test("classifies charges in a first quantity block as cargo", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(RIFTER_EXTRA_CHARGE_IN_DRONE_BLOCK, conditions);
    expect(result).toBeDefined();
    const names = result!.cargoCharges.map((charge) => charge.name);
    expect(names).toEqual(["Hail S", "Republic Fleet EMP S"]);
  });

  test("classifies cargo before drones by item kind", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    ships.fittingOptions.mockReturnValueOnce(propulsionModules);
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const result = importer.importFitting(RIFTER_DRONE_AFTER_CARGO, conditions);
    expect(result).toBeDefined();
    const names = result!.cargoCharges.map((charge) => charge.name);
    expect(names).toEqual(["Republic Fleet EMP S"]);
  });

  test("itemName and canonicalName delegate to ItemNames", () => {
    const mock = new TestItemNames();
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog, stackingPenalty, itemNameCatalog: mock, moduleSlotCatalog });
    expect(importer.itemName("X", "zh")).toBe("X (zh)");
    expect(importer.itemName("X", "ja")).toBe("X (ja)");
    expect(importer.itemName("X", "en")).toBe("X");
    expect(importer.canonicalName("X (zh)")).toBe("X");
    expect(importer.canonicalName("X (ja)")).toBe("X");
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
  return { modules: {}, turrets: {}, charges: CHARGES, scripts: {}, stasisWebs: {}, stasisGrapplers: {}, trackingComputers: {}, trackingDisruptors: {}, warpScramblers: {}, disruptionScripts: {}, hullBonuses: {}, drones: DRONES };
}

describe("FittingImportImpl.summarize", () => {
  test("parses hull and fitting names", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    expect(summary).toBeDefined();
    expect(summary!.hullName).toBe("Rifter");
    expect(summary!.fittingName).toBe("Brawler");
  });

  test("groups modules by slot in fixed order", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    expect(summary).toBeDefined();
    const kinds = summary!.sections.map((section) => section.kind);
    expect(kinds).toEqual(["high", "mid", "low", "rig", "cargo", "drones"]);
  });

  test("captures charges on module rows", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    const high = summary!.sections.find((section) => section.kind === "high");
    expect(high!.rows[0].charge).toBe("Hail S");
    expect(high!.rows[1].charge).toBe("Hail S");
  });

  test("captures cargo quantities", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    const cargo = summary!.sections.find((section) => section.kind === "cargo");
    expect(cargo!.rows).toEqual([
      { name: "Hail S", quantity: 1000 },
      { name: "Republic Fleet EMP S", quantity: 500 },
    ]);
  });

  test("captures drone quantities", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER);
    const drones = summary!.sections.find((section) => section.kind === "drones");
    expect(drones!.rows).toEqual([{ name: "Hobgoblin I", quantity: 3 }]);
  });

  test("classifies cargo and drones by item kind regardless of position", () => {
    const text = `[Rifter, Mixed]
200mm AutoCannon I, Hail S
5MN Microwarpdrive I

Republic Fleet EMP S x500

Hobgoblin I x3
`;
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const summary = importer.summarize(text);
    const cargo = summary!.sections.find((section) => section.kind === "cargo");
    const drones = summary!.sections.find((section) => section.kind === "drones");
    expect(cargo!.rows).toEqual([{ name: "Republic Fleet EMP S", quantity: 500 }]);
    expect(drones!.rows).toEqual([{ name: "Hobgoblin I", quantity: 3 }]);
  });

  test("places shield extenders in the mid section", async () => {
    const path = join(import.meta.dir, "..", "..", "data", "ship-fittings", "Widow", "Missile_Shield_Widow.txt");
    const text = await Bun.file(path).text();
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_EXTRA_CHARGE_IN_DRONE_BLOCK);
    const kinds = summary!.sections.map((section) => section.kind);
    expect(kinds).toEqual(["high", "mid", "cargo"]);
    const cargo = summary!.sections.find((section) => section.kind === "cargo");
    expect(cargo!.rows).toEqual([
      { name: "Hail S", quantity: 1000 },
      { name: "Republic Fleet EMP S", quantity: 500 },
    ]);
  });

  test("returns undefined for unparseable text", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    expect(importer.summarize(INVALID_TEXT)).toBeUndefined();
  });

  test("places unknown module names in the block's intended bank", () => {
    const text = `[Rifter, Unknown]\nUnknown Module Name\n5MN Microwarpdrive I\n`;
    const importer = new FittingImportImpl({ ships, fittingDb: summarizeDb(), chargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const summary = importer.summarize(text);
    expect(summary!.sections).toHaveLength(2);
    expect(summary!.sections[0].kind).toBe("mid");
    expect(summary!.sections[1].kind).toBe("low");
  });

  test("fixture modules are all present in the generated slot map", () => {
    const parsed = parseEft(RIFTER_BRAWLER);
    for (const line of moduleLines(parsed!)) {
      expect(MODULE_SLOTS[line.name]).toBeDefined();
    }
  });
});

describe("FittingImportImpl localization", () => {
  beforeAll(async () => {
    await itemNameCatalog.ensureLanguage("zh");
    await itemNameCatalog.ensureLanguage("ja");
  });
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
    ships.findHull.mockReturnValue(frigateProfile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
  });

  test("imports a Chinese EFT to the same canonical result as English", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const english = importer.importFitting(RIFTER_BRAWLER, conditions);
    const chinese = importer.importFitting(RIFTER_BRAWLER_ZH, conditions);
    expect(chinese).toBeDefined();
    expect(english?.turret?.charge).toBe(chinese?.turret?.charge);
    expect(english?.cargoCharges.map((c) => c.name)).toEqual(chinese?.cargoCharges.map((c) => c.name));
    expect(english?.fitted.mass).toBe(chinese?.fitted.mass);
  });

  test("imports a Japanese EFT to the same canonical result as English", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const english = importer.importFitting(RIFTER_BRAWLER, conditions);
    const japanese = importer.importFitting(RIFTER_BRAWLER_JA, conditions);
    expect(japanese).toBeDefined();
    expect(english?.turret?.charge).toBe(japanese?.turret?.charge);
    expect(english?.cargoCharges.map((c) => c.name)).toEqual(japanese?.cargoCharges.map((c) => c.name));
    expect(english?.fitted.mass).toBe(japanese?.fitted.mass);
  });

  test("summarize canonicalizes localized item names to English", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const summary = importer.summarize(RIFTER_BRAWLER_ZH);
    expect(summary).toBeDefined();
    const high = summary!.sections.find((section) => section.kind === "high");
    expect(high!.rows[0].name).toBe("200mm AutoCannon I");
    expect(high!.rows[0].charge).toBe("Hail S");
    const drones = summary!.sections.find((section) => section.kind === "drones");
    expect(drones!.rows[0].name).toBe("Hobgoblin I");
  });

  test("canonicalEftText produces English-only EFT from localized input", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: fullFittingDb, chargeCatalog: fullChargeCatalog, stackingPenalty, itemNameCatalog, moduleSlotCatalog });
    const canonical = importer.canonicalEftText(text);
    expect(canonical).toBeDefined();
    expect(canonical).toContain("Brawler");
    expect(canonical).toContain("Unknown Custom Module I");
    expect(canonical).toContain("5MN Microwarpdrive I");
  });
});
