import { ITEM_NAMES_EN } from "./item-names-en";
import { ITEM_NAMES_JA } from "./item-names-ja";
import { ITEM_NAMES_ZH } from "./item-names-zh";
import { ITEM_NAME_ALIASES_EN } from "./item-name-aliases-en";
import { ITEM_NAME_COLLISIONS_EN } from "./item-name-collisions-en";
import { ITEM_NAME_COLLISIONS_JA } from "./item-name-collisions-ja";
import { ITEM_NAME_COLLISIONS_ZH } from "./item-name-collisions-zh";
import { toTypeId, type TypeId } from "../ids";
import type { ShipNameLanguage } from "../i18n";

export interface ItemNameResolver {
  idsForName(name: string, language: ShipNameLanguage): readonly TypeId[];
}

type NameToIds = Map<string, TypeId[]>;

interface StaticItemNameResolverOptions {
  readonly en?: Readonly<Record<string, string>>;
  readonly zh?: Readonly<Record<string, string>>;
  readonly ja?: Readonly<Record<string, string>>;
  readonly collisionsEn?: Readonly<Record<string, string>>;
  readonly collisionsZh?: Readonly<Record<string, string>>;
  readonly collisionsJa?: Readonly<Record<string, string>>;
  readonly aliasesEn?: Readonly<Record<string, string>>;
}

export class StaticItemNameResolver implements ItemNameResolver {
  private readonly maps: Record<ShipNameLanguage, NameToIds | undefined> = { en: undefined, zh: undefined, ja: undefined };
  private readonly packs: Record<ShipNameLanguage, Readonly<Record<string, string>>>;
  private readonly collisions: Record<ShipNameLanguage, Readonly<Record<string, string>>>;
  private readonly aliasesEn: Readonly<Record<string, string>>;

  constructor(options: StaticItemNameResolverOptions = {}) {
    this.packs = {
      en: options.en ?? ITEM_NAMES_EN,
      zh: options.zh ?? ITEM_NAMES_ZH,
      ja: options.ja ?? ITEM_NAMES_JA,
    };
    this.collisions = {
      en: options.collisionsEn ?? ITEM_NAME_COLLISIONS_EN,
      zh: options.collisionsZh ?? ITEM_NAME_COLLISIONS_ZH,
      ja: options.collisionsJa ?? ITEM_NAME_COLLISIONS_JA,
    };
    this.aliasesEn = options.aliasesEn ?? ITEM_NAME_ALIASES_EN;
  }

  idsForName(name: string, language: ShipNameLanguage): readonly TypeId[] {
    const trimmed = name.trim();
    const map = this.mapFor(language);
    const exact = map.get(trimmed);
    if (exact) return exact;
    if (language === "en") {
      const target = this.aliasesEn[trimmed];
      if (target !== undefined) {
        const aliased = map.get(target);
        if (aliased) return aliased;
      }
    }
    return [];
  }

  private mapFor(language: ShipNameLanguage): NameToIds {
    let map = this.maps[language];
    if (!map) {
      map = buildReverseMap(this.packs[language], this.collisions[language]);
      this.maps[language] = map;
    }
    return map;
  }
}

function buildReverseMap(pack: Readonly<Record<string, string>>, collisions: Readonly<Record<string, string>>): NameToIds {
  const groups = new Map<string, TypeId[]>();
  for (const [id, name] of Object.entries(pack)) {
    const typeId = toTypeId(id);
    const list = groups.get(name) ?? [];
    list.push(typeId);
    groups.set(name, list);
  }

  const map = new Map<string, TypeId[]>();
  for (const [name, ids] of groups) {
    const preferredId = collisions[name];
    const preferred = preferredId !== undefined ? toTypeId(preferredId) : undefined;
    const sorted = [...ids].sort((a, b) => Number(a) - Number(b));
    if (preferred && ids.includes(preferred)) {
      const rest = sorted.filter((id) => id !== preferred);
      map.set(name, [preferred, ...rest]);
    } else {
      map.set(name, sorted);
    }
  }
  return map;
}
