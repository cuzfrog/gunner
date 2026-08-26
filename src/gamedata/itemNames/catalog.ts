import { ITEM_NAMES_EN } from "./item-names-en";
import { ITEM_NAMES_JA } from "./item-names-ja";
import { ITEM_NAMES_ZH } from "./item-names-zh";
import type { TypeId } from "../ids";
import type { ShipNameLanguage } from "../../ships";

export interface ItemNameCatalog {
  nameForId(id: TypeId, language: ShipNameLanguage): string;
}

export class StaticItemNameCatalog implements ItemNameCatalog {
  nameForId(id: TypeId, language: ShipNameLanguage): string {
    const table = language === "zh" ? ITEM_NAMES_ZH : language === "ja" ? ITEM_NAMES_JA : ITEM_NAMES_EN;
    return table[id] ?? id;
  }
}
