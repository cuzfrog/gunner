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
      resSigFactor: els.resSigFactorA,
      resVelocityFactor: els.resVelocityFactorA,
      resNominalDpsLabel: els.resNominalDpsLabelA,
      resAppliedDpsLabel: els.resAppliedDpsLabelA,
      resApplicationLabel: els.resApplicationLabelA,
      resTimeToImpactLabel: els.resTimeToImpactLabelA,
      resSigFactorLabel: els.resSigFactorLabelA,
      resVelocityFactorLabel: els.resVelocityFactorLabelA,
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
      resSigFactor: els.resSigFactorB,
      resVelocityFactor: els.resVelocityFactorB,
      resNominalDpsLabel: els.resNominalDpsLabelB,
      resAppliedDpsLabel: els.resAppliedDpsLabelB,
      resApplicationLabel: els.resApplicationLabelB,
      resTimeToImpactLabel: els.resTimeToImpactLabelB,
      resSigFactorLabel: els.resSigFactorLabelB,
      resVelocityFactorLabel: els.resVelocityFactorLabelB,
      resTurretCards: els.resTurretCardsB,
      resMissileCards: els.resMissileCardsB,
    },
  };
}
