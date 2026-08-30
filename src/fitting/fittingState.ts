import type { TypeId } from "../gamedata/ids";
import type { FittingDb, HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";

export interface FittedModule {
  readonly moduleId: TypeId;
  readonly chargeId?: TypeId;
  readonly offline: boolean;
}

export interface TurretGroup {
  readonly moduleId: TypeId;
  readonly chargeId?: TypeId;
  readonly count: number;
}

export interface LauncherGroup {
  readonly moduleId: TypeId;
  readonly chargeId?: TypeId;
  readonly count: number;
}

export interface CargoEntry {
  readonly id: TypeId;
  readonly quantity: number;
}

export interface FittingState {
  readonly profile: ShipProfile;
  readonly hullBonuses: readonly HullBonus[];
  readonly supportModules: readonly FittedModule[];
  readonly turretGroups: readonly TurretGroup[];
  readonly launcherGroups: readonly LauncherGroup[];
  readonly propulsionModule?: FittedModule;
  readonly ewarModules: readonly FittedModule[];
  readonly boosterModules: readonly FittedModule[];
  readonly missileBoosterModules: readonly FittedModule[];
  readonly drones: readonly CargoEntry[];
  readonly cargo: readonly CargoEntry[];
}

export interface FittingModuleEntry {
  readonly moduleId: TypeId;
  readonly chargeId?: TypeId;
  readonly offline: boolean;
}

export class FittingStateFactory {
  constructor(private readonly db: FittingDb) {}

  create(profile: ShipProfile, hullBonuses: readonly HullBonus[], modules: readonly FittingModuleEntry[], drones: readonly CargoEntry[], cargo: readonly CargoEntry[]): FittingState {
    const turretCounts = new Map<TypeId, { count: number; chargeId?: TypeId; order: number }>();
    const launcherCounts = new Map<TypeId, { count: number; chargeId?: TypeId; order: number }>();
    const supportModules: FittedModule[] = [];
    const ewarModules: FittedModule[] = [];
    const boosterModules: FittedModule[] = [];
    const missileBoosterModules: FittedModule[] = [];
    let propulsionModule: FittedModule | undefined;
    let order = 0;

    for (const mod of modules) {
      if (mod.offline) continue;

      if (this.db.turrets[mod.moduleId]) {
        const existing = turretCounts.get(mod.moduleId);
        if (existing) {
          existing.count++;
          if (existing.chargeId === undefined && mod.chargeId !== undefined) existing.chargeId = mod.chargeId;
        } else {
          turretCounts.set(mod.moduleId, { count: 1, chargeId: mod.chargeId, order: order++ });
        }
        continue;
      }

      if (this.db.launchers[mod.moduleId]) {
        const existing = launcherCounts.get(mod.moduleId);
        if (existing) {
          existing.count++;
          if (existing.chargeId === undefined && mod.chargeId !== undefined) existing.chargeId = mod.chargeId;
        } else {
          launcherCounts.set(mod.moduleId, { count: 1, chargeId: mod.chargeId, order: order++ });
        }
        continue;
      }

      if (this.db.trackingComputers[mod.moduleId]) {
        boosterModules.push(mod);
        continue;
      }

      if (this.db.missileGuidanceComputers[mod.moduleId] || this.db.missileGuidanceEnhancers[mod.moduleId]) {
        missileBoosterModules.push(mod);
        continue;
      }

      const stats = this.db.modules[mod.moduleId];
      if (!stats) continue;

      if (stats.propulsion) {
        if (!propulsionModule) propulsionModule = mod;
        continue;
      }

      if (this.isEwarModule(mod.moduleId)) {
        ewarModules.push(mod);
        continue;
      }

      supportModules.push(mod);
    }

    return {
      profile,
      hullBonuses,
      supportModules,
      turretGroups: [...turretCounts.entries()].sort((a, b) => sortGroups(a[1], b[1])).map(([moduleId, e]) => ({ moduleId, chargeId: e.chargeId, count: e.count })),
      launcherGroups: [...launcherCounts.entries()].sort((a, b) => sortGroups(a[1], b[1])).map(([moduleId, e]) => ({ moduleId, chargeId: e.chargeId, count: e.count })),
      propulsionModule,
      ewarModules,
      boosterModules,
      missileBoosterModules,
      drones,
      cargo,
    };
  }

  private isEwarModule(moduleId: TypeId): boolean {
    return this.db.stasisWebs[moduleId] !== undefined || this.db.stasisGrapplers[moduleId] !== undefined || this.db.trackingDisruptors[moduleId] !== undefined || this.db.warpScramblers[moduleId] !== undefined || this.db.targetPainters[moduleId] !== undefined;
  }
}

function sortGroups(a: { count: number; order: number }, b: { count: number; order: number }): number {
  if (b.count !== a.count) return b.count - a.count;
  return a.order - b.order;
}
