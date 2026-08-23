import { generateModuleSlotsContent, type ModuleSlot } from "./generate-module-slots";

function nameToIdFixture(): {
  readonly byName: {
    readonly iconID: Readonly<Record<string, ReadonlyArray<{ readonly group: string }>>>;
  };
} {
  return {
    byName: {
      iconID: {
        "1MN Afterburner I": [{ group: "Propulsion Module" }],
        "250mm Railgun I": [{ group: "Hybrid Weapon" }],
        "Medium Shield Extender II": [{ group: "Shield Extender" }],
        "Medium Trimark Armor Pump I": [{ group: "Rig Armor" }],
        "Unknown Group Module": [{ group: "Unknown" }],
      },
    },
  };
}

const GROUP_SLOTS: Readonly<Record<string, ModuleSlot>> = {
  "Propulsion Module": "mid",
  "Hybrid Weapon": "high",
  "Shield Extender": "mid",
  "Rig Armor": "rig",
};

describe("generateModuleSlotsContent", () => {
  test("classifies known names to their slot", () => {
    const content = generateModuleSlotsContent(
      nameToIdFixture(),
      ["1MN Afterburner I", "Medium Shield Extender II"],
      ["250mm Railgun I"],
      GROUP_SLOTS,
    );
    expect(content).toMatch(/^export type ModuleSlot = "high" \| "mid" \| "low" \| "rig";\n/);
    expect(content).toContain('"1MN Afterburner I": "mid",');
    expect(content).toContain('"250mm Railgun I": "high",');
    expect(content).toContain('"Medium Shield Extender II": "mid",');
  });

  test("throws when a name is missing from nameToId", () => {
    expect(() =>
      generateModuleSlotsContent(nameToIdFixture(), ["Missing Module"], [], GROUP_SLOTS),
    ).toThrow(/missing from nameToId/);
  });

  test("throws when a group has no slot mapping", () => {
    expect(() =>
      generateModuleSlotsContent(nameToIdFixture(), ["Unknown Group Module"], [], GROUP_SLOTS),
    ).toThrow(/unmatched groups/);
  });
});
