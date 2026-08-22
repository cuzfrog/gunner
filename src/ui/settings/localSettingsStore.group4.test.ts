import { LocalSettingsStore } from "./localSettingsStore";
import {
  chargeCatalog,
  ships,
  fittingImport,
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
describe("LocalSettingsStore group 4", () => {
  test("loadStartupState rejects settings with invalid values", () => {
    const store = new LocalSettingsStore({ chargeCatalog,
      ships,
      fittingImport,
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, targetSig: -1 })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState rejects a fitted hull missing sigMultiplier", () => {
    const staleFitted = { ...FITTED_HULL_SUMMARY, fitted: { ...FITTED_HULL, sigMultiplier: undefined } };
    const store = new LocalSettingsStore({ chargeCatalog,
      ships,
      fittingImport,
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, attackerFittedHull: staleFitted })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState defaults a fitted hull missing massMultiplier to one", () => {
    const staleFitted = { ...FITTED_HULL_SUMMARY, fitted: { ...FITTED_HULL, massMultiplier: undefined } };
    const store = new LocalSettingsStore({ chargeCatalog,
      ships,
      fittingImport,
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, attackerFittedHull: staleFitted })),
    });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerFittedHull!.fitted.massMultiplier).toBe(1);
  });

  test("loadStartupState accepts settings without skill and overload fields", () => {
    const partial: UserSettings = { ...DEFAULT_SETTINGS };
    delete partial.attackerSkillLevel;
    delete partial.attackerOverload;
    delete partial.targetSkillLevel;
    delete partial.targetOverload;
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(partial)) });
    expect(store.loadStartupState().settings).toEqual(partial);
  });

  test("loadStartupState accepts settings without gridBrightness", () => {
    const partial: UserSettings = { ...DEFAULT_SETTINGS };
    delete partial.gridBrightness;
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(partial)) });
    expect(store.loadStartupState().settings).toEqual(partial);
  });

  test("loadStartupState round-trips a non-default maneuverAggressivity", () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, maneuverAggressivity: 2.5 };
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    expect(store.loadStartupState().settings).toEqual(settings);
  });

  test("loadStartupState accepts settings without maneuverAggressivity", () => {
    const partial: UserSettings = { ...DEFAULT_SETTINGS };
    delete partial.maneuverAggressivity;
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(partial)) });
    expect(store.loadStartupState().settings).toEqual(partial);
  });

  test("loadStartupState rejects an out-of-range skill level", () => {
    const store = new LocalSettingsStore({ chargeCatalog,
      ships,
      fittingImport,
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, attackerSkillLevel: 6 })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState rejects a non-boolean overload value", () => {
    const store = new LocalSettingsStore({ chargeCatalog,
      ships,
      fittingImport,
      storage: fakeStorage(),
      location: fakeLocation(urlFor({ ...DEFAULT_SETTINGS, targetOverload: "yes" })),
    });
    expect(store.loadStartupState().settings).toBeNull();
  });

  test("loadStartupState round-trips skill level 0 and unchecked overload", () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerSkillLevel: 0,
      attackerOverload: false,
      targetSkillLevel: 0,
      targetOverload: false,
    };
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    expect(store.loadStartupState().settings).toEqual(settings);
  });

});
