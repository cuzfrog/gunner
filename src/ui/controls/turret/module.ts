import { asClass, asFunction, type AwilixContainer } from "awilix";
import { collectTurretEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { TurretControllerImpl } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import { TurretOverridesStore } from "./turretOverrides";

export function registerTurretModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    turretOverrides: asClass(TurretOverridesStore).singleton(),
    turretController: asFunction(({ els, chargeCatalog, gunFamilies, imageCatalog, trackingInput, i18n, fittingImport, turretOverrides, uiEvents }) => {
      const resolver = new TurretStateResolver({ chargeCatalog, fittingImport });
      return new TurretControllerImpl({
        els: collectTurretEls(els),
        chargeCatalog,
        gunFamilies,
        imageCatalog,
        trackingInput,
        i18n,
        fittingImport,
        resolver,
        turretOverrides,
        events: uiEvents,
      });
    }).singleton(),
  });
}
