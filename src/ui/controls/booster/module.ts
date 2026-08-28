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
    sections: {
      shipA: els.shipA.boosterSection,
      shipB: els.shipB.boosterSection,
    },
    summaries: {
      shipA: els.shipA.boosterSummary,
      shipB: els.shipB.boosterSummary,
    },
  };
}
