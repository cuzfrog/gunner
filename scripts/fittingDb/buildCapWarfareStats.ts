import type { SdeDogmaEffect } from "./dogmaTypes";
import { classifyCapacitorEffects, type CapacitorIntent } from "./effectClassifier";
import { CAP_WARFARE_GROUPS } from "./combatAttributes";

export interface EnergyNeutralizerStats {
  readonly amount: number; // GJ drained from the target per cycle
  readonly cycleTime: number; // seconds
  readonly capacitorNeed: number; // GJ consumed by the user per cycle
  readonly maxRange: number; // m
  readonly falloff: number; // m
}

export interface NosferatuStats {
  readonly amount: number; // GJ transferred per cycle
  readonly cycleTime: number; // seconds
  readonly maxRange: number; // m
  readonly falloff: number; // m
}

export interface BuildCapWarfareStatsResult {
  readonly neutralizer?: EnergyNeutralizerStats;
  readonly nosferatu?: NosferatuStats;
}

export interface BuildCapWarfareStatsContext {
  readonly values: Map<string, number>;
  readonly effects: Set<number>;
  readonly groupId: number;
  readonly dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>;
}

export function buildCapWarfareStatsFromIntents(ctx: BuildCapWarfareStatsContext): BuildCapWarfareStatsResult | undefined {
  if (!CAP_WARFARE_GROUPS.has(ctx.groupId)) return undefined;
  const effects = resolveEffects(ctx.effects, ctx.dogmaEffects);
  const intents = classifyCapacitorEffects(effects);
  if (ctx.groupId === 71) {
    const neutralizer = buildNeutralizerStats(intents, ctx.values);
    return neutralizer ? { neutralizer } : undefined;
  }
  const nosferatu = buildNosferatuStats(intents, ctx.values);
  return nosferatu ? { nosferatu } : undefined;
}

function buildNeutralizerStats(intents: readonly { intent: CapacitorIntent }[], values: Map<string, number>): EnergyNeutralizerStats | undefined {
  if (!hasIntent(intents, "energyNeutralizer")) return undefined;
  const amount = optionalNumber(values.get("energyNeutralizerAmount"));
  const duration = optionalNumber(values.get("duration"));
  if (amount === undefined || duration === undefined) return undefined;
  return {
    amount,
    cycleTime: duration / 1000,
    capacitorNeed: values.get("capacitorNeed") ?? 0,
    maxRange: values.get("maxRange") ?? 0,
    falloff: values.get("falloffEffectiveness") ?? 0,
  };
}

function buildNosferatuStats(intents: readonly { intent: CapacitorIntent }[], values: Map<string, number>): NosferatuStats | undefined {
  if (!hasIntent(intents, "energyNosferatu")) return undefined;
  const amount = optionalNumber(values.get("powerTransferAmount"));
  const duration = optionalNumber(values.get("duration"));
  if (amount === undefined || duration === undefined) return undefined;
  return {
    amount,
    cycleTime: duration / 1000,
    maxRange: values.get("maxRange") ?? 0,
    falloff: values.get("falloffEffectiveness") ?? 0,
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
