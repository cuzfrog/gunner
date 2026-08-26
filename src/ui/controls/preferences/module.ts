import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { PreferencesControllerImpl } from "./preferencesController";
import type { PreferencesEls } from "./preferencesController";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerPreferencesModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    preferencesController: asFunction(({
      els, i18n, itemNameCatalog, popupGroup, settingsStore, shipATurretController, shipBTurretController, uiEvents, rangeOverlayController,
    }: ControlsCradle) =>
      new PreferencesControllerImpl({
        els: collectPreferencesEls(els),
        i18n,
        itemNameCatalog,
        popupGroup,
        settingsStore,
        shipATurretController,
        shipBTurretController,
        events: uiEvents,
        rangeOverlayController,
      })
    ).singleton(),
  });
}

function collectPreferencesEls(els: ControlsElements): PreferencesEls {
  return {
    trackingUnit: {
      shipA: { rad: els.shipA.trackingUnitRad, score: els.shipA.trackingUnitScore },
      shipB: { rad: els.shipB.trackingUnitRad, score: els.shipB.trackingUnitScore },
    },
    langEn: els.langEn,
    langZh: els.langZh,
    langJa: els.langJa,
    gridBrightnessSlider: els.gridBrightnessSlider,
    gridBrightnessValue: els.gridBrightnessValue,
    simSpeed: els.simSpeed,
    canvasSettingsTrigger: els.canvasSettingsTrigger,
    canvasSettingsPopup: els.canvasSettingsPopup,
    zoomSlider: els.zoomSlider,
    zoomValue: els.zoomValue,
    autoZoomCheckbox: els.autoZoomCheckbox,
  };
}
