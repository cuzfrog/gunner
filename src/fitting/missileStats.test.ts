import { MissileSkillModelImpl } from "./missileStats";
import type { HullBonus, LauncherStats, MissileStats, SkillBonus } from "../gamedata/fittingDb";
import { type StackingPenalty, damageVectorSum } from "../sim";
import type { SkillLevel } from "../ships";
import { toTypeId } from "../gamedata/ids";

const MLO_ID = toTypeId("3319");
const LIGHT_MISSILES_ID = toTypeId("3321");
const RAPID_LAUNCH_ID = toTypeId("21071");
const WARHEAD_UPGRADES_ID = toTypeId("20315");
const MISSILE_BOMBARDMENT_ID = toTypeId("12441");
const MISSILE_PROJECTION_ID = toTypeId("12442");
const GUIDED_PRECISION_ID = toTypeId("20312");
const TARGET_NAV_ID = toTypeId("20314");

const SKILL_BONUSES: readonly SkillBonus[] = [
  { skillId: MLO_ID, bonusType: "missileRoF", magnitudePerLevel: -2, appliesTo: "module", requiredSkillId: MLO_ID },
  { skillId: RAPID_LAUNCH_ID, bonusType: "missileRoF", magnitudePerLevel: -3, appliesTo: "module", requiredSkillId: MLO_ID },
  { skillId: LIGHT_MISSILES_ID, bonusType: "missileDamage", magnitudePerLevel: 5, appliesTo: "charge", requiredSkillId: LIGHT_MISSILES_ID },
  { skillId: WARHEAD_UPGRADES_ID, bonusType: "missileDamage", magnitudePerLevel: 2, appliesTo: "charge", requiredSkillId: MLO_ID },
  { skillId: MISSILE_BOMBARDMENT_ID, bonusType: "missileFlightTime", magnitudePerLevel: 10, appliesTo: "charge", requiredSkillId: MLO_ID },
  { skillId: MISSILE_PROJECTION_ID, bonusType: "missileVelocity", magnitudePerLevel: 10, appliesTo: "charge", requiredSkillId: MLO_ID },
  { skillId: GUIDED_PRECISION_ID, bonusType: "missileExplosionRadius", magnitudePerLevel: -5, appliesTo: "charge", requiredSkillId: MLO_ID },
  { skillId: TARGET_NAV_ID, bonusType: "missileExplosionVelocity", magnitudePerLevel: 10, appliesTo: "charge", requiredSkillId: MLO_ID },
];

function launcher(rateOfFire: number, launcherGroup: number, chargeGroups: readonly number[] = [384]): LauncherStats {
  return { rateOfFire, launcherGroup, chargeGroups, requiredSkillIds: [MLO_ID], metaLevel: 0, metaGroupID: 1, id: toTypeId("499"), name: "Light Missile Launcher I" };
}

function missile(overrides: Partial<MissileStats> = {}): MissileStats {
  return {
    damage: 83,
    damageType: "kinetic",
    explosionRadius: 50,
    explosionVelocity: 202,
    damageReductionFactor: 2.0,
    maxVelocity: 3750,
    flightTime: 5,
    launcherGroup: 509,
    chargeGroup: 384,
    requiredSkillIds: [MLO_ID, LIGHT_MISSILES_ID],
    id: toTypeId("258"),
    name: "Scourge Light Missile",
    ...overrides,
  };
}

const stacking = vi.mocked<StackingPenalty>({ apply: vi.fn((multipliers: readonly number[]) => multipliers.reduce((p, m) => p * m, 1)) });

function model(): MissileSkillModelImpl {
  return new MissileSkillModelImpl({ stackingPenalty: stacking, skillBonuses: SKILL_BONUSES });
}

beforeEach(() => {
  stacking.apply.mockReset();
  stacking.apply.mockImplementation((multipliers: readonly number[]) => multipliers.reduce((p, m) => p * m, 1));
});

describe("MissileSkillModelImpl", () => {
  test("skill level 0 returns base missile and launcher stats unchanged", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 0);
    expect(damageVectorSum(result.damagePerMissile)).toBe(83);
    expect(result.cycleTime).toBe(16);
    expect(result.explosionRadius).toBe(50);
    expect(result.explosionVelocity).toBe(202);
    expect(result.maxVelocity).toBe(3750);
    expect(result.flightTime).toBe(5);
    expect(result.damageReductionFactor).toBe(2.0);
  });

  test("skill level 5 applies damage bonus from Light Missiles + Warhead Upgrades", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 5);
    const damageMultiplier = (1 + 0.05 * 5) * (1 + 0.02 * 5);
    expect(damageVectorSum(result.damagePerMissile)).toBeCloseTo(83 * damageMultiplier, 6);
    expect(result.skillDamageIds).toContain(LIGHT_MISSILES_ID);
    expect(result.skillDamageIds).toContain(WARHEAD_UPGRADES_ID);
  });

  test("skill level 5 applies ROF bonus from Missile Launcher Operation + Rapid Launch (multiplicative)", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 5);
    const rofMultiplier = (1 - 0.02 * 5) * (1 - 0.03 * 5);
    expect(result.cycleTime).toBeCloseTo(16 * rofMultiplier, 6);
  });

  test("skill level 5 applies explosion radius bonus from Guided Missile Precision (-5%/lvl)", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 5);
    expect(result.explosionRadius).toBeCloseTo(50 * (1 - 0.05 * 5), 6);
  });

  test("skill level 5 applies explosion velocity bonus from Target Navigation Prediction (10%/lvl)", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 5);
    expect(result.explosionVelocity).toBeCloseTo(202 * (1 + 0.10 * 5), 6);
  });

  test("skill level 5 applies missile velocity bonus from Missile Projection (10%/lvl)", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 5);
    expect(result.maxVelocity).toBeCloseTo(3750 * (1 + 0.10 * 5), 6);
  });

  test("skill level 5 applies flight time bonus from Missile Bombardment (10%/lvl)", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 5);
    expect(result.flightTime).toBeCloseTo(5 * (1 + 0.10 * 5), 6);
  });

  test("hull missile damage bonus is applied via stacking penalty", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileDamage", magnitude: 5, scalesWithHullSkill: true, moduleGroupId: 509 },
    ];
    stacking.apply.mockReturnValue(1.25);
    const result = model().compute(launcher(16, 509), missile(), bonuses, 5);
    const skillDamageMultiplier = (1 + 0.05 * 5) * (1 + 0.02 * 5);
    expect(damageVectorSum(result.damagePerMissile)).toBeCloseTo(83 * skillDamageMultiplier * 1.25, 6);
  });

  test("hull missile damage bonus only applies when launcherGroup matches", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileDamage", magnitude: 5, scalesWithHullSkill: true, moduleGroupId: 510 },
    ];
    const result = model().compute(launcher(16, 509), missile(), bonuses, 5);
    const skillDamageMultiplier = (1 + 0.05 * 5) * (1 + 0.02 * 5);
    expect(damageVectorSum(result.damagePerMissile)).toBeCloseTo(83 * skillDamageMultiplier, 6);
  });

  test("hull missile damage bonus applies when launcherGroup is absent (universal)", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileDamage", magnitude: 5, scalesWithHullSkill: true },
    ];
    stacking.apply.mockReturnValue(1.25);
    const result = model().compute(launcher(12, 510), missile({ launcherGroup: 510 }), bonuses, 5);
    const skillDamageMultiplier = (1 + 0.05 * 5) * (1 + 0.02 * 5);
    expect(damageVectorSum(result.damagePerMissile)).toBeCloseTo(83 * skillDamageMultiplier * 1.25, 6);
  });

  test("hull missile ROF bonus is applied as a multiplier to cycle time", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileRoF", magnitude: -5, scalesWithHullSkill: true, moduleGroupId: 509 },
    ];
    stacking.apply.mockReturnValue(0.75);
    const result = model().compute(launcher(16, 509), missile(), bonuses, 5);
    const skillRof = (1 - 0.02 * 5) * (1 - 0.03 * 5);
    expect(result.cycleTime).toBeCloseTo(16 * skillRof * 0.75, 6);
  });

  test("hull missile ROF bonus only applies when launcherGroup matches", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileRoF", magnitude: -5, scalesWithHullSkill: true, moduleGroupId: 510 },
    ];
    const result = model().compute(launcher(16, 509), missile(), bonuses, 5);
    const skillRof = (1 - 0.02 * 5) * (1 - 0.03 * 5);
    expect(result.cycleTime).toBeCloseTo(16 * skillRof, 6);
  });

  test("damageReductionFactor is passed through unchanged", () => {
    const result = model().compute(launcher(16, 509), missile({ damageReductionFactor: 3.2 }), [], 5);
    expect(result.damageReductionFactor).toBe(3.2);
  });

  test("skill level 3 applies partial bonuses", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 3);
    const damageMultiplier = (1 + 0.05 * 3) * (1 + 0.02 * 3);
    expect(damageVectorSum(result.damagePerMissile)).toBeCloseTo(83 * damageMultiplier, 6);
    const rofMultiplier = (1 - 0.02 * 3) * (1 - 0.03 * 3);
    expect(result.cycleTime).toBeCloseTo(16 * rofMultiplier, 6);
    expect(result.explosionRadius).toBeCloseTo(50 * (1 - 0.05 * 3), 6);
  });

  test("skill bonus only applies when requiredSkillId matches launcher", () => {
    const result = model().compute(launcher(16, 509, [384]), missile({ requiredSkillIds: [MLO_ID] }), [], 5);
    const damageMultiplier = (1 + 0.02 * 5);
    expect(damageVectorSum(result.damagePerMissile)).toBeCloseTo(83 * damageMultiplier, 6);
  });

  test("skill bonus only applies when requiredSkillId matches missile", () => {
    const launcherWithoutMlo = launcher(16, 509);
    const missileWithoutLight = missile({ requiredSkillIds: [MLO_ID] });
    const result = model().compute(launcherWithoutMlo, missileWithoutLight, [], 5);
    expect(damageVectorSum(result.damagePerMissile)).toBeCloseTo(83 * (1 + 0.02 * 5), 6);
  });
});
