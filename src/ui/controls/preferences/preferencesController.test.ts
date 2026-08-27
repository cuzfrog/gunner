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
import type { TrackingInput } from "../trackingInput";
import { PreferencesControllerImpl, type PreferencesController, type PreferencesEls } from "./preferencesController";

class FakeElement {
  value = "";
  disabled = false;
  hidden = true;
  checked = true;
  textContent = "";
  classList = { toggle: vi.fn() };
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
  };
}

function mockI18n(): I18n {
  let current: "en" | "zh" | "ja" = "en";
  return {
    current: vi.fn(() => current),
    setLanguage: vi.fn((language) => {
      current = language;
    }),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  };
}

function mockSettingsStore(): SettingsStore {
  return {
    loadStartupState: vi.fn(),
    listProfiles: vi.fn(),
    saveProfile: vi.fn(),
    loadProfile: vi.fn(),
    deleteProfile: vi.fn(),
    selectProfile: vi.fn(),
    clearSelectedProfile: vi.fn(),
    encodeUrl: vi.fn(),
    loadPreferences: vi.fn(),
    savePreferences: vi.fn(),
  };
}

function mockRangeOverlayController(): RangeOverlayController {
  return {
    descriptors: vi.fn(() => []),
    overlays: vi.fn(() => []),
    toggle: vi.fn(),
    isVisible: vi.fn(() => true),
    describe: vi.fn(() => ""),
    hiddenKinds: vi.fn(() => []),
    restoreHidden: vi.fn(),
    render: vi.fn(),
    update: vi.fn(),
  };
}

function mockPopupGroup(): PopupGroup {
  return {
    register: vi.fn(),
    open: vi.fn(),
    toggle: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
    hasOpen: vi.fn(),
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
  };
}

function mockPopup(): Popup {
  return { isOpen: vi.fn(), open: vi.fn(), close: vi.fn(), focusTrigger: vi.fn(), contains: vi.fn() };
}

class FakeTurretController implements TurretController {
  readonly side: Side;
  readonly popup: Popup;
  private readonly trackingInput: TrackingInput;
  turret = vi.fn(() => undefined as import("../../../fitting").ImportedTurret | undefined);
  ammo = vi.fn(() => "Hail S");
  ammoId = vi.fn(() => "12608" as import("../../../gamedata/ids").TypeId);
  applyImported = vi.fn();
  restore(_arg1?: unknown, _arg2?: unknown, _arg3?: unknown, _arg4?: unknown): void {}
  clear = vi.fn();
  currentTurretSpec = vi.fn((): import("../../../sim").TurretSpec => ({
    tracking: this.trackingInput.rad,
    sigResolution: 40,
    optimal: 1000,
    falloff: 3000,
  }));
  currentSigResClass = vi.fn((): import("../../../sim").SigResolutionClass => "S");
  capture = vi.fn(() => ({ tracking: 0.32, sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "12608" as import("../../../gamedata/ids").TypeId }));
  isAmmoPopupOpen = vi.fn();
  openAmmoPopup = vi.fn();
  closeAmmoPopup = vi.fn();
  setTrackingUnit: (unit: TrackingUnit) => void;
  trackingUnit(): TrackingUnit { return this.trackingInput.unit; }
  setHullProfile = vi.fn();
  render = vi.fn();

  constructor(side: Side, trackingInput: TrackingInput = mockTrackingInput()) {
    this.side = side;
    this.popup = mockPopup();
    this.trackingInput = trackingInput;
    this.setTrackingUnit = vi.fn((unit: TrackingUnit) => { this.trackingInput.setUnit(unit, 40); });
  }
}

function build() {
  const els = fakeEls();
  const i18n = mockI18n();
  const settingsStore = vi.mocked<SettingsStore>(mockSettingsStore());
  const events: UiEvents = {
    onLanguageChanged: vi.fn(),
    offLanguageChanged: vi.fn(),
    emitLanguageChanged: vi.fn(),
    onConfigInvalidated: vi.fn(),
    offConfigInvalidated: vi.fn(),
    emitConfigInvalidated: vi.fn((_persist: boolean) => {}),
    onDisplayInvalidated: vi.fn(),
    offDisplayInvalidated: vi.fn(),
    emitDisplayInvalidated: vi.fn(),
    onFittingImported: vi.fn(),
    offFittingImported: vi.fn(),
    emitFittingImported: vi.fn(),
    onProfileLoaded: vi.fn(),
    offProfileLoaded: vi.fn(),
    emitProfileLoaded: vi.fn(),
    onNewProfile: vi.fn(),
    offNewProfile: vi.fn(),
    emitNewProfile: vi.fn(),
    onProfileDeleted: vi.fn(),
    offProfileDeleted: vi.fn(),
    emitProfileDeleted: vi.fn(),
    onProfileTextLoaded: vi.fn(),
    offProfileTextLoaded: vi.fn(),
    emitProfileTextLoaded: vi.fn(),
    onSessionRestored: vi.fn(),
    offSessionRestored: vi.fn(),
    emitSessionRestored: vi.fn(),
    onSessionReset: vi.fn(),
    offSessionReset: vi.fn(),
    emitSessionReset: vi.fn(),
    onStartupDefaultsApplied: vi.fn(),
    offStartupDefaultsApplied: vi.fn(),
    emitStartupDefaultsApplied: vi.fn(),
    onDistanceChanged: vi.fn(),
    offDistanceChanged: vi.fn(),
    emitDistanceChanged: vi.fn(),
  };
  const rangeOverlayController = mockRangeOverlayController();
  const popupGroup = mockPopupGroup();
  const shipATurretController = new FakeTurretController("shipA");
  const shipBTurretController = new FakeTurretController("shipB");
  const controller = new PreferencesControllerImpl({
    els,
    i18n,
    popupGroup,
    settingsStore,
    shipATurretController,
    shipBTurretController,
    events,
    rangeOverlayController,
  });
  return { controller, els, i18n, popupGroup, settingsStore, events, rangeOverlayController, shipATurretController, shipBTurretController };
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
    expect(els.weaponRangeButton.textContent).toBe("label.weaponRange.both");
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
    const preferences: DisplayPreferences = { language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", simSpeed: 1, gridBrightness: 0.5, autoZoom: true, zoomFactor: 1 };
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
    expect(controller.capture()).toEqual({ language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", simSpeed: 2, gridBrightness: 0.5, hiddenRangeOverlays: [], autoZoom: true, zoomFactor: 1 });
  });

  test("getWeaponRangeVisibility defaults to both", () => {
    const { controller } = build();
    expect(controller.getWeaponRangeVisibility()).toBe("both");
  });

  test("cycleWeaponRange cycles through both, shipA, shipB, none, and back to both", () => {
    const { controller, els } = build();
    expect(controller.getWeaponRangeVisibility()).toBe("both");
    controller.cycleWeaponRange();
    expect(controller.getWeaponRangeVisibility()).toBe("shipA");
    expect(els.weaponRangeButton.getAttribute("aria-pressed")).toBe("true");
    expect(els.weaponRangeButton.getAttribute("data-weapon-range")).toBe("shipA");
    controller.cycleWeaponRange();
    expect(controller.getWeaponRangeVisibility()).toBe("shipB");
    expect(els.weaponRangeButton.getAttribute("data-weapon-range")).toBe("shipB");
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
    expect(els.weaponRangeButton.textContent).toBe("label.weaponRange.shipA");
    expect(i18n.t).toHaveBeenCalledWith("label.weaponRange.shipA");
  });

  test("restore applies the persisted weapon range visibility", () => {
    const { controller, els } = build();
    const preferences: DisplayPreferences = { language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "shipB", simSpeed: 4, gridBrightness: 0.5, autoZoom: true, zoomFactor: 1 };
    controller.restore(preferences);
    expect(controller.getWeaponRangeVisibility()).toBe("shipB");
    expect(els.weaponRangeButton.getAttribute("data-weapon-range")).toBe("shipB");
  });

  test("capture includes the current weapon range visibility", () => {
    const { controller } = build();
    controller.cycleWeaponRange();
    controller.cycleWeaponRange();
    expect(controller.capture().weaponRangeVisibility).toBe("shipB");
  });

  test("restore applies hidden range overlay state", () => {
    const { controller, rangeOverlayController } = build();
    const preferences: DisplayPreferences = { language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", simSpeed: 4, gridBrightness: 0.5, hiddenRangeOverlays: ["web"], autoZoom: true, zoomFactor: 1 };
    controller.restore(preferences);
    expect(rangeOverlayController.restoreHidden).toHaveBeenCalledWith(["web"]);
  });

  test("capture includes hidden range overlay kinds", () => {
    const { controller, rangeOverlayController } = build();
    vi.mocked(rangeOverlayController.hiddenKinds).mockReturnValue(["grappler"]);
    expect(controller.capture().hiddenRangeOverlays).toEqual(["grappler"]);
  });

  test("restore applies display preferences to the DOM and loads the language pack", async () => {
    const { controller, els, i18n, events, shipATurretController } = build();
    const preferences: DisplayPreferences = { language: "ja", shipATrackingUnit: "score", shipBTrackingUnit: "score", weaponRangeVisibility: "both", simSpeed: 3, gridBrightness: 0.8, autoZoom: true, zoomFactor: 1 };
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
});
