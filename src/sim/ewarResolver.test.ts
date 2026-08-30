import { StackingPenaltyImpl } from "./stackingPenalty";
import { EwarResolverImpl } from "./ewarResolver";
import { toTypeId } from "../gamedata/ids";
import {
  EMPTY_EWAR_LOADOUT,
  type AppliedEwarEffect,
  type DisruptionBreakdown,
  type DisruptionScriptSpec,
  type EwarProjection,
  type PainterActivation,
  type SpeedBreakdown,
  type StasisGrapplerSpec,
  type StasisWebSpec,
  type TargetPainterSpec,
  type TrackingDisruptorSpec,
  type TurretSpec,
  type WarpScramblerSpec,
} from "./types";

const stacking = new StackingPenaltyImpl();
const resolver = new EwarResolverImpl({ stackingPenalty: stacking });

const WEB_I_ID = toTypeId("526");
const WEB_II_ID = toTypeId("527");
const SCRAM_II_ID = toTypeId("448");
const GRAPPLER_I_ID = toTypeId("41040");
const TD_I_ID = toTypeId("2108");
const TD_II_ID = toTypeId("2109");
const OPTIMAL_SCRIPT_ID = toTypeId("29005");
const TRACKING_SCRIPT_ID = toTypeId("29007");
const FALLOFF_SCRIPT_ID = toTypeId("29009");
const GRAPPLER_FAKE_ID = toTypeId("41041");
const PAINTER_II_ID = toTypeId("19806");

const defaultTurret: TurretSpec = {
  kind: "turret",
  tracking: 0.32,
  sigResolution: 40,
  optimal: 5000,
  falloff: 5000,
  damagePerShot: 0,
  cycleTime: 1,
  turretCount: 1,
};

const OPTIMAL_SCRIPT: DisruptionScriptSpec = {
  name: "Optimal Range Disruption Script", moduleId: OPTIMAL_SCRIPT_ID, trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2,
};
const TRACKING_SCRIPT: DisruptionScriptSpec = {
  name: "Tracking Speed Disruption Script", moduleId: TRACKING_SCRIPT_ID, trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0,
};

const TD: TrackingDisruptorSpec = {
  moduleName: "Tracking Disruptor II",
  moduleId: TD_II_ID,
  optimal: 48000,
  falloff: 24000,
  disruption: 0.1719,
  defaultScript: undefined,
  overloadStrengthBonusPercent: 20,
};

function webProjection(specs: readonly StasisWebSpec[], overloaded = false): EwarProjection {
  const loadout = { webs: specs, grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] };
  const activation = { webs: specs.map(() => ({ active: true, overloaded })), grapplers: [], disruptors: [], scramblers: [], painters: [] };
  return { loadout, activation };
}

function grapplerProjection(specs: readonly StasisGrapplerSpec[], overloaded = false): EwarProjection {
  const loadout = { webs: [], grapplers: specs, disruptors: [], scramblers: [], painters: [], scripts: [] };
  const activation = { webs: [], grapplers: specs.map(() => ({ active: true, overloaded })), disruptors: [], scramblers: [], painters: [] };
  return { loadout, activation };
}

function disruptorProjection(specs: readonly TrackingDisruptorSpec[], overloaded = false, script?: DisruptionScriptSpec): EwarProjection {
  const loadout = { webs: [], grapplers: [], disruptors: specs, scramblers: [], painters: [], scripts: [] };
  const activation = { webs: [], grapplers: [], disruptors: specs.map(() => ({ active: true, overloaded, script })), scramblers: [], painters: [] };
  return { loadout, activation };
}

function scramblerProjection(specs: readonly WarpScramblerSpec[], overloaded = false, active = true): EwarProjection {
  const loadout = { webs: [], grapplers: [], disruptors: [], scramblers: specs, painters: [], scripts: [] };
  const activation = { webs: [], grapplers: [], disruptors: [], scramblers: specs.map(() => ({ active, overloaded })), painters: [] };
  return { loadout, activation };
}

function painterProjection(specs: readonly TargetPainterSpec[], activations?: readonly PainterActivation[]): EwarProjection {
  const loadout = { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: specs, scripts: [] };
  const activation = activations ? { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: activations } : undefined;
  return { loadout, activation };
}

const PAINTER_II: TargetPainterSpec = {
  moduleName: "Target Painter II",
  moduleId: PAINTER_II_ID,
  maxRange: 36000,
  falloff: 90000,
  signatureRadiusBonusPercent: 30,
  overloadStrengthBonusPercent: 20,
};

describe("EwarResolverImpl", () => {
  describe("speedMultiplier", () => {
    test("single T2 web at 5 km multiplies by 1 - 0.6", () => {
      const projection = webProjection([{ moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }]);
      expect(resolver.speedMultiplier(projection, 5000)).toBeCloseTo(0.4, 10);
      expect(resolver.speedMultiplier(projection, 10001)).toBe(1);
    });

    test("overloaded web extends range by 30% with unchanged strength", () => {
      const projection = webProjection([{ moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }], true);
      expect(resolver.speedMultiplier(projection, 11000)).toBeCloseTo(0.4, 10);
      expect(resolver.speedMultiplier(projection, 14000)).toBe(1);
    });

    test("overloading one web extends only that web's range", () => {
      const baseWeb: StasisWebSpec = { moduleName: "Stasis Webifier I", moduleId: WEB_I_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const heatedWeb: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const loadout = { webs: [baseWeb, heatedWeb], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] };
      const activation = { webs: [{ active: true, overloaded: false }, { active: true, overloaded: true }], grapplers: [], disruptors: [], scramblers: []  , painters: [] };
      const projection: EwarProjection = { loadout, activation };
      expect(resolver.speedMultiplier(projection, 11000)).toBeCloseTo(0.4, 10);
      expect(resolver.speedMultiplier(projection, 13001)).toBe(1);
    });

    test("two identical webs penalizes the second", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web, web]);
      const secondPenalty = Math.exp(-1 / 7.1289);
      const expected = 0.4 * (1 + (0.4 - 1) * secondPenalty);
      expect(resolver.speedMultiplier(projection, 5000)).toBeCloseTo(expected, 10);
    });

    test("mixed web strengths are ordered strongest-first", () => {
      const strong: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const weak: StasisWebSpec = { moduleName: "Stasis Webifier I", moduleId: WEB_I_ID, maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 30 };
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
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = { loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] }, activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [] } };
      expect(resolver.speedMultiplier(projection, 5000)).toBeCloseTo(0.4, 10);
    });

    test("explicit active false still disables a web", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = { loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] }, activation: { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [], scramblers: [], painters: [] } };
      expect(resolver.speedMultiplier(projection, 5000)).toBe(1);
    });

    const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", moduleId: GRAPPLER_I_ID, optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };

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
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const loadout = { webs: [web], grapplers: [GRAPPLER], disruptors: [], scramblers: [], painters: [], scripts: [] };
      const activation = { webs: [{ active: true, overloaded: false }], grapplers: [{ active: true, overloaded: false }], disruptors: [], scramblers: []  , painters: [] };
      const projection: EwarProjection = { loadout, activation };
      expect(resolver.speedMultiplier(projection, 500)).toBeLessThan(0.2);
    });

    test("overloaded grappler extends optimal by bonus percent", () => {
      const projection = grapplerProjection([GRAPPLER], true);
      expect(resolver.speedMultiplier(projection, 3000)).toBeCloseTo(0.2, 10);
      expect(resolver.speedMultiplier(projection, 100000)).toBeCloseTo(1, 5);
    });

    test("inactive grappler is skipped", () => {
      const projection = { loadout: { webs: [], grapplers: [GRAPPLER], disruptors: [], scramblers: [], painters: [], scripts: [] }, activation: { webs: [], grapplers: [{ active: false, overloaded: false }], disruptors: [], scramblers: [], painters: [] } };
      expect(resolver.speedMultiplier(projection, 500)).toBe(1);
    });
  });

  describe("disruptedTurret", () => {
    const TD: TrackingDisruptorSpec = {
      moduleName: "Tracking Disruptor II",
      moduleId: TD_II_ID,
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
        loadout: { webs: [], grapplers: [], disruptors: [{ ...TD, defaultScript: OPTIMAL_SCRIPT }], scramblers: [], painters: [], scripts: [] },
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
      const loadout = { webs: [], grapplers: [], disruptors: [base, heated], scramblers: [], painters: [], scripts: [] };
      const activation = { webs: [], grapplers: [], disruptors: [{ active: true, overloaded: false, script: undefined }, { active: true, overloaded: true, script: undefined }], scramblers: []  , painters: [] };
      const projection: EwarProjection = { loadout, activation };
      const turret = resolver.disruptedTurret(defaultTurret, projection, 10000);
      const baseFactor = 1 - 0.15;
      const heatedFactor = 1 - 0.1719 * 1.2;
      const secondPenalty = Math.exp(-1 / 7.1289);
      const expected = defaultTurret.tracking * heatedFactor * (1 + (baseFactor - 1) * secondPenalty);
      expect(turret.tracking).toBeCloseTo(expected, 6);
    });

    test("falloff channel is driven by the script falloff multiplier", () => {
      const falloffScript: DisruptionScriptSpec = { name: "Falloff Script", moduleId: FALLOFF_SCRIPT_ID, trackingMultiplier: 0, optimalMultiplier: 0, falloffMultiplier: 2 };
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
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 0 };
      const projection = webProjection([web]);
      expect(resolver.speedMultiplierIgnoringRange(projection)).toBeCloseTo(resolver.speedMultiplier(projection, 0), 10);
    });

    test("stacks multiple webs the same way as at point-blank range", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 0 };
      const projection = webProjection([web, web]);
      expect(resolver.speedMultiplierIgnoringRange(projection)).toBeCloseTo(resolver.speedMultiplier(projection, 0), 10);
    });

    test("skips inactive modules", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 0 };
      const projection = { loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] }, activation: { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [], scramblers: [], painters: [] } };
      expect(resolver.speedMultiplierIgnoringRange(projection)).toBe(1);
    });

    test("overloaded web applies the same speed penalty at point-blank", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
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
        loadout: { webs: [], grapplers: [], disruptors: [TD], scramblers: [], painters: [], scripts: [] },
        activation: { webs: [], grapplers: [], disruptors: [{ active: false, overloaded: false, script: undefined }], scramblers: []  , painters: [] },
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
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 }]);
      expect(resolver.propulsionSuppressedIgnoringRange(projection)).toBe(true);
    });

    test("returns false when all scramblers are inactive", () => {
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 }], false, false);
      expect(resolver.propulsionSuppressedIgnoringRange(projection)).toBe(false);
    });
  });

  describe("propulsionSuppressed", () => {
    test("no projection is not suppressed", () => {
      expect(resolver.propulsionSuppressed(undefined, 5000)).toBe(false);
    });

    test("single T2 scram suppresses inside range", () => {
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 }]);
      expect(resolver.propulsionSuppressed(projection, 8999)).toBe(true);
      expect(resolver.propulsionSuppressed(projection, 9000)).toBe(true);
      expect(resolver.propulsionSuppressed(projection, 9001)).toBe(false);
    });

    test("overload extends scram range by 20%", () => {
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 }], true);
      expect(resolver.propulsionSuppressed(projection, 10_799)).toBe(true);
      expect(resolver.propulsionSuppressed(projection, 10_801)).toBe(false);
    });

    test("inactive scrambler does not suppress", () => {
      const projection = scramblerProjection([{ moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 }], false, false);
      expect(resolver.propulsionSuppressed(projection, 5000)).toBe(false);
    });

    test("a scrambler missing from a partial activation array is treated as active", () => {
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 };
      const projection: EwarProjection = { loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [scrambler], painters: [], scripts: [] }, activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [] } };
      expect(resolver.propulsionSuppressed(projection, 5000)).toBe(true);
    });
  });

  describe("appliedEffects", () => {
    test("undefined projection returns empty", () => {
      expect(resolver.appliedEffects(undefined, 5000)).toEqual([]);
    });

    test("web applies at and within max range and not beyond", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web]);
      expect(resolver.appliedEffects(projection, 10000)).toEqual([{ family: "web", moduleId: WEB_II_ID }]);
      expect(resolver.appliedEffects(projection, 10001)).toEqual([]);
    });

    test("inactive web is skipped", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection: EwarProjection = {
        loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] },
        activation: { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [], scramblers: []  , painters: [] },
      };
      expect(resolver.appliedEffects(projection, 5000)).toEqual([]);
    });

    test("overloaded web extends range by bonus percent", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web], true);
      expect(resolver.appliedEffects(projection, 13000)).toEqual([{ family: "web", moduleId: WEB_II_ID }]);
      expect(resolver.appliedEffects(projection, 13001)).toEqual([]);
    });

    test("scrambler applies at and within max range and not beyond", () => {
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 };
      const projection = scramblerProjection([scrambler]);
      expect(resolver.appliedEffects(projection, 9000)).toEqual([{ family: "scrambler", moduleId: SCRAM_II_ID }]);
      expect(resolver.appliedEffects(projection, 9001)).toEqual([]);
    });

    test("inactive scrambler is skipped", () => {
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 };
      const projection = scramblerProjection([scrambler], false, false);
      expect(resolver.appliedEffects(projection, 5000)).toEqual([]);
    });

    test("overloaded scrambler extends range by bonus percent", () => {
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 };
      const projection = scramblerProjection([scrambler], true);
      expect(resolver.appliedEffects(projection, 10800)).toEqual([{ family: "scrambler", moduleId: SCRAM_II_ID }]);
      expect(resolver.appliedEffects(projection, 10801)).toEqual([]);
    });

    test("grappler applies while falloff effectiveness is at least 0.01", () => {
      const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", moduleId: GRAPPLER_I_ID, optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
      const projection = grapplerProjection([GRAPPLER]);
      expect(resolver.appliedEffects(projection, 21000)).toEqual([{ family: "grappler", moduleId: GRAPPLER_I_ID }]);
      expect(resolver.appliedEffects(projection, 22000)).toEqual([]);
    });

    test("inactive grappler is skipped", () => {
      const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", moduleId: GRAPPLER_I_ID, optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
      const projection: EwarProjection = {
        loadout: { webs: [], grapplers: [GRAPPLER], disruptors: [], scramblers: [], painters: [], scripts: [] },
        activation: { webs: [], grapplers: [{ active: false, overloaded: false }], disruptors: [], scramblers: []  , painters: [] },
      };
      expect(resolver.appliedEffects(projection, 500)).toEqual([]);
    });

    test("overloaded grappler scales optimal before evaluating effectiveness", () => {
      const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", moduleId: GRAPPLER_I_ID, optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
      const projection = grapplerProjection([GRAPPLER], true);
      expect(resolver.appliedEffects(projection, 22000)).toEqual([{ family: "grappler", moduleId: GRAPPLER_I_ID }]);
    });

    test("disruptor applies while falloff effectiveness is at least 0.01 and ignores script", () => {
      const disruptor: TrackingDisruptorSpec = {
        moduleName: "Tracking Disruptor II",
        moduleId: TD_II_ID,
        optimal: 48000,
        falloff: 24000,
        disruption: 0.1719,
        defaultScript: {
          name: "Optimal Range Disruption Script",
          moduleId: OPTIMAL_SCRIPT_ID,
          trackingMultiplier: 0,
          optimalMultiplier: 2,
          falloffMultiplier: 2,
        },
        overloadStrengthBonusPercent: 20,
      };
      const projection = disruptorProjection([disruptor]);
      expect(resolver.appliedEffects(projection, 109800)).toEqual([{ family: "disruptor", moduleId: TD_II_ID }]);
      expect(resolver.appliedEffects(projection, 110000)).toEqual([]);
    });

    test("inactive disruptor is skipped", () => {
      const projection: EwarProjection = {
        loadout: { webs: [], grapplers: [], disruptors: [TD], scramblers: [], painters: [], scripts: [] },
        activation: { webs: [], grapplers: [], disruptors: [{ active: false, overloaded: false, script: undefined }], scramblers: []  , painters: [] },
      };
      expect(resolver.appliedEffects(projection, 10000)).toEqual([]);
    });

    test("multiple applying instances of one family use the first in loadout order", () => {
      const first: StasisWebSpec = { moduleName: "Stasis Webifier I", moduleId: WEB_I_ID, maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 15 };
      const second: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 15000, speedFactor: 0.55, overloadRangeBonusPercent: 15 };
      const projection = webProjection([first, second]);
      const expected: AppliedEwarEffect[] = [{ family: "web", moduleId: WEB_I_ID }];
      expect(resolver.appliedEffects(projection, 9000)).toEqual(expected);
    });

    test("output order is web, grappler, scrambler, disruptor", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 50000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const grappler: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", moduleId: GRAPPLER_I_ID, optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 50000, overloadRangeBonusPercent: 20 };
      const disruptor: TrackingDisruptorSpec = { moduleName: "Tracking Disruptor II", moduleId: TD_II_ID, optimal: 48000, falloff: 24000, disruption: 0.1719, defaultScript: undefined, overloadStrengthBonusPercent: 20 };
      const loadout = { webs: [web], grapplers: [grappler], disruptors: [disruptor], scramblers: [scrambler], painters: [], scripts: [] };
      const activation = {
        webs: [{ active: true, overloaded: false }],
        grapplers: [{ active: true, overloaded: false }],
        disruptors: [{ active: true, overloaded: false, script: undefined }],
        scramblers: [{ active: true, overloaded: false }],
        painters: [],
      };
      const projection: EwarProjection = { loadout, activation };
      expect(resolver.appliedEffects(projection, 1000)).toEqual([
        { family: "web", moduleId: WEB_II_ID },
        { family: "grappler", moduleId: GRAPPLER_I_ID },
        { family: "scrambler", moduleId: SCRAM_II_ID },
        { family: "disruptor", moduleId: TD_II_ID },
      ]);
    });
  });

  describe("speedBreakdown", () => {
    const GRAPPLER: StasisGrapplerSpec = {
      moduleName: "Heavy Stasis Grappler I",
      moduleId: GRAPPLER_I_ID,
      optimal: 1000,
      falloff: 8000,
      speedFactor: 0.8,
      overloadOptimalBonusPercent: 300,
    };

    test("no projection returns empty effects and no suppression", () => {
      expect(resolver.speedBreakdown(undefined, 5000)).toEqual({ effects: [], propulsionSuppressed: false });
    });

    test("web at and within max range and not beyond", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web]);
      expect(resolver.speedBreakdown(projection, 10000)).toEqual({
        effects: [{ family: "web", moduleId: WEB_II_ID, multiplier: 0.4 }],
        propulsionSuppressed: false,
      });
      expect(resolver.speedBreakdown(projection, 10001)).toEqual({ effects: [], propulsionSuppressed: false });
    });

    test("inactive web is skipped", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection: EwarProjection = {
        loadout: { webs: [web], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] },
        activation: { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [], scramblers: []  , painters: [] },
      };
      expect(resolver.speedBreakdown(projection, 5000)).toEqual({ effects: [], propulsionSuppressed: false });
    });

    test("overloaded web extends range before boundary check", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const projection = webProjection([web], true);
      expect(resolver.speedBreakdown(projection, 13000)).toEqual({
        effects: [{ family: "web", moduleId: WEB_II_ID, multiplier: 0.4 }],
        propulsionSuppressed: false,
      });
      expect(resolver.speedBreakdown(projection, 13001)).toEqual({ effects: [], propulsionSuppressed: false });
    });

    test("two applying webs pick the strongest representative regardless of loadout order", () => {
      const weak: StasisWebSpec = { moduleName: "Stasis Webifier I", moduleId: WEB_I_ID, maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 15 };
      const strong: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 15 };
      expect(resolver.speedBreakdown(webProjection([weak, strong]), 5000).effects).toEqual([
        { family: "web", moduleId: WEB_II_ID, multiplier: 0.4 },
      ]);
      expect(resolver.speedBreakdown(webProjection([strong, weak]), 5000).effects).toEqual([
        { family: "web", moduleId: WEB_II_ID, multiplier: 0.4 },
      ]);
    });

    test("equal-strength webs tie-break by loadout order", () => {
      const first: StasisWebSpec = { moduleName: "Stasis Webifier I", moduleId: WEB_I_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 15 };
      const second: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 15 };
      expect(resolver.speedBreakdown(webProjection([first, second]), 5000).effects).toEqual([
        { family: "web", moduleId: WEB_I_ID, multiplier: 0.4 },
      ]);
    });

    test("grappler multiplier follows the speedMultipliers formula and is present while falloff effectiveness is positive", () => {
      const projection = grapplerProjection([GRAPPLER]);
      const atOptimal = resolver.speedBreakdown(projection, 500);
      expect(atOptimal.effects).toHaveLength(1);
      expect(atOptimal.effects[0].family).toBe("grappler");
      expect(atOptimal.effects[0].moduleId).toBe(GRAPPLER_I_ID);
      expect(atOptimal.effects[0].multiplier).toBeCloseTo(0.2, 10);
      const atOptimalPlusFalloff = resolver.speedBreakdown(projection, 9000);
      expect(atOptimalPlusFalloff.effects[0].multiplier).toBeCloseTo(0.6, 10);
    });

    test("grappler with zero falloff is absent beyond optimal", () => {
      const grappler: StasisGrapplerSpec = {
        moduleName: "Grappler",
        moduleId: GRAPPLER_FAKE_ID,
        optimal: 1000,
        falloff: 0,
        speedFactor: 0.8,
        overloadOptimalBonusPercent: 0,
      };
      const projection = grapplerProjection([grappler]);
      const atOptimal = resolver.speedBreakdown(projection, 1000);
      expect(atOptimal.effects).toHaveLength(1);
      expect(atOptimal.effects[0].family).toBe("grappler");
      expect(atOptimal.effects[0].moduleId).toBe(GRAPPLER_FAKE_ID);
      expect(atOptimal.effects[0].multiplier).toBeCloseTo(0.2, 10);
      expect(resolver.speedBreakdown(projection, 1001)).toEqual({ effects: [], propulsionSuppressed: false });
    });

    test("inactive grappler is skipped", () => {
      const projection: EwarProjection = {
        loadout: { webs: [], grapplers: [GRAPPLER], disruptors: [], scramblers: [], painters: [], scripts: [] },
        activation: { webs: [], grapplers: [{ active: false, overloaded: false }], disruptors: [], scramblers: []  , painters: [] },
      };
      expect(resolver.speedBreakdown(projection, 500)).toEqual({ effects: [], propulsionSuppressed: false });
    });

    test("propulsionSuppressed mirrors the existing method", () => {
      const scrambler: WarpScramblerSpec = { moduleName: "Warp Scrambler II", moduleId: SCRAM_II_ID, maxRange: 9000, overloadRangeBonusPercent: 20 };
      expect(resolver.speedBreakdown(scramblerProjection([scrambler]), 9000).propulsionSuppressed).toBe(true);
      expect(resolver.speedBreakdown(scramblerProjection([scrambler], false, false), 5000).propulsionSuppressed).toBe(false);
      expect(resolver.speedBreakdown(undefined, 5000).propulsionSuppressed).toBe(false);
    });

    test("speed effects are emitted in web, grappler order", () => {
      const web: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 50000, speedFactor: 0.6, overloadRangeBonusPercent: 30 };
      const loadout = { webs: [web], grapplers: [GRAPPLER], disruptors: [], scramblers: [], painters: [], scripts: [] };
      const activation = {
        webs: [{ active: true, overloaded: false }],
        grapplers: [{ active: true, overloaded: false }],
        disruptors: [],
        scramblers: [],
      painters: [],
      };
      const projection: EwarProjection = { loadout, activation };
      const effects = resolver.speedBreakdown(projection, 500).effects;
      expect(effects[0].family).toBe("web");
      expect(effects[1].family).toBe("grappler");
    });

    test("active in-range scrambler is emitted as the last speed effect", () => {
      const web: StasisWebSpec = {
        moduleName: "Stasis Webifier II",
        moduleId: WEB_II_ID,
        maxRange: 50000,
        speedFactor: 0.6,
        overloadRangeBonusPercent: 30,
      };
      const scrambler: WarpScramblerSpec = {
        moduleName: "Warp Scrambler II",
        moduleId: SCRAM_II_ID,
        maxRange: 9000,
        overloadRangeBonusPercent: 20,
      };
      const loadout = { webs: [web], grapplers: [], disruptors: [], scramblers: [scrambler], painters: [], scripts: [] };
      const activation = {
        webs: [{ active: true, overloaded: false }],
        grapplers: [],
        disruptors: [],
        scramblers: [{ active: true, overloaded: false }],
        painters: [],
      };
      const projection: EwarProjection = { loadout, activation };
      const breakdown = resolver.speedBreakdown(projection, 5000);
      expect(breakdown.propulsionSuppressed).toBe(true);
      expect(breakdown.effects).toHaveLength(2);
      expect(breakdown.effects[0].family).toBe("web");
      expect(breakdown.effects[1]).toEqual({ family: "scrambler", moduleId: SCRAM_II_ID, multiplier: 1 });
    });
  });

  describe("disruptionBreakdown", () => {
    test("no projection returns empty arrays", () => {
      expect(resolver.disruptionBreakdown(undefined, 10000)).toEqual({ tracking: [], optimal: [], falloff: [] });
    });

    test("unscripted disruptor produces one entry per stat with undefined scriptId", () => {
      const projection = disruptorProjection([TD]);
      const breakdown = resolver.disruptionBreakdown(projection, 10000);
      expect(breakdown.tracking).toHaveLength(1);
      expect(breakdown.optimal).toHaveLength(1);
      expect(breakdown.falloff).toHaveLength(1);
      for (const stat of ["tracking", "optimal", "falloff"] as const) {
        const entry = breakdown[stat][0];
        expect(entry.moduleId).toBe(TD_II_ID);
        expect(entry.scriptId).toBeUndefined();
        expect(entry.multiplier).toBeCloseTo(0.8281, 10);
      }
    });

    test("default optimal script affects only optimal and falloff", () => {
      const projection = disruptorProjection([{ ...TD, defaultScript: OPTIMAL_SCRIPT }]);
      const breakdown = resolver.disruptionBreakdown(projection, 10000);
      expect(breakdown.tracking).toHaveLength(0);
      expect(breakdown.optimal).toHaveLength(1);
      expect(breakdown.falloff).toHaveLength(1);
      expect(breakdown.optimal[0].scriptId).toBe(OPTIMAL_SCRIPT_ID);
      expect(breakdown.optimal[0].multiplier).toBeCloseTo(0.6562, 10);
      expect(breakdown.falloff[0].multiplier).toBeCloseTo(0.6562, 10);
    });

    test("explicit tracking script overrides default and affects only tracking", () => {
      const projection = disruptorProjection([{ ...TD, defaultScript: OPTIMAL_SCRIPT }], false, TRACKING_SCRIPT);
      const breakdown = resolver.disruptionBreakdown(projection, 10000);
      expect(breakdown.tracking).toHaveLength(1);
      expect(breakdown.optimal).toHaveLength(0);
      expect(breakdown.falloff).toHaveLength(0);
      expect(breakdown.tracking[0].scriptId).toBe(TRACKING_SCRIPT_ID);
      expect(breakdown.tracking[0].multiplier).toBeCloseTo(0.6562, 10);
    });

    test("overload scales the disruptor multiplier", () => {
      const projection = disruptorProjection([TD], true);
      const breakdown = resolver.disruptionBreakdown(projection, 10000);
      expect(breakdown.tracking[0].multiplier).toBeCloseTo(1 - 0.1719 * 1.2, 10);
    });

    test("inactive disruptor is skipped", () => {
      const projection: EwarProjection = {
        loadout: { webs: [], grapplers: [], disruptors: [TD], scramblers: [], painters: [], scripts: [] },
        activation: { webs: [], grapplers: [], disruptors: [{ active: false, overloaded: false, script: undefined }], scramblers: []  , painters: [] },
      };
      expect(resolver.disruptionBreakdown(projection, 10000)).toEqual({ tracking: [], optimal: [], falloff: [] });
    });

    test("entries preserve moduleId and scriptId and are returned in loadout order", () => {
      const first: TrackingDisruptorSpec = { ...TD, moduleName: "Tracking Disruptor I", moduleId: TD_I_ID };
      const second: TrackingDisruptorSpec = { ...TD, moduleName: "Tracking Disruptor II", moduleId: TD_II_ID };
      const projection = disruptorProjection([first, second]);
      const breakdown = resolver.disruptionBreakdown(projection, 10000);
      expect(breakdown.tracking.map((entry) => entry.moduleId)).toEqual([TD_I_ID, TD_II_ID]);
    });
  });

  describe("sigMultiplier", () => {
    test("returns 1 for undefined projection", () => {
      expect(resolver.sigMultiplier(undefined, 5000)).toBe(1);
    });

    test("returns 1 when no painters are present", () => {
      const projection = webProjection([{ moduleName: "Stasis Webifier II", moduleId: WEB_II_ID, maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }]);
      expect(resolver.sigMultiplier(projection, 5000)).toBe(1);
    });

    test("single T2 painter at 5 km multiplies sig by 1.30", () => {
      const projection = painterProjection([PAINTER_II], [{ active: true, overloaded: false }]);
      expect(resolver.sigMultiplier(projection, 5000)).toBeCloseTo(1.30, 10);
    });

    test("painter beyond optimal applies falloff effectiveness", () => {
      const projection = painterProjection([PAINTER_II], [{ active: true, overloaded: false }]);
      const result = resolver.sigMultiplier(projection, 60000);
      expect(result).toBeGreaterThan(1);
      expect(result).toBeLessThan(1.30);
    });

    test("painter at optimal boundary applies full bonus", () => {
      const projection = painterProjection([PAINTER_II], [{ active: true, overloaded: false }]);
      expect(resolver.sigMultiplier(projection, 36000)).toBeCloseTo(1.30, 10);
    });

    test("inactive painter contributes no bonus", () => {
      const projection = painterProjection([PAINTER_II], [{ active: false, overloaded: false }]);
      expect(resolver.sigMultiplier(projection, 5000)).toBe(1);
    });

    test("overloaded painter applies overload strength bonus", () => {
      const projection = painterProjection([PAINTER_II], [{ active: true, overloaded: true }]);
      const expected = 1 + (30 * 1.2) / 100;
      expect(resolver.sigMultiplier(projection, 5000)).toBeCloseTo(expected, 10);
    });

    test("multiple painters apply stacking penalties", () => {
      const projection = painterProjection([PAINTER_II, PAINTER_II], [{ active: true, overloaded: false }, { active: true, overloaded: false }]);
      const result = resolver.sigMultiplier(projection, 5000);
      const secondPenalty = Math.exp(-(1 * 1) / 7.1289);
      const expected = 1.30 * (1 + 0.30 * secondPenalty);
      expect(result).toBeCloseTo(expected, 6);
    });

    test("sigMultiplierIgnoringRange ignores falloff", () => {
      const projection = painterProjection([PAINTER_II], [{ active: true, overloaded: false }]);
      expect(resolver.sigMultiplierIgnoringRange(projection)).toBeCloseTo(1.30, 10);
    });
  });
});
