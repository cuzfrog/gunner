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
describe("LocalSettingsStore group 6", () => {
  test("loadStartupState round-trips v6 fitting basis with per-side overrides", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerOverrides: { attackerMass: 2_000_000 },
    };
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerFitting).toBe(settings.attackerFitting);
    expect(loaded!.attackerOverrides).toEqual({ attackerMass: 2_000_000 });
    expect(loaded!.attackerFittedHull).toEqual({
      fittingName: "Brawler",
      propulsionId: "mwd-5mn",
      propulsionName: RIFTER_MODULE.label,
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

  test("loadStartupState preserves an exact propulsion variant from the fitted hull summary", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    fittingImport.propulsionStats = vi.fn((name: string) => (name === "5MN Y-T8 Compact Microwarpdrive" ? COMPACT_MWD : undefined));
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_650);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerFittedHull: {
        ...FITTED_HULL_SUMMARY,
        propulsionId: "mwd-5mn",
        propulsionName: "5MN Y-T8 Compact Microwarpdrive",
        propulsion: COMPACT_MWD,
      },
    };
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerFittedHull?.propulsionName).toBe("5MN Y-T8 Compact Microwarpdrive");
    expect(loaded!.attackerFittedHull?.propulsion).toEqual(COMPACT_MWD);
    expect(loaded!.attackerSpeed).toBe(4_650);
  });

  test("basis re-import on load overwrites stale parameter cache", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);

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
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(stale)) });
    const loaded = store.loadStartupState().settings;
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
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn((_profile, _fitted, mass) => mass / 500);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerOverrides: { attackerMass: 2_000_000 },
    };
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerMass).toBe(2_000_000);
    expect(loaded!.attackerSpeed).toBe(4_000);
  });

  test("loadStartupState normalizes a v6 payload missing attackerAmmo", () => {
    const missingAmmo: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    delete missingAmmo.attackerAmmo;
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(missingAmmo)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerAmmo).toBe("Hail S");
  });

  test("loadProfile normalizes a profile missing attackerAmmo", () => {
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation("http://localhost/") });
    const { attackerAmmo: _, ...missingAmmo } = DEFAULT_PROFILE;
    store.saveProfile("brawler", missingAmmo as ProfileSettings);
    const loaded = store.loadProfile("brawler");
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerAmmo).toBe("Hail S");
  });

  test("basis re-import applies a stored charge that matches the turret size", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);
    chargeCatalog.chargesForSize = vi.fn(() => [
      { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
      { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
    ]);
    chargeCatalog.withCharge = vi.fn((turret, charge) => ({ ...turret, charge, tracking: turret.base.tracking, optimal: turret.base.optimal, falloff: turret.base.falloff }));

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerAmmo: "Republic Fleet EMP S",
    };
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerAmmo).toBe("Republic Fleet EMP S");
    expect(loaded!.tracking).toBe(0.42);
    expect(loaded!.optimal).toBe(1200);
    expect(loaded!.falloff).toBe(3000);
  });

  test("basis re-import falls back to the imported charge when the stored charge is invalid", () => {
    fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
    ships.fittingOption = vi.fn(() => RIFTER_MODULE);
    ships.fittedStats = vi.fn(() => RIFTER_MWD_STATS);
    ships.maxSpeedForFittedMass = vi.fn(() => 4_649.72);
    chargeCatalog.chargesForSize = vi.fn(() => [{ name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 }]);
    chargeCatalog.withCharge = vi.fn((turret) => turret);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      attackerAmmo: "Mjolnir Rocket",
    };
    const store = new LocalSettingsStore({ chargeCatalog, ships, fittingImport, storage: fakeStorage(), location: fakeLocation(urlFor(settings)) });
    const loaded = store.loadStartupState().settings;
    expect(loaded).not.toBeNull();
    expect(loaded!.attackerAmmo).toBe("Hail S");
    expect(loaded!.optimal).toBe(600);
  });
});
