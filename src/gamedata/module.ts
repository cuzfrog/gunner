import { asFunction, asValue, type AwilixContainer } from "awilix";
import type { GameDataCradle } from "./cradle";
import { FITTING_DB } from "./fittingDb";
import { LazyItemNameCatalog, LazyItemNameResolver, type ItemNameLoader } from "./itemNames";
import { StaticModuleSlotCatalog } from "./moduleSlots";
import { StaticNameI18nCatalog } from "./nameI18n";
import { StaticPresetFitTexts } from "./presets";
import { StaticShipProfileCatalog } from "./shipProfiles";
import type { ShipNameLanguage } from "./i18n";

export function registerGameDataModule<T extends GameDataCradle>(cradle: AwilixContainer<T>, onItemNamesLoaded: () => void = noop): void {
  const pendingLoads = new Map<ShipNameLanguage, number>();
  const trackLoad = (language: ShipNameLanguage): void => {
    const count = pendingLoads.get(language) ?? 0;
    pendingLoads.set(language, count + 1);
  };
  const gateLoaded = (language: ShipNameLanguage): void => {
    const count = pendingLoads.get(language);
    if (count === undefined) return;
    if (count <= 1) {
      pendingLoads.delete(language);
      onItemNamesLoaded();
    } else {
      pendingLoads.set(language, count - 1);
    }
  };
  const catalog = new LazyItemNameCatalog(gateLoaded);
  const resolver = new LazyItemNameResolver(gateLoaded);
  const loader: ItemNameLoader = {
    ensureLoaded(language: ShipNameLanguage) {
      if (catalog.isLoaded(language) && resolver.isLoaded(language)) return;
      if (!catalog.isLoaded(language)) trackLoad(language);
      if (!resolver.isLoaded(language)) trackLoad(language);
      catalog.ensureLoaded(language);
      resolver.ensureLoaded(language);
    },
    isLoaded(language: ShipNameLanguage) {
      return catalog.isLoaded(language) && resolver.isLoaded(language);
    },
    load(language: ShipNameLanguage) {
      if (catalog.isLoaded(language) && resolver.isLoaded(language)) return Promise.resolve();
      if (!catalog.isLoaded(language)) trackLoad(language);
      if (!resolver.isLoaded(language)) trackLoad(language);
      return Promise.all([catalog.load(language), resolver.load(language)]).then(() => {});
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
    skillBonuses: asValue(FITTING_DB.skillBonuses),
  });
}

function noop(): void {}
