import { asClass, asFunction, asValue, type AwilixContainer } from "awilix";
import { ChargeCatalogImpl } from "./chargeCatalog";
import { FittingImportImpl, type FittingDb } from "./fittingImport";
import {
  CHARGES,
  DISRUPTION_SCRIPTS,
  DRONES,
  FITTING_MODULES,
  HULL_BONUSES,
  SCRIPTS,
  STASIS_GRAPPLERS,
  STASIS_WEBS,
  TRACKING_COMPUTERS,
  TRACKING_DISRUPTORS,
  TURRETS,
  WARP_SCRAMBLERS,
} from "./fittingDb";
import { GunFamiliesImpl } from "./gunFamilies";
import { ItemNamesImpl } from "./itemNames";
import { PresetFittingsImpl } from "./presetFittings";
import type { FittingCradle } from "./cradle";

export function registerFittingModule<T extends FittingCradle>(cradle: AwilixContainer<T>): void {
  const fittingDb: FittingDb = {
    modules: FITTING_MODULES,
    turrets: TURRETS,
    charges: CHARGES,
    scripts: SCRIPTS,
    stasisWebs: STASIS_WEBS,
    stasisGrapplers: STASIS_GRAPPLERS,
    trackingComputers: TRACKING_COMPUTERS,
    trackingDisruptors: TRACKING_DISRUPTORS,
    warpScramblers: WARP_SCRAMBLERS,
    disruptionScripts: DISRUPTION_SCRIPTS,
    hullBonuses: HULL_BONUSES,
    drones: DRONES,
  };
  cradle.register({
    fittingDb: asValue(fittingDb),
    chargeCatalog: asClass(ChargeCatalogImpl).singleton(),
    fittingImport: asClass(FittingImportImpl).singleton(),
    gunFamilies: asClass(GunFamiliesImpl).singleton(),
    itemNames: asFunction(() => new ItemNamesImpl()).singleton(),
    presetFittings: asClass(PresetFittingsImpl).singleton(),
  });
}
