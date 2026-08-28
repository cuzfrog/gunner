import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { ImportControllerImpl } from "./importController";
import type { ImportEls } from "./importControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerImportModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    importController: asFunction(({ els, clipboard, fittingImport, savedFittings, popupGroup, shipASide, shipBSide, turretControllers, launcherControllers, profileController, profileTextCodec, uiEvents }: ControlsCradle) => new ImportControllerImpl({
      clipboard,
      fittingImport,
      savedFittings,
      popupGroup,
      els: collectImportEls(els),
      shipASide,
      shipBSide,
      turrets: turretControllers,
      launchers: launcherControllers,
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
    importSideShipA: els.importSideShipA,
    importSideShipB: els.importSideShipB,
  };
}
