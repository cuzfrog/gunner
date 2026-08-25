import { asFunction, type AwilixContainer } from "awilix";
import type { GameDataCradle } from "./cradle";
import { StaticNameI18nCatalog } from "./nameI18n";
import { StaticShipProfileCatalog } from "./shipProfiles";

export function registerGameDataModule<T extends GameDataCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipProfileCatalog: asFunction(() => new StaticShipProfileCatalog()).singleton(),
    nameI18nCatalog: asFunction(() => new StaticNameI18nCatalog()).singleton(),
  });
}
