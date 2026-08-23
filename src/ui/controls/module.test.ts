import { buildDomControls } from "./testSupport";
import { DomControls } from "./domControls";
import type { ControlsCradle } from "./cradle";

const controlsCradleKeys = {
  hitChance: "hitChance",
  i18n: "i18n",
  settingsStore: "settingsStore",
  ships: "ships",
  fittingImport: "fittingImport",
  gunFamilies: "gunFamilies",
  presetFittings: "presetFittings",
  savedFittings: "savedFittings",
  clipboard: "clipboard",
  timer: "timer",
  chargeCatalog: "chargeCatalog",
  imageCatalog: "imageCatalog",
  uiEvents: "uiEvents",
  turretOverrides: "turretOverrides",
  popupGroup: "popupGroup",
  els: "els",
  trackingInput: "trackingInput",
  sigResChoice: "sigResChoice",
  engagementReadout: "engagementReadout",
  hullDatalist: "hullDatalist",
  hintRotator: "hintRotator",
  preferencesController: "preferencesController",
  profileController: "profileController",
  turretController: "turretController",
  attackerSide: "attackerSide",
  targetSide: "targetSide",
  attackerFittingPreview: "attackerFittingPreview",
  targetFittingPreview: "targetFittingPreview",
  previewManager: "previewManager",
  attackerFittingPopup: "attackerFittingPopup",
  targetFittingPopup: "targetFittingPopup",
  sessionCodec: "sessionCodec",
  importController: "importController",
  eventRouter: "eventRouter",
  controls: "controls",
} as const satisfies { [K in keyof ControlsCradle]: K };

describe("registerControlsModule", () => {
  test("composes the controls graph through typed cradle keys", () => {
    const { cradle, controls } = buildDomControls();
    expect(controls).toBeInstanceOf(DomControls);
    const allKeys: (keyof ControlsCradle)[] = [...Object.values(controlsCradleKeys)];
    for (const key of allKeys) {
      expect(cradle.cradle[key]).toBeDefined();
    }
  });

  test("does not register old Create* factory keys", () => {
    const { cradle } = buildDomControls();
    expect(cradle.hasRegistration("createTurretController")).toBe(false);
    expect(cradle.hasRegistration("createSidePanel")).toBe(false);
    expect(cradle.hasRegistration("createSidePanelEls")).toBe(false);
    expect(cradle.hasRegistration("createFittingPreview")).toBe(false);
    expect(cradle.hasRegistration("createFittingPreviewManager")).toBe(false);
    expect(cradle.hasRegistration("createFittingPopupController")).toBe(false);
    expect(cradle.hasRegistration("createSessionCodec")).toBe(false);
    expect(cradle.hasRegistration("createEventRouter")).toBe(false);
    expect(cradle.hasRegistration("createHullDatalist")).toBe(false);
    expect(cradle.hasRegistration("createHintRotator")).toBe(false);
    expect(cradle.hasRegistration("createPreferencesController")).toBe(false);
    expect(cradle.hasRegistration("createProfileController")).toBe(false);
    expect(cradle.hasRegistration("createImportController")).toBe(false);
    expect(cradle.hasRegistration("domControlsFactory")).toBe(false);
  });
});
