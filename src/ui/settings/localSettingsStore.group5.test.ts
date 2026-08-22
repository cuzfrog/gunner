import { LocalSettingsStore } from "./localSettingsStore";
import {
  chargeCatalog,
  ships,
  fittingImport,
  makeParser,
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
describe("LocalSettingsStore group 5", () => {
  test("loadStartupState round-trips a custom gridBrightness", () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, gridBrightness: 0.75 };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    expect(store.loadStartupState().settings).toEqual(settings);
  });

  test("loadStartupState round-trips midships mode", () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, attackerMode: "midships", targetMode: "midships" };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    expect(store.loadStartupState().settings).toEqual(settings);
  });

  test("loadStartupState accepts gridBrightness at the interval endpoints", () => {
    const zero: UserSettings = { ...DEFAULT_SETTINGS, gridBrightness: 0 };
    const one: UserSettings = { ...DEFAULT_SETTINGS, gridBrightness: 1 };
    expect(new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(zero)) }).loadStartupState().settings).toEqual(zero);
    expect(new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(one)) }).loadStartupState().settings).toEqual(one);
  });

  test("loadStartupState accepts an out-of-range gridBrightness which the controls clamp", () => {
    const store = new LocalSettingsStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, gridBrightness: 1.5 })),
    });
    expect(store.loadStartupState().settings).toEqual({ ...DEFAULT_SETTINGS, gridBrightness: 1.5 });
  });

  test("loadPreferences returns defaults when nothing is stored", () => {
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(store.loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("savePreferences and loadPreferences round-trip", () => {
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const preferences: DisplayPreferences = { language: "ja", trackingUnit: "score", simSpeed: 2, gridBrightness: 0.8 };
    store.savePreferences(preferences);
    expect(store.loadPreferences()).toEqual(preferences);
  });

  test("loadPreferences falls back per field for invalid values", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", JSON.stringify({ language: "klingon", trackingUnit: "meters", simSpeed: -1, gridBrightness: 2 }));
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("loadPreferences returns defaults for malformed JSON", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-prefs-v1", "{not json");
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("loadStartupState migrates a v5 payload with fitted hull summaries", () => {
    const v5 = { ...DEFAULT_SETTINGS, version: 5, attackerFittedHull: FITTED_HULL_SUMMARY };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(v5)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(6);
    expect(loaded!.attackerFittedHull).toEqual(FITTED_HULL_SUMMARY);
    expect(loaded!.attackerMass).toBe(DEFAULT_SETTINGS.attackerMass);
  });

  test("loadStartupState migrates a v5 payload without fitted hull summaries", () => {
    const v5 = { ...DEFAULT_SETTINGS, version: 5 };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(v5)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(6);
    expect(loaded!.attackerFittedHull).toBeUndefined();
  });

});
