import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import { mockTrackingInput } from "../testSupport";
import type { TrackingUnit } from "../../../appstate";
import type { DisplayPreferences, SettingsStore } from "../../../appstate";
import type { Popup } from "../popup";
import type { PopupGroup } from "../popup";
import type { RangeOverlayController } from "../rangeOverlay";
import type { Side } from "../side";
import type { TurretController } from "../turret";
import type { DroneController } from "../drone";
import { ZERO_DAMAGE, type DroneSpec } from "../../../sim";
import { toTypeId } from "../../../gamedata/ids";
import type { TrackingInput } from "../trackingInput";
import { PreferencesControllerImpl, type PreferencesController, type PreferencesEls } from "./preferencesController";
import type { PortraitsController } from "../portraits";

class FakeElement {
  value = "";
  disabled = false;
  hidden = true;
  checked = true;
  textContent = "";
  classList = { toggle: vi.fnUntracked() };
  private attributes: Record<string, string | null> = {};
  private handlers: Record<string, Array<(event?: unknown) => void>> = {};
  style: Record<string, string> & { setProperty(name: string, value: string): void } = Object.assign(Object.create(null), {
    setProperty(this: Record<string, string>, name: string, value: string) {
      this[name] = value;
    },
  }) as Record<string, string> & { setProperty(name: string, value: string): void };

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  contains(domTarget: EventTarget): boolean { return false; }

  addEventListener(event: string, handler: (event?: unknown) => void): void { (this.handlers[event] ??= []).push(handler); }
  dispatchEvent(event: { type: string }): void { this.handlers[event.type]?.forEach((h) => h(event)); }
  trigger(event: string, data?: unknown): void { this.handlers[event]?.forEach((h) => h(data)); }
}

function fakeTrackingUnitEls(): { rad: HTMLButtonElement; score: HTMLButtonElement } {
  return {
    rad: new FakeElement() as unknown as HTMLButtonElement,
    score: new FakeElement() as unknown as HTMLButtonElement,
  };
}

function fakeEls(): PreferencesEls {
  return {
    trackingUnit: {
      shipA: fakeTrackingUnitEls(),
      shipB: fakeTrackingUnitEls(),
    },
    langEn: new FakeElement() as unknown as HTMLButtonElement,
    langZh: new FakeElement() as unknown as HTMLButtonElement,
    langJa: new FakeElement() as unknown as HTMLButtonElement,
    gridBrightnessSlider: new FakeElement() as unknown as HTMLInputElement,
    gridBrightnessValue: new FakeElement() as unknown as HTMLElement,
    simSpeed: new FakeElement() as unknown as HTMLSelectElement,
    canvasSettingsTrigger: new FakeElement() as unknown as HTMLButtonElement,
    canvasSettingsPopup: new FakeElement() as unknown as HTMLElement,
    zoomSlider: new FakeElement() as unknown as HTMLInputElement,
    zoomValue: new FakeElement() as unknown as HTMLElement,
    autoZoomCheckbox: new FakeElement() as unknown as HTMLInputElement,
    weaponRangeButton: new FakeElement() as unknown as HTMLButtonElement,
    droneRangeButton: new FakeElement() as unknown as HTMLButtonElement,
    droneControlRangeButton: new FakeElement() as unknown as HTMLButtonElement,
    hpValueNone: new FakeElement() as unknown as HTMLButtonElement,
    hpValuePercentage: new FakeElement() as unknown as HTMLButtonElement,
    hpValueAbsolute: new FakeElement() as unknown as HTMLButtonElement,
  };
}

function mockI18n(): I18n {
  let current: "en" | "zh" | "ja" = "en";
  return {
    current: vi.fnUntracked(() => current),
    setLanguage: vi.fnUntracked((language) => {
      current = language;
    }),
    t: vi.fnUntracked((key) => key),
    translateDocument: vi.fnUntracked(),
  };
}

function mockSettingsStore(): SettingsStore {
  return {
    loadStartupState: vi.fnUntracked(),
    listProfiles: vi.fnUntracked(),
    saveProfile: vi.fnUntracked(),
    loadProfile: vi.fnUntracked(),
    deleteProfile: vi.fnUntracked(),
    selectProfile: vi.fnUntracked(),
    clearSelectedProfile: vi.fnUntracked(),
    encodeUrl: vi.fnUntracked(),
    loadPreferences: vi.fnUntracked(),
    savePreferences: vi.fnUntracked(),
  };
}

function mockRangeOverlayController(): RangeOverlayController {
  return {
    descriptors: vi.fnUntracked(() => []),
    overlays: vi.fnUntracked(() => []),
    toggle: vi.fnUntracked(),
    visibilityFor: vi.fnUntracked(() => "none" as const),
    describe: vi.fnUntracked(() => ""),
    overlayVisibility: vi.fnUntracked(() => ({})),
    restoreVisibility: vi.fnUntracked(),
    render: vi.fnUntracked(),
    update: vi.fnUntracked(),
  };
}

function mockPopupGroup(): PopupGroup {
  return {
    register: vi.fnUntracked(),
    open: vi.fnUntracked(),
    toggle: vi.fnUntracked(),
    close: vi.fnUntracked(),
    closeAll: vi.fnUntracked(),
    hasOpen: vi.fnUntracked(),
    onPointerDown: vi.fnUntracked(),
    onKeyDown: vi.fnUntracked(),
  };
}

function mockPopup(): Popup {
  return { isOpen: vi.fnUntracked(), open: vi.fnUntracked(), close: vi.fnUntracked(), focusTrigger: vi.fnUntracked(), contains: vi.fnUntracked() };
}

class FakeTurretController implements TurretController {
  readonly side: Side;
  readonly popup: Popup;
  private readonly trackingInput: TrackingInput;
  turret = vi.fnUntracked(() => undefined as import("../../../fitting").ImportedTurret | undefined);
  ammo = vi.fnUntracked(() => "Hail S");
  ammoId = vi.fnUntracked(() => "12608" as import("../../../gamedata/ids").TypeId);
  applyImported = vi.fnUntracked();
  restore(_arg1?: unknown, _arg2?: unknown, _arg3?: unknown, _arg4?: unknown): void {}
  clear = vi.fnUntracked();
  currentTurretSpec = vi.fnUntracked((): import("../../../sim").TurretSpec | undefined => ({
    kind: "turret",
    moduleId: toTypeId("1"),
    tracking: this.trackingInput.rad,
    sigResolution: 40,
    optimal: 1000,
    falloff: 3000,
    damagePerShot: ZERO_DAMAGE,
    cycleTime: 1,
    turretCount: 1,
  }));
  currentTurretSpecs = vi.fnUntracked((): readonly import("../../../sim").TurretSpec[] => []);
  currentSigResClass = vi.fnUntracked((): import("../../../sim").SigResolutionClass => "S");
  capture = vi.fnUntracked(() => ({ tracking: 0.32, sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "12608" as import("../../../gamedata/ids").TypeId }));
  isAmmoPopupOpen = vi.fnUntracked();
  openAmmoPopup = vi.fnUntracked();
  closeAmmoPopup = vi.fnUntracked();
  setTrackingUnit: (unit: TrackingUnit) => void;
  trackingUnit(): TrackingUnit { return this.trackingInput.unit; }
  setHullProfile = vi.fnUntracked();
  render = vi.fnUntracked();

  constructor(side: Side, trackingInput: TrackingInput = mockTrackingInput()) {
    this.side = side;
    this.popup = mockPopup();
    this.trackingInput = trackingInput;
    this.setTrackingUnit = vi.fnUntracked((unit: TrackingUnit) => { this.trackingInput.setUnit(unit, 40); });
  }
}

class FakeDroneController implements DroneController {
  readonly side: Side;
  readonly popup: Popup;
  private specs: readonly DroneSpec[] = [];
  drone = vi.fnUntracked(() => undefined);
  currentDroneSpecs = vi.fnUntracked((): readonly DroneSpec[] => this.specs);
  validation = vi.fnUntracked(() => undefined);
  applyImported = vi.fnUntracked();
  restore = vi.fnUntracked();
  clear = vi.fnUntracked();
  capture = vi.fnUntracked(() => ({ droneGroups: [] }));
  isPopupOpen = vi.fnUntracked();
  openPopup = vi.fnUntracked();
  closePopup = vi.fnUntracked();
  render = vi.fnUntracked();

  constructor(side: Side) {
    this.side = side;
    this.popup = mockPopup();
  }

  setSpecs(specs: readonly DroneSpec[]): void {
    this.specs = specs;
  }
}

function build() {
  const els = fakeEls();
  const i18n = mockI18n();
  const settingsStore = vi.mocked<SettingsStore>(mockSettingsStore());
  const events: UiEvents = {
    onLanguageChanged: vi.fnUntracked(),
    offLanguageChanged: vi.fnUntracked(),
    emitLanguageChanged: vi.fnUntracked(),
    onConfigInvalidated: vi.fnUntracked(),
    offConfigInvalidated: vi.fnUntracked(),
    emitConfigInvalidated: vi.fnUntracked(),
    onDisplayInvalidated: vi.fnUntracked(),
    offDisplayInvalidated: vi.fnUntracked(),
    emitDisplayInvalidated: vi.fnUntracked(),
    onFittingImported: vi.fnUntracked(),
    offFittingImported: vi.fnUntracked(),
    emitFittingImported: vi.fnUntracked(),
    onCapBoosterInject: vi.fnUntracked(),
    offCapBoosterInject: vi.fnUntracked(),
    emitCapBoosterInject: vi.fnUntracked(),
    onProfileLoaded: vi.fnUntracked(),
    offProfileLoaded: vi.fnUntracked(),
    emitProfileLoaded: vi.fnUntracked(),
    onNewProfile: vi.fnUntracked(),
    offNewProfile: vi.fnUntracked(),
    emitNewProfile: vi.fnUntracked(),
    onProfileDeleted: vi.fnUntracked(),
    offProfileDeleted: vi.fnUntracked(),
    emitProfileDeleted: vi.fnUntracked(),
    onProfileTextLoaded: vi.fnUntracked(),
    offProfileTextLoaded: vi.fnUntracked(),
    emitProfileTextLoaded: vi.fnUntracked(),
    onSessionRestored: vi.fnUntracked(),
    offSessionRestored: vi.fnUntracked(),
    emitSessionRestored: vi.fnUntracked(),
    onSessionReset: vi.fnUntracked(),
    offSessionReset: vi.fnUntracked(),
    emitSessionReset: vi.fnUntracked(),
    onStartupDefaultsApplied: vi.fnUntracked(),
    offStartupDefaultsApplied: vi.fnUntracked(),
    emitStartupDefaultsApplied: vi.fnUntracked(),
  };
  const rangeOverlayController = mockRangeOverlayController();
  const popupGroup = mockPopupGroup();
  const shipATurretController = new FakeTurretController("shipA");
  const shipBTurretController = new FakeTurretController("shipB");
  const shipADroneController = new FakeDroneController("shipA");
  const shipBDroneController = new FakeDroneController("shipB");
  const portraitsController = vi.mocked<PortraitsController>({ update: vi.fnUntracked(), setHpValueDisplay: vi.fnUntracked() });
  const controller = new PreferencesControllerImpl({
    els,
    i18n,
    popupGroup,
    settingsStore,
    shipATurretController,
    shipBTurretController,
    shipADroneController,
    shipBDroneController,
    events,
    rangeOverlayController,
    itemNameLoader: { ensureLoaded: vi.fnUntracked(), isLoaded: vi.fnUntracked(() => true), load: vi.fnUntracked(() => Promise.resolve()) },
    portraitsController,
  });
  return { controller, els, i18n, popupGroup, settingsStore, events, rangeOverlayController, shipATurretController, shipBTurretController, shipADroneController, shipBDroneController, portraitsController };
}

describe("PreferencesController", () => {
  test("setLanguage persists language, updates toggles, and emits language changed", async () => {
    const { controller, els, i18n, settingsStore, events } = build();
    controller.setLanguage("zh");
    expect(i18n.setLanguage).toHaveBeenCalledWith("zh");
    expect(els.langZh.getAttribute("aria-pressed")).toBe("true");
    expect(els.langEn.getAttribute("aria-pressed")).toBe("false");
    expect(events.emitLanguageChanged).toHaveBeenCalled();
    await Promise.resolve();
    expect(settingsStore.savePreferences).toHaveBeenCalled();
    expect(events.emitLanguageChanged).toHaveBeenCalled();
  });

  test("setLanguage refreshes the weapon range button text", () => {
    const { controller, els } = build();
    controller.setLanguage("zh");
    expect(els.weaponRangeButton.textContent).toBe("label.weaponRange");
  });

  test("setLanguage emits language changed synchronously", async () => {
    const { controller, events } = build();
    controller.setLanguage("zh");
    expect(events.emitLanguageChanged).toHaveBeenCalledTimes(1);
  });

  test("setLanguage emits language changed for English", async () => {
    const { controller, events } = build();
    controller.setLanguage("en");
    expect(events.emitLanguageChanged).toHaveBeenCalledTimes(1);
  });

  test("restore does not emit language changed for English", () => {
    const { controller, events } = build();
    const preferences: DisplayPreferences = { language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", droneRangeVisibility: "none", droneControlRangeVisibility: "none", simSpeed: 1, gridBrightness: 0.5, autoZoom: true, zoomFactor: 1 };
    controller.restore(preferences);
    expect(events.emitLanguageChanged).not.toHaveBeenCalled();
  });

  test("setTrackingUnit delegates to the matching turret controller and updates its toggle", () => {
    const { controller, els, shipATurretController, shipBTurretController } = build();
    controller.setTrackingUnit("shipA", "score");
    expect(shipATurretController.setTrackingUnit).toHaveBeenCalledWith("score");
    expect(shipBTurretController.setTrackingUnit).not.toHaveBeenCalled();
    expect(els.trackingUnit.shipA.score.getAttribute("aria-pressed")).toBe("true");
    expect(els.trackingUnit.shipA.rad.getAttribute("aria-pressed")).toBe("false");
    expect(els.trackingUnit.shipB.score.getAttribute("aria-pressed")).toBe("false");
    expect(els.trackingUnit.shipB.rad.getAttribute("aria-pressed")).toBe("true");
  });

  test("setTrackingUnit for shipB only affects shipB", () => {
    const { controller, els, shipATurretController, shipBTurretController } = build();
    controller.setTrackingUnit("shipB", "score");
    expect(shipBTurretController.setTrackingUnit).toHaveBeenCalledWith("score");
    expect(shipATurretController.setTrackingUnit).not.toHaveBeenCalled();
    expect(els.trackingUnit.shipB.score.getAttribute("aria-pressed")).toBe("true");
    expect(els.trackingUnit.shipB.rad.getAttribute("aria-pressed")).toBe("false");
    expect(els.trackingUnit.shipA.score.getAttribute("aria-pressed")).toBe("false");
    expect(els.trackingUnit.shipA.rad.getAttribute("aria-pressed")).toBe("true");
  });

  test("setTrackingUnit saves preferences", () => {
    const { controller, settingsStore, shipATurretController } = build();
    controller.setTrackingUnit("shipA", "score");
    const calls = settingsStore.savePreferences.mock.calls;
    const [saved] = calls[calls.length - 1];
    expect(saved.shipATrackingUnit).toBe("score");
    expect(saved.shipBTrackingUnit).toBe("rad");
    expect(shipATurretController.trackingUnit()).toBe("score");
  });

  test("getGridBrightness clamps values to [0, 1]", () => {
    const { controller, els } = build();
    els.gridBrightnessSlider.value = "-0.5";
    expect(controller.getGridBrightness()).toBe(0);
    els.gridBrightnessSlider.value = "1.5";
    expect(controller.getGridBrightness()).toBe(1);
  });

  test("getGridBrightness returns default for non-finite input", () => {
    const { controller, els } = build();
    els.gridBrightnessSlider.value = "NaN";
    expect(controller.getGridBrightness()).toBe(0.5);
  });

  test("onGridBrightnessChange updates the output, fills the slider, and saves", () => {
    const { controller, els, settingsStore } = build();
    els.gridBrightnessSlider.value = "0.63";
    controller.onGridBrightnessChange();
    expect(els.gridBrightnessValue.textContent).toBe("63%");
    expect(els.gridBrightnessSlider.style).toHaveProperty("--fill", "63%");
    const calls = settingsStore.savePreferences.mock.calls;
    const [saved] = calls[calls.length - 1];
    expect(saved.gridBrightness).toBe(0.63);
  });

  test("capture returns current display preferences", () => {
    const { controller, els } = build();
    els.gridBrightnessSlider.value = "0.5";
    els.simSpeed.value = "2";
    expect(controller.capture()).toEqual({ language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", droneRangeVisibility: "none", droneControlRangeVisibility: "none", simSpeed: 2, gridBrightness: 0.5, rangeOverlayVisibility: {}, autoZoom: true, zoomFactor: 1, hpValueDisplay: "none" });
  });

  test("getWeaponRangeVisibility defaults to both", () => {
    const { controller } = build();
    expect(controller.getWeaponRangeVisibility()).toBe("both");
  });

  test("cycleWeaponRange cycles through both, shipA, shipB, none", () => {
    const { controller, els } = build();
    expect(controller.getWeaponRangeVisibility()).toBe("both");
    controller.cycleWeaponRange();
    expect(controller.getWeaponRangeVisibility()).toBe("shipA");
    expect(els.weaponRangeButton.getAttribute("aria-pressed")).toBe("true");
    expect(els.weaponRangeButton.getAttribute("data-weapon-range")).toBe("shipA");
    controller.cycleWeaponRange();
    expect(controller.getWeaponRangeVisibility()).toBe("shipB");
    controller.cycleWeaponRange();
    expect(controller.getWeaponRangeVisibility()).toBe("none");
    expect(els.weaponRangeButton.getAttribute("aria-pressed")).toBe("false");
    expect(els.weaponRangeButton.getAttribute("data-weapon-range")).toBe("none");
    controller.cycleWeaponRange();
    expect(controller.getWeaponRangeVisibility()).toBe("both");
  });

  test("cycleWeaponRange saves preferences and emits display invalidation", () => {
    const { controller, settingsStore, events } = build();
    controller.cycleWeaponRange();
    expect(settingsStore.savePreferences).toHaveBeenCalled();
    expect(events.emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("cycleWeaponRange updates the button label via i18n", () => {
    const { controller, els, i18n } = build();
    controller.cycleWeaponRange();
    expect(els.weaponRangeButton.textContent).toBe("label.weaponRange");
    expect(i18n.t).toHaveBeenCalledWith("label.weaponRange");
  });

  test("restore applies the persisted weapon range visibility", () => {
    const { controller, els } = build();
    const preferences: DisplayPreferences = { language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "none", droneRangeVisibility: "none", droneControlRangeVisibility: "none", simSpeed: 4, gridBrightness: 0.5, autoZoom: true, zoomFactor: 1 };
    controller.restore(preferences);
    expect(controller.getWeaponRangeVisibility()).toBe("none");
    expect(els.weaponRangeButton.getAttribute("data-weapon-range")).toBe("none");
  });

  test("capture includes the current weapon range visibility", () => {
    const { controller } = build();
    controller.cycleWeaponRange();
    expect(controller.capture().weaponRangeVisibility).toBe("shipA");
  });

  test("restore applies range overlay visibility", () => {
    const { controller, rangeOverlayController } = build();
    const preferences: DisplayPreferences = { language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", droneRangeVisibility: "none", droneControlRangeVisibility: "none", simSpeed: 4, gridBrightness: 0.5, rangeOverlayVisibility: { web: "shipA" }, autoZoom: true, zoomFactor: 1 };
    controller.restore(preferences);
    expect(rangeOverlayController.restoreVisibility).toHaveBeenCalledWith({ web: "shipA" });
  });

  test("capture includes range overlay visibility", () => {
    const { controller, rangeOverlayController } = build();
    vi.mocked(rangeOverlayController.overlayVisibility).mockReturnValue({ grappler: "both" });
    expect(controller.capture().rangeOverlayVisibility).toEqual({ grappler: "both" });
  });

  test("restore applies display preferences to the DOM and loads the language pack", async () => {
    const { controller, els, i18n, events, shipATurretController } = build();
    const preferences: DisplayPreferences = { language: "ja", shipATrackingUnit: "score", shipBTrackingUnit: "score", weaponRangeVisibility: "both", droneRangeVisibility: "none", droneControlRangeVisibility: "none", simSpeed: 3, gridBrightness: 0.8, autoZoom: true, zoomFactor: 1 };
    controller.restore(preferences);
    expect(i18n.setLanguage).toHaveBeenCalledWith("ja");
    expect(shipATurretController.setTrackingUnit).toHaveBeenCalledWith("score");
    expect(els.trackingUnit.shipA.score.getAttribute("aria-pressed")).toBe("true");
    expect(els.trackingUnit.shipB.score.getAttribute("aria-pressed")).toBe("true");
    expect(els.simSpeed.value).toBe("3");
    expect(els.gridBrightnessValue.textContent).toBe("80%");
    expect(els.gridBrightnessSlider.value).toBe("0.8");
    expect(events.emitLanguageChanged).toHaveBeenCalled();
  });

  test("getSpeed reads the simulation speed select", () => {
    const { controller, els } = build();
    els.simSpeed.value = "8";
    expect(controller.getSpeed()).toBe(8);
  });

  test("getZoomFactor clamps the slider value to [0.25, 4]", () => {
    const { controller, els } = build();
    els.zoomSlider.value = "0.1";
    expect(controller.getZoomFactor()).toBe(0.25);
    els.zoomSlider.value = "5";
    expect(controller.getZoomFactor()).toBe(4);
    els.zoomSlider.value = "1.5";
    expect(controller.getZoomFactor()).toBe(1.5);
  });

  test("onZoomChange updates the output and persists the zoom factor", () => {
    const { controller, els, settingsStore, events } = build();
    els.zoomSlider.value = "2";
    controller.onZoomChange();
    expect(els.zoomValue.textContent).toBe("2.00x");
    expect(parseFloat((els.zoomSlider as unknown as FakeElement).style["--fill"])).toBeCloseTo((2 - 0.25) / (4 - 0.25) * 100, 5);
    expect(settingsStore.savePreferences).toHaveBeenCalled();
    expect(events.emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("onAutoZoomChange disables the zoom slider and persists the checkbox state", () => {
    const { controller, els, settingsStore, events } = build();
    els.autoZoomCheckbox.checked = true;
    controller.onAutoZoomChange();
    expect(els.zoomSlider.disabled).toBe(true);
    expect(settingsStore.savePreferences).toHaveBeenCalled();
    expect(events.emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("unchecking auto-zoom enables the zoom slider", () => {
    const { controller, els } = build();
    els.autoZoomCheckbox.checked = false;
    controller.onAutoZoomChange();
    expect(els.zoomSlider.disabled).toBe(false);
  });

  test("capture and restore round-trip zoom preferences", () => {
    const { controller, els } = build();
    els.autoZoomCheckbox.checked = false;
    els.zoomSlider.value = "1.75";
    const captured = controller.capture();
    expect(captured.autoZoom).toBe(false);
    expect(captured.zoomFactor).toBe(1.75);
    const next = build();
    next.controller.restore(captured);
    expect(next.els.autoZoomCheckbox.checked).toBe(false);
    expect(next.els.zoomSlider.disabled).toBe(false);
    expect(next.els.zoomValue.textContent).toBe("1.75x");
    expect(next.els.zoomSlider.value).toBe("1.75");
  });

  test("setHpValueDisplay updates toggle, portraits controller, and capture", () => {
    const { controller, els, portraitsController } = build();
    controller.setHpValueDisplay("percentage");
    expect(els.hpValueNone.getAttribute("aria-pressed")).toBe("false");
    expect(els.hpValuePercentage.getAttribute("aria-pressed")).toBe("true");
    expect(els.hpValueAbsolute.getAttribute("aria-pressed")).toBe("false");
    expect(portraitsController.setHpValueDisplay).toHaveBeenCalledWith("percentage");
    expect(controller.capture().hpValueDisplay).toBe("percentage");
  });

  test("restore applies hpValueDisplay to toggle and portraits controller", () => {
    const { controller, els, portraitsController } = build();
    controller.restore({ language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", droneRangeVisibility: "none", droneControlRangeVisibility: "none", simSpeed: 4, gridBrightness: 0.5, autoZoom: true, zoomFactor: 1, hpValueDisplay: "absolute" });
    expect(els.hpValueAbsolute.getAttribute("aria-pressed")).toBe("true");
    expect(portraitsController.setHpValueDisplay).toHaveBeenCalledWith("absolute");
  });

  test("cycleDroneRange skips ships with no drones when both have drones", () => {
    const { controller, shipADroneController, shipBDroneController } = build();
    shipADroneController.setSpecs([{ kind: "drone" as const, moduleId: toTypeId("2"), tracking: 0.1, sigResolution: 25, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 3000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 }]);
    shipBDroneController.setSpecs([{ kind: "drone" as const, moduleId: toTypeId("2"), tracking: 0.1, sigResolution: 25, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 3000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 }]);
    expect(controller.getDroneRangeVisibility()).toBe("none");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("both");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("shipA");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("shipB");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("none");
  });

  test("cycleDroneRange skips shipB when only shipA has drones", () => {
    const { controller, shipADroneController } = build();
    shipADroneController.setSpecs([{ kind: "drone" as const, moduleId: toTypeId("2"), tracking: 0.1, sigResolution: 25, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 3000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 }]);
    expect(controller.getDroneRangeVisibility()).toBe("none");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("both");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("shipA");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("none");
  });

  test("cycleDroneRange skips shipA when only shipB has drones", () => {
    const { controller, shipBDroneController } = build();
    shipBDroneController.setSpecs([{ kind: "drone" as const, moduleId: toTypeId("2"), tracking: 0.1, sigResolution: 25, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 3000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 }]);
    expect(controller.getDroneRangeVisibility()).toBe("none");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("both");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("shipB");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("none");
  });

  test("cycleDroneRange stays at none when no ships have drones", () => {
    const { controller } = build();
    expect(controller.getDroneRangeVisibility()).toBe("none");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("none");
  });

  test("cycleDroneControlRange skips ships with no drones", () => {
    const { controller, shipADroneController } = build();
    shipADroneController.setSpecs([{ kind: "drone" as const, moduleId: toTypeId("2"), tracking: 0.1, sigResolution: 25, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 3000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 }]);
    expect(controller.getDroneControlRangeVisibility()).toBe("none");
    controller.cycleDroneControlRange();
    expect(controller.getDroneControlRangeVisibility()).toBe("both");
    controller.cycleDroneControlRange();
    expect(controller.getDroneControlRangeVisibility()).toBe("shipA");
    controller.cycleDroneControlRange();
    expect(controller.getDroneControlRangeVisibility()).toBe("none");
  });

  test("cycleDroneRange resets invalid visibility to first state when drones change", () => {
    const { controller, shipADroneController, shipBDroneController } = build();
    shipADroneController.setSpecs([{ kind: "drone" as const, moduleId: toTypeId("2"), tracking: 0.1, sigResolution: 25, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 3000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 }]);
    shipBDroneController.setSpecs([{ kind: "drone" as const, moduleId: toTypeId("2"), tracking: 0.1, sigResolution: 25, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 3000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 }]);
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("both");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("shipA");
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("shipB");
    shipBDroneController.setSpecs([]);
    controller.cycleDroneRange();
    expect(controller.getDroneRangeVisibility()).toBe("both");
  });
});
