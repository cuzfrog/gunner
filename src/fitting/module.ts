import { asClass, asValue, type AwilixContainer } from "awilix";
import { FittingImportImpl, type FittingDb } from "./fittingImport";
import { CHARGES, FITTING_MODULES, TURRETS } from "./fittingDb";

export function registerFittingModule(cradle: AwilixContainer<object>): void {
  const fittingDb: FittingDb = { modules: FITTING_MODULES, turrets: TURRETS, charges: CHARGES };
  cradle.register({
    fittingDb: asValue(fittingDb),
    fittingImport: asClass(FittingImportImpl).singleton(),
  });
}
