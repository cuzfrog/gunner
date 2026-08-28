import type { FittingDb, HullBonus, LauncherStats, MissileStats } from "../gamedata/fittingDb";
import type { TypeId } from "../gamedata/ids";
import type { SkillLevel } from "../ships";
import type { ImportedLauncher } from "./chargeCatalog";
import type { LauncherClass, LauncherClasses } from "./launcherClasses";
import type { MissileCatalog } from "./missileCatalog";

export interface LauncherCatalog {
  switchClass(launcher: ImportedLauncher, target: LauncherClass, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): ImportedLauncher | undefined;
}

interface LauncherCatalogDeps {
  readonly fittingDb: Pick<FittingDb, "launchers" | "missiles">;
  readonly launcherClasses: LauncherClasses;
  readonly missileCatalog: MissileCatalog;
}

export class LauncherCatalogImpl implements LauncherCatalog {
  private readonly launchers: Readonly<Record<string, LauncherStats>>;
  private readonly missiles: Readonly<Record<string, MissileStats>>;
  private readonly launcherClasses: LauncherClasses;
  private readonly missileCatalog: MissileCatalog;

  constructor(deps: LauncherCatalogDeps) {
    this.launchers = deps.fittingDb.launchers;
    this.missiles = deps.fittingDb.missiles;
    this.launcherClasses = deps.launcherClasses;
    this.missileCatalog = deps.missileCatalog;
  }

  switchClass(launcher: ImportedLauncher, target: LauncherClass, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): ImportedLauncher | undefined {
    if (!this.launchers[launcher.moduleId]) return undefined;
    const currentClass = this.launcherClasses.classOf(launcher.moduleId);
    if (currentClass === target) return launcher;
    const moduleId = this.launcherClasses.representativeOf(target);
    const targetStats = this.launchers[moduleId];
    if (!targetStats) return undefined;
    const missileId = resolveMissile(this.missiles, this.missileCatalog, launcher.chargeId, targetStats);
    return this.missileCatalog.withCharge(
      { moduleId, name: targetStats.name, count: launcher.count, chargeId: missileId, chargeName: "", damagePerMissile: 0, cycleTime: 0, explosionRadius: 0, explosionVelocity: 0, damageReductionFactor: 0, maxVelocity: 0, flightTime: 0 },
      missileId, hullBonuses, skillLevel,
    );
  }
}

function resolveMissile(missiles: Readonly<Record<string, MissileStats>>, missileCatalog: MissileCatalog, currentChargeId: TypeId, targetStats: LauncherStats): TypeId {
  const currentMissile = missiles[currentChargeId];
  if (currentMissile && targetStats.chargeGroups.includes(currentMissile.chargeGroup)) return currentChargeId;
  const equivalent = missileCatalog.equivalentInGroups(currentChargeId, targetStats.chargeGroups);
  if (equivalent) return equivalent;
  const usual = missileCatalog.usualForLauncher(targetStats);
  if (usual) return usual;
  return currentChargeId;
}
