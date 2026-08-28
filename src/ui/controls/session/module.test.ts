import { buildDomControls } from "../testSupport";
import { registerSessionModule } from "./module";

describe("registerSessionModule", () => {
  test("registers session graph as singletons", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerSessionModule(cradle);

    const hullDatalist = cradle.cradle.hullDatalist;
    const sessionCodec = cradle.cradle.sessionCodec;
    const simConfigSource = cradle.cradle.simConfigSource;

    expect(hullDatalist).toBeDefined();
    expect(sessionCodec).toBeDefined();
    expect(simConfigSource).toBeDefined();
    expect(cradle.cradle.hullDatalist).toBe(hullDatalist);
    expect(cradle.cradle.sessionCodec).toBe(sessionCodec);
    expect(cradle.cradle.simConfigSource).toBe(simConfigSource);
  });
});
