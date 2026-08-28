import { asClass, type AwilixContainer } from "awilix";
import { ChargeCatalogImpl } from "./chargeCatalog";
import { FittingImportImpl } from "./fittingImport";
import { GunFamiliesImpl } from "./gunFamilies";
import { MissileCatalogImpl } from "./missileCatalog";
import { MissileSkillModelImpl } from "./missileStats";
import { PresetFittingsImpl } from "./presetFittings";
import { TurretCatalogImpl } from "./turretCatalog";
import type { FittingCradle } from "./cradle";

export function registerFittingModule<T extends FittingCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    chargeCatalog: asClass(ChargeCatalogImpl).singleton(),
    fittingImport: asClass(FittingImportImpl).singleton(),
    gunFamilies: asClass(GunFamiliesImpl).singleton(),
    missileCatalog: asClass(MissileCatalogImpl).singleton(),
    missileSkillModel: asClass(MissileSkillModelImpl).singleton(),
    turretCatalog: asClass(TurretCatalogImpl).singleton(),
    presetFittings: asClass(PresetFittingsImpl).singleton(),
  });
}
