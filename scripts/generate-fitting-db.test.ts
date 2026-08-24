import { buildDisruptionScriptStats, buildStasisWebStats, buildTrackingDisruptorStats } from "./generate-fitting-db";

function values(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

describe("buildStasisWebStats", () => {
  test("returns undefined when required attributes are missing", () => {
    expect(buildStasisWebStats(values({ maxRange: 10000 }))).toBeUndefined();
    expect(buildStasisWebStats(values({ speedFactor: -50 }))).toBeUndefined();
  });

  test("builds a web from speed factor and range", () => {
    expect(buildStasisWebStats(values({ maxRange: 10000, speedFactor: -55 }))).toEqual({
      maxRange: 10000,
      speedFactorPercent: -55,
      overloadRangeBonusPercent: 0,
    });
  });

  test("preserves overload range bonus when present", () => {
    expect(buildStasisWebStats(values({ maxRange: 10000, speedFactor: -60, overloadRangeBonus: 30 }))).toEqual({
      maxRange: 10000,
      speedFactorPercent: -60,
      overloadRangeBonusPercent: 30,
    });
  });
});

describe("buildTrackingDisruptorStats", () => {
  test("returns undefined for guidance disruptors without trackingSpeedBonus", () => {
    expect(buildTrackingDisruptorStats(values({ maxRange: 48000, falloffEffectiveness: 24000 }))).toBeUndefined();
  });

  test("builds a tracking disruptor from weapon disruptor attributes", () => {
    expect(buildTrackingDisruptorStats(values({
      maxRange: 48000,
      falloffEffectiveness: 24000,
      trackingSpeedBonus: -17.19,
      overloadTrackingModuleStrengthBonus: 20,
    }))).toEqual({
      optimal: 48000,
      falloff: 24000,
      disruptionPercent: -17.19,
      overloadStrengthBonusPercent: 20,
    });
  });
});

describe("buildDisruptionScriptStats", () => {
  test("builds script deltas from bonus attributes", () => {
    expect(buildDisruptionScriptStats(values({
      trackingSpeedBonusBonus: -100,
      maxRangeBonusBonus: 100,
      falloffBonusBonus: 100,
    }))).toEqual({
      trackingDeltaBonus: -100,
      rangeDeltaBonus: 100,
      falloffDeltaBonus: 100,
    });
  });

  test("defaults missing deltas to zero", () => {
    expect(buildDisruptionScriptStats(values({}))).toEqual({
      trackingDeltaBonus: 0,
      rangeDeltaBonus: 0,
      falloffDeltaBonus: 0,
    });
  });
});
