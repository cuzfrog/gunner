import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { TargetingControllerImpl } from "./targetingController";
import type { TargetingEls } from "./targetingControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerTargetingModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    targetingController: asFunction(({ els, popupGroup, i18n, uiEvents }) => new TargetingControllerImpl({
      els: targetingEls(els), popupGroup, i18n, events: uiEvents,
    })).singleton(),
  });
}

function targetingEls(els: ControlsElements): TargetingEls {
  return {
    shipA: els.shipA.targeting,
    shipB: els.shipB.targeting,
  };
}
