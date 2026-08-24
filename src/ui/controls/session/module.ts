import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { HullDatalistImpl } from "./hullDatalist";
import { SessionCodecImpl } from "./sessionCodec";
import { SimConfigSourceImpl } from "./simConfigSource";

export function registerSessionModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    hullDatalist: asFunction(({ els, presetFittings, uiEvents }) => new HullDatalistImpl(els, presetFittings, uiEvents)).singleton(),
    sessionCodec: asFunction((proxy) => new SessionCodecImpl({
      els: proxy.els,
      attackerSide: proxy.attackerSide,
      targetSide: proxy.targetSide,
      turret: proxy.turretController,
      turretOverrides: proxy.turretOverrides,
      preferences: proxy.preferencesController,
      profileController: proxy.profileController,
      i18n: proxy.i18n,
      chargeCatalog: proxy.chargeCatalog,
      sigResChoice: proxy.sigResChoice,
      hintRotator: proxy.hintRotator,
      settingsStore: proxy.settingsStore,
      trackingInput: proxy.trackingInput,
      ewarController: proxy.ewarController,
      boosterController: proxy.boosterController,
      fittingImport: proxy.fittingImport,
    })).singleton(),
    simConfigSource: asFunction((proxy) => new SimConfigSourceImpl({
      attackerSide: proxy.attackerSide,
      targetSide: proxy.targetSide,
      preferencesController: proxy.preferencesController,
      ewarController: proxy.ewarController,
      boosterController: proxy.boosterController,
      distanceSource: proxy.sessionCodec,
    })).singleton(),
  });
}
