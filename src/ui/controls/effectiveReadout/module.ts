import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { TrackingInputImpl } from "../trackingInput";
import { EffectiveReadoutImpl } from "./effectiveReadout";
import type { EffectiveReadoutEls } from "./effectiveReadout";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerEffectiveReadoutModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    effectiveReadout: asFunction(({ els, i18n, fittingImport, shipATurretController }: ControlsCradle) => {
      const trackingCalculator = new TrackingInputImpl();
      return new EffectiveReadoutImpl({
        els: collectEffectiveReadoutEls(els),
        i18n,
        fittingImport,
        trackingInput: {
          get unit() { return shipATurretController.trackingUnit(); },
          displayFor(rad: number, sigResolution: number) {
            trackingCalculator.setUnit(shipATurretController.trackingUnit(), sigResolution);
            return trackingCalculator.displayFor(rad, sigResolution);
          },
        },
      });
    }).singleton(),
  });
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
