import type { PropulsionModule, ShipProfile, Ships, StatConditions } from "../ships";
import { ChargeCatalogImpl } from "./chargeCatalog";
import { FittingImportImpl, _applyStackingPenalty, type FittingDb } from "./fittingImport";

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
    "Tracking Computer II": { turretTrackingPercent: 15, turretOptimalPercent: 7.5, turretFalloffPercent: 15 },
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
  hullBonuses: {},
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

const chargeCatalog = new ChargeCatalogImpl({ fittingDb: db });

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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    expect(importer.importFitting("not a fitting", conditions)).toBeUndefined();
  });

  test("returns undefined when hull is unknown", () => {
    ships.findHull.mockReturnValue(undefined);
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    expect(importer.importFitting("[Unknown Hull, fit]\n5MN Microwarpdrive I", conditions)).toBeUndefined();
  });

  test("resolves hull and fitting name", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting("[Harbinger, Brawler]\n5MN Microwarpdrive I", conditions);
    expect(result).toBeDefined();
    expect(result!.profile).toBe(profile);
    expect(result!.fittingName).toBe("Brawler");
  });

  test("sums flat mass from plates without bulkhead item mass fallback", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Tank]\n1600mm Steel Plates II\nReinforced Bulkheads II`,
      conditions,
    );
    expect(result!.fitted.mass).toBe(profile.mass + 3_750_000);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(1.05, 6);
  });

  test("adds shield extender signature radius", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(`[Harbinger, Shieldy]\nMedium Shield Extender II`, conditions);
    expect(result!.fitted.sigRadiusAdd).toBe(7);
    expect(result!.fitted.sigMultiplier).toBe(1);
  });

  test("applies stacking penalty to two agility modules", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Armor]\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II`,
      conditions,
    );
    const expected = _applyStackingPenalty([1.1, 1.1, 1.1]);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(expected, 6);
    expect(result!.fitted.sigMultiplier).toBe(1);
  });

  test("shield extender rig multiplies signature by 1.1", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(`[Harbinger, Shield Rig]\nMedium Core Defense Field Extender I`, conditions);
    const expected = _applyStackingPenalty([1.1]);
    expect(result!.fitted.sigMultiplier).toBeCloseTo(expected, 6);
    expect(result!.fitted.inertiaMultiplier).toBe(1);
  });

  test("inertial stabilizer and trimarks share the same agility stacking chain", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Mixed]\nInertial Stabilizers II\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II\nMedium Trimark Armor Pump II`,
      conditions,
    );
    const expected = _applyStackingPenalty([0.8, 1.1, 1.1, 1.1]);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(expected, 6);
  });

  test("inertial stabilizer and shield rig share the same signature stacking chain", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Sig Rig]\nInertial Stabilizers II\nMedium Core Defense Field Extender I`,
      conditions,
    );
    const expected = _applyStackingPenalty([1.11, 1.1]);
    expect(result!.fitted.sigMultiplier).toBeCloseTo(expected, 6);
  });

  test("overdrive applies speed bonus percent", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(`[Harbinger, Kiter]\nOverdrive Injector System II`, conditions);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1.125, 6);
  });

  test("applies mass percentage bonuses with stacking penalty", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const mwd = propulsionModules.find((m) => m.id === "mwd-5mn")!;
    expect(importer.propulsionVariantNames(mwd)).toEqual(["5MN Microwarpdrive I"]);
  });

  test("propulsionVariantNames returns an empty list when no variants match", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const ab10 = propulsionModules.find((m) => m.id === "ab-10mn")!;
    expect(importer.propulsionVariantNames(ab10)).toEqual([]);
  });

  test("propulsionStats returns stats for a named propulsion module", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    expect(importer.propulsionStats("1600mm Steel Plates II")).toBeUndefined();
    expect(importer.propulsionStats("Unknown")).toBeUndefined();
  });

  test("skips unknown module names", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Mixed]\n1600mm Steel Plates II\nUnknown module that does not exist\nMedium Shield Extender II`,
      conditions,
    );
    expect(result!.fitted.mass).toBe(profile.mass + 3_750_000);
    expect(result!.fitted.sigRadiusAdd).toBe(7);
  });

  test("resolves the first turret and charge", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Conflagration M`,
      skillConditions,
    );
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 1.2 * 125) / 40_000, 10);
    expect(result!.turret!.optimal).toBe(12_600 * 0.5 * 1.2);
    expect(result!.turret!.falloff).toBe(5_000 * 1.2);
  });

  test("turret without loaded charge selects the usual ammo", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Mjolnir Rocket`,
      conditions,
    );
    expect(result!.turret!.charge).toBe("Conflagration M");
    expect(result!.turret!.optimal).toBe(12_600 * 0.5);
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 125) / 40_000, 10);
  });

  test("cargoCharges filters cargo to known charges in EFT order", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
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
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Rigs]
Heavy Pulse Laser II, Conflagration M
Medium Energy Metastasis Adjuster II
Medium Energy Metastasis Adjuster II
Medium Energy Metastasis Adjuster II`,
      conditions,
    );
    const trackingBonus = _applyStackingPenalty([1.2, 1.2, 1.2]);
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * trackingBonus * 125) / 40_000, 3);
    expect(result!.turret!.optimal).toBeCloseTo(12_600 * 0.5, 6);
    expect(result!.turret!.falloff).toBeCloseTo(5_000, 6);
  });

  test("tracking enhancer, tracking computer and rig share one stacking chain per attribute", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Tracking]
Heavy Pulse Laser II, Conflagration M
Tracking Enhancer II
Tracking Computer II
Medium Energy Metastasis Adjuster II`,
      conditions,
    );
    const trackingBonus = _applyStackingPenalty([1.2, 1.15, 1.095]);
    const optimalBonus = _applyStackingPenalty([1.075, 1.1]);
    const falloffBonus = _applyStackingPenalty([1.15, 1.2]);
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * trackingBonus * 125) / 40_000, 3);
    expect(result!.turret!.optimal).toBeCloseTo(12_600 * 0.5 * optimalBonus, 6);
    expect(result!.turret!.falloff).toBeCloseTo(5_000 * falloffBonus, 6);
  });

  test("tracking speed script doubles tracking and zeros range bonuses from a tracking computer", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Scripted]
Heavy Pulse Laser II, Conflagration M
Tracking Computer II, Tracking Speed Script`,
      conditions,
    );
    expect(result!.turret!.tracking).toBeCloseTo((26 * 0.7 * 1.3 * 125) / 40_000, 6);
    expect(result!.turret!.optimal).toBeCloseTo(12_600 * 0.5, 6);
    expect(result!.turret!.falloff).toBeCloseTo(5_000, 6);
  });

  test("offline turret line is skipped and a later online turret is resolved", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Offline]\nHeavy Pulse Laser II /OFFLINE\n200mm AutoCannon II, EMP S`,
      conditions,
    );
    expect(result!.turret).toBeDefined();
    expect(result!.turret!.sigResolutionClass).toBe("S");
  });

  test("all-offline propulsion is not applied", () => {
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Harbinger, Offline]\n100MN Y-S8 Compact Afterburner /OFFLINE\n5MN Microwarpdrive I /OFFLINE`,
      conditions,
    );
    expect(result!.propulsion).toBeUndefined();
  });

  test("maps small turret to S sig resolution class", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: db, chargeCatalog });
    const result = importer.importFitting(
      `[Rifter, AC]\n200mm AutoCannon II, EMP S`,
      conditions,
    );
    expect(result!.turret!.sigResolutionClass).toBe("S");
    expect(result!.turret!.tracking).toBe((315 * 40) / 40_000);
  });

  test("skill-scaled hull velocity and agility bonuses apply", () => {
    ships.findHull.mockReturnValueOnce(bonusProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: hullBonusDb, chargeCatalog });
    const result = importer.importFitting("[Vagabond, Bonuses]\n200mm AutoCannon II, EMP S", skillConditions);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1.2, 6);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(0.84, 6);
  });

  test("hull velocity and agility bonuses are flat without a skill", () => {
    ships.findHull.mockReturnValueOnce(roleBonusProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: hullBonusDb, chargeCatalog });
    const result = importer.importFitting("[Muninn, Role]\n200mm AutoCannon II, EMP S", conditions);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1.5, 6);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(0.95, 6);
  });

  test("hull turret bonuses match turret skill and share the module stacking chain", () => {
    ships.findHull.mockReturnValueOnce(bonusProfile);
    const importer = new FittingImportImpl({ ships, fittingDb: hullBonusDb, chargeCatalog });
    const result = importer.importFitting(
      `[Vagabond, Turrets]
200mm AutoCannon II, EMP S
Tracking Enhancer II`,
      skillConditions,
    );
    const trackingBonus = _applyStackingPenalty([1.095, 1.4]);
    expect(result!.turret!.tracking).toBeCloseTo((315 * 1.2 * trackingBonus * 40) / 40_000, 6);
    const falloffBonus = _applyStackingPenalty([1.2, 1.1]);
    expect(result!.turret!.falloff).toBeCloseTo(5_160 * 1.2 * falloffBonus, 3);
    expect(result!.turret!.optimal).toBeCloseTo(1_200 * 0.5 * 1.2 * 1.1, 3);
  });
});
