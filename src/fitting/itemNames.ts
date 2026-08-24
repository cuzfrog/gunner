import { ITEM_NAMES_EN } from "./item-names-en";
import { ITEM_NAMES_JA } from "./item-names-ja";
import { ITEM_NAMES_ZH } from "./item-names-zh";
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

export interface ItemNames {
  displayName(name: string, language: ShipNameLanguage): string;
  canonicalName(name: string): string;
}

export class ItemNamesImpl implements ItemNames {
  private readonly forward: ReadonlyMap<string, { readonly zh: string; readonly ja: string }>;
  private readonly reverse: ReadonlyMap<string, string>;

  constructor() {
    const resolved = resolveLocalizations();
    this.forward = resolved.forward;
    this.reverse = resolved.reverse;
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
}

interface ResolvedItemNames {
  forward: ReadonlyMap<string, { readonly zh: string; readonly ja: string }>;
  reverse: ReadonlyMap<string, string>;
}

function resolveLocalizations(): ResolvedItemNames {
  const en = ITEM_NAMES_EN;
  const zh = ITEM_NAMES_ZH;
  const ja = ITEM_NAMES_JA;

  const zhGroups = groupByValue(en, zh);
  const jaGroups = groupByValue(en, ja);

  const zhDisplay = new Map<string, string>();
  for (const [localized, candidates] of zhGroups) {
    const winner = canonicalForGroup(candidates, localized, "zh");
    zhDisplay.set(winner, localized);
  }

  const jaDisplay = new Map<string, string>();
  for (const [localized, candidates] of jaGroups) {
    const winner = canonicalForGroup(candidates, localized, "ja");
    jaDisplay.set(winner, localized);
  }

  const forward = new Map<string, { zh: string; ja: string }>();
  const reverse = new Map<string, string>();
  for (let i = 0; i < en.length; i++) {
    const name = en[i];
    const useZh = zhDisplay.get(name) ?? name;
    const useJa = jaDisplay.get(name) ?? name;
    forward.set(name, { zh: useZh, ja: useJa });
    if (useZh !== name) reverse.set(useZh, name);
    if (useJa !== name) reverse.set(useJa, name);
  }

  return { forward, reverse };
}

function groupByValue(en: readonly string[], localized: readonly string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (let i = 0; i < en.length; i++) {
    const key = localized[i];
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
