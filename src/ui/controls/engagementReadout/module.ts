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
      resAppliedDpsApplication: els.resAppliedDpsApplicationA,
      resInflictedDps: els.resInflictedDpsA,
      resTimeToImpact: els.resTimeToImpactA,
      resSigFactor: els.resSigFactorA,
      resVelocityFactor: els.resVelocityFactorA,
      resNominalDpsLabel: els.resNominalDpsLabelA,
      resAppliedDpsLabel: els.resAppliedDpsLabelA,
      resInflictedDpsLabel: els.resInflictedDpsLabelA,
      resTimeToImpactLabel: els.resTimeToImpactLabelA,
      resSigFactorLabel: els.resSigFactorLabelA,
      resVelocityFactorLabel: els.resVelocityFactorLabelA,
      resSide: els.resSideA,
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
      resAppliedDpsApplication: els.resAppliedDpsApplicationB,
      resInflictedDps: els.resInflictedDpsB,
      resTimeToImpact: els.resTimeToImpactB,
      resSigFactor: els.resSigFactorB,
      resVelocityFactor: els.resVelocityFactorB,
      resNominalDpsLabel: els.resNominalDpsLabelB,
      resAppliedDpsLabel: els.resAppliedDpsLabelB,
      resInflictedDpsLabel: els.resInflictedDpsLabelB,
      resTimeToImpactLabel: els.resTimeToImpactLabelB,
      resSigFactorLabel: els.resSigFactorLabelB,
      resVelocityFactorLabel: els.resVelocityFactorLabelB,
      resSide: els.resSideB,
    },
  };
}
