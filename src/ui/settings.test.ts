import type { FittedHull, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, Ships } from "../ships";
import type { FittingImport, ImportedFitting } from "../fitting";
import type { ClipboardProvider, LocationProvider, StorageProvider } from "./settings";
import { LocalSettingsStore, USER_SETTINGS_VERSION, type FittedHullSummary, type ProfileSettings, type UserSettings } from "./settings";

const DEFAULT_SETTINGS: UserSettings = {
  version: USER_SETTINGS_VERSION,
  tracking: 0.32,
  trackingUnit: "rad",
  sigRes: "S",
  optimal: 5000,
  falloff: 5000,
  attackerSpeed: 0,
  attackerMode: "keepAtRange",
  attackerRange: 5000,
  maneuverAggressivity: 1,
  gridBrightness: 0.2,
  attackerMass: 1_200_000,
  attackerInertia: 3,
  attackerSkillLevel: 5,
  attackerOverload: true,
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit",
  targetRange: 5000,
  targetMass: 10_000_000,
  targetInertia: 0.45,
  targetSkillLevel: 5,
  targetOverload: true,
  targetSig: 40,
  simSpeed: 4,
  language: "en",
};

const URL_SETTINGS: UserSettings = {
  ...DEFAULT_SETTINGS,
  tracking: 0.18,
  sigRes: "M",
  optimal: 3000,
  falloff: 2000,
  attackerSpeed: 500,
  attackerMode: "orbit",
  attackerRange: 3000,
  maneuverAggressivity: 1,
  initialDistance: 3000,
  targetSpeed: 800,
  targetMode: "keepAtRange",
  targetRange: 3000,
  targetSig: 125,
  simSpeed: 2,
  language: "ja",
};

function profileFrom(settings: UserSettings): ProfileSettings {
  const { language: _, trackingUnit: __, ...rest } = settings;
  return rest;
}

const DEFAULT_PROFILE: ProfileSettings = profileFrom(DEFAULT_SETTINGS);

const FITTED_HULL: FittedHull = { mass: 1_500_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 };

const FITTED_PROPULSION = {
  thrust: 1_500_000,
  speedBonus: 1.15,
  massAddition: 500_000,
  sigBloom: 0,
};

const FITTED_HULL_SUMMARY: FittedHullSummary = {
  fittingName: "Brawler",
  propulsionId: "ab-1mn",
  fitted: FITTED_HULL,
  propulsion: FITTED_PROPULSION,
};

const RIFTER_PROFILE: ShipProfile = {
  name: "Rifter",
  faction: "Minmatar",
  hullType: "Frigate",
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 300,
  sigRadius: 36,
};

const RIFTER_FITTED: FittedHull = {
  mass: 1_000_000,
  massMultiplier: 1,
  speedMultiplier: 1,
  inertiaMultiplier: 1,
  sigMultiplier: 1,
  sigRadiusAdd: 0,
};

const RIFTER_MODULE: PropulsionModule = {
  id: "mwd-5mn",
  kind: "microwarpdrive",
  sizeTier: "small",
  label: "5MN Microwarpdrive",
  thrust: 1_500_000,
  speedBonus: 5,
  massAddition: 500_000,
  sigBloom: 5,
};

const RIFTER_PROPULSION: PropulsionStats & { readonly propulsionId: PropulsionId } = { ...RIFTER_MODULE, propulsionId: "mwd-5mn" };

const IMPORTED_RIFTER: ImportedFitting = {
  profile: RIFTER_PROFILE,
  fittingName: "Brawler",
  fitted: RIFTER_FITTED,
  propulsion: RIFTER_PROPULSION,
  turret: { tracking: 0.315, sigResolutionClass: "S", optimal: 600, falloff: 3000 },
};

function fakeStorage(): StorageProvider {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

function fakeLocation(href: string): LocationProvider {
  let currentHref = href;
  return {
    get href() {
      return currentHref;
    },
    replace: (url) => {
      currentHref = url;
    },
  };
}

function fakeClipboard(): ClipboardProvider {
  let lastText = "";
  return {
    readText: async () => lastText,
    writeText: async (text) => {
      lastText = text;
    },
  };
}

const VALID_PROPULSION_IDS: readonly string[] = ["ab-1mn", "ab-10mn", "ab-100mn", "ab-10000mn", "mwd-5mn", "mwd-50mn", "mwd-500mn", "mwd-50000mn"];

let ships: Ships;
let fittingImport: FittingImport;

function makeFittingImport(): FittingImport {
  return vi.mocked<FittingImport>({ importFitting: vi.fn(() => undefined) });
}

function makeShips(): Ships {
  return vi.mocked<Ships>({
    hulls: vi.fn(),
    hullView: vi.fn(),
    findHull: vi.fn(),
    parsePropulsionId: vi.fn((value: unknown) => {
      if (typeof value !== "string") return undefined;
      return VALID_PROPULSION_IDS.includes(value) ? (value as PropulsionId) : undefined;
    }),
    fittingOptions: vi.fn(),
    fittingOption: vi.fn(),
    fittedStats: vi.fn(),
    maxSpeedForFittedMass: vi.fn(),
  });
}

beforeEach(() => {
  ships = makeShips();
  fittingImport = makeFittingImport();
});

describe("LocalSettingsStore", () => {
  test("load returns null when storage and url are empty", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("save and load round-trips settings", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    store.save(DEFAULT_SETTINGS);
    const loaded = store.load();
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  test("load decodes settings from the URL and ignores local storage", () => {
    const storage = fakeStorage();
    const encoder = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const url = encoder.encodeUrl(URL_SETTINGS);
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation(url) });
    storage.setItem("gunner-settings-v3", JSON.stringify(DEFAULT_SETTINGS));
    const loaded = store.load();
    expect(loaded).toEqual(URL_SETTINGS);
  });

  test("load rejects a version-2 payload", () => {
    const storage = fakeStorage();
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
    storage.setItem("gunner-settings-v6", JSON.stringify(v2));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("load rejects a version-3 payload", () => {
    const storage = fakeStorage();
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
    storage.setItem("gunner-settings-v6", JSON.stringify(v3));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("save and load round-trip v5 with fitted hull summaries", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const withFitted: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFittedHull: FITTED_HULL_SUMMARY,
      targetFittedHull: FITTED_HULL_SUMMARY,
    };
    store.save(withFitted);
    expect(store.load()).toEqual(withFitted);
  });

  test("save and load round-trip v5 with hull and propulsion selections", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const withHull: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      targetHull: "Caldari Shuttle",
    };
    store.save(withHull);
    expect(store.load()).toEqual(withHull);
  });

  test("load rejects an invalid propulsion id", () => {
    const storage = fakeStorage();
    storage.setItem(
      "gunner-settings-v6",
      JSON.stringify({ ...DEFAULT_SETTINGS, attackerPropulsion: "ab-5mn" }),
    );
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("load rejects an empty hull name", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v6", JSON.stringify({ ...DEFAULT_SETTINGS, attackerHull: "" }));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("load accepts settings without the optional hull and propulsion fields", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v6", JSON.stringify(DEFAULT_SETTINGS));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const loaded = store.load();
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  test("saveProfile and loadProfile round-trip fitted hull summaries", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const profile = profileFrom({ ...DEFAULT_SETTINGS, attackerFittedHull: FITTED_HULL_SUMMARY, targetFittedHull: FITTED_HULL_SUMMARY });
    store.saveProfile("brawler", profile);
    expect(store.loadProfile("brawler")).toEqual(profile);
  });

  test("saveProfile and loadProfile round-trip", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    expect(store.listProfiles()).toEqual(["brawler"]);
    expect(store.loadProfile("brawler")).toEqual(DEFAULT_PROFILE);
  });

  test("saveProfile strips display preference fields from the stored profile", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_SETTINGS);
    const raw = storage.getItem("gunner-profiles-v6")!;
    const stored = JSON.parse(raw).brawler;
    expect(stored).toEqual(DEFAULT_PROFILE);
    expect(stored).not.toHaveProperty("language");
    expect(stored).not.toHaveProperty("trackingUnit");
  });

  test("loadProfile strips legacy display preference fields from stored profiles", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-profiles-v6", JSON.stringify({ brawler: { ...DEFAULT_SETTINGS, language: "ja", trackingUnit: "score" } }));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.loadProfile("brawler")).toEqual(DEFAULT_PROFILE);
  });

  test("loadSelectedProfile strips legacy display preference fields from the baseline", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-selected-profile-v6", JSON.stringify({ name: "brawler", baseline: { ...DEFAULT_SETTINGS, language: "ja", trackingUnit: "score" } }));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.loadSelectedProfile()).toEqual({ name: "brawler", baseline: DEFAULT_PROFILE });
  });

  test("deleteProfile removes the profile", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("a", DEFAULT_PROFILE);
    store.saveProfile("b", DEFAULT_PROFILE);
    store.deleteProfile("a");
    expect(store.listProfiles()).toEqual(["b"]);
    expect(store.loadProfile("a")).toBeNull();
  });

  test("deleteProfile clears the selected profile when it is the deleted one", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    store.saveSelectedProfile("brawler", DEFAULT_PROFILE);
    store.deleteProfile("brawler");
    expect(store.listProfiles()).toEqual([]);
    expect(store.loadSelectedProfile()).toBeNull();
  });

  test("deleteProfile leaves the selected profile alone when it is a different one", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_PROFILE);
    store.saveProfile("sniper", DEFAULT_PROFILE);
    store.saveSelectedProfile("sniper", DEFAULT_PROFILE);
    store.deleteProfile("brawler");
    expect(store.listProfiles()).toEqual(["sniper"]);
    expect(store.loadSelectedProfile()).toEqual({ name: "sniper", baseline: DEFAULT_PROFILE });
  });

  test("encodeUrl and decodeUrl round-trip fitted hull summaries", () => {
    const location = fakeLocation("http://localhost/index.html");
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location });
    const withFitted: UserSettings = { ...DEFAULT_SETTINGS, attackerFittedHull: FITTED_HULL_SUMMARY };
    const url = store.encodeUrl(withFitted);
    const decoded = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation(url) }).decodeUrl();
    expect(decoded).toEqual(withFitted);
  });

  test("encodeUrl and decodeUrl round-trip", () => {
    const location = fakeLocation("http://localhost/index.html");
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location });
    const url = store.encodeUrl(DEFAULT_SETTINGS);
    const decodedStore = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation(url) });
    const decoded = decodedStore.decodeUrl();
    expect(decoded).toEqual(DEFAULT_SETTINGS);
  });

  test("writeUrlToClipboard writes a full URL", async () => {
    const location = fakeLocation("http://localhost/index.html");
    const clipboard = fakeClipboard();
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location });
    const ok = await store.writeUrlToClipboard(DEFAULT_SETTINGS, clipboard);
    expect(ok).toBe(true);
  });

  test("writeUrlToClipboard returns false without a clipboard", async () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const ok = await store.writeUrlToClipboard(DEFAULT_SETTINGS);
    expect(ok).toBe(false);
  });

  test("decodeUrl rejects invalid settings and does not replace the URL", () => {
    const location = fakeLocation("http://localhost/?c=INVALID");
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location });
    expect(store.decodeUrl()).toBeNull();
    expect(location.href).toBe("http://localhost/?c=INVALID");
  });

  test("decodeUrl returns valid settings and does not replace the URL", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const url = store.encodeUrl(DEFAULT_SETTINGS);
    const decodedLocation = fakeLocation(url);
    const decodedStore = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: decodedLocation });
    const decoded = decodedStore.decodeUrl();
    expect(decoded).toEqual(DEFAULT_SETTINGS);
    expect(decodedLocation.href).toBe(url);
  });

  test("decodeUrl rejects settings with a non-positive initialDistance", () => {
    const bad = { ...DEFAULT_SETTINGS, initialDistance: 0 };
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const url = store.encodeUrl(bad);
    const decoded = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation(url) }).decodeUrl();
    expect(decoded).toBeNull();
  });

  test("load ignores stored settings with invalid values", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v6", JSON.stringify({ ...DEFAULT_SETTINGS, targetSig: -1 }));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("load rejects stored settings with a fitted hull missing sigMultiplier", () => {
    const storage = fakeStorage();
    const staleFitted = { ...FITTED_HULL_SUMMARY, fitted: { ...FITTED_HULL, sigMultiplier: undefined } };
    storage.setItem("gunner-settings-v6", JSON.stringify({ ...DEFAULT_SETTINGS, attackerFittedHull: staleFitted }));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("load defaults a fitted hull missing massMultiplier to one", () => {
    const storage = fakeStorage();
    const staleFitted = { ...FITTED_HULL_SUMMARY, fitted: { ...FITTED_HULL, massMultiplier: undefined } };
    storage.setItem("gunner-settings-v6", JSON.stringify({ ...DEFAULT_SETTINGS, attackerFittedHull: staleFitted }));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerFittedHull!.fitted.massMultiplier).toBe(1);
  });

  test("load falls back to local storage when the URL is invalid", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v6", JSON.stringify(DEFAULT_SETTINGS));
    const location = fakeLocation("http://localhost/?c=INVALID");
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location });
    expect(store.load()).toEqual(DEFAULT_SETTINGS);
    expect(location.href).toBe("http://localhost/?c=INVALID");
  });

  test("decodeUrl returns null for a malformed c parameter", () => {
    const location = fakeLocation("http://localhost/?c=%25");
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location });
    expect(store.decodeUrl()).toBeNull();
    expect(location.href).toBe("http://localhost/?c=%25");
  });

  test("load accepts settings without skill and overload fields", () => {
    const storage = fakeStorage();
    const partial: UserSettings = { ...DEFAULT_SETTINGS };
    delete partial.attackerSkillLevel;
    delete partial.attackerOverload;
    delete partial.targetSkillLevel;
    delete partial.targetOverload;
    storage.setItem("gunner-settings-v6", JSON.stringify(partial));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toEqual(partial);
  });

  test("load accepts settings without gridBrightness", () => {
    const storage = fakeStorage();
    const partial: UserSettings = { ...DEFAULT_SETTINGS };
    delete partial.gridBrightness;
    storage.setItem("gunner-settings-v6", JSON.stringify(partial));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toEqual(partial);
  });

  test("save and load round-trips a non-default maneuverAggressivity", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const settings: UserSettings = { ...DEFAULT_SETTINGS, maneuverAggressivity: 2.5 };
    store.save(settings);
    expect(store.load()).toEqual(settings);
  });

  test("load accepts settings without maneuverAggressivity", () => {
    const storage = fakeStorage();
    const partial: UserSettings = { ...DEFAULT_SETTINGS };
    delete partial.maneuverAggressivity;
    storage.setItem("gunner-settings-v6", JSON.stringify(partial));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toEqual(partial);
  });

  test("load rejects an out-of-range skill level", () => {
    const storage = fakeStorage();
    const bad = { ...DEFAULT_SETTINGS, attackerSkillLevel: 6 };
    storage.setItem("gunner-settings-v6", JSON.stringify(bad));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("load rejects a non-boolean overload value", () => {
    const storage = fakeStorage();
    const bad = { ...DEFAULT_SETTINGS, targetOverload: "yes" };
    storage.setItem("gunner-settings-v6", JSON.stringify(bad));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("save and load round-trip skill level 0 and unchecked overload", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerSkillLevel: 0,
      attackerOverload: false,
      targetSkillLevel: 0,
      targetOverload: false,
    };
    store.save(settings);
    expect(store.load()).toEqual(settings);
  });

  test("encodeUrl and decodeUrl round-trip skill and overload fields", () => {
    const location = fakeLocation("http://localhost/index.html");
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location });
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerSkillLevel: 0,
      attackerOverload: false,
      targetSkillLevel: 3,
      targetOverload: true,
    };
    const url = store.encodeUrl(settings);
    const decoded = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation(url) }).decodeUrl();
    expect(decoded).toEqual(settings);
  });

  test("save and load round-trip a custom gridBrightness", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const settings: UserSettings = { ...DEFAULT_SETTINGS, gridBrightness: 0.75 };
    store.save(settings);
    expect(store.load()).toEqual(settings);
  });

  test("load accepts gridBrightness at the interval endpoints", () => {
    const storage = fakeStorage();
    const zero: UserSettings = { ...DEFAULT_SETTINGS, gridBrightness: 0 };
    const one: UserSettings = { ...DEFAULT_SETTINGS, gridBrightness: 1 };
    storage.setItem("gunner-settings-v6", JSON.stringify(zero));
    expect(new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") }).load()).toEqual(zero);
    storage.setItem("gunner-settings-v6", JSON.stringify(one));
    expect(new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") }).load()).toEqual(one);
  });

  test("load rejects a gridBrightness outside [0, 1]", () => {
    const storage = fakeStorage();
    const bad = { ...DEFAULT_SETTINGS, gridBrightness: 1.5 };
    storage.setItem("gunner-settings-v6", JSON.stringify(bad));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("hasForeignUrlSettings returns true when the URL carries settings different from local", () => {
    const storage = fakeStorage();
    const different: UserSettings = { ...DEFAULT_SETTINGS, optimal: 9999 };
    storage.setItem("gunner-settings-v6", JSON.stringify(DEFAULT_SETTINGS));
    const url = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") }).encodeUrl(different);
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation(url) });
    expect(store.hasForeignUrlSettings()).toBe(true);
    expect(store.load()).toEqual(different);
  });

  test("hasForeignUrlSettings returns false when the URL matches local storage", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v6", JSON.stringify(DEFAULT_SETTINGS));
    const url = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") }).encodeUrl(DEFAULT_SETTINGS);
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation(url) });
    expect(store.hasForeignUrlSettings()).toBe(false);
  });

  test("hasForeignUrlSettings returns false for an invalid URL parameter", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v6", JSON.stringify(DEFAULT_SETTINGS));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/?c=INVALID") });
    expect(store.hasForeignUrlSettings()).toBe(false);
  });

  test("hasForeignUrlSettings returns false when there is no URL parameter", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v6", JSON.stringify(DEFAULT_SETTINGS));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.hasForeignUrlSettings()).toBe(false);
  });

  test("saveSelectedProfile and loadSelectedProfile round-trip a name and baseline", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveSelectedProfile("brawler", DEFAULT_PROFILE);
    const selected = store.loadSelectedProfile();
    expect(selected).toEqual({ name: "brawler", baseline: DEFAULT_PROFILE });
  });

  test("clearSelectedProfile removes the stored selection", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveSelectedProfile("brawler", DEFAULT_PROFILE);
    store.clearSelectedProfile();
    expect(store.loadSelectedProfile()).toBeNull();
  });

  test("saveSelectedProfile rejects an empty name", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(() => store.saveSelectedProfile("", DEFAULT_PROFILE)).toThrow("selected profile name cannot be empty");
  });

  test("loadSelectedProfile returns null for an invalid baseline", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-selected-profile-v6", JSON.stringify({ name: "brawler", baseline: { version: 2 } }));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    expect(store.loadSelectedProfile()).toBeNull();
  });

  test("loadSelectedProfile returns null when no profile is selected", () => {
    const store = new LocalSettingsStore({ ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(store.loadSelectedProfile()).toBeNull();
  });

  test("load migrates a v5 payload with fitted hull summaries", () => {
    const storage = fakeStorage();
    const v5 = { ...DEFAULT_SETTINGS, version: 5, attackerFittedHull: FITTED_HULL_SUMMARY };
    storage.setItem("gunner-settings-v5", JSON.stringify(v5));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(6);
    expect(loaded!.attackerFittedHull).toEqual(FITTED_HULL_SUMMARY);
    expect(loaded!.attackerMass).toBe(DEFAULT_SETTINGS.attackerMass);
  });

  test("load migrates a v5 payload without fitted hull summaries", () => {
    const storage = fakeStorage();
    const v5 = { ...DEFAULT_SETTINGS, version: 5 };
    storage.setItem("gunner-settings-v5", JSON.stringify(v5));
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(6);
    expect(loaded!.attackerFittedHull).toBeUndefined();
  });

  test("save and load round-trip v6 fitting basis with per-side overrides", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => ({ mass: 1_500_000, inertiaModifier: 2, maxSpeed: 4_649.72, sigRadius: 210 }));
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);

    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerOverrides: { attackerMass: 2_000_000 },
    };
    store.save(settings);
    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerFitting).toBe(settings.attackerFitting);
    expect(loaded!.attackerOverrides).toEqual({ attackerMass: 2_000_000 });
    expect(loaded!.attackerFittedHull).toEqual({
      fittingName: "Brawler",
      propulsionId: "mwd-5mn",
      fitted: RIFTER_FITTED,
      propulsion: RIFTER_MODULE,
    });
    expect(loaded!.attackerMass).toBe(2_000_000);
    expect(loaded!.attackerInertia).toBe(2);
    expect(loaded!.attackerSpeed).toBe(4_649.72);
    expect(loaded!.tracking).toBe(0.315);
    expect(loaded!.sigRes).toBe("S");
    expect(loaded!.optimal).toBe(600);
    expect(loaded!.falloff).toBe(3000);
  });

  test("basis re-import on load overwrites stale parameter cache", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => ({ mass: 1_500_000, inertiaModifier: 2, maxSpeed: 4_649.72, sigRadius: 210 }));
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);

    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const stale: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerFittedHull: FITTED_HULL_SUMMARY,
      attackerMass: 9_999_999,
      attackerSpeed: 111,
      tracking: 0.01,
      sigRes: "M",
      optimal: 10,
      falloff: 10,
    };
    store.save(stale);
    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerMass).toBe(1_500_000);
    expect(loaded!.attackerSpeed).toBe(4_649.72);
    expect(loaded!.tracking).toBe(0.315);
    expect(loaded!.sigRes).toBe("S");
    expect(loaded!.optimal).toBe(600);
    expect(loaded!.falloff).toBe(3000);
    expect(loaded!.attackerFittedHull!.propulsionId).toBe("mwd-5mn");
  });

  test("re-import on load recomputes speed using the overridden mass", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => ({ mass: 1_500_000, inertiaModifier: 2, maxSpeed: 4_649.72, sigRadius: 210 }));
    ships.maxSpeedForFittedMass = vi.fn((_profile, _fitted, mass) => mass / 500);

    const storage = fakeStorage();
    const store = new LocalSettingsStore({ ships, fittingImport, storage, location: fakeLocation("http://localhost/") });
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerOverrides: { attackerMass: 2_000_000 },
    };
    store.save(settings);
    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerMass).toBe(2_000_000);
    expect(loaded!.attackerSpeed).toBe(4_000);
  });
});
