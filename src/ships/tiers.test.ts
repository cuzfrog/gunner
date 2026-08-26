import { StaticShipProfileCatalog } from "../gamedata/shipProfiles";
import { StaticNameI18nCatalog } from "../gamedata/nameI18n";
import { HULL_TIERS, hullTierOf } from "./tiers";

const catalog = new StaticShipProfileCatalog();
const i18n = new StaticNameI18nCatalog();

describe("HULL_TIERS", () => {
  test("covers every hull type in the profile data", () => {
    for (const profile of catalog.all()) {
      const hullType = i18n.hullTypeName(profile.hullTypeId, "en");
      expect(hullType).not.toBeUndefined();
      expect(HULL_TIERS).toHaveProperty(hullType!);
    }
  });

  test("classifies representative ships by tier", () => {
    expect(hullTierOf("Standard Frigates")).toBe("small");
    expect(hullTierOf("Standard Cruisers")).toBe("medium");
    expect(hullTierOf("Standard Battlecruisers")).toBe("medium");
    expect(hullTierOf("Standard Battleships")).toBe("large");
    expect(hullTierOf("Titans")).toBe("capital");
    expect(hullTierOf("Shuttles")).toBeNull();
    expect(hullTierOf("Special Edition Shuttles")).toBeNull();
  });

  test("returns null for an unknown hull type", () => {
    expect(hullTierOf("Unknown Hulls")).toBeNull();
  });
});
