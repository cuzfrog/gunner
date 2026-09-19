import { FighterSkillModelImpl } from "./fighterStats";
import type { FighterStats, HullBonus, SkillBonus } from "../gamedata/fittingDb";
import type { SkillLevel } from "../ships";
import { toTypeId } from "../gamedata/ids";

// Fighter skill bonus rows as emitted by scripts/generate-fitting-db.ts (magnitudes verified against
// pyfa), sorted by skillId like the generated SKILL_BONUSES table.
const FIGHTERS: SkillBonus = { skillId: toTypeId("23069"), bonusType: "fighterDamage", magnitudePerLevel: 5, requiredSkillId: toTypeId("23069"), appliesTo: "charge" };
const DRONE_INTERFACING: SkillBonus = { skillId: toTypeId("3442"), bonusType: "fighterDamage", magnitudePerLevel: 10, requiredSkillId: toTypeId("23069"), appliesTo: "charge" };
const DRONE_NAVIGATION: SkillBonus = { skillId: toTypeId("12305"), bonusType: "fighterVelocity", magnitudePerLevel: 5, requiredSkillId: toTypeId("23069"), appliesTo: "charge" };
const AMARR_HEAVY_FIGHTERS: SkillBonus = { skillId: toTypeId("92397"), bonusType: "fighterDamage", magnitudePerLevel: 2, requiredSkillId: toTypeId("92397"), appliesTo: "charge" };
const HEAVY_FIGHTERS: SkillBonus = { skillId: toTypeId("32339"), bonusType: "fighterDamage", magnitudePerLevel: 5, requiredSkillId: toTypeId("32339"), appliesTo: "charge" };
const DRONE_SHARPSHOOTING: SkillBonus = { skillId: toTypeId("23606"), bonusType: "fighterOptimal", magnitudePerLevel: 5, requiredSkillId: toTypeId("23069"), appliesTo: "charge" };
const LIGHT_FIGHTERS: SkillBonus = { skillId: toTypeId("40572"), bonusType: "fighterVelocity", magnitudePerLevel: 5, requiredSkillId: toTypeId("40572"), appliesTo: "charge" };
const TURRET_SKILL_BONUS: SkillBonus = { skillId: toTypeId("3306"), bonusType: "turretDamage", magnitudePerLevel: 5, requiredSkillId: toTypeId("3306"), appliesTo: "module" };

const ALL_FIGHTER_SKILL_BONUSES: readonly SkillBonus[] = [FIGHTERS, DRONE_INTERFACING, DRONE_NAVIGATION, AMARR_HEAVY_FIGHTERS, HEAVY_FIGHTERS, DRONE_SHARPSHOOTING, LIGHT_FIGHTERS];

const FIGHTERS_SKILL_ID = toTypeId("23069");
const LIGHT_FIGHTERS_SKILL_ID = toTypeId("40572");

function fighter(overrides: Partial<FighterStats> = {}): FighterStats {
  return {
    kind: "light",
    squadronMaxSize: 6,
    orbitRange: 6500,
    maxVelocity: 833,
    signatureRadius: 110,
    refuelingTime: 5,
    volume: 1000,
    attack: {
      emDamage: 97.5,
      thermalDamage: 0,
      kineticDamage: 0,
      explosiveDamage: 0,
      damageMultiplier: 1,
      cycleTime: 5,
      explosionRadius: 185,
      explosionVelocity: 105,
      damageReductionFactor: 3,
      damageReductionSensitivity: 5.5,
      optimal: 8000,
      falloff: 5000,
      numShots: 12,
      rearmTime: 4,
    },
    metaLevel: 0,
    metaGroupID: 1,
    requiredSkillIds: [FIGHTERS_SKILL_ID, LIGHT_FIGHTERS_SKILL_ID],
    id: toTypeId("23055"),
    name: "Templar I",
    ...overrides,
  };
}

function model(skillBonuses: readonly SkillBonus[] = ALL_FIGHTER_SKILL_BONUSES): FighterSkillModelImpl {
  return new FighterSkillModelImpl({ skillBonuses });
}

function hullBonus(attribute: string, magnitude: number, scalesWithHullSkill = false): HullBonus {
  return { attribute: attribute as HullBonus["attribute"], magnitude, scalesWithHullSkill };
}

describe("FighterSkillModelImpl", () => {
  test("skill level 0 returns base fighter stats with no skill bonus", () => {
    const result = model().compute(fighter(), [], 0);
    expect(result.damageMultiplier).toBe(1);
    expect(result.maxVelocity).toBe(833);
    expect(result.optimalMultiplier).toBe(1);
    expect(result.skillDamageMultiplier).toBe(1);
    expect(result.hullDamageMultiplier).toBe(1);
  });

  test("applies Fighters and Drone Interfacing damage bonuses from the skill chain (pyfa golden: Templar I 1.875 at all-5)", () => {
    const result = model().compute(fighter(), [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(1.875, 9);
    expect(result.damageMultiplier).toBeCloseTo(1.875, 9);
    expect(result.skillDamageIds).toEqual([FIGHTERS.skillId, DRONE_INTERFACING.skillId]);
  });

  test("heavy fighter on its racial specialization gets Fighters, Interfacing, Heavy Fighters and racial bonuses", () => {
    const amarrHeavy = fighter({ kind: "heavy", requiredSkillIds: [FIGHTERS_SKILL_ID, toTypeId("32339"), toTypeId("92397")] });
    const result = model().compute(amarrHeavy, [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(1.25 * 1.5 * 1.25 * 1.1, 9);
  });

  test("racial specialization bonus does not leak to fighters outside the chain", () => {
    const result = model().compute(fighter(), [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(1.875, 9);
  });

  test("Light Fighters and Drone Navigation multiply max velocity for light fighters", () => {
    const result = model().compute(fighter(), [], 5);
    expect(result.maxVelocity).toBeCloseTo(833 * 1.25 * 1.25, 9);
  });

  test("Drone Navigation velocity bonus applies to heavy fighters via the shared Fighters filter", () => {
    const amarrHeavy = fighter({ kind: "heavy", requiredSkillIds: [FIGHTERS_SKILL_ID, toTypeId("32339")] });
    const result = model().compute(amarrHeavy, [], 5);
    expect(result.maxVelocity).toBeCloseTo(833 * 1.25, 9);
  });

  test("Drone Sharpshooting multiplies optimal range but the skill model keeps falloff untouched", () => {
    const result = model().compute(fighter(), [], 4);
    expect(result.optimalMultiplier).toBeCloseTo(1.2, 9);
  });

  test("skill bonuses for other item families are ignored", () => {
    const result = model([TURRET_SKILL_BONUS, ...ALL_FIGHTER_SKILL_BONUSES]).compute(fighter(), [], 5);
    expect(result.skillDamageMultiplier).toBeCloseTo(1.875, 9);
  });

  test("hull fighterDamage bonus multiplies damage when the Fighters skill is in the chain (pyfa golden: Thanatos 1.25 per level)", () => {
    const bonuses: HullBonus[] = [{ attribute: "fighterDamage", magnitude: 5, scalesWithHullSkill: true, chargeSkillId: FIGHTERS_SKILL_ID }];
    const result = model().compute(fighter(), bonuses, 5);
    expect(result.hullDamageMultiplier).toBeCloseTo(1.25, 9);
    expect(result.damageMultiplier).toBeCloseTo(1.875 * 1.25, 9);
  });

  test("flat role hull fighterDamage bonus applies unscaled", () => {
    const bonuses: HullBonus[] = [{ attribute: "fighterDamage", magnitude: 20, scalesWithHullSkill: false, chargeSkillId: FIGHTERS_SKILL_ID }];
    const result = model().compute(fighter(), bonuses, 5);
    expect(result.hullDamageMultiplier).toBeCloseTo(1.2, 9);
  });

  test("hull fighterDamage bonus filtered by a skill outside the chain is ignored", () => {
    const bonuses: HullBonus[] = [{ attribute: "fighterDamage", magnitude: 5, scalesWithHullSkill: true, chargeSkillId: toTypeId("32339") }];
    const result = model().compute(fighter(), bonuses, 5);
    expect(result.hullDamageMultiplier).toBe(1);
  });

  test("subsystem-sourced fighterDamage rows are ignored (no SDE source emits them)", () => {
    const bonuses: HullBonus[] = [{ attribute: "fighterDamage", magnitude: 5, scalesWithHullSkill: true, chargeSkillId: FIGHTERS_SKILL_ID, sourceId: toTypeId("45605") }];
    const result = model().compute(fighter(), bonuses, 5);
    expect(result.hullDamageMultiplier).toBe(1);
  });

  test("non-fighterDamage hull bonuses are ignored", () => {
    const bonuses: HullBonus[] = [hullBonus("turretDamage", 10, true)];
    const result = model().compute(fighter(), bonuses, 5);
    expect(result.hullDamageMultiplier).toBe(1);
  });

  test("support fighters without an attack still compute movement multipliers", () => {
    const support = fighter({ kind: "support", attack: undefined, requiredSkillIds: [FIGHTERS_SKILL_ID, toTypeId("40573")] });
    const result = model().compute(support, [], 5);
    expect(result.damageMultiplier).toBe(1.875);
    expect(result.maxVelocity).toBeCloseTo(833 * 1.25, 9);
  });
});
