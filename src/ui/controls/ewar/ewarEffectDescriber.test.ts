import type { EwarProjection } from "../../../sim";
import type { EwarResolver } from "../../../sim";
import type { I18n } from "../../i18n";
import { EwarEffectDescriberImpl } from "./ewarEffectDescriber";

const resolver = vi.mocked<EwarResolver>({
  speedMultiplier: vi.fn(),
  disruptedTurret: vi.fn(),
  propulsionSuppressed: vi.fn(),
});

const LABELS: Record<string, string> = {
  "ewar.hover.web": "Reduce speed by",
  "ewar.hover.tracking": "Tracking",
  "ewar.hover.optimal": "Optimal",
  "ewar.hover.falloff": "Falloff",
  "ewar.hover.scrambler": "Disables MWD",
  "ewar.hover.outOfRange": "No effect at this range",
};

const i18n = vi.mocked<I18n>({
  current: vi.fn(),
  setLanguage: vi.fn(),
  t: vi.fn((key) => LABELS[key] ?? key),
  translateDocument: vi.fn(),
});

const describer = new EwarEffectDescriberImpl({ ewarResolver: resolver, i18n });
const projection = {} as EwarProjection;
const distance = 5000;

beforeEach(() => {
  resolver.speedMultiplier.mockReturnValue(1);
  resolver.disruptedTurret.mockReturnValue({ tracking: 1, sigResolution: 1, optimal: 1, falloff: 1 });
  resolver.propulsionSuppressed.mockReturnValue(false);
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
    expect(describer.disruptorDescription(projection, distance)).toBe("Tracking -30% \u00b7 Optimal -45% \u00b7 Falloff -45%");
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
});
