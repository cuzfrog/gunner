import type { FittingDbData } from "./fittingDb";
import type { ItemNameCatalog, ItemNameLoader, ItemNameResolver } from "./itemNames";
import type { ModuleSlotCatalog } from "./moduleSlots";
import type { NameI18nCatalog } from "./nameI18n";
import type { PresetFitTexts } from "./presets";
import type { ShipProfileCatalog } from "./shipProfiles";

export interface GameDataCradle {
  readonly shipProfileCatalog: ShipProfileCatalog;
  readonly nameI18nCatalog: NameI18nCatalog;
  readonly fittingDb: FittingDbData;
  readonly moduleSlotCatalog: ModuleSlotCatalog;
  readonly itemNameCatalog: ItemNameCatalog;
  readonly itemNameLoader: ItemNameLoader;
  readonly itemNameResolver: ItemNameResolver;
  readonly presetFitTexts: PresetFitTexts;
}
