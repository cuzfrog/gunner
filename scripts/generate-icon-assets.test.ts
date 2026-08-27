import { toShipId, type ShipId } from "../src/gamedata/ids";
import type { ShipProfile } from "../src/ships";
import { generateIconIdsContent, generateShipImageIdsContent } from "./generate-icon-assets";

function itemNamesFixture(): Readonly<Record<string, string>> {
  return {
    "12608": "Hail S",
    "565": "150mm Railgun I",
    "439": "1MN Afterburner I",
    "1978": "Tracking Computer II",
    "28999": "Optimal Range Script",
    "527": "Stasis Webifier II",
    "32452": "Tracking Disruptor II",
    "1000": "Multi-Entry Item",
    "1001": "Multi-Entry Item",
    "28668": "Nanite Repair Paste",
  };
}

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
        "Stasis Webifier II": [{ id: 1284 }],
        "Tracking Disruptor II": [{ id: 1639 }],
        "Multi-Entry Item": [{ id: 111 }, { id: 222 }],
        "Nanite Repair Paste": [{ id: 3302 }],
      },
    },
  };
}

function shipProfilesFixture(): Pick<ShipProfile, "id" | "name">[] {
  return [
    { id: toShipId("587"), name: "Rifter" },
    { id: toShipId("599"), name: "Burst" },
  ];
}

describe("generateIconIdsContent", () => {
  test("resolves every name in nameToId to its first icon id", () => {
    const content = generateIconIdsContent(itemNamesFixture(), nameToIdFixture());
    expect(content).toMatch(/^import type \{ TypeId \} from "\.\.\/\.\.\/gamedata\/ids";\n/);
    expect(content).toMatch(/^export const ITEM_ICON_IDS: Readonly<Record<TypeId, number>> = \{/m);
    expect(content).toContain('["439" as TypeId]: 789,');
    expect(content).toContain('["565" as TypeId]: 456,');
    expect(content).toContain('["12608" as TypeId]: 123,');
    expect(content).toContain('["1978" as TypeId]: 999,');
    expect(content).toContain('["28999" as TypeId]: 111,');
    expect(content).toContain('["527" as TypeId]: 1284,');
    expect(content).toContain('["32452" as TypeId]: 1639,');
    expect(content).toContain('["1000" as TypeId]: 111,');
    expect(content).toContain('["28668" as TypeId]: 3302,');
    expect(content).not.toContain("DRONE_ICON_ID");
  });
});

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
