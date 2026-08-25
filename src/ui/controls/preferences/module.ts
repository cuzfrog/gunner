import { asFunction, type AwilixContainer } from "awilix";
import { SIG_RESOLUTIONS } from "../../../sim";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { PreferencesControllerImpl } from "./preferencesController";
import type { PreferencesEls } from "./preferencesController";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerPreferencesModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    preferencesController: asFunction(({
      els, i18n, itemNameCatalog, popupGroup, settingsStore, trackingInput, turretController, uiEvents, rangeOverlayController,
    }: ControlsCradle) =>
      new PreferencesControllerImpl({
        els: collectPreferencesEls(els),
        i18n,
        itemNameCatalog,
        popupGroup,
        settingsStore,
        trackingInput,
        sigResolution: () => SIG_RESOLUTIONS[turretController.currentSigResClass()],
        events: uiEvents,
        rangeOverlayController,
      })
    ).singleton(),
  });
}

function collectPreferencesEls(els: ControlsElements): PreferencesEls {
  return {
    tracking: els.tracking,
    trackingUnitRad: els.trackingUnitRad,
    trackingUnitScore: els.trackingUnitScore,
    langEn: els.langEn,
    langZh: els.langZh,
    langJa: els.langJa,
    gridBrightnessSlider: els.gridBrightnessSlider,
    gridBrightnessValue: els.gridBrightnessValue,
    maneuverAggressivity: els.maneuverAggressivity,
    maneuverAggressivitySlider: els.maneuverAggressivitySlider,
    maneuverAggressivityValue: els.maneuverAggressivityValue,
    simSpeed: els.simSpeed,
    canvasSettingsTrigger: els.canvasSettingsTrigger,
    canvasSettingsPopup: els.canvasSettingsPopup,
    zoomSlider: els.zoomSlider,
    zoomValue: els.zoomValue,
    autoZoomCheckbox: els.autoZoomCheckbox,
  };
}
