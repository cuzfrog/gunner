import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { EwarControllerImpl } from "./ewarController";
import { EwarEffectDescriberImpl } from "./ewarEffectDescriber";
import type { EwarEls } from "./ewarControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerEwarModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    ewarEffectDescriber: asClass(EwarEffectDescriberImpl).singleton(),
    ewarController: asFunction(({ els, popupGroup, imageCatalog, fittingImport, i18n, ewarEffectDescriber, uiEvents }) => new EwarControllerImpl({
      els: ewarEls(els),
      popupGroup,
      imageCatalog,
      fittingImport,
      i18n,
      ewarEffectDescriber,
      events: uiEvents,
    })).singleton(),
  });
}

function ewarEls(els: ControlsElements): EwarEls {
  return {
    shipA: els.shipA.ewar,
    shipB: els.shipB.ewar,
  };
}
