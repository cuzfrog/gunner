import { asFunction, type AwilixContainer } from "awilix";
import { collectBoosterEls } from "../elementCollectors";
import type { ControlsCradle } from "../cradle";
import { BoosterControllerImpl } from "./boosterController";

export function registerBoosterModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    boosterController: asFunction(({ els, popupGroup, imageCatalog, fittingImport, i18n }) => new BoosterControllerImpl({
      els: collectBoosterEls(els),
      popupGroup,
      imageCatalog,
      fittingImport,
      i18n,
    })).singleton(),
  });
}
