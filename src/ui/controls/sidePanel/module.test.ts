import { buildDomControls } from "../testSupport";
import { registerSidePanelModule } from "./module";

describe("registerSidePanelModule", () => {
  test("registers shipA and shipB side panels as singletons", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerSidePanelModule(cradle);
    const shipA = cradle.cradle.shipASide;
    const shipB = cradle.cradle.shipBSide;
    expect(shipA).toBeDefined();
    expect(shipB).toBeDefined();
    expect(shipA).not.toBe(shipB);
    expect(cradle.cradle.shipASide).toBe(shipA);
    expect(cradle.cradle.shipBSide).toBe(shipB);
  });
});
