import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { RangeOverlayControllerImpl } from "./rangeOverlayController";
import type { RangeOverlayEls } from "./rangeOverlayControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerRangeOverlayModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    rangeOverlayController: asFunction(({ els, i18n, ewarEffectDescriber, ewarController, uiEvents }) => new RangeOverlayControllerImpl({
      els: collectRangeOverlayEls(els),
      i18n,
      ewarEffectDescriber,
      ewarController,
      events: uiEvents,
      now: () => Date.now(),
    })).singleton(),
  });
}

function collectRangeOverlayEls(els: ControlsElements): RangeOverlayEls {
  return { legend: els.rangeOverlayLegend };
}
