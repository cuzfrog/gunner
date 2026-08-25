import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { DomControls } from "./domControls";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerDomControlsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    controls: asFunction((proxy: ControlsCradle) => new DomControls({
      i18n: proxy.i18n,
      events: proxy.uiEvents,
      now: proxy.now,
      els: collectDomControlsEls(proxy.els),
      popupGroup: proxy.popupGroup,
      hintRotator: proxy.hintRotator,
      hullDatalist: proxy.hullDatalist,
      preferencesController: proxy.preferencesController,
      profileController: proxy.profileController,
      engagementReadout: proxy.engagementReadout,
      effectiveReadout: proxy.effectiveReadout,
      shipASide: proxy.shipASide,
      shipBSide: proxy.shipBSide,
      turretControllers: proxy.turretControllers,
      importController: proxy.importController,
      ewarController: proxy.ewarController,
      boosterController: proxy.boosterController,
      shareController: proxy.shareController,
      rangeOverlayController: proxy.rangeOverlayController,
      portraitsController: proxy.portraitsController,
      previewManager: proxy.previewManager,
      simConfigSource: proxy.simConfigSource,
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
