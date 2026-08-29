import { asFunction, asValue, type AwilixContainer } from "awilix";
import type { GameDataCradle } from "./cradle";
import { FITTING_DB } from "./fittingDb";
import { LazyItemNameCatalog, LazyItemNameResolver, type ItemNameLoader } from "./itemNames";
import { StaticModuleSlotCatalog } from "./moduleSlots";
import { StaticNameI18nCatalog } from "./nameI18n";
import { StaticPresetFitTexts } from "./presets";
import { StaticShipProfileCatalog } from "./shipProfiles";
import type { ShipNameLanguage } from "./i18n";

export function registerGameDataModule<T extends GameDataCradle>(cradle: AwilixContainer<T>, onItemNamesLoaded: () => void = () => {}): void {
  const onLoaded = (_language: ShipNameLanguage) => onItemNamesLoaded();
  const catalog = new LazyItemNameCatalog(onLoaded);
  const resolver = new LazyItemNameResolver(onLoaded);
  const loader: ItemNameLoader = {
    ensureLoaded(language: ShipNameLanguage) {
      catalog.ensureLoaded(language);
      resolver.ensureLoaded(language);
    },
    isLoaded(language: ShipNameLanguage) {
      return catalog.isLoaded(language) && resolver.isLoaded(language);
    },
  };
  cradle.register({
    shipProfileCatalog: asFunction(() => new StaticShipProfileCatalog()).singleton(),
    nameI18nCatalog: asFunction(() => new StaticNameI18nCatalog()).singleton(),
    fittingDb: asValue(FITTING_DB),
    moduleSlotCatalog: asFunction(() => new StaticModuleSlotCatalog()).singleton(),
    itemNameCatalog: asValue(catalog),
    itemNameResolver: asValue(resolver),
    itemNameLoader: asValue(loader),
    presetFitTexts: asFunction(() => new StaticPresetFitTexts()).singleton(),
  });
}
