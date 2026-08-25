import type { ChargeCatalog, FittingImport, GunFamily, GunFamilies, ImportedFitting, ImportedTurret, PresetFittings } from "../../fitting";
import type { FittedHull, HullView, ShipProfile, Ships } from "../../ships";
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
    loadPreferences: vi.fn(() => ({ language: "en" as const, trackingUnit: "rad" as const, simSpeed: 4, gridBrightness: 0.2 })),
    savePreferences: vi.fn(),
  };
}

export function mockShips(): Ships {
  return {
    hulls: vi.fn(() => []),
    hullView: vi.fn((profile: ShipProfile, _language: Language): HullView => ({ name: profile.name, hullType: "Frigate", faction: "Unknown" })),
    findHull: vi.fn(() => undefined),
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

export function mockFittingImport(): FittingImport {
  return {
    importFitting: vi.fn(() => undefined),
    propulsionVariantNames: vi.fn(() => []),
    propulsionStats: vi.fn(() => undefined),
    summarize: vi.fn(() => undefined),
    canonicalEftText: vi.fn(() => undefined),
    itemName: vi.fn((name: string) => name),
    canonicalName: vi.fn((name: string) => name),
  };
}

export function mockChargeCatalog(): ChargeCatalog {
  return {
    usualForChargeSize: vi.fn(() => "Hail S"),
    usualForTurret: vi.fn(() => "Hail S"),
    chargesForSize: vi.fn(() => []),
    chargesForTurret: vi.fn(() => []),
    withCharge: vi.fn((turret) => turret),
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

const MOCK_REPRESENTATIVES: Record<GunFamily, Record<SigResolutionClass, string>> = {
  autocannon: { S: "200mm AutoCannon I", M: "425mm AutoCannon I", L: "800mm Repeating Cannon I", XL: "Quad 800mm Repeating Cannon I" },
  artillery: { S: "280mm Howitzer Artillery I", M: "720mm Howitzer Artillery I", L: "1400mm Howitzer Artillery I", XL: "Quad 3500mm Siege Artillery I" },
  pulseLaser: { S: "Gatling Pulse Laser I", M: "Heavy Pulse Laser I", L: "Mega Pulse Laser I", XL: "Dual Giga Pulse Laser I" },
  beamLaser: { S: "Small Focused Beam Laser I", M: "Heavy Beam Laser I", L: "Tachyon Beam Laser I", XL: "Dual Giga Beam Laser I" },
  blaster: { S: "Light Neutron Blaster I", M: "Heavy Neutron Blaster I", L: "Neutron Blaster Cannon I", XL: "Ion Siege Blaster I" },
  railgun: { S: "150mm Railgun I", M: "250mm Railgun I", L: "425mm Railgun I", XL: "Dual 1000mm Railgun I" },
};

export function mockGunFamilies(): GunFamilies {
  return {
    familyOf: vi.fn((moduleName: string) => (moduleName.includes("Howitzer") || moduleName.includes("Artillery") ? "artillery" : "autocannon")),
    representativeOf: vi.fn((family: GunFamily, sigRes: SigResolutionClass) => MOCK_REPRESENTATIVES[family][sigRes]),
  };
}

export const RIFTER: ShipProfile = {
  name: "Rifter",
  faction: "Minmatar Republic",
  hullType: "Standard Frigates",
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
  charge: "Hail S",
  base: { tracking: 0.42, optimal: 1200, falloff: 3000 },
  moduleName: "200mm AutoCannon I",
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
export const IMPORTED_RIFTER_WITH_CARGO: ImportedFitting = { ...IMPORTED_RIFTER, cargoCharges: [{ name: "Republic Fleet EMP S", quantity: 2000 }] };

export const CHARGE_OPTIONS = [
  { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
  { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
] as const;
