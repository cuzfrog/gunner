import { createContainer, InjectionMode } from "awilix";
import { registerGameDataModule } from "../gamedata";
import { isAutopilotMode, isSigResolutionClass } from "../sim";
import { registerShipsModule, type ShipsCradle } from "../ships";
import { SettingsParser } from "./settingsParser";
import type { SettingGuards } from "./settingGuards";
import {
  chargeCatalog,
  ships,
  fittingImport,
  resetMocks,
  makeParser,
  urlFor,
  DEFAULT_SETTINGS,
  URL_SETTINGS,
  DEFAULT_PROFILE,
  RIFTER_PROFILE,
  RIFTER_MODULE,
  RIFTER_BASE_STATS,
  RIFTER_MWD_STATS,
  RIFTER_PROPULSION,
  IMPORTED_RIFTER,
  type UserSettings,
  type ProfileSettings,
} from "./localSettingsStore.testSupport";

const testGuards: SettingGuards = { isAutopilotMode, isSigResolutionClass };

beforeEach(() => resetMocks());

describe("SettingsParser", () => {
  test("parseUserSettings rejects invalid JSON", () => {
    expect(makeParser().parseUserSettings("not json")).toBeNull();
  });

  test("parseUserSettings rejects an unsupported version", () => {
    expect(makeParser().parseUserSettings(JSON.stringify({ ...DEFAULT_SETTINGS, version: 4 }))).toBeNull();
  });

  test("parseUserSettings accepts version 5 through 9 and stamps 10", () => {
    const v5 = { ...DEFAULT_SETTINGS, version: 5 };
    const v6 = { ...DEFAULT_SETTINGS, version: 6 };
    const v7 = { ...DEFAULT_SETTINGS, version: 7 };
    const v8 = { ...DEFAULT_SETTINGS, version: 8 };
    const v9 = { ...DEFAULT_SETTINGS, version: 9 };
    expect(makeParser().parseUserSettings(JSON.stringify(v5))?.version).toBe(10);
    expect(makeParser().parseUserSettings(JSON.stringify(v6))?.version).toBe(10);
    expect(makeParser().parseUserSettings(JSON.stringify(v7))?.version).toBe(10);
    expect(makeParser().parseUserSettings(JSON.stringify(v8))?.version).toBe(10);
    expect(makeParser().parseUserSettings(JSON.stringify(v9))?.version).toBe(10);
  });

  test("parseUserSettings defaults missing attackerAmmo", () => {
    const { attackerAmmo: _, ...missing } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missing));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerAmmo).toBe("Hail S");
  });

  test("parseUserSettings rejects an invalid language", () => {
    const bad = { ...DEFAULT_SETTINGS, language: "klingon" };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings defaults missing display preferences", () => {
    const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, ...missingPrefs } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missingPrefs));
    expect(parsed).not.toBeNull();
    expect(parsed!.language).toBe("en");
    expect(parsed!.trackingUnit).toBe("rad");
    expect(parsed!.simSpeed).toBe(4);
    expect(parsed!.gridBrightness).toBe(0.5);
  });

  test("parseUserSettings rejects a non-positive initialDistance", () => {
    const bad = { ...DEFAULT_SETTINGS, initialDistance: 0 };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings round-trips ewar activation", () => {
    const parsed = makeParser().parseUserSettings(JSON.stringify(DEFAULT_SETTINGS));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerEwarActivation).toEqual(DEFAULT_SETTINGS.attackerEwarActivation);
    expect(parsed!.targetEwarActivation).toEqual(DEFAULT_SETTINGS.targetEwarActivation);
  });

  test("parseUserSettings round-trips v10 grappler and booster activations", () => {
    const v10 = {
      ...DEFAULT_SETTINGS,
      attackerEwarActivation: {
        webs: [{ active: true, overloaded: false }],
        grapplers: [{ active: true, overloaded: true }],
        disruptors: [{ active: false, overloaded: false, script: "none" }],
        scramblers: [],
      },
      targetEwarActivation: {
        webs: [],
        grapplers: [{ active: false, overloaded: true }],
        disruptors: [],
        scramblers: [],
      },
      attackerBoosterActivation: [{ active: true, script: "Optimal Range Script" }, { active: false, script: "none" }],
      targetBoosterActivation: [{ active: true, script: "Tracking Speed Script" }],
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v10));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerEwarActivation?.grapplers).toEqual([{ active: true, overloaded: true }]);
    expect(parsed!.targetEwarActivation?.grapplers).toEqual([{ active: false, overloaded: true }]);
    expect(parsed!.attackerBoosterActivation).toEqual(v10.attackerBoosterActivation);
    expect(parsed!.targetBoosterActivation).toEqual(v10.targetBoosterActivation);
  });

  test("parseUserSettings leaves absent ewar and booster activation fields undefined", () => {
    const { attackerEwarActivation: _, targetEwarActivation: __, ...missing } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missing));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerEwarActivation).toBeUndefined();
    expect(parsed!.targetEwarActivation).toBeUndefined();
    expect(parsed!.attackerBoosterActivation).toBeUndefined();
    expect(parsed!.targetBoosterActivation).toBeUndefined();
  });

  test("parseUserSettings migrates legacy boolean and empty-script booster entries", () => {
    const v9 = {
      ...DEFAULT_SETTINGS,
      version: 9,
      attackerBoosterActivation: [true, false, { active: true, script: "" }],
      targetBoosterActivation: [{ active: false, script: "Optimal Range Script" }],
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v9));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerBoosterActivation).toEqual([
      { active: true, script: "none" },
      { active: false, script: "none" },
      { active: true, script: "none" },
    ]);
    expect(parsed!.targetBoosterActivation).toEqual([{ active: false, script: "Optimal Range Script" }]);
  });

  test("parseUserSettings rejects malformed booster activations like it does for ewar", () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      attackerBoosterActivation: [{ active: true, script: 123 }],
    };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings migrates v6 enum disruptor scripts to item names and adds per-module overload", () => {
    const v6 = {
      ...DEFAULT_SETTINGS,
      version: 6,
      attackerEwarActivation: { webs: [true], disruptors: [{ active: true, script: "trackingSpeed" }] },
      targetEwarActivation: { webs: [false], disruptors: [{ active: true, script: "optimalRange" }] },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v6));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: "Tracking Speed Disruption Script" });
    expect(parsed!.attackerEwarActivation?.webs?.[0]).toEqual({ active: true, overloaded: true });
    expect(parsed!.targetEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: "Optimal Range Disruption Script" });
    expect(parsed!.targetEwarActivation?.webs?.[0]).toEqual({ active: false, overloaded: true });
  });

  test("parseUserSettings migrates v7 activations and inherits per-module overload from the side overload flag", () => {
    const v7 = {
      ...DEFAULT_SETTINGS,
      version: 7,
      attackerOverload: false,
      attackerEwarActivation: { webs: [true, false], disruptors: [{ active: true, script: "none" }] },
      targetEwarActivation: { webs: [false], disruptors: [{ active: true, script: "Optimal Range Disruption Script" }] },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v7));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerEwarActivation).toEqual({
      webs: [{ active: true, overloaded: false }, { active: false, overloaded: false }],
      disruptors: [{ active: true, overloaded: false, script: "none" }],
    });
    expect(parsed!.targetEwarActivation).toEqual({
      webs: [{ active: false, overloaded: true }],
      disruptors: [{ active: true, overloaded: true, script: "Optimal Range Disruption Script" }],
    });
  });

  test("parseUserSettings migrates boolean and partial scrambler entries and inherits overload from side flag", () => {
    const v8 = {
      ...DEFAULT_SETTINGS,
      version: 8,
      attackerOverload: false,
      attackerEwarActivation: { scramblers: [true, { active: true }] },
      targetEwarActivation: { scramblers: [false, { active: true, overloaded: true }] },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v8));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerEwarActivation?.scramblers).toEqual([
      { active: true, overloaded: false },
      { active: true, overloaded: false },
    ]);
    expect(parsed!.targetEwarActivation?.scramblers).toEqual([
      { active: false, overloaded: true },
      { active: true, overloaded: true },
    ]);
  });

  test("parseUserSettings migration is idempotent for already-migrated ewar activations", () => {
    const input = {
      ...DEFAULT_SETTINGS,
      attackerEwarActivation: { webs: [{ active: true, overloaded: false }], disruptors: [{ active: true, overloaded: false, script: "none" }], scramblers: [] },
    };
    const first = makeParser().parseUserSettings(JSON.stringify(input));
    expect(first).not.toBeNull();
    const second = makeParser().parseUserSettings(JSON.stringify(first));
    expect(second).toEqual(first);
  });

  test("parseUserSettings leaves unknown disruptor script names unchanged", () => {
    const input = {
      ...DEFAULT_SETTINGS,
      attackerEwarActivation: { disruptors: [{ active: true, script: "custom script" }] },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(input));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: "custom script" });
  });

  test("parseUserSettings rejects an invalid disruptor script", () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      attackerEwarActivation: { disruptors: [{ active: true, script: 123 }] },
    };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings accepts missing ewar activation fields", () => {
    const { attackerEwarActivation: _, targetEwarActivation: __, ...missing } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missing));
    expect(parsed).not.toBeNull();
    expect(parsed!.attackerEwarActivation).toBeUndefined();
    expect(parsed!.targetEwarActivation).toBeUndefined();
  });

  test("parseProfiles skips invalid profiles", () => {
    const profiles: Record<string, unknown> = { good: DEFAULT_PROFILE, bad: { ...DEFAULT_PROFILE, version: 4 } };
    const parsed = makeParser().parseProfiles(JSON.stringify(profiles));
    expect(Object.keys(parsed)).toEqual(["good"]);
  });

  test("profileFromUnknown strips display preferences and defaults ammo", () => {
    const profile = makeParser().profileFromUnknown({ ...DEFAULT_SETTINGS, language: "ja", trackingUnit: "score" });
    expect(profile).not.toBeNull();
    expect(profile).not.toHaveProperty("language");
    expect(profile).not.toHaveProperty("trackingUnit");
    expect(profile!.attackerAmmo).toBe("Hail S");
  });

  test("decodeUrlSettings rejects invalid base64", () => {
    expect(makeParser().decodeUrlSettings("INVALID")).toBeNull();
  });

  test("decodeUrlSettings rejects settings with an invalid propulsion id", () => {
    const parser = makeParser();
    expect(parser.decodeUrlSettings(urlFor({ ...DEFAULT_SETTINGS, attackerPropulsion: "ab-5mn" }).split("c=")[1])).toBeNull();
  });

  test("decodeUrlSettings decodes URL settings and rebuilds the fitting basis", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
    };
    const parser = makeParser();
    const decoded = parser.decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.attackerFittedHull).toEqual({
      fittingName: "Brawler",
      propulsionId: "mwd-5mn",
      propulsionName: RIFTER_MODULE.label,
      fitted: IMPORTED_RIFTER.fitted,
      propulsion: RIFTER_MODULE,
      baseMaxSpeed: RIFTER_MWD_STATS.baseMaxSpeed,
    });
    expect(decoded!.attackerMass).toBe(1_500_000);
    expect(decoded!.attackerSpeed).toBe(4_649.72);
  });

  test("decodeUrlSettings defaults missing display preferences", () => {
    const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, ...missingPrefs } = DEFAULT_SETTINGS;
    const decoded = makeParser().decodeUrlSettings(urlFor(missingPrefs).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.language).toBe("en");
    expect(decoded!.trackingUnit).toBe("rad");
    expect(decoded!.simSpeed).toBe(4);
    expect(decoded!.gridBrightness).toBe(0.5);
  });

  test("decodeUrlSettings preserves supplied display preferences", () => {
    const decoded = makeParser().decodeUrlSettings(urlFor(URL_SETTINGS).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.language).toBe("ja");
    expect(decoded!.simSpeed).toBe(2);
    expect(decoded!.gridBrightness).toBe(0.5);
  });

  test("decodeUrlSettings preserves explicit none propulsion", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_BASE_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 456.25);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerPropulsion: "none",
    };
    const decoded = makeParser().decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.attackerPropulsion).toBe("none");
    expect(decoded!.attackerSpeed).toBe(456.25);
    expect(decoded!.attackerMass).toBe(1_000_000);
  });

  test("decodeUrlSettings applies a stored charge that matches the turret size", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);
    chargeCatalog.chargesForSize = vi.fn(() => [
      { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
      { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
    ]);
    chargeCatalog.withCharge = vi.fn((turret, charge) => ({ ...turret, charge, tracking: turret.base.tracking, optimal: turret.base.optimal, falloff: turret.base.falloff }));

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerAmmo: "Republic Fleet EMP S",
    };
    const decoded = makeParser().decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.attackerAmmo).toBe("Republic Fleet EMP S");
    expect(decoded!.tracking).toBe(0.42);
    expect(decoded!.optimal).toBe(1200);
    expect(decoded!.falloff).toBe(3000);
  });

  test("decodeUrlSettings scales fitted baseMaxSpeed proportionally when attackerSpeed is overridden", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    const realShips = createContainer<ShipsCradle>({ injectionMode: InjectionMode.PROXY });
    registerGameDataModule(realShips);
    registerShipsModule(realShips);
    const parser = new SettingsParser({ ships: realShips.cradle.ships, fittingImport, chargeCatalog, settingGuards: testGuards });
    const override = 2000;
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerOverrides: { attackerSpeed: override },
    };
    const decoded = parser.decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.attackerSpeed).toBe(override);
    const conditions = { skillLevel: settings.attackerSkillLevel ?? 5, overloaded: settings.attackerOverload ?? true };
    const expected = realShips.cradle.ships.fittedStats(RIFTER_PROFILE, IMPORTED_RIFTER.fitted, RIFTER_PROPULSION, conditions, override).baseMaxSpeed;
    expect(decoded!.attackerFittedHull?.baseMaxSpeed).toBeCloseTo(expected, 6);
  });

  test("decodeUrlSettings keeps baseMaxSpeed unscaled when attackerSpeed is not overridden", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    const realShips = createContainer<ShipsCradle>({ injectionMode: InjectionMode.PROXY });
    registerGameDataModule(realShips);
    registerShipsModule(realShips);
    const parser = new SettingsParser({ ships: realShips.cradle.ships, fittingImport, chargeCatalog, settingGuards: testGuards });
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
    };
    const decoded = parser.decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    const conditions = { skillLevel: settings.attackerSkillLevel ?? 5, overloaded: settings.attackerOverload ?? true };
    const expected = realShips.cradle.ships.fittedStats(RIFTER_PROFILE, IMPORTED_RIFTER.fitted, RIFTER_PROPULSION, conditions).baseMaxSpeed;
    expect(decoded!.attackerFittedHull?.baseMaxSpeed).toBeCloseTo(expected, 6);
  });

  test("golden localStorage round-trip preserves DEFAULT_SETTINGS", () => {
    const parser = makeParser();
    const serialized = parser.serialize(DEFAULT_SETTINGS);
    const restored = parser.parseUserSettings(serialized);
    expect(restored).toEqual(DEFAULT_SETTINGS);
  });

  test("golden localStorage round-trip preserves URL_SETTINGS", () => {
    const parser = makeParser();
    const serialized = parser.serialize(URL_SETTINGS);
    const restored = parser.parseUserSettings(serialized);
    expect(restored).toEqual(URL_SETTINGS);
  });

  test("golden profile record round-trip preserves DEFAULT_PROFILE", () => {
    const parser = makeParser();
    const profiles = { brawler: DEFAULT_PROFILE };
    const restored = parser.parseProfiles(JSON.stringify(profiles));
    expect(restored).toEqual(profiles);
  });
});
