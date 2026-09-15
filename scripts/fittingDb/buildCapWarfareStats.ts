import type { SdeDogmaEffect } from "./dogmaTypes";
import { classifyCapacitorEffects, type CapacitorIntent } from "./effectClassifier";
import { CAP_WARFARE_GROUPS } from "./combatAttributes";
import type { EnergyNeutralizerStats, NosferatuStats } from "../../src/gamedata/fittingDb/types";
import type { TypeId } from "../../src/gamedata/ids";

export type { EnergyNeutralizerStats, NosferatuStats };

export interface BuildCapWarfareStatsResult {
  readonly neutralizer?: EnergyNeutralizerStats;
  readonly nosferatu?: NosferatuStats;
}

export interface BuildCapWarfareStatsContext {
  readonly values: Map<string, number>;
  readonly effects: Set<number>;
  readonly groupId: number;
  readonly dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>;
  readonly requiredSkillIds: readonly TypeId[];
}

export function buildCapWarfareStatsFromIntents(ctx: BuildCapWarfareStatsContext): BuildCapWarfareStatsResult | undefined {
  if (!CAP_WARFARE_GROUPS.has(ctx.groupId)) return undefined;
  const effects = resolveEffects(ctx.effects, ctx.dogmaEffects);
  const intents = classifyCapacitorEffects(effects);
  if (ctx.groupId === 67) {
    const transfer = buildCapTransferStats(intents, ctx.values, ctx.requiredSkillIds);
    return transfer ? { neutralizer: transfer } : undefined;
  }
  if (ctx.groupId === 71) {
    const neutralizer = buildNeutralizerStats(intents, ctx.values, ctx.requiredSkillIds);
    return neutralizer ? { neutralizer } : undefined;
  }
  const nosferatu = buildNosferatuStats(intents, ctx.values);
  return nosferatu ? { nosferatu } : undefined;
}

function buildNeutralizerStats(intents: readonly { intent: CapacitorIntent }[], values: Map<string, number>, requiredSkillIds: readonly TypeId[]): EnergyNeutralizerStats | undefined {
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
    requiredSkillIds,
  };
}

/** Cap transmitters give powerTransferAmount GJ to a remote ship each cycle; the capacitorNeed attribute already covers that outflow, so the neutralizer shape drains the user correctly. */
function buildCapTransferStats(intents: readonly { intent: CapacitorIntent }[], values: Map<string, number>, requiredSkillIds: readonly TypeId[]): EnergyNeutralizerStats | undefined {
  if (!hasIntent(intents, "capTransfer")) return undefined;
  const amount = optionalNumber(values.get("powerTransferAmount"));
  const duration = optionalNumber(values.get("duration"));
  if (amount === undefined || duration === undefined) return undefined;
  return {
    amount,
    cycleTime: duration / 1000,
    capacitorNeed: values.get("capacitorNeed") ?? 0,
    maxRange: values.get("maxRange") ?? 0,
    falloff: values.get("falloffEffectiveness") ?? 0,
    requiredSkillIds,
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
