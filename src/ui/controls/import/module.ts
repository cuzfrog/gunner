import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { collectImportEls } from "../elementCollectors";
import { ImportControllerImpl } from "./importController";

export function registerImportModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    importController: asFunction(({ els, clipboard, fittingImport, savedFittings, popupGroup, attackerSide, targetSide, turretController, preferencesController, profileController, profileTextCodec }: ControlsCradle) => new ImportControllerImpl({
      clipboard,
      fittingImport,
      savedFittings,
      popupGroup,
      els: collectImportEls(els),
      attackerSide,
      targetSide,
      turret: turretController,
      preferences: preferencesController,
      profileController,
      profileTextCodec,
    })).singleton(),
  });
}
