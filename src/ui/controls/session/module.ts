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
    hullDatalist: asFunction(({ els, presetFittings, ships, i18n, uiEvents }) =>
      new HullDatalistImpl(els.hullOptions, presetFittings, ships, i18n, uiEvents)
    ).singleton(),
    sessionCodec: asFunction((proxy) => new SessionCodecImpl({
      els: collectSessionCodecEls(proxy.els),
      shipASide: proxy.shipASide,
      shipBSide: proxy.shipBSide,
      turretControllers: proxy.turretControllers,
      turretOverridesBySide: proxy.turretOverridesBySide,
      preferences: proxy.preferencesController,
      profileController: proxy.profileController,
      i18n: proxy.i18n,
      chargeCatalog: proxy.chargeCatalog,
      hintRotator: proxy.hintRotator,
      settingsStore: proxy.settingsStore,
      events: proxy.uiEvents,
      ewarController: proxy.ewarController,
      boosterController: proxy.boosterController,
      fittingImport: proxy.fittingImport,
    })).singleton(),
    simConfigSource: asFunction((proxy) => new SimConfigSourceImpl({
      shipASide: proxy.shipASide,
      shipBSide: proxy.shipBSide,
      ewarController: proxy.ewarController,
      boosterController: proxy.boosterController,
      distanceSource: proxy.sessionCodec,
    })).singleton(),
  });
}

function collectSessionCodecEls(all: ControlsElements): SessionCodecEls {
  return { initialDistance: all.initialDistance };
}
