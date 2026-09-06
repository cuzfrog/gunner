import { buildDefenseStatsFromIntents, type BuildDefenseStatsContext, type DefenseModuleStats } from "./buildDefenseStats";
import type { SdeDogmaEffect, SdeDogmaEffectModifier, SdeTypeDogma } from "./dogmaTypes";

function values(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

function mod(overrides: Partial<SdeDogmaEffectModifier> = {}): SdeDogmaEffectModifier {
  return { domain: "shipID", func: "ItemModifier", modifiedAttributeID: 0, modifyingAttributeID: 0, operation: 6, ...overrides };
}

function makeEffect(eid: number, opts: { category?: number; modifiers?: readonly SdeDogmaEffectModifier[]; name?: string } = {}): SdeDogmaEffect {
  return { effectID: eid, effectName: opts.name, effectCategory: opts.category ?? 0, modifierInfo: opts.modifiers };
}

function makeTypeDogma(attrs: readonly { attributeID: number; value: number }[] = []): SdeTypeDogma {
  return { dogmaAttributes: attrs, dogmaEffects: [] };
}

function makeCtx(opts: {
  values?: Map<string, number>;
  effects?: Set<number>;
  groupId?: number;
  dogmaEffects?: Record<string, SdeDogmaEffect>;
  typeDogma?: SdeTypeDogma;
}): BuildDefenseStatsContext {
  return {
    values: opts.values ?? values({}),
    effects: opts.effects ?? new Set(),
    groupId: opts.groupId ?? 0,
    dogmaEffects: opts.dogmaEffects ?? {},
    typeDogma: opts.typeDogma,
  };
}

describe("buildDefenseStatsFromIntents - passive resist modules", () => {
  test("passive shield resist (effect 2052) builds resistModule with shield layer", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "2052": makeEffect(2052, {
        category: 4,
        modifiers: [
          mod({ modifiedAttributeID: 271, modifyingAttributeID: 984 }),
          mod({ modifiedAttributeID: 272, modifyingAttributeID: 985 }),
          mod({ modifiedAttributeID: 273, modifyingAttributeID: 986 }),
          mod({ modifiedAttributeID: 274, modifyingAttributeID: 987 }),
        ],
      }),
    };
    const ctx = makeCtx({
      values: values({ emDamageResistanceBonus: -25 }),
      effects: new Set([2052]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "resistModule",
      layer: "shield",
      active: false,
      resistBonus: { em: 0.25, thermal: 0, kinetic: 0, explosive: 0 },
      compensationApplies: true,
    });
  });

  test("shield resist rig (effect 2795) builds resistModule with compensationApplies false", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "2795": makeEffect(2795, {
        category: 0,
        modifiers: [
          mod({ modifiedAttributeID: 271, modifyingAttributeID: 984 }),
          mod({ modifiedAttributeID: 272, modifyingAttributeID: 985 }),
          mod({ modifiedAttributeID: 273, modifyingAttributeID: 986 }),
          mod({ modifiedAttributeID: 274, modifyingAttributeID: 987 }),
        ],
      }),
    };
    const ctx = makeCtx({
      values: values({ emDamageResistanceBonus: -30 }),
      effects: new Set([2795]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "resistModule",
      layer: "shield",
      active: false,
      resistBonus: { em: 0.3, thermal: 0, kinetic: 0, explosive: 0 },
      compensationApplies: false,
    });
  });

  test("armor resist rig (effect 2792) builds resistModule with armor layer", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "2792": makeEffect(2792, {
        category: 0,
        modifiers: [
          mod({ modifiedAttributeID: 267, modifyingAttributeID: 984 }),
          mod({ modifiedAttributeID: 268, modifyingAttributeID: 985 }),
          mod({ modifiedAttributeID: 269, modifyingAttributeID: 986 }),
          mod({ modifiedAttributeID: 270, modifyingAttributeID: 987 }),
        ],
      }),
    };
    const ctx = makeCtx({
      values: values({ emDamageResistanceBonus: -30 }),
      effects: new Set([2792]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "resistModule",
      layer: "armor",
      active: false,
      resistBonus: { em: 0.3, thermal: 0, kinetic: 0, explosive: 0 },
      compensationApplies: false,
    });
  });
});

describe("buildDefenseStatsFromIntents - active hardeners", () => {
  test("active shield hardener (effect 5230) builds resistModule with active=true", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "5230": makeEffect(5230, {
        category: 1,
        modifiers: [mod({ modifiedAttributeID: 271, modifyingAttributeID: 984 })],
      }),
    };
    const ctx = makeCtx({
      values: values({ emDamageResistanceBonus: -55, duration: 10000, capacitorNeed: 20, heatDamage: 3.4, overloadHardeningBonus: 20 }),
      effects: new Set([5230]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "resistModule",
      layer: "shield",
      active: true,
      resistBonus: { em: 0.55, thermal: 0, kinetic: 0, explosive: 0 },
      compensationApplies: false,
      overloadBonusMultiplier: 1.2,
      cycleTime: 10,
      capacitorNeed: 20,
      heatDamage: 3.4,
    });
  });
});

describe("buildDefenseStatsFromIntents - damage control", () => {
  test("damage control (effect 2302) builds damageControl with all three layers", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "2302": makeEffect(2302, {
        category: 4,
        modifiers: [
          mod({ modifiedAttributeID: 267, modifyingAttributeID: 267, operation: 0 }),
          mod({ modifiedAttributeID: 271, modifyingAttributeID: 271, operation: 0 }),
          mod({ modifiedAttributeID: 113, modifyingAttributeID: 974, operation: 0 }),
        ],
      }),
    };
    const ctx = makeCtx({
      values: values({
        armorEmDamageResonance: 0.85, shieldEmDamageResonance: 0.875, hullEmDamageResonance: 0.6,
        armorExplosiveDamageResonance: 0.85, shieldExplosiveDamageResonance: 0.875, hullExplosiveDamageResonance: 0.6,
        armorKineticDamageResonance: 0.85, shieldKineticDamageResonance: 0.875, hullKineticDamageResonance: 0.6,
        armorThermalDamageResonance: 0.85, shieldThermalDamageResonance: 0.875, hullThermalDamageResonance: 0.6,
      }),
      effects: new Set([2302]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "damageControl",
      shieldResists: { em: 0.125, thermal: 0.125, kinetic: 0.125, explosive: 0.125 },
      armorResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      hullResists: { em: 0.4, thermal: 0.4, kinetic: 0.4, explosive: 0.4 },
    });
  });
});

describe("buildDefenseStatsFromIntents - HP modules", () => {
  test("shield extender (effect 21) builds shieldExtender", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "21": makeEffect(21, { category: 4, modifiers: [mod({ modifiedAttributeID: 263, modifyingAttributeID: 72, operation: 2 })] }),
    };
    const ctx = makeCtx({
      values: values({ capacityBonus: 1100, signatureRadiusAdd: 7 }),
      effects: new Set([21]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "shieldExtender",
      shieldHpAdd: 1100,
      sigRadiusPenalty: 7,
    });
  });

  test("armor plate (effect 2837) builds armorPlate", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "2837": makeEffect(2837, { category: 4, modifiers: [mod({ modifiedAttributeID: 265, modifyingAttributeID: 1159, operation: 2 })] }),
    };
    const ctx = makeCtx({
      values: values({ armorHPBonusAdd: 4800 }),
      effects: new Set([2837]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "armorPlate",
      armorHpAdd: 4800,
    });
  });

  test("Trimark rig (effect 271) builds hpPercent/armor", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "271": makeEffect(271, { category: 0, modifiers: [mod({ modifiedAttributeID: 265, modifyingAttributeID: 335, operation: 6 })] }),
    };
    const ctx = makeCtx({
      values: values({ armorHpBonus: 15 }),
      effects: new Set([271]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "hpPercent",
      layer: "armor",
      hpPercent: 15,
    });
  });

  test("Core Defense Field Extender (effect 446) builds hpPercent/shield", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "446": makeEffect(446, { category: 0, modifiers: [mod({ modifiedAttributeID: 263, modifyingAttributeID: 337, operation: 6 })] }),
    };
    const ctx = makeCtx({
      values: values({ shieldCapacityBonus: 15 }),
      effects: new Set([446]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "hpPercent",
      layer: "shield",
      hpPercent: 15,
    });
  });

  test("Layered Coating (effect 63, armorHPMultiplier) builds hpPercent/armor from multiplier", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "63": makeEffect(63, { category: 4, modifiers: [mod({ modifiedAttributeID: 265, modifyingAttributeID: 148, operation: 4 })] }),
    };
    const ctx = makeCtx({
      values: values({ armorHPMultiplier: 1.09 }),
      effects: new Set([63]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "hpPercent",
      layer: "armor",
      hpPercent: 9,
    });
  });

  test("Layered Energized Membrane with armorHPMultiplier and resist bonus builds both", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "63": makeEffect(63, { category: 4, modifiers: [mod({ modifiedAttributeID: 265, modifyingAttributeID: 148, operation: 4 })] }),
      "2041": makeEffect(2041, { category: 4, modifiers: [
        mod({ modifiedAttributeID: 267, modifyingAttributeID: 984, operation: 6 }),
        mod({ modifiedAttributeID: 268, modifyingAttributeID: 985, operation: 6 }),
        mod({ modifiedAttributeID: 269, modifyingAttributeID: 986, operation: 6 }),
        mod({ modifiedAttributeID: 270, modifyingAttributeID: 987, operation: 6 }),
      ] }),
    };
    const ctx = makeCtx({
      values: values({ armorHPMultiplier: 1.09, emDamageResistanceBonus: -15, explosiveDamageResistanceBonus: -15, kineticDamageResistanceBonus: -15, thermalDamageResistanceBonus: -15 }),
      effects: new Set([63, 2041]),
      dogmaEffects,
    });
    const result = buildDefenseStatsFromIntents(ctx);
    expect(result).toBeDefined();
    expect(result?.kind).toBe("hpPercent");
    expect(result?.layer).toBe("armor");
    expect(result?.hpPercent).toBe(9);
    expect(result?.resistBonus).toEqual({ em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 });
  });

  test("hull bulkhead percent (effect 392) builds hullBulkhead", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "392": makeEffect(392, { category: 0, modifiers: [mod({ modifiedAttributeID: 9, modifyingAttributeID: 327, operation: 6 })] }),
    };
    const ctx = makeCtx({
      values: values({ hullHpBonus: 15 }),
      effects: new Set([392]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "hullBulkhead",
      hullHpPercent: 15,
    });
  });

  test("hull bulkhead multiplier (effect 60) builds hullBulkhead from multiplier", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "60": makeEffect(60, { category: 4, modifiers: [mod({ modifiedAttributeID: 9, modifyingAttributeID: 150, operation: 4 })] }),
    };
    const ctx = makeCtx({
      values: values({ structureHPMultiplier: 1.5 }),
      effects: new Set([60]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "hullBulkhead",
      hullHpPercent: 50,
    });
  });
});

describe("buildDefenseStatsFromIntents - recharge modules", () => {
  test("shield recharger (effect 50) builds rechargeModule", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "50": makeEffect(50, { category: 4, modifiers: [mod({ modifiedAttributeID: 479, modifyingAttributeID: 134, operation: 4 })] }),
    };
    const ctx = makeCtx({
      values: values({ rechargeratebonus: -15 }),
      effects: new Set([50]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "rechargeModule",
      rechargeMultiplier: 0.85,
    });
  });

  test("Core Defense Field Purger rig (effect 486) builds rechargeAmplifier", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "486": makeEffect(486, { category: 0, modifiers: [mod({ modifiedAttributeID: 479, modifyingAttributeID: 338, operation: 6 })] }),
    };
    const ctx = makeCtx({
      values: values({ rechargeratebonus: -20 }),
      effects: new Set([486]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "rechargeAmplifier",
      rechargeMultiplier: 0.8,
    });
  });
});

describe("buildDefenseStatsFromIntents - repairers", () => {
  test("shield booster (effect 4) builds repairer/shield", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "4": makeEffect(4, { category: 1, name: "shieldBoosting" }),
    };
    const ctx = makeCtx({
      values: values({ shieldBonus: 276, duration: 4000, capacitorNeed: 160, heatDamage: 1.3, overloadShieldBonus: 10, overloadSelfDurationBonus: -15 }),
      effects: new Set([4]),
      dogmaEffects,
      typeDogma: makeTypeDogma([{ attributeID: 68, value: 276 }]),
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "repairer",
      layer: "shield",
      amount: 276,
      cycleTime: 4,
      capacitorNeed: 160,
      heatDamage: 1.3,
      overload: { amountMultiplier: 1.1, cycleTimeMultiplier: 0.85 },
      ancillary: undefined,
    });
  });

  test("ancillary shield booster (effect 4936) builds repairer/shield with ancillary", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "4936": makeEffect(4936, { category: 1, name: "fueledShieldBoosting" }),
    };
    const ctx = makeCtx({
      values: values({ shieldBonus: 390, duration: 4000, reloadTime: 60000 }),
      effects: new Set([4936]),
      dogmaEffects,
      typeDogma: makeTypeDogma([{ attributeID: 68, value: 390 }]),
    });
    const stats = buildDefenseStatsFromIntents(ctx);
    expect(stats?.kind).toBe("repairer");
    expect(stats?.ancillary).toEqual({ chargeMultiplier: 1, shots: 0, reloadTime: 60 });
  });

  test("armor repairer (effect 27) builds repairer/armor", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "27": makeEffect(27, { category: 1, name: "armorRepair" }),
    };
    const ctx = makeCtx({
      values: values({ armorDamageAmount: 920, duration: 15000, capacitorNeed: 400, heatDamage: 5.4, overloadArmorDamageAmount: 10, overloadSelfDurationBonus: -15 }),
      effects: new Set([27]),
      dogmaEffects,
      typeDogma: makeTypeDogma([{ attributeID: 84, value: 920 }]),
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "repairer",
      layer: "armor",
      amount: 920,
      cycleTime: 15,
      capacitorNeed: 400,
      heatDamage: 5.4,
      overload: { amountMultiplier: 1.1, cycleTimeMultiplier: 0.85 },
      ancillary: undefined,
    });
  });

  test("hull repairer (effect 26) builds repairer/hull", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "26": makeEffect(26, { category: 1, name: "structureRepair" }),
    };
    const ctx = makeCtx({
      values: values({ structureDamageAmount: 500, duration: 12000, capacitorNeed: 80 }),
      effects: new Set([26]),
      dogmaEffects,
      typeDogma: makeTypeDogma([{ attributeID: 83, value: 500 }]),
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "repairer",
      layer: "hull",
      amount: 500,
      cycleTime: 12,
      capacitorNeed: 80,
      heatDamage: undefined,
      overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 },
    });
  });

  test("RAH (effect 4928) builds rah stats", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "4928": makeEffect(4928, { category: 1, name: "adaptiveArmorHardener" }),
    };
    const ctx = makeCtx({
      values: values({
        armorEmDamageResonance: 0.85, armorExplosiveDamageResonance: 0.85, armorKineticDamageResonance: 0.85, armorThermalDamageResonance: 0.85,
        resistanceShiftAmount: 6, duration: 10000, capacitorNeed: 42, overloadSelfDurationBonus: -15,
      }),
      effects: new Set([4928]),
      dogmaEffects,
      typeDogma: makeTypeDogma([{ attributeID: 1849, value: 6 }]),
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "rah",
      baseArmorResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      resistanceShiftAmount: 6,
      cycleTime: 10,
      capacitorNeed: 42,
      overloadCycleTimeMultiplier: 0.85,
    });
  });
});

describe("buildDefenseStatsFromIntents - amplifiers", () => {
  test("shield boost amplifier (effect 1720) builds boostAmplifier", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "1720": makeEffect(1720, {
        category: 4,
        modifiers: [mod({ func: "LocationRequiredSkillModifier", modifiedAttributeID: 68, modifyingAttributeID: 548, skillTypeID: 21802 })],
      }),
    };
    const ctx = makeCtx({
      values: values({ shieldBoostMultiplier: 36 }),
      effects: new Set([1720]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "boostAmplifier",
      multiplier: 1.36,
    });
  });

  test("Auxiliary Nano Pump (effect 1281) builds repairAmplifier/amount", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "1281": makeEffect(1281, {
        category: 0,
        modifiers: [mod({ func: "LocationRequiredSkillModifier", modifiedAttributeID: 84, modifyingAttributeID: 806, skillTypeID: 3393 })],
      }),
    };
    const ctx = makeCtx({
      values: values({ repairBonus: 15 }),
      effects: new Set([1281]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "repairAmplifier",
      layer: "armor",
      repairAmountMultiplier: 1.15,
    });
  });

  test("Nanobot Accelerator (effect 272) builds repairAmplifier/cycleTime", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "272": makeEffect(272, {
        category: 0,
        modifiers: [mod({ func: "LocationRequiredSkillModifier", modifiedAttributeID: 73, modifyingAttributeID: 312, skillTypeID: 3393 })],
      }),
    };
    const ctx = makeCtx({
      values: values({ durationSkillBonus: -15 }),
      effects: new Set([272]),
      dogmaEffects,
    });
    expect(buildDefenseStatsFromIntents(ctx)).toEqual({
      kind: "repairAmplifier",
      layer: "armor",
      repairCycleTimeMultiplier: 0.85,
    });
  });
});

describe("buildDefenseStatsFromIntents - edge cases", () => {
  test("returns undefined when no defense effects are present", () => {
    const ctx = makeCtx({ effects: new Set([9999]), dogmaEffects: { "9999": makeEffect(9999, { category: 0 }) } });
    expect(buildDefenseStatsFromIntents(ctx)).toBeUndefined();
  });

  test("dispatch prioritizes first classified intent", () => {
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "21": makeEffect(21, { category: 4, modifiers: [mod({ modifiedAttributeID: 263, modifyingAttributeID: 72, operation: 2 })] }),
      "2052": makeEffect(2052, { category: 4, modifiers: [mod({ modifiedAttributeID: 271, modifyingAttributeID: 984 })] }),
    };
    const ctx = makeCtx({
      values: values({ emDamageResistanceBonus: -25, capacityBonus: 1000 }),
      effects: new Set([2052, 21]),
      dogmaEffects,
    });
    const stats = buildDefenseStatsFromIntents(ctx);
    expect(stats?.kind).toBe("resistModule");
  });
});
