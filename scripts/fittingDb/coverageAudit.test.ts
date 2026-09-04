import { auditCoverage, type AuditContext } from "./coverageAudit";
import type { SdeDogmaEffect, SdeType, SdeTypeDogma } from "./dogmaTypes";

function makeType(typeId: number, groupId: number, name = "Test Module"): SdeType {
  return { typeID: typeId, "typeName_en-us": name, groupID: groupId, published: 1 };
}

function makeTypeDogma(attrs: readonly { attributeID: number; value: number }[] = [], effectIds: readonly number[] = []): SdeTypeDogma {
  return {
    dogmaAttributes: attrs,
    dogmaEffects: effectIds.map((eid) => ({ effectID: eid, isDefault: 0 })),
  };
}

function makeEffect(eid: number, opts: { category?: number; modifiers?: readonly object[]; name?: string } = {}): SdeDogmaEffect {
  return {
    effectID: eid,
    effectName: opts.name,
    effectCategory: opts.category ?? 0,
    modifierInfo: opts.modifiers as any,
  };
}

function makeContext(overrides: Partial<AuditContext> = {}): AuditContext {
  return {
    types: {},
    typedogmas: {},
    dogmaEffects: {},
    moduleGroupIds: new Set([60, 773]),
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
