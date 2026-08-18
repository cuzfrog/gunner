import type { ClipboardProvider, LocationProvider, StorageProvider } from "./settings";
import { LocalSettingsStore, USER_SETTINGS_VERSION, type UserSettings } from "./settings";

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
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit",
  targetRange: 5000,
  targetSig: 40,
  simSpeed: 4,
  language: "en",
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
    writeText: async (text) => {
      lastText = text;
    },
  };
}

describe("LocalSettingsStore", () => {
  test("load returns null when storage and url are empty", () => {
    const store = new LocalSettingsStore({ storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("save and load round-trips settings", () => {
    const storage = fakeStorage();
    const store = new LocalSettingsStore({ storage, location: fakeLocation("http://localhost/") });
    store.save(DEFAULT_SETTINGS);
    const loaded = store.load();
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  test("load decodes settings from the URL and ignores local storage", () => {
    const storage = fakeStorage();
    const location = fakeLocation("http://localhost/?c=eyJ2ZXJzaW9uIjoyLCJ0cmFja2luZyI6MC4xOCwidHJhY2tpbmdVbml0IjoicmFkIiwic2lnUmVzIjoiTSIsIm9wdGltYWwiOjMwMDAsImZhbGxvZmYiOjIwMDAsImF0dGFja2VyU3BlZWQiOjUwMCwiYXR0YWNrZXJNb2RlIjoib3JiaXQiLCJhdHRhY2tlclJhbmdlIjozMDAwLCJpbml0aWFsRGlzdGFuY2UiOjMwMDAsInRhcmdldFNwZWVkIjo4MDAsInRhcmdldE1vZGUiOiJtYXRjaCIsInRhcmdldFJhbmdlIjozMDAwLCJ0YXJnZXRTaWciOjEyNSwic2ltU3BlZWQiOjIsImxhbmd1YWdlIjoiamEifQ");
    const store = new LocalSettingsStore({ storage, location });
    storage.setItem("gunner-settings-v2", JSON.stringify(DEFAULT_SETTINGS));
    const loaded = store.load();
    expect(loaded).toEqual({
      version: 2,
      tracking: 0.18,
      trackingUnit: "rad",
      sigRes: "M",
      optimal: 3000,
      falloff: 2000,
      attackerSpeed: 500,
      attackerMode: "orbit",
      attackerRange: 3000,
      initialDistance: 3000,
      targetSpeed: 800,
      targetMode: "match",
      targetRange: 3000,
      targetSig: 125,
      simSpeed: 2,
      language: "ja",
    });
  });

  test("saveProfile and loadProfile round-trip", () => {
    const store = new LocalSettingsStore({ storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("brawler", DEFAULT_SETTINGS);
    expect(store.listProfiles()).toEqual(["brawler"]);
    expect(store.loadProfile("brawler")).toEqual(DEFAULT_SETTINGS);
  });

  test("deleteProfile removes the profile", () => {
    const store = new LocalSettingsStore({ storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    store.saveProfile("a", DEFAULT_SETTINGS);
    store.saveProfile("b", DEFAULT_SETTINGS);
    store.deleteProfile("a");
    expect(store.listProfiles()).toEqual(["b"]);
    expect(store.loadProfile("a")).toBeNull();
  });

  test("encodeUrl and decodeUrl round-trip", () => {
    const location = fakeLocation("http://localhost/index.html");
    const store = new LocalSettingsStore({ storage: fakeStorage(), location });
    const url = store.encodeUrl(DEFAULT_SETTINGS);
    const decodedStore = new LocalSettingsStore({ storage: fakeStorage(), location: fakeLocation(url) });
    const decoded = decodedStore.decodeUrl();
    expect(decoded).toEqual(DEFAULT_SETTINGS);
  });

  test("writeUrlToClipboard writes a full URL", async () => {
    const location = fakeLocation("http://localhost/index.html");
    const clipboard = fakeClipboard();
    const store = new LocalSettingsStore({ storage: fakeStorage(), location });
    const ok = await store.writeUrlToClipboard(DEFAULT_SETTINGS, clipboard);
    expect(ok).toBe(true);
  });

  test("writeUrlToClipboard returns false without a clipboard", async () => {
    const store = new LocalSettingsStore({ storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const ok = await store.writeUrlToClipboard(DEFAULT_SETTINGS);
    expect(ok).toBe(false);
  });

  test("decodeUrl rejects invalid settings and does not replace the URL", () => {
    const location = fakeLocation("http://localhost/?c=INVALID");
    const store = new LocalSettingsStore({ storage: fakeStorage(), location });
    expect(store.decodeUrl()).toBeNull();
    expect(location.href).toBe("http://localhost/?c=INVALID");
  });

  test("decodeUrl strips the c parameter without navigating", () => {
    const store = new LocalSettingsStore({ storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const url = store.encodeUrl(DEFAULT_SETTINGS);
    const decodedLocation = fakeLocation(url);
    const decodedStore = new LocalSettingsStore({ storage: fakeStorage(), location: decodedLocation });
    const decoded = decodedStore.decodeUrl();
    expect(decoded).toEqual(DEFAULT_SETTINGS);
    const cleaned = new URL(url);
    cleaned.searchParams.delete("c");
    expect(decodedLocation.href).toBe(cleaned.toString());
  });

  test("decodeUrl rejects settings with a non-positive initialDistance", () => {
    const bad = { ...DEFAULT_SETTINGS, initialDistance: 0 };
    const store = new LocalSettingsStore({ storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const url = store.encodeUrl(bad);
    const decoded = new LocalSettingsStore({ storage: fakeStorage(), location: fakeLocation(url) }).decodeUrl();
    expect(decoded).toBeNull();
  });

  test("load ignores stored settings with invalid values", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v2", JSON.stringify({ ...DEFAULT_SETTINGS, targetSig: -1 }));
    const store = new LocalSettingsStore({ storage, location: fakeLocation("http://localhost/") });
    expect(store.load()).toBeNull();
  });

  test("load falls back to local storage when the URL is invalid", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-settings-v2", JSON.stringify(DEFAULT_SETTINGS));
    const location = fakeLocation("http://localhost/?c=INVALID");
    const store = new LocalSettingsStore({ storage, location });
    expect(store.load()).toEqual(DEFAULT_SETTINGS);
    expect(location.href).toBe("http://localhost/?c=INVALID");
  });

  test("decodeUrl returns null for a malformed c parameter", () => {
    const location = fakeLocation("http://localhost/?c=%25");
    const store = new LocalSettingsStore({ storage: fakeStorage(), location });
    expect(store.decodeUrl()).toBeNull();
    expect(location.href).toBe("http://localhost/?c=%25");
  });
});
