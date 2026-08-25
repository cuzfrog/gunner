import { StaticShipProfileCatalog } from "../gamedata/shipProfiles";
import { HULL_TIERS, hullTierOf } from "./tiers";

const catalog = new StaticShipProfileCatalog();

describe("HULL_TIERS", () => {
  test("covers every hull type in the profile data", () => {
    for (const profile of catalog.all()) {
      expect(HULL_TIERS).toHaveProperty(profile.hullType);
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
