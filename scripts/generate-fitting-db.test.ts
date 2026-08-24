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
    };
  }

  function parseExport(filePath: string, constName: string): unknown {
    const content = readFileSync(filePath, "utf8");
    const match = content.match(new RegExp(`export const ${constName}[^=]*=([\\s\\S]*?);`));
    if (!match) throw new Error(`Export ${constName} not found in ${filePath}`);
    return JSON.parse(match[1].trim());
  }

  test("sorts English names and keeps zh/ja arrays index-aligned", async () => {
    const itemNames = {
      B: { zh: "b-zh", ja: "b-ja" },
      A: { zh: "a-zh", ja: "a-ja" },
      C: { zh: "c-zh", ja: "c-ja" },
    };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const en = parseExport(paths.enFile, "ITEM_NAMES_EN");
    const zh = parseExport(paths.zhFile, "ITEM_NAMES_ZH");
    const ja = parseExport(paths.jaFile, "ITEM_NAMES_JA");
    expect(en).toEqual(["A", "B", "C"]);
    expect(zh).toEqual(["a-zh", "b-zh", "c-zh"]);
    expect(ja).toEqual(["a-ja", "b-ja", "c-ja"]);
  });

  test("falls back to the English name when a localization is blank or missing", async () => {
    const itemNames = {
      B: { zh: "b-zh" },
      A: { zh: "", ja: "" },
      C: { ja: "c-ja" },
    };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const en = parseExport(paths.enFile, "ITEM_NAMES_EN");
    const zh = parseExport(paths.zhFile, "ITEM_NAMES_ZH");
    const ja = parseExport(paths.jaFile, "ITEM_NAMES_JA");
    expect(en).toEqual(["A", "B", "C"]);
    expect(zh).toEqual(["A", "b-zh", "C"]);
    expect(ja).toEqual(["A", "B", "c-ja"]);
  });

  test("writes override objects alongside zh and ja arrays", async () => {
    const itemNames = { A: { zh: "a-zh", ja: "a-ja" } };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const zh = parseExport(paths.zhFile, "ITEM_NAMES_ZH");
    const zhOverrides = parseExport(paths.zhFile, "ITEM_NAMES_ZH_OVERRIDES");
    const jaOverrides = parseExport(paths.jaFile, "ITEM_NAMES_JA_OVERRIDES");
    expect(zh).toEqual(["a-zh"]);
    expect(zhOverrides).toEqual({
      "莱塞勒氏改良型爆炸装甲增强器": "Raysere's Modified Explosive Armor Hardener",
    });
    expect(jaOverrides).toEqual({
      "ドミネーション炭化鉛弾XL": "Domination Carbonized Lead XL",
      "デュアルアフォーカルパルスレーザーI": "Dual Afocal Pulse Laser I",
      "大型エクスプローシブ・アーマーレインフォーサーII": "Large Explosive Armor Reinforcer II",
      "大型キネティック・アーマーレインフォーサーI": "Large Kinetic Armor Reinforcer I",
      "中型重力子スマートボムII": "Medium Graviton Smartbomb II",
      "共和国海軍仕様炭化鉛弾S": "Republic Fleet Carbonized Lead S",
      "トゥルーサンシャEMコーティング": "True Sansha EM Coating",
    });
  });

  test("does not write overrides in the English file", async () => {
    const itemNames = { A: { zh: "a-zh", ja: "a-ja" } };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const enContent = readFileSync(paths.enFile, "utf8");
    expect(enContent).not.toContain("OVERRIDES");
  });
});
