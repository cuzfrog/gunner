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
});
