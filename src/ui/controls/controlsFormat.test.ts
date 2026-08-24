import type { DisruptionScriptSpec, TurretScriptSpec } from "../../sim";
import type { ChargeOption } from "../../fitting";
import type { PropulsionId, PropulsionModule } from "../../ships";
import { PALETTE } from "../palette";
import type { I18n } from "../i18n";
import type { UserSettings } from "../../appstate";
import {
  AGGRESSIVITY_MAX,
  AGGRESSIVITY_MIN,
  aggressivityFromPosition,
  chargeStatSuffix,
  escapeHtml,
  formatDistance,
  formatMultiplier,
  formatNumber,
  formatWithCommas,
  hitChanceColor,
  positionFromAggressivity,
  profileSettingsOf,
  propulsionOptionLabel,
  scriptStatSuffix,
  boosterScriptStatSuffix,
  skillLevelFromString,
  skillOptionLabel,
} from "./controlsFormat";

function baseUserSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    version: 10,
    tracking: 0.32,
    trackingUnit: "rad",
    sigRes: "S",
    optimal: 5000,
    falloff: 5000,
    attackerSpeed: 1000,
    attackerMode: "keepAtRange",
    attackerRange: 5000,
    attackerMass: 1_000_000,
    attackerInertia: 2,
    initialDistance: 5000,
    targetSpeed: 1000,
    targetMode: "orbit",
    targetRange: 5000,
    targetMass: 1_000_000,
    targetInertia: 2,
    targetSig: 40,
    attackerAmmo: "Hail S",
    simSpeed: 4,
    language: "en",
    ...overrides,
  };
}

describe("aggressivity conversion", () => {
  test("round-trips the minimum value through position", () => {
    const pos = positionFromAggressivity(AGGRESSIVITY_MIN);
    expect(pos).toBeCloseTo(0, 10);
    expect(aggressivityFromPosition(pos)).toBeCloseTo(AGGRESSIVITY_MIN, 10);
  });

  test("round-trips the midpoint value through position", () => {
    expect(aggressivityFromPosition(0.5)).toBeCloseTo(1, 10);
    expect(positionFromAggressivity(1)).toBeCloseTo(0.5, 10);
  });

  test("round-trips the maximum value through position", () => {
    const pos = positionFromAggressivity(AGGRESSIVITY_MAX);
    expect(pos).toBeCloseTo(1, 10);
    expect(aggressivityFromPosition(pos)).toBeCloseTo(AGGRESSIVITY_MAX, 10);
  });
});

describe("formatting", () => {
  test("adds comma separators and respects decimals", () => {
    expect(formatWithCommas(1234)).toBe("1,234");
    expect(formatWithCommas(1234.5, 1)).toBe("1,234.5");
    expect(formatWithCommas(1000000, 2)).toBe("1,000,000.00");
  });

  test("formats numbers without commas and strips trailing zeros", () => {
    expect(formatNumber(1234.5)).toBe("1234.5");
    expect(formatNumber(1234.554, 2)).toBe("1234.55");
    expect(formatNumber(0.999, 2)).toBe("1");
  });

  test("formats multipliers to two decimal places", () => {
    expect(formatMultiplier(1)).toBe("1");
    expect(formatMultiplier(1.5)).toBe("1.5");
    expect(formatMultiplier(1.556)).toBe("1.56");
  });

  test("formats short distances in meters and long distances in kilometers", () => {
    const t = (key: string): string => ({ "unit.meter": "m", "unit.kilometer": "km" }[key] ?? key);
    expect(formatDistance(1234.4, t)).toBe("1,234 m");
    expect(formatDistance(12345, t)).toBe("12.3 km");
  });

  test("switches to kilometers once rounded value reaches the threshold", () => {
    const t = (key: string): string => ({ "unit.meter": "m", "unit.kilometer": "km" }[key] ?? key);
    expect(formatDistance(9999.4, t)).toBe("9,999 m");
    expect(formatDistance(9999.6, t)).toBe("10.0 km");
  });
});

describe("profile settings", () => {
  test("strips display-only fields while keeping the rest", () => {
    const settings = baseUserSettings({ attackerHull: "Rifter" });
    const profile = profileSettingsOf(settings);
    expect("language" in profile).toBe(false);
    expect("trackingUnit" in profile).toBe(false);
    expect("simSpeed" in profile).toBe(false);
    expect("gridBrightness" in profile).toBe(false);
    expect(profile.attackerHull).toBe("Rifter");
    expect(profile.attackerAmmo).toBe("Hail S");
  });

});

describe("hit chance color", () => {
  test("maps thresholds to the palette", () => {
    expect(hitChanceColor(0.95)).toBe(PALETTE.optimalGreen);
    expect(hitChanceColor(0.75)).toBe(PALETTE.accentTeal);
    expect(hitChanceColor(0.3)).toBe(PALETTE.warnYellow);
    expect(hitChanceColor(0.1)).toBe(PALETTE.accentOrange);
    expect(hitChanceColor(0)).toBe(PALETTE.dangerRed);
  });
});

describe("propulsion label", () => {
  test("uses the last segment of the id in upper case", () => {
    const module: PropulsionModule = {
      id: "ab-1mn",
      kind: "afterburner",
      sizeTier: "small",
      label: "1MN Afterburner I",
      thrust: 1.5e6,
      massAddition: 500_000,
      speedBonus: 1.15,
      sigBloom: 0,
    };
    expect(propulsionOptionLabel(module)).toBe("1MN");
  });
});

describe("skill level conversion", () => {
  test("parses valid skill levels", () => {
    expect(skillLevelFromString("5")).toBe(5);
    expect(skillLevelFromString("0")).toBe(0);
  });

  test("returns zero for invalid input", () => {
    expect(skillLevelFromString("99")).toBe(0);
    expect(skillLevelFromString("abc")).toBe(0);
  });

  test("labels a skill level through the i18n t function", () => {
    const i18n: I18n = { current: () => "en", setLanguage: () => {}, t: (key) => key, translateDocument: () => {} };
    expect(skillOptionLabel(i18n, 5)).toBe("skill.level 5");
  });
});

describe("charge stat suffix", () => {
  test("omits falloff when the multiplier is one", () => {
    const option: ChargeOption = { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 1 };
    expect(chargeStatSuffix(option)).toBe("range x0.5 · track x0.75");
  });

  test("includes falloff when it differs from one", () => {
    const option: ChargeOption = { name: "Barrage S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 1.5 };
    expect(chargeStatSuffix(option)).toBe("range x0.5 · falloff x1.5 · track x0.75");
  });
});

describe("script stat suffix", () => {
  test("formats all three disruption multipliers", () => {
    const script: DisruptionScriptSpec = {
      name: "Optimal Range Disruption Script",
      trackingMultiplier: 0,
      optimalMultiplier: 2,
      falloffMultiplier: 2,
    };
    expect(scriptStatSuffix(script)).toBe("optimal x2 · falloff x2 · track x0");
  });
});

describe("booster script stat suffix", () => {
  test("formats all three turret multipliers", () => {
    const script: TurretScriptSpec = {
      name: "Optimal Range Script",
      trackingMultiplier: 0,
      optimalMultiplier: 2,
      falloffMultiplier: 2,
    };
    expect(boosterScriptStatSuffix(script)).toBe("track x0 · optimal x2 · falloff x2");
  });
});

describe("escapeHtml", () => {
  test("escapes special html characters", () => {
    expect(escapeHtml("<tag> & \"quote\" 'apostrophe'")).toBe("&lt;tag&gt; &amp; &quot;quote&quot; &#39;apostrophe&#39;");
  });
});
