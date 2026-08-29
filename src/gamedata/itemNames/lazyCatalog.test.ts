import { LazyItemNameCatalog } from "./lazyCatalog";
import type { TypeId } from "../ids";
import type { ShipNameLanguage } from "../i18n";

const SAMPLE_ID = "204" as TypeId;
const MOCK_ZH_PACK = { "204": "mock-zh-name" } as const;
const MOCK_JA_PACK = { "204": "mock-ja-name" } as const;

function mockPackLoader(language: ShipNameLanguage): Promise<Readonly<Record<string, string>>> {
  if (language === "zh") return Promise.resolve(MOCK_ZH_PACK);
  if (language === "ja") return Promise.resolve(MOCK_JA_PACK);
  return Promise.resolve({ "204": "mock-en-name" });
}

describe("LazyItemNameCatalog", () => {
  test("English pack is loaded at construction", () => {
    const catalog = new LazyItemNameCatalog(() => {}, mockPackLoader);
    expect(catalog.isLoaded("en")).toBe(true);
    expect(catalog.isLoaded("zh")).toBe(false);
    expect(catalog.isLoaded("ja")).toBe(false);
  });

  test("nameForId returns the id as placeholder for unloaded non-English packs", () => {
    const catalog = new LazyItemNameCatalog(() => {}, mockPackLoader);
    expect(catalog.nameForId(SAMPLE_ID, "zh")).toBe(SAMPLE_ID);
    expect(catalog.nameForId(SAMPLE_ID, "ja")).toBe(SAMPLE_ID);
  });

  test("nameForId falls back to the id for unknown ids", () => {
    const catalog = new LazyItemNameCatalog(() => {}, mockPackLoader);
    const unknownId = "999999" as TypeId;
    expect(catalog.nameForId(unknownId, "en")).toBe(unknownId);
  });

  test("ensureLoaded triggers onLoaded callback after async load", async () => {
    let loadedLanguage: string | undefined;
    const catalog = new LazyItemNameCatalog((lang) => { loadedLanguage = lang; }, mockPackLoader);
    catalog.ensureLoaded("zh");
    await flushMicrotasks();
    expect(catalog.isLoaded("zh")).toBe(true);
    expect(loadedLanguage).toBe("zh");
  });

  test("nameForId returns the localized name after ensureLoaded completes", async () => {
    const catalog = new LazyItemNameCatalog(() => {}, mockPackLoader);
    catalog.ensureLoaded("ja");
    await flushMicrotasks();
    expect(catalog.nameForId(SAMPLE_ID, "ja")).toBe("mock-ja-name");
  });

  test("load awaits the pack and returns the localized name", async () => {
    const catalog = new LazyItemNameCatalog(() => {}, mockPackLoader);
    await catalog.load("zh");
    expect(catalog.isLoaded("zh")).toBe(true);
    expect(catalog.nameForId(SAMPLE_ID, "zh")).toBe("mock-zh-name");
  });

  test("ensureLoaded is idempotent", async () => {
    let loadCount = 0;
    const loader = (language: ShipNameLanguage): Promise<Readonly<Record<string, string>>> => {
      loadCount++;
      return mockPackLoader(language);
    };
    const catalog = new LazyItemNameCatalog(() => {}, loader);
    catalog.ensureLoaded("zh");
    catalog.ensureLoaded("zh");
    await flushMicrotasks();
    expect(loadCount).toBe(1);
  });

  test("ensureLoaded for English is a no-op", () => {
    let loadCount = 0;
    const loader = (language: ShipNameLanguage): Promise<Readonly<Record<string, string>>> => {
      loadCount++;
      return mockPackLoader(language);
    };
    const catalog = new LazyItemNameCatalog(() => {}, loader);
    catalog.ensureLoaded("en");
    expect(loadCount).toBe(0);
    expect(catalog.isLoaded("en")).toBe(true);
  });
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
