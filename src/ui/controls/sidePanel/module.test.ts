import { buildDomControls } from "../testSupport";
import { registerSidePanelModule } from "./module";

describe("registerSidePanelModule", () => {
  test("registers attacker and target side panels as singletons", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerSidePanelModule(cradle);
    const attacker = cradle.cradle.attackerSide;
    const target = cradle.cradle.targetSide;
    expect(attacker).toBeDefined();
    expect(target).toBeDefined();
    expect(attacker).not.toBe(target);
    expect(cradle.cradle.attackerSide).toBe(attacker);
    expect(cradle.cradle.targetSide).toBe(target);
  });
});
