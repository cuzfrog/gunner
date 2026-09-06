import { DimensionedSelectionImpl } from "./dimensionedSelection";
import type { DimensionKeyer } from "./dimensionKeyer";
import type { StoredSelection } from "./selectionSession";
import { SelectionSessionImpl } from "./selectionSession";

interface TestDimension {
  readonly category: string;
  readonly size: string;
}

function makeKeyer(fallbacks: Record<string, StoredSelection>): DimensionKeyer<TestDimension> {
  return {
    key(dimension: TestDimension): string {
      return `${dimension.category}:${dimension.size}`;
    },
    fallback(dimension: TestDimension): StoredSelection {
      return fallbacks[`${dimension.category}:${dimension.size}`];
    },
  };
}

describe("DimensionedSelectionImpl", () => {
  test("selectionFor returns fallback when nothing is remembered", () => {
    const session = new SelectionSessionImpl();
    const keyer = makeKeyer({ "laser:small": { moduleId: "default-laser" as never } });
    const selection = new DimensionedSelectionImpl<TestDimension>(session, keyer);
    expect(selection.selectionFor({ category: "laser", size: "small" })).toEqual({ moduleId: "default-laser" as never });
  });

  test("selectionFor returns remembered value after noteApplied", () => {
    const session = new SelectionSessionImpl();
    const keyer = makeKeyer({ "laser:small": { moduleId: "default-laser" as never } });
    const selection = new DimensionedSelectionImpl<TestDimension>(session, keyer);
    const custom: StoredSelection = { moduleId: "custom-laser" as never, ammoId: "ammo1" as never };
    selection.noteApplied({ category: "laser", size: "small" }, custom);
    expect(selection.selectionFor({ category: "laser", size: "small" })).toEqual(custom);
  });

  test("selectionFor returns remembered value with ammoId", () => {
    const session = new SelectionSessionImpl();
    const keyer = makeKeyer({ "laser:small": { moduleId: "default-laser" as never } });
    const selection = new DimensionedSelectionImpl<TestDimension>(session, keyer);
    selection.noteApplied({ category: "laser", size: "small" }, { moduleId: "custom-laser" as never, ammoId: "ammo1" as never });
    const result = selection.selectionFor({ category: "laser", size: "small" })!;
    expect(result.moduleId).toBe("custom-laser" as never);
    expect(result.ammoId).toBe("ammo1" as never);
  });

  test("different dimensions are independent", () => {
    const session = new SelectionSessionImpl();
    const keyer = makeKeyer({
      "laser:small": { moduleId: "default-laser" as never },
      "rail:small": { moduleId: "default-rail" as never },
    });
    const selection = new DimensionedSelectionImpl<TestDimension>(session, keyer);
    selection.noteApplied({ category: "laser", size: "small" }, { moduleId: "custom-laser" as never });
    expect(selection.selectionFor({ category: "laser", size: "small" })?.moduleId).toBe("custom-laser" as never);
    expect(selection.selectionFor({ category: "rail", size: "small" })?.moduleId).toBe("default-rail" as never);
  });

  test("noteApplied overwrites previous value for same dimension", () => {
    const session = new SelectionSessionImpl();
    const keyer = makeKeyer({ "laser:small": { moduleId: "default-laser" as never } });
    const selection = new DimensionedSelectionImpl<TestDimension>(session, keyer);
    selection.noteApplied({ category: "laser", size: "small" }, { moduleId: "first" as never });
    selection.noteApplied({ category: "laser", size: "small" }, { moduleId: "second" as never });
    expect(selection.selectionFor({ category: "laser", size: "small" })?.moduleId).toBe("second" as never);
  });

  test("clear on session removes all remembered values", () => {
    const session = new SelectionSessionImpl();
    const keyer = makeKeyer({ "laser:small": { moduleId: "default-laser" as never } });
    const selection = new DimensionedSelectionImpl<TestDimension>(session, keyer);
    selection.noteApplied({ category: "laser", size: "small" }, { moduleId: "custom-laser" as never });
    session.clear();
    expect(selection.selectionFor({ category: "laser", size: "small" })?.moduleId).toBe("default-laser" as never);
  });

  test("shared session backs multiple DimensionedSelection instances without collision", () => {
    const session = new SelectionSessionImpl();
    const laserKeyer = makeKeyer({ "laser:small": { moduleId: "default-laser" as never } });
    const railKeyer = makeKeyer({ "rail:small": { moduleId: "default-rail" as never } });
    const laserSelection = new DimensionedSelectionImpl<TestDimension>(session, laserKeyer);
    const railSelection = new DimensionedSelectionImpl<TestDimension>(session, railKeyer);
    laserSelection.noteApplied({ category: "laser", size: "small" }, { moduleId: "custom-laser" as never });
    expect(laserSelection.selectionFor({ category: "laser", size: "small" })?.moduleId).toBe("custom-laser" as never);
    expect(railSelection.selectionFor({ category: "rail", size: "small" })?.moduleId).toBe("default-rail" as never);
  });

  test("clear on shared session clears all DimensionedSelection instances", () => {
    const session = new SelectionSessionImpl();
    const laserKeyer = makeKeyer({ "laser:small": { moduleId: "default-laser" as never } });
    const railKeyer = makeKeyer({ "rail:small": { moduleId: "default-rail" as never } });
    const laserSelection = new DimensionedSelectionImpl<TestDimension>(session, laserKeyer);
    const railSelection = new DimensionedSelectionImpl<TestDimension>(session, railKeyer);
    laserSelection.noteApplied({ category: "laser", size: "small" }, { moduleId: "custom-laser" as never });
    railSelection.noteApplied({ category: "rail", size: "small" }, { moduleId: "custom-rail" as never });
    session.clear();
    expect(laserSelection.selectionFor({ category: "laser", size: "small" })?.moduleId).toBe("default-laser" as never);
    expect(railSelection.selectionFor({ category: "rail", size: "small" })?.moduleId).toBe("default-rail" as never);
  });

  test("cross-domain keys with overlapping string values do not collide", () => {
    const session = new SelectionSessionImpl();
    const keyerA = makeKeyer({ "rocket:small": { moduleId: "turret-rocket" as never } });
    const keyerB: DimensionKeyer<{ readonly class: string }> = {
      key(d) { return `launcher:${d.class}`; },
      fallback() { return { moduleId: "launcher-rocket" as never }; },
    };
    const selectionA = new DimensionedSelectionImpl(session, keyerA);
    const selectionB = new DimensionedSelectionImpl(session, keyerB);
    selectionA.noteApplied({ category: "rocket", size: "small" }, { moduleId: "custom-turret" as never });
    expect(selectionA.selectionFor({ category: "rocket", size: "small" })?.moduleId).toBe("custom-turret" as never);
    expect(selectionB.selectionFor({ class: "rocket" })?.moduleId).toBe("launcher-rocket" as never);
  });
});
