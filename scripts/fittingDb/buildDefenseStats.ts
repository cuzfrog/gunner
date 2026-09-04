import type { DamageResists } from "../../src/sim";
import type { SdeDogmaEffect, SdeTypeDogma } from "./dogmaTypes";
import { classifyDefenseEffects, type DefenseIntent } from "./effectClassifier";
import { DefenseLayer } from "./combatAttributes";

export interface DefenseRepairerOverload {
  readonly amountMultiplier: number;
  readonly cycleTimeMultiplier: number;
}

export interface DefenseAncillary {
  readonly chargeMultiplier: number;
  readonly shots: number;
  readonly reloadTime: number;
}

export type DefenseModuleKind =
  | "damageControl"
  | "rah"
  | "repairer"
  | "boostAmplifier"
  | "resistModule"
  | "shieldExtender"
  | "armorPlate"
  | "rechargeModule"
  | "hullBulkhead"
  | "hpPercent"
  | "rechargeAmplifier"
  | "repairAmplifier";

export interface DefenseModuleStats {
  readonly kind: DefenseModuleKind;
  readonly layer?: DefenseLayer;
  readonly active?: boolean;
  readonly resistBonus?: DamageResists;
  readonly overloadBonusMultiplier?: number;
  readonly shieldResists?: DamageResists;
  readonly armorResists?: DamageResists;
  readonly hullResists?: DamageResists;
  readonly baseArmorResists?: DamageResists;
  readonly resistanceShiftAmount?: number;
  readonly amount?: number;
  readonly cycleTime?: number;
  readonly capacitorNeed?: number;
  readonly heatDamage?: number;
  readonly overload?: DefenseRepairerOverload;
  readonly overloadCycleTimeMultiplier?: number;
  readonly ancillary?: DefenseAncillary;
  readonly multiplier?: number;
  readonly shieldHpAdd?: number;
  readonly armorHpAdd?: number;
  readonly hullHpPercent?: number;
  readonly hpPercent?: number;
  readonly sigRadiusPenalty?: number;
  readonly rechargeMultiplier?: number;
  readonly repairAmountMultiplier?: number;
  readonly repairCycleTimeMultiplier?: number;
}

export interface BuildDefenseStatsContext {
  readonly values: Map<string, number>;
  readonly effects: Set<number>;
  readonly groupId: number;
  readonly dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>;
  readonly typeDogma: SdeTypeDogma | undefined;
}

export function buildDefenseStatsFromIntents(ctx: BuildDefenseStatsContext): DefenseModuleStats | undefined {
  const effects = resolveEffects(ctx.effects, ctx.dogmaEffects);
  const result = classifyDefenseEffects(effects, ctx.typeDogma);
  if (result.intents.length === 0) return undefined;

  const stats = buildStatsFromIntents(result.intents, ctx);
  return stats;
}

function buildStatsFromIntents(intents: readonly { intent: DefenseIntent }[], ctx: BuildDefenseStatsContext): DefenseModuleStats | undefined {
  for (const { intent } of intents) {
    const stats = buildStatsForIntent(intent, ctx);
    if (stats) return stats;
  }
  return undefined;
}

function buildStatsForIntent(intent: DefenseIntent, ctx: BuildDefenseStatsContext): DefenseModuleStats | undefined {
  switch (intent.tag) {
    case "damageControl":
      return buildDamageControlStats(ctx.values);
    case "rah":
      return buildRahStats(ctx.values);
    case "repairer":
      return buildRepairerStats(intent.layer, intent.ancillary, ctx);
    case "boostAmplifier":
      return buildBoostAmplifierStats(ctx.values);
    case "resist":
      return buildResistModuleStats(intent.layer, intent.active, ctx.values);
    case "hpFlat":
      return buildHpFlatStats(intent.layer, ctx.values);
    case "hpPercent":
      return buildHpPercentStats(intent.layer, ctx.values);
    case "hullBulkheadMultiplier":
      return buildHullBulkheadStatsFromMultiplier(ctx.values);
    case "recharge":
      return buildRechargeModuleStats(ctx.values);
    case "rechargePercent":
      return buildRechargeAmplifierStats(ctx.values);
    case "repairAmplifier":
      return buildRepairAmplifierStats(intent.sub, ctx.values);
    default:
      return undefined;
  }
}

function buildDamageControlStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const shieldResists = extractDcResonances(values, "shield");
  const armorResists = extractDcResonances(values, "armor");
  const hullResists = extractDcResonances(values, "hull");
  if (!shieldResists && !armorResists && !hullResists) return undefined;
  return {
    kind: "damageControl",
    shieldResists: shieldResists ?? undefined,
    armorResists: armorResists ?? undefined,
    hullResists: hullResists ?? undefined,
  };
}

function buildRahStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const armorResonances = extractDcResonances(values, "armor");
  const resistanceShiftAmount = optionalNumber(values.get("resistanceShiftAmount"));
  const duration = optionalNumber(values.get("duration"));
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const overloadDurationBonus = optionalNumber(values.get("overloadSelfDurationBonus"));
  if (!armorResonances) return undefined;
  return {
    kind: "rah",
    baseArmorResists: armorResonances,
    resistanceShiftAmount: resistanceShiftAmount ?? 6,
    cycleTime: duration !== undefined ? duration / 1000 : undefined,
    capacitorNeed,
    overloadCycleTimeMultiplier: overloadDurationBonus !== undefined ? 1 + overloadDurationBonus / 100 : undefined,
  };
}

function buildRepairerStats(layer: DefenseLayer, ancillary: boolean, ctx: BuildDefenseStatsContext): DefenseModuleStats | undefined {
  if (layer === "shield") return buildShieldBoosterStats(ctx.values, ancillary);
  if (layer === "armor") return buildArmorRepairerStats(ctx.values, ancillary, ctx.groupId);
  return buildHullRepairerStats(ctx.values);
}

function buildShieldBoosterStats(values: Map<string, number>, isAncillary: boolean): DefenseModuleStats | undefined {
  const shieldBonus = optionalNumber(values.get("shieldBonus"));
  const duration = optionalNumber(values.get("duration"));
  if (shieldBonus === undefined || duration === undefined) return undefined;
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  const overloadShieldBonus = optionalNumber(values.get("overloadShieldBonus"));
  const overloadDurationBonus = optionalNumber(values.get("overloadSelfDurationBonus"));
  const reloadTime = optionalNumber(values.get("reloadTime"));
  const ancillary = isAncillary ? { chargeMultiplier: 1, shots: 0, reloadTime: (reloadTime ?? 0) / 1000 } : undefined;
  return {
    kind: "repairer",
    layer: "shield",
    amount: shieldBonus,
    cycleTime: duration / 1000,
    capacitorNeed,
    heatDamage,
    overload: buildRepairerOverload(overloadShieldBonus, overloadDurationBonus),
    ancillary,
  };
}

function buildArmorRepairerStats(values: Map<string, number>, isAncillary: boolean, groupId: number): DefenseModuleStats | undefined {
  const armorDamageAmount = optionalNumber(values.get("armorDamageAmount"));
  const duration = optionalNumber(values.get("duration"));
  if (armorDamageAmount === undefined || duration === undefined) return undefined;
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  const overloadAmountBonus = optionalNumber(values.get("overloadArmorDamageAmount"));
  const overloadDurationBonus = optionalNumber(values.get("overloadSelfDurationBonus"));
  const chargedArmorDamageMultiplier = optionalNumber(values.get("chargedArmorDamageMultiplier"));
  const reloadTime = optionalNumber(values.get("reloadTime"));
  const ancillary = buildAncillary(isAncillary, chargedArmorDamageMultiplier ?? 1, reloadTime);
  return {
    kind: "repairer",
    layer: "armor",
    amount: armorDamageAmount,
    cycleTime: duration / 1000,
    capacitorNeed,
    heatDamage,
    overload: buildRepairerOverload(overloadAmountBonus, overloadDurationBonus),
    ancillary,
  };
}

function buildHullRepairerStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const structureDamageAmount = optionalNumber(values.get("structureDamageAmount"));
  const duration = optionalNumber(values.get("duration"));
  if (structureDamageAmount === undefined || duration === undefined) return undefined;
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  return {
    kind: "repairer",
    layer: "hull",
    amount: structureDamageAmount,
    cycleTime: duration / 1000,
    capacitorNeed,
    heatDamage,
    overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 },
  };
}

function buildBoostAmplifierStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const shieldBoostMultiplier = optionalNumber(values.get("shieldBoostMultiplier"));
  if (shieldBoostMultiplier === undefined) return undefined;
  return { kind: "boostAmplifier", multiplier: round6(1 + shieldBoostMultiplier / 100) };
}

function buildResistModuleStats(layer: DefenseLayer, active: boolean, values: Map<string, number>): DefenseModuleStats | undefined {
  const resistBonus = extractResistBonus(values);
  if (!resistBonus) return undefined;
  if (active) {
    const duration = optionalNumber(values.get("duration"));
    const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
    const heatDamage = optionalNumber(values.get("heatDamage"));
    const overloadHardeningBonus = optionalNumber(values.get("overloadHardeningBonus"));
    return {
      kind: "resistModule",
      layer,
      active: true,
      resistBonus,
      overloadBonusMultiplier: overloadHardeningBonus !== undefined ? 1 + overloadHardeningBonus / 100 : undefined,
      cycleTime: duration !== undefined ? duration / 1000 : undefined,
      capacitorNeed,
      heatDamage,
    };
  }
  return { kind: "resistModule", layer, active: false, resistBonus };
}

function buildHpFlatStats(layer: "shield" | "armor", values: Map<string, number>): DefenseModuleStats | undefined {
  if (layer === "shield") {
    const capacityBonus = optionalNumber(values.get("capacityBonus"));
    if (capacityBonus === undefined) return undefined;
    const sigRadiusAdd = optionalNumber(values.get("signatureRadiusAdd"));
    return { kind: "shieldExtender", shieldHpAdd: capacityBonus, sigRadiusPenalty: sigRadiusAdd };
  }
  const armorHpBonusAdd = optionalNumber(values.get("armorHPBonusAdd"));
  if (armorHpBonusAdd === undefined) return undefined;
  return { kind: "armorPlate", armorHpAdd: armorHpBonusAdd };
}

function buildHpPercentStats(layer: DefenseLayer, values: Map<string, number>): DefenseModuleStats | undefined {
  const attrName = layer === "shield" ? "shieldCapacityBonus" : layer === "armor" ? "armorHpBonus" : "hullHpBonus";
  const percent = optionalNumber(values.get(attrName));
  if (percent === undefined) return undefined;
  if (layer === "hull") {
    return { kind: "hullBulkhead", hullHpPercent: percent };
  }
  return { kind: "hpPercent", layer, hpPercent: percent };
}

function buildHullBulkheadStatsFromMultiplier(values: Map<string, number>): DefenseModuleStats | undefined {
  const multiplier = optionalNumber(values.get("structureHPMultiplier"));
  if (multiplier === undefined) return undefined;
  return { kind: "hullBulkhead", hullHpPercent: round6((multiplier - 1) * 100) };
}

function buildRechargeModuleStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const rechargeBonus = optionalNumber(values.get("rechargeratebonus")) ?? optionalNumber(values.get("shieldRechargeRateMultiplier"));
  if (rechargeBonus === undefined) return undefined;
  return { kind: "rechargeModule", rechargeMultiplier: 1 + rechargeBonus / 100 };
}

function buildRechargeAmplifierStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const rechargeBonus = optionalNumber(values.get("rechargeratebonus")) ?? optionalNumber(values.get("shieldRechargeRateMultiplier"));
  if (rechargeBonus === undefined) return undefined;
  return { kind: "rechargeAmplifier", rechargeMultiplier: 1 + rechargeBonus / 100 };
}

function buildRepairAmplifierStats(sub: "amount" | "cycleTime", values: Map<string, number>): DefenseModuleStats | undefined {
  if (sub === "amount") {
    const bonus = optionalNumber(values.get("repairBonus"));
    if (bonus === undefined) return undefined;
    return { kind: "repairAmplifier", repairAmountMultiplier: 1 + bonus / 100 };
  }
  const bonus = optionalNumber(values.get("durationSkillBonus"));
  if (bonus === undefined) return undefined;
  return { kind: "repairAmplifier", repairCycleTimeMultiplier: 1 + bonus / 100 };
}

function resolveEffects(effectIds: Set<number>, dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>): readonly SdeDogmaEffect[] {
  const result: SdeDogmaEffect[] = [];
  for (const eid of effectIds) {
    const e = dogmaEffects[String(eid)];
    if (e) result.push(e);
  }
  return result;
}

function buildRepairerOverload(amountBonus: number | undefined, durationBonus: number | undefined): DefenseRepairerOverload {
  return {
    amountMultiplier: amountBonus !== undefined ? 1 + amountBonus / 100 : 1,
    cycleTimeMultiplier: durationBonus !== undefined ? 1 + durationBonus / 100 : 1,
  };
}

function buildAncillary(isAncillary: boolean, chargeMultiplier: number, reloadTime: number | undefined): DefenseAncillary | undefined {
  if (!isAncillary) return undefined;
  return { chargeMultiplier, shots: 0, reloadTime: (reloadTime ?? 0) / 1000 };
}

function extractResistBonus(values: Map<string, number>): DamageResists | undefined {
  const em = optionalNumber(values.get("emDamageResistanceBonus"));
  const thermal = optionalNumber(values.get("thermalDamageResistanceBonus"));
  const kinetic = optionalNumber(values.get("kineticDamageResistanceBonus"));
  const explosive = optionalNumber(values.get("explosiveDamageResistanceBonus"));
  if (em === undefined && thermal === undefined && kinetic === undefined && explosive === undefined) return undefined;
  return {
    em: round6(Math.abs(em ?? 0) / 100),
    thermal: round6(Math.abs(thermal ?? 0) / 100),
    kinetic: round6(Math.abs(kinetic ?? 0) / 100),
    explosive: round6(Math.abs(explosive ?? 0) / 100),
  };
}

function extractDcResonances(values: Map<string, number>, prefix: string): DamageResists | undefined {
  const emAttr = prefix === "hull" ? "hullEmDamageResonance" : `${prefix}EmDamageResonance`;
  const thermalAttr = prefix === "hull" ? "hullThermalDamageResonance" : `${prefix}ThermalDamageResonance`;
  const kineticAttr = prefix === "hull" ? "hullKineticDamageResonance" : `${prefix}KineticDamageResonance`;
  const explosiveAttr = prefix === "hull" ? "hullExplosiveDamageResonance" : `${prefix}ExplosiveDamageResonance`;
  const em = optionalNumber(values.get(emAttr));
  const thermal = optionalNumber(values.get(thermalAttr));
  const kinetic = optionalNumber(values.get(kineticAttr));
  const explosive = optionalNumber(values.get(explosiveAttr));
  if (em === undefined && thermal === undefined && kinetic === undefined && explosive === undefined) return undefined;
  return {
    em: round6(1 - (em ?? 1)),
    thermal: round6(1 - (thermal ?? 1)),
    kinetic: round6(1 - (kinetic ?? 1)),
    explosive: round6(1 - (explosive ?? 1)),
  };
}

function optionalNumber(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value === 0) return undefined;
  return value;
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
