import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { EventRouter } from "./eventRouter";
import { HullDatalistImpl } from "./hullDatalist";
import { SessionCodecImpl } from "./sessionCodec";

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
      hitChance: proxy.hitChance,
      trackingInput: proxy.trackingInput,
    })).singleton(),
    eventRouter: asFunction(({ els, preferencesController, profileController, importController, shareController, attackerSide, targetSide, turretController, trackingInput, popupGroup, previewManager, attackerFittingPopup, targetFittingPopup }) => new EventRouter({
      els,
      preferences: preferencesController,
      profile: profileController,
      import: importController,
      share: shareController,
      attackerSide,
      targetSide,
      turret: turretController,
      trackingInput,
      popupGroup,
      previewManager,
      attackerFittingPopup,
      targetFittingPopup,
    })).singleton(),
  });
}
