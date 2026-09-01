import { _computeDroneControlRange } from "./fittingCalculator";
import type { FittingModuleStats } from "../gamedata/fittingDb";
import type { FittedModule } from "./fittingState";
import { toTypeId, type TypeId } from "../gamedata/ids";

function fittedModule(moduleId: string): FittedModule {
  return { moduleId: toTypeId(moduleId), charges: [] };
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
