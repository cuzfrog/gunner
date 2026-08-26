import { alignTime, fittedStats, maxSpeedForFittedMass } from "./effectiveStats";
import { fittingOptions } from "./fitting";
import type { FittedHull, PropulsionModule, PropulsionStats, ShipProfile, SkillLevel, StatConditions } from "./types";
import type { FactionId, HullTypeId, ShipId } from "../gamedata/ids";

const frigate: ShipProfile = {
  id: "test-frigate" as ShipId,
  name: "Test Frigate",
  factionId: "test" as FactionId,
  hullTypeId: "25" as HullTypeId,
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 400,
  sigRadius: 35,
};

const battleship: ShipProfile = {
  id: "test-battleship" as ShipId,
  name: "Test Battleship",
  factionId: "test" as FactionId,
  hullTypeId: "27" as HullTypeId,
  mass: 100_000_000,
  inertiaModifier: 0.14,
  baseSpeed: 100,
  sigRadius: 470,
};

const mwd5 = fittingOptions("small").find((m) => m.id === "mwd-5mn")!;
const ab1 = fittingOptions("small").find((m) => m.id === "ab-1mn")!;
const ab10 = fittingOptions("small").find((m) => m.id === "ab-10mn")!;
const mwd500 = fittingOptions("large").find((m) => m.id === "mwd-500mn")!;

describe("naked hull", () => {
  test("returns base hull values and align time without a module", () => {
    const stats = fittedStats(frigate, undefined);
    expect(stats).toMatchObject({
      mass: 1_000_000,
      inertiaModifier: 3,
      maxSpeed: 400,
      sigRadius: 35,
    });
    expect(stats.baseMaxSpeed).toBeCloseTo(400, 6);
    expect(stats.alignTime).toBeCloseTo(3 * Math.log(4), 6);
  });

  test("alignTime scales with inertia skill factor and propulsion mass", () => {
    const noSkill = fittedStats(frigate, undefined, undefined, conditions(0));
    expect(noSkill.alignTime).toBeCloseTo(3 * Math.log(4), 6);
    const maxSkill = fittedStats(frigate, undefined, undefined, conditions(5));
    expect(maxSkill.alignTime).toBeCloseTo(2.025 * Math.log(4), 6);
    const withPropulsion = fittedStats(frigate, undefined, ab1, conditions(0));
    expect(withPropulsion.alignTime).toBeCloseTo(4.5 * Math.log(4), 6);
  });

  test("frigate with 5MN MWD reaches six times speed, mass and signature", () => {
    const stats = fittedStats(frigate, undefined, mwd5);
    expect(stats.maxSpeed).toBeCloseTo(2400, 0);
    expect(stats.mass).toBe(1_500_000);
    expect(stats.inertiaModifier).toBe(3);
    expect(stats.sigRadius).toBe(210);
  });

  test("frigate with 1MN AB adds only module mass and a modest speed bonus", () => {
    const stats = fittedStats(frigate, undefined, ab1);
    expect(stats.maxSpeed).toBeCloseTo(860, 0);
    expect(stats.mass).toBe(1_500_000);
    expect(stats.inertiaModifier).toBe(3);
    expect(stats.sigRadius).toBe(35);
  });

  test("frigate with an overfit 10MN AB gains a larger speed bonus and more mass", () => {
    const stats = fittedStats(frigate, undefined, ab10);
    expect(stats.maxSpeed).toBeCloseTo(1550, 0);
    expect(stats.mass).toBe(6_000_000);
    expect(stats.inertiaModifier).toBe(3);
    expect(stats.sigRadius).toBe(35);
  });

  test("Thrasher with 10MN compact afterburner reaches the expected 1536 m/s", () => {
    const thrasher: ShipProfile = {
      id: "16242" as ShipId,
      name: "Thrasher",
      factionId: "minmatar-republic" as FactionId,
      hullTypeId: "420" as HullTypeId,
      mass: 1_600_000,
      inertiaModifier: 2.8,
      baseSpeed: 270,
      sigRadius: 56,
    };
    const compactAB10: PropulsionStats = { thrust: 15_000_000, speedBonus: 1.25, massAddition: 5_000_000, sigBloom: 0 };
    const stats = fittedStats(thrasher, undefined, compactAB10, conditions(5));
    expect(stats.maxSpeed).toBeCloseTo(1536.01, 2);
    expect(stats.mass).toBe(6_600_000);
  });

  test("battleship with 500MN MWD follows the same rules at capital scale", () => {
    const stats = fittedStats(battleship, undefined, mwd500);
    expect(stats.maxSpeed).toBeCloseTo(600, 0);
    expect(stats.mass).toBe(150_000_000);
    expect(stats.inertiaModifier).toBe(0.14);
    expect(stats.sigRadius).toBe(2820);
  });

  test.each([[0, 400, 3], [1, 420, 2.793], [2, 440, 2.592], [3, 460, 2.397], [4, 480, 2.208], [5, 500, 2.025]] as const)(
    "hull-only skill level %i scales base speed and inertia",
    (level, expectedSpeed, expectedInertia) => {
      const stats = fittedStats(frigate, undefined, undefined, conditions(level));
      expect(stats.maxSpeed).toBeCloseTo(expectedSpeed, 3);
      expect(stats.inertiaModifier).toBeCloseTo(expectedInertia, 3);
      expect(stats.alignTime).toBeCloseTo(expectedInertia * Math.log(4), 3);
      expect(stats.mass).toBe(1_000_000);
      expect(stats.sigRadius).toBe(frigate.sigRadius);
    },
  );

  test("afterburner with max skills and overload uses the worked example", () => {
    const profile: ShipProfile = {
      id: "worked-example" as ShipId,
      name: "Worked Example",
      factionId: "test" as FactionId,
      hullTypeId: "25" as HullTypeId,
      mass: 1_150_000,
      inertiaModifier: 3,
      baseSpeed: 340,
      sigRadius: 35,
    };
    const stats = fittedStats(profile, undefined, ab1, { skillLevel: 5, overloaded: true });
    expect(stats.maxSpeed).toBeCloseTo(1258.10, 2);
    expect(stats.mass).toBe(1_650_000);
    expect(stats.inertiaModifier).toBeCloseTo(2.025, 3);
    expect(stats.sigRadius).toBe(35);
  });

  test("skills scale the afterburner bonus by navigation and acceleration control", () => {
    const stats = fittedStats(frigate, undefined, ab1, conditions(5));
    expect(stats.maxSpeed).toBeCloseTo(1218.75, 3);
    expect(stats.mass).toBe(1_500_000);
  });

  test("overload multiplies the propulsion speed bonus and leaves mass and signature alone", () => {
    const stats = fittedStats(frigate, undefined, ab1, { skillLevel: 0, overloaded: true });
    expect(stats.maxSpeed).toBeCloseTo(1090, 0);
    expect(stats.mass).toBe(1_500_000);
    expect(stats.sigRadius).toBe(35);
  });

  test("overload has no effect when no propulsion module is fitted", () => {
    const withOverload = fittedStats(frigate, undefined, undefined, { skillLevel: 5, overloaded: true });
    const withoutOverload = fittedStats(frigate, undefined, undefined, { skillLevel: 5, overloaded: false });
    expect(withOverload).toEqual(withoutOverload);
  });

  test("maxSpeedForFittedMass with undefined fitted ignores the provided mass without propulsion", () => {
    expect(maxSpeedForFittedMass(frigate, undefined, 0)).toBeCloseTo(400, 6);
    expect(maxSpeedForFittedMass(frigate, undefined, 99_000_000, undefined, conditions(5))).toBeCloseTo(500, 6);
  });

  test("maxSpeedForFittedMass with undefined fitted matches fittedStats at the active mass", () => {
    const stats = fittedStats(frigate, undefined, ab1, conditions(0));
    const speed = maxSpeedForFittedMass(frigate, undefined, stats.mass, ab1, conditions(0));
    expect(speed).toBeCloseTo(stats.maxSpeed, 6);
  });

  test("maxSpeedForFittedMass with undefined fitted clamps to a positive speed mass when the active mass is very low", () => {
    const speed = maxSpeedForFittedMass(frigate, undefined, 0, mwd5, conditions(0));
    expect(speed).toBeGreaterThan(0);
  });
});

describe("fittedStats", () => {
  const fitted: FittedHull = { mass: 1_250_000, massMultiplier: 1, speedMultiplier: 1.1, inertiaMultiplier: 0.9, sigMultiplier: 1, sigRadiusAdd: 15 };

  test("without propulsion applies multipliers to speed, inertia, signature and align time", () => {
    const stats = fittedStats(frigate, fitted, undefined, conditions(5));
    expect(stats.mass).toBe(1_250_000);
    expect(stats.maxSpeed).toBeCloseTo(550, 6);
    expect(stats.baseMaxSpeed).toBeCloseTo(550, 6);
    expect(stats.inertiaModifier).toBeCloseTo(1.8225, 6);
    expect(stats.sigRadius).toBe(50);
    expect(stats.alignTime).toBeCloseTo(1.8225 * 1_250_000 * Math.log(4) * 1e-6, 6);
  });

  test("applies the signature multiplier separately from the flat addition", () => {
    const fittedWithSigMultiplier: FittedHull = { ...fitted, sigMultiplier: 1.1 };
    const stats = fittedStats(frigate, fittedWithSigMultiplier, undefined, conditions(5));
    expect(stats.sigRadius).toBeCloseTo(55, 6);
  });

  test("with propulsion adds active mass and applies the speed and align time", () => {
    const stats = fittedStats(frigate, fitted, ab1, conditions(0));
    expect(stats.mass).toBe(1_750_000);
    expect(stats.baseMaxSpeed).toBeCloseTo(440, 6);
    expect(stats.maxSpeed).toBeCloseTo(873.714, 3);
    expect(stats.inertiaModifier).toBeCloseTo(2.7, 6);
    expect(stats.sigRadius).toBe(50);
    expect(stats.alignTime).toBeCloseTo(2.7 * 1_750_000 * Math.log(4) * 1e-6, 6);
  });

  test("with MWD multiplies signature, active mass and align time", () => {
    const stats = fittedStats(frigate, fitted, mwd5, conditions(0));
    expect(stats.mass).toBe(1_750_000);
    expect(stats.sigRadius).toBe(300);
    expect(stats.alignTime).toBeCloseTo(2.7 * 1_750_000 * Math.log(4) * 1e-6, 6);
  });

  test("speed override scales baseMaxSpeed proportionally while maxSpeed stays computed", () => {
    const base = fittedStats(frigate, undefined, mwd5, conditions(0));
    const scaled = fittedStats(frigate, undefined, mwd5, conditions(0), 1200);
    expect(scaled.maxSpeed).toBeCloseTo(base.maxSpeed, 0);
    expect(scaled.baseMaxSpeed).toBeCloseTo(400 * (1200 / base.maxSpeed), 6);
  });

  test("speed override with skills still applies the navigation factor to the scaled base", () => {
    const base = fittedStats(frigate, undefined, mwd5, conditions(5));
    const scaled = fittedStats(frigate, undefined, mwd5, conditions(5), 1812.5);
    expect(scaled.baseMaxSpeed).toBeCloseTo(250, 6);
    expect(scaled.maxSpeed).toBeCloseTo(base.maxSpeed, 0);
  });

  test("with overload and skills scales the propulsion speed bonus only, leaving align time unchanged", () => {
    const stats = fittedStats(frigate, fitted, ab1, { skillLevel: 5, overloaded: true });
    expect(stats.maxSpeed).toBeGreaterThan(440);
    expect(stats.mass).toBe(1_750_000);
    expect(stats.inertiaModifier).toBeCloseTo(1.8225, 6);
    expect(stats.alignTime).toBeCloseTo(1.8225 * 1_750_000 * Math.log(4) * 1e-6, 6);
  });

  test("mass multiplier applies to hull and propulsion mass together, increasing align time", () => {
    const higgsFitted: FittedHull = { ...fitted, massMultiplier: 2 };
    const stats = fittedStats(frigate, higgsFitted, ab1, conditions(0));
    expect(stats.mass).toBe(3_500_000);
    expect(stats.alignTime).toBeCloseTo(2.7 * 3_500_000 * Math.log(4) * 1e-6, 6);
  });
});

describe("alignTime", () => {
  test("returns ln(4) * mass * inertiaModifier * 1e-6", () => {
    expect(alignTime(1_200_000, 3)).toBeCloseTo(Math.log(4) * 3.6, 10);
    expect(alignTime(10_000_000, 0.45)).toBeCloseTo(Math.log(4) * 4.5, 10);
  });
});

describe("maxSpeedForFittedMass", () => {
  const fitted: FittedHull = { mass: 1_250_000, massMultiplier: 1, speedMultiplier: 1.1, inertiaMultiplier: 0.9, sigMultiplier: 1, sigRadiusAdd: 0 };

  test("without propulsion ignores the provided mass", () => {
    expect(maxSpeedForFittedMass(frigate, fitted, 0)).toBeCloseTo(440, 6);
    expect(maxSpeedForFittedMass(frigate, fitted, 99_000_000, undefined, conditions(5))).toBeCloseTo(550, 6);
  });

  test("with propulsion returns the fitted max speed when the active mass matches", () => {
    const stats = fittedStats(frigate, fitted, ab1, conditions(0));
    const speed = maxSpeedForFittedMass(frigate, fitted, stats.mass, ab1, conditions(0));
    expect(speed).toBeCloseTo(stats.maxSpeed, 6);
  });

  test("with propulsion clamps to a positive speed mass when the active mass is very low", () => {
    const speed = maxSpeedForFittedMass(frigate, fitted, 0, mwd5, conditions(0));
    expect(speed).toBeGreaterThan(0);
  });
});

function conditions(level: SkillLevel): StatConditions {
  return { skillLevel: level, overloaded: false };
}
