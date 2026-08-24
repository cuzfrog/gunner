import { FITTING_MODULES, TURRETS, CHARGES, SCRIPTS, STASIS_WEBS, TRACKING_DISRUPTORS, DISRUPTION_SCRIPTS, DRONES } from "./fittingDb";
import { ITEM_NAMES_EN } from "./item-names-en";
import { ITEM_NAMES_JA } from "./item-names-ja";
import { ITEM_NAMES_ZH } from "./item-names-zh";
import type { ShipNameLanguage } from "../ships";
import { ItemNamesImpl } from "./itemNames";

describe("ITEM_NAMES", () => {
  test("all three arrays have the same length", () => {
    expect(ITEM_NAMES_EN.length).toBe(ITEM_NAMES_ZH.length);
    expect(ITEM_NAMES_EN.length).toBe(ITEM_NAMES_JA.length);
  });

  test("en array is sorted", () => {
    const sorted = [...ITEM_NAMES_EN].sort((a, b) => a.localeCompare(b));
    expect(ITEM_NAMES_EN).toEqual(sorted);
  });

  test("fitting db names are present and there are no duplicates", () => {
    const expected = new Set([
      ...Object.keys(FITTING_MODULES),
      ...Object.keys(TURRETS),
      ...Object.keys(CHARGES),
      ...Object.keys(SCRIPTS),
      ...Object.keys(STASIS_WEBS),
      ...Object.keys(TRACKING_DISRUPTORS),
      ...Object.keys(DISRUPTION_SCRIPTS),
      ...Object.keys(DRONES),
    ]);
    const actual = new Set(ITEM_NAMES_EN);
    for (const name of expected) {
      expect(actual.has(name)).toBe(true);
    }
    expect(ITEM_NAMES_EN.length).toBe(actual.size);
  });

  test("zh and ja values fall back to the english name when missing", () => {
    for (let i = 0; i < ITEM_NAMES_EN.length; i++) {
      const en = ITEM_NAMES_EN[i];
      expect(ITEM_NAMES_ZH[i]?.length).toBeGreaterThan(0);
      expect(ITEM_NAMES_JA[i]?.length).toBeGreaterThan(0);
      if (ITEM_NAMES_ZH[i] === en) expect(en).toBe(ITEM_NAMES_ZH[i]);
      if (ITEM_NAMES_JA[i] === en) expect(en).toBe(ITEM_NAMES_JA[i]);
    }
  });
});

describe("ItemNamesImpl", () => {
  const itemNames = new ItemNamesImpl();

  beforeAll(async () => {
    await itemNames.ensureLanguage("zh");
    await itemNames.ensureLanguage("ja");
  });

  test("displayName returns the localized name for known entries", () => {
    const turret = "Heavy Pulse Laser II";
    expect(itemNames.displayName(turret, "en")).toBe(turret);
    expect(itemNames.displayName(turret, "zh")).toBe("重型脉冲激光器 II");
    expect(itemNames.displayName(turret, "ja")).toBe("大型パルスレーザーII");
  });

  test("displayName falls back to the input for unknown names", () => {
    expect(itemNames.displayName("Unknown Module", "zh")).toBe("Unknown Module");
  });

  test("canonicalName maps localized names back to english", () => {
    const turret = "Heavy Pulse Laser II";
    expect(itemNames.canonicalName(turret)).toBe(turret);
    expect(itemNames.canonicalName(itemNames.displayName(turret, "zh"))).toBe(turret);
    expect(itemNames.canonicalName(itemNames.displayName(turret, "ja"))).toBe(turret);
  });

  test("canonicalName returns the input for an unknown localized name", () => {
    expect(itemNames.canonicalName("未知模块")).toBe("未知模块");
  });

  test("canonical round-trips every name in the table", () => {
    for (const en of ITEM_NAMES_EN) {
      expect(itemNames.canonicalName(itemNames.displayName(en, "zh"))).toBe(en);
      expect(itemNames.canonicalName(itemNames.displayName(en, "ja"))).toBe(en);
    }
  });

  test("canonicalName is deterministic for duplicate Japanese names", () => {
    const seen = new Map<string, string>();
    for (const en of ITEM_NAMES_EN) {
      const ja = itemNames.displayName(en, "ja");
      const canon = itemNames.canonicalName(ja);
      const existing = seen.get(ja);
      if (existing !== undefined) expect(canon).toBe(existing);
      else seen.set(ja, canon);
    }
  });

  test("canonicalName resolves ambiguous Japanese names to the most specific variant", () => {
    expect(itemNames.canonicalName("ドミネーション炭化鉛弾XL")).toBe("Domination Carbonized Lead XL");
    expect(itemNames.canonicalName("デュアルアフォーカルパルスレーザーI")).toBe("Dual Afocal Pulse Laser I");
    expect(
      itemNames.canonicalName("大型エクスプローシブ・アーマーレインフォーサーII"),
    ).toBe("Large Explosive Armor Reinforcer II");
    expect(itemNames.canonicalName("大型キネティック・アーマーレインフォーサーI")).toBe(
      "Large Kinetic Armor Reinforcer I",
    );
    expect(itemNames.canonicalName("中型重力子スマートボムII")).toBe("Medium Graviton Smartbomb II");
    expect(itemNames.canonicalName("共和国海軍仕様炭化鉛弾S")).toBe("Republic Fleet Carbonized Lead S");
    expect(itemNames.canonicalName("トゥルーサンシャEMコーティング")).toBe("True Sansha EM Coating");
  });

  test("canonicalName resolves ambiguous Chinese names to the most specific variant", () => {
    expect(itemNames.canonicalName("莱塞勒氏改良型爆炸装甲增强器")).toBe(
      "Raysere's Modified Explosive Armor Hardener",
    );
  });

  test("item names cover modules that are not in the fitting stats db", () => {
    expect(itemNames.displayName("J5b Enduring Warp Scrambler", "ja")).not.toBe("J5b Enduring Warp Scrambler");
  });
});

describe("ItemNamesImpl lazy loading", () => {
  function buildLoader(expected: ShipNameLanguage, pack: readonly string[], overrides: Record<string, string> = {}) {
    let calls = 0;
    return {
      loader: async (language: ShipNameLanguage) => {
        calls++;
        if (language === expected) return { names: pack, overrides };
        return { names: [], overrides: {} };
      },
      getCallCount: () => calls,
    };
  }

  test("ensureLanguage loads a language pack and enables translation", async () => {
    const firstEn = ITEM_NAMES_EN[0];
    const { loader, getCallCount } = buildLoader("zh", ITEM_NAMES_ZH);
    const itemNames = new ItemNamesImpl({ itemNameLoader: loader });
    expect(itemNames.displayName(firstEn, "zh")).toBe(firstEn);
    await itemNames.ensureLanguage("zh");
    expect(itemNames.displayName(firstEn, "zh")).toBe(ITEM_NAMES_ZH[0]);
    expect(getCallCount()).toBe(1);
  });

  test("ensureLanguage is idempotent and shares in-flight loads", async () => {
    const firstEn = ITEM_NAMES_EN[0];
    let calls = 0;
    const loader = async (language: ShipNameLanguage) => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (language === "zh") return { names: ITEM_NAMES_ZH, overrides: {} };
      return { names: [], overrides: {} };
    };
    const itemNames = new ItemNamesImpl({ itemNameLoader: loader });
    const a = itemNames.ensureLanguage("zh");
    const b = itemNames.ensureLanguage("zh");
    await Promise.all([a, b]);
    expect(calls).toBe(1);
    expect(itemNames.displayName(firstEn, "zh")).toBe(ITEM_NAMES_ZH[0]);
  });

  test("ensureLanguage resolves immediately for English", async () => {
    let calls = 0;
    const loader = async (_language: ShipNameLanguage) => {
      calls++;
      return { names: [], overrides: {} };
    };
    const itemNames = new ItemNamesImpl({ itemNameLoader: loader });
    await itemNames.ensureLanguage("en");
    expect(calls).toBe(0);
  });

  test("ensureLanguage does not reject when the pack is empty", async () => {
    const loader = async (_language: ShipNameLanguage) => ({ names: [], overrides: {} });
    const itemNames = new ItemNamesImpl({ itemNameLoader: loader });
    await expect(itemNames.ensureLanguage("zh")).resolves.toBeUndefined();
  });

  test("canonicalName maps localized names after the pack loads", async () => {
    const firstEn = ITEM_NAMES_EN[0];
    const { loader } = buildLoader("zh", ITEM_NAMES_ZH);
    const itemNames = new ItemNamesImpl({ itemNameLoader: loader });
    await itemNames.ensureLanguage("zh");
    const zh = itemNames.displayName(firstEn, "zh");
    expect(itemNames.canonicalName(zh)).toBe(firstEn);
  });
});
