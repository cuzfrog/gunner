import { StackingPenaltyImpl } from "./stackingPenalty";
import { EwarResolverImpl } from "./ewarResolver";
import {
  EMPTY_EWAR_LOADOUT,
  type EwarProjection,
  type StasisWebSpec,
  type TrackingDisruptorSpec,
  type TurretSpec,
} from "./types";

const stacking = new StackingPenaltyImpl();
const resolver = new EwarResolverImpl({ stackingPenalty: stacking });

const defaultTurret: TurretSpec = {
  tracking: 0.32,
  sigResolution: 40,
  optimal: 5000,
  falloff: 5000,
};

function webProjection(specs: readonly StasisWebSpec[], overloaded = false): EwarProjection {
  const loadout = { webs: specs, disruptors: [] };
  return { loadout, overloaded };
}

function disruptorProjection(specs: readonly TrackingDisruptorSpec[], overloaded = false): EwarProjection {
  const loadout = { webs: [], disruptors: specs };
  return { loadout, overloaded };
}

describe("EwarResolverImpl", () => {
  describe("webSpeedMultiplier", () => {
    test("single T2 web at 5 km multiplies by 1 - 0.6", () => {
      const projection = webProjection([{ moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }]);
      expect(resolver.webSpeedMultiplier(projection, 5000)).toBeCloseTo(0.4, 10);
      expect(resolver.webSpeedMultiplier(projection, 10001)).toBe(1);
    });

    test("overloaded web extends range by 30% with unchanged strength", () => {
      const projection = webProjection([{ moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }], true);
      expect(resolver.webSpeedMultiplier(projection, 11000)).toBeCloseTo(0.4, 10);
      expect(resolver.webSpeedMultiplier(projection, 14000)).toBe(1);
    });

    test("two identical webs penalizes the second", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web, web]);
      const secondPenalty = Math.exp(-1 / 7.1289);
      const expected = 0.4 * (1 + (0.4 - 1) * secondPenalty);
      expect(resolver.webSpeedMultiplier(projection, 5000)).toBeCloseTo(expected, 10);
    });

    test("mixed web strengths are ordered strongest-first", () => {
      const strong: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const weak: StasisWebSpec = { moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 30 };
      const strongFirst = webProjection([strong, weak]);
      const weakFirst = webProjection([weak, strong]);
      expect(resolver.webSpeedMultiplier(strongFirst, 5000)).toBeCloseTo(resolver.webSpeedMultiplier(weakFirst, 5000), 10);
    });

    test("empty projection is identity", () => {
      const projection = webProjection([]);
      expect(resolver.webSpeedMultiplier(projection, 5000)).toBe(1);
    });

    test("undefined projection is identity", () => {
      expect(resolver.webSpeedMultiplier(undefined, 5000)).toBe(1);
    });

    test("a web missing from a partial activation array is treated as active", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = { loadout: { webs: [web], disruptors: [] }, overloaded: false, activation: { webs: [], disruptors: [] } };
      expect(resolver.webSpeedMultiplier(projection, 5000)).toBeCloseTo(0.4, 10);
    });

    test("explicit active false still disables a web", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = { loadout: { webs: [web], disruptors: [] }, overloaded: false, activation: { webs: [{ active: false }], disruptors: [] } };
      expect(resolver.webSpeedMultiplier(projection, 5000)).toBe(1);
    });
  });

  describe("disruptedTurret", () => {
    const td: TrackingDisruptorSpec = {
      moduleName: "Tracking Disruptor II",
      optimal: 48000,
      falloff: 24000,
      disruption: 0.1719,
      defaultScript: "none",
      overloadStrengthBonusPercent: 20,
    };

    test("unscripted TD reduces all three attributes at 10 km", () => {
      const projection = disruptorProjection([td]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const factor = 1 - 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking * factor, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal * factor, 10);
      expect(turret.falloff).toBeCloseTo(defaultTurret.falloff * factor, 10);
      expect(turret.sigResolution).toBe(defaultTurret.sigResolution);
    });

    test("optimal-range script doubles range penalty and leaves tracking", () => {
      const projection = disruptorProjection([{ ...td, defaultScript: "optimalRange" }]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const rangeFactor = 1 - 2 * 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal * rangeFactor, 10);
      expect(turret.falloff).toBeCloseTo(defaultTurret.falloff * rangeFactor, 10);
    });

    test("disruptor without activation defaults to its spec script", () => {
      const projection: EwarProjection = { loadout: { webs: [], disruptors: [{ ...td, defaultScript: "optimalRange" }] }, overloaded: false };
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const rangeFactor = 1 - 2 * 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal * rangeFactor, 10);
    });

    test("tracking-speed script doubles tracking penalty and leaves range", () => {
      const projection = disruptorProjection([{ ...td, defaultScript: "trackingSpeed" }]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const trackingFactor = 1 - 2 * 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking * trackingFactor, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal, 10);
      expect(turret.falloff).toBeCloseTo(defaultTurret.falloff, 10);
    });

    test("TD distance curve halves effect at optimal + falloff and drops beyond", () => {
      const unscripted = disruptorProjection([td]);
      const atOptimal = resolver.disruptedTurret(defaultTurret, unscripted, 48000);
      const atOptimalPlusFalloff = resolver.disruptedTurret(defaultTurret, unscripted, 72000);
      const far = resolver.disruptedTurret(defaultTurret, unscripted, 200000);
      const fullFactor = 1 - 0.1719;
      const halfFactor = 1 - 0.1719 * 0.5;
      expect(atOptimal.tracking).toBeCloseTo(defaultTurret.tracking * fullFactor, 10);
      expect(atOptimalPlusFalloff.tracking).toBeCloseTo(defaultTurret.tracking * halfFactor, 10);
      expect(far.tracking).toBeGreaterThan(defaultTurret.tracking * 0.99);
    });

    test("two TDs on the same attribute stack-penalize strongest-first", () => {
      const weak = { ...td, disruption: 0.15 };
      const strong = { ...td, disruption: 0.1719 };
      const projection = disruptorProjection([weak, strong]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const factor1 = 1 - 0.1719;
      const factor2 = 1 - 0.15;
      const secondPenalty = Math.exp(-1 / 7.1289);
      const expected = defaultTurret.tracking * factor1 * (1 + (factor2 - 1) * secondPenalty);
      expect(turret.tracking).toBeCloseTo(expected, 6);
    });

    test("overload raises disruption strength by 20%", () => {
      const projection = disruptorProjection([td], true);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const factor = 1 - 0.1719 * 1.2;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking * factor, 10);
    });

    test("empty loadout leaves turret untouched", () => {
      const projection = { loadout: EMPTY_EWAR_LOADOUT, overloaded: false };
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      expect(turret).toEqual(defaultTurret);
    });

    test("undefined projection leaves turret untouched", () => {
      const turret = resolver.disruptedTurret(defaultTurret, undefined, 10000);
      expect(turret).toEqual(defaultTurret);
    });
  });
});
