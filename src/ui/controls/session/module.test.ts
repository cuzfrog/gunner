import { buildDomControls } from "../testSupport";
import { registerSessionModule } from "./module";

describe("registerSessionModule", () => {
  test("registers session graph as singletons", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerSessionModule(cradle);

    const hullDatalist = cradle.cradle.hullDatalist;
    const sessionCodec = cradle.cradle.sessionCodec;

    expect(hullDatalist).toBeDefined();
    expect(sessionCodec).toBeDefined();
    expect(cradle.cradle.hullDatalist).toBe(hullDatalist);
    expect(cradle.cradle.sessionCodec).toBe(sessionCodec);
  });
});
