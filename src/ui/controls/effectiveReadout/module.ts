import { asFunction, type AwilixContainer } from "awilix";
import type { TrackingUnit } from "../../../appstate";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { TrackingInputImpl } from "../trackingInput";
import { EffectiveReadoutImpl } from "./effectiveReadout";
import type { EffectiveReadoutEls } from "./effectiveReadout";

type ControlsElements = ReturnType<typeof createControlsEls>;
type TrackingUnitProvider = { trackingUnit(): TrackingUnit };

export function registerEffectiveReadoutModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    effectiveReadout: asFunction(({ els, i18n, fittingImport, shipATurretController, shipBTurretController }: ControlsCradle) => {
      return new EffectiveReadoutImpl({
        els: collectEffectiveReadoutEls(els),
        i18n,
        fittingImport,
        trackingDisplays: {
          shipA: createTrackingDisplay(shipATurretController),
          shipB: createTrackingDisplay(shipBTurretController),
        },
      });
    }).singleton(),
  });
}

function createTrackingDisplay(controller: TrackingUnitProvider): { readonly unit: TrackingUnit; displayFor(rad: number, sigResolution: number): number } {
  const calculator = new TrackingInputImpl();
  return {
    get unit() { return controller.trackingUnit(); },
    displayFor(rad: number, sigResolution: number) {
      calculator.setUnit(controller.trackingUnit(), sigResolution);
      return calculator.displayFor(rad, sigResolution);
    },
  };
}

function collectEffectiveReadoutEls(els: ControlsElements): EffectiveReadoutEls {
  return {
    shipA: {
      speed: els.shipA.speed,
      tracking: els.shipA.tracking,
      optimal: els.shipA.optimal,
      falloff: els.shipA.falloff,
      speedReadout: els.shipA.effectiveSpeed,
      trackingReadout: els.shipA.effectiveTracking,
      optimalReadout: els.shipA.effectiveOptimal,
      falloffReadout: els.shipA.effectiveFalloff,
    },
    shipB: {
      speed: els.shipB.speed,
      tracking: els.shipB.tracking,
      optimal: els.shipB.optimal,
      falloff: els.shipB.falloff,
      speedReadout: els.shipB.effectiveSpeed,
      trackingReadout: els.shipB.effectiveTracking,
      optimalReadout: els.shipB.effectiveOptimal,
      falloffReadout: els.shipB.effectiveFalloff,
    },
  };
}
