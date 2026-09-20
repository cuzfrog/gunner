import type { TypeId } from "../gamedata/ids";
import type { FighterKind, FighterStats, FittingDb } from "../gamedata/fittingDb";
import type { DamageType } from "../sim";
import type { DamageBreakdown } from "./damageBreakdown";

export interface ImportedFighterAttack {
  // Final multiplier: fighter base times skill and hull fighterDamage contributions.
  readonly damageMultiplier: number;
  readonly emDamage: number;
  readonly thermalDamage: number;
  readonly kineticDamage: number;
  readonly explosiveDamage: number;
  readonly cycleTime: number;
  // Explosion and range stats with omnidirectional tracking link multipliers applied.
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly damageReductionFactor: number;
  readonly damageReductionSensitivity: number;
  readonly numShots: number;
  readonly rearmTime: number;
}

export interface FighterGroup {
  readonly typeId: TypeId;
  readonly count: number;
}

export interface ImportedFighter {
  readonly typeId: TypeId;
  readonly name: string;
  readonly kind: FighterKind;
  // Fighters across squadrons of this type; a group spans several squadrons when the count
  // exceeds the squadron max size.
  readonly count: number;
  readonly squadronMaxSize: number;
  readonly maxVelocity: number;
  readonly orbitRange: number;
  readonly signatureRadius: number;
  /** The fighter's own durability pools; undefined when the SDE entry lacks the attribute. */
  readonly shieldHp?: number;
  readonly armorHp?: number;
  readonly hullHp?: number;
  readonly refuelingTime: number;
  readonly volume: number;
  // Undefined for support fighters: they deal no damage and are not simulated.
  readonly attack?: ImportedFighterAttack;
  readonly damageBreakdown: DamageBreakdown;
}

export interface FighterOption {
  readonly id: TypeId;
  readonly name: string;
  readonly kind: FighterKind;
  readonly damage: number;
  readonly damageByType: Readonly<Partial<Record<DamageType, number>>>;
  readonly volume: number;
  readonly squadronMaxSize: number;
}

export interface FighterCatalog {
  fightersByKind(kind: FighterKind): readonly FighterOption[];
  has(fighter: TypeId): boolean;
  idForName(name: string): TypeId | undefined;
}

interface FighterCatalogDeps {
  readonly fittingDb: Pick<FittingDb, "fighters">;
}

export class FighterCatalogImpl implements FighterCatalog {
  private readonly fighters: Readonly<Record<string, FighterStats>>;

  constructor({ fittingDb }: FighterCatalogDeps) {
    this.fighters = fittingDb.fighters;
  }

  fightersByKind(kind: FighterKind): readonly FighterOption[] {
    const result: FighterOption[] = [];
    for (const stats of Object.values(this.fighters)) {
      if (stats.kind !== kind) continue;
      result.push(fighterOptionFromStats(stats));
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }

  has(fighter: TypeId): boolean {
    return this.fighters[fighter] !== undefined;
  }

  idForName(name: string): TypeId | undefined {
    for (const stats of Object.values(this.fighters)) {
      if (stats.name === name) return stats.id;
    }
    return undefined;
  }
}

function fighterOptionFromStats(stats: FighterStats): FighterOption {
  const damageByType: Partial<Record<DamageType, number>> = {};
  if (stats.attack?.emDamage) damageByType.em = stats.attack.emDamage;
  if (stats.attack?.thermalDamage) damageByType.thermal = stats.attack.thermalDamage;
  if (stats.attack?.kineticDamage) damageByType.kinetic = stats.attack.kineticDamage;
  if (stats.attack?.explosiveDamage) damageByType.explosive = stats.attack.explosiveDamage;
  const damage = (stats.attack?.emDamage ?? 0) + (stats.attack?.thermalDamage ?? 0) + (stats.attack?.kineticDamage ?? 0) + (stats.attack?.explosiveDamage ?? 0);
  return { id: stats.id, name: stats.name, kind: stats.kind, damage, damageByType, volume: stats.volume, squadronMaxSize: stats.squadronMaxSize };
}
