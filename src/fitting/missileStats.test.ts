import { MissileSkillModelImpl } from "./missileStats";
import type { HullBonus, LauncherStats, MissileStats } from "../gamedata/fittingDb";
import type { StackingPenalty } from "../sim";
import type { SkillLevel } from "../ships";
import { toTypeId } from "../gamedata/ids";

function launcher(rateOfFire: number, launcherGroup: number, chargeGroups: readonly number[] = [384]): LauncherStats {
  return { rateOfFire, launcherGroup, chargeGroups, id: toTypeId("499"), name: "Light Missile Launcher I" };
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
    id: toTypeId("258"),
    name: "Scourge Light Missile",
    ...overrides,
  };
}

const stacking = vi.mocked<StackingPenalty>({ apply: vi.fn((multipliers: readonly number[]) => multipliers.reduce((p, m) => p * m, 1)) });

function model(): MissileSkillModelImpl {
  return new MissileSkillModelImpl({ stackingPenalty: stacking });
}

beforeEach(() => {
  stacking.apply.mockReset();
  stacking.apply.mockImplementation((multipliers: readonly number[]) => multipliers.reduce((p, m) => p * m, 1));
});

describe("MissileSkillModelImpl", () => {
  test("skill level 0 returns base missile and launcher stats unchanged", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 0);
    expect(result.damagePerMissile).toBe(83);
    expect(result.cycleTime).toBe(16);
    expect(result.explosionRadius).toBe(50);
    expect(result.explosionVelocity).toBe(202);
    expect(result.maxVelocity).toBe(3750);
    expect(result.flightTime).toBe(5);
    expect(result.damageReductionFactor).toBe(2.0);
  });

  test("skill level 5 applies damage bonus from Warhead Upgrades (2%/lvl)", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 5);
    expect(result.damagePerMissile).toBeCloseTo(83 * (1 + 0.02 * 5), 6);
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
      { attribute: "missileDamage", magnitude: 5, skill: "Caldari Frigate", launcherGroup: 509 },
    ];
    stacking.apply.mockReturnValue(1.25);
    const result = model().compute(launcher(16, 509), missile(), bonuses, 5);
    expect(result.damagePerMissile).toBeCloseTo(83 * (1 + 0.02 * 5) * 1.25, 6);
  });

  test("hull missile damage bonus only applies when launcherGroup matches", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileDamage", magnitude: 5, skill: "Caldari Frigate", launcherGroup: 510 },
    ];
    const result = model().compute(launcher(16, 509), missile(), bonuses, 5);
    expect(result.damagePerMissile).toBeCloseTo(83 * (1 + 0.02 * 5), 6);
  });

  test("hull missile damage bonus applies when launcherGroup is absent (universal)", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileDamage", magnitude: 5, skill: "Caldari Cruiser" },
    ];
    stacking.apply.mockReturnValue(1.25);
    const result = model().compute(launcher(12, 510), missile({ launcherGroup: 510 }), bonuses, 5);
    expect(result.damagePerMissile).toBeCloseTo(83 * (1 + 0.02 * 5) * 1.25, 6);
  });

  test("hull missile ROF bonus is applied as a multiplier to cycle time", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileRoF", magnitude: -5, skill: "Minmatar Frigate", launcherGroup: 509 },
    ];
    stacking.apply.mockReturnValue(0.75);
    const result = model().compute(launcher(16, 509), missile(), bonuses, 5);
    const skillRof = (1 - 0.02 * 5) * (1 - 0.03 * 5);
    expect(result.cycleTime).toBeCloseTo(16 * skillRof * 0.75, 6);
  });

  test("hull missile ROF bonus only applies when launcherGroup matches", () => {
    const bonuses: readonly HullBonus[] = [
      { attribute: "missileRoF", magnitude: -5, skill: "Minmatar Frigate", launcherGroup: 510 },
    ];
    const result = model().compute(launcher(16, 509), missile(), bonuses, 5);
    const skillRof = (1 - 0.02 * 5) * (1 - 0.03 * 5);
    expect(result.cycleTime).toBeCloseTo(16 * skillRof, 6);
  });

  test("damageReductionFactor is passed through unchanged when already >= 1", () => {
    const result = model().compute(launcher(16, 509), missile({ damageReductionFactor: 3.2 }), [], 5);
    expect(result.damageReductionFactor).toBe(3.2);
  });

  test("damageReductionFactor is inverted when game data stores it < 1", () => {
    const result = model().compute(launcher(16, 509), missile({ damageReductionFactor: 0.604 }), [], 5);
    expect(result.damageReductionFactor).toBeCloseTo(1 / 0.604, 10);
  });

  test("damageReductionFactor of 1 stays 1 (no reduction)", () => {
    const result = model().compute(launcher(16, 509), missile({ damageReductionFactor: 1 }), [], 5);
    expect(result.damageReductionFactor).toBe(1);
  });

  test("skill level 3 applies partial bonuses", () => {
    const result = model().compute(launcher(16, 509), missile(), [], 3);
    expect(result.damagePerMissile).toBeCloseTo(83 * (1 + 0.02 * 3), 6);
    const rofMultiplier = (1 - 0.02 * 3) * (1 - 0.03 * 3);
    expect(result.cycleTime).toBeCloseTo(16 * rofMultiplier, 6);
    expect(result.explosionRadius).toBeCloseTo(50 * (1 - 0.05 * 3), 6);
  });
});
