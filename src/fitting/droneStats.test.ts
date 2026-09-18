import { DroneSkillModelImpl } from "./droneStats";
import type { DroneStats, HullBonus, SkillBonus } from "../gamedata/fittingDb";
import type { SkillLevel } from "../ships";
import { toTypeId } from "../gamedata/ids";

// Drone skill bonus rows as emitted by scripts/generate-fitting-db.ts (magnitudes verified against pyfa),
// sorted by skillId like the generated SKILL_BONUSES table.
const DRONE_INTERFACING: SkillBonus = { skillId: toTypeId("3442"), bonusType: "droneDamage", magnitudePerLevel: 10, requiredSkillId: toTypeId("3436"), appliesTo: "charge" };
const DRONE_NAVIGATION: SkillBonus = { skillId: toTypeId("12305"), bonusType: "droneVelocity", magnitudePerLevel: 5, requiredSkillId: toTypeId("3436"), appliesTo: "charge" };
const AMARR_SPECIALIZATION: SkillBonus = { skillId: toTypeId("12484"), bonusType: "droneDamage", magnitudePerLevel: 2, requiredSkillId: toTypeId("12484"), appliesTo: "charge" };
const MINMATAR_SPECIALIZATION: SkillBonus = { skillId: toTypeId("12485"), bonusType: "droneDamage", magnitudePerLevel: 2, requiredSkillId: toTypeId("12485"), appliesTo: "charge" };
const GALLENTE_SPECIALIZATION: SkillBonus = { skillId: toTypeId("12486"), bonusType: "droneDamage", magnitudePerLevel: 2, requiredSkillId: toTypeId("12486"), appliesTo: "charge" };
const CALDARI_SPECIALIZATION: SkillBonus = { skillId: toTypeId("12487"), bonusType: "droneDamage", magnitudePerLevel: 2, requiredSkillId: toTypeId("12487"), appliesTo: "charge" };
const SENTRY_DRONE_INTERFACING: SkillBonus = { skillId: toTypeId("23594"), bonusType: "droneDamage", magnitudePerLevel: 5, requiredSkillId: toTypeId("23594"), appliesTo: "charge" };
const DRONE_SHARPSHOOTING: SkillBonus = { skillId: toTypeId("23606"), bonusType: "droneOptimal", magnitudePerLevel: 5, requiredSkillId: toTypeId("3436"), appliesTo: "charge" };
const LIGHT_DRONE_OPERATION: SkillBonus = { skillId: toTypeId("24241"), bonusType: "droneDamage", magnitudePerLevel: 5, requiredSkillId: toTypeId("24241"), appliesTo: "charge" };
const MEDIUM_DRONE_OPERATION: SkillBonus = { skillId: toTypeId("33699"), bonusType: "droneDamage", magnitudePerLevel: 5, requiredSkillId: toTypeId("33699"), appliesTo: "charge" };
const HEAVY_DRONE_OPERATION: SkillBonus = { skillId: toTypeId("3441"), bonusType: "droneDamage", magnitudePerLevel: 5, requiredSkillId: toTypeId("3441"), appliesTo: "charge" };
const TURRET_SKILL_BONUS: SkillBonus = { skillId: toTypeId("3306"), bonusType: "turretDamage", magnitudePerLevel: 5, requiredSkillId: toTypeId("3306"), appliesTo: "module" };

const ALL_DRONE_SKILL_BONUSES: readonly SkillBonus[] = [
  DRONE_INTERFACING, DRONE_NAVIGATION, AMARR_SPECIALIZATION, MINMATAR_SPECIALIZATION, GALLENTE_SPECIALIZATION,
  CALDARI_SPECIALIZATION, SENTRY_DRONE_INTERFACING, DRONE_SHARPSHOOTING, LIGHT_DRONE_OPERATION, MEDIUM_DRONE_OPERATION,
  HEAVY_DRONE_OPERATION,
];

const DRONES = toTypeId("3436");

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
    orbitRange: 1000,
    cycleTime: 4,
    bandwidth: 5,
    volume: 5,
    metaLevel: 5,
    metaGroupID: 2,
    requiredSkillIds: [DRONES, LIGHT_DRONE_OPERATION.skillId],
    id: toTypeId("2456"),
    name: "Hobgoblin II",
    ...overrides,
  };
}

function model(skillBonuses: readonly SkillBonus[] = ALL_DRONE_SKILL_BONUSES): DroneSkillModelImpl {
  return new DroneSkillModelImpl({ skillBonuses });
}

function hullBonus(attribute: string, magnitude: number, scalesWithHullSkill = false): HullBonus {
  return { attribute: attribute as HullBonus["attribute"], magnitude, scalesWithHullSkill };
}

describe("DroneSkillModelImpl", () => {
  test("skill level 0 returns base drone stats with no skill bonus", () => {
    const result = model().compute(drone(), [], 0);
    expect(result.damageMultiplier).toBe(1.92);
    expect(result.tracking).toBe(2.178);
    expect(result.optimal).toBe(1500);
    expect(result.falloff).toBe(500);
    expect(result.maxVelocity).toBe(3360);
    expect(result.skillDamageMultiplier).toBe(1);
    expect(result.hullDamageMultiplier).toBe(1);
  });

  test("applies interfacing and size-operation bonuses from the drone skill chain (pyfa golden: Acolyte II 3.465)", () => {
    const acolyte = drone({ damageMultiplier: 1.68, requiredSkillIds: [DRONES, toTypeId("12484"), LIGHT_DRONE_OPERATION.skillId] });
    const result = model().compute(acolyte, [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(2.0625, 9);
    expect(result.damageMultiplier).toBeCloseTo(3.465, 9);
    expect(result.skillDamageIds).toEqual([DRONE_INTERFACING.skillId, AMARR_SPECIALIZATION.skillId, LIGHT_DRONE_OPERATION.skillId]);
  });

  test("tech 1 drone without specialization gets interfacing and size operation only (pyfa golden: Acolyte I 2.625)", () => {
    const acolyte = drone({ damageMultiplier: 1.4, requiredSkillIds: [DRONES, LIGHT_DRONE_OPERATION.skillId] });
    const result = model().compute(acolyte, [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(1.875, 9);
    expect(result.damageMultiplier).toBeCloseTo(2.625, 9);
  });

  test("civilian drone without operation skill gets interfacing only (pyfa golden: Civilian Hobgoblin 2.4)", () => {
    const civilian = drone({ damageMultiplier: 1.6, requiredSkillIds: [DRONES] });
    const result = model().compute(civilian, [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(1.5, 9);
    expect(result.damageMultiplier).toBeCloseTo(2.4, 9);
  });

  test("drone requiring two specializations gets both bonuses (pyfa golden: Aralez 2.26875)", () => {
    const aralez = drone({ damageMultiplier: 1, requiredSkillIds: [DRONES, GALLENTE_SPECIALIZATION.skillId, CALDARI_SPECIALIZATION.skillId, toTypeId("33699")] });
    const result = model().compute(aralez, [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(2.26875, 9);
  });

  test("sentry drone uses its own chain for sentry interfacing (pyfa golden: Curator II 3.196875)", () => {
    const curator = drone({ sizeClass: "sentry", damageMultiplier: 1.55, requiredSkillIds: [DRONES, toTypeId("12484"), SENTRY_DRONE_INTERFACING.skillId] });
    const result = model().compute(curator, [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(2.0625, 9);
    expect(result.damageMultiplier).toBeCloseTo(3.196875, 9);
  });

  test("operation skill bonus does not leak to drones outside the skill chain", () => {
    const result = model().compute(drone({ requiredSkillIds: [DRONES] }), [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(1.5, 9);
  });

  test("skill bonuses for other item families are ignored", () => {
    const result = model([TURRET_SKILL_BONUS, ...ALL_DRONE_SKILL_BONUSES]).compute(drone(), [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(1.875, 9);
  });

  test("Drone Sharpshooting adds 5% per level to optimal range for all drones", () => {
    const result = model().compute(drone({ optimal: 1000 }), [], 4);
    expect(result.optimal).toBeCloseTo(1000 * (1 + 0.05 * 4), 9);
  });

  test("Drone Navigation adds 5% per level to max velocity for all drones", () => {
    const result = model().compute(drone({ maxVelocity: 3000 }), [], 4);
    expect(result.maxVelocity).toBeCloseTo(3000 * (1 + 0.05 * 4), 9);
  });

  test("hull droneDamage bonus multiplies damage when the charge skill is in the chain", () => {
    const bonuses: HullBonus[] = [hullBonus("droneDamage", 10, true)];
    const result = model().compute(drone(), bonuses, 5);
    const expectedSkill = 1.875;
    const expectedHull = 1 + 10 * 5 / 100;
    expect(result.hullDamageMultiplier).toBeCloseTo(expectedHull, 9);
    expect(result.damageMultiplier).toBeCloseTo(1.92 * expectedSkill * expectedHull, 9);
  });

  test("hull droneDamage bonus filtered by a skill outside the chain is ignored (heavy bonus on light drone)", () => {
    const bonuses: HullBonus[] = [{ attribute: "droneDamage", magnitude: 10, scalesWithHullSkill: true, chargeSkillId: HEAVY_DRONE_OPERATION.skillId }];
    const result = model().compute(drone(), bonuses, 5);
    expect(result.hullDamageMultiplier).toBe(1);
  });

  test("hull droneDamage bonus filtered by heavy drone operation applies to heavy drones (pyfa golden: Ishtar Ogre II)", () => {
    const ogre = drone({ sizeClass: "heavy", damageMultiplier: 1.92, requiredSkillIds: [DRONES, HEAVY_DRONE_OPERATION.skillId, toTypeId("12485")] });
    const ishtarBonuses: HullBonus[] = [
      { attribute: "droneDamage", magnitude: 10, scalesWithHullSkill: true, chargeSkillId: HEAVY_DRONE_OPERATION.skillId },
      { attribute: "droneDamage", magnitude: 10, scalesWithHullSkill: true, chargeSkillId: LIGHT_DRONE_OPERATION.skillId },
      { attribute: "droneDamage", magnitude: 10, scalesWithHullSkill: true, chargeSkillId: toTypeId("33699") },
    ];
    const result = model().compute(ogre, ishtarBonuses, 5);
    expect(result.damageMultiplier).toBeCloseTo(5.94, 9);
  });

  test("flat role hull bonus applies unscaled (pyfa golden: Rattlesnake Ogre II)", () => {
    const ogre = drone({ sizeClass: "heavy", damageMultiplier: 1.92, requiredSkillIds: [DRONES, HEAVY_DRONE_OPERATION.skillId, toTypeId("12485")] });
    const rattlesnakeBonuses: HullBonus[] = [
      { attribute: "droneDamage", magnitude: 275, scalesWithHullSkill: false, chargeSkillId: HEAVY_DRONE_OPERATION.skillId },
    ];
    const result = model().compute(ogre, rattlesnakeBonuses, 5);
    expect(result.hullDamageMultiplier).toBeCloseTo(3.75, 9);
    expect(result.damageMultiplier).toBeCloseTo(14.85, 9);
  });

  test("subsystem droneDamage bonuses are attributed per source id", () => {
    const bonuses: HullBonus[] = [
      { attribute: "droneDamage", magnitude: 10, scalesWithHullSkill: true, chargeSkillId: toTypeId("3436"), sourceId: toTypeId("45605") },
      { attribute: "droneDamage", magnitude: 5, scalesWithHullSkill: true, chargeSkillId: toTypeId("3436"), sourceId: toTypeId("45599") },
    ];
    const result = model().compute(drone(), bonuses, 4);
    const expectedSkill = 1.4 * 1.2;
    expect(result.hullDamageMultiplier).toBe(1);
    expect(result.subsystemDamageMultipliers).toEqual([
      { sourceId: toTypeId("45605"), multiplier: 1.4 },
      { sourceId: toTypeId("45599"), multiplier: 1.2 },
    ]);
    expect(result.damageMultiplier).toBeCloseTo(1.92 * expectedSkill * 1.4 * 1.2, 9);
  });

  test("non-droneDamage hull bonuses are ignored", () => {
    const bonuses: HullBonus[] = [hullBonus("turretDamage", 10, true)];
    const result = model().compute(drone(), bonuses, 5);
    expect(result.hullDamageMultiplier).toBe(1);
  });
});
