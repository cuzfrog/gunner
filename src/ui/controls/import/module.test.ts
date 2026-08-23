import { buildDomControls } from "../testSupport";
import { registerImportModule } from "./module";

describe("registerImportModule", () => {
  test("registers importController as a singleton", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerImportModule(cradle);
    const controller = cradle.cradle.importController;
    expect(controller).toBeDefined();
    expect(cradle.cradle.importController).toBe(controller);
  });
});
