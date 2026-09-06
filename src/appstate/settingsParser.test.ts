import { createContainer, InjectionMode } from "awilix";
import { registerGameDataModule } from "../gamedata";
import { registerSimModule, type SimCradle, type SimValueParser } from "../sim";
import { registerShipsModule, type ShipsCradle } from "../ships";
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
  DEFAULT_PREFERENCES,
  RIFTER_PROFILE,
  RIFTER_MODULE,
  RIFTER_BASE_STATS,
  RIFTER_MWD_STATS,
  RIFTER_PROPULSION,
  IMPORTED_RIFTER,
  type UserSettings,
  type ProfileSettings,
} from "./localSettingsStore.testSupport";
import { toShipId, toTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import type { DisplayPreferences } from "./userSettings";
import type { MissileCatalog } from "../fitting";

const stubMissileCatalog: MissileCatalog = {
  missilesForLauncher: () => [],
  usualForLauncher: () => undefined,
  withCharge: () => { throw new Error("not used"); },
  has: () => false,
  idForName: () => undefined,
  equivalentInGroups: () => undefined,
};

const simValueParser: SimValueParser = (() => {
  const container = createContainer<SimCradle>({ injectionMode: InjectionMode.PROXY });
  registerSimModule(container);
  return container.cradle.simValueParser;
})();

beforeEach(() => resetMocks());

describe("SettingsParser", () => {
  test("parseUserSettings rejects invalid JSON", () => {
    expect(makeParser().parseUserSettings("not json")).toBeNull();
  });

  test("parseUserSettings rejects an unsupported version", () => {
    expect(makeParser().parseUserSettings(JSON.stringify({ ...DEFAULT_SETTINGS, version: 4 }))).toBeNull();
  });

  test("parseUserSettings accepts version 5 through 10 and stamps 15", () => {
    const v5 = { ...DEFAULT_SETTINGS, version: 5 };
    const v6 = { ...DEFAULT_SETTINGS, version: 6 };
    const v7 = { ...DEFAULT_SETTINGS, version: 7 };
    const v8 = { ...DEFAULT_SETTINGS, version: 8 };
    const v9 = { ...DEFAULT_SETTINGS, version: 9 };
    const v10 = { ...DEFAULT_SETTINGS, version: 10 };
    expect(makeParser().parseUserSettings(JSON.stringify(v5))?.version).toBe(15);
    expect(makeParser().parseUserSettings(JSON.stringify(v6))?.version).toBe(15);
    expect(makeParser().parseUserSettings(JSON.stringify(v7))?.version).toBe(15);
    expect(makeParser().parseUserSettings(JSON.stringify(v8))?.version).toBe(15);
    expect(makeParser().parseUserSettings(JSON.stringify(v9))?.version).toBe(15);
    expect(makeParser().parseUserSettings(JSON.stringify(v10))?.version).toBe(15);
  });

  test("parseUserSettings defaults missing shipAAmmo", () => {
    const { shipAAmmo: _, ...missing } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missing));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.ammo).toBe(DEFAULT_SETTINGS.shipAAmmo);
  });

  test("parseUserSettings rejects an invalid language", () => {
    const bad = { ...DEFAULT_SETTINGS, language: "klingon" };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings defaults missing display preferences", () => {
    const { language: _, shipATrackingUnit: __, shipBTrackingUnit: ___, simSpeed: ____, gridBrightness: _____, autoZoom: ______, zoomFactor: _______, ...missingPrefs } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missingPrefs));
    expect(parsed).not.toBeNull();
    expect(parsed!.display.language).toBe("en");
    expect(parsed!.display.shipATrackingUnit).toBe("rad");
    expect(parsed!.display.shipBTrackingUnit).toBe("rad");
    expect(parsed!.display.simSpeed).toBe(4);
    expect(parsed!.display.gridBrightness).toBe(0.5);
  });

  test("parseUserSettings migrates legacy trackingUnit to per-ship fields", () => {
    const { shipATrackingUnit: _, shipBTrackingUnit: __, ...legacy } = DEFAULT_SETTINGS;
    const withLegacy = { ...legacy, trackingUnit: "score" as const };
    const parsed = makeParser().parseUserSettings(JSON.stringify(withLegacy));
    expect(parsed).not.toBeNull();
    expect(parsed!.display.shipATrackingUnit).toBe("score");
    expect(parsed!.display.shipBTrackingUnit).toBe("score");
  });

  test("parseUserSettings preserves independent per-ship tracking units", () => {
    const settings = { ...DEFAULT_SETTINGS, shipATrackingUnit: "score" as const, shipBTrackingUnit: "rad" as const };
    const parsed = makeParser().parseUserSettings(JSON.stringify(settings));
    expect(parsed).not.toBeNull();
    expect(parsed!.display.shipATrackingUnit).toBe("score");
    expect(parsed!.display.shipBTrackingUnit).toBe("rad");
  });

  test("parseUserSettings rejects a non-positive initialDistance", () => {
    const bad = { ...DEFAULT_SETTINGS, initialDistance: 0 };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings round-trips ewar activation", () => {
    const parsed = makeParser().parseUserSettings(JSON.stringify(DEFAULT_SETTINGS));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.ewarActivation).toEqual(DEFAULT_SETTINGS.shipAEwarActivation);
    expect(parsed!.shipB.ewarActivation).toEqual(DEFAULT_SETTINGS.shipBEwarActivation);
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
    expect(parsed!.shipA.ewarActivation?.grapplers).toEqual([{ active: true, overloaded: true }]);
    expect(parsed!.shipB.ewarActivation?.grapplers).toEqual([{ active: false, overloaded: true }]);
    expect(parsed!.shipA.boosterActivation).toEqual([{ active: true, script: toTypeId("28999") }, { active: false, script: "none" }]);
    expect(parsed!.shipB.boosterActivation).toEqual([{ active: true, script: toTypeId("29001") }]);
  });

  test("parseUserSettings leaves absent ewar and booster activation fields undefined", () => {
    const { shipAEwarActivation: _, shipBEwarActivation: __, ...missing } = DEFAULT_SETTINGS;
    const parsed = makeParser().parseUserSettings(JSON.stringify(missing));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.ewarActivation).toBeUndefined();
    expect(parsed!.shipB.ewarActivation).toBeUndefined();
    expect(parsed!.shipA.boosterActivation).toBeUndefined();
    expect(parsed!.shipB.boosterActivation).toBeUndefined();
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
    expect(parsed!.shipA.boosterActivation).toEqual([
      { active: true, script: "none" },
      { active: false, script: "none" },
      { active: true, script: "none" },
    ]);
    expect(parsed!.shipB.boosterActivation).toEqual([{ active: false, script: toTypeId("28999") }]);
  });

  test("parseUserSettings rejects malformed booster activations like it does for ewar", () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      shipABoosterActivation: [{ active: true, script: 123 }],
    };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("parseUserSettings parses missile booster activation with script and overload", () => {
    const v13 = {
      ...DEFAULT_SETTINGS,
      version: 15,
      shipAMissileBoosterActivation: [{ active: true, overloaded: true, script: "Missile Precision Script" }, { active: false, overloaded: false, script: "none" }],
      shipBMissileBoosterActivation: [{ active: true, overloaded: false, script: "Missile Range Script" }],
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v13));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.missileBoosterActivation).toEqual([{ active: true, overloaded: true, script: toTypeId("35795") }, { active: false, overloaded: false, script: "none" }]);
    expect(parsed!.shipB.missileBoosterActivation).toEqual([{ active: true, overloaded: false, script: toTypeId("35794") }]);
  });

  test("parseUserSettings leaves absent missile booster activation undefined", () => {
    const parsed = makeParser().parseUserSettings(JSON.stringify(DEFAULT_SETTINGS));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.missileBoosterActivation).toBeUndefined();
    expect(parsed!.shipB.missileBoosterActivation).toBeUndefined();
  });

  test("parseUserSettings defaults missing overloaded field to false in missile booster entries", () => {
    const v13 = {
      ...DEFAULT_SETTINGS,
      version: 15,
      shipAMissileBoosterActivation: [{ active: true, script: "Missile Precision Script" }],
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v13));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.missileBoosterActivation).toEqual([{ active: true, overloaded: false, script: toTypeId("35795") }]);
  });

  test("parseUserSettings rejects malformed missile booster activations", () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      shipAMissileBoosterActivation: [{ active: true, overloaded: false, script: 123 }],
    };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("toWire round-trips missile booster activation", () => {
    const parser = makeParser();
    const session = parser.fromWire({
      ...DEFAULT_SETTINGS,
      shipAMissileBoosterActivation: [{ active: true, overloaded: true, script: toTypeId("35795") }],
      shipBMissileBoosterActivation: [{ active: false, overloaded: false, script: "none" }],
    });
    const wire = parser.toWire(session);
    expect(wire.shipAMissileBoosterActivation).toEqual([{ active: true, overloaded: true, script: toTypeId("35795") }]);
    expect(wire.shipBMissileBoosterActivation).toEqual([{ active: false, overloaded: false, script: "none" }]);
  });

  test("parseUserSettings parses sensor booster activation with script and overload", () => {
    const v15 = {
      ...DEFAULT_SETTINGS,
      version: 15,
      shipASensorBoosterActivation: [{ active: true, overloaded: true, script: "Scan Resolution Script" }, { active: false, overloaded: false, script: "none" }],
      shipBSensorBoosterActivation: [{ active: true, overloaded: false, script: "Targeting Range Script" }],
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v15));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.sensorBoosterActivation).toEqual([{ active: true, overloaded: true, script: toTypeId("29011") }, { active: false, overloaded: false, script: "none" }]);
    expect(parsed!.shipB.sensorBoosterActivation).toEqual([{ active: true, overloaded: false, script: toTypeId("29009") }]);
  });

  test("parseUserSettings leaves absent sensor booster activation undefined", () => {
    const parsed = makeParser().parseUserSettings(JSON.stringify(DEFAULT_SETTINGS));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.sensorBoosterActivation).toBeUndefined();
    expect(parsed!.shipB.sensorBoosterActivation).toBeUndefined();
  });

  test("parseUserSettings defaults missing overloaded field to false in sensor booster entries", () => {
    const v15 = {
      ...DEFAULT_SETTINGS,
      version: 15,
      shipASensorBoosterActivation: [{ active: true, script: "Scan Resolution Script" }],
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(v15));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.sensorBoosterActivation).toEqual([{ active: true, overloaded: false, script: toTypeId("29011") }]);
  });

  test("parseUserSettings rejects malformed sensor booster activations", () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      shipASensorBoosterActivation: [{ active: true, overloaded: false, script: 123 }],
    };
    expect(makeParser().parseUserSettings(JSON.stringify(bad))).toBeNull();
  });

  test("toWire round-trips sensor booster activation", () => {
    const parser = makeParser();
    const session = parser.fromWire({
      ...DEFAULT_SETTINGS,
      shipASensorBoosterActivation: [{ active: true, overloaded: true, script: toTypeId("29011") }],
      shipBSensorBoosterActivation: [{ active: false, overloaded: false, script: "none" }],
    });
    const wire = parser.toWire(session);
    expect(wire.shipASensorBoosterActivation).toEqual([{ active: true, overloaded: true, script: toTypeId("29011") }]);
    expect(wire.shipBSensorBoosterActivation).toEqual([{ active: false, overloaded: false, script: "none" }]);
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
    expect(parsed!.shipA.ewarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: toTypeId("29007") });
    expect(parsed!.shipA.ewarActivation?.webs?.[0]).toEqual({ active: true, overloaded: true });
    expect(parsed!.shipB.ewarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: toTypeId("29005") });
    expect(parsed!.shipB.ewarActivation?.webs?.[0]).toEqual({ active: false, overloaded: true });
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
    expect(parsed!.shipA.ewarActivation).toEqual({
      webs: [{ active: true, overloaded: false }, { active: false, overloaded: false }],
      disruptors: [{ active: true, overloaded: false, script: "none" }],
    });
    expect(parsed!.shipB.ewarActivation).toEqual({
      webs: [{ active: false, overloaded: true }],
      disruptors: [{ active: true, overloaded: true, script: toTypeId("29005") }],
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
    expect(parsed!.shipA.ewarActivation?.scramblers).toEqual([
      { active: true, overloaded: false },
      { active: true, overloaded: false },
    ]);
    expect(parsed!.shipB.ewarActivation?.scramblers).toEqual([
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
    const second = makeParser().parseUserSettings(makeParser().serialize(first!));
    expect(second).toEqual(first);
  });

  test("parseUserSettings falls back to none for unknown disruptor script names", () => {
    const input = {
      ...DEFAULT_SETTINGS,
      shipAEwarActivation: { disruptors: [{ active: true, script: "custom script" }] },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(input));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.ewarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: "none" });
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
    expect(parsed!.shipA.speed).toBe(500);
    expect(parsed!.shipA.mode).toBe("orbit");
    expect(parsed!.shipB.speed).toBe(800);
    expect(parsed!.shipB.sig).toBe(125);
    expect(parsed!.shipA.ammo).toBe(DEFAULT_SETTINGS.shipAAmmo);
  });

  test("parseUserSettings normalizes legacy overrides to shipA and shipB", () => {
    const legacy = {
      ...DEFAULT_SETTINGS,
      attackerOverrides: { attackerSpeed: 123, targetMass: 456, tracking: 0.1 },
      targetOverrides: { targetSig: 78, sigRes: "M" },
    };
    const parsed = makeParser().parseUserSettings(JSON.stringify(legacy));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.overrides).toEqual({ shipASpeed: 123, shipBMass: 456, tracking: 0.1 });
    expect(parsed!.shipB.overrides).toEqual({ shipBSig: 78, sigRes: "M" });
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
    expect(parsed!.shipA.ewarActivation).toBeUndefined();
    expect(parsed!.shipB.ewarActivation).toBeUndefined();
  });

  test("parseProfiles skips invalid profiles", () => {
    const profiles: Record<string, unknown> = { good: DEFAULT_PROFILE, bad: { ...DEFAULT_PROFILE, version: 4 } };
    const parsed = makeParser().parseProfiles(JSON.stringify(profiles));
    expect(Object.keys(parsed)).toEqual(["good"]);
  });

  test("profileFromUnknown strips display preferences and defaults ammo", () => {
    const profile = makeParser().profileFromUnknown({ ...DEFAULT_SETTINGS, language: "ja", shipATrackingUnit: "score", shipBTrackingUnit: "rad" });
    expect(profile).not.toBeNull();
    expect(profile).not.toHaveProperty("language");
    expect(profile).not.toHaveProperty("shipATrackingUnit");
    expect(profile).not.toHaveProperty("shipBTrackingUnit");
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
    expect(decoded!.shipA.speed).toBe(500);
    expect(decoded!.shipB.speed).toBe(800);
    expect(decoded!.shipB.sig).toBe(125);
    expect(decoded!.shipA.ammo).toBe(DEFAULT_SETTINGS.shipAAmmo);
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
    expect(decoded!.shipA.overrides).toEqual({ shipASpeed: 100, shipBMass: 200 });
    expect(decoded!.shipB.overrides).toEqual({ shipBSig: 50, optimal: 2500 });
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
    expect(decoded!.shipA.fittedHull).toEqual({
      fittingName: "Brawler",
      propulsionId: "mwd-5mn",
      propulsionName: RIFTER_MODULE.label,
      propulsionKind: "microwarpdrive",
      fitted: IMPORTED_RIFTER.fitted,
      propulsion: RIFTER_MODULE,
      baseMaxSpeed: RIFTER_MWD_STATS.baseMaxSpeed,
    });
    expect(decoded!.shipA.mass).toBe(1_500_000);
    expect(decoded!.shipA.speed).toBe(4_649.72);
    expect(decoded!.shipA.sig).toBe(RIFTER_MWD_STATS.sigRadius);
  });

  test("decodeUrlSettings defaults missing display preferences", () => {
    const { language: _, shipATrackingUnit: __, shipBTrackingUnit: ___, simSpeed: ____, gridBrightness: _____, autoZoom: ______, zoomFactor: _______, ...missingPrefs } = DEFAULT_SETTINGS;
    const decoded = makeParser().decodeUrlSettings(urlFor(missingPrefs).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.display.language).toBe("en");
    expect(decoded!.display.shipATrackingUnit).toBe("rad");
    expect(decoded!.display.shipBTrackingUnit).toBe("rad");
    expect(decoded!.display.simSpeed).toBe(4);
    expect(decoded!.display.gridBrightness).toBe(0.5);
  });

  test("decodeUrlSettings preserves supplied display preferences", () => {
    const decoded = makeParser().decodeUrlSettings(urlFor(URL_SETTINGS).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.display.language).toBe("ja");
    expect(decoded!.display.simSpeed).toBe(2);
    expect(decoded!.display.gridBrightness).toBe(0.5);
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
    expect(decoded!.shipA.propulsion).toBe("none");
    expect(decoded!.shipA.speed).toBe(456.25);
    expect(decoded!.shipA.mass).toBe(1_000_000);
  });

  test("decodeUrlSettings applies a stored charge that matches the turret size", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);
    const hail: TypeId = "12608" as TypeId;
    const emp: TypeId = "21898" as TypeId;
    chargeCatalog.chargesForSize = vi.fn(() => [
      { id: hail, name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75, damageByType: { explosive: 15 } },
      { id: emp, name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1, damageByType: { em: 10, explosive: 5 } },
    ]);
    chargeCatalog.withCharge = vi.fn((turret, charge) => ({ ...turret, chargeId: charge, tracking: turret.base.tracking, optimal: turret.base.optimal, falloff: turret.base.falloff }));

    const settings: Record<string, unknown> = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAAmmo: "Republic Fleet EMP S",
    };
    const decoded = makeParser().decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipA.ammo).toBe("21898" as TypeId);
    expect(decoded!.shipA.tracking).toBe(0.42);
    expect(decoded!.shipA.optimal).toBe(1200);
    expect(decoded!.shipA.falloff).toBe(3000);
  });

  test("decodeUrlSettings migrates a legacy shipA hull name to ShipId", () => {
    ships.findHull = vi.fn((name: string) => (name === "Rifter" ? RIFTER_PROFILE : undefined));
    const settings = { ...DEFAULT_SETTINGS, shipAHullId: "Rifter" as ShipId, shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive" };
    const decoded = makeParser().decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipA.hull).toBe(RIFTER_PROFILE.id);
  });

  test("parseUserSettings resolves v10 hull by English, Chinese, and Japanese names", () => {
    const en = { ...DEFAULT_SETTINGS, version: 10, shipAHull: "Rifter" };
    const zh = { ...DEFAULT_SETTINGS, version: 10, shipAHull: "裂谷级" };
    const ja = { ...DEFAULT_SETTINGS, version: 10, shipAHull: "リフター" };
    const parser = makeParser();
    const enParsed = parser.parseUserSettings(JSON.stringify(en));
    const zhParsed = parser.parseUserSettings(JSON.stringify(zh));
    const jaParsed = parser.parseUserSettings(JSON.stringify(ja));
    expect(enParsed?.shipA.hull).toBe(RIFTER_PROFILE.id);
    expect(zhParsed?.shipA.hull).toBe(RIFTER_PROFILE.id);
    expect(jaParsed?.shipA.hull).toBe(RIFTER_PROFILE.id);
  });

  test("parseUserSettings preserves resolved localized hull ids through a reparse", () => {
    const zh = { ...DEFAULT_SETTINGS, version: 10, shipAHull: "裂谷级", shipBHull: "Thrasher" };
    const ja = { ...DEFAULT_SETTINGS, version: 10, shipAHull: "リフター", shipBHull: "Thrasher" };
    const parser = makeParser();

    const firstZh = parser.parseUserSettings(JSON.stringify(zh));
    expect(firstZh).not.toBeNull();
    expect(firstZh!.shipA.hull).toBe(RIFTER_PROFILE.id);
    expect(firstZh!.shipB.hull).toBe("16242" as ShipId);
    expect(parser.parseUserSettings(parser.serialize(firstZh!))).toEqual(firstZh);

    const firstJa = parser.parseUserSettings(JSON.stringify(ja));
    expect(firstJa).not.toBeNull();
    expect(firstJa!.shipA.hull).toBe(RIFTER_PROFILE.id);
    expect(parser.parseUserSettings(parser.serialize(firstJa!))).toEqual(firstJa);
  });

  test("parseUserSettings drops a garbage numeric hullId and deletes the legacy hull key", () => {
    const bad = { ...DEFAULT_SETTINGS, version: 10, shipAHullId: "999999999" as ShipId, shipAHull: "USS Enterprise" };
    const parsed = makeParser().parseUserSettings(JSON.stringify(bad));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.hull).toBeUndefined();
  });

  test("parseUserSettings resolves a legacy-wraith hull id and typed legacy-wraith name", () => {
    const byId = { ...DEFAULT_SETTINGS, version: 10, shipAHullId: "legacy-wraith" as ShipId };
    const byName = { ...DEFAULT_SETTINGS, version: 10, shipAHull: "legacy-wraith" };
    const parser = makeParser();
    const byIdParsed = parser.parseUserSettings(JSON.stringify(byId));
    const byNameParsed = parser.parseUserSettings(JSON.stringify(byName));
    expect(byIdParsed?.shipA.hull).toBe("legacy-wraith" as ShipId);
    expect(byNameParsed?.shipA.hull).toBe("legacy-wraith" as ShipId);
  });

  test("parseUserSettings replaces a garbage ammo id with the default charge", () => {
    const bad = { ...DEFAULT_SETTINGS, version: 10, shipAAmmo: "999999999" as TypeId };
    const parsed = makeParser().parseUserSettings(JSON.stringify(bad));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.ammo).toBe(DEFAULT_SETTINGS.shipAAmmo);
  });

  test("parseUserSettings resolves an ammo name to a stable id and keeps it through a reparse", () => {
    const v10 = { ...DEFAULT_SETTINGS, version: 10, shipAAmmo: "Hail S" };
    const parser = makeParser();
    const first = parser.parseUserSettings(JSON.stringify(v10));
    expect(first).not.toBeNull();
    expect(first!.shipA.ammo).toBe("12608" as TypeId);
    const second = parser.parseUserSettings(parser.serialize(first!));
    expect(second).toEqual(first);
  });

  test("decodeUrlSettings scales fitted baseMaxSpeed proportionally when shipASpeed is overridden", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    const realShips = createContainer<ShipsCradle>({ injectionMode: InjectionMode.PROXY });
    registerGameDataModule(realShips);
    registerShipsModule(realShips);
    const parser = new SettingsParser({ ships: realShips.cradle.ships, fittingImport, chargeCatalog, missileCatalog: stubMissileCatalog, itemNameResolver: realShips.cradle.itemNameResolver, simValueParser });
    const override = 2000;
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAOverrides: { shipASpeed: override },
    };
    const decoded = parser.decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.shipA.speed).toBe(override);
    const conditions = { skillLevel: settings.shipASkillLevel ?? 5, overloaded: settings.shipAOverload ?? true, weaponOverloaded: false };
    const expected = realShips.cradle.ships.fittedStats(RIFTER_PROFILE, IMPORTED_RIFTER.fitted, RIFTER_PROPULSION, conditions, override).baseMaxSpeed;
    expect(decoded!.shipA.fittedHull?.baseMaxSpeed).toBeCloseTo(expected, 6);
  });

  test("decodeUrlSettings keeps baseMaxSpeed unscaled when shipASpeed is not overridden", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    const realShips = createContainer<ShipsCradle>({ injectionMode: InjectionMode.PROXY });
    registerGameDataModule(realShips);
    registerShipsModule(realShips);
    const parser = new SettingsParser({ ships: realShips.cradle.ships, fittingImport, chargeCatalog, missileCatalog: stubMissileCatalog, itemNameResolver: realShips.cradle.itemNameResolver, simValueParser });
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
    };
    const decoded = parser.decodeUrlSettings(urlFor(settings).split("c=")[1]);
    expect(decoded).not.toBeNull();
    const conditions = { skillLevel: settings.shipASkillLevel ?? 5, overloaded: settings.shipAOverload ?? true, weaponOverloaded: false };
    const expected = realShips.cradle.ships.fittedStats(RIFTER_PROFILE, IMPORTED_RIFTER.fitted, RIFTER_PROPULSION, conditions).baseMaxSpeed;
    expect(decoded!.shipA.fittedHull?.baseMaxSpeed).toBeCloseTo(expected, 6);
  });

  test("golden localStorage round-trip preserves DEFAULT_SETTINGS", () => {
    const parser = makeParser();
    const serialized = parser.serialize(DEFAULT_SETTINGS);
    const restored = parser.parseUserSettings(serialized);
    expect(parser.toWire(restored!)).toEqual(DEFAULT_SETTINGS);
  });

  test("golden localStorage round-trip preserves URL_SETTINGS", () => {
    const parser = makeParser();
    const serialized = parser.serialize(URL_SETTINGS);
    const restored = parser.parseUserSettings(serialized);
    expect(parser.toWire(restored!)).toEqual(URL_SETTINGS);
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
    expect(parsed!.shipA.aggressivity).toBe(1);
    expect(parsed!.shipB.aggressivity).toBe(1);
  });

  test("parseUserSettings clamps aggressivity to the configured range", () => {
    const clamped = { ...DEFAULT_SETTINGS, shipAAggressivity: 0.001, shipBAggressivity: 500 };
    const parsed = makeParser().parseUserSettings(JSON.stringify(clamped));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.aggressivity).toBe(0.01);
    expect(parsed!.shipB.aggressivity).toBe(100);
  });

  test("parseUserSettings migrates legacy maneuverAggressivity to shipA aggressivity", () => {
    const legacy = { ...DEFAULT_SETTINGS, maneuverAggressivity: 3.5 };
    delete (legacy as { shipAAggressivity?: number }).shipAAggressivity;
    const parsed = makeParser().parseUserSettings(JSON.stringify(legacy));
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.aggressivity).toBe(3.5);
  });

  test("fromWire and toWire round-trip preserves all wire fields", () => {
    const parser = makeParser();
    const session = parser.fromWire(DEFAULT_SETTINGS);
    expect(parser.toWire(session)).toEqual(DEFAULT_SETTINGS);
  });

  test("fromWire and toWire round-trip preserves optional shipASig", () => {
    const parser = makeParser();
    const withoutSig: UserSettings = { ...DEFAULT_SETTINGS };
    delete (withoutSig as { shipASig?: number }).shipASig;
    const session = parser.fromWire(withoutSig);
    expect(session.shipA.sig).toBeUndefined();
    const restored = parser.toWire(session);
    expect("shipASig" in restored).toBe(false);
  });

  test("fromWire and toWire round-trip preserves URL_SETTINGS", () => {
    const parser = makeParser();
    const session = parser.fromWire(URL_SETTINGS);
    expect(parser.toWire(session)).toEqual(URL_SETTINGS);
  });

  test("fromWire and toWire round-trip preserves weaponKind and missileAmmo", () => {
    const parser = makeParser();
    const wire: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAWeaponKind: "missile",
      shipBWeaponKind: "turret",
      shipAMissileAmmo: toTypeId("202"),
    };
    const session = parser.fromWire(wire);
    expect(session.shipA.weaponKind).toBe("missile");
    expect(session.shipB.weaponKind).toBe("turret");
    expect(session.shipA.missileAmmo).toBe(toTypeId("202"));
    expect(session.shipB.missileAmmo).toBeUndefined();
    expect(parser.toWire(session)).toEqual(wire);
  });

  test("fromWire and toWire round-trip preserves droneGroups", () => {
    const parser = makeParser();
    const wire: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAWeaponKind: "drone",
      shipADroneGroups: [{ typeId: toTypeId("24545"), count: 5 }],
    };
    const session = parser.fromWire(wire);
    expect(session.shipA.weaponKind).toBe("drone");
    expect(session.shipA.droneGroups).toEqual([{ typeId: toTypeId("24545"), count: 5 }]);
    expect(session.shipB.droneGroups).toBeUndefined();
    expect(parser.toWire(session)).toEqual(wire);
  });

  test("absent weaponKind defaults to undefined in session settings", () => {
    const parser = makeParser();
    const session = parser.fromWire(DEFAULT_SETTINGS);
    expect(session.shipA.weaponKind).toBeUndefined();
    expect(session.shipB.weaponKind).toBeUndefined();
  });

  test("version 12 settings migrate to version 15", () => {
    const parser = makeParser();
    const v12 = JSON.stringify({ ...DEFAULT_SETTINGS, version: 12 });
    const parsed = parser.parseUserSettings(v12);
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(15);
    expect(parsed!.shipA.weaponKind).toBeUndefined();
  });

  test("legacy shipADroneTypeId migrates to shipADroneGroups with count 1", () => {
    const parser = makeParser();
    const legacy = JSON.stringify({ ...DEFAULT_SETTINGS, shipADroneTypeId: "24545" });
    const parsed = parser.parseUserSettings(legacy);
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.droneGroups).toEqual([{ typeId: toTypeId("24545"), count: 1 }]);
  });

  test("legacy shipBDroneTypeId migrates to shipBDroneGroups with count 1", () => {
    const parser = makeParser();
    const legacy = JSON.stringify({ ...DEFAULT_SETTINGS, shipBDroneTypeId: "24545" });
    const parsed = parser.parseUserSettings(legacy);
    expect(parsed).not.toBeNull();
    expect(parsed!.shipB.droneGroups).toEqual([{ typeId: toTypeId("24545"), count: 1 }]);
  });

  test("droneTypeId is ignored when droneGroups is already set", () => {
    const parser = makeParser();
    const legacy = JSON.stringify({ ...DEFAULT_SETTINGS, shipADroneTypeId: "99999", shipADroneGroups: [{ typeId: toTypeId("24545"), count: 3 }] });
    const parsed = parser.parseUserSettings(legacy);
    expect(parsed).not.toBeNull();
    expect(parsed!.shipA.droneGroups).toEqual([{ typeId: toTypeId("24545"), count: 3 }]);
  });

  test("invalid droneGroups with non-integer count are rejected", () => {
    const parser = makeParser();
    const invalid = JSON.stringify({ ...DEFAULT_SETTINGS, shipADroneGroups: [{ typeId: "24545", count: 3.5 }] });
    expect(parser.parseUserSettings(invalid)).toBeNull();
  });

  test("invalid droneGroups with zero count are rejected", () => {
    const parser = makeParser();
    const invalid = JSON.stringify({ ...DEFAULT_SETTINGS, shipADroneGroups: [{ typeId: "24545", count: 0 }] });
    expect(parser.parseUserSettings(invalid)).toBeNull();
  });

  test("fromProfile defaults missing ammo to usualForChargeSize(1)", () => {
    const parser = makeParser();
    const { shipAAmmo: _, shipBAmmo: __, ...profileWithoutAmmo } = DEFAULT_PROFILE;
    const display: DisplayPreferences = DEFAULT_PREFERENCES;
    const session = parser.fromProfile(profileWithoutAmmo as ProfileSettings, display);
    expect(session.shipA.ammo).toBe(DEFAULT_SETTINGS.shipAAmmo);
    expect(session.shipB.ammo).toBe(DEFAULT_SETTINGS.shipBAmmo);
  });

  test("fromProfile passes display preferences through", () => {
    const parser = makeParser();
    const display: DisplayPreferences = { ...DEFAULT_PREFERENCES, language: "ja", simSpeed: 2 };
    const session = parser.fromProfile(DEFAULT_PROFILE, display);
    expect(session.display.language).toBe("ja");
    expect(session.display.simSpeed).toBe(2);
  });

  test("fromProfile defaults turret fields via fromWire fallbacks", () => {
    const parser = makeParser();
    const { shipATracking: _, shipASigRes: __, shipAOptimal: ___, shipAFalloff: ____, ...profileWithoutTurret } = DEFAULT_PROFILE;
    const display: DisplayPreferences = DEFAULT_PREFERENCES;
    const session = parser.fromProfile(profileWithoutTurret as ProfileSettings, display);
    expect(session.shipA.tracking).toBe(0);
    expect(session.shipA.sigRes).toBe("S");
    expect(session.shipA.optimal).toBe(0);
    expect(session.shipA.falloff).toBe(0);
  });

  test("fromWire and toWire round-trip preserves weaponOverload", () => {
    const parser = makeParser();
    const settings: UserSettings = { ...DEFAULT_SETTINGS, shipAWeaponOverload: true, shipBWeaponOverload: true };
    const session = parser.fromWire(settings);
    expect(session.shipA.weaponOverload).toBe(true);
    expect(session.shipB.weaponOverload).toBe(true);
    expect(parser.toWire(session)).toEqual(settings);
  });

  test("fromWire defaults weaponOverload to false when absent", () => {
    const parser = makeParser();
    const { shipAWeaponOverload: _, shipBWeaponOverload: __, ...withoutWeaponOverload } = DEFAULT_SETTINGS;
    const session = parser.fromWire(withoutWeaponOverload as UserSettings);
    expect(session.shipA.weaponOverload).toBe(false);
    expect(session.shipB.weaponOverload).toBe(false);
  });
});
