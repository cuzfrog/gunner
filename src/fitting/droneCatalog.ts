import type { TypeId } from "../gamedata/ids";
import type { DroneSizeClass, DroneStats, FittingDb } from "../gamedata/fittingDb";
import type { DamageBreakdown, DamageType } from "./damageBreakdown";

export interface ImportedDrone {
  readonly typeId: TypeId;
  readonly name: string;
  readonly sizeClass: DroneSizeClass;
  readonly count: number;
  readonly damageMultiplier: number;
  readonly emDamage: number;
  readonly thermalDamage: number;
  readonly kineticDamage: number;
  readonly explosiveDamage: number;
  readonly tracking: number;
  readonly sigResolution: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly maxVelocity: number;
  readonly orbitSpeed: number;
  readonly orbitRange: number;
  readonly cycleTime: number;
  readonly bandwidth: number;
  readonly volume: number;
  readonly controlRange: number;
  readonly damageBreakdown: DamageBreakdown;
}

export interface DroneOption {
  readonly id: TypeId;
  readonly name: string;
  readonly sizeClass: DroneSizeClass;
  readonly damage: number;
  readonly damageByType: Readonly<Partial<Record<DamageType, number>>>;
  readonly bandwidth: number;
  readonly volume: number;
}

export interface DroneCatalog {
  dronesByClass(sizeClass: DroneSizeClass): readonly DroneOption[];
  usualForClass(sizeClass: DroneSizeClass): TypeId | undefined;
  has(drone: TypeId): boolean;
  idForName(name: string): TypeId | undefined;
}

interface DroneCatalogDeps {
  readonly fittingDb: Pick<FittingDb, "combatDrones">;
}

export class DroneCatalogImpl implements DroneCatalog {
  private readonly combatDrones: Readonly<Record<string, DroneStats>>;

  constructor({ fittingDb }: DroneCatalogDeps) {
    this.combatDrones = fittingDb.combatDrones;
  }

  dronesByClass(sizeClass: DroneSizeClass): readonly DroneOption[] {
    return dronesByClassFromDb(this.combatDrones, sizeClass);
  }

  usualForClass(sizeClass: DroneSizeClass): TypeId | undefined {
    const options = this.dronesByClass(sizeClass);
    return options.length > 0 ? options[0].id : undefined;
  }

  has(drone: TypeId): boolean {
    return this.combatDrones[drone] !== undefined;
  }

  idForName(name: string): TypeId | undefined {
    for (const stats of Object.values(this.combatDrones)) {
      if (stats.name === name) return stats.id;
    }
    return undefined;
  }
}

function dronesByClassFromDb(combatDrones: Readonly<Record<string, DroneStats>>, sizeClass: DroneSizeClass): DroneOption[] {
  const result: DroneOption[] = [];
  for (const stats of Object.values(combatDrones)) {
    if (stats.sizeClass !== sizeClass) continue;
    result.push(droneOptionFromStats(stats));
  }
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

function droneOptionFromStats(stats: DroneStats): DroneOption {
  const damageByType: Partial<Record<DamageType, number>> = {};
  if (stats.emDamage > 0) damageByType.em = stats.emDamage;
  if (stats.thermalDamage > 0) damageByType.thermal = stats.thermalDamage;
  if (stats.kineticDamage > 0) damageByType.kinetic = stats.kineticDamage;
  if (stats.explosiveDamage > 0) damageByType.explosive = stats.explosiveDamage;
  const damage = stats.emDamage + stats.thermalDamage + stats.kineticDamage + stats.explosiveDamage;
  return { id: stats.id, name: stats.name, sizeClass: stats.sizeClass, damage, damageByType, bandwidth: stats.bandwidth, volume: stats.volume };
}
