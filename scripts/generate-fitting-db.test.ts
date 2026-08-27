import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDisruptionScriptStats, buildStasisWebStats, buildTrackingComputerStats, buildTrackingDisruptorStats, buildWarpScramblerStats, _filterItemNames, _writeI18nFiles } from "./generate-fitting-db";

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

  test("includes published in-scope category items", () => {
    const itemNames = { "A": { en: "A", zh: "a", ja: "a" } };
    const idToType = new Map([["A", makeType({ published: 1, groupID: 1 })]]);
    const groups = { "1": { groupID: 1, categoryID: 7 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("A");
  });

  test("includes published structure modules (category 66 is in scope)", () => {
    const itemNames = { "Structure X": { en: "Structure X", zh: "x", ja: "x" } };
    const idToType = new Map([["Structure X", makeType({ published: 1, groupID: 2, typeName: "Structure X" })]]);
    const groups = { "2": { groupID: 2, categoryID: 66 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("Structure X");
  });

  test("includes unpublished in-scope items", () => {
    const itemNames = { "Unpublished Y": { en: "Unpublished Y", zh: "y", ja: "y" } };
    const idToType = new Map([["Unpublished Y", makeType({ published: 0, groupID: 1, typeName: "Unpublished Y" })]]);
    const groups = { "1": { groupID: 1, categoryID: 7 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("Unpublished Y");
  });

  test("includes fuel category items (category 4 is in scope)", () => {
    const itemNames = { "Nitrogen Isotopes": { en: "Nitrogen Isotopes", zh: "n", ja: "n" } };
    const idToType = new Map([["Nitrogen Isotopes", makeType({ published: 1, groupID: 3, typeName: "Nitrogen Isotopes" })]]);
    const groups = { "3": { groupID: 3, categoryID: 4 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("Nitrogen Isotopes");
  });

  test("includes deployable category items (category 22 is in scope)", () => {
    const itemNames = { "Mobile Depot": { en: "Mobile Depot", zh: "m", ja: "m" } };
    const idToType = new Map([["Mobile Depot", makeType({ published: 1, groupID: 4, typeName: "Mobile Depot" })]]);
    const groups = { "4": { groupID: 4, categoryID: 22 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("Mobile Depot");
  });

  test("excludes out-of-scope category items", () => {
    const itemNames = { "Out Of Scope": { en: "Out Of Scope", zh: "o", ja: "o" } };
    const idToType = new Map([["Out Of Scope", makeType({ published: 1, groupID: 5, typeName: "Out Of Scope" })]]);
    const groups = { "5": { groupID: 5, categoryID: 1 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).not.toContain("Out Of Scope");
  });

  test("includes names that are keys of emitted fittingDb tables", () => {
    const itemNames = { "Table Key": { en: "Table Key", zh: "table", ja: "table" } };
    const idToType = new Map([["Table Key", makeType({ published: 0, groupID: 1, typeName: "Table Key" })]]);
    const groups = { "1": { groupID: 1, categoryID: 7 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set(["Table Key"]));
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

describe("buildTrackingComputerStats", () => {
  test("returns undefined when tracking bonus is missing", () => {
    expect(buildTrackingComputerStats(values({}))).toBeUndefined();
  });

  test("builds a tracking computer from bonus attributes", () => {
    expect(buildTrackingComputerStats(values({ trackingSpeedBonus: 10, maxRangeBonus: 5, falloffBonus: 10 }))).toEqual({
      trackingBonusPercent: 10,
      optimalBonusPercent: 5,
      falloffBonusPercent: 10,
    });
  });

  test("defaults missing range and falloff bonuses to zero", () => {
    expect(buildTrackingComputerStats(values({ trackingSpeedBonus: 15 }))).toEqual({
      trackingBonusPercent: 15,
      optimalBonusPercent: 0,
      falloffBonusPercent: 0,
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

describe("_writeI18nFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "i18n-XXXXXX"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function filePaths() {
    return {
      enFile: join(tempDir, "item-names-en.ts"),
      zhFile: join(tempDir, "item-names-zh.ts"),
      jaFile: join(tempDir, "item-names-ja.ts"),
      collisionEnFile: join(tempDir, "item-name-collisions-en.ts"),
      collisionZhFile: join(tempDir, "item-name-collisions-zh.ts"),
      collisionJaFile: join(tempDir, "item-name-collisions-ja.ts"),
      canonicalOverrides: { en: {}, zh: {}, ja: {} },
    };
  }

  function parseExport(filePath: string, constName: string): unknown {
    const content = readFileSync(filePath, "utf8");
    const match = content.match(new RegExp(`export const ${constName}[^=]*=([\\s\\S]*?);`));
    if (!match) throw new Error(`Export ${constName} not found in ${filePath}`);
    return JSON.parse(match[1].trim());
  }

  test("sorts English names and keeps zh/ja records keyed by id", async () => {
    const itemNames = {
      B: { en: "B", zh: "b-zh", ja: "b-ja" },
      A: { en: "A", zh: "a-zh", ja: "a-ja" },
      C: { en: "C", zh: "c-zh", ja: "c-ja" },
    };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const en = parseExport(paths.enFile, "ITEM_NAMES_EN");
    const zh = parseExport(paths.zhFile, "ITEM_NAMES_ZH");
    const ja = parseExport(paths.jaFile, "ITEM_NAMES_JA");
    expect(en).toEqual({ A: "A", B: "B", C: "C" });
    expect(zh).toEqual({ A: "a-zh", B: "b-zh", C: "c-zh" });
    expect(ja).toEqual({ A: "a-ja", B: "b-ja", C: "c-ja" });
  });

  test("falls back to the English name when a localization is blank or missing", async () => {
    const itemNames = {
      B: { en: "B", zh: "b-zh" },
      A: { en: "A", zh: "", ja: "" },
      C: { en: "C", ja: "c-ja" },
    };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const en = parseExport(paths.enFile, "ITEM_NAMES_EN");
    const zh = parseExport(paths.zhFile, "ITEM_NAMES_ZH");
    const ja = parseExport(paths.jaFile, "ITEM_NAMES_JA");
    expect(en).toEqual({ A: "A", B: "B", C: "C" });
    expect(zh).toEqual({ A: "A", B: "b-zh", C: "C" });
    expect(ja).toEqual({ A: "A", B: "B", C: "c-ja" });
  });

  test("writes per-language collision tables", async () => {
    const itemNames = {
      A: { en: "A", zh: "same-zh", ja: "same-ja" },
      B: { en: "B", zh: "same-zh", ja: "same-ja" },
    };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const enCollisions = parseExport(paths.collisionEnFile, "ITEM_NAME_COLLISIONS_EN");
    const zhCollisions = parseExport(paths.collisionZhFile, "ITEM_NAME_COLLISIONS_ZH");
    const jaCollisions = parseExport(paths.collisionJaFile, "ITEM_NAME_COLLISIONS_JA");
    expect(enCollisions).toEqual({});
    expect(zhCollisions).toEqual({ "same-zh": "A" });
    expect(jaCollisions).toEqual({ "same-ja": "A" });
  });

  test("does not write collision tables in the item-name pack files", async () => {
    const itemNames = { A: { en: "A", zh: "a-zh", ja: "a-ja" } };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const zhContent = readFileSync(paths.zhFile, "utf8");
    expect(zhContent).not.toContain("COLLISIONS");
  });

  test("throws when a collision override maps to an unknown English name", async () => {
    const itemNames = { A: { en: "A", zh: "same-zh", ja: "same-ja" }, B: { en: "B", zh: "same-zh", ja: "same-ja" } };
    const paths = filePaths();
    paths.canonicalOverrides.zh = { "same-zh": "Unknown" };
    await expect(_writeI18nFiles(itemNames, "2026-08-24", paths)).rejects.toThrow(/same-zh/);
  });

  test("throws when a collision override matches a non-colliding name", async () => {
    const itemNames = { A: { en: "A", zh: "a-zh", ja: "a-ja" } };
    const paths = filePaths();
    paths.canonicalOverrides.zh = { "a-zh": "A" };
    await expect(_writeI18nFiles(itemNames, "2026-08-24", paths)).rejects.toThrow(/a-zh/);
  });

  test("puts the override target id first in the emitted collision table", async () => {
    const itemNames = { A: { en: "A", zh: "same-zh", ja: "same-ja" }, B: { en: "B", zh: "same-zh", ja: "same-ja" } };
    const paths = filePaths();
    paths.canonicalOverrides.zh = { "same-zh": "B" };
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const zhCollisions = parseExport(paths.collisionZhFile, "ITEM_NAME_COLLISIONS_ZH");
    expect(zhCollisions).toEqual({ "same-zh": "B" });
  });
});
