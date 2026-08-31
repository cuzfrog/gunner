import { buildDrone, importedDroneFixture, NEUTRAL_CONDITIONS } from "./testSupport";
import { FakeElement, getFake, IMPORTED_RIFTER } from "../testSupport";
import type { ImportedFitting } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";

const HOBGOBLIN_ID = "80001" as TypeId;
const WARRIOR_ID = "80005" as TypeId;

function importedWithDrones(drones: readonly ReturnType<typeof importedDroneFixture>[]): ImportedFitting {
  return { ...IMPORTED_RIFTER, drones };
}

describe("DroneController", () => {
  test("initial state has no drone", () => {
    const { controller } = buildDrone();
    expect(controller.drone()).toBeUndefined();
    expect(controller.currentDroneSpec()).toBeUndefined();
  });

  test("applyImported with drones selects the first drone and renders telemetry", () => {
    const { document, controller } = buildDrone();
    const drone = importedDroneFixture();
    controller.applyImported(importedWithDrones([drone]), NEUTRAL_CONDITIONS);
    expect(controller.drone()?.typeId).toBe(HOBGOBLIN_ID);
    expect(getFake(document, "ship-a-drone-summary").textContent).toBe("Hobgoblin I");
    expect(getFake(document, "ship-a-drone-tracking").textContent).not.toBe("-");
    expect(getFake(document, "ship-a-drone-optimal").textContent).not.toBe("-");
    expect(getFake(document, "ship-a-drone-damage").textContent).not.toBe("-");
    expect(getFake(document, "ship-a-drone-count").textContent).toBe("5");
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
    const { document, controller } = buildDrone();
    controller.applyImported(importedWithDrones([importedDroneFixture()]), NEUTRAL_CONDITIONS);
    expect(getFake(document, "ship-a-drone-trigger").disabled).toBe(false);
  });

  test("currentDroneSpec maps all fields correctly", () => {
    const { controller } = buildDrone();
    const drone = importedDroneFixture({ emDamage: 10, thermalDamage: 20, kineticDamage: 5, explosiveDamage: 15, damageMultiplier: 2 });
    controller.applyImported(importedWithDrones([drone]), NEUTRAL_CONDITIONS);
    const spec = controller.currentDroneSpec();
    expect(spec).toBeDefined();
    expect(spec!.kind).toBe("drone");
    expect(spec!.tracking).toBe(0.4);
    expect(spec!.sigResolution).toBe(25);
    expect(spec!.optimal).toBe(1000);
    expect(spec!.falloff).toBe(500);
    expect(spec!.damagePerShot).toBe(100);
    expect(spec!.cycleTime).toBe(4);
    expect(spec!.droneCount).toBe(5);
    expect(spec!.maxVelocity).toBe(1200);
    expect(spec!.orbitSpeed).toBe(600);
    expect(spec!.isSentry).toBe(false);
  });

  test("sentry drones show dashes for orbit speed and max velocity", () => {
    const { document, controller } = buildDrone();
    const sentry = importedDroneFixture({ sizeClass: "sentry", maxVelocity: 0, orbitSpeed: 0 });
    controller.applyImported(importedWithDrones([sentry]), NEUTRAL_CONDITIONS);
    expect(getFake(document, "ship-a-drone-orbit-speed").textContent).toBe("-");
    expect(getFake(document, "ship-a-drone-max-velocity").textContent).toBe("-");
  });

  test("restore with fitting text and droneTypeId selects the specified drone", () => {
    const hobgoblin = importedDroneFixture();
    const warrior = importedDroneFixture({ typeId: WARRIOR_ID, name: "Warrior I" });
    const { controller, fittingImport } = buildDrone({
      fittingImport: {
        importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, drones: [hobgoblin, warrior] })),
      },
    });
    controller.restore("[Rifter, Test]", NEUTRAL_CONDITIONS, WARRIOR_ID);
    expect(controller.drone()?.typeId).toBe(WARRIOR_ID);
    expect(fittingImport.importFitting).toHaveBeenCalled();
  });

  test("restore with missing droneTypeId falls back to first drone", () => {
    const hobgoblin = importedDroneFixture();
    const warrior = importedDroneFixture({ typeId: WARRIOR_ID, name: "Warrior I" });
    const { controller } = buildDrone({
      fittingImport: {
        importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, drones: [hobgoblin, warrior] })),
      },
    });
    controller.restore("[Rifter, Test]", NEUTRAL_CONDITIONS);
    expect(controller.drone()?.typeId).toBe(HOBGOBLIN_ID);
  });

  test("restore with invalid droneTypeId falls back to first drone", () => {
    const hobgoblin = importedDroneFixture();
    const { controller } = buildDrone({
      fittingImport: {
        importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, drones: [hobgoblin] })),
      },
    });
    controller.restore("[Rifter, Test]", NEUTRAL_CONDITIONS, "99999" as TypeId);
    expect(controller.drone()?.typeId).toBe(HOBGOBLIN_ID);
  });

  test("restore with no fitting clears the drone", () => {
    const { controller } = buildDrone();
    controller.restore(undefined, undefined);
    expect(controller.drone()).toBeUndefined();
  });

  test("clear resets drone state", () => {
    const { controller } = buildDrone();
    controller.applyImported(importedWithDrones([importedDroneFixture()]), NEUTRAL_CONDITIONS);
    expect(controller.drone()).toBeDefined();
    controller.clear();
    expect(controller.drone()).toBeUndefined();
  });

  test("capture returns the selected drone typeId", () => {
    const { controller } = buildDrone();
    controller.applyImported(importedWithDrones([importedDroneFixture()]), NEUTRAL_CONDITIONS);
    expect(controller.capture().droneTypeId).toBe(HOBGOBLIN_ID);
  });

  test("capture returns undefined when no drone is selected", () => {
    const { controller } = buildDrone();
    expect(controller.capture().droneTypeId).toBeUndefined();
  });

  test("selecting a different drone emits configInvalidated", () => {
    const hobgoblin = importedDroneFixture();
    const warrior = importedDroneFixture({ typeId: WARRIOR_ID, name: "Warrior I" });
    const { document, controller, events } = buildDrone();
    controller.applyImported(importedWithDrones([hobgoblin, warrior]), NEUTRAL_CONDITIONS);
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    const items = getFake(document, "ship-a-drone-list").children;
    const warriorButton = items[1].firstElementChild as unknown as FakeElement;
    warriorButton.trigger("click");
    expect(controller.drone()?.typeId).toBe(WARRIOR_ID);
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });
});
