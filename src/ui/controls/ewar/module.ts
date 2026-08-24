import { asClass, asFunction, type AwilixContainer } from "awilix";
import { collectEwarEls } from "../elementCollectors";
import type { ControlsCradle } from "../cradle";
import { EwarControllerImpl } from "./ewarController";
import { EwarEffectDescriberImpl } from "./ewarEffectDescriber";

export function registerEwarModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    ewarEffectDescriber: asClass(EwarEffectDescriberImpl).singleton(),
    ewarController: asFunction(({ els, popupGroup, imageCatalog, fittingImport, i18n, ewarEffectDescriber }) => new EwarControllerImpl({
      els: collectEwarEls(els),
      popupGroup,
      imageCatalog,
      fittingImport,
      i18n,
      ewarEffectDescriber,
    })).singleton(),
  });
}
