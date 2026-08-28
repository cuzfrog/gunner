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
    shipA: {
      resTrackPen: els.resTrackPenA,
      resRangePen: els.resRangePenA,
      resHit: els.resHitA,
      resTrackPenLabel: els.resTrackPenLabelA,
      resRangePenLabel: els.resRangePenLabelA,
      resHitLabel: els.resHitLabelA,
    },
    shipB: {
      resTrackPen: els.resTrackPenB,
      resRangePen: els.resRangePenB,
      resHit: els.resHitB,
      resTrackPenLabel: els.resTrackPenLabelB,
      resRangePenLabel: els.resRangePenLabelB,
      resHitLabel: els.resHitLabelB,
    },
  };
}
