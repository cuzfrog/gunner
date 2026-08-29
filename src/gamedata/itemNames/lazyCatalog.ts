import { ITEM_NAMES_EN } from "./item-names-en";
import type { TypeId } from "../ids";
import type { ShipNameLanguage } from "../i18n";
import type { ItemNameCatalog } from "./catalog";

export interface ItemNameLoader {
  ensureLoaded(language: ShipNameLanguage): void;
  isLoaded(language: ShipNameLanguage): boolean;
  load(language: ShipNameLanguage): Promise<void>;
}

type NamePack = Readonly<Record<string, string>>;
type PackLoader = (language: ShipNameLanguage) => Promise<NamePack>;

export class LazyItemNameCatalog implements ItemNameCatalog, ItemNameLoader {
  private readonly packs = new Map<ShipNameLanguage, NamePack | undefined>();
  private readonly loading = new Map<ShipNameLanguage, Promise<void>>();
  private readonly onLoaded: (language: ShipNameLanguage) => void;
  private readonly loadPack: PackLoader;

  constructor(onLoaded: (language: ShipNameLanguage) => void, loadPack: PackLoader = defaultPackLoader) {
    this.onLoaded = onLoaded;
    this.loadPack = loadPack;
    this.packs.set("en", ITEM_NAMES_EN);
  }

  nameForId(id: TypeId, language: ShipNameLanguage): string {
    const pack = this.packs.get(language);
    if (pack === undefined) {
      this.ensureLoaded(language);
      return id;
    }
    return pack[id] ?? id;
  }

  ensureLoaded(language: ShipNameLanguage): void {
    if (this.packs.has(language) || this.loading.has(language)) return;
    const promise = this.loadPack(language).then((pack) => {
      this.packs.set(language, pack);
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
      this.packs.set(language, pack);
      this.loading.delete(language);
      this.onLoaded(language);
    });
    this.loading.set(language, promise);
    return promise;
  }
}

async function defaultPackLoader(language: ShipNameLanguage): Promise<NamePack> {
  if (language === "en") return ITEM_NAMES_EN;
  if (language === "zh") return (await import("./item-names-zh")).ITEM_NAMES_ZH;
  if (language === "ja") return (await import("./item-names-ja")).ITEM_NAMES_JA;
  return ITEM_NAMES_EN;
}
