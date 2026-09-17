import { buildFactionNameI18n, buildHullTypeNameI18n, buildShipNameI18n, type I18nProfile } from "./generate-name-i18n";

const rifter: I18nProfile = {
  id: "587" as I18nProfile["id"],
  name: "Rifter",
  faction: "Minmatar Republic",
  factionId: "minmatar-republic" as I18nProfile["factionId"],
  hullType: "Standard Frigates",
  hullTypeId: "25" as I18nProfile["hullTypeId"],
};

const absolution: I18nProfile = {
  id: "22448" as I18nProfile["id"],
  name: "Absolution",
  faction: "Amarr Empire",
  factionId: "amarr-empire" as I18nProfile["factionId"],
  hullType: "Standard Battleships",
  hullTypeId: "811" as I18nProfile["hullTypeId"],
};

const pack = {
  en: "Rifter",
  zh: "裂谷级",
  ja: "リフター",
};

describe("buildShipNameI18n", () => {
  test("rekeys by ship id and fills missing localizations with the canonical name", () => {
    const result = buildShipNameI18n([rifter, absolution], {
      Rifter: pack,
      Absolution: { en: "Absolution", zh: "", ja: "" },
    });
    expect(result["587" as I18nProfile["id"]]).toEqual({ en: "Rifter", zh: "裂谷级", ja: "リフター" });
    expect(result["22448" as I18nProfile["id"]]).toEqual({ en: "Absolution", zh: "Absolution", ja: "Absolution" });
  });

  test("throws when a profile has no i18n entry", () => {
    expect(() => buildShipNameI18n([rifter], {} as Record<string, { en: string; zh: string; ja: string }>)).toThrow('Missing i18n entry for "Rifter" (Rifter).');
  });
});

describe("buildFactionNameI18n", () => {
  test("rekeys by faction id and deduplicates repeated factions", () => {
    const result = buildFactionNameI18n([rifter, absolution], {
      "Minmatar Republic": { en: "Minmatar Republic", zh: "米玛塔尔", ja: "ミンマター共和国" },
      "Amarr Empire": { en: "Amarr Empire", zh: "艾玛帝国", ja: "アマー帝国" },
    });
    expect(result["minmatar-republic" as I18nProfile["factionId"]]).toEqual({
      en: "Minmatar Republic",
      zh: "米玛塔尔",
      ja: "ミンマター共和国",
    });
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe("buildHullTypeNameI18n", () => {
  test("rekeys by hull type id and picks the standard base name", () => {
    const result = buildHullTypeNameI18n([rifter, absolution], {
      "Standard Frigates": { en: "Standard Frigates", zh: "护卫舰", ja: "フリゲート" },
      "Standard Battleships": { en: "Standard Battleships", zh: "战列舰", ja: "戦艦" },
    });
    expect(result["25" as I18nProfile["hullTypeId"]]).toEqual({
      en: "Standard Frigates",
      zh: "护卫舰",
      ja: "フリゲート",
    });
    expect(result["811" as I18nProfile["hullTypeId"]]).toEqual({
      en: "Standard Battleships",
      zh: "战列舰",
      ja: "戦艦",
    });
  });

  test("prefers the shortest non-standard name when no standard variant exists", () => {
    const titan: I18nProfile = { ...rifter, hullTypeId: "30" as I18nProfile["hullTypeId"], hullType: "Titans" };
    const pirateTitan: I18nProfile = { ...rifter, hullTypeId: "30" as I18nProfile["hullTypeId"], hullType: "Pirate Faction Titans" };
    const result = buildHullTypeNameI18n([titan, pirateTitan], {
      "Titans": { en: "Titans", zh: "泰坦", ja: "タイタン" },
      "Pirate Faction Titans": { en: "Pirate Faction Titans", zh: "海盗泰坦", ja: "海賊タイタン" },
    });
    expect(result["30" as I18nProfile["hullTypeId"]]).toEqual({
      en: "Titans",
      zh: "泰坦",
      ja: "タイタン",
    });
  });
});
