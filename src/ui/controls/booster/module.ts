import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { BoosterControllerImpl } from "./boosterController";
import type { BoosterEls } from "./boosterControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerBoosterModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    boosterController: asFunction(({ els, popupGroup, imageCatalog, fittingImport, i18n, uiEvents }) => new BoosterControllerImpl({
      els: collectBoosterEls(els),
      popupGroup,
      imageCatalog,
      fittingImport,
      i18n,
      events: uiEvents,
    })).singleton(),
  });
}

function collectBoosterEls(els: ControlsElements): BoosterEls {
  return {
    attackerBoosterField: els.attackerBoosterField,
    attackerBoosterTrigger: els.attackerBoosterTrigger,
    attackerBoosterPopup: els.attackerBoosterPopup,
    attackerBoosterSummary: els.attackerBoosterSummary,
    targetBoosterField: els.targetBoosterField,
    targetBoosterTrigger: els.targetBoosterTrigger,
    targetBoosterPopup: els.targetBoosterPopup,
    targetBoosterSummary: els.targetBoosterSummary,
  };
}
