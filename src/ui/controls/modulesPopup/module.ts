import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { ModulesPopupImpl } from "./modulesPopupController";
import type { ModulesPopupEls } from "./modulesPopupControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerModulesPopupModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    modulesPopup: asFunction(({ els, popupGroup, i18n, uiEvents }) => new ModulesPopupImpl({
      els: collectModulesPopupEls(els),
      popupGroup,
      i18n,
      uiEvents,
    })).singleton(),
  });
}

function collectModulesPopupEls(els: ControlsElements): ModulesPopupEls {
  return {
    fields: {
      shipA: { field: els.shipA.ewar.field, trigger: els.shipA.ewar.trigger, popup: els.shipA.ewar.popup },
      shipB: { field: els.shipB.ewar.field, trigger: els.shipB.ewar.trigger, popup: els.shipB.ewar.popup },
    },
  };
}
