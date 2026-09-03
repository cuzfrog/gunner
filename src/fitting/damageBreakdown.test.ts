import { chargeDamageByType, missileDamageByType, EMPTY_DAMAGE_BREAKDOWN } from "./damageBreakdown";
import type { ChargeStats, MissileStats } from "../gamedata/fittingDb";
import { toTypeId } from "../gamedata/ids";

function charge(overrides: Partial<ChargeStats> = {}): ChargeStats {
  return { id: toTypeId("1"), name: "Test", trackingMultiplier: 1, rangeMultiplier: 1, falloffMultiplier: 1, ...overrides };
}

function missile(overrides: Partial<MissileStats> = {}): MissileStats {
  return { damage: 100, damageType: "kinetic", explosionRadius: 50, explosionVelocity: 170, damageReductionFactor: 2.0, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 384, requiredSkillIds: [], id: toTypeId("2"), name: "Test Missile", ...overrides };
}

describe("chargeDamageByType", () => {
  test("returns empty record when charge has no damage", () => {
    expect(chargeDamageByType(charge())).toEqual({});
  });

  test("returns single damage type", () => {
    expect(chargeDamageByType(charge({ emDamage: 50 }))).toEqual({ em: 50 });
  });

  test("returns all four damage types", () => {
    const result = chargeDamageByType(charge({ emDamage: 10, thermalDamage: 20, kineticDamage: 30, explosiveDamage: 40 }));
    expect(result).toEqual({ em: 10, thermal: 20, kinetic: 30, explosive: 40 });
  });

  test("omits zero damage types", () => {
    const result = chargeDamageByType(charge({ emDamage: 0, thermalDamage: 20, kineticDamage: 0, explosiveDamage: 40 }));
    expect(result).toEqual({ thermal: 20, explosive: 40 });
  });
});

describe("missileDamageByType", () => {
  test("returns single damage type for missile", () => {
    expect(missileDamageByType(missile({ damage: 83, damageType: "kinetic" }))).toEqual({ kinetic: 83 });
  });

  test("returns em damage type", () => {
    expect(missileDamageByType(missile({ damage: 100, damageType: "em" }))).toEqual({ em: 100 });
  });

  test("returns explosive damage type", () => {
    expect(missileDamageByType(missile({ damage: 45, damageType: "explosive" }))).toEqual({ explosive: 45 });
  });

  test("returns thermal damage type", () => {
    expect(missileDamageByType(missile({ damage: 60, damageType: "thermal" }))).toEqual({ thermal: 60 });
  });
});

describe("EMPTY_DAMAGE_BREAKDOWN", () => {
  test("has empty damage by type and no factors", () => {
    expect(EMPTY_DAMAGE_BREAKDOWN.damageByType).toEqual({});
    expect(EMPTY_DAMAGE_BREAKDOWN.factors).toEqual([]);
  });
});
