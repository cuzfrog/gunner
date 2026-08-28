import type { FactionId, HullTypeId, ShipId } from "../ids";
import { StaticNameI18nCatalog } from "./catalog";

const nameI18n = new StaticNameI18nCatalog();

const RIFTER_ID = "587" as ShipId;
const ABSOLUTION_ID = "22448" as ShipId;
const EIDOLON_ID = "legacy-eidolon" as ShipId;
const STANDARD_FRIGATES_ID = "25" as HullTypeId;
const MINMATAR_REPUBLIC_ID = "minmatar-republic" as FactionId;

describe("hullTypeName", () => {
  test("returns the localized hull type when available", () => {
    expect(nameI18n.hullTypeName(STANDARD_FRIGATES_ID, "zh")).toBe("护卫舰");
    expect(nameI18n.hullTypeName(STANDARD_FRIGATES_ID, "ja")).toBe("フリゲート");
    expect(nameI18n.hullTypeName(STANDARD_FRIGATES_ID, "en")).toBe("Standard Frigates");
  });

  test("returns undefined for unknown values", () => {
    expect(nameI18n.hullTypeName("unknown" as HullTypeId, "zh")).toBeUndefined();
  });
});

describe("factionName", () => {
  test("returns the localized faction when available", () => {
    expect(nameI18n.factionName(MINMATAR_REPUBLIC_ID, "zh")).toBe("米玛塔尔");
    expect(nameI18n.factionName(MINMATAR_REPUBLIC_ID, "ja")).toBe("ミンマター共和国");
    expect(nameI18n.factionName(MINMATAR_REPUBLIC_ID, "en")).toBe("Minmatar Republic");
  });

  test("returns undefined for unknown values", () => {
    expect(nameI18n.factionName("unknown" as FactionId, "zh")).toBeUndefined();
  });
});

describe("shipName", () => {
  test("returns the localized name when available", () => {
    expect(nameI18n.shipName(RIFTER_ID, "zh")).toBe("裂谷级");
    expect(nameI18n.shipName(RIFTER_ID, "ja")).toBe("リフター");
    expect(nameI18n.shipName(RIFTER_ID, "en")).toBe("Rifter");
  });

  test("falls back to the canonical name for legacy ids", () => {
    expect(nameI18n.shipName(EIDOLON_ID, "zh")).toBe("Eidolon");
    expect(nameI18n.shipName(EIDOLON_ID, "ja")).toBe("Eidolon");
  });

  test("returns undefined for unknown hulls", () => {
    expect(nameI18n.shipName("not-a-ship" as ShipId, "zh")).toBeUndefined();
  });
});
