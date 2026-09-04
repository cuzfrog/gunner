import type { SdeDogmaEffect, SdeDogmaEffectModifier, SdeTypeDogma } from "./dogmaTypes";
import { FUNC_ITEM_MODIFIER, FUNC_LOCATION_REQUIRED_SKILL, OPERATION_ADD, OPERATION_POST_PERCENT, OPERATION_POST_PERCENT_DIV } from "./dogmaTypes";
import {
  ARMOR_DAMAGE_AMOUNT,
  DURATION,
  RESISTANCE_SHIFT_AMOUNT,
  SHIELD_BONUS,
  SHIELD_RECHARGE_RATE,
  STRUCTURE_DAMAGE_AMOUNT,
  DefenseLayer,
  hpLayerForAttr,
  resistLayerForAttr,
} from "./combatAttributes";

export type DefenseIntent =
  | { readonly tag: "resist"; readonly layer: DefenseLayer; readonly active: boolean }
  | { readonly tag: "damageControl" }
  | { readonly tag: "hpFlat"; readonly layer: "shield" | "armor" }
  | { readonly tag: "hpPercent"; readonly layer: DefenseLayer }
  | { readonly tag: "hullBulkheadMultiplier" }
  | { readonly tag: "recharge" }
  | { readonly tag: "rechargePercent" }
  | { readonly tag: "repairer"; readonly layer: DefenseLayer; readonly ancillary: boolean }
  | { readonly tag: "rah" }
  | { readonly tag: "boostAmplifier" }
  | { readonly tag: "repairAmplifier"; readonly sub: "amount" | "cycleTime" };

export interface ClassifiedEffect {
  readonly effectId: number;
  readonly intent: DefenseIntent;
}

export interface ClassifierResult {
  readonly intents: readonly ClassifiedEffect[];
  readonly unclassified: readonly { readonly effectId: number; readonly reason: string }[];
}

export function classifyDefenseEffects(
  effects: readonly SdeDogmaEffect[],
  typeDogma: SdeTypeDogma | undefined,
): ClassifierResult {
  const classified: ClassifiedEffect[] = [];
  const unclassified: { effectId: number; reason: string }[] = [];
  for (const effect of effects) {
    const intent = classifySingleEffect(effect, typeDogma);
    if (intent !== undefined) {
      classified.push({ effectId: effect.effectID, intent });
    }
  }
  return { intents: classified, unclassified };
}

function classifySingleEffect(effect: SdeDogmaEffect, typeDogma: SdeTypeDogma | undefined): DefenseIntent | undefined {
  const modifiers = effect.modifierInfo;
  if (modifiers && modifiers.length > 0) {
    return classifyModifierEffect(effect, modifiers);
  }
  return classifyActionEffect(effect, typeDogma);
}

function classifyModifierEffect(effect: SdeDogmaEffect, modifiers: readonly SdeDogmaEffectModifier[]): DefenseIntent | undefined {
  const itemMods = modifiers.filter((m) => m.func === FUNC_ITEM_MODIFIER);
  const skillMods = modifiers.filter((m) => m.func === FUNC_LOCATION_REQUIRED_SKILL);

  if (itemMods.length > 0) {
    const resistIntent = classifyResistModifiers(itemMods, effect.effectCategory);
    if (resistIntent) return resistIntent;

    const hpIntent = classifyHpModifiers(itemMods);
    if (hpIntent) return hpIntent;

    const rechargeIntent = classifyRechargeModifiers(itemMods);
    if (rechargeIntent) return rechargeIntent;
  }

  if (skillMods.length > 0) {
    const amplifierIntent = classifyAmplifierModifiers(skillMods);
    if (amplifierIntent) return amplifierIntent;
  }

  return undefined;
}

function classifyResistModifiers(modifiers: readonly SdeDogmaEffectModifier[], effectCategory: number): DefenseIntent | undefined {
  const layers = new Set<DefenseLayer>();
  for (const m of modifiers) {
    const layer = resistLayerForAttr(m.modifiedAttributeID);
    if (layer) layers.add(layer);
  }
  if (layers.size === 0) return undefined;

  if (layers.has("shield") && layers.has("armor") && layers.has("hull")) {
    return { tag: "damageControl" };
  }

  if (layers.size === 1) {
    const layer = [...layers][0];
    const active = effectCategory === 1;
    return { tag: "resist", layer, active };
  }

  if (layers.has("armor") && layers.has("hull") && !layers.has("shield")) {
    const active = effectCategory === 1;
    return { tag: "resist", layer: "armor", active };
  }

  return undefined;
}

function classifyHpModifiers(modifiers: readonly SdeDogmaEffectModifier[]): DefenseIntent | undefined {
  for (const m of modifiers) {
    const layer = hpLayerForAttr(m.modifiedAttributeID);
    if (!layer) continue;
    if (m.operation === OPERATION_ADD) {
      if (layer === "hull") return undefined;
      return { tag: "hpFlat", layer: layer as "shield" | "armor" };
    }
    if (m.operation === OPERATION_POST_PERCENT) {
      return { tag: "hpPercent", layer };
    }
    if (m.operation === OPERATION_POST_PERCENT_DIV && layer === "hull") {
      return { tag: "hullBulkheadMultiplier" };
    }
  }
  return undefined;
}

function classifyRechargeModifiers(modifiers: readonly SdeDogmaEffectModifier[]): DefenseIntent | undefined {
  for (const m of modifiers) {
    if (m.modifiedAttributeID !== SHIELD_RECHARGE_RATE) continue;
    if (m.operation === OPERATION_POST_PERCENT_DIV) return { tag: "recharge" };
    if (m.operation === OPERATION_POST_PERCENT) return { tag: "rechargePercent" };
  }
  return undefined;
}

function classifyAmplifierModifiers(modifiers: readonly SdeDogmaEffectModifier[]): DefenseIntent | undefined {
  for (const m of modifiers) {
    if (m.modifiedAttributeID === SHIELD_BONUS && m.operation === OPERATION_POST_PERCENT) {
      return { tag: "boostAmplifier" };
    }
    if (m.modifiedAttributeID === ARMOR_DAMAGE_AMOUNT && m.operation === OPERATION_POST_PERCENT) {
      return { tag: "repairAmplifier", sub: "amount" };
    }
    if (m.modifiedAttributeID === DURATION && m.operation === OPERATION_POST_PERCENT) {
      return { tag: "repairAmplifier", sub: "cycleTime" };
    }
  }
  return undefined;
}

function classifyActionEffect(effect: SdeDogmaEffect, typeDogma: SdeTypeDogma | undefined): DefenseIntent | undefined {
  if (!typeDogma) return undefined;
  const attrIds = new Set<number>();
  for (const a of typeDogma.dogmaAttributes) attrIds.add(a.attributeID);

  if (attrIds.has(RESISTANCE_SHIFT_AMOUNT)) {
    return { tag: "rah" };
  }

  if (attrIds.has(SHIELD_BONUS) && (effect.effectCategory === 1 || effect.effectCategory === 2)) {
    const ancillary = isAncillaryEffect(effect);
    return { tag: "repairer", layer: "shield", ancillary };
  }
  if (attrIds.has(ARMOR_DAMAGE_AMOUNT) && effect.effectCategory === 1) {
    const ancillary = isAncillaryEffect(effect);
    return { tag: "repairer", layer: "armor", ancillary };
  }
  if (attrIds.has(STRUCTURE_DAMAGE_AMOUNT) && effect.effectCategory === 1) {
    return { tag: "repairer", layer: "hull", ancillary: false };
  }

  return undefined;
}

function isAncillaryEffect(effect: SdeDogmaEffect): boolean {
  return effect.effectName?.toLowerCase().includes("fueled") ?? false;
}
