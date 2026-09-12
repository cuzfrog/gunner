import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { CapacitorControllerImpl } from "./capacitorController";
import type { CapacitorEls } from "./capacitorControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerCapacitorModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    capacitorController: asFunction(({ els, popupGroup, i18n, uiEvents, itemNameCatalog, capacitorStatsSource }) => new CapacitorControllerImpl({
      els: capacitorEls(els),
      popupGroup,
      i18n,
      events: uiEvents,
      itemNameCatalog,
      statsSource: capacitorStatsSource,
    })).singleton(),
  });
}

function capacitorEls(els: ControlsElements): CapacitorEls {
  return {
    shipA: { field: els.shipA.capacitor.field, trigger: els.shipA.capacitor.trigger, popup: els.shipA.capacitor.popup, section: els.shipA.capacitor.section, summary: els.shipA.capacitor.summary },
    shipB: { field: els.shipB.capacitor.field, trigger: els.shipB.capacitor.trigger, popup: els.shipB.capacitor.popup, section: els.shipB.capacitor.section, summary: els.shipB.capacitor.summary },
  };
}
