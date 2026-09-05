import { assertClassificationComplete, failOnClassificationErrors } from "./classify";
import type { SdeProjection } from "../projectionTypes";

function makeMiniProjection(): SdeProjection {
  return {
    generatedAt: "2026-01-01",
    attributes: {
      "1": { id: 1, name: "attr1", defaultValue: 0, highIsGood: true, stackable: true },
      "2": { id: 2, name: "attr2", defaultValue: 0, highIsGood: false, stackable: true },
    },
    effects: {
      "10": { id: 10, name: "effect10", category: 0, modifiers: [] },
      "20": { id: 20, name: "effect20", category: 1, modifiers: [{ domain: "ship", func: "ItemModifier", modifiedAttributeID: 1, modifyingAttributeID: 2, operation: 6 }] },
    },
    types: {
      "100": { typeId: 100, groupId: 6, published: true, attributes: [{ attributeId: 1, value: 5 }], effectIds: [10] },
    },
  };
}

describe("assertClassificationComplete", () => {
  test("passes when all attributes and effects are classified", () => {
    const projection = makeMiniProjection();
    const result = assertClassificationComplete(projection, {
      1: { kind: "semantic", id: 1, name: "attr1", semantic: "maxVelocity" },
      2: { kind: "outOfScope", id: 2, name: "attr2", domain: "other", reason: "test" },
    }, {
      10: { kind: "ignored", id: 10, name: "effect10", reason: "test" },
      20: { kind: "modifier", id: 20, name: "effect20", projection: "hullBonus", scalesWithHullSkill: true },
    });
    expect(result.missingAttributeIds).toEqual([]);
    expect(result.extraAttributeIds).toEqual([]);
    expect(result.missingEffectIds).toEqual([]);
    expect(result.extraEffectIds).toEqual([]);
    expect(result.attributeNameMismatches).toEqual([]);
    expect(result.effectNameMismatches).toEqual([]);
  });

  test("reports missing attribute classifications", () => {
    const projection = makeMiniProjection();
    const result = assertClassificationComplete(projection, {
      1: { kind: "semantic", id: 1, name: "attr1", semantic: "maxVelocity" },
    }, {
      10: { kind: "ignored", id: 10, name: "effect10", reason: "test" },
      20: { kind: "modifier", id: 20, name: "effect20", projection: "hullBonus", scalesWithHullSkill: true },
    });
    expect(result.missingAttributeIds).toEqual([2]);
  });

  test("reports extra attribute classifications not in SDE", () => {
    const projection = makeMiniProjection();
    const result = assertClassificationComplete(projection, {
      1: { kind: "semantic", id: 1, name: "attr1", semantic: "maxVelocity" },
      2: { kind: "outOfScope", id: 2, name: "attr2", domain: "other", reason: "test" },
      999: { kind: "outOfScope", id: 999, name: "gone", domain: "other", reason: "removed from SDE" },
    }, {
      10: { kind: "ignored", id: 10, name: "effect10", reason: "test" },
      20: { kind: "modifier", id: 20, name: "effect20", projection: "hullBonus", scalesWithHullSkill: true },
    });
    expect(result.extraAttributeIds).toEqual([999]);
  });

  test("reports missing effect classifications", () => {
    const projection = makeMiniProjection();
    const result = assertClassificationComplete(projection, {
      1: { kind: "semantic", id: 1, name: "attr1", semantic: "maxVelocity" },
      2: { kind: "outOfScope", id: 2, name: "attr2", domain: "other", reason: "test" },
    }, {
      10: { kind: "ignored", id: 10, name: "effect10", reason: "test" },
    });
    expect(result.missingEffectIds).toEqual([20]);
  });

  test("reports attribute name mismatches", () => {
    const projection = makeMiniProjection();
    const result = assertClassificationComplete(projection, {
      1: { kind: "semantic", id: 1, name: "wrongName", semantic: "maxVelocity" },
      2: { kind: "outOfScope", id: 2, name: "attr2", domain: "other", reason: "test" },
    }, {
      10: { kind: "ignored", id: 10, name: "effect10", reason: "test" },
      20: { kind: "modifier", id: 20, name: "effect20", projection: "hullBonus", scalesWithHullSkill: true },
    });
    expect(result.attributeNameMismatches).toHaveLength(1);
    expect(result.attributeNameMismatches[0].id).toBe(1);
    expect(result.attributeNameMismatches[0].classificationName).toBe("wrongName");
    expect(result.attributeNameMismatches[0].projectionName).toBe("attr1");
  });

  test("failOnClassificationErrors throws on missing attributes", () => {
    expect(() => failOnClassificationErrors({
      missingAttributeIds: [42],
      extraAttributeIds: [],
      missingEffectIds: [],
      extraEffectIds: [],
      attributeNameMismatches: [],
      effectNameMismatches: [],
    })).toThrow(/Missing attribute classifications/);
  });

  test("failOnClassificationErrors does not throw when complete", () => {
    expect(() => failOnClassificationErrors({
      missingAttributeIds: [],
      extraAttributeIds: [],
      missingEffectIds: [],
      extraEffectIds: [],
      attributeNameMismatches: [],
      effectNameMismatches: [],
    })).not.toThrow();
  });
});
