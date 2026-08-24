import { buildDisruptionScriptStats, buildStasisWebStats, buildTrackingDisruptorStats, buildWarpScramblerStats, _filterItemNames } from "./generate-fitting-db";

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

describe("_filterItemNames", () => {
  function makeType(overrides: { published: number; groupID: number; typeName?: string; typeID?: number }) {
    return {
      typeID: overrides.typeID ?? 1,
      "typeName_en-us": overrides.typeName ?? "Name",
      groupID: overrides.groupID,
      published: overrides.published,
    };
  }

  test("includes published fittable category items", () => {
    const itemNames = { "A": { zh: "a", ja: "a" } };
    const nameToType = new Map([["A", makeType({ published: 1, groupID: 1 })]]);
    const groups = { "1": { groupID: 1, categoryID: 7 } };
    const result = _filterItemNames(itemNames, nameToType, groups, new Set());
    expect(Object.keys(result)).toContain("A");
  });

  test("excludes published structure modules", () => {
    const itemNames = { "Structure X": { zh: "x", ja: "x" } };
    const nameToType = new Map([["Structure X", makeType({ published: 1, groupID: 2, typeName: "Structure X" })]]);
    const groups = { "2": { groupID: 2, categoryID: 66 } };
    const result = _filterItemNames(itemNames, nameToType, groups, new Set());
    expect(Object.keys(result)).not.toContain("Structure X");
  });

  test("excludes unpublished modules", () => {
    const itemNames = { "Unpublished Y": { zh: "y", ja: "y" } };
    const nameToType = new Map([["Unpublished Y", makeType({ published: 0, groupID: 1, typeName: "Unpublished Y" })]]);
    const groups = { "1": { groupID: 1, categoryID: 7 } };
    const result = _filterItemNames(itemNames, nameToType, groups, new Set());
    expect(Object.keys(result)).not.toContain("Unpublished Y");
  });

  test("includes names that are keys of emitted fittingDb tables", () => {
    const itemNames = { "Table Key": { zh: "table", ja: "table" } };
    const nameToType = new Map([["Table Key", makeType({ published: 0, groupID: 1, typeName: "Table Key" })]]);
    const groups = { "1": { groupID: 1, categoryID: 7 } };
    const result = _filterItemNames(itemNames, nameToType, groups, new Set(["Table Key"]));
    expect(Object.keys(result)).toContain("Table Key");
  });
});

describe("buildWarpScramblerStats", () => {
  test("returns undefined when propulsion block attribute is missing or non-positive", () => {
    expect(buildWarpScramblerStats(values({ maxRange: 9000 }))).toBeUndefined();
    expect(buildWarpScramblerStats(values({ activationBlockedStrenght: 0, maxRange: 9000 }))).toBeUndefined();
  });

  test("builds a warp scrambler from propulsion block, range, and overload bonus", () => {
    expect(buildWarpScramblerStats(values({ activationBlockedStrenght: 1, maxRange: 9000, overloadRangeBonus: 20 }))).toEqual({
      maxRange: 9000,
      overloadRangeBonusPercent: 20,
    });
  });

  test("defaults missing overload range bonus to zero", () => {
    expect(buildWarpScramblerStats(values({ activationBlockedStrenght: 1, maxRange: 7500 }))).toEqual({
      maxRange: 7500,
      overloadRangeBonusPercent: 0,
    });
  });

  test("returns undefined when range is missing", () => {
    expect(buildWarpScramblerStats(values({ activationBlockedStrenght: 1 }))).toBeUndefined();
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
