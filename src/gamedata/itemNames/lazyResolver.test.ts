import { LazyItemNameResolver } from "./lazyResolver";

describe("LazyItemNameResolver", () => {
  test("English pack is loaded at construction", () => {
    const resolver = new LazyItemNameResolver(() => {});
    expect(resolver.isLoaded("en")).toBe(true);
    expect(resolver.isLoaded("zh")).toBe(false);
    expect(resolver.isLoaded("ja")).toBe(false);
  });

  test("idsForName returns results for English names", () => {
    const resolver = new LazyItemNameResolver(() => {});
    const ids = resolver.idsForName("Heavy Pulse Laser II", "en");
    expect(ids.length).toBeGreaterThan(0);
  });

  test("idsForName returns empty array for unloaded non-English packs", () => {
    const resolver = new LazyItemNameResolver(() => {});
    expect(resolver.idsForName("test", "zh")).toEqual([]);
    expect(resolver.idsForName("test", "ja")).toEqual([]);
  });

  test("ensureLoaded triggers onLoaded callback after async import", async () => {
    let loadedLanguage: string | undefined;
    const resolver = new LazyItemNameResolver((lang) => { loadedLanguage = lang; });
    resolver.ensureLoaded("zh");
    await flushMicrotasks();
    expect(resolver.isLoaded("zh")).toBe(true);
    expect(loadedLanguage).toBe("zh");
  });

  test("idsForName returns results after ensureLoaded completes", async () => {
    const resolver = new LazyItemNameResolver(() => {});
    resolver.ensureLoaded("ja");
    await flushMicrotasks();
    const ids = resolver.idsForName("大型パルスレーザーII", "ja");
    expect(ids.length).toBeGreaterThan(0);
  });

  test("ensureLoaded is idempotent", async () => {
    let loadCount = 0;
    const resolver = new LazyItemNameResolver(() => { loadCount++; });
    resolver.ensureLoaded("zh");
    resolver.ensureLoaded("zh");
    await flushMicrotasks();
    expect(loadCount).toBe(1);
  });
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
