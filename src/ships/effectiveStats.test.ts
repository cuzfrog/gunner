import { effectiveStats, fittedStats, maxSpeedForFittedMass, maxSpeedForMass } from "./effectiveStats";
import { fittingOptions } from "./fitting";
import type { FittedHull, PropulsionModule, ShipProfile, SkillLevel, StatConditions } from "./types";

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
      mass: 1_030_000,
      inertiaModifier: 3,
      maxSpeed: 400,
      sigRadius: 35,
    });
  });

  test("frigate with 5MN MWD reaches six times speed, mass and signature", () => {
    const mwd5 = fittingOptions(frigate).find((m) => m.id === "mwd-5mn")!;
    const stats = effectiveStats(frigate, mwd5);
    expect(stats.maxSpeed).toBeCloseTo(2361, 0);
    expect(stats.mass).toBe(3_530_000);
    expect(stats.inertiaModifier).toBe(3);
    expect(stats.sigRadius).toBe(210);
  });

  test("frigate with 1MN AB adds only module mass and a modest speed bonus", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = effectiveStats(frigate, ab1);
    expect(stats.maxSpeed).toBeCloseTo(851, 0);
    expect(stats.mass).toBe(1_530_000);
    expect(stats.sigRadius).toBe(35);
  });

  test("frigate with an overfit 10MN AB gains a larger speed bonus and more mass", () => {
    const ab10 = fittingOptions(frigate).find((m) => m.id === "ab-10mn")!;
    const stats = effectiveStats(frigate, ab10);
    expect(stats.maxSpeed).toBeCloseTo(1544, 0);
    expect(stats.mass).toBe(6_030_000);
  });

  test("battleship with 500MN MWD follows the same rules at capital scale", () => {
    const mwd500 = fittingOptions(battleship).find((m) => m.id === "mwd-500mn")!;
    const stats = effectiveStats(battleship, mwd500);
    expect(stats.maxSpeed).toBeCloseTo(590, 0);
    expect(stats.mass).toBe(353_000_000);
  });

  test.each([[0, 400, 3], [1, 420, 2.793], [2, 440, 2.592], [3, 460, 2.397], [4, 480, 2.208], [5, 500, 2.025]] as const)(
    "hull-only skill level %i scales base speed and inertia",
    (level, expectedSpeed, expectedInertia) => {
      const stats = effectiveStats(frigate, undefined, conditions(level));
      expect(stats.maxSpeed).toBeCloseTo(expectedSpeed, 3);
      expect(stats.inertiaModifier).toBeCloseTo(expectedInertia, 3);
      expect(stats.mass).toBe(1_030_000);
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
    expect(stats.maxSpeed).toBeCloseTo(1445.04, 2);
    expect(stats.mass).toBe(1_684_500);
    expect(stats.inertiaModifier).toBeCloseTo(2.025, 3);
    expect(stats.sigRadius).toBe(35);
  });

  test("skills scale the afterburner bonus by navigation and acceleration control", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = effectiveStats(frigate, ab1, conditions(5));
    expect(stats.maxSpeed).toBeCloseTo(1380.821, 3);
    expect(stats.mass).toBe(1_530_000);
  });

  test("overload multiplies the propulsion speed bonus and leaves mass and signature alone", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = effectiveStats(frigate, ab1, { skillLevel: 0, overloaded: true });
    expect(stats.maxSpeed).toBeCloseTo(1076, 0);
    expect(stats.mass).toBe(1_530_000);
    expect(stats.sigRadius).toBe(35);
  });

  test("overload has no effect when no propulsion module is fitted", () => {
    const withOverload = effectiveStats(frigate, undefined, { skillLevel: 5, overloaded: true });
    const withoutOverload = effectiveStats(frigate, undefined, { skillLevel: 5, overloaded: false });
    expect(withOverload).toEqual(withoutOverload);
  });

  test("shuttle hull does not receive a fitted mass factor", () => {
    const shuttle: ShipProfile = {
      name: "Test Shuttle",
      faction: "Test",
      hullType: "Shuttles",
      mass: 1_600_000,
      inertiaModifier: 2.8,
      baseSpeed: 500,
      sigRadius: 25,
    };
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = effectiveStats(shuttle, ab1);
    expect(stats.mass).toBe(2_100_000);
    expect(stats.maxSpeed).toBeCloseTo(911, 0);
  });

  test("fitted mass factor lowers propulsion speed bonus but leaves base speed unchanged", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const fitted = effectiveStats(frigate, ab1);
    const unfitted = effectiveStats({ ...frigate, hullType: "Unknown Hulls" }, ab1);
    expect(fitted.mass).toBeGreaterThan(unfitted.mass);
    expect(fitted.maxSpeed).toBeLessThan(unfitted.maxSpeed);
    expect(effectiveStats(frigate, undefined).maxSpeed).toBe(
      effectiveStats({ ...frigate, hullType: "Unknown Hulls" }, undefined).maxSpeed,
    );
  });
});

describe("fittedStats", () => {
  const fitted: FittedHull = { mass: 1_250_000, speedMultiplier: 1.1, inertiaMultiplier: 0.9, sigRadiusAdd: 15 };

  test("without propulsion applies multipliers to speed, inertia and signature", () => {
    const stats = fittedStats(frigate, fitted, undefined, conditions(5));
    expect(stats.mass).toBe(1_250_000);
    expect(stats.maxSpeed).toBeCloseTo(550, 6);
    expect(stats.inertiaModifier).toBeCloseTo(1.8225, 6);
    expect(stats.sigRadius).toBe(50);
  });

  test("with propulsion adds active mass and applies the speed bonus", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = fittedStats(frigate, fitted, ab1, conditions(0));
    expect(stats.mass).toBe(1_750_000);
    expect(stats.maxSpeed).toBeCloseTo(873.714, 3);
    expect(stats.inertiaModifier).toBeCloseTo(2.7, 6);
    expect(stats.sigRadius).toBe(50);
  });

  test("with MWD multiplies signature and active mass", () => {
    const mwd5 = fittingOptions(frigate).find((m) => m.id === "mwd-5mn")!;
    const stats = fittedStats(frigate, fitted, mwd5, conditions(0));
    expect(stats.mass).toBe(3_750_000);
    expect(stats.sigRadius).toBe(300);
  });

  test("with overload and skills scales the propulsion speed bonus only", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = fittedStats(frigate, fitted, ab1, { skillLevel: 5, overloaded: true });
    expect(stats.maxSpeed).toBeGreaterThan(440);
    expect(stats.mass).toBe(1_750_000);
    expect(stats.inertiaModifier).toBeCloseTo(1.8225, 6);
  });
});

describe("maxSpeedForFittedMass", () => {
  const fitted: FittedHull = { mass: 1_250_000, speedMultiplier: 1.1, inertiaMultiplier: 0.9, sigRadiusAdd: 0 };

  test("without propulsion ignores the provided mass", () => {
    expect(maxSpeedForFittedMass(frigate, fitted, 0)).toBeCloseTo(440, 6);
    expect(maxSpeedForFittedMass(frigate, fitted, 99_000_000, undefined, conditions(5))).toBeCloseTo(550, 6);
  });

  test("with propulsion returns the fitted max speed when the active mass matches", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = fittedStats(frigate, fitted, ab1, conditions(0));
    const speed = maxSpeedForFittedMass(frigate, fitted, stats.mass, ab1, conditions(0));
    expect(speed).toBeCloseTo(stats.maxSpeed, 6);
  });

  test("with propulsion clamps to a positive speed mass when the active mass is very low", () => {
    const mwd5 = fittingOptions(frigate).find((m) => m.id === "mwd-5mn")!;
    const speed = maxSpeedForFittedMass(frigate, fitted, 0, mwd5, conditions(0));
    expect(speed).toBeGreaterThan(0);
  });
});

describe("maxSpeedForMass regression", () => {
  test("matches effectiveStats when mass equals the active fitted mass", () => {
    const ab1 = fittingOptions(frigate).find((m) => m.id === "ab-1mn")!;
    const stats = effectiveStats(frigate, ab1, conditions(5));
    const speed = maxSpeedForMass(frigate, stats.mass, ab1, conditions(5));
    expect(speed).toBeCloseTo(stats.maxSpeed, 6);
  });
});

function conditions(level: SkillLevel): StatConditions {
  return { skillLevel: level, overloaded: false };
}
