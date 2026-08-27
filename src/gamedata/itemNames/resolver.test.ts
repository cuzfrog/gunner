import type { TypeId } from "../ids";
import { StaticItemNameResolver, type ItemNameResolver } from "./resolver";

function resolver(overrides: {
  en?: Record<string, string>;
  zh?: Record<string, string>;
  ja?: Record<string, string>;
  collisionsEn?: Record<string, string>;
  collisionsZh?: Record<string, string>;
  collisionsJa?: Record<string, string>;
  aliasesEn?: Record<string, string>;
} = {}): ItemNameResolver {
  return new StaticItemNameResolver({
    en: overrides.en ?? { "1": "Alpha", "2": "Beta" },
    zh: overrides.zh ?? { "1": "阿尔法", "2": "贝塔" },
    ja: overrides.ja ?? { "1": "アルファ", "2": "ベータ" },
    collisionsEn: overrides.collisionsEn ?? {},
    collisionsZh: overrides.collisionsZh ?? {},
    collisionsJa: overrides.collisionsJa ?? {},
    aliasesEn: overrides.aliasesEn ?? {},
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

  test("drops a collision-preferred id that is not present in the pack", () => {
    const r = resolver({
      en: { "3": "Shared", "4": "Shared" },
      collisionsEn: { Shared: "5" },
    });
    expect(r.idsForName("Shared", "en")).toEqual(["3" as TypeId, "4" as TypeId]);
  });

  test("resolves a legacy English name via the alias table after an exact miss", () => {
    const r = resolver({
      en: { "1": "Multispectrum Shield Hardener" },
      aliasesEn: { "Adaptive Invulnerability Field": "Multispectrum Shield Hardener" },
    });
    expect(r.idsForName("Adaptive Invulnerability Field", "en")).toEqual(["1" as TypeId]);
  });

  test("resolves an aliased name the same as its current target name", () => {
    const r = resolver({
      en: { "1": "Multispectrum Shield Hardener" },
      aliasesEn: { "Adaptive Invulnerability Field": "Multispectrum Shield Hardener" },
    });
    expect(r.idsForName("Adaptive Invulnerability Field", "en")).toEqual(r.idsForName("Multispectrum Shield Hardener", "en"));
  });

  test("returns empty for an unknown English name with no alias", () => {
    expect(resolver({ aliasesEn: { "Old": "Beta" } }).idsForName("Completely Unknown", "en")).toEqual([]);
  });

  test("does not apply English aliases to zh", () => {
    const r = resolver({
      en: { "1": "Multispectrum Shield Hardener" },
      zh: { "1": "自适应全能护盾增强器" },
      aliasesEn: { "Old Name": "Multispectrum Shield Hardener" },
    });
    expect(r.idsForName("Old Name", "zh")).toEqual([]);
  });

  test("does not apply English aliases to ja", () => {
    const r = resolver({
      en: { "1": "Multispectrum Shield Hardener" },
      ja: { "1": "マルチスペクトラムシールドハードナー" },
      aliasesEn: { "Old Name": "Multispectrum Shield Hardener" },
    });
    expect(r.idsForName("Old Name", "ja")).toEqual([]);
  });
});
