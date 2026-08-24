import { ITEM_NAMES_EN } from "./item-names-en";
import type { ShipNameLanguage } from "../ships";

export interface ItemNames {
  displayName(name: string, language: ShipNameLanguage): string;
  canonicalName(name: string): string;
  ensureLanguage(language: ShipNameLanguage): Promise<void>;
}

export class ItemNamesImpl implements ItemNames {
  private readonly forward: Map<string, ItemNameEntry>;
  private readonly reverse: Map<string, string>;
  private readonly itemNameLoader: ItemNameLoader;
  private readonly loaded: Set<ShipNameLanguage> = new Set(["en"]);
  private readonly inFlight: Map<ShipNameLanguage, Promise<void>> = new Map();

  constructor({ itemNameLoader = productionItemNameLoader }: { itemNameLoader?: ItemNameLoader } = {}) {
    this.itemNameLoader = itemNameLoader;
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
    try {
      await promise;
    } catch (error) {
      this.inFlight.delete(language);
      throw error;
    }
  }

  private async loadAndApply(language: ShipNameLanguage): Promise<void> {
    const pack = await this.itemNameLoader(language);
    const names = pack.names;
    const groups = groupByValue(ITEM_NAMES_EN, names);
    const display = new Map<string, string>();
    for (const [localized, candidates] of groups) {
      const winner = canonicalForGroup(candidates, localized, pack.overrides);
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

interface ItemNameEntry {
  zh: string;
  ja: string;
}

type ItemNameLoader = (language: ShipNameLanguage) => Promise<{ readonly names: readonly string[]; readonly overrides: Readonly<Record<string, string>> }>;

function productionItemNameLoader(language: ShipNameLanguage): Promise<{ readonly names: readonly string[]; readonly overrides: Readonly<Record<string, string>> }> {
  if (language === "zh") return import("./item-names-zh").then((m) => ({ names: m.ITEM_NAMES_ZH, overrides: m.ITEM_NAMES_ZH_OVERRIDES }));
  if (language === "ja") return import("./item-names-ja").then((m) => ({ names: m.ITEM_NAMES_JA, overrides: m.ITEM_NAMES_JA_OVERRIDES }));
  return Promise.resolve({ names: [], overrides: {} });
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

function canonicalForGroup(
  candidates: readonly string[],
  localized: string,
  overrides: Readonly<Record<string, string>>,
): string {
  const override = overrides[localized];
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
