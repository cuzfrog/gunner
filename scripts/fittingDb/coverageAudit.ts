import type { SdeDogmaEffect, SdeType, SdeTypeDogma } from "./dogmaTypes";
import { classifyDefenseEffects, type DefenseIntent } from "./effectClassifier";
import {
  ARMOR_DAMAGE_AMOUNT,
  ARMOR_HP,
  SHIELD_BONUS,
  SHIELD_CAPACITY,
  SHIELD_RECHARGE_RATE,
  STRUCTURE_DAMAGE_AMOUNT,
  STRUCTURE_HP,
  RESISTANCE_SHIFT_AMOUNT,
  SHIELD_RESONANCE_ATTRS,
  ARMOR_RESONANCE_ATTRS,
  HULL_RESONANCE_ATTRS,
} from "./combatAttributes";

export type AuditFailureCategory =
  | "signatureWithoutStats"
  | "unclassifiedCombatModifier"
  | "generatedStatsMissingFields";

export interface AuditFailure {
  readonly typeId: number;
  readonly typeName: string;
  readonly category: AuditFailureCategory;
  readonly detail: string;
}

const DEFENSE_RELEVANT_ATTRS = new Set<number>([
  SHIELD_CAPACITY,
  ARMOR_HP,
  STRUCTURE_HP,
  SHIELD_RECHARGE_RATE,
  SHIELD_BONUS,
  ARMOR_DAMAGE_AMOUNT,
  STRUCTURE_DAMAGE_AMOUNT,
  RESISTANCE_SHIFT_AMOUNT,
  ...SHIELD_RESONANCE_ATTRS,
  ...ARMOR_RESONANCE_ATTRS,
  ...HULL_RESONANCE_ATTRS,
]);

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
}

export function auditCoverage(ctx: AuditContext): readonly AuditFailure[] {
  const failures: AuditFailure[] = [];
  for (const [idStr, type] of Object.entries(ctx.types)) {
    if (!type.published) continue;
    if (!ctx.moduleGroupIds.has(type.groupID)) continue;
    const typeId = type.typeID;
    const typeDogma = ctx.typedogmas[idStr];
    if (!typeDogma) continue;

    const effects = resolveEffects(typeDogma, ctx.dogmaEffects);
    const generated = ctx.generatedModules.get(typeId);
    const result = classifyDefenseEffects(effects, typeDogma);
    const defenseIntents = result.intents.filter((c) => DEFENSE_INTENT_TAGS.has(c.intent.tag));

    if (defenseIntents.length > 0 && (!generated || !generated.hasDefense)) {
      failures.push({
        typeId,
        typeName: type["typeName_en-us"],
        category: "signatureWithoutStats",
        detail: `Module has classifiable defense intents but no generated defense stats. Intents: ${defenseIntents.map((c) => `${c.effectId}:${c.intent.tag}`).join(", ")}`,
      });
    }

    for (const effect of effects) {
      const mods = effect.modifierInfo;
      if (!mods || mods.length === 0) continue;
      for (const m of mods) {
        if (m.func === "ItemModifier" && DEFENSE_RELEVANT_ATTRS.has(m.modifiedAttributeID)) {
          const singleResult = classifyDefenseEffects([effect], typeDogma);
          if (singleResult.intents.length === 0) {
            failures.push({
              typeId,
              typeName: type["typeName_en-us"],
              category: "unclassifiedCombatModifier",
              detail: `Effect ${effect.effectID} modifies defense-relevant attribute ${m.modifiedAttributeID} (op ${m.operation}) but was not classified`,
            });
          }
        }
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
