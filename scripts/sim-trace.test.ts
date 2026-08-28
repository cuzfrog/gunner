import { asClass, createContainer, InjectionMode } from "awilix";
import { registerGameDataModule, type GameDataCradle } from "../src/gamedata";
import { registerSimModule, type SimCradle } from "../src/sim";
import { registerShipsModule, type ShipsCradle } from "../src/ships";
import { registerFittingModule, type FittingCradle } from "../src/fitting";
import { _TraceParamsParserImpl, type TraceParamsParser } from "./sim-trace";

type TestCradle = SimCradle & FittingCradle & ShipsCradle & GameDataCradle & { readonly traceParamsParser: TraceParamsParser };

function buildParser(): TraceParamsParser {
  const container = createContainer<TestCradle>({ injectionMode: InjectionMode.PROXY });
  registerGameDataModule(container);
  registerSimModule(container);
  registerShipsModule(container);
  registerFittingModule(container);
  container.register({ traceParamsParser: asClass(_TraceParamsParserImpl).singleton() });
  return container.cradle.traceParamsParser;
}

describe("TraceParamsParser", () => {
  test("defaults to no ewar", () => {
    const params = buildParser().parse([]);
    expect(params.config.shipA.ewar).toBeUndefined();
    expect(params.config.shipB.ewar).toBeUndefined();
    expect(params.config.initialDistance).toBe(5000);
  });

  test("parses shipA and shipB ewar paths and overload flags, merging projections into config", () => {
    const params = buildParser().parse([
      "--ship-a-ewar", "data/ship-fittings/Curse/Kitetackle_Armor_Curse.txt",
      "--ship-a-ewar-overload", "true",
      "--ship-b-ewar", "data/ship-fittings/Curse/Ewar_Armor_Curse.txt",
      "--ship-b-ewar-overload", "false",
    ]);
    expect(params.config.shipA.ewar?.loadout.webs).toHaveLength(1);
    expect(params.config.shipA.ewar?.activation?.webs[0]?.overloaded).toBe(true);
    expect(params.config.shipB.ewar?.loadout.webs).toHaveLength(0);
    expect(params.config.shipB.ewar?.loadout.disruptors.length).toBeGreaterThanOrEqual(2);
    expect(params.config.shipB.ewar?.activation?.disruptors[0]?.overloaded).toBe(false);
  });

  test("rejects unknown flags", () => {
    expect(() => buildParser().parse(["--unknown", "value"])).toThrow("Unknown flag --unknown");
  });

  test("rejects missing flag value", () => {
    expect(() => buildParser().parse(["--duration"])).toThrow("Missing value for --duration");
  });

  test("rejects non-boolean ewar overload", () => {
    expect(() => buildParser().parse(["--ship-a-ewar-overload", "yes"])).toThrow(
      '--ship-a-ewar-overload expects "true" or "false", got "yes"',
    );
  });

  test("loads a Curse fit with a Stasis Webifier II", () => {
    const params = buildParser().parse([
      "--ship-a-ewar", "data/ship-fittings/Curse/Kitetackle_Armor_Curse.txt",
      "--ship-a-ewar-overload", "true",
    ]);
    const projection = params.config.shipA.ewar;
    expect(projection?.loadout.webs).toHaveLength(1);
    expect(projection?.loadout.webs[0]?.moduleName).toBe("Stasis Webifier II");
    expect(projection?.loadout.disruptors).toHaveLength(0);
    expect(projection?.activation?.webs[0]?.overloaded).toBe(true);
  });

  test("loads a Curse fit with tracking disruptors and scripts", () => {
    const params = buildParser().parse([
      "--ship-b-ewar", "data/ship-fittings/Curse/Ewar_Armor_Curse.txt",
      "--ship-b-ewar-overload", "false",
    ]);
    const projection = params.config.shipB.ewar;
    expect(projection?.loadout.webs).toHaveLength(0);
    expect(projection?.loadout.disruptors.length).toBeGreaterThanOrEqual(2);
    expect(projection?.loadout.disruptors.some((d) => d.defaultScript?.name === "Optimal Range Disruption Script")).toBe(true);
    expect(projection?.loadout.disruptors.some((d) => d.defaultScript?.name === "Tracking Speed Disruption Script")).toBe(true);
    expect(projection?.activation?.disruptors[0]?.overloaded).toBe(false);
  });

  test("throws when the fitting file does not exist", () => {
    expect(() => buildParser().parse(["--ship-a-ewar", "data/ship-fittings/Curse/Not_A_Fit.txt"])).toThrow();
  });
});
