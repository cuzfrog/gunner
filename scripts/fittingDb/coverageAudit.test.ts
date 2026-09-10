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
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Small Trimark Armor Pump I", hasDefense: false, hasCapacitor: false }]]) });
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
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "1600mm Steel Plates I", hasDefense: true, hasCapacitor: false }]]) });
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
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Unknown Defense Module", hasDefense: true, hasCapacitor: false }]]) });
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
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Unknown Amplifier Rig", hasDefense: true, hasCapacitor: false }]]) });
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
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Mystery Shield Booster", hasDefense: true, hasCapacitor: false }]]) });
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
    const ctx = makeContext({ types, typedogmas, dogmaEffects, generatedModules: new Map([[typeId, { typeId, typeName: "Shield Booster", hasDefense: true, hasCapacitor: false }]]) });
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

describe("auditCoverage - capacitor modules", () => {
  const CAP_RECHARGER_GROUP = 43;
  const CAP_BATTERY_GROUP = 61;
  const NEUTRALIZER_GROUP = 71;
  const generated = (typeId: number, name: string, hasDefense: boolean, hasCapacitor: boolean) => new Map([[typeId, { typeId, typeName: name, hasDefense, hasCapacitor }]]);

  test("fails when a capacitor module has capacitor attributes but no generated capacitor stats", () => {
    const typeId = 2032;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, CAP_RECHARGER_GROUP, "Cap Recharger II") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 144, value: 0.8 }], [51]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "51": makeEffect(51, { category: 4, modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 55, modifyingAttributeID: 144, operation: 4 }] }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([CAP_RECHARGER_GROUP]), generatedModules: generated(typeId, "Cap Recharger II", false, false) });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.category).toBe("signatureWithoutStats");
  });

  test("does not fail when a capacitor module has generated capacitor stats", () => {
    const typeId = 3504;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, CAP_BATTERY_GROUP, "Large Cap Battery II") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 67, value: 1625 }], [25]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "25": makeEffect(25, { category: 4, modifiers: [{ domain: "shipID", func: "ItemModifier", modifiedAttributeID: 482, modifyingAttributeID: 67, operation: 2 }] }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([CAP_BATTERY_GROUP]), generatedModules: generated(typeId, "Large Cap Battery II", false, true) });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });

  test("does not fail for capacitor groups without capacitor attributes", () => {
    const typeId = 11289;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, 87, "Cap Booster 800") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([], [804]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {
      "804": makeEffect(804, { category: 0, modifiers: [{ domain: "itemID", func: "ItemModifier", modifiedAttributeID: 6, modifyingAttributeID: 2104, operation: 6 }] }),
    };
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([87]) });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });

  test("does not flag a warfare neutralizer with generated stats", () => {
    const typeId = 12271;
    const types: Record<string, SdeType> = { [typeId]: makeType(typeId, NEUTRALIZER_GROUP, "Heavy Energy Neutralizer II") };
    const typedogmas: Record<string, SdeTypeDogma> = {
      [typeId]: makeTypeDogma([{ attributeID: 97, value: 600 }], [6187]),
    };
    const dogmaEffects: Record<string, SdeDogmaEffect> = {};
    const ctx = makeContext({ types, typedogmas, dogmaEffects, moduleGroupIds: new Set([NEUTRALIZER_GROUP]), generatedModules: generated(typeId, "Heavy Energy Neutralizer II", false, true) });
    const failures = auditCoverage(ctx);
    expect(failures).toHaveLength(0);
  });
});
