import { buildDomControls } from "../testSupport";
import { registerHintsModule } from "./module";

describe("registerHintsModule", () => {
  test("registers hintRotator as a singleton", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerHintsModule(cradle);
    const a = cradle.cradle.hintRotator;
    const b = cradle.cradle.hintRotator;
    expect(a).toBeDefined();
    expect(a).toBe(b);
  });
});
