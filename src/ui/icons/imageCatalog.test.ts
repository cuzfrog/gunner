import { StaticImageCatalog } from "./imageCatalog";

describe("StaticImageCatalog", () => {
  const catalog = new StaticImageCatalog();

  test("shipImageUrl replaces spaces with underscores", () => {
    expect(catalog.shipImageUrl("Algos Navy Issue")).toBe("images/ships/Algos_Navy_Issue.webp");
  });

  test("shipImageUrl leaves single-word names unchanged", () => {
    expect(catalog.shipImageUrl("Rifter")).toBe("images/ships/Rifter.webp");
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
