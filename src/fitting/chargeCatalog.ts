import type { TypeId } from "../gamedata/ids";
import type { SigResolutionClass } from "../sim";
import { FITTING_DB, type ChargeStats, type FittingDb } from "../gamedata/fittingDb";
import type { GunFamilies, GunFamily } from "./gunFamilies";
import { type DamageBreakdown, chargeDamageByType } from "./damageBreakdown";

export interface ImportedTurretBase {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
}

export interface ImportedTurret {
  readonly tracking: number;
  readonly sigResolutionClass: SigResolutionClass;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly chargeId: TypeId;
  readonly base: ImportedTurretBase;
  readonly moduleId: TypeId;
  readonly damageMultiplier: number;
  readonly damagePerShot: number;
  readonly cycleTime: number;
  readonly turretCount: number;
  readonly damageBreakdown: DamageBreakdown;
}

export interface ImportedLauncher {
  readonly moduleId: TypeId;
  readonly name: string;
  readonly count: number;
  readonly chargeId: TypeId;
  readonly chargeName: string;
  readonly damagePerMissile: number;
  readonly cycleTime: number;
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  readonly maxVelocity: number;
  readonly flightTime: number;
  readonly damageBreakdown: DamageBreakdown;
}

export interface CargoCharge {
  readonly id: TypeId;
  readonly quantity: number;
}

export interface ChargeOption {
  readonly id: TypeId;
  readonly name: string;
  readonly trackingMultiplier: number;
  readonly rangeMultiplier: number;
  readonly falloffMultiplier: number;
}

export type ChargeFamily = "projectile" | "hybrid" | "laser";

export interface ChargeCatalog {
  usualForChargeSize(chargeSize: number): TypeId;
  usualForTurret(turret: ImportedTurret): TypeId;
  chargesForSize(chargeSize: number): readonly ChargeOption[];
  chargesForTurret(turret: ImportedTurret): readonly ChargeOption[];
  withCharge(turret: ImportedTurret, charge: TypeId): ImportedTurret;
  idForName(name: string): TypeId | undefined;
  has(charge: TypeId): boolean;
  equivalentInSize(charge: TypeId, chargeSize: number): TypeId | undefined;
}

interface ChargeCatalogDeps {
  readonly fittingDb: FittingDb;
  readonly gunFamilies: GunFamilies;
}

export class ChargeCatalogImpl implements ChargeCatalog {
  private readonly charges: Readonly<Record<string, ChargeStats>>;
  private readonly gunFamilies: GunFamilies;

  constructor({ fittingDb, gunFamilies }: ChargeCatalogDeps) {
    this.charges = fittingDb.charges;
    this.gunFamilies = gunFamilies;
    if (this.charges === FITTING_DB.charges) assertChargeFamilyBases(this.charges);
  }

  usualForChargeSize(chargeSize: number): TypeId {
    return _usualForChargeSize(this.charges, chargeSize);
  }

  usualForTurret(turret: ImportedTurret): TypeId {
    const family = _turretChargeFamily(turret.moduleId, this.gunFamilies);
    if (family === undefined) return _usualFromOptions(this.chargesForSize(turret.chargeSize));
    const inFamily = this.chargesForTurret(turret);
    return _usualFromOptions(inFamily.length > 0 ? inFamily : this.chargesForSize(turret.chargeSize));
  }

  chargesForSize(chargeSize: number): readonly ChargeOption[] {
    return _chargesForSize(this.charges, chargeSize);
  }

  chargesForTurret(turret: ImportedTurret): readonly ChargeOption[] {
    const turretFamily = _turretChargeFamily(turret.moduleId, this.gunFamilies);
    const all = this.chargesForSize(turret.chargeSize);
    if (turretFamily === undefined) return all;
    return all.filter((option) => _chargeFamilyOf(option.name) === turretFamily);
  }

  withCharge(turret: ImportedTurret, charge: TypeId): ImportedTurret {
    const stats = this.charges[charge];
    if (!stats) return turret;
    const family = _turretChargeFamily(turret.moduleId, this.gunFamilies);
    if (family !== undefined && _chargeFamilyOf(stats.name) !== family) return turret;
    const chargeDamage = (stats.emDamage ?? 0) + (stats.thermalDamage ?? 0) + (stats.kineticDamage ?? 0) + (stats.explosiveDamage ?? 0);
    return {
      ...turret,
      chargeId: charge,
      tracking: turret.base.tracking * (stats.trackingMultiplier ?? 1),
      optimal: turret.base.optimal * (stats.rangeMultiplier ?? 1),
      falloff: turret.base.falloff * (stats.falloffMultiplier ?? 1),
      damagePerShot: turret.damageMultiplier * chargeDamage,
      damageBreakdown: { ...turret.damageBreakdown, damageByType: chargeDamageByType(stats) },
    };
  }

  // Legacy migration only: settingsCompat resolves stored charge names to TypeIds.
  idForName(name: string): TypeId | undefined {
    for (const stats of Object.values(this.charges)) {
      if (stats.name === name) return stats.id;
    }
    return undefined;
  }

  has(charge: TypeId): boolean {
    return this.charges[charge] !== undefined;
  }

  equivalentInSize(charge: TypeId, chargeSize: number): TypeId | undefined {
    return _equivalentInSize(this.charges, charge, chargeSize);
  }
}

const NAVY_PREFIXES = ["Caldari Navy", "Federation Navy", "Imperial Navy", "Republic Fleet"] as const;

const SIZE_SUFFIXES = [
  { suffix: " XL", chargeSize: 4 },
  { suffix: " L", chargeSize: 3 },
  { suffix: " M", chargeSize: 2 },
  { suffix: " S", chargeSize: 1 },
] as const;

export function _chargeSizeFromName(name: string): number | undefined {
  for (const { suffix, chargeSize } of SIZE_SUFFIXES) {
    if (name.endsWith(suffix)) return chargeSize;
  }
  return undefined;
}

export function _isNavyCharge(name: string): boolean {
  return NAVY_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function _chargesForSize(charges: Readonly<Record<string, ChargeStats>>, chargeSize: number): ChargeOption[] {
  const result: ChargeOption[] = [];
  for (const stats of Object.values(charges)) {
    if (_chargeSizeFromName(stats.name) !== chargeSize) continue;
    result.push({
      id: stats.id,
      name: stats.name,
      trackingMultiplier: stats.trackingMultiplier ?? 1,
      rangeMultiplier: stats.rangeMultiplier ?? 1,
      falloffMultiplier: stats.falloffMultiplier ?? 1,
    });
  }
  result.sort((a, b) => {
    if (a.rangeMultiplier !== b.rangeMultiplier) return a.rangeMultiplier - b.rangeMultiplier;
    return a.name.localeCompare(b.name);
  });
  return result;
}

function _allChargeOptions(charges: Readonly<Record<string, ChargeStats>>): ChargeOption[] {
  const result: ChargeOption[] = [];
  for (const stats of Object.values(charges)) {
    result.push({
      id: stats.id,
      name: stats.name,
      trackingMultiplier: stats.trackingMultiplier ?? 1,
      rangeMultiplier: stats.rangeMultiplier ?? 1,
      falloffMultiplier: stats.falloffMultiplier ?? 1,
    });
  }
  result.sort((a, b) => {
    if (a.rangeMultiplier !== b.rangeMultiplier) return a.rangeMultiplier - b.rangeMultiplier;
    return a.name.localeCompare(b.name);
  });
  return result;
}

function _usualForChargeSize(charges: Readonly<Record<string, ChargeStats>>, chargeSize: number): TypeId {
  let all = _chargesForSize(charges, chargeSize);
  if (all.length === 0) all = _allChargeOptions(charges);
  return _usualFromOptions(all);
}

function _usualFromOptions(options: readonly ChargeOption[]): TypeId {
  if (options.length === 0) throw new Error("Charge catalog is empty");
  const navy = options.filter((c) => _isNavyCharge(c.name));
  const chosen = navy.length > 0 ? navy : options;
  return chosen[0].id;
}

const TURRET_CHARGE_FAMILIES: Readonly<Record<GunFamily, ChargeFamily>> = {
  autocannon: "projectile",
  artillery: "projectile",
  railgun: "hybrid",
  blaster: "hybrid",
  pulseLaser: "laser",
  beamLaser: "laser",
} as const;

const CHARGE_FAMILY_BY_BASE: Readonly<Record<string, ChargeFamily>> = {
  "Carbonized Lead": "projectile",
  "Depleted Uranium": "projectile",
  "Phased Plasma": "projectile",
  "Titanium Sabot": "projectile",
  "Antimatter Charge": "hybrid",
  "Iridium Charge": "hybrid",
  "Iron Charge": "hybrid",
  "Lead Charge": "hybrid",
  "Plutonium Charge": "hybrid",
  "Thorium Charge": "hybrid",
  "Tungsten Charge": "hybrid",
  "Uranium Charge": "hybrid",
  Aurora: "laser",
  Barrage: "projectile",
  Conflagration: "laser",
  EMP: "projectile",
  Fusion: "projectile",
  Gamma: "laser",
  Gleam: "laser",
  Hail: "projectile",
  Infrared: "laser",
  Javelin: "hybrid",
  Microwave: "laser",
  Multifrequency: "laser",
  Nuclear: "projectile",
  Null: "hybrid",
  Proton: "projectile",
  Quake: "projectile",
  Radio: "laser",
  Scorch: "laser",
  Spike: "hybrid",
  Standard: "laser",
  Tremor: "projectile",
  Ultraviolet: "laser",
  Void: "hybrid",
  Xray: "laser",
} as const;

export function _chargeFamilyOf(name: string): ChargeFamily | undefined {
  const stem = _chargeStem(name);
  const tokens = stem.split(/\s+/);
  if (tokens.length >= 2) {
    const two = tokens.slice(-2).join(" ");
    const family = CHARGE_FAMILY_BY_BASE[two];
    if (family !== undefined) return family;
  }
  const one = tokens[tokens.length - 1];
  return CHARGE_FAMILY_BY_BASE[one];
}

function _turretChargeFamily(moduleId: TypeId, gunFamilies: GunFamilies): ChargeFamily | undefined {
  try {
    const family = gunFamilies.familyOf(moduleId);
    return TURRET_CHARGE_FAMILIES[family];
  } catch {
    return undefined;
  }
}

function _equivalentInSize(charges: Readonly<Record<string, ChargeStats>>, charge: TypeId, chargeSize: number): TypeId | undefined {
  const stats = charges[charge];
  if (!stats) return undefined;
  const stem = _chargeStem(stats.name);
  const targetSuffix = SIZE_SUFFIXES.find((entry) => entry.chargeSize === chargeSize)?.suffix;
  if (!targetSuffix) return undefined;
  const targetName = `${stem}${targetSuffix}`;
  for (const candidate of Object.values(charges)) {
    if (candidate.name === targetName) return candidate.id;
  }
  return undefined;
}

function _chargeStem(name: string): string {
  for (let i = SIZE_SUFFIXES.length - 1; i >= 0; i--) {
    const { suffix } = SIZE_SUFFIXES[i];
    if (name.endsWith(suffix)) return name.slice(0, -suffix.length);
  }
  return name;
}

function assertChargeFamilyBases(charges: Readonly<Record<string, ChargeStats>>): void {
  const matched = new Set<string>();
  for (const stats of Object.values(charges)) {
    const stem = _chargeStem(stats.name);
    for (const base of Object.keys(CHARGE_FAMILY_BY_BASE)) {
      if (stem === base || stem.endsWith(` ${base}`)) matched.add(base);
    }
  }
  const missing = Object.keys(CHARGE_FAMILY_BY_BASE).filter((base) => !matched.has(base));
  if (missing.length > 0) throw new Error(`CHARGE_FAMILY_BY_BASE keys have no matching charge name: ${missing.join(", ")}`);
}

export { _turretChargeFamily };
