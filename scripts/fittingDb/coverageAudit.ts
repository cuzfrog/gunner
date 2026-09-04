import type { SdeDogmaEffect, SdeType, SdeTypeDogma } from "./dogmaTypes";
import { FUNC_ITEM_MODIFIER, FUNC_LOCATION_GROUP, FUNC_LOCATION_REQUIRED_SKILL } from "./dogmaTypes";
import { classifyDefenseEffects, classifyCombatEffect } from "./effectClassifier";
import {
  ARMOR_DAMAGE_AMOUNT,
  ARMOR_HP,
  DURATION,
  RESISTANCE_SHIFT_AMOUNT,
  SHIELD_BONUS,
  SHIELD_CAPACITY,
  SHIELD_RECHARGE_RATE,
  STRUCTURE_DAMAGE_AMOUNT,
  STRUCTURE_HP,
  SHIELD_RESONANCE_ATTRS,
  ARMOR_RESONANCE_ATTRS,
  HULL_RESONANCE_ATTRS,
  TURRET_DAMAGE_MULTIPLIER,
  TURRET_SPEED,
  MISSILE_DAMAGE_MULTIPLIER,
  MISSILE_LAUNCHER_OPERATION_SKILL,
  TURRET_WEAPON_GROUP_IDS,
} from "./combatAttributes";

const ARMOR_HP_BONUS = 335;
const SHIELD_CAPACITY_BONUS = 337;
const HULL_HP_BONUS = 327;
const ARMOR_HP_MULTIPLIER = 148;
const SHIELD_CAPACITY_MULTIPLIER = 146;
const STRUCTURE_HP_MULTIPLIER = 150;
const CAPACITY_BONUS = 72;
const ARMOR_HP_BONUS_ADD = 1159;
const EM_DAMAGE_RESISTANCE_BONUS = 984;
const EXPLOSIVE_DAMAGE_RESISTANCE_BONUS = 985;
const KINETIC_DAMAGE_RESISTANCE_BONUS = 986;
const THERMAL_DAMAGE_RESISTANCE_BONUS = 987;
const SHIELD_RECHARGE_RATE_MULTIPLIER = 134;

export type AuditFailureCategory =
  | "signatureWithoutStats"
  | "unclassifiedCombatModifier"
  | "defenseAttrWithoutIntent";

export interface AuditFailure {
  readonly typeId: number;
  readonly typeName: string;
  readonly category: AuditFailureCategory;
  readonly detail: string;
}

const DEFENSE_TARGET_ATTRS = new Set<number>([
  SHIELD_CAPACITY,
  ARMOR_HP,
  STRUCTURE_HP,
  SHIELD_RECHARGE_RATE,
  ...SHIELD_RESONANCE_ATTRS,
  ...ARMOR_RESONANCE_ATTRS,
  ...HULL_RESONANCE_ATTRS,
]);

const AMPLIFIER_TARGET_ATTRS = new Set<number>([
  SHIELD_BONUS,
  ARMOR_DAMAGE_AMOUNT,
  DURATION,
]);

const ACTION_DEFENSE_ATTRS = new Set<number>([
  SHIELD_BONUS,
  ARMOR_DAMAGE_AMOUNT,
  STRUCTURE_DAMAGE_AMOUNT,
  RESISTANCE_SHIFT_AMOUNT,
]);

const BUILDER_INPUT_ATTRS = new Set<number>([
  ARMOR_HP_BONUS,
  SHIELD_CAPACITY_BONUS,
  HULL_HP_BONUS,
  ARMOR_HP_MULTIPLIER,
  SHIELD_CAPACITY_MULTIPLIER,
  STRUCTURE_HP_MULTIPLIER,
  CAPACITY_BONUS,
  ARMOR_HP_BONUS_ADD,
  EM_DAMAGE_RESISTANCE_BONUS,
  EXPLOSIVE_DAMAGE_RESISTANCE_BONUS,
  KINETIC_DAMAGE_RESISTANCE_BONUS,
  THERMAL_DAMAGE_RESISTANCE_BONUS,
  SHIELD_RECHARGE_RATE_MULTIPLIER,
  ...SHIELD_RESONANCE_ATTRS,
  ...ARMOR_RESONANCE_ATTRS,
  ...HULL_RESONANCE_ATTRS,
  SHIELD_BONUS,
  ARMOR_DAMAGE_AMOUNT,
  STRUCTURE_DAMAGE_AMOUNT,
  RESISTANCE_SHIFT_AMOUNT,
  SHIELD_RECHARGE_RATE,
  DURATION,
]);

const TURRET_COMBAT_ATTRS = new Set<number>([TURRET_DAMAGE_MULTIPLIER, TURRET_SPEED]);
const MISSILE_COMBAT_ATTRS = new Set<number>([MISSILE_DAMAGE_MULTIPLIER, TURRET_SPEED]);

const DEFENSE_INTENT_TAGS = new Set<string>([
  "resist",
  "damageControl",
  "hpFlat",
  "hpPercent",
  "hullBulkheadMultiplier",
  "recharge",
  "rechargePercent",
  "repairer",
  "rah",
  "boostAmplifier",
  "repairAmplifier",
]);

export interface AuditModuleEntry {
  readonly typeId: number;
  readonly typeName: string;
  readonly hasDefense: boolean;
}

export interface AuditContext {
  readonly types: Readonly<Record<string, SdeType>>;
  readonly typedogmas: Readonly<Record<string, SdeTypeDogma>>;
  readonly dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>;
  readonly moduleGroupIds: ReadonlySet<number>;
  readonly generatedModules: ReadonlyMap<number, AuditModuleEntry>;
  readonly exemptTypeIds?: ReadonlySet<number>;
}

export function auditCoverage(ctx: AuditContext): readonly AuditFailure[] {
  const failures: AuditFailure[] = [];
  for (const [idStr, type] of Object.entries(ctx.types)) {
    if (!type.published) continue;
    if (!ctx.moduleGroupIds.has(type.groupID)) continue;
    const typeId = type.typeID;
    if (ctx.exemptTypeIds?.has(typeId)) continue;
    const typeDogma = ctx.typedogmas[idStr];
    if (!typeDogma) continue;

    const effects = resolveEffects(typeDogma, ctx.dogmaEffects);
    const generated = ctx.generatedModules.get(typeId);
    const result = classifyDefenseEffects(effects, typeDogma);
    const defenseIntents = result.intents.filter((c) => DEFENSE_INTENT_TAGS.has(c.intent.tag));

    if (defenseIntents.length > 0 && (!generated || !generated.hasDefense)) {
      const hasBuilderInput = typeDogma.dogmaAttributes.some((a) => BUILDER_INPUT_ATTRS.has(a.attributeID));
      if (hasBuilderInput) {
        failures.push({
          typeId,
          typeName: type["typeName_en-us"],
          category: "signatureWithoutStats",
          detail: `Module has classifiable defense intents but no generated defense stats. Intents: ${defenseIntents.map((c) => `${c.effectId}:${c.intent.tag}`).join(", ")}`,
        });
      }
    }

    for (const effect of effects) {
      const mods = effect.modifierInfo;
      if (!mods || mods.length === 0) continue;
      for (const m of mods) {
        if (m.func === FUNC_ITEM_MODIFIER && DEFENSE_TARGET_ATTRS.has(m.modifiedAttributeID)) {
          const singleResult = classifyDefenseEffects([effect], typeDogma);
          if (singleResult.intents.length === 0) {
            failures.push({
              typeId,
              typeName: type["typeName_en-us"],
              category: "unclassifiedCombatModifier",
              detail: `Effect ${effect.effectID} ItemModifier modifies defense-relevant attribute ${m.modifiedAttributeID} (op ${m.operation}) but was not classified`,
            });
          }
        }
        if (m.func === FUNC_LOCATION_REQUIRED_SKILL && AMPLIFIER_TARGET_ATTRS.has(m.modifiedAttributeID)) {
          const singleResult = classifyDefenseEffects([effect], typeDogma);
          if (singleResult.intents.length === 0) {
            failures.push({
              typeId,
              typeName: type["typeName_en-us"],
              category: "unclassifiedCombatModifier",
              detail: `Effect ${effect.effectID} LocationRequiredSkillModifier modifies amplifier attribute ${m.modifiedAttributeID} (op ${m.operation}, skill ${m.skillTypeID}) but was not classified`,
            });
          }
        }
        if (m.func === FUNC_LOCATION_GROUP && m.groupID !== undefined && TURRET_WEAPON_GROUP_IDS.has(m.groupID) && TURRET_COMBAT_ATTRS.has(m.modifiedAttributeID)) {
          const combatIntent = classifyCombatEffect(effect, typeDogma);
          if (!combatIntent) {
            failures.push({
              typeId,
              typeName: type["typeName_en-us"],
              category: "unclassifiedCombatModifier",
              detail: `Effect ${effect.effectID} LocationGroupModifier modifies turret attribute ${m.modifiedAttributeID} (op ${m.operation}, group ${m.groupID}) but was not classified`,
            });
          }
        }
        if (m.func === FUNC_ITEM_MODIFIER && MISSILE_COMBAT_ATTRS.has(m.modifiedAttributeID)) {
          const combatIntent = classifyCombatEffect(effect, typeDogma);
          if (!combatIntent) {
            failures.push({
              typeId,
              typeName: type["typeName_en-us"],
              category: "unclassifiedCombatModifier",
              detail: `Effect ${effect.effectID} ItemModifier modifies missile attribute ${m.modifiedAttributeID} (op ${m.operation}) but was not classified`,
            });
          }
        }
        if (m.func === FUNC_LOCATION_REQUIRED_SKILL && m.modifiedAttributeID === TURRET_SPEED && m.skillTypeID === MISSILE_LAUNCHER_OPERATION_SKILL) {
          const combatIntent = classifyCombatEffect(effect, typeDogma);
          if (!combatIntent) {
            failures.push({
              typeId,
              typeName: type["typeName_en-us"],
              category: "unclassifiedCombatModifier",
              detail: `Effect ${effect.effectID} LocationRequiredSkillModifier modifies missile speed attribute ${m.modifiedAttributeID} (op ${m.operation}, skill ${m.skillTypeID}) but was not classified`,
            });
          }
        }
      }
    }

    const actionAttrPresent = typeDogma.dogmaAttributes.some((a) => ACTION_DEFENSE_ATTRS.has(a.attributeID));
    if (actionAttrPresent) {
      const hasActionIntent = result.intents.some((c) => c.intent.tag === "repairer" || c.intent.tag === "rah");
      if (!hasActionIntent) {
        failures.push({
          typeId,
          typeName: type["typeName_en-us"],
          category: "defenseAttrWithoutIntent",
          detail: `Module has defense action attributes (shieldBonus/armorDamageAmount/structureDamageAmount/resistanceShiftAmount) but no repairer or rah intent was classified`,
        });
      }
    }
  }
  return failures;
}

function resolveEffects(typeDogma: SdeTypeDogma, dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>): readonly SdeDogmaEffect[] {
  const result: SdeDogmaEffect[] = [];
  for (const { effectID } of typeDogma.dogmaEffects) {
    const e = dogmaEffects[String(effectID)];
    if (e) result.push(e);
  }
  return result;
}
