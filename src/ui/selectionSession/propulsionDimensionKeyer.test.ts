import { PropulsionDimensionKeyerImpl } from "./propulsionDimensionKeyer";
import type { PropulsionModule } from "../../ships";
import { toTypeId } from "../../gamedata/ids";

function makePropulsionModule(defaultModuleId: string, kind: "afterburner" | "microwarpdrive" = "afterburner"): PropulsionModule {
  return {
    id: kind === "afterburner" ? "ab-1mn" : "mwd-5mn",
    kind,
    sizeTier: "small",
    label: kind === "afterburner" ? "1MN Afterburner I" : "5MN Microwarpdrive I",
    iconId: toTypeId("439"),
    defaultModuleId: toTypeId(defaultModuleId),
    thrust: 1.5e6,
    massAddition: 500_000,
    speedBonus: kind === "afterburner" ? 1.15 : 5,
    sigBloom: kind === "afterburner" ? 0 : 5,
  };
}

describe("PropulsionDimensionKeyerImpl", () => {
  test("key uses propulsion kind", () => {
    const keyer = new PropulsionDimensionKeyerImpl();
    expect(keyer.key({ kind: "afterburner", module: makePropulsionModule("439") })).toBe("propulsion:afterburner");
  });

  test("fallback returns module defaultModuleId with no ammo", () => {
    const keyer = new PropulsionDimensionKeyerImpl();
    const fallback = keyer.fallback({ kind: "afterburner", module: makePropulsionModule("439") });
    expect(fallback.moduleId).toBe(toTypeId("439"));
    expect(fallback.ammoId).toBeUndefined();
  });

  test("different kind produces different key", () => {
    const keyer = new PropulsionDimensionKeyerImpl();
    const mwdModule = makePropulsionModule("434", "microwarpdrive");
    expect(keyer.key({ kind: "microwarpdrive", module: mwdModule })).toBe("propulsion:microwarpdrive");
  });

  test("fallback uses the module from the dimension, not a static lookup", () => {
    const keyer = new PropulsionDimensionKeyerImpl();
    const module1 = makePropulsionModule("439");
    const module2 = makePropulsionModule("440");
    expect(keyer.fallback({ kind: "afterburner", module: module1 }).moduleId).toBe(toTypeId("439"));
    expect(keyer.fallback({ kind: "afterburner", module: module2 }).moduleId).toBe(toTypeId("440"));
  });
});
