import type { SdeDogmaEffect } from "./dogmaTypes";
import { classifyCapacitorEffects, type CapacitorIntent } from "./effectClassifier";
import { CAPACITOR_STATS_GROUPS } from "./combatAttributes";
export type CapacitorModuleKind =
  | "capacitorBattery"
  | "capacitorRecharger"
  | "capacitorRelay"
  | "powerDiagnostic"
  | "capacitorFluxCoil"
  | "capacitorBooster";

export interface CapacitorModuleStats {
  readonly kind: CapacitorModuleKind;
  readonly capacityAdd?: number; // GJ, batteries
  readonly capacityMultiplier?: number; // PDS 1.05, flux coil 0.8
  readonly rechargeMultiplier?: number; // recharger 0.8, CPL 0.76, PDS 0.915, flux coil 0.61
  readonly energyWarfareResistanceBonus?: number; // raw SDE percent, batteries (-25)
  readonly cycleTime?: number; // seconds, booster only
  readonly reloadTime?: number; // seconds, booster only
  readonly chargeCapacity?: number; // m3, booster only; clip = floor(chargeCapacity / charge volume)
}

export interface BuildCapacitorStatsContext {
  readonly values: Map<string, number>;
  readonly effects: Set<number>;
  readonly groupId: number;
  readonly dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>;
  readonly chargeCapacity: number; // module m3 capacity from the SDE type row, 0 when absent
}

export function buildCapacitorStatsFromIntents(ctx: BuildCapacitorStatsContext): CapacitorModuleStats | undefined {
  const kind = kindForGroupId(ctx.groupId);
  if (!kind) return undefined;
  const effects = resolveEffects(ctx.effects, ctx.dogmaEffects);
  const intents = classifyCapacitorEffects(effects);
  if (intents.length === 0) return undefined;
  switch (kind) {
    case "capacitorBattery":
      return buildBatteryStats(kind, intents, ctx.values);
    case "capacitorBooster":
      return buildBoosterStats(intents, ctx.values, ctx.chargeCapacity);
    default:
      return buildMultiplierStats(kind, intents, ctx.values);
  }
}

function kindForGroupId(groupId: number): CapacitorModuleKind | undefined {
  if (!CAPACITOR_STATS_GROUPS.has(groupId)) return undefined;
  switch (groupId) {
    case 61:
      return "capacitorBattery";
    case 43:
      return "capacitorRecharger";
    case 767:
      return "capacitorRelay";
    case 768:
      return "capacitorFluxCoil";
    case 766:
      return "powerDiagnostic";
    case 76:
      return "capacitorBooster";
    default:
      return undefined;
  }
}

function buildBatteryStats(kind: CapacitorModuleKind, intents: readonly { intent: CapacitorIntent }[], values: Map<string, number>): CapacitorModuleStats | undefined {
  if (!hasIntent(intents, "capCapacityAdd")) return undefined;
  const capacityAdd = optionalNumber(values.get("capacitorBonus"));
  if (capacityAdd === undefined) return undefined;
  return {
    kind,
    capacityAdd,
    energyWarfareResistanceBonus: hasIntent(intents, "capEnergyWarfareResistance") ? optionalNumber(values.get("energyWarfareResistanceBonus")) : undefined,
  };
}

function buildBoosterStats(intents: readonly { intent: CapacitorIntent }[], values: Map<string, number>, chargeCapacity: number): CapacitorModuleStats | undefined {
  if (!hasIntent(intents, "capBooster")) return undefined;
  const duration = optionalNumber(values.get("duration"));
  if (duration === undefined || chargeCapacity <= 0) return undefined;
  const reloadTime = optionalNumber(values.get("reloadTime"));
  return { kind: "capacitorBooster", cycleTime: duration / 1000, reloadTime: reloadTime !== undefined ? reloadTime / 1000 : undefined, chargeCapacity };
}

function buildMultiplierStats(kind: CapacitorModuleKind, intents: readonly { intent: CapacitorIntent }[], values: Map<string, number>): CapacitorModuleStats | undefined {
  if (!hasIntent(intents, "capRecharge")) return undefined;
  const rechargeMultiplier = optionalNumber(values.get("capacitorRechargeRateMultiplier"));
  if (rechargeMultiplier === undefined) return undefined;
  return {
    kind,
    rechargeMultiplier,
    capacityMultiplier: hasIntent(intents, "capCapacityMultiplier") ? optionalNumber(values.get("capacitorCapacityMultiplier")) : undefined,
  };
}

function hasIntent(intents: readonly { intent: CapacitorIntent }[], tag: CapacitorIntent["tag"]): boolean {
  return intents.some((c) => c.intent.tag === tag);
}

function resolveEffects(effectIds: Set<number>, dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>): readonly SdeDogmaEffect[] {
  const result: SdeDogmaEffect[] = [];
  for (const eid of effectIds) {
    const e = dogmaEffects[String(eid)];
    if (e) result.push(e);
  }
  return result;
}

function optionalNumber(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value === 0) return undefined;
  return value;
}
