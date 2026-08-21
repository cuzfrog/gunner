import { asClass, asValue, type AwilixContainer } from "awilix";
import { FittingImportImpl, type FittingDb } from "./fittingImport";
import { CHARGES, FITTING_MODULES, HULL_BONUSES, SCRIPTS, TURRETS } from "./fittingDb";
import { PresetFittingsImpl } from "./presetFittings";

export function registerFittingModule(cradle: AwilixContainer<object>): void {
  const fittingDb: FittingDb = { modules: FITTING_MODULES, turrets: TURRETS, charges: CHARGES, scripts: SCRIPTS, hullBonuses: HULL_BONUSES };
  cradle.register({
    fittingDb: asValue(fittingDb),
    fittingImport: asClass(FittingImportImpl).singleton(),
    presetFittings: asClass(PresetFittingsImpl).singleton(),
  });
}
