import { SettingsParser } from "./settingsParser";
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
  IMPORTED_RIFTER,
  type UserSettings,
  type ProfileSettings,
} from "./localSettingsStore.testSupport";

beforeEach(() => resetMocks());

describe("SettingsParser", () => {
  test("parseUserSettings rejects invalid JSON", () => {
    expect(makeParser().parseUserSettings("not json")).toBeNull();
  });

  test("parseUserSettings rejects an unsupported version", () => {
    expect(makeParser().parseUserSettings(JSON.stringify({ ...DEFAULT_SETTINGS, version: 4 }))).toBeNull();
  });

  test("parseUserSettings accepts version 5 and 6", () => {
    const v5 = { ...DEFAULT_SETTINGS, version: 5 };
    const v6 = { ...DEFAULT_SETTINGS, version: 6 };
    expect(makeParser().parseUserSettings(JSON.stringify(v5))?.version).toBe(6);
    expect(makeParser().parseUserSettings(JSON.stringify(v6))?.version).toBe(6);
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

  test("parseUserSettings rejects an invalid disruptor script", () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      attackerEwarActivation: { disruptors: [{ active: true, script: "range" }] },
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
});
