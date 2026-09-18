import { toTypeId } from "../gamedata/ids";
import type { RigDrawback, RigDrawbackReduction, SkillBonus } from "../gamedata/fittingDb";
import { type SkillLevel } from "../ships";
import { applyRigDrawbackReduction, moduleSkillMultiplier } from "./skillMultiplier";

const TURRET_MODULE_SKILLS = ["3300", "3306"].map((id) => toTypeId(id));

function bonus(overrides: Partial<SkillBonus>): SkillBonus {
  return { skillId: toTypeId("3316"), bonusType: "capUse", magnitudePerLevel: -5, appliesTo: "module", ...overrides };
}

describe("moduleSkillMultiplier", () => {
  test("returns 1 when no bonus matches the requested bonus type", () => {
    const bonuses = [bonus({ bonusType: "turretDamage" })];
    expect(moduleSkillMultiplier(bonuses, TURRET_MODULE_SKILLS, "capUse", 5 as SkillLevel)).toBe(1);
  });

  test("ignores charge-scoped bonuses", () => {
    const bonuses = [bonus({ appliesTo: "charge" })];
    expect(moduleSkillMultiplier(bonuses, TURRET_MODULE_SKILLS, "capUse", 5 as SkillLevel)).toBe(1);
  });

  test("applies only bonuses whose required skill is among the module's required skills", () => {
    const bonuses = [bonus({ skillId: toTypeId("3316"), requiredSkillId: toTypeId("3300") }), bonus({ skillId: toTypeId("3435"), requiredSkillId: toTypeId("3435") })];
    expect(moduleSkillMultiplier(bonuses, TURRET_MODULE_SKILLS, "capUse", 5 as SkillLevel)).toBe(0.75);
  });

  test("applies unfiltered bonuses", () => {
    const bonuses = [bonus({})];
    expect(moduleSkillMultiplier(bonuses, TURRET_MODULE_SKILLS, "capUse", 5 as SkillLevel)).toBe(0.75);
  });

  test("skips group-scoped bonuses when no module group is given", () => {
    const bonuses = [bonus({ moduleGroupId: 53 })];
    expect(moduleSkillMultiplier(bonuses, TURRET_MODULE_SKILLS, "capUse", 5 as SkillLevel)).toBe(1);
  });

  test("applies group-scoped bonuses only for the matching group", () => {
    const bonuses = [bonus({ moduleGroupId: 53 }), bonus({ skillId: toTypeId("3435"), requiredSkillId: toTypeId("3435"), moduleGroupId: 65 })];
    expect(moduleSkillMultiplier(bonuses, TURRET_MODULE_SKILLS, "capUse", 5 as SkillLevel, 53)).toBe(0.75);
  });

  test("scales magnitude per skill level", () => {
    const bonuses = [bonus({})];
    expect(moduleSkillMultiplier(bonuses, TURRET_MODULE_SKILLS, "capUse", 0 as SkillLevel)).toBe(1);
    expect(moduleSkillMultiplier(bonuses, TURRET_MODULE_SKILLS, "capUse", 3 as SkillLevel)).toBe(0.85);
  });

  test("multiplies all matching bonuses", () => {
    const bonuses = [
      bonus({ skillId: toTypeId("3450"), magnitudePerLevel: -10, requiredSkillId: toTypeId("3450") }),
      bonus({ skillId: toTypeId("3451"), magnitudePerLevel: -10, requiredSkillId: toTypeId("3450") }),
    ];
    expect(moduleSkillMultiplier(bonuses, ["3450"].map((id) => toTypeId(id)), "capUse", 5 as SkillLevel)).toBe(0.25);
  });

  test("returns 1 for duration bonuses when none are required", () => {
    const bonuses = [bonus({ skillId: toTypeId("3450"), bonusType: "duration", magnitudePerLevel: -5, requiredSkillId: toTypeId("3450") })];
    expect(moduleSkillMultiplier(bonuses, ["3450"].map((id) => toTypeId(id)), "duration", 5 as SkillLevel)).toBe(0.75);
    expect(moduleSkillMultiplier(bonuses, TURRET_MODULE_SKILLS, "duration", 5 as SkillLevel)).toBe(1);
  });
});

describe("applyRigDrawbackReduction", () => {
  const shieldDrawback: RigDrawback = { kind: "signature", percent: 10, groupId: 774 };
  const armorDrawback: RigDrawback = { kind: "agility", percent: 10, groupId: 773 };
  const reductions: readonly RigDrawbackReduction[] = [
    { skillId: toTypeId("26261"), groupId: 774, magnitudePerLevel: -10 },
    { skillId: toTypeId("26253"), groupId: 773, magnitudePerLevel: -10 },
  ];

  test("no reduction at skill level 0", () => {
    expect(applyRigDrawbackReduction(shieldDrawback, reductions, 0)).toBe(10);
  });

  test("shield rigging 5 reduces signature drawback by 50%", () => {
    expect(applyRigDrawbackReduction(shieldDrawback, reductions, 5)).toBe(5);
  });

  test("armor rigging 5 reduces agility drawback by 50%", () => {
    expect(applyRigDrawbackReduction(armorDrawback, reductions, 5)).toBe(5);
  });

  test("no matching reduction returns original percent", () => {
    const navDrawback: RigDrawback = { kind: "signature", percent: 10, groupId: 782 };
    expect(applyRigDrawbackReduction(navDrawback, reductions, 5)).toBe(10);
  });

  test("empty reductions returns original percent", () => {
    expect(applyRigDrawbackReduction(shieldDrawback, [], 5)).toBe(10);
  });
});
