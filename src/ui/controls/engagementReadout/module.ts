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
      resNominalDps: els.resNominalDpsA,
      resAppliedDps: els.resAppliedDpsA,
      resApplication: els.resApplicationA,
      resTimeToImpact: els.resTimeToImpactA,
      resNominalDpsLabel: els.resNominalDpsLabelA,
      resAppliedDpsLabel: els.resAppliedDpsLabelA,
      resApplicationLabel: els.resApplicationLabelA,
      resTimeToImpactLabel: els.resTimeToImpactLabelA,
      resTurretCards: els.resTurretCardsA,
      resMissileCards: els.resMissileCardsA,
    },
    shipB: {
      resTrackPen: els.resTrackPenB,
      resRangePen: els.resRangePenB,
      resHit: els.resHitB,
      resTrackPenLabel: els.resTrackPenLabelB,
      resRangePenLabel: els.resRangePenLabelB,
      resHitLabel: els.resHitLabelB,
      resNominalDps: els.resNominalDpsB,
      resAppliedDps: els.resAppliedDpsB,
      resApplication: els.resApplicationB,
      resTimeToImpact: els.resTimeToImpactB,
      resNominalDpsLabel: els.resNominalDpsLabelB,
      resAppliedDpsLabel: els.resAppliedDpsLabelB,
      resApplicationLabel: els.resApplicationLabelB,
      resTimeToImpactLabel: els.resTimeToImpactLabelB,
      resTurretCards: els.resTurretCardsB,
      resMissileCards: els.resMissileCardsB,
    },
  };
}
