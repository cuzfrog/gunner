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
describe("LocalSettingsStore group 3", () => {
  test("saveProfile and loadProfile round-trip", () => {
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    expect(store.listProfiles()).toEqual(["brawler"]);
    expect(store.loadProfile("brawler")).toEqual(DEFAULT_PROFILE);
  });

  test("saveProfile strips display preference fields from the stored profile", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_SETTINGS);
    const raw = storage.getItem("gunner-profiles-v6")!;
    const stored = JSON.parse(raw).brawler;
    expect(stored).toEqual(DEFAULT_PROFILE);
    expect(stored).not.toHaveProperty("language");
    expect(stored).not.toHaveProperty("trackingUnit");
    expect(stored).not.toHaveProperty("simSpeed");
    expect(stored).not.toHaveProperty("gridBrightness");
    expect(stored).toHaveProperty("initialDistance");
  });

  test("loadProfile strips legacy display preference fields from stored profiles", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-profiles-v6", JSON.stringify({ brawler: { ...DEFAULT_SETTINGS, language: "ja", trackingUnit: "score" } }));
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    expect(store.loadProfile("brawler")).toEqual(DEFAULT_PROFILE);
  });

  test("deleteProfile removes the profile", () => {
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("a", DEFAULT_PROFILE);
    store.saveProfile("b", DEFAULT_PROFILE);
    store.deleteProfile("a");
    expect(store.listProfiles()).toEqual(["b"]);
    expect(store.loadProfile("a")).toBeNull();
  });

  test("deleteProfile clears the selected profile when it is the deleted one", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ parser: makeParser(), storage, location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    store.selectProfile("brawler");
    store.deleteProfile("brawler");
    expect(store.listProfiles()).toEqual([]);
    expect(store.loadStartupState().selectedProfileName).toBeNull();
    expect(storage.getItem("gunner-selected-profile-v6")).toBeNull();
  });

  test("deleteProfile leaves the selected profile alone when it is a different one", () => {
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    store.saveProfile("sniper", DEFAULT_PROFILE);
    store.selectProfile("sniper");
    store.deleteProfile("brawler");
    expect(store.listProfiles()).toEqual(["sniper"]);
    expect(store.loadStartupState().selectedProfileName).toBe("sniper");
  });

  test("encodeUrl round-trips through loadStartupState", () => {
    const location = fakeLocation("http://localhost/index.html");
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location });
    const url = store.encodeUrl(DEFAULT_SETTINGS);
    const decoded = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(url) });
    expect(decoded.loadStartupState().settings).toEqual(DEFAULT_SETTINGS);
    expect(location.href).toBe("http://localhost/index.html");
  });

  test("loadStartupState rejects invalid URL settings and keeps the URL untouched", () => {
    const location = fakeLocation("http://localhost/?c=INVALID");
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location });
    expect(store.loadStartupState().settings).toBeNull();
    expect(location.href).toBe("http://localhost/?c=INVALID");
  });

  test("loadStartupState rejects a malformed c parameter", () => {
    const location = fakeLocation("http://localhost/?c=%25");
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location });
    expect(store.loadStartupState().settings).toBeNull();
    expect(location.href).toBe("http://localhost/?c=%25");
  });

  test("loadStartupState rejects settings with a non-positive initialDistance", () => {
    const bad = { ...DEFAULT_SETTINGS, initialDistance: 0 };
    const store = new LocalSettingsStore({ parser: makeParser(), storage: fakeStorage(), location: fakeLocation(urlFor(bad)) });
    expect(store.loadStartupState().settings).toBeNull();
  });

});
