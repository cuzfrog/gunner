import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { DomControls } from "./domControls";
import { ReadoutPresenterImpl } from "./readoutPresenter";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerDomControlsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    readoutPresenter: asFunction((proxy: ControlsCradle) => new ReadoutPresenterImpl({
      viewStream: proxy.viewStream,
      engagementReadout: proxy.engagementReadout,
      effectiveReadout: proxy.effectiveReadout,
      defenseReadout: proxy.defenseController,
      i18n: proxy.i18n,
      now: proxy.now,
    })).singleton(),
    controls: asFunction((proxy: ControlsCradle) => new DomControls({
      i18n: proxy.i18n,
      events: proxy.uiEvents,
      els: collectDomControlsEls(proxy.els),
      popupGroup: proxy.popupGroup,
      hintRotator: proxy.hintRotator,
      hullDatalist: proxy.hullDatalist,
      preferencesController: proxy.preferencesController,
      profileController: proxy.profileController,
      shipASide: proxy.shipASide,
      shipBSide: proxy.shipBSide,
      turretControllers: proxy.turretControllers,
      launcherControllers: proxy.launcherControllers,
      droneControllers: proxy.droneControllers,
      weaponSystemSwitches: proxy.weaponSystemSwitches,
      importController: proxy.importController,
      ewarController: proxy.ewarController,
      defenseController: proxy.defenseController,
      boosterController: proxy.boosterController,
      missileBoosterController: proxy.missileBoosterController,
      shareController: proxy.shareController,
      rangeOverlayController: proxy.rangeOverlayController,
      portraitsController: proxy.portraitsController,
      hoverHintController: proxy.hoverHintController,
      previewManager: proxy.previewManager,
      simConfigSource: proxy.simConfigSource,
      readoutPresenter: proxy.readoutPresenter,
    })).singleton(),
  });
}

interface DomControlsEls {
  play: HTMLButtonElement;
  reset: HTMLButtonElement;
  simSpeed: HTMLSelectElement;
  initialDistance: HTMLInputElement;
}

function collectDomControlsEls(els: ControlsElements): DomControlsEls {
  return {
    play: els.play,
    reset: els.reset,
    simSpeed: els.simSpeed,
    initialDistance: els.initialDistance,
  };
}
