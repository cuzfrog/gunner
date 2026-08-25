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
      els: collectEwarEls(els),
      popupGroup,
      imageCatalog,
      fittingImport,
      i18n,
      ewarEffectDescriber,
      events: uiEvents,
    })).singleton(),
  });
}

function collectEwarEls(els: ControlsElements): EwarEls {
  return {
    attackerEwarField: els.attackerEwarField,
    attackerEwarTrigger: els.attackerEwarTrigger,
    attackerEwarPopup: els.attackerEwarPopup,
    attackerEwarSection: els.attackerEwarSection,
    attackerEwarSummary: els.attackerEwarSummary,
    targetEwarField: els.targetEwarField,
    targetEwarTrigger: els.targetEwarTrigger,
    targetEwarPopup: els.targetEwarPopup,
    targetEwarSection: els.targetEwarSection,
    targetEwarSummary: els.targetEwarSummary,
  };
}
