import { buildCapacitorStatsFromIntents, type BuildCapacitorStatsContext } from "./buildCapacitorStats";
import type { SdeDogmaEffect, SdeDogmaEffectModifier } from "./dogmaTypes";

function values(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

function mod(overrides: Partial<SdeDogmaEffectModifier> = {}): SdeDogmaEffectModifier {
  return { domain: "shipID", func: "ItemModifier", modifiedAttributeID: 0, modifyingAttributeID: 0, operation: 6, ...overrides };
}

function makeEffect(eid: number, opts: { category?: number; modifiers?: readonly SdeDogmaEffectModifier[]; name?: string } = {}): SdeDogmaEffect {
  return { effectID: eid, effectName: opts.name, effectCategory: opts.category ?? 0, modifierInfo: opts.modifiers };
}

function makeCtx(opts: {
  values?: Map<string, number>;
  effects?: Set<number>;
  groupId?: number;
  dogmaEffects?: Record<string, SdeDogmaEffect>;
  chargeCapacity?: number;
}): BuildCapacitorStatsContext {
  return {
    values: opts.values ?? values({}),
    effects: opts.effects ?? new Set(),
    groupId: opts.groupId ?? 0,
    dogmaEffects: opts.dogmaEffects ?? {},
    chargeCapacity: opts.chargeCapacity ?? 0,
  };
}

const CAPACITY_ADD_EFFECT = 25;
const RECHARGE_EFFECT = 51;
const CAPACITY_MULTIPLY_EFFECT = 58;
const EW_RESISTANCE_EFFECT = 6487;
const POWER_BOOSTER_EFFECT = 48;

describe("buildCapacitorStatsFromIntents", () => {
  test("builds a battery from capacity add and energy warfare resistance effects", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(CAPACITY_ADD_EFFECT)]: makeEffect(CAPACITY_ADD_EFFECT, {
        category: 4,
        modifiers: [mod({ modifiedAttributeID: 482, modifyingAttributeID: 67, operation: 2 })],
      }),
      [String(EW_RESISTANCE_EFFECT)]: makeEffect(EW_RESISTANCE_EFFECT, {
        category: 4,
        modifiers: [mod({ modifiedAttributeID: 2045, modifyingAttributeID: 2267, operation: 6 })],
      }),
    };
    const stats = buildCapacitorStatsFromIntents(makeCtx({
      values: values({ capacitorBonus: 1625, energyWarfareResistanceBonus: -25 }),
      effects: new Set([CAPACITY_ADD_EFFECT, EW_RESISTANCE_EFFECT]),
      groupId: 61,
      dogmaEffects,
    }));
    expect(stats).toEqual({
      kind: "capacitorBattery",
      capacityAdd: 1625,
      energyWarfareResistanceBonus: -25,
    });
  });

  test("returns undefined for a battery without capacity add effect", () => {
    const stats = buildCapacitorStatsFromIntents(makeCtx({ groupId: 61 }));
    expect(stats).toBeUndefined();
  });

  test("builds a recharger from the recharge multiplier effect", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(RECHARGE_EFFECT)]: makeEffect(RECHARGE_EFFECT, {
        category: 4,
        modifiers: [mod({ modifiedAttributeID: 55, modifyingAttributeID: 144, operation: 4 })],
      }),
    };
    const stats = buildCapacitorStatsFromIntents(makeCtx({
      values: values({ capacitorRechargeRateMultiplier: 0.8 }),
      effects: new Set([RECHARGE_EFFECT]),
      groupId: 43,
      dogmaEffects,
    }));
    expect(stats).toEqual({ kind: "capacitorRecharger", rechargeMultiplier: 0.8 });
  });

  test("builds a capacitor power relay from recharge and repair drawback effects", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(RECHARGE_EFFECT)]: makeEffect(RECHARGE_EFFECT, {
        category: 4,
        modifiers: [mod({ modifiedAttributeID: 55, modifyingAttributeID: 144, operation: 4 })],
      }),
    };
    const stats = buildCapacitorStatsFromIntents(makeCtx({
      values: values({ capacitorRechargeRateMultiplier: 0.76, shieldBoostMultiplier: -11 }),
      effects: new Set([RECHARGE_EFFECT]),
      groupId: 767,
      dogmaEffects,
    }));
    expect(stats).toEqual({ kind: "capacitorRelay", rechargeMultiplier: 0.76 });
  });

  test("builds a flux coil from recharge and capacity multiplier effects", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(RECHARGE_EFFECT)]: makeEffect(RECHARGE_EFFECT, {
        category: 4,
        modifiers: [mod({ modifiedAttributeID: 55, modifyingAttributeID: 144, operation: 4 })],
      }),
      [String(CAPACITY_MULTIPLY_EFFECT)]: makeEffect(CAPACITY_MULTIPLY_EFFECT, {
        category: 4,
        modifiers: [mod({ modifiedAttributeID: 482, modifyingAttributeID: 147, operation: 6 })],
      }),
    };
    const stats = buildCapacitorStatsFromIntents(makeCtx({
      values: values({ capacitorRechargeRateMultiplier: 0.61, capacitorCapacityMultiplier: 0.8 }),
      effects: new Set([RECHARGE_EFFECT, CAPACITY_MULTIPLY_EFFECT]),
      groupId: 768,
      dogmaEffects,
    }));
    expect(stats).toEqual({ kind: "capacitorFluxCoil", rechargeMultiplier: 0.61, capacityMultiplier: 0.8 });
  });

  test("builds a power diagnostic system from recharge and capacity multiplier effects", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(RECHARGE_EFFECT)]: makeEffect(RECHARGE_EFFECT, {
        category: 4,
        modifiers: [mod({ modifiedAttributeID: 55, modifyingAttributeID: 144, operation: 4 })],
      }),
      [String(CAPACITY_MULTIPLY_EFFECT)]: makeEffect(CAPACITY_MULTIPLY_EFFECT, {
        category: 4,
        modifiers: [mod({ modifiedAttributeID: 482, modifyingAttributeID: 147, operation: 6 })],
      }),
    };
    const stats = buildCapacitorStatsFromIntents(makeCtx({
      values: values({ capacitorRechargeRateMultiplier: 0.915, capacitorCapacityMultiplier: 1.05 }),
      effects: new Set([RECHARGE_EFFECT, CAPACITY_MULTIPLY_EFFECT]),
      groupId: 766,
      dogmaEffects,
    }));
    expect(stats).toEqual({ kind: "powerDiagnostic", rechargeMultiplier: 0.915, capacityMultiplier: 1.05 });
  });

  test("builds a capacitor booster from the powerBooster effect with cycle and reload times", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(POWER_BOOSTER_EFFECT)]: makeEffect(POWER_BOOSTER_EFFECT, { category: 1 }),
    };
    const stats = buildCapacitorStatsFromIntents(makeCtx({
      values: values({ duration: 12000, reloadTime: 10000 }),
      effects: new Set([POWER_BOOSTER_EFFECT]),
      groupId: 76,
      dogmaEffects,
      chargeCapacity: 40,
    }));
    expect(stats).toEqual({ kind: "capacitorBooster", cycleTime: 12, reloadTime: 10, chargeCapacity: 40 });
  });

  test("returns undefined for a capacitor booster without charge capacity", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(POWER_BOOSTER_EFFECT)]: makeEffect(POWER_BOOSTER_EFFECT, { category: 1 }),
    };
    const stats = buildCapacitorStatsFromIntents(makeCtx({
      values: values({ duration: 12000 }),
      effects: new Set([POWER_BOOSTER_EFFECT]),
      groupId: 76,
      dogmaEffects,
    }));
    expect(stats).toBeUndefined();
  });

  test("returns undefined for non-capacitor groups", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      [String(RECHARGE_EFFECT)]: makeEffect(RECHARGE_EFFECT, {
        category: 4,
        modifiers: [mod({ modifiedAttributeID: 55, modifyingAttributeID: 144, operation: 4 })],
      }),
    };
    const stats = buildCapacitorStatsFromIntents(makeCtx({
      values: values({ capacitorRechargeRateMultiplier: 0.8 }),
      effects: new Set([RECHARGE_EFFECT]),
      groupId: 57,
      dogmaEffects,
    }));
    expect(stats).toBeUndefined();
  });
});
