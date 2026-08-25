import { FACTION_NAMES } from "./faction-i18n";
import { HULL_TYPE_NAMES } from "./hull-types-i18n";
import { SHIP_NAMES } from "./ship-names-i18n";
import type { ShipNameLanguage } from "../../ships";

export interface NameI18nCatalog {
  shipName(name: string, language: ShipNameLanguage): string;
  hullTypeName(hullType: string, language: ShipNameLanguage): string;
  factionName(faction: string, language: ShipNameLanguage): string;
  shipLocalizations(name: string): Readonly<Record<ShipNameLanguage, string>> | undefined;
}

export class StaticNameI18nCatalog implements NameI18nCatalog {
  shipName(name: string, language: ShipNameLanguage): string {
    return SHIP_NAMES[name]?.[language] || name;
  }

  hullTypeName(hullType: string, language: ShipNameLanguage): string {
    return HULL_TYPE_NAMES[hullType]?.[language] || hullType;
  }

  factionName(faction: string, language: ShipNameLanguage): string {
    return FACTION_NAMES[faction]?.[language] || faction;
  }

  shipLocalizations(name: string): Readonly<Record<ShipNameLanguage, string>> | undefined {
    return SHIP_NAMES[name];
  }
}
