import { classifyDefenseEffects, type DefenseIntent } from "./effectClassifier";
import type { SdeDogmaEffect, SdeDogmaEffectModifier, SdeTypeDogma } from "./dogmaTypes";

function mod(overrides: Partial<SdeDogmaEffectModifier> = {}): SdeDogmaEffectModifier {
  return {
    domain: "shipID",
    func: "ItemModifier",
    modifiedAttributeID: 0,
    modifyingAttributeID: 0,
    operation: 6,
    ...overrides,
  };
}

function effect(eid: number, opts: { category?: number; modifiers?: readonly SdeDogmaEffectModifier[]; name?: string } = {}): SdeDogmaEffect {
  return {
    effectID: eid,
    effectName: opts.name,
    effectCategory: opts.category ?? 0,
    modifierInfo: opts.modifiers,
  };
}

function typeDogma(attrs: readonly { attributeID: number; value: number }[] = []): SdeTypeDogma {
  return { dogmaAttributes: attrs, dogmaEffects: [] };
}

function firstIntent(result: ReturnType<typeof classifyDefenseEffects>): DefenseIntent | undefined {
  return result.intents[0]?.intent;
}

describe("classifyDefenseEffects - passive resist modules", () => {
  test("passive shield resist (effect 2052, category 4) classifies as passive shield resist", () => {
    const e = effect(2052, {
      category: 4,
      modifiers: [
        mod({ modifiedAttributeID: 271, modifyingAttributeID: 984 }),
        mod({ modifiedAttributeID: 272, modifyingAttributeID: 985 }),
        mod({ modifiedAttributeID: 273, modifyingAttributeID: 986 }),
        mod({ modifiedAttributeID: 274, modifyingAttributeID: 987 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "resist", layer: "shield", active: false });
  });

  test("passive armor resist (effect 2041, category 4) classifies as passive armor resist", () => {
    const e = effect(2041, {
      category: 4,
      modifiers: [
        mod({ modifiedAttributeID: 267, modifyingAttributeID: 984 }),
        mod({ modifiedAttributeID: 268, modifyingAttributeID: 985 }),
        mod({ modifiedAttributeID: 269, modifyingAttributeID: 986 }),
        mod({ modifiedAttributeID: 270, modifyingAttributeID: 987 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "resist", layer: "armor", active: false });
  });

  test("shield resist rig (effect 2795, category 0) classifies same as passive shield resist 2052", () => {
    const e = effect(2795, {
      category: 0,
      modifiers: [
        mod({ modifiedAttributeID: 271, modifyingAttributeID: 984 }),
        mod({ modifiedAttributeID: 272, modifyingAttributeID: 985 }),
        mod({ modifiedAttributeID: 273, modifyingAttributeID: 986 }),
        mod({ modifiedAttributeID: 274, modifyingAttributeID: 987 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "resist", layer: "shield", active: false });
  });

  test("armor resist rig (effect 2792, category 0) classifies same as passive armor resist 2041", () => {
    const e = effect(2792, {
      category: 0,
      modifiers: [
        mod({ modifiedAttributeID: 267, modifyingAttributeID: 984 }),
        mod({ modifiedAttributeID: 268, modifyingAttributeID: 985 }),
        mod({ modifiedAttributeID: 269, modifyingAttributeID: 986 }),
        mod({ modifiedAttributeID: 270, modifyingAttributeID: 987 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "resist", layer: "armor", active: false });
  });
});

describe("classifyDefenseEffects - active hardeners", () => {
  test("active shield hardener (effect 5230, category 1) classifies as active shield resist", () => {
    const e = effect(5230, {
      category: 1,
      modifiers: [
        mod({ modifiedAttributeID: 271, modifyingAttributeID: 984 }),
        mod({ modifiedAttributeID: 272, modifyingAttributeID: 985 }),
        mod({ modifiedAttributeID: 273, modifyingAttributeID: 986 }),
        mod({ modifiedAttributeID: 274, modifyingAttributeID: 987 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "resist", layer: "shield", active: true });
  });

  test("active armor hardener (effect 5231, category 1) classifies as active armor resist", () => {
    const e = effect(5231, {
      category: 1,
      modifiers: [
        mod({ modifiedAttributeID: 267, modifyingAttributeID: 984 }),
        mod({ modifiedAttributeID: 268, modifyingAttributeID: 985 }),
        mod({ modifiedAttributeID: 269, modifyingAttributeID: 986 }),
        mod({ modifiedAttributeID: 270, modifyingAttributeID: 987 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "resist", layer: "armor", active: true });
  });
});

describe("classifyDefenseEffects - damage control", () => {
  test("damage control (effect 2302) classifies as damageControl when modifying all three layers", () => {
    const e = effect(2302, {
      category: 4,
      modifiers: [
        mod({ modifiedAttributeID: 267, modifyingAttributeID: 267, operation: 0 }),
        mod({ modifiedAttributeID: 268, modifyingAttributeID: 268, operation: 0 }),
        mod({ modifiedAttributeID: 269, modifyingAttributeID: 269, operation: 0 }),
        mod({ modifiedAttributeID: 270, modifyingAttributeID: 270, operation: 0 }),
        mod({ modifiedAttributeID: 113, modifyingAttributeID: 974, operation: 0 }),
        mod({ modifiedAttributeID: 111, modifyingAttributeID: 975, operation: 0 }),
        mod({ modifiedAttributeID: 109, modifyingAttributeID: 976, operation: 0 }),
        mod({ modifiedAttributeID: 110, modifyingAttributeID: 977, operation: 0 }),
        mod({ modifiedAttributeID: 271, modifyingAttributeID: 271, operation: 0 }),
        mod({ modifiedAttributeID: 272, modifyingAttributeID: 272, operation: 0 }),
        mod({ modifiedAttributeID: 273, modifyingAttributeID: 273, operation: 0 }),
        mod({ modifiedAttributeID: 274, modifyingAttributeID: 274, operation: 0 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "damageControl" });
  });
});

describe("classifyDefenseEffects - HP modules", () => {
  test("shield extender (effect 21, attr 263 op 2) classifies as hpFlat/shield", () => {
    const e = effect(21, {
      category: 4,
      modifiers: [mod({ modifiedAttributeID: 263, modifyingAttributeID: 72, operation: 2 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "hpFlat", layer: "shield" });
  });

  test("armor plate (effect 2837, attr 265 op 2) classifies as hpFlat/armor", () => {
    const e = effect(2837, {
      category: 4,
      modifiers: [mod({ modifiedAttributeID: 265, modifyingAttributeID: 1159, operation: 2 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "hpFlat", layer: "armor" });
  });

  test("Trimark rig (effect 271, attr 265 op 6) classifies as hpPercent/armor", () => {
    const e = effect(271, {
      category: 0,
      modifiers: [mod({ modifiedAttributeID: 265, modifyingAttributeID: 335, operation: 6 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "hpPercent", layer: "armor" });
  });

  test("Core Defense Field Extender (effect 446, attr 263 op 6) classifies as hpPercent/shield", () => {
    const e = effect(446, {
      category: 0,
      modifiers: [mod({ modifiedAttributeID: 263, modifyingAttributeID: 337, operation: 6 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "hpPercent", layer: "shield" });
  });

  test("hull bulkhead percent (effect 392, attr 9 op 6) classifies as hpPercent/hull", () => {
    const e = effect(392, {
      category: 0,
      modifiers: [mod({ modifiedAttributeID: 9, modifyingAttributeID: 327, operation: 6 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "hpPercent", layer: "hull" });
  });

  test("hull bulkhead multiplier (effect 60, attr 9 op 4) classifies as hullBulkheadMultiplier", () => {
    const e = effect(60, {
      category: 4,
      modifiers: [mod({ modifiedAttributeID: 9, modifyingAttributeID: 150, operation: 4 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "hullBulkheadMultiplier" });
  });
});

describe("classifyDefenseEffects - recharge modules", () => {
  test("shield recharger (effect 50, attr 479 op 4) classifies as recharge", () => {
    const e = effect(50, {
      category: 4,
      modifiers: [mod({ modifiedAttributeID: 479, modifyingAttributeID: 134, operation: 4 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "recharge" });
  });

  test("Core Defense Field Purger rig (effect 486, attr 479 op 6) classifies as rechargePercent", () => {
    const e = effect(486, {
      category: 0,
      modifiers: [mod({ modifiedAttributeID: 479, modifyingAttributeID: 338, operation: 6 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "rechargePercent" });
  });

  test("shield power relay (effect 5461, attr 479 op 6) classifies as rechargePercent", () => {
    const e = effect(5461, {
      category: 4,
      modifiers: [mod({ modifiedAttributeID: 479, modifyingAttributeID: 338, operation: 6 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "rechargePercent" });
  });
});

describe("classifyDefenseEffects - repairers (action effects)", () => {
  test("shield booster (effect 4, no modifierInfo, shieldBonus attr) classifies as shield repairer", () => {
    const e = effect(4, { category: 1, name: "shieldBoosting" });
    const td = typeDogma([{ attributeID: 68, value: 276 }]);
    const result = classifyDefenseEffects([e], td);
    expect(firstIntent(result)).toEqual({ tag: "repairer", layer: "shield", ancillary: false });
  });

  test("ancillary shield booster (effect 4936, fueled) classifies as ancillary shield repairer", () => {
    const e = effect(4936, { category: 1, name: "fueledShieldBoosting" });
    const td = typeDogma([{ attributeID: 68, value: 390 }]);
    const result = classifyDefenseEffects([e], td);
    expect(firstIntent(result)).toEqual({ tag: "repairer", layer: "shield", ancillary: true });
  });

  test("armor repairer (effect 27, no modifierInfo, armorDamageAmount attr) classifies as armor repairer", () => {
    const e = effect(27, { category: 1, name: "armorRepair" });
    const td = typeDogma([{ attributeID: 84, value: 920 }]);
    const result = classifyDefenseEffects([e], td);
    expect(firstIntent(result)).toEqual({ tag: "repairer", layer: "armor", ancillary: false });
  });

  test("ancillary armor repairer (effect 5275, fueled) classifies as ancillary armor repairer", () => {
    const e = effect(5275, { category: 1, name: "fueledArmorRepair" });
    const td = typeDogma([{ attributeID: 84, value: 207 }]);
    const result = classifyDefenseEffects([e], td);
    expect(firstIntent(result)).toEqual({ tag: "repairer", layer: "armor", ancillary: true });
  });

  test("hull repairer (effect 26, no modifierInfo, structureDamageAmount attr) classifies as hull repairer", () => {
    const e = effect(26, { category: 1, name: "structureRepair" });
    const td = typeDogma([{ attributeID: 83, value: 500 }]);
    const result = classifyDefenseEffects([e], td);
    expect(firstIntent(result)).toEqual({ tag: "repairer", layer: "hull", ancillary: false });
  });

  test("RAH (effect 4928, no modifierInfo, resistanceShiftAmount attr) classifies as rah", () => {
    const e = effect(4928, { category: 1, name: "adaptiveArmorHardener" });
    const td = typeDogma([{ attributeID: 1849, value: 6 }]);
    const result = classifyDefenseEffects([e], td);
    expect(firstIntent(result)).toEqual({ tag: "rah" });
  });
});

describe("classifyDefenseEffects - amplifiers", () => {
  test("shield boost amplifier (effect 1720, LocationRequiredSkillModifier on attr 68) classifies as boostAmplifier", () => {
    const e = effect(1720, {
      category: 4,
      modifiers: [
        mod({ func: "LocationRequiredSkillModifier", modifiedAttributeID: 68, modifyingAttributeID: 548, skillTypeID: 21802 }),
        mod({ func: "LocationRequiredSkillModifier", modifiedAttributeID: 68, modifyingAttributeID: 548, skillTypeID: 3416 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "boostAmplifier" });
  });

  test("Auxiliary Nano Pump (effect 1281, LocationRequiredSkillModifier on attr 84) classifies as repairAmplifier/amount", () => {
    const e = effect(1281, {
      category: 0,
      modifiers: [
        mod({ func: "LocationRequiredSkillModifier", modifiedAttributeID: 84, modifyingAttributeID: 806, skillTypeID: 3393 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "repairAmplifier", sub: "amount" });
  });

  test("Nanobot Accelerator (effect 272, LocationRequiredSkillModifier on attr 73) classifies as repairAmplifier/cycleTime", () => {
    const e = effect(272, {
      category: 0,
      modifiers: [
        mod({ func: "LocationRequiredSkillModifier", modifiedAttributeID: 73, modifyingAttributeID: 312, skillTypeID: 3393 }),
      ],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(firstIntent(result)).toEqual({ tag: "repairAmplifier", sub: "cycleTime" });
  });
});

describe("classifyDefenseEffects - unclassified effects", () => {
  test("effect with non-combat modifierInfo returns empty intents", () => {
    const e = effect(9999, {
      category: 0,
      modifiers: [mod({ modifiedAttributeID: 1234, modifyingAttributeID: 5678 })],
    });
    const result = classifyDefenseEffects([e], undefined);
    expect(result.intents).toHaveLength(0);
  });

  test("effect with no modifierInfo and no defense attributes returns empty intents", () => {
    const e = effect(9999, { category: 0 });
    const td = typeDogma([{ attributeID: 100, value: 50 }]);
    const result = classifyDefenseEffects([e], td);
    expect(result.intents).toHaveLength(0);
  });

  test("multiple effects classify independently", () => {
    const resistEffect = effect(2052, {
      category: 4,
      modifiers: [mod({ modifiedAttributeID: 271, modifyingAttributeID: 984 })],
    });
    const extenderEffect = effect(21, {
      category: 4,
      modifiers: [mod({ modifiedAttributeID: 263, modifyingAttributeID: 72, operation: 2 })],
    });
    const result = classifyDefenseEffects([resistEffect, extenderEffect], undefined);
    expect(result.intents).toHaveLength(2);
    expect(result.intents[0]?.intent.tag).toBe("resist");
    expect(result.intents[1]?.intent.tag).toBe("hpFlat");
  });
});
