import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { HullDatalistImpl } from "./hullDatalist";
import { SessionCodecImpl } from "./sessionCodec";
import { SimConfigSourceImpl } from "./simConfigSource";

type ControlsElements = ReturnType<typeof createControlsEls>;
type SessionCodecEls = ConstructorParameters<typeof SessionCodecImpl>[0]["els"];

export function registerSessionModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    hullDatalist: asFunction(({ els, presetFittings, uiEvents }) =>
      new HullDatalistImpl(els.hullOptions, presetFittings, uiEvents)
    ).singleton(),
    sessionCodec: asFunction((proxy) => new SessionCodecImpl({
      els: collectSessionCodecEls(proxy.els),
      shipASide: proxy.shipASide,
      shipBSide: proxy.shipBSide,
      turret: proxy.turretController,
      turretOverrides: proxy.turretOverrides,
      preferences: proxy.preferencesController,
      profileController: proxy.profileController,
      i18n: proxy.i18n,
      chargeCatalog: proxy.chargeCatalog,
      sigResChoice: proxy.sigResChoice,
      hintRotator: proxy.hintRotator,
      settingsStore: proxy.settingsStore,
      events: proxy.uiEvents,
      trackingInput: proxy.trackingInput,
      ewarController: proxy.ewarController,
      boosterController: proxy.boosterController,
      fittingImport: proxy.fittingImport,
    })).singleton(),
    simConfigSource: asFunction((proxy) => new SimConfigSourceImpl({
      shipASide: proxy.shipASide,
      shipBSide: proxy.shipBSide,
      preferencesController: proxy.preferencesController,
      ewarController: proxy.ewarController,
      boosterController: proxy.boosterController,
      distanceSource: proxy.sessionCodec,
    })).singleton(),
  });
}

function collectSessionCodecEls(all: ControlsElements): SessionCodecEls {
  return {
    sigRes: all.sigRes,
    optimal: all.optimal,
    falloff: all.falloff,
    shipASpeed: all.shipASpeed,
    shipAMass: all.shipAMass,
    shipAInertia: all.shipAInertia,
    shipAMode: all.shipAMode,
    shipARange: all.shipARange,
    maneuverAggressivity: all.maneuverAggressivity,
    initialDistance: all.initialDistance,
    shipBSpeed: all.shipBSpeed,
    shipBMass: all.shipBMass,
    shipBInertia: all.shipBInertia,
    shipBMode: all.shipBMode,
    shipBRange: all.shipBRange,
    shipBSig: all.shipBSig,
  };
}
