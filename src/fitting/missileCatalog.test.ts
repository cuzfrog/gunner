import { MissileCatalogImpl } from "./missileCatalog";
import { MissileSkillModelImpl } from "./missileStats";
import type { FittingDb, HullBonus, LauncherStats, MissileStats } from "../gamedata/fittingDb";
import type { StackingPenalty } from "../sim";
import type { SkillLevel } from "../ships";
import { toTypeId, type TypeId } from "../gamedata/ids";
import type { ImportedLauncher } from "./chargeCatalog";

const LIGHT_MISSILE_LAUNCHER: LauncherStats = { rateOfFire: 16, launcherGroup: 509, chargeGroups: [384, 394], id: toTypeId("499"), name: "Light Missile Launcher I" };
const ROCKET_LAUNCHER: LauncherStats = { rateOfFire: 4, launcherGroup: 507, chargeGroups: [387], id: toTypeId("510"), name: "Rocket Launcher I" };

const SCOURGE_LIGHT: MissileStats = { damage: 83, damageType: "kinetic", explosionRadius: 50, explosionVelocity: 202, damageReductionFactor: 2.0, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 384, id: toTypeId("258"), name: "Scourge Light Missile" };
const INFERNO_LIGHT: MissileStats = { damage: 83, damageType: "thermal", explosionRadius: 50, explosionVelocity: 202, damageReductionFactor: 2.0, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 384, id: toTypeId("257"), name: "Inferno Light Missile" };
const SCOURGE_FURY_LIGHT: MissileStats = { damage: 145, damageType: "kinetic", explosionRadius: 75, explosionVelocity: 151, damageReductionFactor: 2.6, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 394, id: toTypeId("261"), name: "Scourge Fury Light Missile" };
const SCOURGE_ROCKET: MissileStats = { damage: 45, damageType: "kinetic", explosionRadius: 20, explosionVelocity: 225, damageReductionFactor: 1.5, maxVelocity: 6750, flightTime: 2, launcherGroup: 507, chargeGroup: 387, id: toTypeId("301"), name: "Scourge Rocket" };

const missiles: Readonly<Record<string, MissileStats>> = {
  [String(SCOURGE_LIGHT.id)]: SCOURGE_LIGHT,
  [String(INFERNO_LIGHT.id)]: INFERNO_LIGHT,
  [String(SCOURGE_FURY_LIGHT.id)]: SCOURGE_FURY_LIGHT,
  [String(SCOURGE_ROCKET.id)]: SCOURGE_ROCKET,
};

const launchers: Readonly<Record<string, LauncherStats>> = {
  [String(LIGHT_MISSILE_LAUNCHER.id)]: LIGHT_MISSILE_LAUNCHER,
  [String(ROCKET_LAUNCHER.id)]: ROCKET_LAUNCHER,
};

const stacking = vi.mocked<StackingPenalty>({ apply: vi.fn((m: readonly number[]) => m.reduce((p, x) => p * x, 1)) });
const skillModel = new MissileSkillModelImpl({ stackingPenalty: stacking });
const testDb: Pick<FittingDb, "missiles" | "launchers"> = { missiles, launchers };

function catalog(): MissileCatalogImpl {
  return new MissileCatalogImpl({ fittingDb: testDb, missileSkillModel: skillModel });
}

beforeEach(() => {
  stacking.apply.mockReset();
  stacking.apply.mockImplementation((m: readonly number[]) => m.reduce((p, x) => p * x, 1));
});

function importedLauncher(overrides: Partial<ImportedLauncher> = {}): ImportedLauncher {
  return {
    moduleId: LIGHT_MISSILE_LAUNCHER.id,
    name: LIGHT_MISSILE_LAUNCHER.name,
    count: 1,
    chargeId: SCOURGE_LIGHT.id,
    chargeName: SCOURGE_LIGHT.name,
    damagePerMissile: 83,
    cycleTime: 16,
    explosionRadius: 50,
    explosionVelocity: 202,
    damageReductionFactor: 2.0,
    maxVelocity: 3750,
    flightTime: 5,
    ...overrides,
  };
}

describe("MissileCatalogImpl", () => {
  test("missilesForLauncher lists missiles matching the launcher charge groups", () => {
    const options = catalog().missilesForLauncher(LIGHT_MISSILE_LAUNCHER);
    const ids = options.map((o) => o.id);
    expect(ids).toContain(SCOURGE_LIGHT.id);
    expect(ids).toContain(INFERNO_LIGHT.id);
    expect(ids).toContain(SCOURGE_FURY_LIGHT.id);
    expect(ids).not.toContain(SCOURGE_ROCKET.id);
  });

  test("missilesForLauncher returns empty for a launcher with no matching missiles", () => {
    const emptyLauncher: LauncherStats = { rateOfFire: 10, launcherGroup: 999, chargeGroups: [999], id: toTypeId("999"), name: "Empty" };
    expect(catalog().missilesForLauncher(emptyLauncher)).toEqual([]);
  });

  test("usualForLauncher returns the first compatible missile", () => {
    const usual = catalog().usualForLauncher(LIGHT_MISSILE_LAUNCHER);
    expect(usual).toBeDefined();
    expect(LIGHT_MISSILE_LAUNCHER.chargeGroups).toContain(missiles[String(usual!)].chargeGroup);
  });

  test("usualForLauncher returns undefined when no missiles match", () => {
    const emptyLauncher: LauncherStats = { rateOfFire: 10, launcherGroup: 999, chargeGroups: [999], id: toTypeId("999"), name: "Empty" };
    expect(catalog().usualForLauncher(emptyLauncher)).toBeUndefined();
  });

  test("withCharge re-derives effective values for the new missile", () => {
    const base = importedLauncher();
    const result = catalog().withCharge(base, SCOURGE_FURY_LIGHT.id, [], 5);
    expect(result.chargeId).toBe(SCOURGE_FURY_LIGHT.id);
    expect(result.chargeName).toBe(SCOURGE_FURY_LIGHT.name);
    expect(result.damagePerMissile).toBeCloseTo(145 * (1 + 0.02 * 5), 6);
    expect(result.explosionRadius).toBeCloseTo(75 * (1 - 0.05 * 5), 6);
    expect(result.damageReductionFactor).toBe(2.6);
  });

  test("withCharge preserves launcher count and module id", () => {
    const base = importedLauncher({ count: 3 });
    const result = catalog().withCharge(base, INFERNO_LIGHT.id, [], 0);
    expect(result.count).toBe(3);
    expect(result.moduleId).toBe(base.moduleId);
    expect(result.name).toBe(base.name);
  });

  test("withCharge returns the input unchanged for an unknown missile id", () => {
    const base = importedLauncher();
    const result = catalog().withCharge(base, toTypeId("99999"), [], 0);
    expect(result).toBe(base);
  });

  test("withCharge returns the input unchanged when the missile is not compatible with the launcher", () => {
    const base = importedLauncher({ moduleId: LIGHT_MISSILE_LAUNCHER.id });
    const result = catalog().withCharge(base, SCOURGE_ROCKET.id, [], 0);
    expect(result).toBe(base);
  });

  test("has returns true for a known missile id", () => {
    expect(catalog().has(SCOURGE_LIGHT.id)).toBe(true);
  });

  test("has returns false for an unknown missile id", () => {
    expect(catalog().has(toTypeId("99999"))).toBe(false);
  });

  test("idForName resolves a known missile name to its TypeId", () => {
    expect(catalog().idForName("Scourge Light Missile")).toBe(SCOURGE_LIGHT.id);
  });

  test("idForName returns undefined for an unknown name", () => {
    expect(catalog().idForName("Nonexistent Missile")).toBeUndefined();
  });

  test("withCharge applies hull bonuses", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileDamage", magnitude: 5, skill: "Caldari Frigate", launcherGroup: 509 },
    ];
    stacking.apply.mockReturnValue(1.25);
    const base = importedLauncher();
    const result = catalog().withCharge(base, SCOURGE_LIGHT.id, bonuses, 5);
    expect(result.damagePerMissile).toBeCloseTo(83 * (1 + 0.02 * 5) * 1.25, 6);
  });

  test("equivalentInGroups finds a stem-matching missile in the target charge groups", () => {
    const result = catalog().equivalentInGroups(SCOURGE_ROCKET.id, [384, 394]);
    expect(result).toBe(SCOURGE_LIGHT.id);
  });

  test("equivalentInGroups returns undefined when no stem match exists in the target groups", () => {
    const emptyLauncher: LauncherStats = { rateOfFire: 10, launcherGroup: 999, chargeGroups: [999], id: toTypeId("999"), name: "Empty" };
    expect(catalog().equivalentInGroups(SCOURGE_ROCKET.id, emptyLauncher.chargeGroups)).toBeUndefined();
  });

  test("equivalentInGroups returns undefined for an unknown missile id", () => {
    expect(catalog().equivalentInGroups(toTypeId("99999"), [384])).toBeUndefined();
  });

  test("equivalentInGroups preserves the damage type across size classes", () => {
    const infernoRocket: MissileStats = { damage: 45, damageType: "thermal", explosionRadius: 20, explosionVelocity: 225, damageReductionFactor: 1.5, maxVelocity: 6750, flightTime: 2, launcherGroup: 507, chargeGroup: 387, id: toTypeId("302"), name: "Inferno Rocket" };
    const dbWithInferno: Pick<FittingDb, "missiles" | "launchers"> = {
      missiles: { ...missiles, [String(infernoRocket.id)]: infernoRocket },
      launchers,
    };
    const cat = new MissileCatalogImpl({ fittingDb: dbWithInferno, missileSkillModel: skillModel });
    const result = cat.equivalentInGroups(infernoRocket.id, [384, 394]);
    expect(result).toBe(INFERNO_LIGHT.id);
  });
});
