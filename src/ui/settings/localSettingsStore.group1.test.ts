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
describe("LocalSettingsStore group 1", () => {
  test("loadStartupState returns null settings without a URL parameter", () => {
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(store.loadStartupState()).toEqual({ settings: null, selectedProfileName: null });
  });

  test("loadStartupState decodes settings from the URL", () => {
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(URL_SETTINGS)) });
    expect(store.loadStartupState().settings).toEqual(URL_SETTINGS);
  });

  test("loadStartupState ignores local storage snapshots from previous versions", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v6", JSON.stringify(DEFAULT_SETTINGS));
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadStartupState()).toEqual({ settings: null, selectedProfileName: null });
  });

  test("loadStartupState restores the selected profile name on a plain URL", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    store.selectProfile("brawler");
    expect(store.loadStartupState()).toEqual({ settings: null, selectedProfileName: "brawler" });
  });

  test("loadStartupState returns no selection when the selected profile no longer exists", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-selected-profile-v6", "ghost");
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadStartupState()).toEqual({ settings: null, selectedProfileName: null });
  });

  test("loadStartupState reads a legacy selected profile record with a baseline", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    storage.setItem("gunner-selected-profile-v6", JSON.stringify({ name: "brawler", baseline: DEFAULT_PROFILE }));
    expect(store.loadStartupState().selectedProfileName).toBe("brawler");
  });

  test("loadStartupState keeps the selection when the URL carries the selected profile", () => {
    const storage = fakeStorage();
    const url = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") }).encodeUrl(URL_SETTINGS);
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation(url) });
    store.saveProfile("shared", profileFrom(URL_SETTINGS));
    store.selectProfile("shared");
    expect(store.loadStartupState()).toEqual({ settings: URL_SETTINGS, selectedProfileName: "shared" });
  });

  test("loadStartupState drops the selection for a foreign URL but keeps it stored", () => {
    const storage = fakeStorage();
    const url = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") }).encodeUrl(URL_SETTINGS);
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation(url) });
    store.saveProfile("mine", DEFAULT_PROFILE);
    store.selectProfile("mine");
    expect(store.loadStartupState().selectedProfileName).toBeNull();
    expect(storage.getItem("gunner-selected-profile-v6")).toBe("mine");
  });

  test("selectProfile stores the plain profile name", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.selectProfile("brawler");
    expect(storage.getItem("gunner-selected-profile-v6")).toBe("brawler");
  });

  test("selectProfile rejects an empty name", () => {
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(() => store.selectProfile("")).toThrow("selected profile name cannot be empty");
  });

});
