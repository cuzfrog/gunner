import { asFunction, asValue, type AwilixContainer } from "awilix";
import type { GameDataCradle } from "./cradle";
import { FITTING_DB } from "./fittingDb";
import { StaticItemNameCatalog, StaticItemNameResolver } from "./itemNames";
import { StaticModuleSlotCatalog } from "./moduleSlots";
import { StaticNameI18nCatalog } from "./nameI18n";
import { StaticPresetFitTexts } from "./presets";
import { StaticShipProfileCatalog } from "./shipProfiles";

export function registerGameDataModule<T extends GameDataCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipProfileCatalog: asFunction(() => new StaticShipProfileCatalog()).singleton(),
    nameI18nCatalog: asFunction(() => new StaticNameI18nCatalog()).singleton(),
    fittingDb: asValue(FITTING_DB),
    moduleSlotCatalog: asFunction(() => new StaticModuleSlotCatalog()).singleton(),
    itemNameCatalog: asFunction(() => new StaticItemNameCatalog()).singleton(),
    itemNameResolver: asFunction(() => new StaticItemNameResolver()).singleton(),
    presetFitTexts: asFunction(() => new StaticPresetFitTexts()).singleton(),
  });
}
