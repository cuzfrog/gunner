import { toTypeId } from "../../../gamedata/ids";
import { ZERO_DAMAGE, type DisruptionScriptSpec, type EwarEffectPotentials, type EwarProjection, type EwarReach, type EwarResolver, type SensorDampenerScriptSpec, type SensorDampenerSpec, type SensorSpec, type StasisGrapplerSpec, type StasisWebSpec, type TargetPainterSpec, type TrackingDisruptorSpec, type TurretSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import { EwarEffectDescriberImpl } from "./ewarEffectDescriber";

const unitTurret: TurretSpec = { kind: "turret", tracking: 1, sigResolution: 1, optimal: 1, falloff: 1, damagePerShot: ZERO_DAMAGE, cycleTime: 1, turretCount: 1 };
const unitSensor: SensorSpec = { scanResolution: 1, maxTargetingRange: 1, maxLockedTargets: 1 };

const IDENTITY_POTENTIALS: EwarEffectPotentials = {
  speedMultiplier: 1, sigMultiplier: 1, propulsionSuppressed: false,
  trackingMultiplier: 1, optimalMultiplier: 1, falloffMultiplier: 1,
  scanResolutionMultiplier: 1, targetingRangeMultiplier: 1,
};

const ZERO_REACH: EwarReach = { web: 0, grappler: 0, scrambler: 0, disruptor: 0, painter: 0, dampener: 0 };

const resolver = vi.mocked<EwarResolver>({
  speedMultiplier: vi.fn(),
  speedMultiplierIgnoringRange: vi.fn(),
  sigMultiplier: vi.fn(),
  sigMultiplierIgnoringRange: vi.fn(),
  disruptedTurret: vi.fn(),
  disruptedTurretIgnoringRange: vi.fn(),
  propulsionSuppressed: vi.fn(),
  propulsionSuppressedIgnoringRange: vi.fn(),
  appliedEffects: vi.fn(),
  speedBreakdown: vi.fn(() => ({ effects: [], propulsionSuppressed: false })),
  disruptionBreakdown: vi.fn(() => ({ tracking: [], optimal: [], falloff: [] })),
  dampenedSensorSpec: vi.fn((spec) => spec),
  dampenedSensorSpecIgnoringRange: vi.fn((spec) => spec),
  dampenerBreakdown: vi.fn(() => ({ scanResolution: [], maxTargetRange: [] })),
  reach: vi.fn(() => ZERO_REACH),
  potentials: vi.fn(() => IDENTITY_POTENTIALS),
});

const LABELS: Record<string, string> = {
  "ewar.hover.web": "Reduce speed by",
  "ewar.hover.tracking": "Tracking",
  "ewar.hover.optimal": "Optimal",
  "ewar.hover.falloff": "Falloff",
  "ewar.hover.scrambler": "Disables MWD",
  "ewar.hover.sigRadius": "Signature radius",
  "ewar.hover.scanResolution": "Scan resolution",
  "ewar.hover.targetingRange": "Targeting range",
  "ewar.hover.outOfRange": "No effect at this range",
  "ewar.hint.range": "range {0}",
  "unit.meter": "m",
  "unit.kilometer": "km",
};

const i18n = vi.mocked<I18n>({
  current: vi.fn(),
  setLanguage: vi.fn(),
  t: vi.fn((key) => LABELS[key] ?? key),
  translateDocument: vi.fn(),
});

const describer = new EwarEffectDescriberImpl({ ewarResolver: resolver, i18n });
const projection: EwarProjection = { loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], } };
const distance = 5000;

beforeEach(() => {
  resolver.speedMultiplier.mockReturnValue(1);
  resolver.speedMultiplierIgnoringRange.mockReturnValue(1);
  resolver.disruptedTurret.mockReturnValue(unitTurret);
  resolver.disruptedTurretIgnoringRange.mockReturnValue(unitTurret);
  resolver.propulsionSuppressed.mockReturnValue(false);
  resolver.propulsionSuppressedIgnoringRange.mockReturnValue(false);
  resolver.reach.mockReturnValue(ZERO_REACH);
  resolver.potentials.mockReturnValue(IDENTITY_POTENTIALS);
  i18n.t.mockImplementation((key) => LABELS[key] ?? key);
});

describe("EwarEffectDescriber", () => {
  test("webDescription reports percentage reduction when multiplier is below 1", () => {
    resolver.speedMultiplier.mockReturnValue(0.63);
    expect(describer.webDescription(projection, distance)).toBe("Reduce speed by 37%");
    expect(resolver.speedMultiplier).toHaveBeenCalledWith(projection, distance);
  });

  test("webDescription reports out-of-range text when multiplier is 1", () => {
    resolver.speedMultiplier.mockReturnValue(1);
    expect(describer.webDescription(projection, distance)).toBe("No effect at this range");
  });

  test("grapplerDescription reports percentage reduction when multiplier is below 1", () => {
    resolver.speedMultiplier.mockReturnValue(0.63);
    expect(describer.grapplerDescription(projection, distance)).toBe("Reduce speed by 37%");
    expect(resolver.speedMultiplier).toHaveBeenCalledWith(projection, distance);
  });

  test("grapplerDescription reports out-of-range text when multiplier is 1", () => {
    resolver.speedMultiplier.mockReturnValue(1);
    expect(describer.grapplerDescription(projection, distance)).toBe("No effect at this range");
  });

  test("disruptorDescription composes per-channel percentages for a disrupted unit turret", () => {
    resolver.disruptedTurret.mockReturnValue({ ...unitTurret, tracking: 0.7, optimal: 0.55, falloff: 0.55 });
    expect(describer.disruptorDescription(projection, distance)).toBe("Tracking -30% · Optimal -45% · Falloff -45%");
    expect(resolver.disruptedTurret).toHaveBeenCalledWith(unitTurret, projection, distance);
  });

  test("disruptorDescription reports out-of-range text when all channels round to 0", () => {
    resolver.disruptedTurret.mockReturnValue({ ...unitTurret, tracking: 0.999, optimal: 0.999, falloff: 0.999 });
    expect(describer.disruptorDescription(projection, distance)).toBe("No effect at this range");
  });

  test("scramblerDescription reports MWD disabled when propulsion is suppressed", () => {
    resolver.propulsionSuppressed.mockReturnValue(true);
    expect(describer.scramblerDescription(projection, distance)).toBe("Disables MWD");
    expect(resolver.propulsionSuppressed).toHaveBeenCalledWith(projection, distance);
  });

  test("scramblerDescription reports out-of-range text when propulsion is not suppressed", () => {
    resolver.propulsionSuppressed.mockReturnValue(false);
    expect(describer.scramblerDescription(projection, distance)).toBe("No effect at this range");
  });

  test("webHint reports percentage and ignores the current distance", () => {
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, speedMultiplier: 0.63 });
    expect(describer.webHint(projection)).toBe("Reduce speed by 37% · range 0 m");
    expect(resolver.potentials).toHaveBeenCalledWith(projection);
    expect(resolver.speedMultiplier).not.toHaveBeenCalled();
  });

  test("grapplerHint reports percentage and ignores the current distance", () => {
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, speedMultiplier: 0.5 });
    expect(describer.grapplerHint(projection)).toBe("Reduce speed by 50% · range 0 m");
    expect(resolver.potentials).toHaveBeenCalledWith(projection);
  });

  test("disruptorHint reports percentages and ignores the current distance", () => {
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, trackingMultiplier: 0.7, optimalMultiplier: 0.55, falloffMultiplier: 0.55 });
    expect(describer.disruptorHint(projection)).toBe("Tracking -30% · Optimal -45% · Falloff -45% · range 0 m");
    expect(resolver.potentials).toHaveBeenCalledWith(projection);
  });

  test("scramblerHint reports MWD disabled ignoring the current distance", () => {
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, propulsionSuppressed: true });
    expect(describer.scramblerHint(projection)).toBe("Disables MWD · range 0 m");
    expect(resolver.potentials).toHaveBeenCalledWith(projection);
  });

  test("scramblerHint reports out of range when no active scrambler is present", () => {
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, propulsionSuppressed: false });
    expect(describer.scramblerHint(projection)).toBe("No effect at this range · range 0 m");
  });

  test("webHint formats the overloaded range of a fitted web", () => {
    const webProjection = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }],
        grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [],
        dampenerScripts: [],
      },
      activation: { webs: [{ active: true, overloaded: true }], grapplers: [], disruptors: [], scramblers: []  , painters: [], dampeners: [] },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, speedMultiplier: 0.4 });
    resolver.reach.mockReturnValue({ ...ZERO_REACH, web: 13000 });
    expect(describer.webHint(webProjection)).toBe("Reduce speed by 60% · range 13.0 km");
  });

  test("disruptorHint formats the reach of an overloaded disruptor", () => {
    const disruptorProjection = {
      loadout: {
        webs: [], grapplers: [],
        disruptors: [{ moduleName: "Tracking Disruptor II", moduleId: toTypeId("2109"), optimal: 48000, falloff: 24000, disruption: 0.1719, defaultScript: undefined, overloadStrengthBonusPercent: 20 }],
        scramblers: [], painters: [], dampeners: [], scripts: [],
        dampenerScripts: [],
      },
      activation: { webs: [], grapplers: [], disruptors: [{ active: true, overloaded: true, script: undefined }], scramblers: []  , painters: [], dampeners: [] },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, trackingMultiplier: 0.7, optimalMultiplier: 0.55, falloffMultiplier: 0.55 });
    resolver.reach.mockReturnValue({ ...ZERO_REACH, disruptor: 72000 });
    expect(describer.disruptorHint(disruptorProjection)).toBe("Tracking -30% · Optimal -45% · Falloff -45% · range 72.0 km");
  });

  test("scramblerHint shows suppression and the overloaded scrambler range", () => {
    const scramblerProjection = {
      loadout: {
        webs: [], grapplers: [], disruptors: [],
        scramblers: [{ moduleName: "Warp Scrambler II", moduleId: toTypeId("448"), maxRange: 9000, overloadRangeBonusPercent: 20 }],
        painters: [], dampeners: [], scripts: [],
        dampenerScripts: [],
      },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [{ active: true, overloaded: true }], painters: [], dampeners: [] },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, propulsionSuppressed: true });
    resolver.reach.mockReturnValue({ ...ZERO_REACH, scrambler: 10800 });
    expect(describer.scramblerHint(scramblerProjection)).toBe("Disables MWD · range 10.8 km");
  });

  test("webModuleEffect reports the speed reduction from the spec", () => {
    const spec: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 10000, speedFactor: 0.55, overloadRangeBonusPercent: 30 };
    expect(describer.webModuleEffect(spec)).toBe("Reduce speed by 55%");
  });

  test("webModuleEffect reports out-of-range when speedFactor is 0", () => {
    const spec: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 10000, speedFactor: 0, overloadRangeBonusPercent: 30 };
    expect(describer.webModuleEffect(spec)).toBe("No effect at this range");
  });

  test("grapplerModuleEffect reports the speed reduction from the spec", () => {
    const spec: StasisGrapplerSpec = { moduleName: "Stasis Grappler II", moduleId: toTypeId("449"), optimal: 20000, falloff: 10000, speedFactor: 0.45, overloadOptimalBonusPercent: 30 };
    expect(describer.grapplerModuleEffect(spec)).toBe("Reduce speed by 45%");
  });

  test("disruptorModuleEffect reports per-channel percentages without a script", () => {
    const spec: TrackingDisruptorSpec = { moduleName: "Tracking Disruptor II", moduleId: toTypeId("2109"), optimal: 48000, falloff: 24000, disruption: 0.1719, defaultScript: undefined, overloadStrengthBonusPercent: 20 };
    expect(describer.disruptorModuleEffect(spec, undefined)).toBe("Tracking -17% · Optimal -17% · Falloff -17%");
  });

  test("disruptorModuleEffect applies script multipliers to the disruption strength", () => {
    const spec: TrackingDisruptorSpec = { moduleName: "Tracking Disruptor II", moduleId: toTypeId("2109"), optimal: 48000, falloff: 24000, disruption: 0.1719, defaultScript: undefined, overloadStrengthBonusPercent: 20 };
    const script: DisruptionScriptSpec = { name: "Optimal Range Script", moduleId: toTypeId("28999"), trackingMultiplier: 0, optimalMultiplier: 1.5, falloffMultiplier: 1.5 };
    expect(describer.disruptorModuleEffect(spec, script)).toBe("Tracking -0% · Optimal -26% · Falloff -26%");
  });

  test("scramblerModuleEffect reports MWD disabled", () => {
    expect(describer.scramblerModuleEffect()).toBe("Disables MWD");
  });

  test("webModuleEffect agrees with webHint for a single-web projection at point-blank range", () => {
    const speedFactor = 0.6;
    const webSpec: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 10000, speedFactor, overloadRangeBonusPercent: 30 };
    const webProj = {
      loadout: { webs: [webSpec], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
      activation: { webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [] },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, speedMultiplier: 1 - speedFactor });
    const hintEffect = describer.webHint(webProj).split(" · ")[0];
    expect(describer.webModuleEffect(webSpec)).toBe(hintEffect);
  });

  test("painterHint reports signature bonus and range", () => {
    const painterSpec: TargetPainterSpec = { moduleName: "Target Painter II", moduleId: toTypeId("12275"), maxRange: 36000, falloff: 90000, signatureRadiusBonusPercent: 30, overloadStrengthBonusPercent: 20 };
    const painterProj = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [painterSpec], dampeners: [], scripts: [], dampenerScripts: [], },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [{ active: true, overloaded: false }], dampeners: [] },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, sigMultiplier: 1.3 });
    resolver.reach.mockReturnValue({ ...ZERO_REACH, painter: 126000 });
    expect(describer.painterHint(painterProj)).toBe("Signature radius +30% · range 126.0 km");
  });

  test("painterHint reports out of range when no active painter", () => {
    const painterProj = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, sigMultiplier: 1 });
    expect(describer.painterHint(painterProj)).toBe("No effect at this range · range 0 m");
  });

  test("painterModuleEffect reports signature bonus percentage", () => {
    const painterSpec: TargetPainterSpec = { moduleName: "Target Painter II", moduleId: toTypeId("12275"), maxRange: 36000, falloff: 90000, signatureRadiusBonusPercent: 30, overloadStrengthBonusPercent: 20 };
    expect(describer.painterModuleEffect(painterSpec)).toBe("Signature radius +30%");
  });

  test("dampenerHint reports scan resolution and targeting range reductions and range", () => {
    const dampenerSpec: SensorDampenerSpec = { moduleName: "Sensor Dampener II", moduleId: toTypeId("2120"), optimal: 48000, falloff: 24000, scanResolutionBonusPercent: -40, maxTargetRangeBonusPercent: -40, overloadStrengthBonusPercent: 20, defaultScript: undefined };
    const dampenerProj = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [dampenerSpec], scripts: [], dampenerScripts: [], },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [{ active: true, overloaded: false, script: undefined }] },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, scanResolutionMultiplier: 0.6, targetingRangeMultiplier: 0.6 });
    resolver.reach.mockReturnValue({ ...ZERO_REACH, dampener: 72000 });
    expect(describer.dampenerHint(dampenerProj)).toBe("Scan resolution -40% · Targeting range -40% · range 72.0 km");
  });

  test("dampenerHint reports out of range when no active dampener", () => {
    const dampenerProj = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, scanResolutionMultiplier: 1, targetingRangeMultiplier: 1 });
    expect(describer.dampenerHint(dampenerProj)).toBe("No effect at this range · range 0 m");
  });

  test("dampenerModuleEffect reports scan resolution and targeting range reductions", () => {
    const dampenerSpec: SensorDampenerSpec = { moduleName: "Sensor Dampener II", moduleId: toTypeId("2120"), optimal: 48000, falloff: 24000, scanResolutionBonusPercent: -36, maxTargetRangeBonusPercent: -48, overloadStrengthBonusPercent: 20, defaultScript: undefined };
    expect(describer.dampenerModuleEffect(dampenerSpec, undefined)).toBe("Scan resolution -36% · Targeting range -48%");
  });

  test("dampenerModuleEffect reports out of range when both bonuses are zero", () => {
    const dampenerSpec: SensorDampenerSpec = { moduleName: "Sensor Dampener II", moduleId: toTypeId("2120"), optimal: 48000, falloff: 24000, scanResolutionBonusPercent: 0, maxTargetRangeBonusPercent: 0, overloadStrengthBonusPercent: 20, defaultScript: undefined };
    expect(describer.dampenerModuleEffect(dampenerSpec, undefined)).toBe("No effect at this range");
  });

  test("dampenerModuleEffect applies scan resolution script multipliers", () => {
    const dampenerSpec: SensorDampenerSpec = { moduleName: "Sensor Dampener II", moduleId: toTypeId("2120"), optimal: 48000, falloff: 24000, scanResolutionBonusPercent: -36, maxTargetRangeBonusPercent: -48, overloadStrengthBonusPercent: 20, defaultScript: undefined };
    const script: SensorDampenerScriptSpec = { name: "Scan Resolution Dampening Script", moduleId: toTypeId("42532"), scanResolutionMultiplier: 2, maxTargetRangeMultiplier: 0 };
    expect(describer.dampenerModuleEffect(dampenerSpec, script)).toBe("Scan resolution -72% · Targeting range -0%");
  });
});
