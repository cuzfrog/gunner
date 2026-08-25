import { StaticNameI18nCatalog } from "./catalog";

const nameI18n = new StaticNameI18nCatalog();

describe("hullTypeName", () => {
  test("returns the localized hull type when available", () => {
    expect(nameI18n.hullTypeName("Standard Frigates", "zh")).toBe("护卫舰");
    expect(nameI18n.hullTypeName("Standard Frigates", "ja")).toBe("フリゲート");
    expect(nameI18n.hullTypeName("Standard Frigates", "en")).toBe("Standard Frigates");
  });

  test("falls back to the canonical hull type for unknown values", () => {
    expect(nameI18n.hullTypeName("Unknown Hull", "zh")).toBe("Unknown Hull");
  });
});

describe("factionName", () => {
  test("returns the localized faction when available", () => {
    expect(nameI18n.factionName("Minmatar Republic", "zh")).toBe("米玛塔尔");
    expect(nameI18n.factionName("Minmatar Republic", "ja")).toBe("ミンマター共和国");
    expect(nameI18n.factionName("Minmatar Republic", "en")).toBe("Minmatar Republic");
  });

  test("falls back to the canonical faction for unknown values", () => {
    expect(nameI18n.factionName("Unknown Faction", "zh")).toBe("Unknown Faction");
  });
});

describe("shipName", () => {
  test("returns the localized name when available", () => {
    expect(nameI18n.shipName("Rifter", "zh")).toBe("裂谷级");
    expect(nameI18n.shipName("Rifter", "ja")).toBe("リフター");
    expect(nameI18n.shipName("Rifter", "en")).toBe("Rifter");
  });

  test("falls back to the canonical name for empty localizations", () => {
    expect(nameI18n.shipName("Eidolon", "zh")).toBe("Eidolon");
    expect(nameI18n.shipName("Eidolon", "ja")).toBe("Eidolon");
    expect(nameI18n.shipName("Herald", "zh")).toBe("Herald");
  });

  test("falls back to the canonical name for unknown hulls", () => {
    expect(nameI18n.shipName("Not A Ship", "zh")).toBe("Not A Ship");
    expect(nameI18n.shipName("Not A Ship", "ja")).toBe("Not A Ship");
  });
});
