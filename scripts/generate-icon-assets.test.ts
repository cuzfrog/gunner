import { generateIconIdsContent } from "./generate-icon-assets";

function nameToIdFixture(): {
  readonly byName: {
    readonly iconID: Readonly<Record<string, ReadonlyArray<{ readonly id: number }>>>;
  };
} {
  return {
    byName: {
      iconID: {
        "Hail S": [{ id: 123 }],
        "150mm Railgun I": [{ id: 456 }],
        "1MN Afterburner I": [{ id: 789 }],
        "Tracking Computer II": [{ id: 999 }],
        "Optimal Range Script": [{ id: 111 }],
        "Multi-Entry Item": [{ id: 111 }, { id: 222 }],
      },
    },
  };
}

describe("generateIconIdsContent", () => {
  test("resolves known names to their first icon id", () => {
    const content = generateIconIdsContent(
      nameToIdFixture(),
      ["Hail S", "Multi-Entry Item"],
      ["150mm Railgun I"],
      ["1MN Afterburner I"],
      ["Tracking Computer II"],
      ["Optimal Range Script"],
    );
    expect(content).toMatch(/^export const ITEM_ICON_IDS: Readonly<Record<string, number>> = \{/);
    expect(content).toContain('"1MN Afterburner I": 789,');
    expect(content).toContain('"150mm Railgun I": 456,');
    expect(content).toContain('"Hail S": 123,');
    expect(content).toContain('"Tracking Computer II": 999,');
    expect(content).toContain('"Optimal Range Script": 111,');
    expect(content).toContain('"Multi-Entry Item": 111,');
    expect(content).toContain("export const DRONE_ICON_ID = 1084;");
  });

  test("throws a sorted error when names are missing", () => {
    expect(() =>
      generateIconIdsContent(
        nameToIdFixture(),
        ["Hail S", "Missing Charge", "Another Missing"],
        [],
        [],
        [],
        [],
      ),
    ).toThrow('Missing icon ids for: "Another Missing", "Missing Charge"');
  });
});
