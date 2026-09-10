import { buildCapWarfareStatsFromIntents, type BuildCapWarfareStatsContext } from "./buildCapWarfareStats";
import type { SdeDogmaEffect } from "./dogmaTypes";

function values(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

function makeEffect(eid: number, opts: { category?: number; name?: string } = {}): SdeDogmaEffect {
  return { effectID: eid, effectName: opts.name, effectCategory: opts.category ?? 0, modifierInfo: [] };
}

function makeCtx(opts: Partial<BuildCapWarfareStatsContext>): BuildCapWarfareStatsContext {
  return {
    values: opts.values ?? values({}),
    effects: opts.effects ?? new Set(),
    groupId: opts.groupId ?? 0,
    dogmaEffects: opts.dogmaEffects ?? {},
  };
}

const ENERGY_NEUTRALIZER_FALLOFF_EFFECT = 6187;
const ENERGY_NOSFERATU_FALLOFF_EFFECT = 6197;

describe("buildCapWarfareStatsFromIntents", () => {
  test("builds heavy neutralizer stats from SDE attributes", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(ENERGY_NEUTRALIZER_FALLOFF_EFFECT)]: makeEffect(ENERGY_NEUTRALIZER_FALLOFF_EFFECT, { category: 2 }),
    };
    const result = buildCapWarfareStatsFromIntents(makeCtx({
      values: values({ energyNeutralizerAmount: 600, duration: 24000, capacitorNeed: 500, maxRange: 20000, falloffEffectiveness: 10000 }),
      effects: new Set([ENERGY_NEUTRALIZER_FALLOFF_EFFECT]),
      groupId: 71,
      dogmaEffects,
    }));
    expect(result).toEqual({
      neutralizer: { amount: 600, cycleTime: 24, capacitorNeed: 500, maxRange: 20000, falloff: 10000 },
    });
  });

  test("returns undefined for a neutralizer group without the neutralizer effect", () => {
    const result = buildCapWarfareStatsFromIntents(makeCtx({ groupId: 71 }));
    expect(result).toBeUndefined();
  });

  test("builds medium nosferatu stats from SDE attributes", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(ENERGY_NOSFERATU_FALLOFF_EFFECT)]: makeEffect(ENERGY_NOSFERATU_FALLOFF_EFFECT, { category: 2 }),
    };
    const result = buildCapWarfareStatsFromIntents(makeCtx({
      values: values({ powerTransferAmount: 36, duration: 5000, maxRange: 10000, falloffEffectiveness: 5000 }),
      effects: new Set([ENERGY_NOSFERATU_FALLOFF_EFFECT]),
      groupId: 68,
      dogmaEffects,
    }));
    expect(result).toEqual({
      nosferatu: { amount: 36, cycleTime: 5, maxRange: 10000, falloff: 5000 },
    });
  });

  test("returns undefined for non-warfare groups", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(ENERGY_NEUTRALIZER_FALLOFF_EFFECT)]: makeEffect(ENERGY_NEUTRALIZER_FALLOFF_EFFECT, { category: 2 }),
    };
    const result = buildCapWarfareStatsFromIntents(makeCtx({
      values: values({ energyNeutralizerAmount: 600, duration: 24000 }),
      effects: new Set([ENERGY_NEUTRALIZER_FALLOFF_EFFECT]),
      groupId: 76,
      dogmaEffects,
    }));
    expect(result).toBeUndefined();
  });
});
