import type { TypeId } from "../src/gamedata/ids";
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

function asTypeId(value: string): TypeId {
  return value as TypeId;
}

describe("generateModuleSlotsContent", () => {
  test("classifies known names to their slot", () => {
    const content = generateModuleSlotsContent(
      nameToIdFixture(),
      [
        { name: "1MN Afterburner I", id: asTypeId("439") },
        { name: "Medium Shield Extender II", id: asTypeId("382") },
      ],
      [{ name: "250mm Railgun I", id: asTypeId("570") }],
      GROUP_SLOTS,
    );
    expect(content).toMatch(/^import type \{ TypeId \} from "\.\.\/ids";\n/);
    expect(content).toMatch(/^export type ModuleSlot = "high" \| "mid" \| "low" \| "rig";\n/m);
    expect(content).toContain('"1MN Afterburner I": "mid",');
    expect(content).toContain('"250mm Railgun I": "high",');
    expect(content).toContain('"Medium Shield Extender II": "mid",');
    expect(content).toContain('["439" as TypeId]: "mid",');
    expect(content).toContain('["570" as TypeId]: "high",');
    expect(content).toContain('["382" as TypeId]: "mid",');
  });

  test("throws when a name is missing from nameToId", () => {
    expect(() =>
      generateModuleSlotsContent(nameToIdFixture(), [{ name: "Missing Module", id: asTypeId("0") }], [], GROUP_SLOTS),
    ).toThrow(/missing from nameToId/);
  });

  test("throws when a group has no slot mapping", () => {
    expect(() =>
      generateModuleSlotsContent(nameToIdFixture(), [{ name: "Unknown Group Module", id: asTypeId("0") }], [], GROUP_SLOTS),
    ).toThrow(/unmatched groups/);
  });
});
