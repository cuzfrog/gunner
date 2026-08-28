import { buildDomControls } from "../testSupport";
import { registerTurretModule } from "./module";

describe("registerTurretModule", () => {
  test("registers per-side turret overrides and controllers as singletons", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerTurretModule(cradle);
    const shipA = cradle.cradle.shipATurretController;
    const shipB = cradle.cradle.shipBTurretController;
    const controllers = cradle.cradle.turretControllers;
    const overridesBySide = cradle.cradle.turretOverridesBySide;
    expect(shipA).toBeDefined();
    expect(shipB).toBeDefined();
    expect(controllers.shipA).toBe(shipA);
    expect(controllers.shipB).toBe(shipB);
    expect(overridesBySide.shipA).toBe(cradle.cradle.shipATurretOverrides);
    expect(overridesBySide.shipB).toBe(cradle.cradle.shipBTurretOverrides);
    expect(cradle.cradle.shipATurretController).toBe(shipA);
    expect(cradle.cradle.shipBTurretController).toBe(shipB);
  });
});
