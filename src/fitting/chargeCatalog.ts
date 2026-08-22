import type { SigResolutionClass } from "../sim";
import { gunFamilyOf, type GunFamily } from "./gunFamilies";
import type { ChargeStats } from "./fittingDb";

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
  readonly charge: string;
  readonly base: ImportedTurretBase;
  readonly moduleName: string;
}

export interface CargoCharge {
  readonly name: string;
  readonly quantity: number;
}

export interface ChargeOption {
  readonly name: string;
  readonly trackingMultiplier: number;
  readonly rangeMultiplier: number;
  readonly falloffMultiplier: number;
}

export interface ChargeCatalog {
  usualForChargeSize(chargeSize: number): string;
  chargesForSize(chargeSize: number): readonly ChargeOption[];
  chargesForTurret(turret: ImportedTurret): readonly ChargeOption[];
  withCharge(turret: ImportedTurret, charge: string): ImportedTurret;
}

interface ChargeCatalogDeps {
  readonly fittingDb: { readonly charges: Readonly<Record<string, ChargeStats>> };
}

export class ChargeCatalogImpl implements ChargeCatalog {
  private readonly charges: Readonly<Record<string, ChargeStats>>;

  constructor({ fittingDb }: ChargeCatalogDeps) {
    this.charges = fittingDb.charges;
  }

  usualForChargeSize(chargeSize: number): string {
    return _usualForChargeSize(this.charges, chargeSize);
  }

  chargesForSize(chargeSize: number): readonly ChargeOption[] {
    return _chargesForSize(this.charges, chargeSize);
  }

  chargesForTurret(turret: ImportedTurret): readonly ChargeOption[] {
    const turretFamily = _turretChargeFamily(turret.moduleName);
    const all = this.chargesForSize(turret.chargeSize);
    if (turretFamily === undefined) return all;
    return all.filter((option) => _chargeFamilyOf(option.name) === turretFamily);
  }

  withCharge(turret: ImportedTurret, charge: string): ImportedTurret {
    const stats = this.charges[charge];
    if (!stats) return turret;
    return {
      ...turret,
      charge,
      tracking: turret.base.tracking * (stats.trackingMultiplier ?? 1),
      optimal: turret.base.optimal * (stats.rangeMultiplier ?? 1),
      falloff: turret.base.falloff * (stats.falloffMultiplier ?? 1),
    };
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
  for (const [name, stats] of Object.entries(charges)) {
    if (_chargeSizeFromName(name) !== chargeSize) continue;
    result.push({
      name,
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
  for (const [name, stats] of Object.entries(charges)) {
    result.push({
      name,
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

function _usualForChargeSize(charges: Readonly<Record<string, ChargeStats>>, chargeSize: number): string {
  let all = _chargesForSize(charges, chargeSize);
  if (all.length === 0) all = _allChargeOptions(charges);
  if (all.length === 0) throw new Error("Charge catalog is empty");
  const navy = all.filter((c) => _isNavyCharge(c.name));
  const chosen = navy.length > 0 ? navy : all;
  return chosen[0].name;
}

type ChargeFamily = "projectile" | "hybrid" | "laser";

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

function _chargeFamilyOf(name: string): ChargeFamily | undefined {
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

function _turretChargeFamily(moduleName: string): ChargeFamily | undefined {
  try {
    const family = gunFamilyOf(moduleName);
    return TURRET_CHARGE_FAMILIES[family];
  } catch {
    return undefined;
  }
}

function _chargeStem(name: string): string {
  for (let i = SIZE_SUFFIXES.length - 1; i >= 0; i--) {
    const { suffix } = SIZE_SUFFIXES[i];
    if (name.endsWith(suffix)) return name.slice(0, -suffix.length);
  }
  return name;
}

export { _chargeFamilyOf, _turretChargeFamily };
