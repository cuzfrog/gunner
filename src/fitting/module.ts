import { asClass, type AwilixContainer } from "awilix";
import { ChargeCatalogImpl } from "./chargeCatalog";
import { DroneCatalogImpl } from "./droneCatalog";
import { DroneLoadoutResolverImpl } from "./droneLoadoutResolver";
import { DroneLoadoutValidatorImpl } from "./droneLoadoutValidator";
import { DroneSkillModelImpl } from "./droneStats";
import { FittingCalculatorImpl } from "./fittingCalculator";
import { FittingImportImpl } from "./fittingImport";
import { GunFamiliesImpl } from "./gunFamilies";
import { LauncherClassesImpl } from "./launcherClasses";
import { MissileCatalogImpl } from "./missileCatalog";
import { MissileSkillModelImpl } from "./missileStats";
import { PresetFittingsImpl } from "./presetFittings";
import type { FittingCradle } from "./cradle";

export function registerFittingModule<T extends FittingCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    chargeCatalog: asClass(ChargeCatalogImpl).singleton(),
    droneCatalog: asClass(DroneCatalogImpl).singleton(),
    droneLoadoutResolver: asClass(DroneLoadoutResolverImpl).singleton(),
    droneLoadoutValidator: asClass(DroneLoadoutValidatorImpl).singleton(),
    droneSkillModel: asClass(DroneSkillModelImpl).singleton(),
    fittingCalculator: asClass(FittingCalculatorImpl).singleton(),
    fittingImport: asClass(FittingImportImpl).singleton(),
    gunFamilies: asClass(GunFamiliesImpl).singleton(),
    launcherClasses: asClass(LauncherClassesImpl).singleton(),
    missileCatalog: asClass(MissileCatalogImpl).singleton(),
    missileSkillModel: asClass(MissileSkillModelImpl).singleton(),
    presetFittings: asClass(PresetFittingsImpl).singleton(),
  });
}
