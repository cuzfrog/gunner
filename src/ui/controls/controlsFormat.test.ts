import type { DisruptionScriptSpec, TurretScriptSpec } from "../../sim";
import type { ChargeOption, MissileOption } from "../../fitting";
import { toTypeId, type TypeId } from "../../gamedata/ids";
import type { PropulsionId, PropulsionModule } from "../../ships";
import type { I18n } from "../i18n";
import {
  chargeStatSuffix,
  formatDistance,
  formatMultiplier,
  formatNumber,
  formatWithCommas,
  missileDamageHint,
  propulsionOptionLabel,
  scriptStatSuffix,
  boosterScriptStatSuffix,
  skillLevelFromString,
  skillOptionLabel,
} from "./controlsFormat";

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

describe("propulsion label", () => {
  test("uses the last segment of the id in upper case", () => {
    const module: PropulsionModule = {
      id: "ab-1mn",
      kind: "afterburner",
      sizeTier: "small",
      label: "1MN Afterburner I",
      iconId: toTypeId("439"),
      defaultModuleId: toTypeId("439"),
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
    const option: ChargeOption = { id: "12608" as TypeId, name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 1, damageByType: { explosive: 15 } };
    expect(chargeStatSuffix(option)).toBe("DMG 15 (explosive 15) · range x0.5 · track x0.75");
  });

  test("includes falloff when it differs from one", () => {
    const option: ChargeOption = { id: "barrage-s" as TypeId, name: "Barrage S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 1.5, damageByType: { kinetic: 10, explosive: 5 } };
    expect(chargeStatSuffix(option)).toBe("DMG 15 (kinetic 10 · explosive 5) · range x0.5 · falloff x1.5 · track x0.75");
  });

  test("omits damage when damageByType is empty", () => {
    const option: ChargeOption = { id: "laser-s" as TypeId, name: "Scorch S", trackingMultiplier: 0.75, rangeMultiplier: 1.4, falloffMultiplier: 1, damageByType: {} };
    expect(chargeStatSuffix(option)).toBe("range x1.4 · track x0.75");
  });
});

describe("missile damage hint", () => {
  test("formats damage value and type", () => {
    const option: MissileOption = { id: "missile-1" as TypeId, name: "Inferno Light Missile", damage: 83.3, damageType: "thermal" };
    expect(missileDamageHint(option)).toBe("DMG 83.3 (thermal 83.3)");
  });
});

describe("script stat suffix", () => {
  test("formats all three disruption multipliers", () => {
    const script: DisruptionScriptSpec = {
      moduleId: toTypeId("29005"),
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
      moduleId: toTypeId("28999"),
      name: "Optimal Range Script",
      trackingMultiplier: 0,
      optimalMultiplier: 2,
      falloffMultiplier: 2,
    };
    expect(boosterScriptStatSuffix(script)).toBe("track x0 · optimal x2 · falloff x2");
  });
});
