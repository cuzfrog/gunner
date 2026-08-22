import type { FittedHull, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, ShipStats, Ships } from "../../ships";
import type { ChargeCatalog, FittingImport, ImportedFitting } from "../../fitting";
import { LocalSettingsStore } from "./localSettingsStore";
import { SettingsParser } from "./settingsParser";
import {
  USER_SETTINGS_VERSION,
  type DisplayPreferences,
  type FittedHullSummary,
  type ProfileSettings,
  type UserSettings,
} from "./userSettings";
export type { UserSettings, DisplayPreferences, ProfileSettings } from "./userSettings";
import type { ClipboardProvider, LocationProvider, StorageProvider } from "./providers";
export function base64Url(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
export function urlFor(value: unknown): string { return `http://localhost/?c=${base64Url(value)}`; }
export const DEFAULT_SETTINGS: UserSettings = {
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
  attackerAmmo: "Hail S",
  simSpeed: 4,
  language: "en",
};
export const URL_SETTINGS: UserSettings = {
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
export function profileFrom(settings: UserSettings): ProfileSettings {
  const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, ...rest } = settings;
  return rest;
}
export const DEFAULT_PROFILE: ProfileSettings = profileFrom(DEFAULT_SETTINGS);
export const DEFAULT_PREFERENCES: DisplayPreferences = { language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2 };
export const FITTED_HULL: FittedHull = { mass: 1_500_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 };
export const FITTED_PROPULSION = {
  thrust: 1_500_000,
  speedBonus: 1.15,
  massAddition: 500_000,
  sigBloom: 0,
};
export const FITTED_HULL_SUMMARY: FittedHullSummary = {
  fittingName: "Brawler",
  propulsionId: "ab-1mn",
  propulsionName: "1MN Afterburner I",
  fitted: FITTED_HULL,
  propulsion: FITTED_PROPULSION,
};
export const RIFTER_PROFILE: ShipProfile = {
  name: "Rifter",
  faction: "Minmatar",
  hullType: "Frigate",
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 300,
  sigRadius: 36,
};
export const RIFTER_FITTED: FittedHull = { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 };
export const RIFTER_MODULE: PropulsionModule = {
  id: "mwd-5mn",
  kind: "microwarpdrive",
  sizeTier: "small",
  label: "5MN Microwarpdrive",
  thrust: 1_500_000,
  speedBonus: 5,
  massAddition: 500_000,
  sigBloom: 5,
};
export const RIFTER_PROPULSION: PropulsionStats & { readonly propulsionId: PropulsionId } = { ...RIFTER_MODULE, propulsionId: "mwd-5mn" };
export const COMPACT_MWD: PropulsionStats = { thrust: 1_500_000, speedBonus: 5.05, massAddition: 500_000, sigBloom: 5 };
export const RIFTER_BASE_STATS: ShipStats = {
  mass: 1_000_000,
  inertiaModifier: 2,
  maxSpeed: 456.25,
  sigRadius: 36,
  alignTime: Math.log(4) * 2,
};
export const RIFTER_MWD_STATS: ShipStats = {
  mass: 1_500_000,
  inertiaModifier: 2,
  maxSpeed: 4_649.72,
  sigRadius: 210,
  alignTime: Math.log(4) * 3,
};
export const IMPORTED_RIFTER: ImportedFitting = {
  profile: RIFTER_PROFILE,
  fittingName: "Brawler",
  fitted: RIFTER_FITTED,
  propulsion: RIFTER_PROPULSION,
  turret: {
    tracking: 0.315,
    sigResolutionClass: "S",
    optimal: 600,
    falloff: 3000,
    chargeSize: 1,
    charge: "Hail S",
    base: { tracking: 0.42, optimal: 1200, falloff: 3000 },
    moduleName: "200mm AutoCannon I",
  },
  cargoCharges: [],
};
export function fakeStorage(): StorageProvider {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}
export function fakeLocation(href: string): LocationProvider { return { get href() { return href; } }; }
export function fakeClipboard(): ClipboardProvider {
  let lastText = "";
  return { readText: async () => lastText, writeText: async (text) => { lastText = text; } };
}
const VALID_PROPULSION_IDS: readonly string[] = ["ab-1mn", "ab-10mn", "ab-100mn", "ab-10000mn", "mwd-5mn", "mwd-50mn", "mwd-500mn", "mwd-50000mn"];
export let ships: Ships;
export let fittingImport: FittingImport;
export let chargeCatalog: ChargeCatalog;
export function makeFittingImport() {
  return vi.mocked<FittingImport>({
    importFitting: vi.fn(() => undefined),
    propulsionVariantNames: vi.fn(() => []),
    propulsionStats: vi.fn(() => undefined),
    summarize: vi.fn(() => undefined),
  });
}
export function makeChargeCatalog(): ChargeCatalog {
  const catalog = vi.mocked<ChargeCatalog>({
    usualForChargeSize: vi.fn(() => "Hail S"),
    chargesForSize: vi.fn(() => []),
    chargesForTurret: vi.fn(() => []),
    withCharge: vi.fn((turret) => turret),
  });
  catalog.chargesForTurret = vi.fn((turret) => catalog.chargesForSize(turret.chargeSize));
  return catalog;
}
export function makeShips() {
  return vi.mocked<Ships>({
    hulls: vi.fn(),
    hullView: vi.fn(),
    findHull: vi.fn(),
    parsePropulsionId: vi.fn((value: unknown) => {
      if (typeof value !== "string") return undefined;
      return VALID_PROPULSION_IDS.includes(value) ? (value as PropulsionId) : undefined;
    }),
    fittingOptions: vi.fn(),
    allFittingOptions: vi.fn(() => []),
    fittingOption: vi.fn(),
    fittedStats: vi.fn(),
    maxSpeedForFittedMass: vi.fn(),
    alignTime: vi.fn(),
  });
}
export function resetMocks(): void {
  ships = makeShips();
  fittingImport = makeFittingImport();
  chargeCatalog = makeChargeCatalog();
}
export function makeParser(): SettingsParser {
  return new SettingsParser({ ships, fittingImport, chargeCatalog });
}
