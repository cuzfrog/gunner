import { buildDomControls } from "../testSupport";
import { registerTurretModule } from "./module";

describe("registerTurretModule", () => {
  test("registers turret overrides and controller as singletons", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerTurretModule(cradle);
    const overrides = cradle.cradle.turretOverrides;
    const controller = cradle.cradle.turretController;
    expect(overrides).toBeDefined();
    expect(controller).toBeDefined();
    expect(cradle.cradle.turretOverrides).toBe(overrides);
    expect(cradle.cradle.turretController).toBe(controller);
  });
});
