import { toTypeId } from "../../../gamedata/ids";
import { type DisruptionScriptSpec, type EwarEffectPotentials, type EwarProjection, type EwarReach, type EwarResolver, type SensorDampenerScriptSpec, type SensorDampenerSpec, type StasisGrapplerSpec, type StasisWebSpec, type TargetPainterSpec, type TrackingDisruptorSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import { EwarEffectDescriberImpl } from "./ewarEffectDescriber";

const IDENTITY_POTENTIALS: EwarEffectPotentials = {
  speedMultiplier: 1, sigMultiplier: 1, propulsionSuppressed: false,
  trackingMultiplier: 1, optimalMultiplier: 1, falloffMultiplier: 1,
  scanResolutionMultiplier: 1, targetingRangeMultiplier: 1,
};

const ZERO_REACH: EwarReach = { web: 0, grappler: 0, scrambler: 0, disruptor: 0, painter: 0, dampener: 0, jammer: 0, neutralizer: 0, nosferatu: 0, };

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
  jammerChances: vi.fn(() => []),
  jammerChance: vi.fn(() => 0),
  potentials: vi.fn(() => IDENTITY_POTENTIALS),
  disruptionMultipliers: vi.fn().mockReturnValue({ tracking: 1, optimal: 1, falloff: 1 }),
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
  "ewar.hover.jammer": "Jams targeting",
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
const projection: EwarProjection = { loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [], } };
const distance = 5000;

beforeEach(() => {
  resolver.speedMultiplier.mockReturnValue(1);
  resolver.speedMultiplierIgnoringRange.mockReturnValue(1);
  resolver.propulsionSuppressed.mockReturnValue(false);
  resolver.propulsionSuppressedIgnoringRange.mockReturnValue(false);
  resolver.reach.mockReturnValue(ZERO_REACH);
  resolver.potentials.mockReturnValue(IDENTITY_POTENTIALS);
  resolver.disruptionMultipliers.mockReturnValue({ tracking: 1, optimal: 1, falloff: 1 });
  i18n.t.mockImplementation((key) => LABELS[key] ?? key);
});

describe("EwarEffectDescriber", () => {
  test("jammerHint reports the jam text with the jammer reach", () => {
    const reach = { ...ZERO_REACH, jammer: 66960 };
    vi.mocked(resolver.reach).mockReturnValue(reach);
    expect(describer.jammerHint(projection)).toBe("Jams targeting · range 67.0 km");
    vi.mocked(resolver.reach).mockReturnValue(ZERO_REACH);
  });

  test("jammerDescription reports out-of-range text when the jammer reach is zero", () => {
    expect(describer.jammerDescription(projection, distance)).toBe("No effect at this range");
  });

  test("jammerDescription reports the jam text within reach", () => {
    vi.mocked(resolver.reach).mockReturnValue({ ...ZERO_REACH, jammer: 66960 });
    expect(describer.jammerDescription(projection, distance)).toBe("Jams targeting");
    vi.mocked(resolver.reach).mockReturnValue(ZERO_REACH);
  });

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
    resolver.disruptionMultipliers.mockReturnValue({ tracking: 0.7, optimal: 0.55, falloff: 0.55 });
    expect(describer.disruptorDescription(projection, distance)).toBe("Tracking -30% · Optimal -45% · Falloff -45%");
    expect(resolver.disruptionMultipliers).toHaveBeenCalledWith(projection, distance);
  });

  test("disruptorDescription reports out-of-range text when all channels round to 0", () => {
    resolver.disruptionMultipliers.mockReturnValue({ tracking: 0.999, optimal: 0.999, falloff: 0.999 });
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
        dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [],
      },
      activation: { webs: [{ active: true, overloaded: true }], grapplers: [], disruptors: [], scramblers: []  , painters: [], dampeners: [], neutralizers: [], nosferatu: [], jammers: [], },
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
        dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [],
      },
      activation: { webs: [], grapplers: [], disruptors: [{ active: true, overloaded: true, script: undefined }], scramblers: []  , painters: [], dampeners: [], neutralizers: [], nosferatu: [], jammers: [], },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, trackingMultiplier: 0.7, optimalMultiplier: 0.55, falloffMultiplier: 0.55 });
    resolver.reach.mockReturnValue({ ...ZERO_REACH, disruptor: 72000 });
    expect(describer.disruptorHint(disruptorProjection)).toBe("Tracking -30% · Optimal -45% · Falloff -45% · range 72.0 km");
  });

  test("scramblerHint shows suppression and the overloaded scrambler range", () => {
    const scramblerProjection = {
      loadout: {
        webs: [], grapplers: [], disruptors: [],
        scramblers: [{ propulsionBlock: true, moduleName: "Warp Scrambler II", moduleId: toTypeId("448"), maxRange: 9000, overloadRangeBonusPercent: 20 }],
        painters: [], dampeners: [], scripts: [],
        dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [],
      },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [{ active: true, overloaded: true }], painters: [], dampeners: [], neutralizers: [], nosferatu: [], jammers: [], },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, propulsionSuppressed: true });
    resolver.reach.mockReturnValue({ ...ZERO_REACH, scrambler: 10800 });
    expect(describer.scramblerHint(scramblerProjection)).toBe("Disables MWD · range 10.8 km");
  });

  test("webHint reports the speed reduction for a single-web projection at point-blank range", () => {
    const speedFactor = 0.6;
    const webSpec: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 10000, speedFactor, overloadRangeBonusPercent: 30 };
    const webProj = {
      loadout: { webs: [webSpec], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [], },
      activation: { webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [], jammers: [], },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, speedMultiplier: 1 - speedFactor });
    expect(describer.webHint(webProj).split(" · ")[0]).toBe("Reduce speed by 60%");
  });

  test("painterHint reports signature bonus and range", () => {
    const painterSpec: TargetPainterSpec = { moduleName: "Target Painter II", moduleId: toTypeId("12275"), maxRange: 36000, falloff: 90000, signatureRadiusBonusPercent: 30, overloadStrengthBonusPercent: 20 };
    const painterProj = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [painterSpec], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [], },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [{ active: true, overloaded: false }], dampeners: [], neutralizers: [], nosferatu: [], jammers: [], },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, sigMultiplier: 1.3 });
    resolver.reach.mockReturnValue({ ...ZERO_REACH, painter: 126000 });
    expect(describer.painterHint(painterProj)).toBe("Signature radius +30% · range 126.0 km");
  });

  test("painterHint reports out of range when no active painter", () => {
    const painterProj = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [], },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, sigMultiplier: 1 });
    expect(describer.painterHint(painterProj)).toBe("No effect at this range · range 0 m");
  });

  test("dampenerHint reports scan resolution and targeting range reductions and range", () => {
    const dampenerSpec: SensorDampenerSpec = { moduleName: "Sensor Dampener II", moduleId: toTypeId("2120"), optimal: 48000, falloff: 24000, scanResolutionBonusPercent: -40, maxTargetRangeBonusPercent: -40, overloadStrengthBonusPercent: 20, defaultScript: undefined };
    const dampenerProj = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [dampenerSpec], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [], },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [{ active: true, overloaded: false, script: undefined }], neutralizers: [], nosferatu: [], jammers: [] },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, scanResolutionMultiplier: 0.6, targetingRangeMultiplier: 0.6 });
    resolver.reach.mockReturnValue({ ...ZERO_REACH, dampener: 72000 });
    expect(describer.dampenerHint(dampenerProj)).toBe("Scan resolution -40% · Targeting range -40% · range 72.0 km");
  });

  test("dampenerHint reports out of range when no active dampener", () => {
    const dampenerProj = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [], },
    } as EwarProjection;
    resolver.potentials.mockReturnValue({ ...IDENTITY_POTENTIALS, scanResolutionMultiplier: 1, targetingRangeMultiplier: 1 });
    expect(describer.dampenerHint(dampenerProj)).toBe("No effect at this range · range 0 m");
  });
});
