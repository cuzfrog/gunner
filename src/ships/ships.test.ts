import { ShipsImpl } from "./ships";
import { fittingOptions } from "./fitting";
import { fittedStats, maxSpeedForFittedMass } from "./effectiveStats";
import { SHIP_PROFILES } from "./profiles";
import type { FittedHull, PropulsionId, ShipProfile } from "./types";

const rifter = SHIP_PROFILES.find((p) => p.name === "Rifter")!;
const ab1 = fittingOptions(rifter).find((m) => m.id === "ab-1mn")!;
const mwd5 = fittingOptions(rifter).find((m) => m.id === "mwd-5mn")!;

describe("ShipsImpl", () => {
  const ships = new ShipsImpl();

  test("hulls returns a localized view for every ship profile", () => {
    const views = ships.hulls("en");
    expect(views.length).toBe(SHIP_PROFILES.length);
    expect(views[0]).toEqual({ name: "Abaddon", hullType: "Standard Battleships", faction: "Amarr Empire" });
  });

  test("hullView localizes the profile in the requested language", () => {
    expect(ships.hullView(rifter, "zh")).toEqual({ name: "裂谷级", hullType: "护卫舰", faction: "米玛塔尔" });
    expect(ships.hullView(rifter, "ja")).toEqual({ name: "リフター", hullType: "フリゲート", faction: "ミンマター共和国" });
  });

  test("findHull resolves canonical and localized names", () => {
    expect(ships.findHull("Rifter")?.name).toBe("Rifter");
    expect(ships.findHull("rifter")?.name).toBe("Rifter");
    expect(ships.findHull("  Rifter  ")?.name).toBe("Rifter");
    expect(ships.findHull("裂谷级")?.name).toBe("Rifter");
    expect(ships.findHull("リフター")?.name).toBe("Rifter");
    expect(ships.findHull("Not A Ship")).toBeUndefined();
  });

  test("parsePropulsionId returns the typed id for known modules and undefined otherwise", () => {
    expect(ships.parsePropulsionId("mwd-5mn")).toBe("mwd-5mn");
    expect(ships.parsePropulsionId("ab-1mn")).toBe("ab-1mn");
    expect(ships.parsePropulsionId("ab-5mn")).toBeUndefined();
    expect(ships.parsePropulsionId("")).toBeUndefined();
    expect(ships.parsePropulsionId(null)).toBeUndefined();
    expect(ships.parsePropulsionId(42)).toBeUndefined();
  });

  test("fittingOptions returns the modules eligible for the hull", () => {
    const options = ships.fittingOptions(rifter);
    expect(options.map((m) => m.id)).toEqual(["ab-1mn", "mwd-5mn", "ab-10mn"]);
  });

  test("fittingOption returns the requested module if it fits", () => {
    expect(ships.fittingOption(rifter, "mwd-5mn")).toEqual(mwd5);
    expect(ships.fittingOption(rifter, "ab-1mn")).toEqual(ab1);
    expect(ships.fittingOption(rifter, "mwd-500mn" as PropulsionId)).toBeUndefined();
  });

  test("fittedStats with undefined fitted delegates to the naked hull", () => {
    const expected = fittedStats(rifter, undefined, mwd5, { skillLevel: 5, overloaded: true });
    expect(ships.fittedStats(rifter, undefined, mwd5, { skillLevel: 5, overloaded: true })).toEqual(expected);
  });

  test("maxSpeedForFittedMass with undefined fitted matches the core at the active mass", () => {
    const stats = ships.fittedStats(rifter, undefined, mwd5, { skillLevel: 5, overloaded: true });
    const speed = ships.maxSpeedForFittedMass(rifter, undefined, stats.mass, mwd5, { skillLevel: 5, overloaded: true });
    expect(speed).toBeCloseTo(stats.maxSpeed, 6);
    expect(speed).toBeCloseTo(maxSpeedForFittedMass(rifter, undefined, stats.mass, mwd5, { skillLevel: 5, overloaded: true }), 6);
  });

  test("maxSpeedForFittedMass with undefined fitted returns a positive speed when the active mass is very low", () => {
    const speed = ships.maxSpeedForFittedMass(rifter, undefined, 0, mwd5, { skillLevel: 5, overloaded: true });
    expect(speed).toBeGreaterThan(0);
  });

  test("fittedStats with a fitted hull delegates to the exact core and includes multipliers", () => {
    const fitted: FittedHull = { mass: 1_250_000, massMultiplier: 1, speedMultiplier: 1.1, inertiaMultiplier: 0.9, sigMultiplier: 1, sigRadiusAdd: 15 };
    const expected = fittedStats(rifter, fitted, ab1, { skillLevel: 0, overloaded: false });
    expect(ships.fittedStats(rifter, fitted, ab1, { skillLevel: 0, overloaded: false })).toEqual(expected);
  });

  test("maxSpeedForFittedMass with a fitted hull matches the core at the active mass", () => {
    const fitted: FittedHull = { mass: 1_250_000, massMultiplier: 1, speedMultiplier: 1.1, inertiaMultiplier: 0.9, sigMultiplier: 1, sigRadiusAdd: 0 };
    const stats = ships.fittedStats(rifter, fitted, mwd5, { skillLevel: 0, overloaded: false });
    const speed = ships.maxSpeedForFittedMass(rifter, fitted, stats.mass, mwd5, { skillLevel: 0, overloaded: false });
    expect(speed).toBeCloseTo(stats.maxSpeed, 6);
    expect(speed).toBeCloseTo(maxSpeedForFittedMass(rifter, fitted, stats.mass, mwd5, { skillLevel: 0, overloaded: false }), 6);
  });
});
