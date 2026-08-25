import type { NameI18nCatalog } from "./nameI18n";
import type { ShipProfileCatalog } from "./shipProfiles";

export interface GameDataCradle {
  readonly shipProfileCatalog: ShipProfileCatalog;
  readonly nameI18nCatalog: NameI18nCatalog;
}
