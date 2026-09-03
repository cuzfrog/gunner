import type { FittingDb, HullBonus, DefenseModuleStats } from "../gamedata/fittingDb";
import type { TypeId } from "../gamedata/ids";
import { type DefenseSkills, type ShipProfile, type SkillLevel, type StatConditions, defaultDefenseSkills } from "../ships";
import { type DamageResists, type DefenseLayer, type DefenseSpec, type RahSpec, type RepairerSpec, type StackingPenalty, DAMAGE_TYPES, ZERO_RESISTS } from "../sim";
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
    const skills = conditions.defenseSkills ?? defaultDefenseSkills(conditions.skillLevel);

    const shieldHp = resolveShieldHp(profile, modules, fitting.hullBonuses, skills, conditions.skillLevel);
    const armorHp = resolveArmorHp(profile, modules, fitting.hullBonuses, skills, conditions.skillLevel);
    const hullHp = resolveHullHp(profile, fitting.hullBonuses, skills, conditions.skillLevel);
    const shieldRechargeTime = resolveShieldRecharge(profile, modules, skills, this.stacking);

    const shieldResists = resolveLayerResists("shield", profile.shieldResists, modules, fitting.hullBonuses, skills, conditions.skillLevel, conditions.overloaded, this.stacking);
    const armorResists = resolveLayerResists("armor", profile.armorResists, modules, fitting.hullBonuses, skills, conditions.skillLevel, conditions.overloaded, this.stacking);
    const hullResists = resolveLayerResists("hull", profile.hullResists, modules, fitting.hullBonuses, skills, conditions.skillLevel, conditions.overloaded, this.stacking);

    const repairers = resolveRepairers(modules, skills, this.stacking);
    const signaturePenalty = resolveSignaturePenalty(modules);
    const rah = resolveRahSpec(modules, skills, armorResists);
    const shieldUniformity = resolveShieldUniformity(skills);

    return {
      layers: {
        shield: { hp: shieldHp, resists: shieldResists },
        armor: { hp: armorHp, resists: armorResists },
        hull: { hp: hullHp, resists: hullResists },
      },
      shieldRechargeTime,
      repairers,
      signaturePenalty,
      rah,
      shieldUniformity,
    };
  }
}

interface DefenseModuleEntry {
  readonly moduleId: TypeId;
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

function resolveShieldHp(profile: ShipProfile, modules: readonly DefenseModuleEntry[], hullBonuses: readonly HullBonus[], skills: DefenseSkills, skillLevel: SkillLevel): number {
  const shieldHpPercentMultiplier = hullBonusMultiplier(hullBonuses, "shieldHpPercent", skillLevel);
  let hp = profile.shieldHp * shieldHpPercentMultiplier;
  const extenderAdds: number[] = [];
  for (const mod of modules) {
    if (mod.stats.kind === "shieldExtender" && mod.stats.shieldHpAdd !== undefined) {
      extenderAdds.push(mod.stats.shieldHpAdd);
    }
  }
  const extenderTotal = extenderAdds.reduce((sum, add) => sum + add, 0);
  const extenderBonusMultiplier = hullBonusMultiplier(hullBonuses, "extenderHpPercent", skillLevel);
  hp += extenderTotal * extenderBonusMultiplier;
  const shieldManagementMultiplier = 1 + SHIELD_MANAGEMENT_BONUS * skills.shieldManagement;
  return roundHp(hp * shieldManagementMultiplier);
}

function resolveArmorHp(profile: ShipProfile, modules: readonly DefenseModuleEntry[], hullBonuses: readonly HullBonus[], skills: DefenseSkills, skillLevel: SkillLevel): number {
  const armorHpPercentMultiplier = hullBonusMultiplier(hullBonuses, "armorHpPercent", skillLevel);
  let hp = profile.armorHp * armorHpPercentMultiplier;
  const plateAdds: number[] = [];
  for (const mod of modules) {
    if (mod.stats.kind === "armorPlate" && mod.stats.armorHpAdd !== undefined) {
      plateAdds.push(mod.stats.armorHpAdd);
    }
  }
  const plateTotal = plateAdds.reduce((sum, add) => sum + add, 0);
  const plateBonusMultiplier = hullBonusMultiplier(hullBonuses, "plateHpPercent", skillLevel);
  hp += plateTotal * plateBonusMultiplier;
  const hullUpgradesMultiplier = 1 + HULL_UPGRADES_BONUS * skills.hullUpgrades;
  return roundHp(hp * hullUpgradesMultiplier);
}

function resolveHullHp(profile: ShipProfile, hullBonuses: readonly HullBonus[], skills: DefenseSkills, skillLevel: SkillLevel): number {
  const mechanicsMultiplier = 1 + MECHANICS_BONUS * skills.mechanics;
  const bulkheadMultiplier = hullBonusMultiplier(hullBonuses, "hullHpPercent", skillLevel);
  return roundHp(profile.hullHp * mechanicsMultiplier * bulkheadMultiplier);
}

function resolveShieldRecharge(profile: ShipProfile, modules: readonly DefenseModuleEntry[], skills: DefenseSkills, stacking: StackingPenalty): number {
  const rechargeMultipliers: number[] = [];
  for (const mod of modules) {
    if (mod.stats.kind === "rechargeModule" && mod.stats.rechargeMultiplier !== undefined) {
      rechargeMultipliers.push(mod.stats.rechargeMultiplier);
    }
  }
  const rechargeMultiplier = rechargeMultipliers.length > 0 ? stacking.apply(rechargeMultipliers) : 1;
  const shieldOperationMultiplier = 1 - SHIELD_OPERATION_BONUS * skills.shieldOperation;
  return profile.shieldRechargeTime * rechargeMultiplier * shieldOperationMultiplier;
}

function resolveLayerResists(
  layer: DefenseLayer,
  baseResists: DamageResists,
  modules: readonly DefenseModuleEntry[],
  hullBonuses: readonly HullBonus[],
  skills: DefenseSkills,
  skillLevel: SkillLevel,
  overloaded: boolean,
  stacking: StackingPenalty,
): DamageResists {
  const result: Record<keyof DamageResists, number> = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };
  for (const type of DAMAGE_TYPES) {
    result[type] = resolveResistForType(layer, type, baseResists[type], modules, hullBonuses, skills, skillLevel, overloaded, stacking);
  }
  return result;
}

function resolveResistForType(
  layer: DefenseLayer,
  type: keyof DamageResists,
  baseResist: number,
  modules: readonly DefenseModuleEntry[],
  hullBonuses: readonly HullBonus[],
  skills: DefenseSkills,
  skillLevel: SkillLevel,
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
        bonus = applyCompensationSkill(bonus, layer, type, skills);
      }
      hardenerMultipliers.push(1 - bonus);
    }
  }

  const hullBonusResistAttribute = layer === "armor" ? "armorResist" : layer === "shield" ? "shieldResist" : undefined;
  const hullBonusResist = hullBonusResistAttribute ? hullBonusMultiplier(hullBonuses, hullBonusResistAttribute, skillLevel) : 1;
  const stackedHardener = stacking.apply(hardenerMultipliers);
  const dcTerm = dcResonanceMultiplier ?? 1;
  const resonance = baseResonance * stackedHardener * dcTerm * hullBonusResist;
  return clampResist(1 - resonance);
}

function resolveRepairers(modules: readonly DefenseModuleEntry[], skills: DefenseSkills, stacking: StackingPenalty): readonly RepairerSpec[] {
  const repairers: RepairerSpec[] = [];
  const boostAmplifierMultiplier = resolveBoostAmplifierMultiplier(modules, stacking);
  for (const mod of modules) {
    const stats = mod.stats;
    if (stats.kind !== "repairer") continue;
    if (stats.amount === undefined || stats.cycleTime === undefined) continue;
    const layer = stats.layer ?? "shield";
    const amount = layer === "shield" ? stats.amount * boostAmplifierMultiplier : stats.amount;
    repairers.push({
      layer,
      amount,
      cycleTime: stats.cycleTime,
      capacitorNeed: stats.capacitorNeed ?? 0,
      heatDamage: stats.heatDamage ?? 0,
      overload: stats.overload ?? { amountMultiplier: 1, cycleTimeMultiplier: 1 },
      ancillary: stats.ancillary,
      moduleId: mod.moduleId,
    });
  }
  return repairers;
}

function resolveRahSpec(modules: readonly DefenseModuleEntry[], skills: DefenseSkills, armorResistsWithoutRah: DamageResists): RahSpec | undefined {
  const rahModule = modules.find((mod) => mod.stats.kind === "rah");
  if (!rahModule) return undefined;
  const stats = rahModule.stats;
  if (stats.kind !== "rah") return undefined;
  const baseResists = stats.baseArmorResists ?? ZERO_RESISTS;
  const shiftAmount = (stats.resistanceShiftAmount ?? 6) / 100;
  const rawCycleTime = stats.cycleTime ?? 10;
  const phasingReduction = 1 - ARMOR_RESISTANCE_PHASING_BONUS * skills.armorResistancePhasing;
  const cycleTime = rawCycleTime * phasingReduction;
  const overloadCycleTimeMultiplier = stats.overloadCycleTimeMultiplier ?? 1;
  return { cycleTime, shiftAmount, baseResists, overloadCycleTimeMultiplier, armorResistsWithoutRah, moduleId: rahModule.moduleId };
}

function hullBonusMultiplier(hullBonuses: readonly HullBonus[], attribute: string, skillLevel: number): number {
  let multiplier = 1;
  for (const bonus of hullBonuses) {
    if (bonus.attribute !== attribute) continue;
    const percent = bonus.magnitude * (bonus.scalesWithHullSkill ? skillLevel : 1);
    multiplier *= 1 + percent / 100;
  }
  return multiplier;
}

function applyCompensationSkill(bonus: number, layer: DefenseLayer, type: keyof DamageResists, skills: DefenseSkills): number {
  const skillLevel = compensationSkillLevel(layer, type, skills);
  return bonus * (1 + COMPENSATION_BONUS * skillLevel);
}

function compensationSkillLevel(layer: DefenseLayer, type: keyof DamageResists, skills: DefenseSkills): number {
  if (layer === "shield") {
    if (type === "em") return skills.shieldCompensationEm;
    if (type === "thermal") return skills.shieldCompensationThermal;
    if (type === "kinetic") return skills.shieldCompensationKinetic;
    return skills.shieldCompensationExplosive;
  }
  if (type === "em") return skills.armorCompensationEm;
  if (type === "thermal") return skills.armorCompensationThermal;
  if (type === "kinetic") return skills.armorCompensationKinetic;
  return skills.armorCompensationExplosive;
}

function resolveBoostAmplifierMultiplier(modules: readonly DefenseModuleEntry[], stacking: StackingPenalty): number {
  const multipliers: number[] = [];
  for (const mod of modules) {
    if (mod.stats.kind === "boostAmplifier" && mod.stats.multiplier !== undefined) {
      multipliers.push(mod.stats.multiplier);
    }
  }
  if (multipliers.length === 0) return 1;
  return stacking.apply(multipliers);
}

function resolveSignaturePenalty(modules: readonly DefenseModuleEntry[]): number {
  let penalty = 0;
  for (const mod of modules) {
    if (mod.stats.kind === "shieldExtender" && mod.stats.sigRadiusPenalty !== undefined) {
      penalty += mod.stats.sigRadiusPenalty;
    }
  }
  return penalty;
}

function resolveShieldUniformity(skills: DefenseSkills): number {
  return Math.max(0, SHIELD_UNIFORMITY_BASE - SHIELD_UNIFORMITY_PER_LEVEL * skills.tacticalShieldManipulation);
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
const SHIELD_OPERATION_BONUS = 0.05;
const HULL_UPGRADES_BONUS = 0.05;
const MECHANICS_BONUS = 0.05;
const COMPENSATION_BONUS = 0.05;
const ARMOR_RESISTANCE_PHASING_BONUS = 0.1;
const SHIELD_UNIFORMITY_BASE = 0.25;
const SHIELD_UNIFORMITY_PER_LEVEL = 0.05;
