import type { TypeId } from "../gamedata/ids";
import type { FittingDb, TurretStats } from "../gamedata/fittingDb";
import type { SigResolutionClass } from "../sim";
import { SIG_RESOLUTIONS } from "../sim";
import type { SkillLevel } from "../ships";
import type { ChargeCatalog, ImportedTurret, ImportedTurretBase } from "./chargeCatalog";
import type { GunFamilies } from "./gunFamilies";

export interface TurretCatalog {
  resize(turret: ImportedTurret, target: SigResolutionClass, skillLevel: SkillLevel): ImportedTurret | undefined;
}

interface TurretCatalogDeps {
  readonly fittingDb: FittingDb;
  readonly gunFamilies: GunFamilies;
  readonly chargeCatalog: ChargeCatalog;
}

const TRACKING_SKILL_BONUS = 0.05;
const OPTIMAL_SKILL_BONUS = 0.05;
const FALLOFF_SKILL_BONUS = 0.05;
const STANDARD_SIGNATURE_RESOLUTION = 40_000;

export class TurretCatalogImpl implements TurretCatalog {
  private readonly db: FittingDb;
  private readonly gunFamilies: GunFamilies;
  private readonly chargeCatalog: ChargeCatalog;

  constructor(deps: TurretCatalogDeps) {
    this.db = deps.fittingDb;
    this.gunFamilies = deps.gunFamilies;
    this.chargeCatalog = deps.chargeCatalog;
  }

  resize(turret: ImportedTurret, target: SigResolutionClass, skillLevel: SkillLevel): ImportedTurret | undefined {
    if (!this.db.turrets[turret.moduleId]) return undefined;
    const family = this.gunFamilies.familyOf(turret.moduleId);
    const moduleId = this.gunFamilies.representativeOf(family, target);
    const stats = this.db.turrets[moduleId];
    if (!stats) return undefined;
    const base = computeBase(stats, target, skillLevel);
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
    };
  }
}

function computeBase(stats: TurretStats, sigResClass: SigResolutionClass, skillLevel: SkillLevel): ImportedTurretBase {
  const sigRes = SIG_RESOLUTIONS[sigResClass];
  const skillTrackingMultiplier = 1 + TRACKING_SKILL_BONUS * skillLevel;
  const skillOptimalMultiplier = 1 + OPTIMAL_SKILL_BONUS * skillLevel;
  const skillFalloffMultiplier = 1 + FALLOFF_SKILL_BONUS * skillLevel;
  return {
    tracking: (stats.tracking * skillTrackingMultiplier * sigRes) / STANDARD_SIGNATURE_RESOLUTION,
    optimal: stats.optimal * skillOptimalMultiplier,
    falloff: stats.falloff * skillFalloffMultiplier,
  };
}

function resolveCharge(chargeCatalog: ChargeCatalog, currentChargeId: TypeId, targetStats: TurretStats): TypeId {
  const equivalent = chargeCatalog.equivalentInSize(currentChargeId, targetStats.chargeSize);
  if (equivalent) return equivalent;
  const placeholder: ImportedTurret = {
    tracking: 0, sigResolutionClass: sigResClassFromChargeSize(targetStats.chargeSize),
    optimal: 0, falloff: 0, chargeSize: targetStats.chargeSize, chargeId: currentChargeId,
    base: { tracking: 0, optimal: 0, falloff: 0 }, moduleId: targetStats.id,
  };
  return chargeCatalog.usualForTurret(placeholder);
}

function sigResClassFromChargeSize(chargeSize: number): SigResolutionClass {
  if (chargeSize >= 4) return "XL";
  if (chargeSize === 3) return "L";
  if (chargeSize === 2) return "M";
  return "S";
}
