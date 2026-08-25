import { buildDomControls } from "./testSupport";
import { DomControls } from "./domControls";
import type { ControlsCradle } from "./cradle";
import type { SavedFitting } from "../../appstate";
import { mockPresetFittings, mockSavedFittings } from "../testing";

const controlsCradleKeys = {
  hitChance: "hitChance",
  i18n: "i18n",
  itemNameCatalog: "itemNameCatalog",
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
  effectiveReadout: "effectiveReadout",
  hullDatalist: "hullDatalist",
  hintRotator: "hintRotator",
  preferencesController: "preferencesController",
  profileController: "profileController",
  profileTextCodec: "profileTextCodec",
  turretController: "turretController",
  attackerSide: "attackerSide",
  targetSide: "targetSide",
  attackerFittingPreview: "attackerFittingPreview",
  targetFittingPreview: "targetFittingPreview",
  previewManager: "previewManager",
  attackerFittingPopup: "attackerFittingPopup",
  targetFittingPopup: "targetFittingPopup",
  sessionCodec: "sessionCodec",
  simConfigSource: "simConfigSource",
  importController: "importController",
  ewarController: "ewarController",
  boosterController: "boosterController",
  shareController: "shareController",
  rangeOverlayController: "rangeOverlayController",
  confirmController: "confirmController",
  profileEquality: "profileEquality",
  profileChangeTracker: "profileChangeTracker",
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

  test("wiring gives each side an importer that auto-loads recent text and falls back to the first preset", () => {
    const recentRifter: SavedFitting = { id: "r", hull: "Rifter", name: "Recent", text: "[Rifter, Recent]", savedAt: 0 };
    const savedFittings = {
      ...mockSavedFittings(),
      mostRecentFor: vi.fn((hull: string) => (hull === "Rifter" ? recentRifter : undefined)),
    };
    const presetFittings = {
      ...mockPresetFittings(),
      fittingsFor: vi.fn((hull: string) => (hull === "Thrasher" ? [{ name: "Brawny", body: "" }] : [])),
      eftText: vi.fn((hull, fit) => `[${hull}, ${fit.name}]`),
    };
    const { cradle } = buildDomControls({ savedFittings, presetFittings });
    const importer = cradle.cradle.attackerSide.importer;
    expect(importer.autoLoadFittingTextFor("Rifter")).toBe("[Rifter, Recent]");
    expect(importer.autoLoadFittingTextFor("Thrasher")).toBe("[Thrasher, Brawny]");
    expect(importer.autoLoadFittingTextFor("Unknown")).toBeUndefined();
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
    expect(cradle.hasRegistration("createHullDatalist")).toBe(false);
    expect(cradle.hasRegistration("createHintRotator")).toBe(false);
    expect(cradle.hasRegistration("createPreferencesController")).toBe(false);
    expect(cradle.hasRegistration("createProfileController")).toBe(false);
    expect(cradle.hasRegistration("createImportController")).toBe(false);
    expect(cradle.hasRegistration("domControlsFactory")).toBe(false);
  });
});
