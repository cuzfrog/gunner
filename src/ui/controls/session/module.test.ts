import { buildDomControls } from "../testSupport";
import { registerSessionModule } from "./module";

describe("registerSessionModule", () => {
  test("registers session graph as singletons", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerSessionModule(cradle);

    const hullDatalist = cradle.cradle.hullDatalist;
    const sessionCodec = cradle.cradle.sessionCodec;
    const eventRouter = cradle.cradle.eventRouter;

    expect(hullDatalist).toBeDefined();
    expect(sessionCodec).toBeDefined();
    expect(eventRouter).toBeDefined();
    expect(cradle.cradle.hullDatalist).toBe(hullDatalist);
    expect(cradle.cradle.sessionCodec).toBe(sessionCodec);
    expect(cradle.cradle.eventRouter).toBe(eventRouter);
  });
});
