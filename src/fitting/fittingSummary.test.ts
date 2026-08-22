import { parseEft } from "./eft";
import { describeFitting } from "./fittingSummary";
import { MODULE_SLOTS } from "./moduleSlots";

const RIFTER_BRAWLER = `[Rifter, Brawler]
200mm AutoCannon I, Hail S
200mm AutoCannon I, Hail S
5MN Microwarpdrive I
400mm Steel Plates II
Inertial Stabilizers II
Small Trimark Armor Pump I
Small Projectile Ambit Extension I

Hail S x1000
Republic Fleet EMP S x500

Hobgoblin I x3
`;

const RIFTER_EXTRA_CHARGE_IN_DRONE_BLOCK = `[Rifter, Brawler]
200mm AutoCannon I, Hail S
5MN Microwarpdrive I

Hail S x1000

Republic Fleet EMP S x500
`;

const INVALID_TEXT = `not a fitting
some line`;

describe("describeFitting", () => {
  test("parses hull and fitting names", () => {
    const summary = describeFitting(RIFTER_BRAWLER);
    expect(summary).toBeDefined();
    expect(summary!.hullName).toBe("Rifter");
    expect(summary!.fittingName).toBe("Brawler");
  });

  test("groups modules by slot in fixed order", () => {
    const summary = describeFitting(RIFTER_BRAWLER);
    expect(summary).toBeDefined();
    const kinds = summary!.sections.map((section) => section.kind);
    expect(kinds).toEqual(["high", "mid", "low", "rig", "cargo", "drones"]);
  });

  test("captures charges on module rows", () => {
    const summary = describeFitting(RIFTER_BRAWLER);
    const high = summary!.sections.find((section) => section.kind === "high");
    expect(high!.rows[0].charge).toBe("Hail S");
    expect(high!.rows[1].charge).toBe("Hail S");
  });

  test("captures cargo quantities", () => {
    const summary = describeFitting(RIFTER_BRAWLER);
    const cargo = summary!.sections.find((section) => section.kind === "cargo");
    expect(cargo!.rows).toEqual([
      { name: "Hail S", quantity: 1000 },
      { name: "Republic Fleet EMP S", quantity: 500 },
    ]);
  });

  test("captures drone quantities", () => {
    const summary = describeFitting(RIFTER_BRAWLER);
    const drones = summary!.sections.find((section) => section.kind === "drones");
    expect(drones!.rows).toEqual([{ name: "Hobgoblin I", quantity: 3 }]);
  });

  test("moves charge quantity items from the drone block to cargo", () => {
    const summary = describeFitting(RIFTER_EXTRA_CHARGE_IN_DRONE_BLOCK);
    const kinds = summary!.sections.map((section) => section.kind);
    expect(kinds).toEqual(["high", "mid", "cargo"]);
    const cargo = summary!.sections.find((section) => section.kind === "cargo");
    expect(cargo!.rows).toEqual([
      { name: "Hail S", quantity: 1000 },
      { name: "Republic Fleet EMP S", quantity: 500 },
    ]);
  });

  test("returns undefined for unparseable text", () => {
    expect(describeFitting(INVALID_TEXT)).toBeUndefined();
  });

  test("skips module names that are not in the slot map", () => {
    const text = `[Rifter, Unknown]\nUnknown Module Name\n5MN Microwarpdrive I\n`;
    const summary = describeFitting(text);
    expect(summary!.sections).toHaveLength(1);
    expect(summary!.sections[0].kind).toBe("mid");
  });

  test("fixture modules are all present in the generated slot map", () => {
    const parsed = parseEft(RIFTER_BRAWLER);
    for (const line of parsed!.modules) {
      expect(MODULE_SLOTS[line.name]).toBeDefined();
    }
  });
});
