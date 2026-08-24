import { ITEM_NAMES_EN } from "./item-names-en";
import type { ShipNameLanguage } from "../ships";

// The SDE localized names for a handful of distinct items are identical.
// These overrides choose the most specific matching English name
// (e.g. the size/tier/damage-type variant that the shared string denotes).
const CANONICAL_OVERRIDES: Readonly<Record<ShipNameLanguage, Readonly<Record<string, string>>>> = {
  en: {},
  zh: {
    "莱塞勒氏改良型爆炸装甲增强器": "Raysere's Modified Explosive Armor Hardener",
  },
  ja: {
    "ドミネーション炭化鉛弾XL": "Domination Carbonized Lead XL",
    "デュアルアフォーカルパルスレーザーI": "Dual Afocal Pulse Laser I",
    "大型エクスプローシブ・アーマーレインフォーサーII": "Large Explosive Armor Reinforcer II",
    "大型キネティック・アーマーレインフォーサーI": "Large Kinetic Armor Reinforcer I",
    "中型重力子スマートボムII": "Medium Graviton Smartbomb II",
    "共和国海軍仕様炭化鉛弾S": "Republic Fleet Carbonized Lead S",
    "トゥルーサンシャEMコーティング": "True Sansha EM Coating",
  },
};

interface ItemNameEntry {
  zh: string;
  ja: string;
}

type ItemNameLoader = (language: ShipNameLanguage) => Promise<{ readonly names: readonly string[] }>;

export interface ItemNames {
  displayName(name: string, language: ShipNameLanguage): string;
  canonicalName(name: string): string;
  ensureLanguage(language: ShipNameLanguage): Promise<void>;
}

export class ItemNamesImpl implements ItemNames {
  private readonly forward: Map<string, ItemNameEntry>;
  private readonly reverse: Map<string, string>;
  private readonly loader: ItemNameLoader;
  private readonly loaded: Set<ShipNameLanguage> = new Set(["en"]);
  private readonly inFlight: Map<ShipNameLanguage, Promise<void>> = new Map();

  constructor(loader: ItemNameLoader = productionLoader) {
    this.loader = loader;
    this.forward = new Map<string, ItemNameEntry>();
    this.reverse = new Map<string, string>();
    for (const name of ITEM_NAMES_EN) {
      this.forward.set(name, { zh: name, ja: name });
    }
  }

  displayName(name: string, language: ShipNameLanguage): string {
    const entry = this.forward.get(name);
    if (!entry) return name;
    if (language === "zh") return entry.zh;
    if (language === "ja") return entry.ja;
    return name;
  }

  canonicalName(name: string): string {
    return this.reverse.get(name) ?? name;
  }

  async ensureLanguage(language: ShipNameLanguage): Promise<void> {
    if (language === "en" || this.loaded.has(language)) return;
    const existing = this.inFlight.get(language);
    if (existing) return existing;
    const promise = this.loadAndApply(language);
    this.inFlight.set(language, promise);
    await promise;
  }

  private async loadAndApply(language: ShipNameLanguage): Promise<void> {
    const pack = await this.loader(language);
    const names = pack.names;
    const groups = groupByValue(ITEM_NAMES_EN, names);
    const display = new Map<string, string>();
    for (const [localized, candidates] of groups) {
      const winner = canonicalForGroup(candidates, localized, language);
      display.set(winner, localized);
    }
    for (let i = 0; i < ITEM_NAMES_EN.length; i++) {
      const en = ITEM_NAMES_EN[i];
      const use = display.get(en) ?? en;
      const entry = this.forward.get(en);
      if (entry) {
        if (language === "zh") entry.zh = use;
        else if (language === "ja") entry.ja = use;
      }
      if (use !== en) this.reverse.set(use, en);
    }
    this.loaded.add(language);
    this.inFlight.delete(language);
  }
}

function productionLoader(language: ShipNameLanguage): Promise<{ readonly names: readonly string[] }> {
  if (language === "zh") return import("./item-names-zh").then((m) => ({ names: m.ITEM_NAMES_ZH }));
  if (language === "ja") return import("./item-names-ja").then((m) => ({ names: m.ITEM_NAMES_JA }));
  return Promise.resolve({ names: [] });
}

function groupByValue(en: readonly string[], localized: readonly string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (let i = 0; i < en.length; i++) {
    const key = localized[i];
    if (key === undefined) continue;
    const list = groups.get(key) ?? [];
    list.push(en[i]);
    groups.set(key, list);
  }
  return groups;
}

function canonicalForGroup(candidates: readonly string[], localized: string, language: ShipNameLanguage): string {
  const override = CANONICAL_OVERRIDES[language][localized];
  if (override && candidates.includes(override)) return override;
  return bestCandidate(candidates, localized);
}

function bestCandidate(candidates: readonly string[], localized: string): string {
  if (candidates.length === 1) return candidates[0];
  let best = candidates[0];
  let bestScore = score(candidates[0], localized);
  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candidateScore = score(candidate, localized);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    } else if (candidateScore === bestScore) {
      if (candidate.length < best.length || (candidate.length === best.length && candidate < best)) {
        best = candidate;
      }
    }
  }
  return best;
}

function score(english: string, localized: string): number {
  const lower = localized.toLowerCase();
  const tokens = english.split(/\s+/u).filter((t) => t.length > 0);
  if (tokens.length === 0) return 0;
  let sum = 0;
  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (lower.includes(normalized)) sum += normalized.length;
  }
  const lastToken = tokens[tokens.length - 1].toLowerCase();
  if (lower.endsWith(lastToken)) sum += lastToken.length;
  return sum;
}
