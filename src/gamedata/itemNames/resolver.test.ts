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
    en: overrides.en ?? { a: "Alpha", b: "Beta" },
    zh: overrides.zh ?? { a: "阿尔法", b: "贝塔" },
    ja: overrides.ja ?? { a: "アルファ", b: "ベータ" },
    collisionsEn: overrides.collisionsEn ?? {},
    collisionsZh: overrides.collisionsZh ?? {},
    collisionsJa: overrides.collisionsJa ?? {},
  });
}

describe("StaticItemNameResolver", () => {
  test("resolves an English name in the English map", () => {
    expect(resolver().idsForName("Beta", "en")).toEqual(["b" as TypeId]);
  });

  test("resolves a Chinese name in the Chinese map", () => {
    expect(resolver().idsForName("贝塔", "zh")).toEqual(["b" as TypeId]);
  });

  test("resolves a Japanese name in the Japanese map", () => {
    expect(resolver().idsForName("ベータ", "ja")).toEqual(["b" as TypeId]);
  });

  test("trims whitespace before resolving", () => {
    expect(resolver().idsForName("  Beta  ", "en")).toEqual(["b" as TypeId]);
  });

  test("returns an empty array for an unknown name", () => {
    expect(resolver().idsForName("Gamma", "en")).toEqual([]);
  });

  test("cross-language identical names resolve per language", () => {
    const r = resolver({
      en: { a: "Same", b: "Other" },
      zh: { a: "相同", b: "相同" },
      ja: { a: "同じ", b: "同じ" },
    });
    expect(r.idsForName("Same", "en")).toEqual(["a" as TypeId]);
    expect(r.idsForName("相同", "zh")).toEqual(["a" as TypeId, "b" as TypeId]);
    expect(r.idsForName("同じ", "ja")).toEqual(["a" as TypeId, "b" as TypeId]);
  });

  test("returns all ids sorted ascending for an intra-language collision", () => {
    const r = resolver({
      en: { a: "10", c: "Shared", d: "Shared" },
      collisionsEn: { Shared: "d" },
    });
    expect(r.idsForName("Shared", "en")).toEqual(["d" as TypeId, "c" as TypeId]);
  });

  test("falls back to English values in zh/ja maps when a translation is missing", () => {
    const r = resolver({
      en: { a: "Alpha" },
      zh: { a: "Alpha" },
    });
    expect(r.idsForName("Alpha", "zh")).toEqual(["a" as TypeId]);
  });
});
