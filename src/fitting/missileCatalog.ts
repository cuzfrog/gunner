import type { TypeId } from "../gamedata/ids";
import type { FittingDb, HullBonus, LauncherStats, MissileStats } from "../gamedata/fittingDb";
import type { SkillLevel } from "../ships";
import type { ImportedLauncher } from "./chargeCatalog";
import type { MissileSkillModel } from "./missileStats";
import { type DamageFactor, missileDamageByType } from "./damageBreakdown";

export interface MissileOption {
  readonly id: TypeId;
  readonly name: string;
  readonly damage: number;
  readonly damageType: "em" | "thermal" | "kinetic" | "explosive";
}

export interface MissileCatalog {
  missilesForLauncher(launcher: LauncherStats): readonly MissileOption[];
  usualForLauncher(launcher: LauncherStats): TypeId | undefined;
  withCharge(launcher: ImportedLauncher, missileId: TypeId, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): ImportedLauncher;
  equivalentInGroups(missile: TypeId, chargeGroups: readonly number[]): TypeId | undefined;
  has(missile: TypeId): boolean;
  idForName(name: string): TypeId | undefined;
}

interface MissileCatalogDeps {
  readonly fittingDb: Pick<FittingDb, "missiles" | "launchers">;
  readonly missileSkillModel: MissileSkillModel;
}

export class MissileCatalogImpl implements MissileCatalog {
  private readonly missiles: Readonly<Record<string, MissileStats>>;
  private readonly launchers: Readonly<Record<string, LauncherStats>>;
  private readonly skillModel: MissileSkillModel;

  constructor({ fittingDb, missileSkillModel }: MissileCatalogDeps) {
    this.missiles = fittingDb.missiles;
    this.launchers = fittingDb.launchers;
    this.skillModel = missileSkillModel;
  }

  missilesForLauncher(launcher: LauncherStats): readonly MissileOption[] {
    return _missilesForLauncher(this.missiles, launcher);
  }

  usualForLauncher(launcher: LauncherStats): TypeId | undefined {
    const options = this.missilesForLauncher(launcher);
    return options.length > 0 ? options[0].id : undefined;
  }

  withCharge(launcher: ImportedLauncher, missileId: TypeId, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): ImportedLauncher {
    const missile = this.missiles[missileId];
    if (!missile) return launcher;
    const launcherStats = this.launchers[launcher.moduleId];
    if (!launcherStats || !launcherStats.chargeGroups.includes(missile.chargeGroup)) return launcher;
    const output = this.skillModel.compute(launcherStats, missile, hullBonuses, skillLevel);
    const factors = rebuildMissileFactors(output.skillDamageMultiplier, output.skillDamageId, output.hullDamageMultiplier, launcher.name);
    return {
      moduleId: launcher.moduleId,
      name: launcher.name,
      count: launcher.count,
      chargeId: missileId,
      chargeName: missile.name,
      damagePerMissile: output.damagePerMissile,
      cycleTime: output.cycleTime,
      explosionRadius: output.explosionRadius,
      explosionVelocity: output.explosionVelocity,
      damageReductionFactor: output.damageReductionFactor,
      maxVelocity: output.maxVelocity,
      flightTime: output.flightTime,
      damageBreakdown: { damageByType: missileDamageByType(missile), factors },
    };
  }

  has(missile: TypeId): boolean {
    return this.missiles[missile] !== undefined;
  }

  equivalentInGroups(missile: TypeId, chargeGroups: readonly number[]): TypeId | undefined {
    return _equivalentInGroups(this.missiles, missile, chargeGroups);
  }

  idForName(name: string): TypeId | undefined {
    for (const stats of Object.values(this.missiles)) {
      if (stats.name === name) return stats.id;
    }
    return undefined;
  }
}

function _missilesForLauncher(missiles: Readonly<Record<string, MissileStats>>, launcher: LauncherStats): MissileOption[] {
  const result: MissileOption[] = [];
  for (const stats of Object.values(missiles)) {
    if (!launcher.chargeGroups.includes(stats.chargeGroup)) continue;
    result.push({ id: stats.id, name: stats.name, damage: stats.damage, damageType: stats.damageType });
  }
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

const MISSILE_SIZE_SUFFIXES: readonly string[] = [
  "Heavy Assault Missile", "XL Cruise Missile", "Cruise Missile", "Heavy Missile",
  "Light Missile", "XL Torpedo", "Torpedo", "Rocket",
] as const;

const VARIANT_ALIASES: Readonly<Record<string, string>> = {
  Rage: "Fury",
  Javelin: "Precision",
} as const;

const VARIANT_NAMES: readonly string[] = ["Fury", "Precision", "Rage", "Javelin"];

function _equivalentInGroups(
  missiles: Readonly<Record<string, MissileStats>>,
  missile: TypeId,
  chargeGroups: readonly number[],
): TypeId | undefined {
  const current = missiles[missile];
  if (!current) return undefined;
  const stem = missileStem(current.name);
  if (!stem) return undefined;
  const groupSet = new Set(chargeGroups);
  for (const candidate of Object.values(missiles)) {
    if (!groupSet.has(candidate.chargeGroup)) continue;
    if (missileStem(candidate.name) === stem) return candidate.id;
  }
  const base = baseStem(stem);
  if (base !== stem) {
    for (const candidate of Object.values(missiles)) {
      if (!groupSet.has(candidate.chargeGroup)) continue;
      if (missileStem(candidate.name) === base) return candidate.id;
    }
  }
  return undefined;
}

function missileStem(name: string): string | undefined {
  for (const suffix of MISSILE_SIZE_SUFFIXES) {
    if (!name.endsWith(suffix)) continue;
    return normalizeVariant(name.slice(0, -suffix.length).trim());
  }
  return undefined;
}

function normalizeVariant(stem: string): string {
  for (const [alias, canonical] of Object.entries(VARIANT_ALIASES)) {
    if (stem.endsWith(alias)) return stem.slice(0, -alias.length) + canonical;
  }
  return stem;
}

function baseStem(stem: string): string {
  for (const variant of VARIANT_NAMES) {
    if (stem.endsWith(variant)) return stem.slice(0, -variant.length).trim();
  }
  return stem;
}

function rebuildMissileFactors(skillDamageMultiplier: number, skillId: TypeId, hullDamageMultiplier: number, hullName: string): readonly DamageFactor[] {
  const factors: DamageFactor[] = [{ kind: "base", multiplier: 1 }];
  if (skillDamageMultiplier !== 1) factors.push({ kind: "skill", multiplier: skillDamageMultiplier, skillIds: [skillId] });
  if (hullDamageMultiplier !== 1) factors.push({ kind: "hull", multiplier: hullDamageMultiplier, hullName });
  return factors;
}
