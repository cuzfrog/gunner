import { ITEM_NAMES_EN } from "./item-names-en";
import { ITEM_NAME_ALIASES_EN } from "./item-name-aliases-en";
import { ITEM_NAME_COLLISIONS_EN } from "./item-name-collisions-en";
import { toTypeId, type TypeId } from "../ids";
import type { ShipNameLanguage } from "../i18n";
import type { ItemNameResolver } from "./resolver";
import type { ItemNameLoader } from "./lazyCatalog";
import { buildReverseMap, type NameToIds } from "./resolverShared";

type NamePack = Readonly<Record<string, string>>;
type CollisionPack = Readonly<Record<string, string>>;

export class LazyItemNameResolver implements ItemNameResolver, ItemNameLoader {
  private readonly maps = new Map<ShipNameLanguage, NameToIds | undefined>();
  private readonly packs = new Map<ShipNameLanguage, NamePack | undefined>();
  private readonly collisions = new Map<ShipNameLanguage, CollisionPack | undefined>();
  private readonly loading = new Set<ShipNameLanguage>();
  private readonly onLoaded: (language: ShipNameLanguage) => void;
  private readonly aliasesEn: NamePack;

  constructor(onLoaded: (language: ShipNameLanguage) => void) {
    this.onLoaded = onLoaded;
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
    this.loading.add(language);
    void this.loadPack(language).then(() => {
      this.loading.delete(language);
      this.onLoaded(language);
    });
  }

  isLoaded(language: ShipNameLanguage): boolean {
    return this.packs.has(language);
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

  private async loadPack(language: ShipNameLanguage): Promise<void> {
    if (language === "en") {
      this.packs.set("en", ITEM_NAMES_EN);
      this.collisions.set("en", ITEM_NAME_COLLISIONS_EN);
      this.mapFor("en");
      return;
    }
    if (language === "zh") {
      const [names, collisions] = await Promise.all([import("./item-names-zh"), import("./item-name-collisions-zh")]);
      this.packs.set("zh", names.ITEM_NAMES_ZH);
      this.collisions.set("zh", collisions.ITEM_NAME_COLLISIONS_ZH);
      this.mapFor("zh");
      return;
    }
    if (language === "ja") {
      const [names, collisions] = await Promise.all([import("./item-names-ja"), import("./item-name-collisions-ja")]);
      this.packs.set("ja", names.ITEM_NAMES_JA);
      this.collisions.set("ja", collisions.ITEM_NAME_COLLISIONS_JA);
      this.mapFor("ja");
      return;
    }
  }
}
