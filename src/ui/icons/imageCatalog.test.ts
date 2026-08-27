import { toShipId, toTypeId } from "../../gamedata/ids";
import { SHIP_IMAGE_FILES } from "./shipImageIds";
import { StaticImageCatalog } from "./imageCatalog";

describe("StaticImageCatalog", () => {
  const catalog = new StaticImageCatalog();

  test("shipImageUrl looks up a known ship by id", () => {
    expect(catalog.shipImageUrl(toShipId("587"))).toBe("images/ships/Rifter.webp");
  });

  test("shipImageUrl returns undefined for an unknown id", () => {
    expect(catalog.shipImageUrl(toShipId("legacy-unknown"))).toBeUndefined();
  });

  test("every legacy ship id resolves to an image file", () => {
    const legacyIds = Object.keys(SHIP_IMAGE_FILES).filter((id) => id.startsWith("legacy-"));
    expect(legacyIds).toEqual([
      "legacy-eidolon",
      "legacy-gecko",
      "legacy-herald",
      "legacy-ixion",
      "legacy-penitence",
      "legacy-phantom",
      "legacy-specter",
      "legacy-visitant",
      "legacy-wraith",
    ]);
    for (const id of legacyIds) {
      expect(catalog.shipImageUrl(toShipId(id))).toBeDefined();
    }
  });

  test("itemIconUrl returns the icon path for a known item", () => {
    expect(catalog.itemIconUrl(toTypeId("12608"))).toBe("images/icons/1285@1x.png");
  });

  test("itemIconUrl returns undefined for an unknown item", () => {
    expect(catalog.itemIconUrl(toTypeId("0"))).toBeUndefined();
  });

  test("droneIconUrl returns the specific icon path for a known drone", () => {
    expect(catalog.droneIconUrl(toTypeId("2454"))).toBe("images/icons/2454@1x.png");
  });

  test("droneIconUrl returns undefined when no type id is given", () => {
    expect(catalog.droneIconUrl()).toBeUndefined();
  });

  test("droneIconUrl returns undefined for an unknown drone", () => {
    expect(catalog.droneIconUrl(toTypeId("0"))).toBeUndefined();
  });
});
