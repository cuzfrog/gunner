import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { ImportControllerImpl } from "./importController";
import type { ImportEls } from "./importControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerImportModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    importController: asFunction(({ els, clipboard, fittingImport, savedFittings, popupGroup, attackerSide, targetSide, turretController, preferencesController, profileController, profileTextCodec, uiEvents }: ControlsCradle) => new ImportControllerImpl({
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
      events: uiEvents,
    })).singleton(),
  });
}

function collectImportEls(els: ControlsElements): ImportEls {
  return {
    importProfile: els.importProfile,
    importSidePopup: els.importSidePopup,
    importSideAttacker: els.importSideAttacker,
    importSideTarget: els.importSideTarget,
  };
}
