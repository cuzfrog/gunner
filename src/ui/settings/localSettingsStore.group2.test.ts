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
describe("LocalSettingsStore group 2", () => {
  test("save and load round-trips settings through the URL", () => {
    const storage = fakeStorage();
    const location = fakeLocation("http://localhost/");
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location });
    const url = store.encodeUrl(DEFAULT_SETTINGS);
    const reloaded = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation(url) });
    expect(reloaded.loadStartupState().settings).toEqual(DEFAULT_SETTINGS);
  });

  test("loadStartupState rejects a version-2 payload", () => {
    const v2 = {
      version: 2,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(v2)) });
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
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(v3)) });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState round-trips fitted hull summaries", () => {
    const withFitted: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFittedHull: FITTED_HULL_SUMMARY,
      targetFittedHull: FITTED_HULL_SUMMARY,
    };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(withFitted)) });
    expect(store.loadStartupState().settings).toEqual(withFitted);
  });

  test("loadStartupState round-trips hull and propulsion selections", () => {
    const withHull: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      targetHull: "Caldari Shuttle",
    };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(withHull)) });
    expect(store.loadStartupState().settings).toEqual(withHull);
  });

  test("loadStartupState rejects an invalid propulsion id", () => {
    const store = new LocalSettingsStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, attackerPropulsion: "ab-5mn" })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState round-trips a deselected propulsion", () => {
    const withNone: UserSettings = { ...DEFAULT_SETTINGS, attackerHull: "Rifter", attackerPropulsion: "none" };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(withNone)) });
    expect(store.loadStartupState().settings).toEqual(withNone);
  });

  test("rebuild with explicit none keeps the fitted hull but uses base stats", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_BASE_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 456.25);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerPropulsion: "none",
    };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerPropulsion).toBe("none");
    expect(loaded!.attackerSpeed).toBe(456.25);
    expect(loaded!.attackerMass).toBe(1_000_000);
    expect(loaded!.attackerFittedHull!.propulsionId).toBe("mwd-5mn");
    expect(loaded!.attackerFittedHull!.propulsion).toEqual(RIFTER_PROPULSION);
  });

  test("loadStartupState rejects an empty hull name", () => {
    const store = new LocalSettingsStore({ parser: makeParser(),
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, attackerHull: "" })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("saveProfile and loadProfile round-trip fitted hull summaries", () => {
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const profile = profileFrom({ ...DEFAULT_SETTINGS, attackerFittedHull: FITTED_HULL_SUMMARY, targetFittedHull: FITTED_HULL_SUMMARY });
    store.saveProfile("brawler", profile);
    expect(store.loadProfile("brawler")).toEqual(profile);
  });

});
