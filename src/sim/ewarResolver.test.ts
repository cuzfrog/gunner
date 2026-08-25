import { StackingPenaltyImpl } from "./stackingPenalty";
import { EwarResolverImpl } from "./ewarResolver";
import {
  EMPTY_EWAR_LOADOUT,
  type AppliedEwarEffect,
  type DisruptionScriptSpec,
  type EwarProjection,
  type StasisGrapplerSpec,
  type StasisWebSpec,
  type TrackingDisruptorSpec,
  type TurretSpec,
  type WarpScramblerSpec,
} from "./types";

const stacking = new StackingPenaltyImpl();
const resolver = new EwarResolverImpl({ stackingPenalty: stacking });

const defaultTurret: TurretSpec = {
  tracking: 0.32,
  sigResolution: 40,
  optimal: 5000,
  falloff: 5000,
};

const OPTIMAL_SCRIPT: DisruptionScriptSpec = {
  name: "Optimal Range Disruption Script", trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2,
};
const TRACKING_SCRIPT: DisruptionScriptSpec = {
  name: "Tracking Speed Disruption Script", trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0,
};

const TD: TrackingDisruptorSpec = {
  moduleName: "Tracking Disruptor II",
  optimal: 48000,
  falloff: 24000,
  disruption: 0.1719,
  defaultScript: undefined,
  overloadStrengthBonusPercent: 20,
};

function webProjection(specs: readonly StasisWebSpec[], overloaded = false): EwarProjection {
  const loadout = { webs: specs, grapplers: [], disruptors: [], scramblers: [], scripts: [] };
  const activation = { webs: specs.map(() => ({ active: true, overloaded })), grapplers: [], disruptors: [], scramblers: [] };
  return { loadout, activation };
}

function grapplerProjection(specs: readonly StasisGrapplerSpec[], overloaded = false): EwarProjection {
  const loadout = { webs: [], grapplers: specs, disruptors: [], scramblers: [], scripts: [] };
  const activation = { webs: [], grapplers: specs.map(() => ({ active: true, overloaded })), disruptors: [], scramblers: [] };
  return { loadout, activation };
}

function disruptorProjection(specs: readonly TrackingDisruptorSpec[], overloaded = false): EwarProjection {
  const loadout = { webs: [], grapplers: [], disruptors: specs, scramblers: [], scripts: [] };
  const activation = { webs: [], grapplers: [], disruptors: specs.map(() => ({ active: true, overloaded, script: undefined })), scramblers: [] };
  return { loadout, activation };
}

function scramblerProjection(specs: readonly WarpScramblerSpec[], overloaded = false, active = true): EwarProjection {
  const loadout = { webs: [], grapplers: [], disruptors: [], scramblers: specs, scripts: [] };
  const activation = { webs: [], grapplers: [], disruptors: [], scramblers: specs.map(() => ({ active, overloaded })) };
  return { loadout, activation };
}

describe("EwarResolverImpl", () => {
  describe("speedMultiplier", () => {
    test("single T2 web at 5 km multiplies by 1 - 0.6", () => {
      const projection = webProjection([{ moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }]);
      expect(resolver.speedMultiplier(projection, 5000)).toBeCloseTo(0.4, 10);
      expect(resolver.speedMultiplier(projection, 10001)).toBe(1);
    });

    test("overloaded web extends range by 30% with unchanged strength", () => {
      const projection = webProjection([{ moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }], true);
      expect(resolver.speedMultiplier(projection, 11000)).toBeCloseTo(0.4, 10);
      expect(resolver.speedMultiplier(projection, 14000)).toBe(1);
    });

    test("overloading one web extends only that web's range", () => {
      const baseWeb: StasisWebSpec = { moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const heatedWeb: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const loadout = { webs: [baseWeb, heatedWeb], grapplers: [], disruptors: [], scramblers: [], scripts: [] };
      const activation = { webs: [{ active: true, overloaded: false }, { active: true, overloaded: true }], grapplers: [], disruptors: [], scramblers: [] };
      const projection: EwarProjection = { loadout, activation };
      expect(resolver.speedMultiplier(projection, 11000)).toBeCloseTo(0.4, 10);
      expect(resolver.speedMultiplier(projection, 13001)).toBe(1);
    });

    test("two identical webs penalizes the second", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web, web]);
      const secondPenalty = Math.exp(-1 / 7.1289);
      const expected = 0.4 * (1 + (0.4 - 1) * secondPenalty);
      expect(resolver.speedMultiplier(projection, 5000)).toBeCloseTo(expected, 10);
    });

    test("mixed web strengths are ordered strongest-first", () => {
      const strong: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const weak: StasisWebSpec = { moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 30 };
      const strongFirst = webProjection([strong, weak]);
      const weakFirst = webProjection([weak, strong]);
      expect(resolver.speedMultiplier(strongFirst, 5000)).toBeCloseTo(resolver.speedMultiplier(weakFirst, 5000), 10);
    });

    test("empty projection is identity", () => {
      const projection = webProjection([]);
      expect(resolver.speedMultiplier(projection, 5000)).toBe(1);
    });

    test("undefined projection is identity", () => {
      expect(resolver.speedMultiplier(undefined, 5000)).toBe(1);
    });

    test("a web missing from a partial activation array is treated as active", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = { loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], scripts: [] }, activation: { webs: [], grapplers: [], disruptors: [], scramblers: [] } };
      expect(resolver.speedMultiplier(projection, 5000)).toBeCloseTo(0.4, 10);
    });

    test("explicit active false still disables a web", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = { loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], scripts: [] }, activation: { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [], scramblers: [] } };
      expect(resolver.speedMultiplier(projection, 5000)).toBe(1);
    });

    const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };

    test("grappler applies full strength within optimal", () => {
      const projection = grapplerProjection([GRAPPLER]);
      expect(resolver.speedMultiplier(projection, 500)).toBeCloseTo(0.2, 10);
      expect(resolver.speedMultiplier(projection, 1000)).toBeCloseTo(0.2, 10);
    });

    test("grappler effect decays to half at optimal plus falloff", () => {
      const projection = grapplerProjection([GRAPPLER]);
      expect(resolver.speedMultiplier(projection, 9000)).toBeCloseTo(0.6, 10);
    });

    test("out-of-range grappler contributes nothing", () => {
      const projection = grapplerProjection([GRAPPLER]);
      expect(resolver.speedMultiplier(projection, 100000)).toBeCloseTo(1, 5);
    });

    test("grappler and web stack-penalize", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const loadout = { webs: [web], grapplers: [GRAPPLER], disruptors: [], scramblers: [], scripts: [] };
      const activation = { webs: [{ active: true, overloaded: false }], grapplers: [{ active: true, overloaded: false }], disruptors: [], scramblers: [] };
      const projection: EwarProjection = { loadout, activation };
      expect(resolver.speedMultiplier(projection, 500)).toBeLessThan(0.2);
    });

    test("overloaded grappler extends optimal by bonus percent", () => {
      const projection = grapplerProjection([GRAPPLER], true);
      expect(resolver.speedMultiplier(projection, 3000)).toBeCloseTo(0.2, 10);
      expect(resolver.speedMultiplier(projection, 100000)).toBeCloseTo(1, 5);
    });

    test("inactive grappler is skipped", () => {
      const projection = { loadout: { webs: [], grapplers: [GRAPPLER], disruptors: [], scramblers: [], scripts: [] }, activation: { webs: [], grapplers: [{ active: false, overloaded: false }], disruptors: [], scramblers: [] } };
      expect(resolver.speedMultiplier(projection, 500)).toBe(1);
    });
  });

  describe("disruptedTurret", () => {
    const TD: TrackingDisruptorSpec = {
      moduleName: "Tracking Disruptor II",
      optimal: 48000,
      falloff: 24000,
      disruption: 0.1719,
      defaultScript: undefined,
      overloadStrengthBonusPercent: 20,
    };

    test("unscripted TD reduces all three attributes at 10 km", () => {
      const projection = disruptorProjection([TD]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const factor = 1 - 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking * factor, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal * factor, 10);
      expect(turret.falloff).toBeCloseTo(defaultTurret.falloff * factor, 10);
      expect(turret.sigResolution).toBe(defaultTurret.sigResolution);
    });

    test("optimal-range script doubles range penalty and leaves tracking", () => {
      const projection = disruptorProjection([{ ...TD, defaultScript: OPTIMAL_SCRIPT }]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const rangeFactor = 1 - 2 * 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal * rangeFactor, 10);
      expect(turret.falloff).toBeCloseTo(defaultTurret.falloff * rangeFactor, 10);
    });

    test("disruptor without activation defaults to its spec script", () => {
      const projection: EwarProjection = {
        loadout: { webs: [], grapplers: [], disruptors: [{ ...TD, defaultScript: OPTIMAL_SCRIPT }], scramblers: [], scripts: [] },
      };
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const rangeFactor = 1 - 2 * 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal * rangeFactor, 10);
    });

    test("tracking-speed script doubles tracking penalty and leaves range", () => {
      const projection = disruptorProjection([{ ...TD, defaultScript: TRACKING_SCRIPT }]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const trackingFactor = 1 - 2 * 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking * trackingFactor, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal, 10);
      expect(turret.falloff).toBeCloseTo(defaultTurret.falloff, 10);
    });

    test("TD distance curve halves effect at optimal + falloff and drops beyond", () => {
      const unscripted = disruptorProjection([TD]);
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
      const weak = { ...TD, disruption: 0.15 };
      const strong = { ...TD, disruption: 0.1719 };
      const projection = disruptorProjection([weak, strong]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const factor1 = 1 - 0.1719;
      const factor2 = 1 - 0.15;
      const secondPenalty = Math.exp(-1 / 7.1289);
      const expected = defaultTurret.tracking * factor1 * (1 + (factor2 - 1) * secondPenalty);
      expect(turret.tracking).toBeCloseTo(expected, 6);
    });

    test("overload raises disruption strength by 20%", () => {
      const projection = disruptorProjection([TD], true);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const factor = 1 - 0.1719 * 1.2;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking * factor, 10);
    });

    test("overloading one disruptor applies the strength bonus only to that module", () => {
      const base: TrackingDisruptorSpec = { ...TD, disruption: 0.15 };
      const heated: TrackingDisruptorSpec = TD;
      const loadout = { webs: [], grapplers: [], disruptors: [base, heated], scramblers: [], scripts: [] };
      const activation = { webs: [], grapplers: [], disruptors: [{ active: true, overloaded: false, script: undefined }, { active: true, overloaded: true, script: undefined }], scramblers: [] };
      const projection: EwarProjection = { loadout, activation };
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const baseFactor = 1 - 0.15;
      const heatedFactor = 1 - 0.1719 * 1.2;
      const secondPenalty = Math.exp(-1 / 7.1289);
      const expected = defaultTurret.tracking * heatedFactor * (1 + (baseFactor - 1) * secondPenalty);
      expect(turret.tracking).toBeCloseTo(expected, 6);
    });

    test("falloff channel is driven by the script falloff multiplier", () => {
      const falloffScript: DisruptionScriptSpec = { name: "Falloff Script", trackingMultiplier: 0, optimalMultiplier: 0, falloffMultiplier: 2 };
      const projection = disruptorProjection([{ ...TD, defaultScript: falloffScript }]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const falloffFactor = 1 - 2 * 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal, 10);
      expect(turret.falloff).toBeCloseTo(defaultTurret.falloff * falloffFactor, 10);
    });

    test("no script applies the base disruption to all three attributes", () => {
      const unscripted: TrackingDisruptorSpec = { ...TD, defaultScript: undefined };
      const projection = disruptorProjection([unscripted]);
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const factor = 1 - 0.1719;
      expect(turret.tracking).toBeCloseTo(defaultTurret.tracking * factor, 10);
      expect(turret.optimal).toBeCloseTo(defaultTurret.optimal * factor, 10);
      expect(turret.falloff).toBeCloseTo(defaultTurret.falloff * factor, 10);
    });

    test("empty loadout leaves turret untouched", () => {
      const projection = { loadout: EMPTY_EWAR_LOADOUT };
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      expect(turret).toEqual(defaultTurret);
    });

    test("undefined projection leaves turret untouched", () => {
      const turret = resolver.disruptedTurret(defaultTurret, undefined, 10000);
      expect(turret).toEqual(defaultTurret);
    });
  });

  describe("speedMultiplierIgnoringRange", () => {
    test("matches the in-range speed multiplier for a single web", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 0 };
      const projection = webProjection([web]);
      expect(resolver.speedMultiplierIgnoringRange(projection)).toBeCloseTo(resolver.speedMultiplier(projection, 0), 10);
    });

    test("stacks multiple webs the same way as at point-blank range", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 0 };
      const projection = webProjection([web, web]);
      expect(resolver.speedMultiplierIgnoringRange(projection)).toBeCloseTo(resolver.speedMultiplier(projection, 0), 10);
    });

    test("skips inactive modules", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 0 };
      const projection = { loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], scripts: [] }, activation: { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [], scramblers: [] } };
      expect(resolver.speedMultiplierIgnoringRange(projection)).toBe(1);
    });

    test("overloaded web applies the same speed penalty at point-blank", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web], true);
      expect(resolver.speedMultiplierIgnoringRange(projection)).toBeCloseTo(resolver.speedMultiplier(projection, 0), 10);
    });
  });

  describe("disruptedTurretIgnoringRange", () => {
    test("matches the point-blank disruption for a single TD", () => {
      const projection = disruptorProjection([TD]);
      expect(resolver.disruptedTurretIgnoringRange(defaultTurret, projection)).toEqual(resolver.disruptedTurret(defaultTurret, projection, 0));
    });

    test("stacks multiple disruptors like at point-blank range", () => {
      const projection = disruptorProjection([TD, TD]);
      expect(resolver.disruptedTurretIgnoringRange(defaultTurret, projection)).toEqual(resolver.disruptedTurret(defaultTurret, projection, 0));
    });

    test("skips inactive disruptors", () => {
      const projection: EwarProjection = {
        loadout: { webs: [], grapplers: [], disruptors: [TD], scramblers: [], scripts: [] },
        activation: { webs: [], grapplers: [], disruptors: [{ active: false, overloaded: false, script: undefined }], scramblers: [] },
      };
      expect(resolver.disruptedTurretIgnoringRange(defaultTurret, projection)).toEqual(defaultTurret);
    });

    test("overloaded disruptor applies a stronger tracking penalty", () => {
      const projection = disruptorProjection([TD], true);
      const turret = resolver.disruptedTurretIgnoringRange(defaultTurret, projection);
      const expected = defaultTurret.tracking * (1 - 0.1719 * 1.2);
      expect(turret.tracking).toBeCloseTo(expected, 10);
    });
  });

  describe("propulsionSuppressedIgnoringRange", () => {
    test("returns true when any scrambler is active", () => {
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }]);
      expect(resolver.propulsionSuppressedIgnoringRange(projection)).toBe(true);
    });

    test("returns false when all scramblers are inactive", () => {
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }], false, false);
      expect(resolver.propulsionSuppressedIgnoringRange(projection)).toBe(false);
    });
  });

  describe("propulsionSuppressed", () => {
    test("no projection is not suppressed", () => {
      expect(resolver.propulsionSuppressed(undefined, 5000)).toBe(false);
    });

    test("single T2 scram suppresses inside range", () => {
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }]);
      expect(resolver.propulsionSuppressed(projection, 8999)).toBe(true);
      expect(resolver.propulsionSuppressed(projection, 9000)).toBe(true);
      expect(resolver.propulsionSuppressed(projection, 9001)).toBe(false);
    });

    test("overload extends scram range by 20%", () => {
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }], true);
      expect(resolver.propulsionSuppressed(projection, 10_799)).toBe(true);
      expect(resolver.propulsionSuppressed(projection, 10_801)).toBe(false);
    });

    test("inactive scrambler does not suppress", () => {
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }], false, false);
      expect(resolver.propulsionSuppressed(projection, 5000)).toBe(false);
    });

    test("a scrambler missing from a partial activation array is treated as active", () => {
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 };
      const projection: EwarProjection = { loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [scrambler], scripts: [] }, activation: { webs: [], grapplers: [], disruptors: [], scramblers: [] } };
      expect(resolver.propulsionSuppressed(projection, 5000)).toBe(true);
    });
  });

  describe("appliedEffects", () => {
    test("undefined projection returns empty", () => {
      expect(resolver.appliedEffects(undefined, 5000)).toEqual([]);
    });

    test("web applies at and within max range and not beyond", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web]);
      expect(resolver.appliedEffects(projection, 10000)).toEqual([{ family: "web", moduleName: "Stasis Webifier II" }]);
      expect(resolver.appliedEffects(projection, 10001)).toEqual([]);
    });

    test("inactive web is skipped", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection: EwarProjection = {
        loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], scripts: [] },
        activation: { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [], scramblers: [] },
      };
      expect(resolver.appliedEffects(projection, 5000)).toEqual([]);
    });

    test("overloaded web extends range by bonus percent", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web], true);
      expect(resolver.appliedEffects(projection, 13000)).toEqual([{ family: "web", moduleName: "Stasis Webifier II" }]);
      expect(resolver.appliedEffects(projection, 13001)).toEqual([]);
    });

    test("scrambler applies at and within max range and not beyond", () => {
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 };
      const projection = scramblerProjection([scrambler]);
      expect(resolver.appliedEffects(projection, 9000)).toEqual([{ family: "scrambler", moduleName: "Warp Scrambler II" }]);
      expect(resolver.appliedEffects(projection, 9001)).toEqual([]);
    });

    test("inactive scrambler is skipped", () => {
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 };
      const projection = scramblerProjection([scrambler], false, false);
      expect(resolver.appliedEffects(projection, 5000)).toEqual([]);
    });

    test("overloaded scrambler extends range by bonus percent", () => {
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 };
      const projection = scramblerProjection([scrambler], true);
      expect(resolver.appliedEffects(projection, 10800)).toEqual([{ family: "scrambler", moduleName: "Warp Scrambler II" }]);
      expect(resolver.appliedEffects(projection, 10801)).toEqual([]);
    });

    test("grappler applies while falloff effectiveness is at least 0.01", () => {
      const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
      const projection = grapplerProjection([GRAPPLER]);
      expect(resolver.appliedEffects(projection, 21000)).toEqual([{ family: "grappler", moduleName: "Heavy Stasis Grappler I" }]);
      expect(resolver.appliedEffects(projection, 22000)).toEqual([]);
    });

    test("inactive grappler is skipped", () => {
      const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
      const projection: EwarProjection = {
        loadout: { webs: [], grapplers: [GRAPPLER], disruptors: [], scramblers: [], scripts: [] },
        activation: { webs: [], grapplers: [{ active: false, overloaded: false }], disruptors: [], scramblers: [] },
      };
      expect(resolver.appliedEffects(projection, 500)).toEqual([]);
    });

    test("overloaded grappler scales optimal before evaluating effectiveness", () => {
      const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
      const projection = grapplerProjection([GRAPPLER], true);
      expect(resolver.appliedEffects(projection, 22000)).toEqual([{ family: "grappler", moduleName: "Heavy Stasis Grappler I" }]);
    });

    test("disruptor applies while falloff effectiveness is at least 0.01 and ignores script", () => {
      const disruptor: TrackingDisruptorSpec = {
        moduleName: "Tracking Disruptor II",
        optimal: 48000,
        falloff: 24000,
        disruption: 0.1719,
        defaultScript: {
          name: "Optimal Range Disruption Script",
          trackingMultiplier: 0,
          optimalMultiplier: 2,
          falloffMultiplier: 2,
        },
        overloadStrengthBonusPercent: 20,
      };
      const projection = disruptorProjection([disruptor]);
      expect(resolver.appliedEffects(projection, 109800)).toEqual([{ family: "disruptor", moduleName: "Tracking Disruptor II" }]);
      expect(resolver.appliedEffects(projection, 110000)).toEqual([]);
    });

    test("inactive disruptor is skipped", () => {
      const projection: EwarProjection = {
        loadout: { webs: [], grapplers: [], disruptors: [TD], scramblers: [], scripts: [] },
        activation: { webs: [], grapplers: [], disruptors: [{ active: false, overloaded: false, script: undefined }], scramblers: [] },
      };
      expect(resolver.appliedEffects(projection, 10000)).toEqual([]);
    });

    test("multiple applying instances of one family use the first in loadout order", () => {
      const first: StasisWebSpec = { moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 15 };
      const second: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 15000, speedFactor: 0.55, overloadRangeBonusPercent: 15 };
      const projection = webProjection([first, second]);
      const expected: AppliedEwarEffect[] = [{ family: "web", moduleName: "Stasis Webifier I" }];
      expect(resolver.appliedEffects(projection, 9000)).toEqual(expected);
    });

    test("output order is web, grappler, scrambler, disruptor", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 50000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const grappler: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", maxRange: 50000, overloadRangeBonusPercent: 20 };
      const disruptor: TrackingDisruptorSpec = { moduleName: "Tracking Disruptor II", optimal: 48000, falloff: 24000, disruption: 0.1719, defaultScript: undefined, overloadStrengthBonusPercent: 20 };
      const loadout = { webs: [web], grapplers: [grappler], disruptors: [disruptor], scramblers: [scrambler], scripts: [] };
      const activation = {
        webs: [{ active: true, overloaded: false }],
        grapplers: [{ active: true, overloaded: false }],
        disruptors: [{ active: true, overloaded: false, script: undefined }],
        scramblers: [{ active: true, overloaded: false }],
      };
      const projection: EwarProjection = { loadout, activation };
      expect(resolver.appliedEffects(projection, 1000)).toEqual([
        { family: "web", moduleName: "Stasis Webifier II" },
        { family: "grappler", moduleName: "Heavy Stasis Grappler I" },
        { family: "scrambler", moduleName: "Warp Scrambler II" },
        { family: "disruptor", moduleName: "Tracking Disruptor II" },
      ]);
    });
  });
});
