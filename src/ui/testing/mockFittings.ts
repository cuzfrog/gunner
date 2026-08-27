import type { ChargeCatalog, FittingImport, GunFamily, GunFamilies, ImportedFitting, ImportedTurret, PresetFittings, TurretCatalog } from "../../fitting";
import type { FittedHull, HullView, ShipProfile, Ships } from "../../ships";
import { toTypeId, type FactionId, type HullTypeId, type ShipId, type TypeId } from "../../gamedata/ids";
import type { HitChance, SigResolutionClass } from "../../sim";
import type { Language } from "../i18n";
import type { ClipboardProvider, SavedFittings, SettingsStore } from "../../appstate";
import type { Timer } from "../timer";

export function mockSettingsStore(): SettingsStore {
  return {
    loadStartupState: vi.fn(() => ({ settings: null, selectedProfileName: null })),
    listProfiles: vi.fn(() => []),
    saveProfile: vi.fn(),
    loadProfile: vi.fn(() => null),
    deleteProfile: vi.fn(),
    selectProfile: vi.fn(),
    clearSelectedProfile: vi.fn(),
    encodeUrl: vi.fn(() => ""),
    loadPreferences: vi.fn(() => ({ language: "en" as const, shipATrackingUnit: "rad" as const, shipBTrackingUnit: "rad" as const, weaponRangeVisibility: "both" as const, simSpeed: 4, gridBrightness: 0.2 })),
    savePreferences: vi.fn(),
  };
}

export function mockShips(): Ships {
  return {
    hulls: vi.fn(() => []),
    hullView: vi.fn((profile: ShipProfile, _language: Language): HullView => ({ name: profile.name, hullType: "Frigate", faction: "Unknown" })),
    findHull: vi.fn(() => undefined),
    findHullById: vi.fn(() => undefined),
    findHullByName: vi.fn(() => undefined),
    parsePropulsionId: vi.fn(() => undefined),
    fittingOptions: vi.fn(() => []),
    allFittingOptions: vi.fn(() => []),
    fittingOption: vi.fn(() => undefined),
    turretSizeOptions: vi.fn(() => [] as const),
    fittedStats: vi.fn(() => ({ mass: 0, inertiaModifier: 0, sigRadius: 0, maxSpeed: 0, baseMaxSpeed: 0, alignTime: 0 })),
    maxSpeedForFittedMass: vi.fn(() => 0),
    alignTime: vi.fn(() => 0),
  };
}

const NAME_FOR_ID: Record<string, string> = {
  "12608": "Hail S",
  "21898": "Republic Fleet EMP S",
};

export function mockFittingImport(): FittingImport {
  return {
    importFitting: vi.fn(() => undefined),
    propulsionVariantNames: vi.fn(() => []),
    propulsionStats: vi.fn(() => undefined),
    propulsionStatsById: vi.fn(() => undefined),
    summarize: vi.fn(() => undefined),
    canonicalEftText: vi.fn(() => undefined),
    itemNameForId: vi.fn((id: TypeId, _language: string) => NAME_FOR_ID[id] ?? id),
  };
}

const HAIL: TypeId = "12608" as TypeId;

export function mockTurretCatalog(): TurretCatalog {
  return { resize: vi.fn(() => undefined) };
}

export function mockChargeCatalog(): ChargeCatalog {
  return {
    usualForChargeSize: vi.fn(() => HAIL),
    usualForTurret: vi.fn(() => HAIL),
    chargesForSize: vi.fn(() => CHARGE_OPTIONS),
    chargesForTurret: vi.fn(() => CHARGE_OPTIONS),
    withCharge: vi.fn((turret, chargeId) => ({ ...turret, chargeId })),
    idForName: vi.fn((name: string) => CHARGE_OPTIONS.find((c) => c.name === name)?.id),
    has: vi.fn((id: TypeId) => CHARGE_OPTIONS.some((c) => c.id === id)),
    equivalentInSize: vi.fn(() => undefined),
  };
}

export function mockPresetFittings(): PresetFittings {
  return { listHulls: vi.fn(() => []), fittingsFor: vi.fn(() => []), eftText: vi.fn(() => "") };
}

export function mockSavedFittings(): SavedFittings {
  return { listForHull: vi.fn(() => []), mostRecentFor: vi.fn(() => undefined), record: vi.fn(() => undefined), remove: vi.fn() };
}

export function mockClipboard(): ClipboardProvider {
  return { readText: vi.fn(() => Promise.resolve("")), writeText: vi.fn(() => Promise.resolve()) };
}

export function mockTimer(): Timer {
  return { setTimeout: vi.fn(() => 0), clearTimeout: vi.fn(), setInterval: vi.fn(() => 0), clearInterval: vi.fn() };
}

export function mockHitChance(): HitChance {
  return { compute: vi.fn(() => ({ chance: 0, trackingTerm: 0, rangeTerm: 0 })), findBestDistance: vi.fn(() => 5000) };
}

const MOCK_REPRESENTATIVES: Record<GunFamily, Record<SigResolutionClass, TypeId>> = {
  autocannon: { S: toTypeId("486"), M: toTypeId("491"), L: toTypeId("496"), XL: toTypeId("37289") },
  artillery: { S: toTypeId("488"), M: toTypeId("493"), L: toTypeId("498"), XL: toTypeId("20454") },
  pulseLaser: { S: toTypeId("450"), M: toTypeId("458"), L: toTypeId("462"), XL: toTypeId("20444") },
  beamLaser: { S: toTypeId("454"), M: toTypeId("459"), L: toTypeId("464"), XL: toTypeId("20446") },
  blaster: { S: toTypeId("564"), M: toTypeId("568"), L: toTypeId("573"), XL: toTypeId("20450") },
  railgun: { S: toTypeId("565"), M: toTypeId("570"), L: toTypeId("574"), XL: toTypeId("20448") },
};

export function mockGunFamilies(): GunFamilies {
  return {
    familyOf: vi.fn((moduleId: TypeId) => (String(moduleId).includes("Howitzer") || String(moduleId).includes("Artillery") ? "artillery" : "autocannon")),
    representativeOf: vi.fn((family: GunFamily, sigRes: SigResolutionClass) => MOCK_REPRESENTATIVES[family][sigRes]),
  };
}

export const RIFTER: ShipProfile = {
  id: "587" as ShipId,
  name: "Rifter",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "25" as HullTypeId,
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 365,
  sigRadius: 36,
};

export const FITTED: FittedHull = { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 };

export const TURRET: ImportedTurret = {
  tracking: 0.315,
  sigResolutionClass: "S",
  optimal: 600,
  falloff: 3000,
  chargeSize: 1,
  chargeId: "12608" as TypeId,
  base: { tracking: 0.42, optimal: 1200, falloff: 3000 },
  moduleId: "486" as TypeId,
};

export const IMPORTED_RIFTER: ImportedFitting = {
  profile: RIFTER,
  fittingName: "Brawler",
  fitted: FITTED,
  propulsion: undefined,
  turret: TURRET,
  cargoCharges: [],
  ewar: { webs: [], grapplers: [], disruptors: [], scramblers: [], scripts: [] },
  boosts: { computers: [], scripts: [] },
};
export const IMPORTED_RIFTER_WITH_CARGO: ImportedFitting = { ...IMPORTED_RIFTER, cargoCharges: [{ id: "21898" as TypeId, quantity: 2000 }] };

export const CHARGE_OPTIONS = [
  { id: "12608" as TypeId, name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
  { id: "21898" as TypeId, name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
] as const;
