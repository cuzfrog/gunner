import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import { mockTrackingInput } from "../testSupport";
import type { DisplayPreferences, SettingsStore } from "../../../appstate";
import type { ItemNameCatalog } from "../../../gamedata/itemNames";
import type { PopupGroup } from "../popup";
import type { RangeOverlayController } from "../rangeOverlay";
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

function fakeEls(): PreferencesEls {
  return {
    tracking: new FakeElement() as unknown as HTMLInputElement,
    trackingUnitRad: new FakeElement() as unknown as HTMLButtonElement,
    trackingUnitScore: new FakeElement() as unknown as HTMLButtonElement,
    langEn: new FakeElement() as unknown as HTMLButtonElement,
    langZh: new FakeElement() as unknown as HTMLButtonElement,
    langJa: new FakeElement() as unknown as HTMLButtonElement,
    gridBrightnessSlider: new FakeElement() as unknown as HTMLInputElement,
    gridBrightnessValue: new FakeElement() as unknown as HTMLElement,
    maneuverAggressivity: new FakeElement() as unknown as HTMLInputElement,
    maneuverAggressivitySlider: new FakeElement() as unknown as HTMLInputElement,
    maneuverAggressivityValue: new FakeElement() as unknown as HTMLElement,
    simSpeed: new FakeElement() as unknown as HTMLSelectElement,
    canvasSettingsTrigger: new FakeElement() as unknown as HTMLButtonElement,
    canvasSettingsPopup: new FakeElement() as unknown as HTMLElement,
    zoomSlider: new FakeElement() as unknown as HTMLInputElement,
    zoomValue: new FakeElement() as unknown as HTMLElement,
    autoZoomCheckbox: new FakeElement() as unknown as HTMLInputElement,
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

function build() {
  const els = fakeEls();
  const i18n = mockI18n();
  const settingsStore = vi.mocked<SettingsStore>(mockSettingsStore());
  const ensureLanguage = vi.fn(() => Promise.resolve());
  const itemNameCatalog: ItemNameCatalog = {
    name: (name) => name,
    canonicalName: (name) => name,
    ensureLanguage,
  };
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
  const controller = new PreferencesControllerImpl({
    els,
    i18n,
    itemNameCatalog,
    popupGroup,
    settingsStore,
    trackingInput: mockTrackingInput(),
    sigResolution: () => 40,
    events,
    rangeOverlayController,
  });
  return { controller, els, i18n, itemNameCatalog, popupGroup, settingsStore, events, rangeOverlayController };
}

describe("PreferencesController", () => {
  test("setLanguage persists language, updates toggles, and emits language changed", async () => {
    const { controller, els, i18n, itemNameCatalog, settingsStore, events } = build();
    controller.setLanguage("zh");
    expect(i18n.setLanguage).toHaveBeenCalledWith("zh");
    expect(els.langZh.getAttribute("aria-pressed")).toBe("true");
    expect(els.langEn.getAttribute("aria-pressed")).toBe("false");
    expect(itemNameCatalog.ensureLanguage).toHaveBeenCalledWith("zh");
    await Promise.resolve();
    expect(settingsStore.savePreferences).toHaveBeenCalled();
    expect(events.emitLanguageChanged).toHaveBeenCalled();
  });

  test("setLanguage loads the language pack and emits exactly once after it resolves", async () => {
    const { controller, itemNameCatalog, events } = build();
    let resolve: () => void;
    const promise = new Promise<void>((res) => {
      resolve = res;
    });
    itemNameCatalog.ensureLanguage = vi.fn(() => promise);
    controller.setLanguage("zh");
    expect(itemNameCatalog.ensureLanguage).toHaveBeenCalledWith("zh");
    expect(events.emitLanguageChanged).not.toHaveBeenCalled();
    resolve!();
    await Promise.resolve();
    expect(events.emitLanguageChanged).toHaveBeenCalledTimes(1);
  });

  test("setLanguage emits exactly once when the language pack rejects", async () => {
    const { controller, itemNameCatalog, events } = build();
    let reject: (reason?: unknown) => void;
    const promise = new Promise<void>((_, rej) => {
      reject = rej;
    });
    itemNameCatalog.ensureLanguage = vi.fn(() => promise);
    controller.setLanguage("ja");
    expect(itemNameCatalog.ensureLanguage).toHaveBeenCalledWith("ja");
    reject!(new Error("load failed"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events.emitLanguageChanged).toHaveBeenCalledTimes(1);
  });

  test("setLanguage calls ensureLanguage for English", async () => {
    const { controller, itemNameCatalog, events } = build();
    controller.setLanguage("en");
    expect(itemNameCatalog.ensureLanguage).toHaveBeenCalledWith("en");
    await Promise.resolve();
    expect(events.emitLanguageChanged).toHaveBeenCalled();
  });

  test("restore does not load the language pack for English", async () => {
    const { controller, itemNameCatalog, events } = build();
    const preferences: DisplayPreferences = { language: "en", trackingUnit: "rad", simSpeed: 1, gridBrightness: 0.5, autoZoom: true, zoomFactor: 1 };
    controller.restore(preferences);
    expect(itemNameCatalog.ensureLanguage).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(events.emitLanguageChanged).not.toHaveBeenCalled();
  });

  test("setTrackingUnit converts the displayed tracking value and updates toggles", () => {
    const { controller, els } = build();
    controller.trackingInput.setRadValue(0.32, 40);
    controller.setTrackingUnit("score");
    expect(els.tracking.value).toBe("320");
    expect(els.trackingUnitScore.getAttribute("aria-pressed")).toBe("true");
    expect(els.trackingUnitRad.getAttribute("aria-pressed")).toBe("false");
  });

  test("setTrackingUnit saves preferences and keeps the canonical rad value", () => {
    const { controller, settingsStore } = build();
    controller.trackingInput.setRadValue(0.32, 40);
    controller.setTrackingUnit("score");
    const calls = settingsStore.savePreferences.mock.calls;
    const [saved] = calls[calls.length - 1];
    expect(saved.trackingUnit).toBe("score");
    expect(controller.trackingInput.rad).toBeCloseTo(0.32);
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

  test("onManeuverAggressivityChange round-trips between slider position and value", () => {
    const { controller, els } = build();
    els.maneuverAggressivitySlider.value = "0.25";
    controller.onManeuverAggressivityChange();
    expect(els.maneuverAggressivity.value).toBe("0.1");
    expect(els.maneuverAggressivityValue.textContent).toBe("0.10");
    expect(els.maneuverAggressivitySlider.value).toBe("0.25");
    expect(els.maneuverAggressivitySlider.style).toHaveProperty("--fill", "25%");
  });

  test("setManeuverAggressivityEnabled toggles the slider enabled state", () => {
    const { controller, els } = build();
    controller.setManeuverAggressivityEnabled(false);
    expect(els.maneuverAggressivitySlider.disabled).toBe(true);
    controller.setManeuverAggressivityEnabled(true);
    expect(els.maneuverAggressivitySlider.disabled).toBe(false);
  });

  test("capture returns current display preferences", () => {
    const { controller, els } = build();
    els.gridBrightnessSlider.value = "0.5";
    els.simSpeed.value = "2";
    expect(controller.capture()).toEqual({ language: "en", trackingUnit: "rad", simSpeed: 2, gridBrightness: 0.5, hiddenRangeOverlays: [], autoZoom: true, zoomFactor: 1 });
  });

  test("restore applies hidden range overlay state", () => {
    const { controller, rangeOverlayController } = build();
    const preferences: DisplayPreferences = { language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.5, hiddenRangeOverlays: ["web"], autoZoom: true, zoomFactor: 1 };
    controller.restore(preferences);
    expect(rangeOverlayController.restoreHidden).toHaveBeenCalledWith(["web"]);
  });

  test("capture includes hidden range overlay kinds", () => {
    const { controller, rangeOverlayController } = build();
    vi.mocked(rangeOverlayController.hiddenKinds).mockReturnValue(["grappler"]);
    expect(controller.capture().hiddenRangeOverlays).toEqual(["grappler"]);
  });

  test("restore applies display preferences to the DOM and loads the language pack", async () => {
    const { controller, els, i18n, itemNameCatalog, events } = build();
    const preferences: DisplayPreferences = { language: "ja", trackingUnit: "score", simSpeed: 3, gridBrightness: 0.8, autoZoom: true, zoomFactor: 1 };
    controller.trackingInput.setRadValue(0.32, 40);
    controller.restore(preferences);
    expect(i18n.setLanguage).toHaveBeenCalledWith("ja");
    expect(els.tracking.value).toBe("320");
    expect(els.simSpeed.value).toBe("3");
    expect(els.gridBrightnessValue.textContent).toBe("80%");
    expect(els.gridBrightnessSlider.value).toBe("0.8");
    expect(itemNameCatalog.ensureLanguage).toHaveBeenCalledWith("ja");
    await Promise.resolve();
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
