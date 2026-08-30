import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { MissileBoosterControllerImpl } from "./missileBoosterController";
import { MissileBoosterEffectDescriberImpl } from "./missileBoosterEffectDescriber";
import type { MissileBoosterEls } from "./missileBoosterControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerMissileBoosterModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    missileBoosterEffectDescriber: asClass(MissileBoosterEffectDescriberImpl).singleton(),
    missileBoosterController: asFunction(({ els, popupGroup, imageCatalog, fittingImport, i18n, missileBoosterEffectDescriber, uiEvents }) => new MissileBoosterControllerImpl({
      els: collectMissileBoosterEls(els),
      popupGroup,
      imageCatalog,
      fittingImport,
      i18n,
      events: uiEvents,
      describer: missileBoosterEffectDescriber,
    })).singleton(),
  });
}

function collectMissileBoosterEls(els: ControlsElements): MissileBoosterEls {
  return {
    sections: {
      shipA: els.shipA.missileBoosterSection,
      shipB: els.shipB.missileBoosterSection,
    },
    summaries: {
      shipA: els.shipA.missileBoosterSummary,
      shipB: els.shipB.missileBoosterSummary,
    },
  };
}
