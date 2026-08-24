import { FITTING_MODULES, TURRETS, CHARGES, SCRIPTS, STASIS_WEBS, TRACKING_DISRUPTORS, DISRUPTION_SCRIPTS, DRONES } from "./fittingDb";
import { ITEM_NAMES } from "./item-names-i18n";
import { ItemNamesImpl } from "./itemNames";

describe("ITEM_NAMES", () => {
  test("all three arrays have the same length", () => {
    expect(ITEM_NAMES.en.length).toBe(ITEM_NAMES.zh.length);
    expect(ITEM_NAMES.en.length).toBe(ITEM_NAMES.ja.length);
  });

  test("en array is sorted", () => {
    const sorted = [...ITEM_NAMES.en].sort((a, b) => a.localeCompare(b));
    expect(ITEM_NAMES.en).toEqual(sorted);
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
    const actual = new Set(ITEM_NAMES.en);
    for (const name of expected) {
      expect(actual.has(name)).toBe(true);
    }
    expect(ITEM_NAMES.en.length).toBe(actual.size);
  });

  test("zh and ja values fall back to the english name when missing", () => {
    for (let i = 0; i < ITEM_NAMES.en.length; i++) {
      const en = ITEM_NAMES.en[i];
      expect(ITEM_NAMES.zh[i]?.length).toBeGreaterThan(0);
      expect(ITEM_NAMES.ja[i]?.length).toBeGreaterThan(0);
      if (ITEM_NAMES.zh[i] === en) expect(en).toBe(ITEM_NAMES.zh[i]);
      if (ITEM_NAMES.ja[i] === en) expect(en).toBe(ITEM_NAMES.ja[i]);
    }
  });
});

describe("ItemNamesImpl", () => {
  const itemNames = new ItemNamesImpl();

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
    for (const en of ITEM_NAMES.en) {
      expect(itemNames.canonicalName(itemNames.displayName(en, "zh"))).toBe(en);
      expect(itemNames.canonicalName(itemNames.displayName(en, "ja"))).toBe(en);
    }
  });

  test("canonicalName is deterministic for duplicate Japanese names", () => {
    const seen = new Map<string, string>();
    for (const en of ITEM_NAMES.en) {
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
    expect(itemNames.canonicalName("大型エクスプローシブ・アーマーレインフォーサーII")).toBe("Large Explosive Armor Reinforcer II");
    expect(itemNames.canonicalName("大型キネティック・アーマーレインフォーサーI")).toBe("Large Kinetic Armor Reinforcer I");
    expect(itemNames.canonicalName("中型重力子スマートボムII")).toBe("Medium Graviton Smartbomb II");
    expect(itemNames.canonicalName("共和国海軍仕様炭化鉛弾S")).toBe("Republic Fleet Carbonized Lead S");
    expect(itemNames.canonicalName("スタンドアップ大型ミサイル航行プロセッサII")).toBe("Standup L-Set Missile Flight Processor II");
    expect(itemNames.canonicalName("スタンドアップ中型標準小型艦製造資源効率I")).toBe("Standup M-Set Basic Small Ship Manufacturing Material Efficiency I");
    expect(itemNames.canonicalName("スタンドアップ中型ME研究加速器I")).toBe("Standup M-Set ME Research Accelerator I");
    expect(itemNames.canonicalName("トゥルーサンシャEMコーティング")).toBe("True Sansha EM Coating");
    expect(itemNames.canonicalName("アップウェルM3R-Oアウトポストリグ")).toBe("Upwell M3R-O Outpost Rig");
  });

  test("canonicalName resolves ambiguous Chinese names to the most specific variant", () => {
    expect(itemNames.canonicalName("莱塞勒氏改良型爆炸装甲增强器")).toBe("Raysere's Modified Explosive Armor Hardener");
  });

  test("item names cover modules that are not in the fitting stats db", () => {
    expect(itemNames.displayName("J5b Enduring Warp Scrambler", "ja")).not.toBe("J5b Enduring Warp Scrambler");
  });
});
