import { isAutopilotMode, isSigResolutionClass } from "../sim";
import type { FittedHull, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, ShipStats, Ships } from "../ships";
import type { FactionId, HullTypeId, ShipId, TypeId } from "../gamedata/ids";
import type { ChargeCatalog, FittingImport, ImportedFitting } from "../fitting";
import { LocalSettingsStore } from "./localSettingsStore";
import { SettingsParser } from "./settingsParser";
import type { ProfileEquality } from "./profileEquality";
import type { SettingGuards } from "./settingGuards";
import {
  USER_SETTINGS_VERSION,
  type DisplayPreferences,
  type FittedHullSummary,
  type ProfileSettings,
  type UserSettings,
} from "./userSettings";
export type { UserSettings, DisplayPreferences, ProfileSettings } from "./userSettings";
import type { ClipboardProvider, LocationProvider, StorageProvider } from "./providers";
import { DEFAULT_PREFERENCES } from "./defaultPreferences";
export { DEFAULT_PREFERENCES } from "./defaultPreferences";
export function base64Url(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
export function urlFor(value: unknown): string { return `http://localhost/?c=${base64Url(value)}`; }
export const DEFAULT_SETTINGS: UserSettings = {
  version: USER_SETTINGS_VERSION,
  trackingUnit: "rad",
  shipATracking: 0.32,
  shipASigRes: "S",
  shipAOptimal: 5000,
  shipAFalloff: 5000,
  shipBTracking: 0.32,
  shipBSigRes: "S",
  shipBOptimal: 5000,
  shipBFalloff: 5000,
  shipASpeed: 0,
  shipAMode: "keepAtRange",
  shipARange: 5000,
  shipAAggressivity: 1,
  shipBAggressivity: 1,
  gridBrightness: 0.5,
  autoZoom: true,
  zoomFactor: 1,
  shipAMass: 1_200_000,
  shipAInertia: 3,
  shipASkillLevel: 5,
  shipAOverload: true,
  initialDistance: 20000,
  shipBSpeed: 1000,
  shipBMode: "orbit",
  shipBRange: 5000,
  shipBMass: 10_000_000,
  shipBInertia: 0.45,
  shipBSkillLevel: 5,
  shipBOverload: true,
  shipBSig: 40,
  shipAEwarActivation: { webs: [{ active: true, overloaded: true }], grapplers: [], disruptors: [{ active: true, overloaded: true, script: "none" }], scramblers: [] },
  shipBEwarActivation: { webs: [{ active: false, overloaded: true }], grapplers: [], disruptors: [{ active: true, overloaded: true, script: "Optimal Range Disruption Script" }], scramblers: [] },
  shipAAmmo: "12608" as TypeId,
  shipBAmmo: "12608" as TypeId,
  simSpeed: 4,
  language: "en",
};
export const URL_SETTINGS: UserSettings = {
  ...DEFAULT_SETTINGS,
  shipATracking: 0.18,
  shipASigRes: "M",
  shipAOptimal: 3000,
  shipAFalloff: 2000,
  shipBTracking: 0.25,
  shipBSigRes: "S",
  shipBOptimal: 4000,
  shipBFalloff: 3500,
  shipASpeed: 500,
  shipAMode: "orbit",
  shipARange: 3000,
  shipAAggressivity: 1,
  shipBAggressivity: 1,
  initialDistance: 3000,
  shipBSpeed: 800,
  shipBMode: "keepAtRange",
  shipBRange: 3000,
  shipBSig: 125,
  simSpeed: 2,
  language: "ja",
};
export function profileFrom(settings: UserSettings): ProfileSettings {
  const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, autoZoom: _____, zoomFactor: ______, ...rest } = settings;
  return rest;
}
export const DEFAULT_PROFILE: ProfileSettings = profileFrom(DEFAULT_SETTINGS);
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
  propulsionModuleId: "439" as TypeId,
  propulsionName: "1MN Afterburner I",
  propulsionKind: "afterburner",
  fitted: FITTED_HULL,
  propulsion: FITTED_PROPULSION,
  baseMaxSpeed: 456.25,
};
export const RIFTER_PROFILE: ShipProfile = {
  id: "587" as ShipId,
  name: "Rifter",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "25" as HullTypeId,
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 300,
  sigRadius: 36,
};

const THRASHER_PROFILE: ShipProfile = {
  id: "16242" as ShipId,
  name: "Thrasher",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "420" as HullTypeId,
  mass: 1_600_000,
  inertiaModifier: 3,
  baseSpeed: 250,
  sigRadius: 120,
};

const BRUTIX_PROFILE: ShipProfile = {
  id: "672" as ShipId,
  name: "Brutix",
  factionId: "gallente-federation" as FactionId,
  hullTypeId: "120" as HullTypeId,
  mass: 9_500_000,
  inertiaModifier: 0.55,
  baseSpeed: 165,
  sigRadius: 300,
};

const WRAITH_PROFILE: ShipProfile = {
  id: "legacy-wraith" as ShipId,
  name: "Wraith",
  factionId: "gallente-federation" as FactionId,
  hullTypeId: "120" as HullTypeId,
  mass: 1_000_000,
  inertiaModifier: 2,
  baseSpeed: 300,
  sigRadius: 36,
};

const KNOWN_HULLS: readonly ShipProfile[] = [RIFTER_PROFILE, THRASHER_PROFILE, BRUTIX_PROFILE, WRAITH_PROFILE];

const HULL_BY_ID = new Map<ShipId, ShipProfile>(KNOWN_HULLS.map((p) => [p.id, p]));

const HULL_BY_NAME = new Map<string, ShipProfile>();
for (const profile of KNOWN_HULLS) HULL_BY_NAME.set(profile.name.toLowerCase(), profile);
HULL_BY_NAME.set("裂谷级", RIFTER_PROFILE);
HULL_BY_NAME.set("リフター", RIFTER_PROFILE);
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
export const RIFTER_PROPULSION: PropulsionStats & { readonly propulsionId: PropulsionId; readonly propulsionModuleId: TypeId } = { ...RIFTER_MODULE, propulsionId: "mwd-5mn", propulsionModuleId: "434" as TypeId };
export const COMPACT_MWD: PropulsionStats = { thrust: 1_500_000, speedBonus: 5.05, massAddition: 500_000, sigBloom: 5 };
export const RIFTER_BASE_STATS: ShipStats = {
  mass: 1_000_000,
  inertiaModifier: 2,
  maxSpeed: 456.25,
  baseMaxSpeed: 456.25,
  sigRadius: 36,
  alignTime: Math.log(4) * 2,
};
export const RIFTER_MWD_STATS: ShipStats = {
  mass: 1_500_000,
  inertiaModifier: 2,
  maxSpeed: 4_649.72,
  baseMaxSpeed: 456.25,
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
    chargeId: "12608" as TypeId,
    base: { tracking: 0.42, optimal: 1200, falloff: 3000 },
    moduleId: "486" as TypeId,
  },
  cargoCharges: [],
  ewar: { webs: [], grapplers: [], disruptors: [], scramblers: [], scripts: [] },
  boosts: { computers: [], scripts: [] },
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
const simGuards: SettingGuards = { isAutopilotMode, isSigResolutionClass };
export let ships: Ships;
export let fittingImport: FittingImport;
export let chargeCatalog: ChargeCatalog;
const NAME_FOR_ID: Record<string, string> = {
  "12608": "Hail S",
  "21898": "Republic Fleet EMP S",
  "5973": "5MN Y-T8 Compact Microwarpdrive",
  "439": "1MN Afterburner I",
};

export function makeFittingImport() {
  return vi.mocked<FittingImport>({
    importFitting: vi.fn(() => undefined),
    propulsionVariantNames: vi.fn(() => []),
    propulsionStats: vi.fn(() => undefined),
    propulsionStatsById: vi.fn(() => undefined),
    summarize: vi.fn(() => undefined),
    canonicalEftText: vi.fn(() => undefined),
    itemNameForId: vi.fn((id) => NAME_FOR_ID[id] ?? id),
  });
}
export function makeChargeCatalog(): ChargeCatalog {
  const hail: TypeId = "12608" as TypeId;
  const republic: TypeId = "21898" as TypeId;
  const catalog = vi.mocked<ChargeCatalog>({
    usualForChargeSize: vi.fn(() => hail),
    usualForTurret: vi.fn(() => hail),
    chargesForSize: vi.fn(() => []),
    chargesForTurret: vi.fn(() => []),
    withCharge: vi.fn((turret, charge) => ({ ...turret, chargeId: charge })),
    idForName: vi.fn((name: string) => (name === "Hail S" ? hail : name === "Republic Fleet EMP S" ? republic : undefined)),
    has: vi.fn((id: TypeId) => id === hail || id === republic),
  });
  catalog.chargesForTurret = vi.fn((turret) => catalog.chargesForSize(turret.chargeSize));
  return catalog;
}
export function makeShips() {
  return vi.mocked<Ships>({
    hulls: vi.fn(),
    hullView: vi.fn(),
    findHull: vi.fn((name: string) => HULL_BY_NAME.get(name.trim().toLowerCase())),
    findHullById: vi.fn((id: ShipId) => HULL_BY_ID.get(id)),
    findHullByName: vi.fn(),
    parsePropulsionId: vi.fn((value: unknown) => {
      if (typeof value !== "string") return undefined;
      return VALID_PROPULSION_IDS.includes(value) ? (value as PropulsionId) : undefined;
    }),
    fittingOptions: vi.fn(),
    allFittingOptions: vi.fn(() => []),
    fittingOption: vi.fn(),
    turretSizeOptions: vi.fn(),
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
  return new SettingsParser({ ships, fittingImport, chargeCatalog, settingGuards: simGuards });
}

export function fakeEquality(equal = true): ProfileEquality {
  return { equal() { return equal; } };
}

export function makeStore(options: {
  storage?: StorageProvider;
  location?: LocationProvider;
  parser?: SettingsParser;
  equality?: ProfileEquality;
  navigatorLanguage?: string;
} = {}): LocalSettingsStore {
  return new LocalSettingsStore({
    parser: options.parser ?? makeParser(),
    storage: options.storage ?? fakeStorage(),
    location: options.location ?? fakeLocation("http://localhost/"),
    profileEquality: options.equality ?? fakeEquality(true),
    navigatorLanguage: options.navigatorLanguage,
  });
}
