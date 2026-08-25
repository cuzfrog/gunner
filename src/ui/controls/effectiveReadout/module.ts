import { asFunction, type AwilixContainer } from "awilix";
import { SIG_RESOLUTIONS } from "../../../sim";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { TrackingInputImpl } from "../trackingInput";
import { EffectiveReadoutImpl } from "./effectiveReadout";
import type { EffectiveReadoutEls } from "./effectiveReadout";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerEffectiveReadoutModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    effectiveReadout: asFunction(({ els, i18n, shipATurretController }: ControlsCradle) => {
      const trackingCalculator = new TrackingInputImpl();
      return new EffectiveReadoutImpl({
        els: collectEffectiveReadoutEls(els),
        i18n,
        trackingInput: {
          get unit() { return shipATurretController.trackingUnit(); },
          displayFor(rad: number, sigResolution: number) {
            trackingCalculator.setUnit(shipATurretController.trackingUnit(), sigResolution);
            return trackingCalculator.displayFor(rad, sigResolution);
          },
        },
        sigResolution: () => SIG_RESOLUTIONS[shipATurretController.currentSigResClass()],
      });
    }).singleton(),
  });
}

function collectEffectiveReadoutEls(els: ControlsElements): EffectiveReadoutEls {
  return {
    shipASpeed: els.shipA.speed,
    shipBSpeed: els.shipB.speed,
    tracking: els.shipA.tracking,
    optimal: els.shipA.optimal,
    falloff: els.shipA.falloff,
    shipASpeedReadout: els.shipA.effectiveSpeed,
    shipBSpeedReadout: els.shipB.effectiveSpeed,
    trackingReadout: els.shipA.effectiveTracking,
    optimalReadout: els.shipA.effectiveOptimal,
    falloffReadout: els.shipA.effectiveFalloff,
  };
}
