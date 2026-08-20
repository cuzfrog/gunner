import { PROPULSION_MODULES, isPropulsionId } from "./propulsion";

describe("PROPULSION_MODULES", () => {
  test("contains eight unique T1 modules", () => {
    expect(PROPULSION_MODULES).toHaveLength(8);
    const ids = new Set(PROPULSION_MODULES.map((m) => m.id));
    expect(ids.size).toBe(8);
  });

  test("afterburners have no signature bloom", () => {
    for (const module of PROPULSION_MODULES) {
      if (module.kind === "afterburner") {
        expect(module.sigBloom).toBe(0);
      }
    }
  });

  test("microwarpdrives bloom signature", () => {
    for (const module of PROPULSION_MODULES) {
      if (module.kind === "microwarpdrive") {
        expect(module.sigBloom).toBe(5);
      }
    }
  });
});

describe("isPropulsionId", () => {
  test("accepts every module id", () => {
    for (const module of PROPULSION_MODULES) {
      expect(isPropulsionId(module.id)).toBe(true);
    }
  });

  test("rejects non-ids", () => {
    expect(isPropulsionId("ab-5mn")).toBe(false);
    expect(isPropulsionId("")).toBe(false);
    expect(isPropulsionId(null)).toBe(false);
    expect(isPropulsionId(42)).toBe(false);
  });
});
