import { DroneSkillModelImpl } from "./droneStats";
import type { DroneStats, HullBonus } from "../gamedata/fittingDb";
import type { SkillLevel } from "../ships";
import { toTypeId } from "../gamedata/ids";

function drone(overrides: Partial<DroneStats> = {}): DroneStats {
  return {
    sizeClass: "light",
    damageMultiplier: 1.92,
    emDamage: 0,
    thermalDamage: 20,
    kineticDamage: 0,
    explosiveDamage: 0,
    tracking: 2.178,
    sigResolution: 25,
    optimal: 1500,
    falloff: 500,
    maxVelocity: 3360,
    orbitSpeed: 4000,
    cycleTime: 4,
    bandwidth: 5,
    volume: 5,
    metaLevel: 5,
    metaGroupID: 2,
    id: toTypeId("2456"),
    name: "Hobgoblin II",
    ...overrides,
  };
}

function hullBonus(attribute: string, magnitude: number, skill?: string): HullBonus {
  return { attribute: attribute as HullBonus["attribute"], magnitude, skill };
}

describe("DroneSkillModelImpl", () => {
  test("skill level 0 returns base drone stats with no skill bonus", () => {
    const result = new DroneSkillModelImpl().compute(drone(), [], 0);
    expect(result.damageMultiplier).toBe(1.92);
    expect(result.tracking).toBe(2.178);
    expect(result.optimal).toBe(1500);
    expect(result.falloff).toBe(500);
    expect(result.maxVelocity).toBe(3360);
    expect(result.skillDamageMultiplier).toBe(1);
    expect(result.hullDamageMultiplier).toBe(1);
  });

  test("Drone Interfacing adds 10% per level to damage", () => {
    const result = new DroneSkillModelImpl().compute(drone(), [], 5);
    const expectedSkill = (1 + 0.1 * 5) * (1 + 0.05 * 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(expectedSkill, 6);
    expect(result.damageMultiplier).toBeCloseTo(1.92 * expectedSkill, 6);
  });

  test("Light Drone Operation adds 5% per level for light drones", () => {
    const result = new DroneSkillModelImpl().compute(drone({ sizeClass: "light" }), [], 4);
    expect(result.skillDamageMultiplier).toBeCloseTo((1 + 0.1 * 4) * (1 + 0.05 * 4), 6);
  });

  test("Heavy Drone Operation adds 5% per level for heavy drones", () => {
    const result = new DroneSkillModelImpl().compute(drone({ sizeClass: "heavy" }), [], 4);
    expect(result.skillDamageMultiplier).toBeCloseTo((1 + 0.1 * 4) * (1 + 0.05 * 4), 6);
  });

  test("Sentry Drone Interfacing adds 5% per level for sentry drones", () => {
    const result = new DroneSkillModelImpl().compute(drone({ sizeClass: "sentry" }), [], 4);
    expect(result.skillDamageMultiplier).toBeCloseTo((1 + 0.1 * 4) * (1 + 0.05 * 4), 6);
  });

  test("Drone Sharpshooting adds 5% per level to optimal range", () => {
    const result = new DroneSkillModelImpl().compute(drone({ optimal: 1000 }), [], 4);
    expect(result.optimal).toBeCloseTo(1000 * (1 + 0.05 * 4), 6);
  });

  test("Drone Navigation adds 5% per level to max velocity", () => {
    const result = new DroneSkillModelImpl().compute(drone({ maxVelocity: 3000 }), [], 4);
    expect(result.maxVelocity).toBeCloseTo(3000 * (1 + 0.05 * 4), 6);
  });

  test("hull droneDamage bonus multiplies damage", () => {
    const bonuses: HullBonus[] = [hullBonus("droneDamage", 10, "Drones")];
    const result = new DroneSkillModelImpl().compute(drone(), bonuses, 5);
    const expectedSkill = (1 + 0.1 * 5) * (1 + 0.05 * 5);
    const expectedHull = 1 + 10 * 5 / 100;
    expect(result.hullDamageMultiplier).toBeCloseTo(expectedHull, 6);
    expect(result.damageMultiplier).toBeCloseTo(1.92 * expectedSkill * expectedHull, 6);
  });

  test("non-droneDamage hull bonuses are ignored", () => {
    const bonuses: HullBonus[] = [hullBonus("turretDamage", 10, "Drones")];
    const result = new DroneSkillModelImpl().compute(drone(), bonuses, 5);
    expect(result.hullDamageMultiplier).toBe(1);
  });

  test("skillDamageIds includes Drone Interfacing and size skill", () => {
    const result = new DroneSkillModelImpl().compute(drone({ sizeClass: "light" }), [], 1);
    expect(result.skillDamageIds).toHaveLength(2);
  });
});
