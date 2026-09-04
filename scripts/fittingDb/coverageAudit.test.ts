import { auditCoverage, type AuditContext } from "./coverageAudit";
import type { SdeDogmaEffect, SdeDogmaEffectModifier, SdeType, SdeTypeDogma } from "./dogmaTypes";

function makeType(typeId: number, groupId: number, name = "Test Module"): SdeType {
  return { typeID: typeId, "typeName_en-us": name, groupID: groupId, published: 1 };
}

function makeTypeDogma(attrs: readonly { attributeID: number; value: number }[] = [], effectIds: readonly number[] = []): SdeTypeDogma {
  return {
    dogmaAttributes: attrs,
    dogmaEffects: effectIds.map((eid) => ({ effectID: eid, isDefault: 0 })),
  };
}

function makeEffect(eid: number, opts: { category?: number; modifiers?: readonly SdeDogmaEffectModifier[]; name?: string } = {}): SdeDogmaEffect {
  return {
    effectID: eid,
    effectName: opts.name,
    effectCategory: opts.category ?? 0,
    modifierInfo: opts.modifiers,
  };
}

function makeContext(overrides: Partial<AuditContext> = {}): AuditContext {
  return {
    types: {},
    typedogmas: {},
    dogmaEffects: {},
    moduleGroupIds: new Set([40, 60, 773]),
    generatedModules: new Map(),
    ...overrides,
  };
}

describe("auditCoverage - signatureWithoutStats", () => {
  test("fails when a module has defense attributes and classifiable intent but no generated defense", () => {
    const typeId = 30987;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 773, "Small Trimark Armor Pump I") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma(
        [{ attributeID: 335, value: 15 }],
        [271],
      ),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "271": makeEffect(271, {
        category: 0,
        modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 265, modifyingAttributeID: 335, operation: 6 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Small Trimark Armor Pump I", hasDefense: false }]]) });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.category).toBe("signatureWithoutStats");
    expect(failures[0]?.typeId).toBe(typeId);
  });

  test("does not fail when a module has defense attributes and generated defense stats", () => {
    const typeId = 11279;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 329, "1600mm Steel Plates I") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma(
        [{ attributeID: 1159, value: 3500 }],
        [2837],
      ),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "2837": makeEffect(2837, {
        category: 4,
        modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 265, modifyingAttributeID: 1159, operation: 2 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "1600mm Steel Plates I", hasDefense: true }]]) });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });

  test("does not fail for modules without defense-relevant attributes", () => {
    const typeId = 1001;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 773, "Non-defense Rig") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 999, value: 50 }], [9999]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "9999": makeEffect(9999, { category: 0, modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 999, modifyingAttributeID: 888, operation: 6 }] }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });
});

describe("auditCoverage - unclassifiedCombatModifier", () => {
  test("fails when an ItemModifier modifies a defense-relevant attribute but classifier does not recognize it", () => {
    const typeId = 2001;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 60, "Unknown Defense Module") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 265, value: 100 }], [8888]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "8888": makeEffect(8888, {
        category: 0,
        modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 265, modifyingAttributeID: 999, operation: 99 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Unknown Defense Module", hasDefense: true }]]) });
    const failures = auditCoverage(ctx);
    expect(failures.some((f) => f.category === "unclassifiedCombatModifier")).toBe(true);
  });

  test("fails when a LocationRequiredSkillModifier modifies an amplifier attribute but classifier does not recognize it", () => {
    const typeId = 2002;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 773, "Unknown Amplifier Rig") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 806, value: 15 }], [7777]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "7777": makeEffect(7777, {
        category: 0,
        modifiers: [{ domain: "shipID", func: "LocationRequiredSkillModifier", modifiedAttributeID: 84, modifyingAttributeID: 806, operation: 99, skillTypeID: 3393 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Unknown Amplifier Rig", hasDefense: true }]]) });
    const failures = auditCoverage(ctx);
    expect(failures.some((f) => f.category === "unclassifiedCombatModifier")).toBe(true);
  });
});

describe("auditCoverage - defenseAttrWithoutIntent", () => {
  test("fails when a module has shieldBonus attribute but no repairer intent (no matching action effect)", () => {
    const typeId = 5001;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 40, "Mystery Shield Booster") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 68, value: 200 }], [9999]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "9999": makeEffect(9999, { category: 0, name: "unknownEffect" }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Mystery Shield Booster", hasDefense: true }]]) });
    const failures = auditCoverage(ctx);
    expect(failures.some((f) => f.category === "defenseAttrWithoutIntent")).toBe(true);
  });

  test("does not fail when a module has shieldBonus attribute and a repairer intent", () => {
    const typeId = 5002;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 40, "Shield Booster") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 68, value: 200 }], [4]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "4": makeEffect(4, { category: 1, name: "shieldBoosting" }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Shield Booster", hasDefense: true }]]) });
    const failures = auditCoverage(ctx);
    expect(failures.some((f) => f.category === "defenseAttrWithoutIntent")).toBe(false);
  });
});

describe("auditCoverage - edge cases", () => {
  test("skips unpublished types", () => {
    const typeId = 3001;
    const types: Record<string, SdeType> = { [typeId]: { ...makeType(typeId, 773), published: 0 } };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 335, value: 15 }], [271]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "271": makeEffect(271, {
        category: 0,
        modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 265, modifyingAttributeID: 335, operation: 6 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });

  test("skips types not in module groups", () => {
    const typeId = 4001;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 999, "Out-of-scope Module") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 335, value: 15 }], [271]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "271": makeEffect(271, {
        category: 0,
        modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 265, modifyingAttributeID: 335, operation: 6 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });
});

describe("auditCoverage - turret/missile combat modifiers", () => {
  test("does not fail when turret LocationGroupModifier is classified", () => {
    const typeId = 6001;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 311, "Gyrostabilizer II") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 64, value: 25 }], [92]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "92": makeEffect(92, {
        category: 4,
        modifiers: [{ domain: "shipID", func: "LocationGroupModifier", modifiedAttributeID: 64, modifyingAttributeID: 204, operation: 4, groupID: 55 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([311]) });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });

  test("fails when turret LocationGroupModifier is not classified", () => {
    const typeId = 6002;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 311, "Mystery Turret Mod") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 64, value: 25 }], [8888]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "8888": makeEffect(8888, {
        category: 4,
        modifiers: [{ domain: "shipID", func: "LocationGroupModifier", modifiedAttributeID: 64, modifyingAttributeID: 204, operation: 99, groupID: 55 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([311]) });
    const failures = auditCoverage(ctx);
    expect(failures.some((f) => f.category === "unclassifiedCombatModifier")).toBe(true);
  });

  test("does not fail when missile ItemModifier is classified", () => {
    const typeId = 6003;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 311, "BCS II") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 212, value: 50 }], [763]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "763": makeEffect(763, {
        category: 4,
        modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 212, modifyingAttributeID: 212, operation: 0 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([311]) });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });

  test("fails when missile ItemModifier on missileDamageMultiplier is not classified", () => {
    const typeId = 6004;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 311, "Mystery Missile Mod") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 212, value: 50 }], [7777]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "7777": makeEffect(7777, {
        category: 4,
        modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 212, modifyingAttributeID: 212, operation: 99 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([311]) });
    const failures = auditCoverage(ctx);
    expect(failures.some((f) => f.category === "unclassifiedCombatModifier")).toBe(true);
  });

  test("does not fail when missile LocationRequiredSkillModifier speed is classified", () => {
    const typeId = 6005;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 311, "BCS II") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 51, value: 90 }], [889]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "889": makeEffect(889, {
        category: 4,
        modifiers: [{ domain: "shipID", func: "LocationRequiredSkillModifier", modifiedAttributeID: 51, modifyingAttributeID: 204, operation: 4, skillTypeID: 3319 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([311]) });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });

  test("fails when missile LocationRequiredSkillModifier speed is not classified", () => {
    const typeId = 6006;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 311, "Mystery Missile RoF Mod") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 51, value: 90 }], [6666]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "6666": makeEffect(6666, {
        category: 4,
        modifiers: [{ domain: "shipID", func: "LocationRequiredSkillModifier", modifiedAttributeID: 51, modifyingAttributeID: 204, operation: 99, skillTypeID: 3319 }],
      }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([311]) });
    const failures = auditCoverage(ctx);
    expect(failures.some((f) => f.category === "unclassifiedCombatModifier")).toBe(true);
  });
});
