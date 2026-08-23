import { createContainer, InjectionMode } from "awilix";
import { registerSimModule } from "../src/sim";
import { registerShipsModule } from "../src/ships";
import { registerFittingModule } from "../src/fitting";
import type { FittingCradle } from "../src/fitting";
import type { ShipsCradle } from "../src/ships";
import type { SimCradle } from "../src/sim";
import { loadEwarProjection, parseParams } from "./sim-trace";

type TestCradle = SimCradle & FittingCradle & ShipsCradle;

describe("parseParams", () => {
  test("defaults to no ewar", () => {
    const params = parseParams([]);
    expect(params.attackerEwarFile).toBeUndefined();
    expect(params.targetEwarFile).toBeUndefined();
    expect(params.attackerEwarOverload).toBe(false);
    expect(params.targetEwarOverload).toBe(false);
    expect(params.config.initialDistance).toBe(5000);
  });

  test("parses attacker and target ewar paths and overload flags", () => {
    const params = parseParams([
      "--attacker-ewar", "data/ship-fittings/Curse/Kitetackle_Armor_Curse.txt",
      "--attacker-ewar-overload", "true",
      "--target-ewar", "data/ship-fittings/Curse/Ewar_Armor_Curse.txt",
      "--target-ewar-overload", "false",
    ]);
    expect(params.attackerEwarFile).toBe("data/ship-fittings/Curse/Kitetackle_Armor_Curse.txt");
    expect(params.attackerEwarOverload).toBe(true);
    expect(params.targetEwarFile).toBe("data/ship-fittings/Curse/Ewar_Armor_Curse.txt");
    expect(params.targetEwarOverload).toBe(false);
  });

  test("rejects unknown flags", () => {
    expect(() => parseParams(["--unknown", "value"])).toThrow("Unknown flag --unknown");
  });

  test("rejects missing flag value", () => {
    expect(() => parseParams(["--duration"])).toThrow("Missing value for --duration");
  });

  test("rejects non-boolean ewar overload", () => {
    expect(() => parseParams(["--attacker-ewar-overload", "yes"])).toThrow(
      '--attacker-ewar-overload expects "true" or "false", got "yes"',
    );
  });
});

describe("loadEwarProjection", () => {
  function buildFittingImport() {
    const container = createContainer<TestCradle>({ injectionMode: InjectionMode.PROXY });
    registerSimModule(container);
    registerShipsModule(container);
    registerFittingModule(container);
    return container.cradle.fittingImport;
  }

  test("loads a Curse fit with a Stasis Webifier II", () => {
    const fittingImport = buildFittingImport();
    const projection = loadEwarProjection(
      fittingImport,
      "data/ship-fittings/Curse/Kitetackle_Armor_Curse.txt",
      true,
    );
    expect(projection.loadout.webs).toHaveLength(1);
    expect(projection.loadout.webs[0]?.moduleName).toBe("Stasis Webifier II");
    expect(projection.activation.webs[0]?.active).toBe(true);
    expect(projection.loadout.disruptors).toHaveLength(0);
    expect(projection.overloaded).toBe(true);
  });

  test("loads a Curse fit with tracking disruptors and scripts", () => {
    const fittingImport = buildFittingImport();
    const projection = loadEwarProjection(
      fittingImport,
      "data/ship-fittings/Curse/Ewar_Armor_Curse.txt",
      false,
    );
    expect(projection.loadout.webs).toHaveLength(0);
    expect(projection.loadout.disruptors.length).toBeGreaterThanOrEqual(2);
    expect(projection.loadout.disruptors.some((d) => d.defaultScript === "optimalRange")).toBe(true);
    expect(projection.loadout.disruptors.some((d) => d.defaultScript === "trackingSpeed")).toBe(true);
    expect(projection.activation.disruptors.every((d) => d.active)).toBe(true);
    expect(projection.overloaded).toBe(false);
  });

  test("throws when the fitting file does not exist", () => {
    const fittingImport = buildFittingImport();
    expect(() => loadEwarProjection(fittingImport, "data/ship-fittings/Curse/Not_A_Fit.txt", false)).toThrow();
  });
});
