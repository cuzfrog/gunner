import { ITEM_NAMES_EN } from "./item-names-en";
import { ITEM_NAME_ALIASES_EN } from "./item-name-aliases-en";
import { ITEM_NAME_COLLISIONS_EN } from "./item-name-collisions-en";
import type { TypeId } from "../ids";
import type { ShipNameLanguage } from "../i18n";
import type { ItemNameResolver } from "./resolver";
import type { ItemNameLoader } from "./lazyCatalog";
import { buildReverseMap, type NameToIds } from "./resolverShared";

type NamePack = Readonly<Record<string, string>>;
type CollisionPack = Readonly<Record<string, string>>;
interface ResolverPack {
  readonly names: NamePack;
  readonly collisions: CollisionPack;
}
type ResolverPackLoader = (language: ShipNameLanguage) => Promise<ResolverPack>;

export class LazyItemNameResolver implements ItemNameResolver, ItemNameLoader {
  private readonly maps = new Map<ShipNameLanguage, NameToIds | undefined>();
  private readonly packs = new Map<ShipNameLanguage, NamePack | undefined>();
  private readonly collisions = new Map<ShipNameLanguage, CollisionPack | undefined>();
  private readonly loading = new Map<ShipNameLanguage, Promise<void>>();
  private readonly onLoaded: (language: ShipNameLanguage) => void;
  private readonly aliasesEn: NamePack;
  private readonly loadPack: ResolverPackLoader;

  constructor(onLoaded: (language: ShipNameLanguage) => void, loadPack: ResolverPackLoader = defaultResolverPackLoader) {
    this.onLoaded = onLoaded;
    this.loadPack = loadPack;
    this.packs.set("en", ITEM_NAMES_EN);
    this.collisions.set("en", ITEM_NAME_COLLISIONS_EN);
    this.aliasesEn = ITEM_NAME_ALIASES_EN;
  }

  idsForName(name: string, language: ShipNameLanguage): readonly TypeId[] {
    const map = this.mapFor(language);
    if (map === undefined) {
      this.ensureLoaded(language);
      return [];
    }
    const trimmed = name.trim();
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

  ensureLoaded(language: ShipNameLanguage): void {
    if (this.packs.has(language) || this.loading.has(language)) return;
    const promise = this.loadPack(language).then((pack) => {
      this.packs.set(language, pack.names);
      this.collisions.set(language, pack.collisions);
      this.mapFor(language);
      this.loading.delete(language);
      this.onLoaded(language);
    });
    this.loading.set(language, promise);
  }

  isLoaded(language: ShipNameLanguage): boolean {
    return this.packs.has(language);
  }

  load(language: ShipNameLanguage): Promise<void> {
    if (this.packs.has(language)) return Promise.resolve();
    const existing = this.loading.get(language);
    if (existing) return existing;
    const promise = this.loadPack(language).then((pack) => {
      this.packs.set(language, pack.names);
      this.collisions.set(language, pack.collisions);
      this.mapFor(language);
      this.loading.delete(language);
      this.onLoaded(language);
    });
    this.loading.set(language, promise);
    return promise;
  }

  private mapFor(language: ShipNameLanguage): NameToIds | undefined {
    let map = this.maps.get(language);
    if (map === undefined) {
      const pack = this.packs.get(language);
      const collisions = this.collisions.get(language);
      if (pack === undefined || collisions === undefined) return undefined;
      map = buildReverseMap(pack, collisions);
      this.maps.set(language, map);
    }
    return map;
  }
}

async function defaultResolverPackLoader(language: ShipNameLanguage): Promise<ResolverPack> {
  if (language === "en") return { names: ITEM_NAMES_EN, collisions: ITEM_NAME_COLLISIONS_EN };
  if (language === "zh") {
    const [names, collisions] = await Promise.all([import("./item-names-zh"), import("./item-name-collisions-zh")]);
    return { names: names.ITEM_NAMES_ZH, collisions: collisions.ITEM_NAME_COLLISIONS_ZH };
  }
  if (language === "ja") {
    const [names, collisions] = await Promise.all([import("./item-names-ja"), import("./item-name-collisions-ja")]);
    return { names: names.ITEM_NAMES_JA, collisions: collisions.ITEM_NAME_COLLISIONS_JA };
  }
  return { names: ITEM_NAMES_EN, collisions: ITEM_NAME_COLLISIONS_EN };
}
