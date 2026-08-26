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
import type { ShipId, TypeId } from "../gamedata/ids";

const testGuards: SettingGuards = { isAutopilotMode, isSigResolutionClass };

beforeEach(() => resetMocks());

describe("SettingsParser", () => {
  test("parseUserSettings rejects invalid JSON", () => {
    expect(makeParser().parseUserSettings("not json")).toBeNull();
  });

  test("parseUserSettings rejects an unsupported version", () => {
    expect(makeParser().parseUserSettings(JSON.stringify({ ...DEFAULT_SETTINGS, version: 4 }))).toBeNull();
  });

  test("parseUserSettings accepts version 5 through 10 and stamps 11", () => {
    const v5 = { ...DEFAULT_SETTINGS, version: 5 };
    const v6 = { ...DEFAULT_SETTINGS, version: 6 };
    const v7 = { ...DEFAULT_SETTINGS, version: 7 };
    const v8 = { ...DEFAULT_SETTINGS, version: 8 };
    const v9 = { ...DEFAULT_SETTINGS, version: 9 };
    const v10 = { ...DEFAULT_SETTINGS, version: 10 };
    expect(makeParser().parseUserSettings(JSON.stringify(v5))?.version).toBe(11);
    expect(makeParser().parseUserSettings(JSON.stringify(v6))?.version).toBe(11);
    expect(makeParser().parseUserSettings(JSON.stringify(v7))?.version).toBe(11);
    expect(makeParser().parseUserSettings(JSON.stringify(v8))?.version).toBe(11);
    expect(makeParser().parseUserSettings(JSON.stringify(v9))?.version).toBe(11);
    expect(makeParser().parseUserSettings(JSON.stringify(v10))?.version).toBe(11);
  });

  test("parseUserSettings defaults missing shipAAmmo", () => {
    const { shipAAmmo: _, ...missing } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missing));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAAmmo).toBe(DEFAULT_SETTINGS.shipAAmmo);
  });

  test("parseUserSettings rejects an invalid language", () => {
    const bad = { ...DEFAULT_SETTINGS, language: "klingon" };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings defaults missing display preferences", () => {
    const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, autoZoom: _____, zoomFactor: ______, ...missingPrefs } = DEFAULT_SETTINGS;
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
    expect(parsed!.shipAEwarActivation).toEqual(DEFAULT_SETTINGS.shipAEwarActivation);
    expect(parsed!.shipBEwarActivation).toEqual(DEFAULT_SETTINGS.shipBEwarActivation);
  });

  test("parseUserSettings round-trips v10 grappler and booster activations", () => {
    const v10 = {
      ...DEFAULT_SETTINGS,
      shipAEwarActivation: {
        webs: [{ active: true, overloaded: false }],
        grapplers: [{ active: true, overloaded: true }],
        disruptors: [{ active: false, overloaded: false, script: "none" }],
        scramblers: [],
      },
      shipBEwarActivation: {
        webs: [],
        grapplers: [{ active: false, overloaded: true }],
        disruptors: [],
        scramblers: [],
      },
      shipABoosterActivation: [{ active: true, script: "Optimal Range Script" }, { active: false, script: "none" }],
      shipBBoosterActivation: [{ active: true, script: "Tracking Speed Script" }],
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v10));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAEwarActivation?.grapplers).toEqual([{ active: true, overloaded: true }]);
    expect(parsed!.shipBEwarActivation?.grapplers).toEqual([{ active: false, overloaded: true }]);
    expect(parsed!.shipABoosterActivation).toEqual(v10.shipABoosterActivation);
    expect(parsed!.shipBBoosterActivation).toEqual(v10.shipBBoosterActivation);
  });

  test("parseUserSettings leaves absent ewar and booster activation fields undefined", () => {
    const { shipAEwarActivation: _, shipBEwarActivation: __, ...missing } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missing));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAEwarActivation).toBeUndefined();
    expect(parsed!.shipBEwarActivation).toBeUndefined();
    expect(parsed!.shipABoosterActivation).toBeUndefined();
    expect(parsed!.shipBBoosterActivation).toBeUndefined();
  });

  test("parseUserSettings migrates legacy boolean and empty-script booster entries", () => {
    const v9 = {
      ...DEFAULT_SETTINGS,
      version: 9,
      shipABoosterActivation: [true, false, { active: true, script: "" }],
      shipBBoosterActivation: [{ active: false, script: "Optimal Range Script" }],
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v9));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipABoosterActivation).toEqual([
      { active: true, script: "none" },
      { active: false, script: "none" },
      { active: true, script: "none" },
    ]);
    expect(parsed!.shipBBoosterActivation).toEqual([{ active: false, script: "Optimal Range Script" }]);
  });

  test("parseUserSettings rejects malformed booster activations like it does for ewar", () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      shipABoosterActivation: [{ active: true, script: 123 }],
    };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings migrates v6 enum disruptor scripts to item names and adds per-module overload", () => {
    const v6 = {
      ...DEFAULT_SETTINGS,
      version: 6,
      shipAEwarActivation: { webs: [true], disruptors: [{ active: true, script: "trackingSpeed" }] },
      shipBEwarActivation: { webs: [false], disruptors: [{ active: true, script: "optimalRange" }] },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v6));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: "Tracking Speed Disruption Script" });
    expect(parsed!.shipAEwarActivation?.webs?.[0]).toEqual({ active: true, overloaded: true });
    expect(parsed!.shipBEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: "Optimal Range Disruption Script" });
    expect(parsed!.shipBEwarActivation?.webs?.[0]).toEqual({ active: false, overloaded: true });
  });

  test("parseUserSettings migrates v7 activations and inherits per-module overload from the side overload flag", () => {
    const v7 = {
      ...DEFAULT_SETTINGS,
      version: 7,
      shipAOverload: false,
      shipAEwarActivation: { webs: [true, false], disruptors: [{ active: true, script: "none" }] },
      shipBEwarActivation: { webs: [false], disruptors: [{ active: true, script: "Optimal Range Disruption Script" }] },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v7));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAEwarActivation).toEqual({
      webs: [{ active: true, overloaded: false }, { active: false, overloaded: false }],
      disruptors: [{ active: true, overloaded: false, script: "none" }],
    });
    expect(parsed!.shipBEwarActivation).toEqual({
      webs: [{ active: false, overloaded: true }],
      disruptors: [{ active: true, overloaded: true, script: "Optimal Range Disruption Script" }],
    });
  });

  test("parseUserSettings migrates boolean and partial scrambler entries and inherits overload from side flag", () => {
    const v8 = {
      ...DEFAULT_SETTINGS,
      version: 8,
      shipAOverload: false,
      shipAEwarActivation: { scramblers: [true, { active: true }] },
      shipBEwarActivation: { scramblers: [false, { active: true, overloaded: true }] },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v8));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAEwarActivation?.scramblers).toEqual([
      { active: true, overloaded: false },
      { active: true, overloaded: false },
    ]);
    expect(parsed!.shipBEwarActivation?.scramblers).toEqual([
      { active: false, overloaded: true },
      { active: true, overloaded: true },
    ]);
  });

  test("parseUserSettings migration is idempotent for already-migrated ewar activations", () => {
    const input = {
      ...DEFAULT_SETTINGS,
      shipAEwarActivation: { webs: [{ active: true, overloaded: false }], disruptors: [{ active: true, overloaded: false, script: "none" }], scramblers: [] },
    };
    const first = makeParser().parseUserSettings(JSON.stringify(input));
    expect(first).not.toBeNull();
    const second = makeParser().parseUserSettings(JSON.stringify(first));
    expect(second).toEqual(first);
  });

  test("parseUserSettings leaves unknown disruptor script names unchanged", () => {
    const input = {
      ...DEFAULT_SETTINGS,
      shipAEwarActivation: { disruptors: [{ active: true, script: "custom script" }] },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(input));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: "custom script" });
  });

  test("parseUserSettings normalizes legacy attacker and target keys to shipA and shipB", () => {
    const legacy = {
      version: 9,
      tracking: 0.5,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 3000,
      falloff: 2000,
      attackerSpeed: 500,
      attackerMode: "orbit",
      attackerRange: 3000,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      targetSpeed: 800,
      targetMode: "keepAtRange",
      targetRange: 3000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSig: 125,
      targetSkillLevel: 5,
      targetOverload: true,
      initialDistance: 3000,
      attackerAmmo: "Hail S",
      simSpeed: 2,
      language: "en",
      gridBrightness: 0.5,
      autoZoom: true,
      zoomFactor: 1,
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(legacy));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipASpeed).toBe(500);
    expect(parsed!.shipAMode).toBe("orbit");
    expect(parsed!.shipBSpeed).toBe(800);
    expect(parsed!.shipBSig).toBe(125);
    expect(parsed!.shipAAmmo).toBe(DEFAULT_SETTINGS.shipAAmmo);
    expect("attackerSpeed" in parsed!).toBe(false);
    expect("targetSpeed" in parsed!).toBe(false);
  });

  test("parseUserSettings normalizes legacy overrides to shipA and shipB", () => {
    const legacy = {
      ...DEFAULT_SETTINGS,
      attackerOverrides: { attackerSpeed: 123, targetMass: 456, tracking: 0.1 },
      targetOverrides: { targetSig: 78, sigRes: "M" },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(legacy));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAOverrides).toEqual({ shipASpeed: 123, shipBMass: 456, tracking: 0.1 });
    expect(parsed!.shipBOverrides).toEqual({ shipBSig: 78, sigRes: "M" });
    expect("attackerOverrides" in parsed!).toBe(false);
    expect("targetOverrides" in parsed!).toBe(false);
  });

  test("parseUserSettings rejects an invalid disruptor script", () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      shipAEwarActivation: { disruptors: [{ active: true, script: 123 }] },
    };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings accepts missing ewar activation fields", () => {
    const { shipAEwarActivation: _, shipBEwarActivation: __, ...missing } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missing));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAEwarActivation).toBeUndefined();
    expect(parsed!.shipBEwarActivation).toBeUndefined();
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
    expect(profile!.shipAAmmo).toBe(DEFAULT_SETTINGS.shipAAmmo);
  });

  test("decodeUrlSettings rejects invalid base64", () => {
    expect(makeParser().decodeUrlSettings("INVALID")).toBeNull();
  });

  test("decodeUrlSettings normalizes legacy attacker and target keys", () => {
    const legacy = {
      version: 9,
      tracking: 0.5,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 3000,
      falloff: 2000,
      attackerSpeed: 500,
      attackerMode: "orbit",
      attackerRange: 3000,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      targetSpeed: 800,
      targetMode: "keepAtRange",
      targetRange: 3000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSig: 125,
      targetSkillLevel: 5,
      targetOverload: true,
      initialDistance: 3000,
      attackerAmmo: "Hail S",
      simSpeed: 2,
      language: "en",
      gridBrightness: 0.5,
      autoZoom: true,
      zoomFactor: 1,
    };
    const parser = makeParser();
    const decoded = parser.decodeUrlSettings(urlFor(legacy).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipASpeed).toBe(500);
    expect(decoded!.shipBSpeed).toBe(800);
    expect(decoded!.shipBSig).toBe(125);
    expect(decoded!.shipAAmmo).toBe(DEFAULT_SETTINGS.shipAAmmo);
  });

  test("decodeUrlSettings normalizes legacy overrides to shipA and shipB", () => {
    const legacy = {
      version: 9,
      tracking: 0.5,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 3000,
      falloff: 2000,
      attackerSpeed: 500,
      attackerMode: "orbit",
      attackerRange: 3000,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      targetSpeed: 800,
      targetMode: "keepAtRange",
      targetRange: 3000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSig: 125,
      targetSkillLevel: 5,
      targetOverload: true,
      initialDistance: 3000,
      attackerAmmo: "Hail S",
      simSpeed: 2,
      language: "en",
      gridBrightness: 0.5,
      autoZoom: true,
      zoomFactor: 1,
      attackerOverrides: { attackerSpeed: 100, targetMass: 200 },
      targetOverrides: { targetSig: 50, optimal: 2500 },
    };
    const parser = makeParser();
    const decoded = parser.decodeUrlSettings(urlFor(legacy).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipAOverrides).toEqual({ shipASpeed: 100, shipBMass: 200 });
    expect(decoded!.shipBOverrides).toEqual({ shipBSig: 50, optimal: 2500 });
    expect("attackerOverrides" in decoded!).toBe(false);
    expect("targetOverrides" in decoded!).toBe(false);
  });

  test("decodeUrlSettings rejects settings with an invalid propulsion id", () => {
    const parser = makeParser();
    expect(parser.decodeUrlSettings(urlFor({ ...DEFAULT_SETTINGS, shipAPropulsion: "ab-5mn" }).split("c=")[1])).toBeNull();
  });

  test("decodeUrlSettings decodes URL settings and rebuilds the fitting basis", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
    };
    const parser = makeParser();
    const decoded = parser.decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipAFittedHull).toEqual({
      fittingName: "Brawler",
      propulsionId: "mwd-5mn",
      propulsionName: RIFTER_MODULE.label,
      propulsionKind: "microwarpdrive",
      fitted: IMPORTED_RIFTER.fitted,
      propulsion: RIFTER_MODULE,
      baseMaxSpeed: RIFTER_MWD_STATS.baseMaxSpeed,
    });
    expect(decoded!.shipAMass).toBe(1_500_000);
    expect(decoded!.shipASpeed).toBe(4_649.72);
    expect(decoded!.shipASig).toBe(RIFTER_MWD_STATS.sigRadius);
  });

  test("decodeUrlSettings defaults missing display preferences", () => {
    const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, autoZoom: _____, zoomFactor: ______, ...missingPrefs } = DEFAULT_SETTINGS;
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
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAPropulsion: "none",
    };
    const decoded = makeParser().decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipAPropulsion).toBe("none");
    expect(decoded!.shipASpeed).toBe(456.25);
    expect(decoded!.shipAMass).toBe(1_000_000);
  });

  test("decodeUrlSettings applies a stored charge that matches the turret size", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);
    const hail: TypeId = "12608" as TypeId;
    const emp: TypeId = "21898" as TypeId;
    chargeCatalog.chargesForSize = vi.fn(() => [
      { id: hail, name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
      { id: emp, name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
    ]);
    chargeCatalog.withCharge = vi.fn((turret, charge) => ({ ...turret, chargeId: charge, tracking: turret.base.tracking, optimal: turret.base.optimal, falloff: turret.base.falloff }));

    const settings: Record<string, unknown> = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAAmmo: "Republic Fleet EMP S",
    };
    const decoded = makeParser().decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipAAmmo).toBe("21898" as TypeId);
    expect(decoded!.shipATracking).toBe(0.42);
    expect(decoded!.shipAOptimal).toBe(1200);
    expect(decoded!.shipAFalloff).toBe(3000);
  });

  test("decodeUrlSettings migrates a legacy shipA hull name to ShipId", () => {
    ships.findHull = vi.fn((name: string) => (name === "Rifter" ? RIFTER_PROFILE : undefined));
    const settings = { ...DEFAULT_SETTINGS, shipAHullId: "Rifter" as ShipId, shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive" };
    const decoded = makeParser().decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipAHullId).toBe(RIFTER_PROFILE.id);
  });

  test("decodeUrlSettings scales fitted baseMaxSpeed proportionally when shipASpeed is overridden", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    const realShips = createContainer<ShipsCradle>({ injectionMode: InjectionMode.PROXY });
    registerGameDataModule(realShips);
    registerShipsModule(realShips);
    const parser = new SettingsParser({ ships: realShips.cradle.ships, fittingImport, chargeCatalog, settingGuards: testGuards });
    const override = 2000;
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAOverrides: { shipASpeed: override },
    };
    const decoded = parser.decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipASpeed).toBe(override);
    const conditions = { skillLevel: settings.shipASkillLevel ?? 5, overloaded: settings.shipAOverload ?? true };
    const expected = realShips.cradle.ships.fittedStats(RIFTER_PROFILE, IMPORTED_RIFTER.fitted, RIFTER_PROPULSION, conditions, override).baseMaxSpeed;
    expect(decoded!.shipAFittedHull?.baseMaxSpeed).toBeCloseTo(expected, 6);
  });

  test("decodeUrlSettings keeps baseMaxSpeed unscaled when shipASpeed is not overridden", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    const realShips = createContainer<ShipsCradle>({ injectionMode: InjectionMode.PROXY });
    registerGameDataModule(realShips);
    registerShipsModule(realShips);
    const parser = new SettingsParser({ ships: realShips.cradle.ships, fittingImport, chargeCatalog, settingGuards: testGuards });
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
    };
    const decoded = parser.decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    const conditions = { skillLevel: settings.shipASkillLevel ?? 5, overloaded: settings.shipAOverload ?? true };
    const expected = realShips.cradle.ships.fittedStats(RIFTER_PROFILE, IMPORTED_RIFTER.fitted, RIFTER_PROPULSION, conditions).baseMaxSpeed;
    expect(decoded!.shipAFittedHull?.baseMaxSpeed).toBeCloseTo(expected, 6);
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

  test("parseUserSettings defaults missing per-side aggressivity to 1", () => {
    const missing = { ...DEFAULT_SETTINGS };
    delete (missing as { shipAAggressivity?: number }).shipAAggressivity;
    delete (missing as { shipBAggressivity?: number }).shipBAggressivity;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missing));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAAggressivity).toBe(1);
    expect(parsed!.shipBAggressivity).toBe(1);
  });

  test("parseUserSettings clamps aggressivity to the configured range", () => {
    const clamped = { ...DEFAULT_SETTINGS, shipAAggressivity: 0.001, shipBAggressivity: 500 };
    const parsed = makeParser().parseUserSettings(JSON.stringify(clamped));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAAggressivity).toBe(0.01);
    expect(parsed!.shipBAggressivity).toBe(100);
  });

  test("parseUserSettings migrates legacy maneuverAggressivity to shipA aggressivity", () => {
    const legacy = { ...DEFAULT_SETTINGS, maneuverAggressivity: 3.5 };
    delete (legacy as { shipAAggressivity?: number }).shipAAggressivity;
    const parsed = makeParser().parseUserSettings(JSON.stringify(legacy));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipAAggressivity).toBe(3.5);
    expect("maneuverAggressivity" in parsed!).toBe(false);
  });
});
