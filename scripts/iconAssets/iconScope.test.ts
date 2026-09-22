import { buildTypeIconEntries, expectedTypeIconFile, IN_SCOPE_CATEGORY_IDS, ICON_FILE_PREFIX, TYPE_ICON_FILE_PREFIX } from "./iconScope";

interface SdeType {
  readonly typeID: number;
  readonly groupID: number;
  readonly published: number;
  readonly iconID?: number;
}

function makeType(overrides: Partial<SdeType> & { groupID: number }): SdeType {
  return { typeID: overrides.typeID ?? 1, published: overrides.published ?? 1, iconID: overrides.iconID, groupID: overrides.groupID };
}

function groupsFixture(): Readonly<Record<string, { readonly groupID: number; readonly categoryID: number }>> {
  return {
    "100": { groupID: 100, categoryID: 18 },
    "200": { groupID: 200, categoryID: 7 },
    "300": { groupID: 300, categoryID: 8 },
    "400": { groupID: 400, categoryID: 4 },
    "500": { groupID: 500, categoryID: 22 },
    "600": { groupID: 600, categoryID: 32 },
    "700": { groupID: 700, categoryID: 66 },
    "800": { groupID: 800, categoryID: 87 },
    "999": { groupID: 999, categoryID: 1 },
  };
}

describe("buildTypeIconEntries", () => {
  test("maps types with an iconID to icons/<iconId>@1x.png", () => {
    const types: Record<string, SdeType> = {
      "10190": makeType({ typeID: 10190, groupID: 200, iconID: 26454 }),
      "29005": makeType({ typeID: 29005, groupID: 300, iconID: 3344 }),
    };
    const entries = buildTypeIconEntries(types, groupsFixture(), IN_SCOPE_CATEGORY_IDS);
    expect(entries["10190"]).toBe("icons/26454@1x.png");
    expect(entries["29005"]).toBe("icons/3344@1x.png");
  });

  test("maps types without an iconID to type-icons/<typeId>@1x.png", () => {
    const types: Record<string, SdeType> = {
      "1201": makeType({ typeID: 1201, groupID: 100 }),
      "33474": makeType({ typeID: 33474, groupID: 500 }),
    };
    const entries = buildTypeIconEntries(types, groupsFixture(), IN_SCOPE_CATEGORY_IDS);
    expect(entries["1201"]).toBe("type-icons/1201@1x.png");
    expect(entries["33474"]).toBe("type-icons/33474@1x.png");
  });

  test("includes unpublished in-scope types", () => {
    const types: Record<string, SdeType> = {
      "9991": makeType({ typeID: 9991, groupID: 200, published: 0, iconID: 10 }),
    };
    const entries = buildTypeIconEntries(types, groupsFixture(), IN_SCOPE_CATEGORY_IDS);
    expect(entries["9991"]).toBe("icons/10@1x.png");
  });

  test("excludes types whose group is out of scope", () => {
    const types: Record<string, SdeType> = {
      "777": makeType({ typeID: 777, groupID: 999, iconID: 1 }),
    };
    const entries = buildTypeIconEntries(types, groupsFixture(), IN_SCOPE_CATEGORY_IDS);
    expect(entries["777"]).toBeUndefined();
  });

  test("excludes types whose group is unknown", () => {
    const types: Record<string, SdeType> = {
      "888": makeType({ typeID: 888, groupID: 404, iconID: 1 }),
    };
    const entries = buildTypeIconEntries(types, groupsFixture(), IN_SCOPE_CATEGORY_IDS);
    expect(entries["888"]).toBeUndefined();
  });

  test("in-scope categories cover the icon pipeline scope", () => {
    expect([...IN_SCOPE_CATEGORY_IDS].sort((a, b) => a - b)).toEqual([4, 7, 8, 18, 22, 32, 66, 87]);
    expect(ICON_FILE_PREFIX).toBe("icons/");
    expect(TYPE_ICON_FILE_PREFIX).toBe("type-icons/");
  });
});

describe("expectedTypeIconFile", () => {
  test("keys the file by typeId in the type-icons directory", () => {
    expect(expectedTypeIconFile(2205)).toBe("type-icons/2205@1x.png");
  });
});
