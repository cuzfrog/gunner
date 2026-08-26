import { toShipId } from "../../gamedata/ids";
import { StaticImageCatalog } from "./imageCatalog";

describe("StaticImageCatalog", () => {
  const catalog = new StaticImageCatalog();

  test("shipImageUrl looks up a known ship by id", () => {
    expect(catalog.shipImageUrl(toShipId("587"), "Rifter")).toBe("images/ships/Rifter.webp");
  });

  test("shipImageUrl falls back to a name-keyed path for an unknown id", () => {
    expect(catalog.shipImageUrl(toShipId("legacy-unknown"), "Algos Navy Issue")).toBe("images/ships/Algos_Navy_Issue.webp");
  });

  test("itemIconUrl returns the icon path for a known item", () => {
    expect(catalog.itemIconUrl("Hail S")).toBe("images/icons/1285@1x.png");
  });

  test("itemIconUrl returns undefined for an unknown item", () => {
    expect(catalog.itemIconUrl("Unknown Item")).toBeUndefined();
  });

  test("droneIconUrl returns the specific icon path for a known drone", () => {
    expect(catalog.droneIconUrl("Hobgoblin I")).toBe("images/icons/2454@1x.png");
  });

  test("droneIconUrl returns undefined when no name is given", () => {
    expect(catalog.droneIconUrl()).toBeUndefined();
  });

  test("droneIconUrl returns undefined for an unknown drone", () => {
    expect(catalog.droneIconUrl("Unknown Drone")).toBeUndefined();
  });
});
