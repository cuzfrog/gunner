import type { FactionId, HullTypeId, ShipId } from "../ids";
import { FACTION_NAMES } from "./faction-i18n";
import { HULL_TYPE_NAMES } from "./hull-types-i18n";
import { SHIP_NAMES } from "./ship-names-i18n";
import type { ShipNameLanguage } from "../../ships";

export interface NameI18nCatalog {
  shipName(id: ShipId, language: ShipNameLanguage): string | undefined;
  hullTypeName(id: HullTypeId, language: ShipNameLanguage): string | undefined;
  factionName(id: FactionId, language: ShipNameLanguage): string | undefined;
}

export class StaticNameI18nCatalog implements NameI18nCatalog {
  shipName(id: ShipId, language: ShipNameLanguage): string | undefined {
    return SHIP_NAMES[id]?.[language];
  }

  hullTypeName(id: HullTypeId, language: ShipNameLanguage): string | undefined {
    return HULL_TYPE_NAMES[id]?.[language];
  }

  factionName(id: FactionId, language: ShipNameLanguage): string | undefined {
    return FACTION_NAMES[id]?.[language];
  }
}
