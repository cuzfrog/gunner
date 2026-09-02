import type { FittingDb, FittingModuleStats, HullBonus, DefenseModuleStats } from "../gamedata/fittingDb";
import type { ShipProfile, StatConditions } from "../ships";
import type { DamageResists, DefenseLayer, DefenseSpec, RepairerSpec, StackingPenalty } from "../sim";
import { DAMAGE_TYPES } from "../sim";
import type { FittingState } from "./fittingState";

export interface DefenseCalculator {
  resolve(fitting: FittingState, conditions: StatConditions): DefenseSpec;
}

interface DefenseCalculatorDeps {
  readonly fittingDb: FittingDb;
  readonly stackingPenalty: StackingPenalty;
}

export class DefenseCalculatorImpl implements DefenseCalculator {
  private readonly db: FittingDb;
  private readonly stacking: StackingPenalty;

  constructor({ fittingDb, stackingPenalty }: DefenseCalculatorDeps) {
    this.db = fittingDb;
    this.stacking = stackingPenalty;
  }

  resolve(fitting: FittingState, conditions: StatConditions): DefenseSpec {
    const profile = fitting.profile;
    const modules = collectDefenseModules(this.db, fitting);
    const skillLevel = conditions.skillLevel;

    const shieldHp = resolveShieldHp(profile, modules, fitting.hullBonuses, skillLevel);
    const armorHp = resolveArmorHp(profile, modules, fitting.hullBonuses, skillLevel);
    const hullHp = resolveHullHp(profile, fitting.hullBonuses, skillLevel);
    const shieldRechargeTime = resolveShieldRecharge(profile, modules);

    const shieldResists = resolveLayerResists("shield", profile.shieldResists, modules, fitting.hullBonuses, skillLevel, conditions.overloaded, this.stacking);
    const armorResists = resolveLayerResists("armor", profile.armorResists, modules, fitting.hullBonuses, skillLevel, conditions.overloaded, this.stacking);
    const hullResists = resolveLayerResists("hull", profile.hullResists, modules, fitting.hullBonuses, skillLevel, conditions.overloaded, this.stacking);

    const repairers = resolveRepairers(modules, conditions);

    return {
      layers: {
        shield: { hp: shieldHp, resists: shieldResists },
        armor: { hp: armorHp, resists: armorResists },
        hull: { hp: hullHp, resists: hullResists },
      },
      shieldRechargeTime,
      repairers,
    };
  }
}

interface DefenseModuleEntry {
  readonly moduleId: string;
  readonly stats: DefenseModuleStats;
}

function collectDefenseModules(db: FittingDb, fitting: FittingState): readonly DefenseModuleEntry[] {
  const entries: DefenseModuleEntry[] = [];
  for (const mod of fitting.defenseModules) {
    const stats = db.modules[mod.moduleId];
    if (!stats?.defense) continue;
    entries.push({ moduleId: mod.moduleId, stats: stats.defense });
  }
  return entries;
}

function resolveShieldHp(profile: ShipProfile, modules: readonly DefenseModuleEntry[], hullBonuses: readonly HullBonus[], skillLevel: number): number {
  let hp = profile.shieldHp;
  const extenderAdds: number[] = [];
  for (const mod of modules) {
    if (mod.stats.kind === "shieldExtender" && mod.stats.shieldHpAdd !== undefined) {
      extenderAdds.push(mod.stats.shieldHpAdd);
    }
  }
  const extenderTotal = extenderAdds.reduce((sum, add) => sum + add, 0);
  const extenderBonusMultiplier = hullBonusMultiplier(hullBonuses, "extenderHpPercent", skillLevel);
  hp += extenderTotal * extenderBonusMultiplier;
  const shieldManagementMultiplier = 1 + SHIELD_MANAGEMENT_BONUS * skillLevel;
  return roundHp(hp * shieldManagementMultiplier);
}

function resolveArmorHp(profile: ShipProfile, modules: readonly DefenseModuleEntry[], hullBonuses: readonly HullBonus[], skillLevel: number): number {
  let hp = profile.armorHp;
  const plateAdds: number[] = [];
  for (const mod of modules) {
    if (mod.stats.kind === "armorPlate" && mod.stats.armorHpAdd !== undefined) {
      plateAdds.push(mod.stats.armorHpAdd);
    }
  }
  const plateTotal = plateAdds.reduce((sum, add) => sum + add, 0);
  const plateBonusMultiplier = hullBonusMultiplier(hullBonuses, "plateHpPercent", skillLevel);
  hp += plateTotal * plateBonusMultiplier;
  const hullUpgradesMultiplier = 1 + HULL_UPGRADES_BONUS * skillLevel;
  return roundHp(hp * hullUpgradesMultiplier);
}

function resolveHullHp(profile: ShipProfile, hullBonuses: readonly HullBonus[], skillLevel: number): number {
  const mechanicsMultiplier = 1 + MECHANICS_BONUS * skillLevel;
  const bulkheadMultiplier = hullBonusMultiplier(hullBonuses, "hullHpPercent", skillLevel);
  return roundHp(profile.hullHp * mechanicsMultiplier * bulkheadMultiplier);
}

function resolveShieldRecharge(profile: ShipProfile, modules: readonly DefenseModuleEntry[]): number {
  let multiplier = 1;
  for (const mod of modules) {
    if (mod.stats.kind === "rechargeModule" && mod.stats.rechargeMultiplier !== undefined) {
      multiplier *= mod.stats.rechargeMultiplier;
    }
  }
  return profile.shieldRechargeTime * multiplier;
}

function resolveLayerResists(
  layer: DefenseLayer,
  baseResists: DamageResists,
  modules: readonly DefenseModuleEntry[],
  hullBonuses: readonly HullBonus[],
  skillLevel: number,
  overloaded: boolean,
  stacking: StackingPenalty,
): DamageResists {
  const result: Record<keyof DamageResists, number> = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };
  for (const type of DAMAGE_TYPES) {
    result[type] = resolveResistForType(layer, type, baseResists[type], modules, hullBonuses, skillLevel, overloaded, stacking);
  }
  return result;
}

function resolveResistForType(
  layer: DefenseLayer,
  type: keyof DamageResists,
  baseResist: number,
  modules: readonly DefenseModuleEntry[],
  hullBonuses: readonly HullBonus[],
  skillLevel: number,
  overloaded: boolean,
  stacking: StackingPenalty,
): number {
  const baseResonance = 1 - baseResist;
  const hardenerMultipliers: number[] = [];
  let dcResonanceMultiplier: number | undefined;

  for (const mod of modules) {
    const stats = mod.stats;
    if (stats.kind === "damageControl") {
      const layerResists = layer === "shield" ? stats.shieldResists : layer === "armor" ? stats.armorResists : stats.hullResists;
      if (layerResists) {
        const dcResist = layerResists[type];
        dcResonanceMultiplier = (dcResonanceMultiplier ?? 1) * (1 - dcResist);
      }
    } else if (stats.kind === "resistModule" && stats.layer === layer && stats.resistBonus) {
      let bonus = stats.resistBonus[type];
      if (overloaded && stats.overloadBonusMultiplier !== undefined) {
        bonus = bonus * stats.overloadBonusMultiplier;
      }
      if (!stats.active) {
        bonus = applyCompensationSkill(bonus, layer, skillLevel);
      }
      hardenerMultipliers.push(1 - bonus);
    } else if (stats.kind === "rah" && layer === "armor") {
      const baseArmorResists = stats.baseArmorResists;
      if (baseArmorResists) {
        const rahResist = baseArmorResists[type];
        hardenerMultipliers.push(1 - rahResist);
      }
    }
  }

  const armorResistHullBonus = layer === "armor" ? hullBonusResistMultiplier(hullBonuses, skillLevel) : 1;
  const stackedHardener = stacking.apply(hardenerMultipliers);
  const dcTerm = dcResonanceMultiplier ?? 1;
  const resonance = baseResonance * stackedHardener * dcTerm * armorResistHullBonus;
  return clampResist(1 - resonance);
}

function resolveRepairers(modules: readonly DefenseModuleEntry[], conditions: StatConditions): readonly RepairerSpec[] {
  const repairers: RepairerSpec[] = [];
  for (const mod of modules) {
    const stats = mod.stats;
    if (stats.kind !== "repairer") continue;
    if (stats.amount === undefined || stats.cycleTime === undefined) continue;
    const overload = conditions.overloaded && stats.overload ? stats.overload : { amountMultiplier: 1, cycleTimeMultiplier: 1 };
    repairers.push({
      layer: stats.layer ?? "shield",
      amount: stats.amount,
      cycleTime: stats.cycleTime,
      capacitorNeed: stats.capacitorNeed ?? 0,
      heatDamage: stats.heatDamage ?? 0,
      overload,
      ancillary: stats.ancillary,
    });
  }
  return repairers;
}

function hullBonusMultiplier(hullBonuses: readonly HullBonus[], attribute: string, skillLevel: number): number {
  let multiplier = 1;
  for (const bonus of hullBonuses) {
    if (bonus.attribute !== attribute) continue;
    const percent = bonus.magnitude * (bonus.skill ? skillLevel : 1);
    multiplier *= 1 + percent / 100;
  }
  return multiplier;
}

function hullBonusResistMultiplier(hullBonuses: readonly HullBonus[], skillLevel: number): number {
  let multiplier = 1;
  for (const bonus of hullBonuses) {
    if (bonus.attribute !== "armorResist") continue;
    const percent = bonus.magnitude * (bonus.skill ? skillLevel : 1);
    multiplier *= 1 + percent / 100;
  }
  return multiplier;
}

function applyCompensationSkill(bonus: number, layer: DefenseLayer, skillLevel: number): number {
  const skillBonus = layer === "shield" ? SHIELD_COMPENSATION_BONUS : ARMOR_COMPENSATION_BONUS;
  return bonus * (1 + skillBonus * skillLevel);
}

function clampResist(resist: number): number {
  if (resist < 0) return 0;
  if (resist > 1) return 1;
  return Math.round(resist * 1e6) / 1e6;
}

function roundHp(hp: number): number {
  return Math.round(hp);
}

const SHIELD_MANAGEMENT_BONUS = 0.05;
const HULL_UPGRADES_BONUS = 0.05;
const MECHANICS_BONUS = 0.05;
const SHIELD_COMPENSATION_BONUS = 0.05;
const ARMOR_COMPENSATION_BONUS = 0.05;
