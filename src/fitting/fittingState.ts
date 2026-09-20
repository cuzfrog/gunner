import type { TypeId } from "../gamedata/ids";
import type { FittingDb, HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import type { FighterGroup } from "./fighterCatalog";

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

export interface VortonGroup {
  readonly moduleId: TypeId;
  readonly chargeId?: TypeId;
  readonly count: number;
}

export interface DroneGroup {
  readonly typeId: TypeId;
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
  readonly defenseModules: readonly FittedModule[];
  readonly turretGroups: readonly TurretGroup[];
  readonly launcherGroups: readonly LauncherGroup[];
  readonly vortonGroups: readonly VortonGroup[];
  readonly propulsionModule?: FittedModule;
  readonly ewarModules: readonly FittedModule[];
  readonly boosterModules: readonly FittedModule[];
  readonly missileBoosterModules: readonly FittedModule[];
  readonly droneBoosterModules: readonly FittedModule[];
  readonly sensorBoosterModules: readonly FittedModule[];
  readonly sensorAmplifierModules: readonly FittedModule[];
  readonly commandBurstModules: readonly FittedModule[];
  readonly droneGroups: readonly DroneGroup[];
  readonly fighterGroups: readonly FighterGroup[];
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

  create(profile: ShipProfile, hullBonuses: readonly HullBonus[], modules: readonly FittingModuleEntry[], drones: readonly CargoEntry[], fighters: readonly CargoEntry[], cargo: readonly CargoEntry[]): FittingState {
    const turretCounts = new Map<TypeId, { count: number; chargeId?: TypeId; order: number }>();
    const launcherCounts = new Map<TypeId, { count: number; chargeId?: TypeId; order: number }>();
    const vortonCounts = new Map<TypeId, { count: number; chargeId?: TypeId; order: number }>();
    const supportModules: FittedModule[] = [];
    const defenseModules: FittedModule[] = [];
    const ewarModules: FittedModule[] = [];
    const boosterModules: FittedModule[] = [];
    const missileBoosterModules: FittedModule[] = [];
    const droneBoosterModules: FittedModule[] = [];
    const sensorBoosterModules: FittedModule[] = [];
    const sensorAmplifierModules: FittedModule[] = [];
    const commandBurstModules: FittedModule[] = [];
    let propulsionModule: FittedModule | undefined;
    let order = 0;
    const mergedHullBonuses = [...hullBonuses];

    for (const mod of modules) {
      if (mod.offline) continue;

      const subsystemBonuses = this.db.subsystemBonuses[mod.moduleId];
      if (subsystemBonuses !== undefined) {
        mergedHullBonuses.push(...subsystemBonuses);
        continue;
      }

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

      if (this.db.vortons[mod.moduleId]) {
        const existing = vortonCounts.get(mod.moduleId);
        if (existing) {
          existing.count++;
          if (existing.chargeId === undefined && mod.chargeId !== undefined) existing.chargeId = mod.chargeId;
        } else {
          vortonCounts.set(mod.moduleId, { count: 1, chargeId: mod.chargeId, order: order++ });
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

      if (this.db.omnidirectionalTrackingLinks[mod.moduleId] || this.db.omnidirectionalTrackingEnhancers[mod.moduleId]) {
        droneBoosterModules.push(mod);
        continue;
      }

      if (this.db.sensorBoosters[mod.moduleId]) {
        sensorBoosterModules.push(mod);
        continue;
      }

      if (this.db.signalAmplifiers[mod.moduleId]) {
        sensorAmplifierModules.push(mod);
        continue;
      }

      if (this.db.commandBursts[mod.moduleId] !== undefined) {
        commandBurstModules.push(mod);
        continue;
      }

      const stats = this.db.modules[mod.moduleId];
      if (!stats) continue;

      if (stats.droneDamageBonus) {
        droneBoosterModules.push(mod);
        continue;
      }

      if (stats.propulsion) {
        if (!propulsionModule) propulsionModule = mod;
        continue;
      }

      if (stats.defense) {
        defenseModules.push(mod);
        continue;
      }

      if (this.isEwarModule(mod.moduleId)) {
        ewarModules.push(mod);
        continue;
      }

      supportModules.push(mod);
    }

    const droneCounts = new Map<TypeId, { count: number; order: number }>();
    let droneOrder = 0;
    for (const entry of drones) {
      if (!this.db.combatDrones[entry.id]) continue;
      const existing = droneCounts.get(entry.id);
      if (existing) {
        existing.count += entry.quantity;
      } else {
        droneCounts.set(entry.id, { count: entry.quantity, order: droneOrder++ });
      }
    }

    const fighterCounts = new Map<TypeId, { count: number; order: number }>();
    let fighterOrder = 0;
    for (const entry of fighters) {
      if (!this.db.fighters[entry.id]) continue;
      const existing = fighterCounts.get(entry.id);
      if (existing) {
        existing.count += entry.quantity;
      } else {
        fighterCounts.set(entry.id, { count: entry.quantity, order: fighterOrder++ });
      }
    }

    return {
      profile,
      hullBonuses: mergedHullBonuses,
      supportModules,
      defenseModules,
      turretGroups: [...turretCounts.entries()].sort((a, b) => sortGroups(a[1], b[1])).map(([moduleId, e]) => ({ moduleId, chargeId: e.chargeId, count: e.count })),
      launcherGroups: [...launcherCounts.entries()].sort((a, b) => sortGroups(a[1], b[1])).map(([moduleId, e]) => ({ moduleId, chargeId: e.chargeId, count: e.count })),
      vortonGroups: [...vortonCounts.entries()].sort((a, b) => sortGroups(a[1], b[1])).map(([moduleId, e]) => ({ moduleId, chargeId: e.chargeId, count: e.count })),
      propulsionModule,
      ewarModules,
      boosterModules,
      missileBoosterModules,
      droneBoosterModules,
      sensorBoosterModules,
      sensorAmplifierModules,
      commandBurstModules,
      droneGroups: [...droneCounts.entries()].sort((a, b) => sortGroups(a[1], b[1])).map(([typeId, e]) => ({ typeId, count: e.count })),
      fighterGroups: [...fighterCounts.entries()].sort((a, b) => sortGroups(a[1], b[1])).map(([typeId, e]) => ({ typeId, count: e.count })),
      drones,
      cargo,
    };
  }

  private isEwarModule(moduleId: TypeId): boolean {
    return this.db.stasisWebs[moduleId] !== undefined || this.db.stasisGrapplers[moduleId] !== undefined || this.db.trackingDisruptors[moduleId] !== undefined || this.db.warpScramblers[moduleId] !== undefined || this.db.targetPainters[moduleId] !== undefined || this.db.jammers[moduleId] !== undefined || this.db.sensorDampeners[moduleId] !== undefined || this.db.modules[moduleId]?.neutralizer !== undefined || this.db.modules[moduleId]?.nosferatu !== undefined;
  }
}

function sortGroups(a: { count: number; order: number }, b: { count: number; order: number }): number {
  if (b.count !== a.count) return b.count - a.count;
  return a.order - b.order;
}
