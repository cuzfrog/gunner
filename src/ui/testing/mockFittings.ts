import type { ChargeCatalog, DroneCatalog, FittingImport, GunFamily, GunFamilies, FittingState, ImportedFitting, ImportedLauncher, ImportedTurret, LauncherClass, LauncherClasses, MissileCatalog, PresetFittings } from "../../fitting";
import { EMPTY_DAMAGE_BREAKDOWN } from "../../fitting";
import type { FittingDb, LauncherStats, TurretStats } from "../../gamedata/fittingDb";
import type { FittedHull, HullView, ShipProfile, Ships } from "../../ships";
import { toTypeId, type FactionId, type HullTypeId, type ShipId, type TypeId } from "../../gamedata/ids";
import type { HitChance, SigResolutionClass } from "../../sim";
import { EMPTY_DEFENSE_SPEC, EMPTY_SENSOR_BOOST_LOADOUT, ZERO_DAMAGE } from "../../sim";
import type { Language } from "../i18n";
import type { ClipboardProvider, SavedFittings, SessionSettings, SettingsParser, SettingsStore } from "../../appstate";
import type { DisplayPreferences, ProfileSettings, UserSettings } from "../../appstate";
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
    loadPreferences: vi.fn(() => ({ language: "en" as const, shipATrackingUnit: "rad" as const, shipBTrackingUnit: "rad" as const, weaponRangeVisibility: "both" as const, droneRangeVisibility: "none" as const, droneControlRangeVisibility: "none" as const, simSpeed: 4, gridBrightness: 0.2 })),
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
    shipTier: vi.fn(() => undefined),
    fittedStats: vi.fn(() => ({ mass: 0, inertiaModifier: 0, sigRadius: 0, sigBloomFactor: 0, maxSpeed: 0, baseMaxSpeed: 0, alignTime: 0 })),
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
    detectLanguageFromText: vi.fn(() => undefined),
  };
}

const HAIL: TypeId = "12608" as TypeId;

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
  return { compute: vi.fn(() => ({ chance: 0, trackingTerm: 0, rangeTerm: 0, trackingPenalty: 1, rangePenalty: 1 })), findBestDistance: vi.fn(() => 5000) };
}

const MOCK_REPRESENTATIVES: Record<GunFamily, Record<SigResolutionClass, TypeId>> = {
  autocannon: { S: toTypeId("486"), M: toTypeId("491"), L: toTypeId("496"), XL: toTypeId("37289") },
  artillery: { S: toTypeId("488"), M: toTypeId("493"), L: toTypeId("498"), XL: toTypeId("20454") },
  pulseLaser: { S: toTypeId("450"), M: toTypeId("458"), L: toTypeId("462"), XL: toTypeId("20444") },
  beamLaser: { S: toTypeId("454"), M: toTypeId("459"), L: toTypeId("464"), XL: toTypeId("20446") },
  blaster: { S: toTypeId("564"), M: toTypeId("568"), L: toTypeId("573"), XL: toTypeId("20450") },
  railgun: { S: toTypeId("565"), M: toTypeId("570"), L: toTypeId("574"), XL: toTypeId("20448") },
  disintegrator: { S: toTypeId("47912"), M: toTypeId("47915"), L: toTypeId("47918"), XL: toTypeId("52998") },
};

export function mockGunFamilies(): GunFamilies {
  return {
    familyOf: vi.fn((moduleId: TypeId) => (String(moduleId).includes("Howitzer") || String(moduleId).includes("Artillery") ? "artillery" : "autocannon")),
    representativeOf: vi.fn((family: GunFamily, sigRes: SigResolutionClass) => MOCK_REPRESENTATIVES[family][sigRes]),
    variantsForFamily: vi.fn(() => [] as readonly TurretStats[]),
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
  scanResolution: 200,
  maxTargetingRange: 30000,
  maxLockedTargets: 4,
  droneBandwidth: 0,
  droneCapacity: 0,
  maxActiveDrones: 5,
  shieldHp: 0,
  shieldRechargeTime: 0,
  armorHp: 0,
  hullHp: 0,
  shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
};

export const FITTED: FittedHull = { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0, mwdSigBloomMultiplier: 1 };

export const TURRET: ImportedTurret = {
  tracking: 0.315,
  sigResolutionClass: "S",
  optimal: 600,
  falloff: 3000,
  chargeSize: 1,
  chargeId: "12608" as TypeId,
  base: { tracking: 0.42, optimal: 1200, falloff: 3000 },
  moduleId: "486" as TypeId,
  damageMultiplier: 3,
  damagePerShot: { em: 0, thermal: 0, kinetic: 12, explosive: 0 },
  cycleTime: 5,
  turretCount: 1,
  damageBreakdown: EMPTY_DAMAGE_BREAKDOWN,
};

const EMPTY_FITTING_STATE: FittingState = {
  profile: RIFTER,
  hullBonuses: [],
  supportModules: [],
  defenseModules: [],
  turretGroups: [],
  launcherGroups: [],
  propulsionModule: undefined,
  ewarModules: [],
  boosterModules: [], missileBoosterModules: [], droneBoosterModules: [], droneGroups: [],
  drones: [],
  cargo: [],
  sensorBoosterModules: [],
  sensorAmplifierModules: [],
};

const RIFTER_FITTING_STATE: FittingState = {
  ...EMPTY_FITTING_STATE,
  turretGroups: [{ moduleId: "486" as TypeId, chargeId: "12608" as TypeId, count: 1 }],
};

export const IMPORTED_RIFTER: ImportedFitting = {
  profile: RIFTER,
  fittingName: "Brawler",
  fitted: FITTED,
  fittingState: RIFTER_FITTING_STATE,
  propulsion: undefined,
  turret: TURRET,
  drones: [],
  cargoCharges: [],
  ewar: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
  boosts: { computers: [], scripts: [] }, missileBoosts: { computers: [], enhancers: [], scripts: [] },
  hullBonuses: [],
  defense: EMPTY_DEFENSE_SPEC,
  sensorSpec: { scanResolution: 200, maxTargetingRange: 30000, maxLockedTargets: 4 },
  sensorBoosts: EMPTY_SENSOR_BOOST_LOADOUT,
};
export const IMPORTED_RIFTER_WITH_CARGO: ImportedFitting = { ...IMPORTED_RIFTER, cargoCharges: [{ id: "21898" as TypeId, quantity: 2000 }] };

export const CHARGE_OPTIONS = [
  { id: "12608" as TypeId, name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75, damageByType: { explosive: 15 } as const },
  { id: "21898" as TypeId, name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1, damageByType: { em: 10, explosive: 5 } as const },
] as const;

export function mockParser(): SettingsParser {
  return {
    parseUserSettings: vi.fn(() => null),
    decodeUrlSettings: vi.fn(() => null),
    fromWire: vi.fn((wire: UserSettings): SessionSettings => ({ version: wire.version, display: { language: wire.language, shipATrackingUnit: wire.shipATrackingUnit, shipBTrackingUnit: wire.shipBTrackingUnit, weaponRangeVisibility: wire.weaponRangeVisibility, droneRangeVisibility: wire.droneRangeVisibility ?? "none", droneControlRangeVisibility: wire.droneControlRangeVisibility ?? "none", simSpeed: wire.simSpeed, gridBrightness: wire.gridBrightness ?? 0.5, autoZoom: wire.autoZoom ?? true, zoomFactor: wire.zoomFactor ?? 1 }, shipA: { speed: wire.shipASpeed, mode: wire.shipAMode, range: wire.shipARange, mass: wire.shipAMass, inertia: wire.shipAInertia, aggressivity: wire.shipAAggressivity ?? 1, skillLevel: wire.shipASkillLevel, overload: wire.shipAOverload ?? true, weaponOverload: wire.shipAWeaponOverload ?? false, damageEnabled: wire.shipADamageEnabled ?? true, hull: wire.shipAHullId, propulsion: wire.shipAPropulsion, fitting: wire.shipAFitting, overrides: wire.shipAOverrides ?? {}, fittedHull: wire.shipAFittedHull, ewarActivation: wire.shipAEwarActivation, boosterActivation: wire.shipABoosterActivation, missileBoosterActivation: wire.shipAMissileBoosterActivation, sensorBoosterActivation: wire.shipASensorBoosterActivation, repMode: wire.shipARepMode, repairerActivation: wire.shipARepairerActivation, rahActivation: wire.shipARahActivation, sig: wire.shipASig, tracking: wire.shipATracking ?? 0, sigRes: wire.shipASigRes ?? "S", optimal: wire.shipAOptimal ?? 0, falloff: wire.shipAFalloff ?? 0, ammo: wire.shipAAmmo, weaponKind: wire.shipAWeaponKind, missileAmmo: wire.shipAMissileAmmo }, shipB: { speed: wire.shipBSpeed, mode: wire.shipBMode, range: wire.shipBRange, mass: wire.shipBMass, inertia: wire.shipBInertia, aggressivity: wire.shipBAggressivity ?? 1, skillLevel: wire.shipBSkillLevel, overload: wire.shipBOverload ?? true, weaponOverload: wire.shipBWeaponOverload ?? false, damageEnabled: wire.shipBDamageEnabled ?? true, hull: wire.shipBHullId, propulsion: wire.shipBPropulsion, fitting: wire.shipBFitting, overrides: wire.shipBOverrides ?? {}, fittedHull: wire.shipBFittedHull, ewarActivation: wire.shipBEwarActivation, boosterActivation: wire.shipBBoosterActivation, missileBoosterActivation: wire.shipBMissileBoosterActivation, sensorBoosterActivation: wire.shipBSensorBoosterActivation, repMode: wire.shipBRepMode, repairerActivation: wire.shipBRepairerActivation, rahActivation: wire.shipBRahActivation, sig: wire.shipBSig, tracking: wire.shipBTracking ?? 0, sigRes: wire.shipBSigRes ?? "S", optimal: wire.shipBOptimal ?? 0, falloff: wire.shipBFalloff ?? 0, ammo: wire.shipBAmmo, weaponKind: wire.shipBWeaponKind, missileAmmo: wire.shipBMissileAmmo }, initialDistance: wire.initialDistance })),
    toWire: vi.fn(),
    fromProfile: vi.fn((profile: ProfileSettings, display: DisplayPreferences): SessionSettings => ({ version: profile.version, display, shipA: { speed: profile.shipASpeed, mode: profile.shipAMode, range: profile.shipARange, mass: profile.shipAMass, inertia: profile.shipAInertia, aggressivity: profile.shipAAggressivity ?? 1, skillLevel: profile.shipASkillLevel, overload: profile.shipAOverload ?? true, weaponOverload: profile.shipAWeaponOverload ?? false, damageEnabled: profile.shipADamageEnabled ?? true, hull: profile.shipAHullId, propulsion: profile.shipAPropulsion, fitting: profile.shipAFitting, overrides: profile.shipAOverrides ?? {}, fittedHull: profile.shipAFittedHull, ewarActivation: undefined, boosterActivation: undefined, missileBoosterActivation: undefined, sensorBoosterActivation: undefined, repMode: profile.shipARepMode, repairerActivation: profile.shipARepairerActivation, rahActivation: profile.shipARahActivation, sig: profile.shipASig, tracking: profile.shipATracking ?? 0, sigRes: profile.shipASigRes ?? "S", optimal: profile.shipAOptimal ?? 0, falloff: profile.shipAFalloff ?? 0, ammo: profile.shipAAmmo ?? ("12608" as TypeId), weaponKind: profile.shipAWeaponKind, missileAmmo: profile.shipAMissileAmmo }, shipB: { speed: profile.shipBSpeed, mode: profile.shipBMode, range: profile.shipBRange, mass: profile.shipBMass, inertia: profile.shipBInertia, aggressivity: profile.shipBAggressivity ?? 1, skillLevel: profile.shipBSkillLevel, overload: profile.shipBOverload ?? true, weaponOverload: profile.shipBWeaponOverload ?? false, damageEnabled: profile.shipBDamageEnabled ?? true, hull: profile.shipBHullId, propulsion: profile.shipBPropulsion, fitting: profile.shipBFitting, overrides: profile.shipBOverrides ?? {}, fittedHull: profile.shipBFittedHull, ewarActivation: undefined, boosterActivation: undefined, missileBoosterActivation: undefined, sensorBoosterActivation: undefined, repMode: profile.shipBRepMode, repairerActivation: profile.shipBRepairerActivation, rahActivation: profile.shipBRahActivation, sig: profile.shipBSig, tracking: profile.shipBTracking ?? 0, sigRes: profile.shipBSigRes ?? "S", optimal: profile.shipBOptimal ?? 0, falloff: profile.shipBFalloff ?? 0, ammo: profile.shipBAmmo ?? ("12608" as TypeId), weaponKind: profile.shipBWeaponKind, missileAmmo: profile.shipBMissileAmmo }, initialDistance: profile.initialDistance })),
    parseProfiles: vi.fn(() => ({})),
    profileFromUnknown: vi.fn(() => null),
    serialize: vi.fn(() => ""),
  } as unknown as SettingsParser;
}

export function mockFittingDb(): FittingDb {
  return {
    missiles: {},
    launchers: {},
    hullBonuses: {},
  } as unknown as FittingDb;
}

export function mockMissileCatalog(): MissileCatalog {
  return {
    missilesForLauncher: vi.fn(() => []),
    usualForLauncher: vi.fn(() => undefined),
    withCharge: vi.fn(),
    has: vi.fn(() => false),
    idForName: vi.fn(() => undefined),
    equivalentInGroups: vi.fn(() => undefined),
  };
}

export function mockLauncherClasses(): LauncherClasses {
  return {
    classOf: vi.fn(() => "rocket" as LauncherClass),
    representativeOf: vi.fn(() => toTypeId("0")),
    classesForTiers: vi.fn(() => []),
    allClasses: vi.fn(() => [] as readonly LauncherClass[]),
    variantsForClass: vi.fn(() => [] as readonly LauncherStats[]),
  };
}
