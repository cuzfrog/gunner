import { asFunction, type AwilixContainer } from "awilix";
import { SIG_RESOLUTIONS } from "../../../sim";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { EffectiveReadoutImpl } from "./effectiveReadout";
import type { EffectiveReadoutEls } from "./effectiveReadout";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerEffectiveReadoutModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    effectiveReadout: asFunction(({ els, i18n, trackingInput, turretController }: ControlsCradle) =>
      new EffectiveReadoutImpl({
        els: collectEffectiveReadoutEls(els),
        i18n,
        trackingInput,
        sigResolution: () => SIG_RESOLUTIONS[turretController.currentSigResClass()],
      })
    ).singleton(),
  });
}

function collectEffectiveReadoutEls(els: ControlsElements): EffectiveReadoutEls {
  return {
    shipASpeed: els.shipASpeed,
    shipBSpeed: els.shipBSpeed,
    tracking: els.tracking,
    optimal: els.optimal,
    falloff: els.falloff,
    shipASpeedReadout: els.shipASpeedReadout,
    shipBSpeedReadout: els.shipBSpeedReadout,
    trackingReadout: els.trackingReadout,
    optimalReadout: els.optimalReadout,
    falloffReadout: els.falloffReadout,
  };
}
