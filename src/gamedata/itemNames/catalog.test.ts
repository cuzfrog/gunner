import { FITTING_MODULES, TURRETS, CHARGES, SCRIPTS, STASIS_WEBS, TRACKING_DISRUPTORS, DISRUPTION_SCRIPTS, DRONES } from "../fittingDb";
import { ITEM_NAMES_EN } from "./item-names-en";
import { ITEM_NAMES_JA } from "./item-names-ja";
import { ITEM_NAMES_ZH } from "./item-names-zh";
import type { TypeId } from "../ids";
import { StaticItemNameCatalog } from "./catalog";

function fittingDbIds(): Set<string> {
  return new Set([
    ...Object.keys(FITTING_MODULES),
    ...Object.keys(TURRETS),
    ...Object.keys(CHARGES),
    ...Object.keys(SCRIPTS),
    ...Object.keys(STASIS_WEBS),
    ...Object.keys(TRACKING_DISRUPTORS),
    ...Object.keys(DISRUPTION_SCRIPTS),
    ...Object.keys(DRONES),
  ]);
}

function rowByName<T extends { readonly name: string }>(table: Readonly<Record<string, T>>, name: string): T | undefined {
  return Object.values(table).find((row) => row.name === name);
}

describe("ITEM_NAMES", () => {
  test("English record has non-empty unique names", () => {
    const values = Object.values(ITEM_NAMES_EN);
    expect(values.length).toBeGreaterThan(0);
    expect(new Set(values).size).toBe(values.length);
    for (const name of values) {
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test("fitting db rows have an English name entry", () => {
    const expected = fittingDbIds();
    for (const id of expected) {
      expect(ITEM_NAMES_EN[id]).toBeDefined();
      expect(ITEM_NAMES_EN[id].length).toBeGreaterThan(0);
    }
  });

  test("zh and ja values fall back to the english name when missing", () => {
    for (const [id, en] of Object.entries(ITEM_NAMES_EN)) {
      const zh = ITEM_NAMES_ZH[id] ?? en;
      const ja = ITEM_NAMES_JA[id] ?? en;
      expect(zh.length).toBeGreaterThan(0);
      expect(ja.length).toBeGreaterThan(0);
    }
  });
});

describe("StaticItemNameCatalog", () => {
  const catalog = new StaticItemNameCatalog();

  test("nameForId returns the localized name for known type ids", () => {
    const turret = rowByName(TURRETS, "Heavy Pulse Laser II")!;
    expect(catalog.nameForId(turret.id, "en")).toBe(turret.name);
    expect(catalog.nameForId(turret.id, "zh")).toBe("重型脉冲激光器 II");
    expect(catalog.nameForId(turret.id, "ja")).toBe("大型パルスレーザーII");
  });

  test("nameForId falls back to the type id for unknown ids", () => {
    const unknownId = "999999" as TypeId;
    expect(catalog.nameForId(unknownId, "zh")).toBe(unknownId);
  });

  test("nameForId resolves drone skill ids to localized names", () => {
    const droneSkillIds = ["3442", "24241", "33699", "3441", "23594"] as const;
    for (const id of droneSkillIds) {
      const en = catalog.nameForId(id as TypeId, "en");
      const zh = catalog.nameForId(id as TypeId, "zh");
      const ja = catalog.nameForId(id as TypeId, "ja");
      expect(en).not.toBe(id);
      expect(zh).not.toBe(id);
      expect(ja).not.toBe(id);
      expect(en.length).toBeGreaterThan(0);
      expect(zh.length).toBeGreaterThan(0);
      expect(ja.length).toBeGreaterThan(0);
    }
  });
});
