import type { TypeId } from "../gamedata/ids";
import type { FittingDb, TurretStats } from "../gamedata/fittingDb";
import type { SigResolutionClass } from "../sim";
import type { SkillLevel } from "../ships";
import type { ChargeCatalog, ImportedTurret } from "./chargeCatalog";
import type { GunFamilies } from "./gunFamilies";
import { applySkillMultipliers, sigResolutionClassFromChargeSize } from "./turretStats";

export interface TurretCatalog {
  resize(turret: ImportedTurret, target: SigResolutionClass, skillLevel: SkillLevel, preferredModuleId?: TypeId): ImportedTurret | undefined;
  switchVariant(turret: ImportedTurret, targetModuleId: TypeId, skillLevel: SkillLevel): ImportedTurret | undefined;
}

interface TurretCatalogDeps {
  readonly fittingDb: FittingDb;
  readonly gunFamilies: GunFamilies;
  readonly chargeCatalog: ChargeCatalog;
}

export class TurretCatalogImpl implements TurretCatalog {
  private readonly db: FittingDb;
  private readonly gunFamilies: GunFamilies;
  private readonly chargeCatalog: ChargeCatalog;

  constructor(deps: TurretCatalogDeps) {
    this.db = deps.fittingDb;
    this.gunFamilies = deps.gunFamilies;
    this.chargeCatalog = deps.chargeCatalog;
  }

  resize(turret: ImportedTurret, target: SigResolutionClass, skillLevel: SkillLevel, preferredModuleId?: TypeId): ImportedTurret | undefined {
    if (!this.db.turrets[turret.moduleId]) return undefined;
    const family = this.gunFamilies.familyOf(turret.moduleId);
    const moduleId = preferredModuleId && this.db.turrets[preferredModuleId] ? preferredModuleId : this.gunFamilies.representativeOf(family, target);
    const stats = this.db.turrets[moduleId];
    if (!stats) return undefined;
    const base = applySkillMultipliers(stats, target, skillLevel);
    const chargeId = resolveCharge(this.chargeCatalog, turret.chargeId, stats);
    const charge = this.db.charges[chargeId] ?? {};
    return {
      tracking: base.tracking * (charge.trackingMultiplier ?? 1),
      sigResolutionClass: target,
      optimal: base.optimal * (charge.rangeMultiplier ?? 1),
      falloff: base.falloff * (charge.falloffMultiplier ?? 1),
      chargeSize: stats.chargeSize,
      chargeId,
      base,
      moduleId,
      damageMultiplier: stats.damageMultiplier,
      damagePerShot: stats.damageMultiplier * chargeDamage(this.db.charges[chargeId]),
      cycleTime: stats.cycleTime,
      turretCount: turret.turretCount,
    };
  }

  switchVariant(turret: ImportedTurret, targetModuleId: TypeId, skillLevel: SkillLevel): ImportedTurret | undefined {
    const stats = this.db.turrets[targetModuleId];
    if (!stats) return undefined;
    if (targetModuleId === turret.moduleId) return turret;
    const target = sigResolutionClassFromChargeSize(stats.chargeSize);
    const base = applySkillMultipliers(stats, target, skillLevel);
    const chargeId = resolveCharge(this.chargeCatalog, turret.chargeId, stats);
    const charge = this.db.charges[chargeId] ?? {};
    return {
      tracking: base.tracking * (charge.trackingMultiplier ?? 1),
      sigResolutionClass: target,
      optimal: base.optimal * (charge.rangeMultiplier ?? 1),
      falloff: base.falloff * (charge.falloffMultiplier ?? 1),
      chargeSize: stats.chargeSize,
      chargeId,
      base,
      moduleId: targetModuleId,
      damageMultiplier: stats.damageMultiplier,
      damagePerShot: stats.damageMultiplier * chargeDamage(this.db.charges[chargeId]),
      cycleTime: stats.cycleTime,
      turretCount: turret.turretCount,
    };
  }
}

function chargeDamage(charge: { readonly emDamage?: number; readonly thermalDamage?: number; readonly kineticDamage?: number; readonly explosiveDamage?: number } | undefined): number {
  if (!charge) return 0;
  return (charge.emDamage ?? 0) + (charge.thermalDamage ?? 0) + (charge.kineticDamage ?? 0) + (charge.explosiveDamage ?? 0);
}

function resolveCharge(chargeCatalog: ChargeCatalog, currentChargeId: TypeId, targetStats: TurretStats): TypeId {
  const equivalent = chargeCatalog.equivalentInSize(currentChargeId, targetStats.chargeSize);
  if (equivalent) return equivalent;
  const placeholder: ImportedTurret = {
    tracking: 0, sigResolutionClass: sigResolutionClassFromChargeSize(targetStats.chargeSize),
    optimal: 0, falloff: 0, chargeSize: targetStats.chargeSize, chargeId: currentChargeId,
    base: { tracking: 0, optimal: 0, falloff: 0 }, moduleId: targetStats.id,
    damageMultiplier: targetStats.damageMultiplier, damagePerShot: 0, cycleTime: targetStats.cycleTime, turretCount: 1,
  };
  return chargeCatalog.usualForTurret(placeholder);
}
