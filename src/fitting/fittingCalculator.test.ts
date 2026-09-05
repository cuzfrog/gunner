import { _computeDroneControlRange, _applyRigDrawbackReduction } from "./fittingCalculator";
import type { FittingModuleStats, RigDrawback, RigDrawbackReduction } from "../gamedata/fittingDb";
import type { FittedModule } from "./fittingState";
import { toTypeId, type TypeId } from "../gamedata/ids";

function fittedModule(moduleId: string): FittedModule {
  return { moduleId: toTypeId(moduleId), offline: false };
}

function modules(record: Record<string, Partial<FittingModuleStats>>): Readonly<Record<string, FittingModuleStats>> {
  const result: Record<string, FittingModuleStats> = {};
  for (const [id, stats] of Object.entries(record)) {
    result[id] = { ...stats, id: toTypeId(id), name: `Module ${id}` } as FittingModuleStats;
  }
  return result;
}

describe("_computeDroneControlRange", () => {
  test("base range is 20000 at skill level 0 with no modules", () => {
    expect(_computeDroneControlRange([], modules({}), 0)).toBe(20000);
  });

  test("skill level 5 adds 40000 (8000 per level)", () => {
    expect(_computeDroneControlRange([], modules({}), 5)).toBe(60000);
  });

  test("Drone Link Augmentor I adds 20000", () => {
    const mods: readonly FittedModule[] = [fittedModule("23527")];
    const db = modules({ "23527": { droneControlRangeBonus: 20000 } });
    expect(_computeDroneControlRange(mods, db, 5)).toBe(80000);
  });

  test("multiple Drone Link Augmentors stack additively", () => {
    const mods: readonly FittedModule[] = [fittedModule("23527"), fittedModule("24427")];
    const db = modules({ "23527": { droneControlRangeBonus: 20000 }, "24427": { droneControlRangeBonus: 24000 } });
    expect(_computeDroneControlRange(mods, db, 5)).toBe(104000);
  });

  test("modules without droneControlRangeBonus are ignored", () => {
    const mods: readonly FittedModule[] = [fittedModule("99999")];
    const db = modules({ "99999": {} });
    expect(_computeDroneControlRange(mods, db, 0)).toBe(20000);
  });
});

describe("_applyRigDrawbackReduction", () => {
  const shieldDrawback: RigDrawback = { kind: "signature", percent: 10, groupId: 774 };
  const armorDrawback: RigDrawback = { kind: "agility", percent: 10, groupId: 773 };
  const reductions: readonly RigDrawbackReduction[] = [
    { skillId: toTypeId("26261"), groupId: 774, magnitudePerLevel: -10 },
    { skillId: toTypeId("26253"), groupId: 773, magnitudePerLevel: -10 },
  ];

  test("no reduction at skill level 0", () => {
    expect(_applyRigDrawbackReduction(shieldDrawback, reductions, 0)).toBe(10);
  });

  test("shield rigging 5 reduces signature drawback by 50%", () => {
    expect(_applyRigDrawbackReduction(shieldDrawback, reductions, 5)).toBe(5);
  });

  test("armor rigging 5 reduces agility drawback by 50%", () => {
    expect(_applyRigDrawbackReduction(armorDrawback, reductions, 5)).toBe(5);
  });

  test("no matching reduction returns original percent", () => {
    const navDrawback: RigDrawback = { kind: "signature", percent: 10, groupId: 782 };
    expect(_applyRigDrawbackReduction(navDrawback, reductions, 5)).toBe(10);
  });

  test("empty reductions returns original percent", () => {
    expect(_applyRigDrawbackReduction(shieldDrawback, [], 5)).toBe(10);
  });
});
