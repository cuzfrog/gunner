import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { SensorBoosterControllerImpl } from "./sensorBoosterController";
import { SensorBoosterEffectDescriberImpl } from "./sensorBoosterEffectDescriber";
import type { SensorBoosterEls } from "./sensorBoosterControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerSensorBoosterModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    sensorBoosterEffectDescriber: asClass(SensorBoosterEffectDescriberImpl).singleton(),
    sensorBoosterController: asFunction(({ els, popupGroup, modulesPopup, imageCatalog, fittingImport, i18n, sensorBoosterEffectDescriber, uiEvents }) => new SensorBoosterControllerImpl({
      els: collectSensorBoosterEls(els),
      popupGroup,
      modulesPopup,
      imageCatalog,
      fittingImport,
      i18n,
      events: uiEvents,
      describer: sensorBoosterEffectDescriber,
    })).singleton(),
  });
}

function collectSensorBoosterEls(els: ControlsElements): SensorBoosterEls {
  return {
    sections: {
      shipA: els.shipA.sensorBoosterSection,
      shipB: els.shipB.sensorBoosterSection,
    },
    summaries: {
      shipA: els.shipA.sensorBoosterSummary,
      shipB: els.shipB.sensorBoosterSummary,
    },
    modulesFields: {
      shipA: els.shipA.ewar.field,
      shipB: els.shipB.ewar.field,
    },
  };
}
