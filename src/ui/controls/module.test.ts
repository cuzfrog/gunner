import { buildDomControls, RIFTER } from "./testSupport";
import { DomControls } from "./domControls";
import type { ControlsCradle } from "./cradle";
import type { SavedFitting } from "../../appstate";
import type { ShipId } from "../../gamedata/ids";
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
  now: "now",
  chargeCatalog: "chargeCatalog",
  imageCatalog: "imageCatalog",
  uiEvents: "uiEvents",
  shipATurretOverrides: "shipATurretOverrides",
  shipBTurretOverrides: "shipBTurretOverrides",
  turretOverridesBySide: "turretOverridesBySide",
  popupGroup: "popupGroup",
  els: "els",
  engagementReadout: "engagementReadout",
  effectiveReadout: "effectiveReadout",
  hullDatalist: "hullDatalist",
  hintRotator: "hintRotator",
  preferencesController: "preferencesController",
  profileController: "profileController",
  profileTextCodec: "profileTextCodec",
  shipATurretController: "shipATurretController",
  shipBTurretController: "shipBTurretController",
  turretControllers: "turretControllers",
  shipASide: "shipASide",
  shipBSide: "shipBSide",
  shipAFittingPreview: "shipAFittingPreview",
  shipBFittingPreview: "shipBFittingPreview",
  previewManager: "previewManager",
  shipAFittingPopup: "shipAFittingPopup",
  shipBFittingPopup: "shipBFittingPopup",
  sessionCodec: "sessionCodec",
  simConfigSource: "simConfigSource",
  importController: "importController",
  ewarController: "ewarController",
  boosterController: "boosterController",
  portraitsController: "portraitsController",
  ewarResolver: "ewarResolver",
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
    const THRASHER_ID = "16242" as ShipId;
    const UNKNOWN_ID = "99999" as ShipId;
    const recentRifter: SavedFitting = { id: `${RIFTER.id}::Recent`, hullId: RIFTER.id, name: "Recent", text: "[Rifter, Recent]", savedAt: 0 };
    const savedFittings = {
      ...mockSavedFittings(),
      mostRecentFor: vi.fn((hullId: ShipId) => (hullId === RIFTER.id ? recentRifter : undefined)),
    };
    const presetFittings = {
      ...mockPresetFittings(),
      fittingsFor: vi.fn((hullId: ShipId) => (hullId === THRASHER_ID ? [{ name: "Brawny", body: "" }] : [])),
      eftText: vi.fn((hullId: ShipId, fit) => `[${hullId === RIFTER.id ? "Rifter" : hullId === THRASHER_ID ? "Thrasher" : hullId}, ${fit.name}]`),
    };
    const { cradle } = buildDomControls({ savedFittings, presetFittings });
    const importer = cradle.cradle.shipASide.importer;
    expect(importer.autoLoadFittingTextFor(RIFTER.id)).toBe("[Rifter, Recent]");
    expect(importer.autoLoadFittingTextFor(THRASHER_ID)).toBe("[Thrasher, Brawny]");
    expect(importer.autoLoadFittingTextFor(UNKNOWN_ID)).toBeUndefined();
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
