import type { FittedHull, PropulsionId, PropulsionModule, ShipProfile, Ships, StatConditions } from "../ships";
import type { SigResolutionClass } from "../sim";
import { FittingImportImpl, type FittingDb } from "./fittingImport";

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
    "Reinforced Bulkheads II": { massAddition: 750_000 },
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
    "Inertial Stabilizers II": { massAddition: 200, agilityMultiplier: 0.8 },
    "Nanofiber Internal Structure II": { massAddition: 100, speedBonusPercent: 9.5, agilityMultiplier: 0.8425 },
    "Medium Shield Extender II": { sigRadiusAdd: 7 },
    "Medium Higgs Anchor I": { massBonusPercentage: 100, agilityMultiplier: 0.45, speedBonusPercent: -75 },
  },
  turrets: {
    "Heavy Pulse Laser II": { tracking: 26, sigResolution: 40_000, optimal: 12_600, falloff: 5_000, chargeSize: 2 },
    "200mm AutoCannon II": { tracking: 315, sigResolution: 40_000, optimal: 1_200, falloff: 5_160, chargeSize: 1 },
  },
  charges: {
    "Conflagration M": { trackingMultiplier: 0.7, rangeMultiplier: 0.5, falloffMultiplier: 1 },
    "EMP S": { rangeMultiplier: 0.5 },
  },
};

const conditions: StatConditions = { skillLevel: 0, overloaded: false };

const skillConditions: StatConditions = { skillLevel: 4, overloaded: false };

describe("FittingImportImpl", () => {
  beforeEach(() => {
    ships.findHull.mockReturnValue(profile);
    ships.fittingOptions.mockReturnValue(propulsionModules);
  });

  test("returns undefined for non-EFT text", () => {
    const importer = new FittingImportImpl(ships, db);
    expect(importer.importFitting("not a fitting", conditions)).toBeUndefined();
  });

  test("returns undefined when hull is unknown", () => {
    ships.findHull.mockReturnValue(undefined);
    const importer = new FittingImportImpl(ships, db);
    expect(importer.importFitting("[Unknown Hull, fit]\n5MN Microwarpdrive I", conditions)).toBeUndefined();
  });

  test("resolves hull and fitting name", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting("[Harbinger, Brawler]\n5MN Microwarpdrive I", conditions);
    expect(result).toBeDefined();
    expect(result!.profile).toBe(profile);
    expect(result!.fittingName).toBe("Brawler");
  });

  test("sums flat mass from plates and bulkheads", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(
      `[Harbinger, Tank]\n1600mm Steel Plates II\nReinforced Bulkheads II`,
      conditions,
    );
    expect(result!.fitted.mass).toBe(profile.mass + 3_750_000 + 750_000);
  });

  test("adds shield extender signature radius", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(`[Harbinger, Shieldy]\nMedium Shield Extender II`, conditions);
    expect(result!.fitted.sigRadiusAdd).toBe(7);
  });

  test("applies stacking penalty to two agility modules", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(
      `[Harbinger, Agile]\nInertial Stabilizers II\nNanofiber Internal Structure II`,
      conditions,
    );
    const first = 0.8;
    const second = 0.8425;
    const penalty = Math.exp(-1 / 7.1289);
    const expected = first * (1 + (second - 1) * penalty);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(expected, 6);
  });

  test("applies mass percentage bonuses with stacking penalty", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(
      `[Harbinger, Heavy]\nMedium Higgs Anchor I\n1600mm Steel Plates II`,
      conditions,
    );
    expect(result!.fitted.mass).toBeCloseTo(profile.mass * 2 + 3_750_000, 6);
    expect(result!.fitted.speedMultiplier).toBeCloseTo(1 + (0.25 - 1) * 1, 6);
    expect(result!.fitted.inertiaMultiplier).toBeCloseTo(0.45, 6);
  });

  test("maps exact propulsion to a generic propulsion id", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(
      `[Harbinger, AB]\n100MN Y-S8 Compact Afterburner`,
      conditions,
    );
    expect(result!.propulsion).toBeDefined();
    expect(result!.propulsion!.propulsionId).toBe("ab-100mn");
    expect(result!.propulsion!.speedBonus).toBe(1.25);
    expect(result!.propulsion!.massAddition).toBe(50_000_000);
  });

  test("skips unknown module names", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(
      `[Harbinger, Mixed]\n1600mm Steel Plates II\nUnknown module that does not exist\nMedium Shield Extender II`,
      conditions,
    );
    expect(result!.fitted.mass).toBe(profile.mass + 3_750_000);
    expect(result!.fitted.sigRadiusAdd).toBe(7);
  });

  test("resolves the first turret and charge", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Conflagration M\nMedium Shield Extender II`,
      conditions,
    );
    expect(result!.turret).toBeDefined();
    expect(result!.turret!.optimal).toBe(12_600 * 0.5);
    expect(result!.turret!.falloff).toBe(5_000);
    expect(result!.turret!.sigResolutionClass).toBe("M");
    expect(result!.turret!.tracking).toBe((26 * 0.7 * 125) / 40_000);
  });

  test("turret skill level scales tracking, optimal and falloff", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II, Conflagration M`,
      skillConditions,
    );
    expect(result!.turret!.tracking).toBe((26 * 0.7 * 1.2 * 125) / 40_000);
    expect(result!.turret!.optimal).toBe(12_600 * 0.5 * 1.2);
    expect(result!.turret!.falloff).toBe(5_000 * 1.2);
  });

  test("turret without charge uses base stats", () => {
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(
      `[Harbinger, Lasers]\nHeavy Pulse Laser II\nHeavy Pulse Laser II, Conflagration M`,
      conditions,
    );
    expect(result!.turret!.optimal).toBe(12_600);
    expect(result!.turret!.tracking).toBe((26 * 125) / 40_000);
  });

  test("maps small turret to S sig resolution class", () => {
    ships.findHull.mockReturnValueOnce(frigateProfile);
    const importer = new FittingImportImpl(ships, db);
    const result = importer.importFitting(
      `[Rifter, AC]\n200mm AutoCannon II, EMP S`,
      conditions,
    );
    expect(result!.turret!.sigResolutionClass).toBe("S");
    expect(result!.turret!.tracking).toBe((315 * 40) / 40_000);
  });
});
