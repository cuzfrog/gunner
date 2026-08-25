import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { EngagementReadoutImpl } from "./engagementReadout";
import type { ReadoutEls } from "./engagementReadout";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerEngagementReadoutModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    engagementReadout: asFunction(({ els }: ControlsCradle) =>
      new EngagementReadoutImpl(collectReadoutEls(els))
    ).singleton(),
  });
}

function collectReadoutEls(els: ControlsElements): ReadoutEls {
  return {
    resDistance: els.resDistance,
    resTransversal: els.resTransversal,
    resAngular: els.resAngular,
    resRadial: els.resRadial,
    resTrackPen: els.resTrackPen,
    resRangePen: els.resRangePen,
    resHit: els.resHit,
  };
}
