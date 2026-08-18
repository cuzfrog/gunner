import { SHIP_PROFILES } from "./profiles";
import { HULL_TIERS, _hullTierOf } from "./tiers";

describe("HULL_TIERS", () => {
  test("covers every hull type in the profile data", () => {
    for (const profile of SHIP_PROFILES) {
      expect(HULL_TIERS).toHaveProperty(profile.hullType);
    }
  });

  test("classifies representative ships by tier", () => {
    expect(_hullTierOf("Standard Frigates")).toBe("small");
    expect(_hullTierOf("Standard Cruisers")).toBe("medium");
    expect(_hullTierOf("Standard Battlecruisers")).toBe("medium");
    expect(_hullTierOf("Standard Battleships")).toBe("large");
    expect(_hullTierOf("Titans")).toBe("capital");
    expect(_hullTierOf("Shuttles")).toBeNull();
    expect(_hullTierOf("Special Edition Shuttles")).toBeNull();
  });

  test("returns null for an unknown hull type", () => {
    expect(_hullTierOf("Unknown Hulls")).toBeNull();
  });
});
