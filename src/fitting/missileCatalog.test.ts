import { MissileCatalogImpl } from "./missileCatalog";
import { MissileSkillModelImpl } from "./missileStats";
import { FITTING_DB, type FittingDb, type HullBonus, type LauncherStats, type MissileStats } from "../gamedata/fittingDb";
import { type StackingPenalty, damageVectorSum } from "../sim";
import type { SkillLevel } from "../ships";
import { toTypeId, type TypeId } from "../gamedata/ids";
import type { ImportedLauncher } from "./chargeCatalog";
import { EMPTY_DAMAGE_BREAKDOWN } from "./damageBreakdown";

const MLO_ID = toTypeId("3319");
const LIGHT_MISSILES_ID = toTypeId("3321");
const ROCKETS_ID = toTypeId("3320");

const LIGHT_MISSILE_LAUNCHER: LauncherStats = { rateOfFire: 16, launcherGroup: 509, chargeGroups: [384, 394], requiredSkillIds: [MLO_ID], metaLevel: 0, metaGroupID: 1, id: toTypeId("499"), name: "Light Missile Launcher I" };
const ROCKET_LAUNCHER: LauncherStats = { rateOfFire: 4, launcherGroup: 507, chargeGroups: [387], requiredSkillIds: [MLO_ID], metaLevel: 0, metaGroupID: 1, id: toTypeId("510"), name: "Rocket Launcher I" };

const SCOURGE_LIGHT: MissileStats = { damage: 83, damageType: "kinetic", explosionRadius: 50, explosionVelocity: 202, damageReductionFactor: 2.0, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 384, requiredSkillIds: [MLO_ID, LIGHT_MISSILES_ID], id: toTypeId("258"), name: "Scourge Light Missile" };
const INFERNO_LIGHT: MissileStats = { damage: 83, damageType: "thermal", explosionRadius: 50, explosionVelocity: 202, damageReductionFactor: 2.0, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 384, requiredSkillIds: [MLO_ID, LIGHT_MISSILES_ID], id: toTypeId("257"), name: "Inferno Light Missile" };
const SCOURGE_FURY_LIGHT: MissileStats = { damage: 145, damageType: "kinetic", explosionRadius: 75, explosionVelocity: 151, damageReductionFactor: 2.6, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 394, requiredSkillIds: [MLO_ID, LIGHT_MISSILES_ID], id: toTypeId("261"), name: "Scourge Fury Light Missile" };
const SCOURGE_ROCKET: MissileStats = { damage: 45, damageType: "kinetic", explosionRadius: 20, explosionVelocity: 225, damageReductionFactor: 1.5, maxVelocity: 6750, flightTime: 2, launcherGroup: 507, chargeGroup: 387, requiredSkillIds: [MLO_ID, ROCKETS_ID], id: toTypeId("301"), name: "Scourge Rocket" };

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
const skillModel = new MissileSkillModelImpl({ stackingPenalty: stacking, skillBonuses: FITTING_DB.skillBonuses });
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
    damagePerMissile: { em: 0, thermal: 0, kinetic: 83, explosive: 0 },
    cycleTime: 16,
    explosionRadius: 50,
    explosionVelocity: 202,
    damageReductionFactor: 2.0,
    maxVelocity: 3750,
    flightTime: 5,
    damageBreakdown: EMPTY_DAMAGE_BREAKDOWN,
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
    const emptyLauncher: LauncherStats = { rateOfFire: 10, launcherGroup: 999, chargeGroups: [999], requiredSkillIds: [], metaLevel: 0, metaGroupID: 1, id: toTypeId("999"), name: "Empty" };
    expect(catalog().missilesForLauncher(emptyLauncher)).toEqual([]);
  });

  test("usualForLauncher returns the first compatible missile", () => {
    const usual = catalog().usualForLauncher(LIGHT_MISSILE_LAUNCHER);
    expect(usual).toBeDefined();
    expect(LIGHT_MISSILE_LAUNCHER.chargeGroups).toContain(missiles[String(usual!)].chargeGroup);
  });

  test("usualForLauncher returns undefined when no missiles match", () => {
    const emptyLauncher: LauncherStats = { rateOfFire: 10, launcherGroup: 999, chargeGroups: [999], requiredSkillIds: [], metaLevel: 0, metaGroupID: 1, id: toTypeId("999"), name: "Empty" };
    expect(catalog().usualForLauncher(emptyLauncher)).toBeUndefined();
  });

  test("withCharge re-derives effective values for the new missile", () => {
    const base = importedLauncher();
    const result = catalog().withCharge(base, SCOURGE_FURY_LIGHT.id, [], 5);
    expect(result.chargeId).toBe(SCOURGE_FURY_LIGHT.id);
    expect(result.chargeName).toBe(SCOURGE_FURY_LIGHT.name);
    const skillDamageMultiplier = (1 + 0.05 * 5) * (1 + 0.02 * 5);
    expect(damageVectorSum(result.damagePerMissile)).toBeCloseTo(145 * skillDamageMultiplier, 6);
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
      { attribute: "missileDamage", magnitude: 5, scalesWithHullSkill: true, moduleGroupId: 509 },
    ];
    stacking.apply.mockReturnValue(1.25);
    const base = importedLauncher();
    const result = catalog().withCharge(base, SCOURGE_LIGHT.id, bonuses, 5);
    const skillDamageMultiplier = (1 + 0.05 * 5) * (1 + 0.02 * 5);
    expect(damageVectorSum(result.damagePerMissile)).toBeCloseTo(83 * skillDamageMultiplier * 1.25, 6);
  });

  test("equivalentInGroups finds a stem-matching missile in the target charge groups", () => {
    const result = catalog().equivalentInGroups(SCOURGE_ROCKET.id, [384, 394]);
    expect(result).toBe(SCOURGE_LIGHT.id);
  });

  test("equivalentInGroups returns undefined when no stem match exists in the target groups", () => {
    const emptyLauncher: LauncherStats = { rateOfFire: 10, launcherGroup: 999, chargeGroups: [999], requiredSkillIds: [], metaLevel: 0, metaGroupID: 1, id: toTypeId("999"), name: "Empty" };
    expect(catalog().equivalentInGroups(SCOURGE_ROCKET.id, emptyLauncher.chargeGroups)).toBeUndefined();
  });

  test("equivalentInGroups returns undefined for an unknown missile id", () => {
    expect(catalog().equivalentInGroups(toTypeId("99999"), [384])).toBeUndefined();
  });

  test("equivalentInGroups preserves the damage type across size classes", () => {
    const infernoRocket: MissileStats = { damage: 45, damageType: "thermal", explosionRadius: 20, explosionVelocity: 225, damageReductionFactor: 1.5, maxVelocity: 6750, flightTime: 2, launcherGroup: 507, chargeGroup: 387, requiredSkillIds: [], id: toTypeId("302"), name: "Inferno Rocket" };
    const dbWithInferno: Pick<FittingDb, "missiles" | "launchers"> = {
      missiles: { ...missiles, [String(infernoRocket.id)]: infernoRocket },
      launchers,
    };
    const cat = new MissileCatalogImpl({ fittingDb: dbWithInferno, missileSkillModel: skillModel });
    const result = cat.equivalentInGroups(infernoRocket.id, [384, 394]);
    expect(result).toBe(INFERNO_LIGHT.id);
  });

  test("equivalentInGroups maps Rage rocket to Fury light missile via variant alias", () => {
    const scourgeRageRocket: MissileStats = { damage: 60, damageType: "kinetic", explosionRadius: 20, explosionVelocity: 180, damageReductionFactor: 1.8, maxVelocity: 6750, flightTime: 2, launcherGroup: 507, chargeGroup: 387, requiredSkillIds: [], id: toTypeId("310"), name: "Scourge Rage Rocket" };
    const dbWithRage: Pick<FittingDb, "missiles" | "launchers"> = {
      missiles: { ...missiles, [String(scourgeRageRocket.id)]: scourgeRageRocket },
      launchers,
    };
    const cat = new MissileCatalogImpl({ fittingDb: dbWithRage, missileSkillModel: skillModel });
    const result = cat.equivalentInGroups(scourgeRageRocket.id, [384, 394]);
    expect(result).toBe(SCOURGE_FURY_LIGHT.id);
  });

  test("equivalentInGroups maps Javelin rocket to Precision light missile via variant alias", () => {
    const scourgeJavelinRocket: MissileStats = { damage: 30, damageType: "kinetic", explosionRadius: 15, explosionVelocity: 300, damageReductionFactor: 1.2, maxVelocity: 9000, flightTime: 4, launcherGroup: 507, chargeGroup: 387, requiredSkillIds: [], id: toTypeId("311"), name: "Scourge Javelin Rocket" };
    const scourgePrecisionLight: MissileStats = { damage: 100, damageType: "kinetic", explosionRadius: 35, explosionVelocity: 250, damageReductionFactor: 1.8, maxVelocity: 5000, flightTime: 7, launcherGroup: 509, chargeGroup: 394, requiredSkillIds: [], id: toTypeId("262"), name: "Scourge Precision Light Missile" };
    const dbWithJavelin: Pick<FittingDb, "missiles" | "launchers"> = {
      missiles: { ...missiles, [String(scourgeJavelinRocket.id)]: scourgeJavelinRocket, [String(scourgePrecisionLight.id)]: scourgePrecisionLight },
      launchers,
    };
    const cat = new MissileCatalogImpl({ fittingDb: dbWithJavelin, missileSkillModel: skillModel });
    const result = cat.equivalentInGroups(scourgeJavelinRocket.id, [384, 394]);
    expect(result).toBe(scourgePrecisionLight.id);
  });

  test("equivalentInGroups maps Fury light missile back to Rage rocket via variant alias", () => {
    const scourgeRageRocket: MissileStats = { damage: 60, damageType: "kinetic", explosionRadius: 20, explosionVelocity: 180, damageReductionFactor: 1.8, maxVelocity: 6750, flightTime: 2, launcherGroup: 507, chargeGroup: 387, requiredSkillIds: [], id: toTypeId("310"), name: "Scourge Rage Rocket" };
    const dbWithRage: Pick<FittingDb, "missiles" | "launchers"> = {
      missiles: { ...missiles, [String(scourgeRageRocket.id)]: scourgeRageRocket },
      launchers,
    };
    const cat = new MissileCatalogImpl({ fittingDb: dbWithRage, missileSkillModel: skillModel });
    const result = cat.equivalentInGroups(SCOURGE_FURY_LIGHT.id, [387]);
    expect(result).toBe(scourgeRageRocket.id);
  });

  test("equivalentInGroups falls back to base stem when variant is unavailable in target groups", () => {
    const scourgeRageRocket: MissileStats = { damage: 60, damageType: "kinetic", explosionRadius: 20, explosionVelocity: 180, damageReductionFactor: 1.8, maxVelocity: 6750, flightTime: 2, launcherGroup: 507, chargeGroup: 387, requiredSkillIds: [], id: toTypeId("310"), name: "Scourge Rage Rocket" };
    const dbWithRage: Pick<FittingDb, "missiles" | "launchers"> = {
      missiles: { ...missiles, [String(scourgeRageRocket.id)]: scourgeRageRocket },
      launchers,
    };
    const cat = new MissileCatalogImpl({ fittingDb: dbWithRage, missileSkillModel: skillModel });
    const result = cat.equivalentInGroups(scourgeRageRocket.id, [384]);
    expect(result).toBe(SCOURGE_LIGHT.id);
  });
});
