import { LazyItemNameCatalog } from "./lazyCatalog";
import type { TypeId } from "../ids";

const SAMPLE_ID = "204" as TypeId;

describe("LazyItemNameCatalog", () => {
  test("English pack is loaded at construction", () => {
    const catalog = new LazyItemNameCatalog(() => {});
    expect(catalog.isLoaded("en")).toBe(true);
    expect(catalog.isLoaded("zh")).toBe(false);
    expect(catalog.isLoaded("ja")).toBe(false);
  });

  test("nameForId returns the English name for known ids", () => {
    const catalog = new LazyItemNameCatalog(() => {});
    const name = catalog.nameForId(SAMPLE_ID, "en");
    expect(name).not.toBe(SAMPLE_ID);
    expect(name.length).toBeGreaterThan(0);
  });

  test("nameForId falls back to the id for unknown ids", () => {
    const catalog = new LazyItemNameCatalog(() => {});
    const unknownId = "999999" as TypeId;
    expect(catalog.nameForId(unknownId, "en")).toBe(unknownId);
  });

  test("nameForId returns the id as placeholder for unloaded non-English packs", () => {
    const catalog = new LazyItemNameCatalog(() => {});
    expect(catalog.nameForId(SAMPLE_ID, "zh")).toBe(SAMPLE_ID);
    expect(catalog.nameForId(SAMPLE_ID, "ja")).toBe(SAMPLE_ID);
  });

  test("ensureLoaded triggers onLoaded callback after async import", async () => {
    let loadedLanguage: string | undefined;
    const catalog = new LazyItemNameCatalog((lang) => { loadedLanguage = lang; });
    catalog.ensureLoaded("zh");
    await flushMicrotasks();
    expect(catalog.isLoaded("zh")).toBe(true);
    expect(loadedLanguage).toBe("zh");
  });

  test("nameForId returns the localized name after ensureLoaded completes", async () => {
    const catalog = new LazyItemNameCatalog(() => {});
    catalog.ensureLoaded("ja");
    await flushMicrotasks();
    const name = catalog.nameForId(SAMPLE_ID, "ja");
    expect(name).not.toBe(SAMPLE_ID);
    expect(name.length).toBeGreaterThan(0);
  });

  test("ensureLoaded is idempotent", async () => {
    let loadCount = 0;
    const catalog = new LazyItemNameCatalog(() => { loadCount++; });
    catalog.ensureLoaded("zh");
    catalog.ensureLoaded("zh");
    await flushMicrotasks();
    expect(loadCount).toBe(1);
  });

  test("ensureLoaded for English is a no-op", () => {
    let loadCount = 0;
    const catalog = new LazyItemNameCatalog(() => { loadCount++; });
    catalog.ensureLoaded("en");
    expect(loadCount).toBe(0);
    expect(catalog.isLoaded("en")).toBe(true);
  });
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
