import type { TypeId } from "../ids";
import { StaticItemNameResolver, type ItemNameResolver } from "./resolver";

function resolver(overrides: {
  en?: Record<string, string>;
  zh?: Record<string, string>;
  ja?: Record<string, string>;
  collisionsEn?: Record<string, string>;
  collisionsZh?: Record<string, string>;
  collisionsJa?: Record<string, string>;
} = {}): ItemNameResolver {
  return new StaticItemNameResolver({
    en: overrides.en ?? { "1": "Alpha", "2": "Beta" },
    zh: overrides.zh ?? { "1": "阿尔法", "2": "贝塔" },
    ja: overrides.ja ?? { "1": "アルファ", "2": "ベータ" },
    collisionsEn: overrides.collisionsEn ?? {},
    collisionsZh: overrides.collisionsZh ?? {},
    collisionsJa: overrides.collisionsJa ?? {},
  });
}

describe("StaticItemNameResolver", () => {
  test("resolves an English name in the English map", () => {
    expect(resolver().idsForName("Beta", "en")).toEqual(["2" as TypeId]);
  });

  test("resolves a Chinese name in the Chinese map", () => {
    expect(resolver().idsForName("贝塔", "zh")).toEqual(["2" as TypeId]);
  });

  test("resolves a Japanese name in the Japanese map", () => {
    expect(resolver().idsForName("ベータ", "ja")).toEqual(["2" as TypeId]);
  });

  test("trims whitespace before resolving", () => {
    expect(resolver().idsForName("  Beta  ", "en")).toEqual(["2" as TypeId]);
  });

  test("returns an empty array for an unknown name", () => {
    expect(resolver().idsForName("Gamma", "en")).toEqual([]);
  });

  test("cross-language identical names resolve per language", () => {
    const r = resolver({
      en: { "1": "Same", "2": "Other" },
      zh: { "1": "相同", "2": "相同" },
      ja: { "1": "同じ", "2": "同じ" },
    });
    expect(r.idsForName("Same", "en")).toEqual(["1" as TypeId]);
    expect(r.idsForName("相同", "zh")).toEqual(["1" as TypeId, "2" as TypeId]);
    expect(r.idsForName("同じ", "ja")).toEqual(["1" as TypeId, "2" as TypeId]);
  });

  test("returns all ids sorted ascending for an intra-language collision", () => {
    const r = resolver({
      en: { "1": "10", "3": "Shared", "4": "Shared" },
      collisionsEn: { Shared: "4" },
    });
    expect(r.idsForName("Shared", "en")).toEqual(["4" as TypeId, "3" as TypeId]);
  });

  test("falls back to English values in zh/ja maps when a translation is missing", () => {
    const r = resolver({
      en: { "1": "Alpha" },
      zh: { "1": "Alpha" },
    });
    expect(r.idsForName("Alpha", "zh")).toEqual(["1" as TypeId]);
  });
});
