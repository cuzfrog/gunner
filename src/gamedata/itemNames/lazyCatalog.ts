import { ITEM_NAMES_EN } from "./item-names-en";
import type { TypeId } from "../ids";
import type { ShipNameLanguage } from "../i18n";
import type { ItemNameCatalog } from "./catalog";

export interface ItemNameLoader {
  ensureLoaded(language: ShipNameLanguage): void;
  isLoaded(language: ShipNameLanguage): boolean;
}

type NamePack = Readonly<Record<string, string>>;

export class LazyItemNameCatalog implements ItemNameCatalog, ItemNameLoader {
  private readonly packs = new Map<ShipNameLanguage, NamePack | undefined>();
  private readonly loading = new Set<ShipNameLanguage>();
  private readonly onLoaded: (language: ShipNameLanguage) => void;

  constructor(onLoaded: (language: ShipNameLanguage) => void) {
    this.onLoaded = onLoaded;
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
    this.loading.add(language);
    void this.loadPack(language).then(() => {
      this.loading.delete(language);
      this.onLoaded(language);
    });
  }

  isLoaded(language: ShipNameLanguage): boolean {
    return this.packs.has(language);
  }

  private async loadPack(language: ShipNameLanguage): Promise<void> {
    if (language === "en") {
      this.packs.set("en", ITEM_NAMES_EN);
      return;
    }
    if (language === "zh") {
      const module = await import("./item-names-zh");
      this.packs.set("zh", module.ITEM_NAMES_ZH);
      return;
    }
    if (language === "ja") {
      const module = await import("./item-names-ja");
      this.packs.set("ja", module.ITEM_NAMES_JA);
      return;
    }
  }
}
