import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { TargetingControllerImpl } from "./targetingController";
import type { TargetingEls } from "./targetingControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerTargetingModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    targetingController: asFunction(({ els, popupGroup, i18n, uiEvents }) => new TargetingControllerImpl({
      els: collectTargetingEls(els), popupGroup, i18n, events: uiEvents,
    })).singleton(),
  });
}

function collectTargetingEls(els: ControlsElements): TargetingEls {
  return {
    shipATargetingField: els.shipA.targetingField,
    shipATargetingTrigger: els.shipA.targetingTrigger,
    shipATargetingPopup: els.shipA.targetingPopup,
    shipATargetingSection: els.shipA.targetingSection,
    shipATargetingSummary: els.shipA.targetingSummary,
    shipBTargetingField: els.shipB.targetingField,
    shipBTargetingTrigger: els.shipB.targetingTrigger,
    shipBTargetingPopup: els.shipB.targetingPopup,
    shipBTargetingSection: els.shipB.targetingSection,
    shipBTargetingSummary: els.shipB.targetingSummary,
  };
}
