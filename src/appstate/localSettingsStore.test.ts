import type { ShipId, TypeId } from "../gamedata/ids";
import {
  chargeCatalog,
  ships,
  fittingImport,
  makeParser,
  makeStore,
  fakeEquality,
  resetMocks,
  fakeStorage,
  fakeLocation,
  urlFor,
  DEFAULT_SETTINGS,
  URL_SETTINGS,
  profileFrom,
  DEFAULT_PROFILE,
  DEFAULT_PREFERENCES,
  FITTED_HULL,
  FITTED_HULL_SUMMARY,
  RIFTER_PROFILE,
  RIFTER_FITTED,
  RIFTER_MODULE,
  RIFTER_PROPULSION,
  COMPACT_MWD,
  RIFTER_BASE_STATS,
  RIFTER_MWD_STATS,
  IMPORTED_RIFTER,
  type UserSettings,
  type DisplayPreferences,
  type ProfileSettings,
} from "./localSettingsStore.testSupport";

beforeEach(() => resetMocks());
describe("LocalSettingsStore", () => {
  test("loadStartupState returns null settings without a URL parameter", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(store.loadStartupState()).toEqual({ settings: null, selectedProfileName: null });
  });

  test("loadStartupState decodes settings from the URL", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(URL_SETTINGS)) });
    expect(store.loadStartupState().settings).toEqual(URL_SETTINGS);
  });

  test("loadStartupState ignores local storage snapshots from previous versions", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v6", JSON.stringify(DEFAULT_SETTINGS));
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadStartupState()).toEqual({ settings: null, selectedProfileName: null });
  });

  test("loadStartupState restores the selected profile name on a plain URL", () => {
    const storage = fakeStorage();
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    store.selectProfile("brawler");
    expect(store.loadStartupState()).toEqual({ settings: null, selectedProfileName: "brawler" });
  });

  test("loadStartupState returns no selection when the selected profile no longer exists", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-selected-profile-v6", "ghost");
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadStartupState()).toEqual({ settings: null, selectedProfileName: null });
  });

  test("loadStartupState reads a legacy selected profile record with a baseline", () => {
    const storage = fakeStorage();
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    storage.setItem("gunner-selected-profile-v6", JSON.stringify({ name: "brawler", baseline: DEFAULT_PROFILE }));
    expect(store.loadStartupState().selectedProfileName).toBe("brawler");
  });

  test("loadStartupState keeps the selection when the URL carries the selected profile", () => {
    const storage = fakeStorage();
    const url = makeStore({
      parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation("http://localhost/"),
    }).encodeUrl(URL_SETTINGS);
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation(url) });
    store.saveProfile("shared", profileFrom(URL_SETTINGS));
    store.selectProfile("shared");
    expect(store.loadStartupState()).toEqual({ settings: { ...URL_SETTINGS, ...DEFAULT_PREFERENCES }, selectedProfileName: "shared" });
  });

  test("loadStartupState drops the selection for a foreign URL but keeps it stored", () => {
    const storage = fakeStorage();
    const url = makeStore({
      parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation("http://localhost/"),
    }).encodeUrl(URL_SETTINGS);
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation(url), equality: fakeEquality(false) });
    store.saveProfile("mine", DEFAULT_PROFILE);
    store.selectProfile("mine");
    expect(store.loadStartupState().selectedProfileName).toBeNull();
    expect(storage.getItem("gunner-selected-profile-v6")).toBe("mine");
  });

  test("selectProfile stores the plain profile name", () => {
    const storage = fakeStorage();
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.selectProfile("brawler");
    expect(storage.getItem("gunner-selected-profile-v6")).toBe("brawler");
  });

  test("selectProfile rejects an empty name", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(() => store.selectProfile("")).toThrow("selected profile name cannot be empty");
  });

  test("clearSelectedProfile removes the selected profile keys", () => {
    const storage = fakeStorage();
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.selectProfile("brawler");
    store.clearSelectedProfile();
    expect(storage.getItem("gunner-selected-profile-v6")).toBeNull();
    expect(storage.getItem("gunner-selected-profile-v5")).toBeNull();
    expect(store.loadStartupState().selectedProfileName).toBeNull();
  });

  test("save and load round-trips settings through the URL", () => {
    const storage = fakeStorage();
    const location = fakeLocation("http://localhost/");
    const store = makeStore({ parser: makeParser(), storage, location });
    const url = store.encodeUrl(DEFAULT_SETTINGS);
    const reloaded = makeStore({ parser: makeParser(), storage, location: fakeLocation(url) });
    expect(reloaded.loadStartupState().settings).toEqual(DEFAULT_SETTINGS);
  });

  test("loadStartupState prefers the URL language over the navigator language", () => {
    const storage = fakeStorage();
    const urlSettings: UserSettings = { ...DEFAULT_SETTINGS, language: "ja" };
    const store = makeStore({
      parser: makeParser(),
      storage,
      location: fakeLocation(urlFor(urlSettings)),
      navigatorLanguage: "zh-CN",
    });
    expect(store.loadStartupState().settings?.language).toBe("ja");
  });

  test("loadStartupState rejects a version-2 payload", () => {
    const v2 = {
      version: 2,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      shipASpeed: 0,
      shipAMode: "keepAtRange",
      shipARange: 5000,
      initialDistance: 5000,
      shipBSpeed: 1000,
      shipBMode: "orbit",
      shipBRange: 5000,
      shipBSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(v2)) });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState rejects a version-3 payload", () => {
    const v3 = {
      version: 3,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      shipASpeed: 0,
      shipAMode: "keepAtRange",
      shipARange: 5000,
      shipAMass: 1_200_000,
      shipAInertia: 3,
      initialDistance: 5000,
      shipBSpeed: 1000,
      shipBMode: "orbit",
      shipBRange: 5000,
      shipBMass: 10_000_000,
      shipBInertia: 0.45,
      shipBSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(v3)) });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState round-trips fitted hull summaries", () => {
    const withFitted: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFittedHull: FITTED_HULL_SUMMARY,
      shipBFittedHull: FITTED_HULL_SUMMARY,
    };
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(withFitted)) });
    expect(store.loadStartupState().settings).toEqual(withFitted);
  });

  test("loadStartupState round-trips hull and propulsion selections", () => {
    const withHull: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAHullId: "587" as ShipId,
      shipAPropulsion: "mwd-5mn",
      shipBHullId: "672" as ShipId,
    };
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(withHull)) });
    expect(store.loadStartupState().settings).toEqual(withHull);
  });

  test("loadStartupState rejects an invalid propulsion id", () => {
    const store = makeStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, shipAPropulsion: "ab-5mn" })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState round-trips a deselected propulsion", () => {
    const withNone: UserSettings = { ...DEFAULT_SETTINGS, shipAHullId: "587" as ShipId, shipAPropulsion: "none" };
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(withNone)) });
    expect(store.loadStartupState().settings).toEqual(withNone);
  });

  test("rebuild with explicit none keeps the fitted hull but uses base stats", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_BASE_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 456.25);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAPropulsion: "none",
    };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAPropulsion).toBe("none");
    expect(loaded!.shipASpeed).toBe(456.25);
    expect(loaded!.shipAMass).toBe(1_000_000);
    expect(loaded!.shipAFittedHull!.propulsionId).toBe("mwd-5mn");
    expect(loaded!.shipAFittedHull!.propulsion).toEqual(RIFTER_PROPULSION);
  });

  test("loadStartupState rejects an empty hull id", () => {
    const store = makeStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, shipAHullId: "" })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("saveProfile and loadProfile round-trip fitted hull summaries", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const profile = profileFrom({ ...DEFAULT_SETTINGS, shipAFittedHull: FITTED_HULL_SUMMARY, shipBFittedHull: FITTED_HULL_SUMMARY });
    store.saveProfile("brawler", profile);
    expect(store.loadProfile("brawler")).toEqual(profile);
  });

  test("saveProfile and loadProfile round-trip", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    expect(store.listProfiles()).toEqual(["brawler"]);
    expect(store.loadProfile("brawler")).toEqual(DEFAULT_PROFILE);
  });

  test("saveProfile and loadProfile round-trip ewar activations", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const profile = profileFrom(DEFAULT_SETTINGS);
    store.saveProfile("brawler", profile);
    expect(store.loadProfile("brawler")).toEqual(profile);
  });

  test("saveProfile rejects a profile with an invalid ewar activation script", () => {
    const storage = fakeStorage();
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    const bad = { ...DEFAULT_PROFILE, shipAEwarActivation: { disruptors: [{ active: true, overloaded: true, script: 123 }] } } as unknown as ProfileSettings;
    store.saveProfile("brawler", bad);
    expect(store.listProfiles()).toEqual([]);
  });

  test("loadProfile strips legacy profiles without ewar activation fields", () => {
    const storage = fakeStorage();
    const { shipAEwarActivation: _, shipBEwarActivation: __, ...legacy } = DEFAULT_PROFILE;
    storage.setItem("gunner-profiles-v6", JSON.stringify({ brawler: legacy }));
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadProfile("brawler")).toEqual(legacy);
  });

  test("saveProfile strips display preference fields from the stored profile", () => {
    const storage = fakeStorage();
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_SETTINGS);
    const raw = storage.getItem("gunner-profiles-v6")!;
    const stored = JSON.parse(raw).brawler;
    expect(stored).toEqual(DEFAULT_PROFILE);
    expect(stored).not.toHaveProperty("language");
    expect(stored).not.toHaveProperty("shipATrackingUnit");
    expect(stored).not.toHaveProperty("shipBTrackingUnit");
    expect(stored).not.toHaveProperty("simSpeed");
    expect(stored).not.toHaveProperty("gridBrightness");
    expect(stored).toHaveProperty("initialDistance");
  });

  test("loadProfile strips legacy display preference fields from stored profiles", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-profiles-v6", JSON.stringify({ brawler: { ...DEFAULT_SETTINGS, language: "ja", shipATrackingUnit: "score", shipBTrackingUnit: "rad" } }));
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadProfile("brawler")).toEqual(DEFAULT_PROFILE);
  });

  test("deleteProfile removes the profile", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("a", DEFAULT_PROFILE);
    store.saveProfile("b", DEFAULT_PROFILE);
    store.deleteProfile("a");
    expect(store.listProfiles()).toEqual(["b"]);
    expect(store.loadProfile("a")).toBeNull();
  });

  test("deleteProfile clears the selected profile when it is the deleted one", () => {
    const storage = fakeStorage();
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    store.selectProfile("brawler");
    store.deleteProfile("brawler");
    expect(store.listProfiles()).toEqual([]);
    expect(store.loadStartupState().selectedProfileName).toBeNull();
    expect(storage.getItem("gunner-selected-profile-v6")).toBeNull();
  });

  test("deleteProfile leaves the selected profile alone when it is a different one", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    store.saveProfile("sniper", DEFAULT_PROFILE);
    store.selectProfile("sniper");
    store.deleteProfile("brawler");
    expect(store.listProfiles()).toEqual(["sniper"]);
    expect(store.loadStartupState().selectedProfileName).toBe("sniper");
  });

  test("encodeUrl round-trips through loadStartupState", () => {
    const location = fakeLocation("http://localhost/index.html");
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location });
    const url = store.encodeUrl(DEFAULT_SETTINGS);
    const decoded = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(url) });
    expect(decoded.loadStartupState().settings).toEqual(DEFAULT_SETTINGS);
    expect(location.href).toBe("http://localhost/index.html");
  });

  test("loadStartupState rejects invalid URL settings and keeps the URL untouched", () => {
    const location = fakeLocation("http://localhost/?c=INVALID");
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location });
    expect(store.loadStartupState().settings).toBeNull();
    expect(location.href).toBe("http://localhost/?c=INVALID");
  });

  test("loadStartupState rejects a malformed c parameter", () => {
    const location = fakeLocation("http://localhost/?c=%25");
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location });
    expect(store.loadStartupState().settings).toBeNull();
    expect(location.href).toBe("http://localhost/?c=%25");
  });

  test("loadStartupState rejects settings with a non-positive initialDistance", () => {
    const bad = { ...DEFAULT_SETTINGS, initialDistance: 0 };
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(bad)) });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState rejects settings with invalid values", () => {
    const store = makeStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, shipBSig: -1 })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState rejects a fitted hull missing sigMultiplier", () => {
    const staleFitted = { ...FITTED_HULL_SUMMARY, fitted: { ...FITTED_HULL, sigMultiplier: undefined } };
    const store = makeStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, shipAFittedHull: staleFitted })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState defaults a fitted hull missing massMultiplier to one", () => {
    const staleFitted = { ...FITTED_HULL_SUMMARY, fitted: { ...FITTED_HULL, massMultiplier: undefined } };
    const store = makeStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, shipAFittedHull: staleFitted })),
    });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAFittedHull!.fitted.massMultiplier).toBe(1);
  });

  test("loadStartupState accepts settings without skill and overload fields", () => {
    const partial: UserSettings = { ...DEFAULT_SETTINGS };
    delete partial.shipASkillLevel;
    delete partial.shipAOverload;
    delete partial.shipBSkillLevel;
    delete partial.shipBOverload;
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(partial)) });
    expect(store.loadStartupState().settings).toEqual(partial);
  });

  test("loadStartupState accepts settings without gridBrightness", () => {
    const partial: UserSettings = { ...DEFAULT_SETTINGS };
    delete partial.gridBrightness;
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(partial)) });
    expect(store.loadStartupState().settings).toEqual({ ...partial, gridBrightness: DEFAULT_PREFERENCES.gridBrightness });
  });

  test("loadStartupState round-trips non-default per-side aggressivity", () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, shipAAggressivity: 2.5, shipBAggressivity: 2.5 };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    expect(store.loadStartupState().settings).toEqual(settings);
  });

  test("loadStartupState defaults missing per-side aggressivity to 1", () => {
    const partial: UserSettings = { ...DEFAULT_SETTINGS };
    delete partial.shipAAggressivity;
    delete partial.shipBAggressivity;
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(partial)) });
    expect(store.loadStartupState().settings).toEqual({ ...partial, shipAAggressivity: 1, shipBAggressivity: 1 });
  });

  test("loadStartupState rejects an out-of-range skill level", () => {
    const store = makeStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, shipASkillLevel: 6 })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState rejects a non-boolean overload value", () => {
    const store = makeStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, shipBOverload: "yes" })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState round-trips skill level 0 and unchecked overload", () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipASkillLevel: 0,
      shipAOverload: false,
      shipBSkillLevel: 0,
      shipBOverload: false,
    };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    expect(store.loadStartupState().settings).toEqual(settings);
  });

  test("loadStartupState round-trips a custom gridBrightness", () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, gridBrightness: 0.75 };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    expect(store.loadStartupState().settings).toEqual(settings);
  });

  test("loadStartupState round-trips midships mode", () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS, shipAMode: "midships", shipBMode: "midships",
    };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    expect(store.loadStartupState().settings).toEqual(settings);
  });

  test("loadStartupState accepts gridBrightness at the interval endpoints", () => {
    const zero: UserSettings = { ...DEFAULT_SETTINGS, gridBrightness: 0 };
    const one: UserSettings = { ...DEFAULT_SETTINGS, gridBrightness: 1 };
    expect(makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(zero)),
    }).loadStartupState().settings).toEqual(zero);
    expect(makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(one)),
    }).loadStartupState().settings).toEqual(one);
  });

  test("loadStartupState accepts an out-of-range gridBrightness which the controls clamp", () => {
    const store = makeStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, gridBrightness: 1.5 })),
    });
    expect(store.loadStartupState().settings).toEqual({ ...DEFAULT_SETTINGS, gridBrightness: 1.5 });
  });

  test("loadPreferences returns defaults when nothing is stored", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(store.loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("loadPreferences detects the navigator language for a first-time user", () => {
    const store = makeStore({
      parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation("http://localhost/"),
      navigatorLanguage: "zh-CN",
    });
    expect(store.loadPreferences().language).toBe("zh");
  });

  test("loadPreferences detects Japanese and normalizes navigator casing", () => {
    const store = makeStore({
      parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation("http://localhost/"),
      navigatorLanguage: "ja-JP",
    });
    expect(store.loadPreferences().language).toBe("ja");
  });

  test("loadPreferences detects Chinese with underscore separators", () => {
    const store = makeStore({
      parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation("http://localhost/"),
      navigatorLanguage: "zh_TW",
    });
    expect(store.loadPreferences().language).toBe("zh");
  });

  test("loadPreferences falls back to English for an unsupported navigator language", () => {
    const store = makeStore({
      parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation("http://localhost/"),
      navigatorLanguage: "fr-FR",
    });
    expect(store.loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("loadPreferences keeps a stored language even when the navigator language differs", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", JSON.stringify({ ...DEFAULT_PREFERENCES, language: "en" }));
    const store = makeStore({
      parser: makeParser(),
      storage,
      location: fakeLocation("http://localhost/"),
      navigatorLanguage: "ja-JP",
    });
    expect(store.loadPreferences().language).toBe("en");
  });

  test("savePreferences and loadPreferences round-trip", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const preferences: DisplayPreferences = { language: "ja", shipATrackingUnit: "score", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", simSpeed: 2, gridBrightness: 0.8, autoZoom: true, zoomFactor: 1 };
    store.savePreferences(preferences);
    expect(store.loadPreferences()).toEqual(preferences);
  });

  test("savePreferences and loadPreferences round-trip weapon range visibility", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const preferences: DisplayPreferences = { language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "shipA", simSpeed: 4, gridBrightness: 0.5, autoZoom: true, zoomFactor: 1 };
    store.savePreferences(preferences);
    expect(store.loadPreferences().weaponRangeVisibility).toBe("shipA");
  });

  test("loadPreferences defaults weapon range visibility to both when missing", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", JSON.stringify({ language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", simSpeed: 4, gridBrightness: 0.5 }));
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadPreferences().weaponRangeVisibility).toBe("both");
  });

  test("loadPreferences defaults weapon range visibility to both when invalid", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", JSON.stringify({ language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "invalid", simSpeed: 4, gridBrightness: 0.5 }));
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadPreferences().weaponRangeVisibility).toBe("both");
  });

  test("loadPreferences falls back per field for invalid values", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", JSON.stringify({ language: "klingon", shipATrackingUnit: "meters", simSpeed: -1, gridBrightness: 2 }));
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("loadPreferences migrates a legacy global trackingUnit to both per-ship fields", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", JSON.stringify({ trackingUnit: "score" }));
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    const loaded = store.loadPreferences();
    expect(loaded.shipATrackingUnit).toBe("score");
    expect(loaded.shipBTrackingUnit).toBe("score");
  });

  test("loadPreferences keeps independent per-ship tracking units", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", JSON.stringify({ shipATrackingUnit: "score", shipBTrackingUnit: "rad" }));
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    const loaded = store.loadPreferences();
    expect(loaded.shipATrackingUnit).toBe("score");
    expect(loaded.shipBTrackingUnit).toBe("rad");
  });

  test("loadPreferences returns defaults for malformed JSON", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", "{not json");
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("savePreferences and loadPreferences round-trip hidden range overlays", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const preferences: DisplayPreferences = { language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", simSpeed: 4, gridBrightness: 0.5, hiddenRangeOverlays: ["web", "disruptor"], autoZoom: true, zoomFactor: 1 };
    store.savePreferences(preferences);
    expect(store.loadPreferences()).toEqual(preferences);
  });

  test("loadPreferences falls back for invalid hidden range overlays", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", JSON.stringify({ ...DEFAULT_PREFERENCES, hiddenRangeOverlays: ["web", "invalid"] }));
    const store = makeStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("loadStartupState migrates a v5 payload with fitted hull summaries", () => {
    const v5 = { ...DEFAULT_SETTINGS, version: 5, shipAFittedHull: FITTED_HULL_SUMMARY };
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(v5)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(12);
    expect(loaded!.shipAFittedHull).toEqual(FITTED_HULL_SUMMARY);
    expect(loaded!.shipAMass).toBe(DEFAULT_SETTINGS.shipAMass);
  });

  test("loadStartupState migrates a v5 payload without fitted hull summaries", () => {
    const v5 = { ...DEFAULT_SETTINGS, version: 5 };
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(v5)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(12);
    expect(loaded!.shipAFittedHull).toBeUndefined();
  });

  test("loadStartupState round-trips v6 fitting basis with per-side overrides", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAOverrides: { shipAMass: 2_000_000 },
    };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAFitting).toBe(settings.shipAFitting);
    expect(loaded!.shipAOverrides).toEqual({ shipAMass: 2_000_000 });
    expect(loaded!.shipAFittedHull).toEqual({
      fittingName: "Brawler",
      propulsionId: "mwd-5mn",
      propulsionName: RIFTER_MODULE.label,
      propulsionKind: "microwarpdrive",
      fitted: RIFTER_FITTED,
      propulsion: RIFTER_MODULE,
      baseMaxSpeed: RIFTER_MWD_STATS.baseMaxSpeed,
    });
    expect(loaded!.shipAMass).toBe(2_000_000);
    expect(loaded!.shipAInertia).toBe(2);
    expect(loaded!.shipASpeed).toBe(4_649.72);
    expect(loaded!.shipATracking).toBe(0.315);
    expect(loaded!.shipASigRes).toBe("S");
    expect(loaded!.shipAOptimal).toBe(600);
    expect(loaded!.shipAFalloff).toBe(3000);
  });

  test("loadStartupState preserves an exact propulsion variant from the fitted hull summary", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    fittingImport.propulsionStatsById = vi.fn((id: TypeId) => (id === "5973" ? COMPACT_MWD : undefined));
    fittingImport.propulsionStats = vi.fn((name: string) => (name === "5MN Y-T8 Compact Microwarpdrive" ? COMPACT_MWD : undefined));
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_650);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAFittedHull: {
        ...FITTED_HULL_SUMMARY,
        propulsionId: "mwd-5mn",
        propulsionModuleId: "5973" as TypeId,
        propulsionName: "5MN Y-T8 Compact Microwarpdrive",
        propulsion: COMPACT_MWD,
      },
    };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAFittedHull?.propulsionModuleId).toBe("5973" as TypeId);
    expect(loaded!.shipAFittedHull?.propulsionName).toBe("5MN Y-T8 Compact Microwarpdrive");
    expect(loaded!.shipAFittedHull?.propulsion).toEqual(COMPACT_MWD);
    expect(loaded!.shipASpeed).toBe(4_650);
  });

  test("basis re-import on load overwrites stale parameter cache", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);

    const stale: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAFittedHull: FITTED_HULL_SUMMARY,
      shipAMass: 9_999_999,
      shipASpeed: 111,
      tracking: 0.01,
      sigRes: "M",
      optimal: 10,
      falloff: 10,
    };
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(stale)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAMass).toBe(1_500_000);
    expect(loaded!.shipASpeed).toBe(4_649.72);
    expect(loaded!.shipATracking).toBe(0.315);
    expect(loaded!.shipASigRes).toBe("S");
    expect(loaded!.shipAOptimal).toBe(600);
    expect(loaded!.shipAFalloff).toBe(3000);
    expect(loaded!.shipAFittedHull!.propulsionId).toBe("mwd-5mn");
  });

  test("re-import on load recomputes speed using the overridden mass", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn((_profile, _fitted, mass) => mass / 500);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAOverrides: { shipAMass: 2_000_000 },
    };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAMass).toBe(2_000_000);
    expect(loaded!.shipASpeed).toBe(4_000);
  });

  test("loadStartupState normalizes a v6 payload missing shipAAmmo", () => {
    const missingAmmo: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    delete missingAmmo.shipAAmmo;
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(missingAmmo)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAAmmo).toBe(DEFAULT_SETTINGS.shipAAmmo);
  });

  test("loadProfile normalizes a profile missing shipAAmmo", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const { shipAAmmo: _, ...missingAmmo } = DEFAULT_PROFILE;
    store.saveProfile("brawler", missingAmmo as ProfileSettings);
    const loaded = store.loadProfile("brawler");
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAAmmo).toBe(DEFAULT_SETTINGS.shipAAmmo);
  });

  test("basis re-import applies a stored charge that matches the turret size", () => {
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
    chargeCatalog.withCharge = vi.fn((turret, charge) => ({
      ...turret, chargeId: charge, tracking: turret.base.tracking, optimal: turret.base.optimal, falloff: turret.base.falloff,
    }));

    const settings: Record<string, unknown> = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAAmmo: "Republic Fleet EMP S",
    };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAAmmo).toBe("21898" as TypeId);
    expect(loaded!.shipATracking).toBe(0.42);
    expect(loaded!.shipAOptimal).toBe(1200);
    expect(loaded!.shipAFalloff).toBe(3000);
  });

  test("golden URL round-trip preserves URL_SETTINGS", () => {
    const store = makeStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(URL_SETTINGS)) });
    expect(store.loadStartupState().settings).toEqual(URL_SETTINGS);
  });

  test("basis re-import falls back to the imported charge when the stored charge is invalid", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);
    const hail2: TypeId = "12608" as TypeId;
    chargeCatalog.chargesForSize = vi.fn(() => [
      { id: hail2, name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
    ]);
    chargeCatalog.withCharge = vi.fn((turret) => turret);

    const settings: Record<string, unknown> = {
      ...DEFAULT_SETTINGS,
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      shipAAmmo: "Mjolnir Rocket",
    };
    const store = makeStore({
      parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)),
    });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.shipAAmmo).toBe(DEFAULT_SETTINGS.shipAAmmo);
    expect(loaded!.shipAOptimal).toBe(600);
    expect(loaded!.shipATracking).toBe(0.315);
    expect(loaded!.shipASigRes).toBe("S");
    expect(loaded!.shipAFalloff).toBe(3000);
  });
});
