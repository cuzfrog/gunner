import { toShipId, type ShipId } from "../src/gamedata/ids";
import type { ShipProfile } from "../src/ships";
import { buildTypeIconEntries, findMissingIconFiles, generateTypeIconFilesContent, generateShipImageIdsContent, _filterEntriesWithIcons } from "./generate-icon-assets";

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

const IN_SCOPE_CATEGORY_IDS = new Set([7, 8, 18, 32, 66, 87, 4, 22]);

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
});

describe("generateTypeIconFilesContent", () => {
  test("emits a sorted, TypeId-keyed Record literal", () => {
    const entries: Record<string, string> = {
      "29005": "icons/3344@1x.png",
      "1201": "type-icons/1201@1x.png",
      "10190": "icons/26454@1x.png",
    };
    const content = generateTypeIconFilesContent(entries);
    expect(content).toMatch(/^import type \{ TypeId \} from "\.\.\/\.\.\/gamedata\/ids";\n/);
    expect(content).toMatch(/^export const TYPE_ICON_FILES: Readonly<Record<TypeId, string>> = \{/m);
    const lines = content.split("\n");
    const entryLines = lines.filter((line) => line.startsWith("  ["));
    expect(entryLines[0]).toContain('"1201"');
    expect(entryLines[1]).toContain('"10190"');
    expect(entryLines[2]).toContain('"29005"');
    expect(content).toContain('["1201" as TypeId]: "type-icons/1201@1x.png",');
    expect(content).toContain('["29005" as TypeId]: "icons/3344@1x.png",');
  });
});

describe("findMissingIconFiles", () => {
  test("returns the relative paths whose file is not on disk", () => {
    const entries: Record<string, string> = {
      "1201": "type-icons/1201@1x.png",
      "29005": "icons/3344@1x.png",
      "9999": "icons/9999@1x.png",
    };
    const existing = new Set(["type-icons/1201@1x.png", "icons/3344@1x.png"]);
    expect(findMissingIconFiles(entries, existing)).toEqual(["icons/9999@1x.png"]);
  });

  test("returns empty when every entry has a file", () => {
    const entries: Record<string, string> = { "1201": "type-icons/1201@1x.png" };
    const existing = new Set(["type-icons/1201@1x.png"]);
    expect(findMissingIconFiles(entries, existing)).toEqual([]);
  });
});

describe("_filterEntriesWithIcons", () => {
  test("keeps only entries whose icon file exists on disk", () => {
    const entries: Record<string, string> = {
      "1201": "type-icons/1201@1x.png",
      "29005": "icons/3344@1x.png",
      "9999": "icons/9999@1x.png",
    };
    const existing = new Set(["type-icons/1201@1x.png", "icons/3344@1x.png"]);
    expect(_filterEntriesWithIcons(entries, existing)).toEqual({
      "1201": "type-icons/1201@1x.png",
      "29005": "icons/3344@1x.png",
    });
  });

  test("returns all entries when every file exists", () => {
    const entries: Record<string, string> = { "1201": "type-icons/1201@1x.png" };
    const existing = new Set(["type-icons/1201@1x.png"]);
    expect(_filterEntriesWithIcons(entries, existing)).toEqual(entries);
  });

  test("returns empty when no files exist", () => {
    const entries: Record<string, string> = { "9999": "icons/9999@1x.png" };
    expect(_filterEntriesWithIcons(entries, new Set())).toEqual({});
  });
});

function shipProfilesFixture(): Pick<ShipProfile, "id" | "name">[] {
  return [
    { id: toShipId("587"), name: "Rifter" },
    { id: toShipId("599"), name: "Burst" },
  ];
}

describe("generateShipImageIdsContent", () => {
  test("emits id-keyed image paths sorted by id and skips ships without images", () => {
    const content = generateShipImageIdsContent(shipProfilesFixture(), ["Rifter.webp", "Atron.webp"]);
    expect(content).toMatch(/^import type \{ ShipId \} from "\.\.\/\.\.\/gamedata\/ids";\n/);
    expect(content).toMatch(/^export const SHIP_IMAGE_FILES: Readonly<Record<ShipId, string>> = \{/m);
    expect(content).toContain('["587" as ShipId]: "images/ships/Rifter.webp",');
    expect(content).not.toContain('"599"');
  });

  test("maps underscore filenames back to space-separated ship names", () => {
    const content = generateShipImageIdsContent([{ id: toShipId("24692"), name: "Abaddon" }], ["Abaddon.webp"]);
    expect(content).toContain('["24692" as ShipId]: "images/ships/Abaddon.webp",');
  });
});
