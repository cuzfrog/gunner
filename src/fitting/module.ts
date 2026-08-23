import { asClass, asValue, type AwilixContainer } from "awilix";
import { ChargeCatalogImpl } from "./chargeCatalog";
import { FittingImportImpl, type FittingDb } from "./fittingImport";
import { CHARGES, FITTING_MODULES, HULL_BONUSES, SCRIPTS, TURRETS } from "./fittingDb";
import { GunFamiliesImpl } from "./gunFamilies";
import { PresetFittingsImpl } from "./presetFittings";
import type { FittingCradle } from "./cradle";

export function registerFittingModule<T extends FittingCradle>(cradle: AwilixContainer<T>): void {
  const fittingDb: FittingDb = { modules: FITTING_MODULES, turrets: TURRETS, charges: CHARGES, scripts: SCRIPTS, hullBonuses: HULL_BONUSES };
  cradle.register({
    fittingDb: asValue(fittingDb),
    chargeCatalog: asClass(ChargeCatalogImpl).singleton(),
    fittingImport: asClass(FittingImportImpl).singleton(),
    gunFamilies: asClass(GunFamiliesImpl).singleton(),
    presetFittings: asClass(PresetFittingsImpl).singleton(),
  });
}
