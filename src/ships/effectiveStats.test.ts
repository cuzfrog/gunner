import { effectiveStats } from "./effectiveStats";
import { fittingOptions } from "./fitting";
import type { ShipProfile } from "./types";

const frigate: ShipProfile = {
  name: "Test Frigate",
  faction: "Test",
  hullType: "Standard Frigates",
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 400,
  sigRadius: 35,
};

const battleship: ShipProfile = {
  name: "Test Battleship",
  faction: "Test",
  hullType: "Standard Battleships",
  mass: 100_000_000,
  inertiaModifier: 0.14,
  baseSpeed: 100,
  sigRadius: 470,
};

describe("effectiveStats", () => {
  test("returns base hull values without a module", () => {
    expect(effectiveStats(frigate)).toEqual({
      mass: 1_000_000,
      inertiaModifier: 3,
      maxSpeed: 400,
      sigRadius: 35,
    });
  });

  test("frigate with 5MN MWD reaches six times speed, mass and signature", () => {
    const mwd5 = fittingOptions(frigate).find((m) => m.id === "mwd-5mn")!;
    const stats = effectiveStats(frigate, mwd5);
    expect(stats.maxSpeed).toBeCloseTo(2400, 0);
    expect(stats.mass).toBe(3_500_000);
    expect(stats.inertiaModifier).toBe(3);
    expect(stats.sigRadius).toBe(210);
  });

  test("frigate with 1MN AB adds only module mass and a modest speed bonus", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = effectiveStats(frigate, ab1);
    expect(stats.maxSpeed).toBeCloseTo(860, 0);
    expect(stats.mass).toBe(1_500_000);
    expect(stats.sigRadius).toBe(35);
  });

  test("frigate with an overfit 10MN AB gains a larger speed bonus and more mass", () => {
    const ab10 = fittingOptions(frigate).find((m) => m.id === "ab-10mn")!;
    const stats = effectiveStats(frigate, ab10);
    expect(stats.maxSpeed).toBeCloseTo(1550, 0);
    expect(stats.mass).toBe(6_000_000);
  });

  test("battleship with 500MN MWD follows the same rules at capital scale", () => {
    const mwd500 = fittingOptions(battleship).find((m) => m.id === "mwd-500mn")!;
    const stats = effectiveStats(battleship, mwd500);
    expect(stats.maxSpeed).toBeCloseTo(600, 0);
    expect(stats.mass).toBe(350_000_000);
  });
});
