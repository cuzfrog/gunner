import { effectiveStats } from "./effectiveStats";
import { fittingOptions } from "./fitting";
import type { ShipProfile, SkillLevel, StatConditions } from "./types";

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

  test.each([[0, 400, 3], [1, 420, 2.793], [2, 440, 2.592], [3, 460, 2.397], [4, 480, 2.208], [5, 500, 2.025]] as const)(
    "hull-only skill level %i scales base speed and inertia",
    (level, expectedSpeed, expectedInertia) => {
      const stats = effectiveStats(frigate, undefined, conditions(level));
      expect(stats.maxSpeed).toBeCloseTo(expectedSpeed, 3);
      expect(stats.inertiaModifier).toBeCloseTo(expectedInertia, 3);
      expect(stats.mass).toBe(frigate.mass);
      expect(stats.sigRadius).toBe(frigate.sigRadius);
    },
  );

  test("afterburner with max skills and overload uses the worked example", () => {
    const profile: ShipProfile = {
      name: "Worked Example",
      faction: "Test",
      hullType: "Standard Frigates",
      mass: 1_150_000,
      inertiaModifier: 3,
      baseSpeed: 340,
      sigRadius: 35,
    };
    const ab1 = fittingOptions(profile).find((m) => m.id === "ab-1mn")!;
    const stats = effectiveStats(profile, ab1, { skillLevel: 5, overloaded: true });
    expect(stats.maxSpeed).toBeCloseTo(1466.37, 2);
    expect(stats.mass).toBe(1_650_000);
    expect(stats.inertiaModifier).toBeCloseTo(2.025, 3);
    expect(stats.sigRadius).toBe(35);
  });

  test("skills scale the afterburner bonus by navigation and acceleration control", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = effectiveStats(frigate, ab1, conditions(5));
    expect(stats.maxSpeed).toBeCloseTo(1398.4375, 3);
    expect(stats.mass).toBe(1_500_000);
  });

  test("overload multiplies the propulsion speed bonus and leaves mass and signature alone", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = effectiveStats(frigate, ab1, { skillLevel: 0, overloaded: true });
    expect(stats.maxSpeed).toBeCloseTo(1090, 0);
    expect(stats.mass).toBe(1_500_000);
    expect(stats.sigRadius).toBe(35);
  });

  test("overload has no effect when no propulsion module is fitted", () => {
    const withOverload = effectiveStats(frigate, undefined, { skillLevel: 5, overloaded: true });
    const withoutOverload = effectiveStats(frigate, undefined, { skillLevel: 5, overloaded: false });
    expect(withOverload).toEqual(withoutOverload);
  });
});

function conditions(level: SkillLevel): StatConditions {
  return { skillLevel: level, overloaded: false };
}
