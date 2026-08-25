import type { EwarProjection } from "../../../sim";
import type { EwarResolver } from "../../../sim";
import type { I18n } from "../../i18n";
import { EwarEffectDescriberImpl } from "./ewarEffectDescriber";

const resolver = vi.mocked<EwarResolver>({
  speedMultiplier: vi.fn(),
  speedMultiplierIgnoringRange: vi.fn(),
  disruptedTurret: vi.fn(),
  disruptedTurretIgnoringRange: vi.fn(),
  propulsionSuppressed: vi.fn(),
  propulsionSuppressedIgnoringRange: vi.fn(),
  appliedEffects: vi.fn(),
});

const LABELS: Record<string, string> = {
  "ewar.hover.web": "Reduce speed by",
  "ewar.hover.tracking": "Tracking",
  "ewar.hover.optimal": "Optimal",
  "ewar.hover.falloff": "Falloff",
  "ewar.hover.scrambler": "Disables MWD",
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
const projection: EwarProjection = { loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], scripts: [] } };
const distance = 5000;

beforeEach(() => {
  resolver.speedMultiplier.mockReturnValue(1);
  resolver.speedMultiplierIgnoringRange.mockReturnValue(1);
  resolver.disruptedTurret.mockReturnValue({ tracking: 1, sigResolution: 1, optimal: 1, falloff: 1 });
  resolver.disruptedTurretIgnoringRange.mockReturnValue({ tracking: 1, sigResolution: 1, optimal: 1, falloff: 1 });
  resolver.propulsionSuppressed.mockReturnValue(false);
  resolver.propulsionSuppressedIgnoringRange.mockReturnValue(false);
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
    resolver.disruptedTurret.mockReturnValue({ tracking: 0.7, sigResolution: 1, optimal: 0.55, falloff: 0.55 });
    expect(describer.disruptorDescription(projection, distance)).toBe("Tracking -30% · Optimal -45% · Falloff -45%");
    expect(resolver.disruptedTurret).toHaveBeenCalledWith({ tracking: 1, sigResolution: 1, optimal: 1, falloff: 1 }, projection, distance);
  });

  test("disruptorDescription reports out-of-range text when all channels round to 0", () => {
    resolver.disruptedTurret.mockReturnValue({ tracking: 0.999, sigResolution: 1, optimal: 0.999, falloff: 0.999 });
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
    resolver.speedMultiplierIgnoringRange.mockReturnValue(0.63);
    expect(describer.webHint(projection)).toBe("Reduce speed by 37% · range 0 m");
    expect(resolver.speedMultiplierIgnoringRange).toHaveBeenCalledWith(projection);
    expect(resolver.speedMultiplier).not.toHaveBeenCalled();
  });

  test("grapplerHint reports percentage and ignores the current distance", () => {
    resolver.speedMultiplierIgnoringRange.mockReturnValue(0.5);
    expect(describer.grapplerHint(projection)).toBe("Reduce speed by 50% · range 0 m");
    expect(resolver.speedMultiplierIgnoringRange).toHaveBeenCalledWith(projection);
  });

  test("disruptorHint reports percentages and ignores the current distance", () => {
    resolver.disruptedTurretIgnoringRange.mockReturnValue({ tracking: 0.7, sigResolution: 1, optimal: 0.55, falloff: 0.55 });
    expect(describer.disruptorHint(projection)).toBe("Tracking -30% · Optimal -45% · Falloff -45% · range 0 m");
    expect(resolver.disruptedTurretIgnoringRange).toHaveBeenCalledWith({ tracking: 1, sigResolution: 1, optimal: 1, falloff: 1 }, projection);
  });

  test("scramblerHint reports MWD disabled ignoring the current distance", () => {
    resolver.propulsionSuppressedIgnoringRange.mockReturnValue(true);
    expect(describer.scramblerHint(projection)).toBe("Disables MWD · range 0 m");
    expect(resolver.propulsionSuppressedIgnoringRange).toHaveBeenCalledWith(projection);
  });

  test("scramblerHint reports out of range when no active scrambler is present", () => {
    resolver.propulsionSuppressedIgnoringRange.mockReturnValue(false);
    expect(describer.scramblerHint(projection)).toBe("No effect at this range · range 0 m");
  });

  test("webHint formats the overloaded range of a fitted web", () => {
    const webProjection = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }],
        grapplers: [], disruptors: [], scramblers: [], scripts: [],
      },
      activation: { webs: [{ active: true, overloaded: true }], grapplers: [], disruptors: [], scramblers: [] },
    } as EwarProjection;
    resolver.speedMultiplierIgnoringRange.mockReturnValue(0.4);
    expect(describer.webHint(webProjection)).toBe("Reduce speed by 60% · range 13.0 km");
  });

  test("disruptorHint formats the reach of an overloaded disruptor", () => {
    const disruptorProjection = {
      loadout: {
        webs: [], grapplers: [],
        disruptors: [{ moduleName: "Tracking Disruptor II", optimal: 48000, falloff: 24000, disruption: 0.1719, defaultScript: undefined, overloadStrengthBonusPercent: 20 }],
        scramblers: [], scripts: [],
      },
      activation: { webs: [], grapplers: [], disruptors: [{ active: true, overloaded: true, script: undefined }], scramblers: [] },
    } as EwarProjection;
    resolver.disruptedTurretIgnoringRange.mockReturnValue({ tracking: 0.7, sigResolution: 1, optimal: 0.55, falloff: 0.55 });
    expect(describer.disruptorHint(disruptorProjection)).toBe("Tracking -30% · Optimal -45% · Falloff -45% · range 72.0 km");
  });

  test("scramblerHint shows suppression and the overloaded scrambler range", () => {
    const scramblerProjection = {
      loadout: {
        webs: [], grapplers: [], disruptors: [],
        scramblers: [{ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }],
        scripts: [],
      },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [{ active: true, overloaded: true }] },
    } as EwarProjection;
    resolver.propulsionSuppressedIgnoringRange.mockReturnValue(true);
    expect(describer.scramblerHint(scramblerProjection)).toBe("Disables MWD · range 10.8 km");
  });
});
