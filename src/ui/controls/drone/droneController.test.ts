import { buildDrone, importedDroneFixture, NEUTRAL_CONDITIONS } from "./testSupport";
import { FakeElement, getFake, IMPORTED_RIFTER } from "../testSupport";
import type { DroneGroup, DroneLoadoutContext, DroneLoadoutViolation, ImportedFitting } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { StatConditions } from "../../../ships";

const HOBGOBLIN_ID = "80001" as TypeId;
const WARRIOR_ID = "80005" as TypeId;

function importedWithDrones(drones: readonly ReturnType<typeof importedDroneFixture>[]): ImportedFitting {
  return { ...IMPORTED_RIFTER, drones };
}

function resolverReturningDrones(drones: readonly ReturnType<typeof importedDroneFixture>[]) {
  return {
    resolve: vi.fn((_groups: readonly DroneGroup[], _fitting: DroneLoadoutContext, _conditions: StatConditions) => drones),
  };
}

describe("DroneController", () => {
  test("initial state has no drone", () => {
    const { controller } = buildDrone();
    expect(controller.drone()).toBeUndefined();
    expect(controller.currentDroneSpecs()).toEqual([]);
  });

  test("applyImported with drones selects the first drone and renders telemetry", () => {
    const { document, controller, droneLoadoutResolver } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([importedDroneFixture()]),
    });
    const drone = importedDroneFixture();
    controller.applyImported(importedWithDrones([drone]), NEUTRAL_CONDITIONS);
    expect(controller.drone()?.typeId).toBe(HOBGOBLIN_ID);
    expect(getFake(document, "ship-a-drone-summary").textContent).toBe("Hobgoblin I");
    expect(getFake(document, "ship-a-drone-tracking").textContent).not.toBe("-");
    expect(getFake(document, "ship-a-drone-optimal").textContent).not.toBe("-");
    expect(getFake(document, "ship-a-drone-damage").textContent).not.toBe("-");
    expect(getFake(document, "ship-a-drone-count").textContent).toBe("5");
    expect(droneLoadoutResolver.resolve).toHaveBeenCalledTimes(1);
  });

  test("applyImported without drones leaves no drone", () => {
    const { controller } = buildDrone();
    controller.applyImported(importedWithDrones([]), NEUTRAL_CONDITIONS);
    expect(controller.drone()).toBeUndefined();
  });

  test("trigger is disabled when no drones are fitted", () => {
    const { document, controller } = buildDrone();
    controller.applyImported(importedWithDrones([]), NEUTRAL_CONDITIONS);
    expect(getFake(document, "ship-a-drone-trigger").disabled).toBe(true);
  });

  test("trigger is enabled when drones are fitted", () => {
    const { document, controller } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([importedDroneFixture()]),
    });
    controller.applyImported(importedWithDrones([importedDroneFixture()]), NEUTRAL_CONDITIONS);
    expect(getFake(document, "ship-a-drone-trigger").disabled).toBe(false);
  });

  test("currentDroneSpecs maps all fields correctly", () => {
    const { controller } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([
        importedDroneFixture({ emDamage: 10, thermalDamage: 20, kineticDamage: 5, explosiveDamage: 15, damageMultiplier: 2 }),
      ]),
    });
    controller.applyImported(importedWithDrones([importedDroneFixture()]), NEUTRAL_CONDITIONS);
    const specs = controller.currentDroneSpecs();
    expect(specs).toHaveLength(1);
    const spec = specs[0];
    expect(spec.kind).toBe("drone");
    expect(spec.tracking).toBe(0.4);
    expect(spec.sigResolution).toBe(25);
    expect(spec.optimal).toBe(1000);
    expect(spec.falloff).toBe(500);
    expect(spec.damagePerShot).toBe(100);
    expect(spec.cycleTime).toBe(4);
    expect(spec.droneCount).toBe(5);
    expect(spec.maxVelocity).toBe(1200);
    expect(spec.orbitSpeed).toBe(600);
    expect(spec.isSentry).toBe(false);
  });

  test("sentry drones show dashes for orbit speed and max velocity", () => {
    const { document, controller } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([importedDroneFixture({ sizeClass: "sentry", maxVelocity: 0, orbitSpeed: 0 })]),
    });
    controller.applyImported(importedWithDrones([importedDroneFixture({ sizeClass: "sentry" })]), NEUTRAL_CONDITIONS);
    expect(getFake(document, "ship-a-drone-orbit-speed").textContent).toBe("-");
    expect(getFake(document, "ship-a-drone-max-velocity").textContent).toBe("-");
  });

  test("restore with fitting text and droneGroups selects the specified drones", () => {
    const hobgoblin = importedDroneFixture();
    const warrior = importedDroneFixture({ typeId: WARRIOR_ID, name: "Warrior I" });
    const { controller, fittingImport, droneLoadoutResolver } = buildDrone({
      fittingImport: {
        importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, drones: [hobgoblin, warrior] })),
      },
      droneLoadoutResolver: resolverReturningDrones([warrior]),
    });
    controller.restore("[Rifter, Test]", NEUTRAL_CONDITIONS, [{ typeId: WARRIOR_ID, count: 1 }]);
    expect(controller.drone()?.typeId).toBe(WARRIOR_ID);
    expect(fittingImport.importFitting).toHaveBeenCalled();
    expect(droneLoadoutResolver.resolve).toHaveBeenCalledTimes(1);
  });

  test("restore with missing droneGroups falls back to imported drones", () => {
    const hobgoblin = importedDroneFixture();
    const warrior = importedDroneFixture({ typeId: WARRIOR_ID, name: "Warrior I" });
    const { controller } = buildDrone({
      fittingImport: {
        importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, drones: [hobgoblin, warrior] })),
      },
      droneLoadoutResolver: resolverReturningDrones([hobgoblin, warrior]),
    });
    controller.restore("[Rifter, Test]", NEUTRAL_CONDITIONS);
    expect(controller.drone()?.typeId).toBe(HOBGOBLIN_ID);
  });

  test("restore with unknown droneTypeId falls back to imported drones", () => {
    const hobgoblin = importedDroneFixture();
    const { controller, droneLoadoutResolver } = buildDrone({
      fittingImport: {
        importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, drones: [hobgoblin] })),
      },
      droneLoadoutResolver: resolverReturningDrones([hobgoblin]),
      droneCatalog: { has: vi.fn(() => false) },
    });
    controller.restore("[Rifter, Test]", NEUTRAL_CONDITIONS, [{ typeId: "99999" as TypeId, count: 1 }]);
    expect(controller.drone()?.typeId).toBe(HOBGOBLIN_ID);
    const call = vi.mocked(droneLoadoutResolver.resolve).mock.calls[0];
    expect(call[0]).toEqual([{ typeId: HOBGOBLIN_ID, count: 5 }]);
  });

  test("restore with no fitting clears the drone", () => {
    const { controller } = buildDrone();
    controller.restore(undefined, undefined);
    expect(controller.drone()).toBeUndefined();
  });

  test("clear resets drone state", () => {
    const { controller } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([importedDroneFixture()]),
    });
    controller.applyImported(importedWithDrones([importedDroneFixture()]), NEUTRAL_CONDITIONS);
    expect(controller.drone()).toBeDefined();
    controller.clear();
    expect(controller.drone()).toBeUndefined();
  });

  test("capture returns the drone groups", () => {
    const { controller } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([importedDroneFixture()]),
    });
    controller.applyImported(importedWithDrones([importedDroneFixture()]), NEUTRAL_CONDITIONS);
    expect(controller.capture().droneGroups).toEqual([{ typeId: HOBGOBLIN_ID, count: 5 }]);
  });

  test("capture returns empty array when no drone is selected", () => {
    const { controller } = buildDrone();
    expect(controller.capture().droneGroups).toEqual([]);
  });

  test("clicking a drone item closes the popup without emitting configInvalidated", () => {
    const hobgoblin = importedDroneFixture();
    const warrior = importedDroneFixture({ typeId: WARRIOR_ID, name: "Warrior I" });
    const { document, controller, events, popupGroup } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([hobgoblin, warrior]),
    });
    controller.applyImported(importedWithDrones([hobgoblin, warrior]), NEUTRAL_CONDITIONS);
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    const items = getFake(document, "ship-a-drone-list").children;
    const warriorButton = items[1].firstElementChild as unknown as FakeElement;
    warriorButton.trigger("click");
    expect(popupGroup.close).toHaveBeenCalled();
    expect(emitConfigInvalidated).not.toHaveBeenCalled();
  });

  test("validation returns the validator result after applyImported", () => {
    const { controller, droneLoadoutValidator } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([importedDroneFixture()]),
      droneLoadoutValidator: {
        validate: vi.fn(() => ({ valid: false, totalCount: 5, totalBandwidth: 25, totalVolume: 25, violations: ["bandwidthExceeded"] as readonly DroneLoadoutViolation[] })),
      },
    });
    controller.applyImported(importedWithDrones([importedDroneFixture()]), NEUTRAL_CONDITIONS);
    const validation = controller.validation();
    expect(validation).toBeDefined();
    expect(validation!.valid).toBe(false);
    expect(validation!.violations).toEqual(["bandwidthExceeded"]);
    expect(droneLoadoutValidator.validate).toHaveBeenCalledTimes(1);
  });

  test("currentDroneSpecs returns multiple specs for multiple groups", () => {
    const hobgoblin = importedDroneFixture();
    const warrior = importedDroneFixture({ typeId: WARRIOR_ID, name: "Warrior I", count: 2 });
    const { controller } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([hobgoblin, warrior]),
    });
    controller.applyImported(importedWithDrones([hobgoblin, warrior]), NEUTRAL_CONDITIONS);
    const specs = controller.currentDroneSpecs();
    expect(specs).toHaveLength(2);
    expect(specs[0].droneCount).toBe(5);
    expect(specs[1].droneCount).toBe(2);
  });

  test("restore with all-unknown droneGroups falls back to imported drones", () => {
    const hobgoblin = importedDroneFixture();
    const warrior = importedDroneFixture({ typeId: WARRIOR_ID, name: "Warrior I" });
    const { controller, droneLoadoutResolver } = buildDrone({
      fittingImport: {
        importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, drones: [hobgoblin, warrior] })),
      },
      droneLoadoutResolver: resolverReturningDrones([hobgoblin, warrior]),
      droneCatalog: { has: vi.fn(() => false) },
    });
    controller.restore("[Rifter, Test]", NEUTRAL_CONDITIONS, [{ typeId: "99999" as TypeId, count: 1 }, { typeId: "88888" as TypeId, count: 2 }]);
    expect(controller.capture().droneGroups).toEqual([{ typeId: HOBGOBLIN_ID, count: 5 }, { typeId: WARRIOR_ID, count: 5 }]);
    const call = vi.mocked(droneLoadoutResolver.resolve).mock.calls[0];
    expect(call[0]).toEqual([{ typeId: HOBGOBLIN_ID, count: 5 }, { typeId: WARRIOR_ID, count: 5 }]);
  });

  test("validation is undefined after clear", () => {
    const { controller } = buildDrone({
      droneLoadoutResolver: resolverReturningDrones([importedDroneFixture()]),
    });
    controller.applyImported(importedWithDrones([importedDroneFixture()]), NEUTRAL_CONDITIONS);
    expect(controller.validation()).toBeDefined();
    controller.clear();
    expect(controller.validation()).toBeUndefined();
  });

  test("restore does not call resolve when import has no drones", () => {
    const { controller, droneLoadoutResolver } = buildDrone({
      fittingImport: {
        importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, drones: [] })),
      },
    });
    controller.restore("[Rifter, Test]", NEUTRAL_CONDITIONS);
    expect(controller.drone()).toBeUndefined();
    expect(droneLoadoutResolver.resolve).not.toHaveBeenCalled();
  });
});
