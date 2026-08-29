import { LazyItemNameResolver } from "./lazyResolver";
import type { ShipNameLanguage } from "../i18n";

const MOCK_ZH_NAMES = { "204": "mock-zh-name" } as const;
const MOCK_ZH_COLLISIONS = {} as const;
const MOCK_JA_NAMES = { "204": "mock-ja-name" } as const;
const MOCK_JA_COLLISIONS = {} as const;

function mockResolverPackLoader(language: ShipNameLanguage): Promise<{ names: Readonly<Record<string, string>>; collisions: Readonly<Record<string, string>> }> {
  if (language === "zh") return Promise.resolve({ names: MOCK_ZH_NAMES, collisions: MOCK_ZH_COLLISIONS });
  if (language === "ja") return Promise.resolve({ names: MOCK_JA_NAMES, collisions: MOCK_JA_COLLISIONS });
  return Promise.resolve({ names: {}, collisions: {} });
}

describe("LazyItemNameResolver", () => {
  test("English pack is loaded at construction", () => {
    const resolver = new LazyItemNameResolver(() => {}, mockResolverPackLoader);
    expect(resolver.isLoaded("en")).toBe(true);
    expect(resolver.isLoaded("zh")).toBe(false);
    expect(resolver.isLoaded("ja")).toBe(false);
  });

  test("idsForName returns empty array for unloaded non-English packs", () => {
    const resolver = new LazyItemNameResolver(() => {}, mockResolverPackLoader);
    expect(resolver.idsForName("test", "zh")).toEqual([]);
    expect(resolver.idsForName("test", "ja")).toEqual([]);
  });

  test("ensureLoaded triggers onLoaded callback after async load", async () => {
    let loadedLanguage: string | undefined;
    const resolver = new LazyItemNameResolver((lang) => { loadedLanguage = lang; }, mockResolverPackLoader);
    resolver.ensureLoaded("zh");
    await flushMicrotasks();
    expect(resolver.isLoaded("zh")).toBe(true);
    expect(loadedLanguage).toBe("zh");
  });

  test("idsForName returns results after ensureLoaded completes", async () => {
    const resolver = new LazyItemNameResolver(() => {}, mockResolverPackLoader);
    resolver.ensureLoaded("ja");
    await flushMicrotasks();
    const ids = resolver.idsForName("mock-ja-name", "ja");
    expect(ids.length).toBe(1);
    expect(ids[0]).toBe("204");
  });

  test("load awaits the pack and resolves names", async () => {
    const resolver = new LazyItemNameResolver(() => {}, mockResolverPackLoader);
    await resolver.load("zh");
    expect(resolver.isLoaded("zh")).toBe(true);
    const ids = resolver.idsForName("mock-zh-name", "zh");
    expect(ids.length).toBe(1);
  });

  test("ensureLoaded is idempotent", async () => {
    let loadCount = 0;
    const loader = (language: ShipNameLanguage): Promise<{ names: Readonly<Record<string, string>>; collisions: Readonly<Record<string, string>> }> => {
      loadCount++;
      return mockResolverPackLoader(language);
    };
    const resolver = new LazyItemNameResolver(() => {}, loader);
    resolver.ensureLoaded("zh");
    resolver.ensureLoaded("zh");
    await flushMicrotasks();
    expect(loadCount).toBe(1);
  });
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
