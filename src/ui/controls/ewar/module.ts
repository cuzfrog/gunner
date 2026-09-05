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
    ewarController: asFunction(({ els, popupGroup, imageCatalog, fittingImport, i18n, ewarEffectDescriber, uiEvents, modulesPopup }) => new EwarControllerImpl({
      els: ewarEls(els),
      popupGroup,
      imageCatalog,
      fittingImport,
      i18n,
      ewarEffectDescriber,
      events: uiEvents,
      modulesPopup,
    })).singleton(),
  });
}

function ewarEls(els: ControlsElements): EwarEls {
  return {
    shipA: { field: els.shipA.ewar.field, section: els.shipA.ewar.section, summary: els.shipA.ewar.summary },
    shipB: { field: els.shipB.ewar.field, section: els.shipB.ewar.section, summary: els.shipB.ewar.summary },
  };
}
