import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { RangeOverlayControllerImpl } from "./rangeOverlayController";

export function registerRangeOverlayModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    rangeOverlayController: asFunction(({ els, i18n, ewarEffectDescriber }) => new RangeOverlayControllerImpl({
      els: { legend: els.rangeOverlayLegend },
      i18n,
      ewarEffectDescriber,
      now: () => Date.now(),
    })).singleton(),
  });
}
