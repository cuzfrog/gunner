import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { DefenseControllerImpl } from "./defenseController";
import type { DefenseEls } from "./defenseControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerDefenseModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    defenseController: asFunction(({ els, popupGroup, i18n, uiEvents, defenseAssessor }) => new DefenseControllerImpl({
      els: defenseEls(els), popupGroup, i18n, events: uiEvents, defenseAssessor,
    })).singleton(),
  });
}

function defenseEls(els: ControlsElements): DefenseEls {
  return {
    shipA: els.shipA.defense,
    shipB: els.shipB.defense,
  };
}
