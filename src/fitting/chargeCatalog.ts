import type { TypeId } from "../gamedata/ids";
import { type DamageVector, type DamageType, type SigResolutionClass, type TurretSpoolSpec, damageVectorFromPartial, damageVectorScale } from "../sim";
import { FITTING_DB, type ChargeStats, type FittingDb, type TurretStats } from "../gamedata/fittingDb";
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
  readonly damagePerShot: DamageVector;
  readonly cycleTime: number;
  readonly turretCount: number;
  readonly spool?: TurretSpoolSpec; // resolved spool (per-cycle + hull-adjusted max), absent for non-spooling turrets
  readonly damageBreakdown: DamageBreakdown;
}

export interface ImportedLauncher {
  readonly moduleId: TypeId;
  readonly name: string;
  readonly count: number;
  readonly chargeId: TypeId;
  readonly chargeName: string;
  readonly damagePerMissile: DamageVector;
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
  readonly damageByType: Readonly<Partial<Record<DamageType, number>>>;
}

export interface ChargeCatalog {
  usualForChargeSize(chargeSize: number): TypeId;
  usualForTurret(turret: Pick<ImportedTurret, "moduleId" | "chargeSize">): TypeId;
  chargesForSize(chargeSize: number): readonly ChargeOption[];
  chargesForTurret(turret: Pick<ImportedTurret, "moduleId" | "chargeSize">): readonly ChargeOption[];
  withCharge(turret: ImportedTurret, charge: TypeId): ImportedTurret;
  idForName(name: string): TypeId | undefined;
  has(charge: TypeId): boolean;
  equivalentInSize(charge: TypeId, chargeSize: number): TypeId | undefined;
}

interface ChargeCatalogDeps {
  readonly fittingDb: FittingDb;
}

export class ChargeCatalogImpl implements ChargeCatalog {
  private readonly charges: Readonly<Record<string, ChargeStats>>;
  private readonly turrets: Readonly<Record<string, TurretStats>>;

  constructor({ fittingDb }: ChargeCatalogDeps) {
    this.charges = fittingDb.charges;
    this.turrets = fittingDb.turrets;
    if (this.charges === FITTING_DB.charges) assertTurretChargeCoverage(this.turrets, this.charges);
  }

  usualForChargeSize(chargeSize: number): TypeId {
    return _usualForChargeSize(this.charges, chargeSize);
  }

  usualForTurret(turret: Pick<ImportedTurret, "moduleId" | "chargeSize">): TypeId {
    const options = this.chargesForTurret(turret);
    if (options.length === 0) throw new Error(`No compatible charges for turret ${turret.moduleId}`);
    return _usualFromOptions(options);
  }

  chargesForSize(chargeSize: number): readonly ChargeOption[] {
    return _chargesForSize(this.charges, chargeSize);
  }

  chargesForTurret(turret: Pick<ImportedTurret, "moduleId" | "chargeSize">): readonly ChargeOption[] {
    const stats = this.turrets[turret.moduleId];
    if (!stats) return [];
    const groups = new Set(stats.chargeGroups);
    const result: ChargeOption[] = [];
    for (const charge of Object.values(this.charges)) {
      if (!groups.has(charge.chargeGroup)) continue;
      if (charge.chargeSize !== turret.chargeSize) continue;
      result.push(toOption(charge));
    }
    sortChargeOptions(result);
    return result;
  }

  withCharge(turret: ImportedTurret, charge: TypeId): ImportedTurret {
    const stats = this.charges[charge];
    if (!stats) return turret;
    if (!this.chargesForTurret(turret).some((option) => option.id === charge)) return turret;
    const chargeDamageVec = damageVectorFromPartial(chargeDamageByType(stats));
    return {
      ...turret,
      chargeId: charge,
      tracking: turret.base.tracking * (stats.trackingMultiplier ?? 1),
      optimal: turret.base.optimal * (stats.rangeMultiplier ?? 1),
      falloff: turret.base.falloff * (stats.falloffMultiplier ?? 1),
      damagePerShot: damageVectorScale(chargeDamageVec, turret.damageMultiplier),
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

function toOption(stats: ChargeStats): ChargeOption {
  return {
    id: stats.id,
    name: stats.name,
    trackingMultiplier: stats.trackingMultiplier ?? 1,
    rangeMultiplier: stats.rangeMultiplier ?? 1,
    falloffMultiplier: stats.falloffMultiplier ?? 1,
    damageByType: chargeDamageByType(stats),
  };
}

function sortChargeOptions(options: ChargeOption[]): void {
  options.sort((a, b) => {
    if (a.rangeMultiplier !== b.rangeMultiplier) return a.rangeMultiplier - b.rangeMultiplier;
    return a.name.localeCompare(b.name);
  });
}

function _chargesForSize(charges: Readonly<Record<string, ChargeStats>>, chargeSize: number): ChargeOption[] {
  const result: ChargeOption[] = [];
  for (const stats of Object.values(charges)) {
    if (stats.chargeSize !== chargeSize) continue;
    result.push(toOption(stats));
  }
  sortChargeOptions(result);
  return result;
}

function _allChargeOptions(charges: Readonly<Record<string, ChargeStats>>): ChargeOption[] {
  const result: ChargeOption[] = [];
  for (const stats of Object.values(charges)) result.push(toOption(stats));
  sortChargeOptions(result);
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

function assertTurretChargeCoverage(
  turrets: Readonly<Record<string, TurretStats>>,
  charges: Readonly<Record<string, ChargeStats>>,
): void {
  const unmatched: string[] = [];
  for (const turret of Object.values(turrets)) {
    const match = Object.values(charges).some(
      (charge) => turret.chargeGroups.includes(charge.chargeGroup) && charge.chargeSize === turret.chargeSize,
    );
    if (!match) unmatched.push(turret.name);
  }
  if (unmatched.length > 0) throw new Error(`Turrets with no compatible charges: ${unmatched.join(", ")}`);
}
