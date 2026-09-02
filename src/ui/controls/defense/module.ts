import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { DefenseControllerImpl } from "./defenseController";
import type { DefenseEls } from "./defenseControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerDefenseModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    defenseController: asFunction(({ els, popupGroup, i18n, uiEvents }) => new DefenseControllerImpl({
      els: collectDefenseEls(els), popupGroup, i18n, events: uiEvents,
    })).singleton(),
  });
}

function collectDefenseEls(els: ControlsElements): DefenseEls {
  return {
    shipADefenseField: els.shipA.defenseField,
    shipADefenseTrigger: els.shipA.defenseTrigger,
    shipADefensePopup: els.shipA.defensePopup,
    shipADefenseSection: els.shipA.defenseSection,
    shipADefenseSummary: els.shipA.defenseSummary,
    shipAEffectiveSig: els.shipA.effectiveSig,
    shipBDefenseField: els.shipB.defenseField,
    shipBDefenseTrigger: els.shipB.defenseTrigger,
    shipBDefensePopup: els.shipB.defensePopup,
    shipBDefenseSection: els.shipB.defenseSection,
    shipBDefenseSummary: els.shipB.defenseSummary,
    shipBEffectiveSig: els.shipB.effectiveSig,
  };
}
