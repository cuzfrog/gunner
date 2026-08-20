import { factionDisplayName, findShipProfileByName, hullTypeDisplayName, shipDisplayName } from "./shipNames";

describe("hullTypeDisplayName", () => {
  test("returns the localized hull type when available", () => {
    expect(hullTypeDisplayName("Standard Frigates", "zh")).toBe("护卫舰");
    expect(hullTypeDisplayName("Standard Frigates", "ja")).toBe("フリゲート");
    expect(hullTypeDisplayName("Standard Frigates", "en")).toBe("Standard Frigates");
  });

  test("falls back to the canonical hull type for unknown values", () => {
    expect(hullTypeDisplayName("Unknown Hull", "zh")).toBe("Unknown Hull");
  });
});

describe("factionDisplayName", () => {
  test("returns the localized faction when available", () => {
    expect(factionDisplayName("Minmatar Republic", "zh")).toBe("米玛塔尔");
    expect(factionDisplayName("Minmatar Republic", "ja")).toBe("ミンマター共和国");
    expect(factionDisplayName("Minmatar Republic", "en")).toBe("Minmatar Republic");
  });

  test("falls back to the canonical faction for unknown values", () => {
    expect(factionDisplayName("Unknown Faction", "zh")).toBe("Unknown Faction");
  });
});

describe("shipDisplayName", () => {
  test("returns the localized name when available", () => {
    expect(shipDisplayName("Rifter", "zh")).toBe("裂谷级");
    expect(shipDisplayName("Rifter", "ja")).toBe("リフター");
    expect(shipDisplayName("Rifter", "en")).toBe("Rifter");
  });

  test("falls back to the canonical name for empty localizations", () => {
    expect(shipDisplayName("Eidolon", "zh")).toBe("Eidolon");
    expect(shipDisplayName("Eidolon", "ja")).toBe("Eidolon");
    expect(shipDisplayName("Herald", "zh")).toBe("Herald");
  });

  test("falls back to the canonical name for unknown hulls", () => {
    expect(shipDisplayName("Not A Ship", "zh")).toBe("Not A Ship");
    expect(shipDisplayName("Not A Ship", "ja")).toBe("Not A Ship");
  });
});

describe("findShipProfileByName", () => {
  test("resolves canonical English names", () => {
    expect(findShipProfileByName("Rifter")?.name).toBe("Rifter");
    expect(findShipProfileByName("Merlin")?.name).toBe("Merlin");
  });

  test("resolves Chinese names", () => {
    expect(findShipProfileByName("裂谷级")?.name).toBe("Rifter");
    expect(findShipProfileByName("小鹰级")?.name).toBe("Merlin");
  });

  test("resolves Japanese names", () => {
    expect(findShipProfileByName("リフター")?.name).toBe("Rifter");
    expect(findShipProfileByName("マーリン")?.name).toBe("Merlin");
  });

  test("is case-insensitive for Latin names", () => {
    expect(findShipProfileByName("rifter")?.name).toBe("Rifter");
    expect(findShipProfileByName("RIFTER")?.name).toBe("Rifter");
    expect(findShipProfileByName("  Rifter  ")?.name).toBe("Rifter");
  });

  test("ignores surrounding whitespace", () => {
    expect(findShipProfileByName("  裂谷级  ")?.name).toBe("Rifter");
  });

  test("returns undefined for unknown names", () => {
    expect(findShipProfileByName("Not A Ship")).toBeUndefined();
    expect(findShipProfileByName("")).toBeUndefined();
  });

  test("resolves Chinese collision to the first profile in SHIP_PROFILES order", () => {
    expect(findShipProfileByName("救赎级")?.name).toBe("Absolution");
  });

  test("gives canonical names priority over localized collisions", () => {
    expect(findShipProfileByName("Salvation")?.name).toBe("Salvation");
  });
});
