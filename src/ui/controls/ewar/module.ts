import { asFunction, type AwilixContainer } from "awilix";
import { collectEwarEls } from "../elementCollectors";
import type { ControlsCradle } from "../cradle";
import { EwarControllerImpl } from "./ewarController";

export function registerEwarModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    ewarController: asFunction(({ els, popupGroup, imageCatalog, i18n }) => {
      return new EwarControllerImpl({ els: collectEwarEls(els), popupGroup, imageCatalog, i18n });
    }).singleton(),
  });
}
