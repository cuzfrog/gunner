import type { I18n } from "../i18n";
import type { UiEvents } from "../events";
import { mockTrackingInput } from "./testSupport";
import type { DisplayPreferences, SettingsStore } from "../../appstate";
import { PreferencesControllerImpl, type PreferencesController, type PreferencesEls } from "./preferencesController";

class FakeElement {
  value = "";
  disabled = false;
  textContent = "";
  classList = { toggle: vi.fn() };
  private attributes: Record<string, string | null> = {};
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
    emitConfigInvalidated: vi.fn((_: boolean) => {}),
    onDisplayInvalidated: vi.fn(),
    offDisplayInvalidated: vi.fn(),
    emitDisplayInvalidated: vi.fn(),
  };
  const controller = new PreferencesControllerImpl({
    els,
    i18n,
    settingsStore,
    trackingInput: mockTrackingInput(),
    sigResolution: () => 40,
    events,
  });
  return { controller, els, i18n, settingsStore, events };
}

describe("PreferencesController", () => {
  test("setLanguage persists language, updates toggles, and emits language changed", () => {
    const { controller, els, i18n, settingsStore, events } = build();
    controller.setLanguage("zh");
    expect(i18n.setLanguage).toHaveBeenCalledWith("zh");
    expect(els.langZh.classList.toggle).toHaveBeenCalledWith("active", true);
    expect(els.langEn.classList.toggle).toHaveBeenCalledWith("active", false);
    expect(settingsStore.savePreferences).toHaveBeenCalled();
    expect(events.emitLanguageChanged).toHaveBeenCalled();
  });

  test("setTrackingUnit converts the displayed tracking value and updates toggles", () => {
    const { controller, els } = build();
    controller.trackingInput.setRadValue(0.32, 40);
    controller.setTrackingUnit("score");
    expect(els.tracking.value).toBe("320");
    expect(els.trackingUnitScore.classList.toggle).toHaveBeenCalledWith("active", true);
    expect(els.trackingUnitRad.classList.toggle).toHaveBeenCalledWith("active", false);
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

  test("updateTrackingFromInput converts a score display value to rad", () => {
    const { controller, els } = build();
    controller.setTrackingUnit("score");
    els.tracking.value = "320";
    controller.updateTrackingFromInput();
    expect(controller.trackingInput.rad).toBeCloseTo(0.32);
    expect(els.tracking.value).toBe("320");
  });

  test("updateTrackingForSigResolution updates the displayed score for a new signature resolution", () => {
    const { controller, els } = build();
    controller.trackingInput.setRadValue(0.32, 40);
    controller.setTrackingUnit("score");
    expect(els.tracking.value).toBe("320");
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
    expect(controller.getGridBrightness()).toBe(0.2);
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

  test("updateManeuverAggressivityEnabled disables the slider in midships mode", () => {
    const { controller, els } = build();
    controller.updateManeuverAggressivityEnabled(true);
    expect(els.maneuverAggressivitySlider.disabled).toBe(true);
    controller.updateManeuverAggressivityEnabled(false);
    expect(els.maneuverAggressivitySlider.disabled).toBe(false);
  });

  test("capture returns current display preferences", () => {
    const { controller, els } = build();
    els.gridBrightnessSlider.value = "0.5";
    els.simSpeed.value = "2";
    expect(controller.capture()).toEqual({ language: "en", trackingUnit: "rad", simSpeed: 2, gridBrightness: 0.5 });
  });

  test("restore applies display preferences to the DOM", () => {
    const { controller, els, i18n, events } = build();
    const preferences: DisplayPreferences = { language: "ja", trackingUnit: "score", simSpeed: 3, gridBrightness: 0.8 };
    controller.trackingInput.setRadValue(0.32, 40);
    controller.restore(preferences);
    expect(i18n.setLanguage).toHaveBeenCalledWith("ja");
    expect(els.tracking.value).toBe("320");
    expect(els.simSpeed.value).toBe("3");
    expect(els.gridBrightnessValue.textContent).toBe("80%");
    expect(els.gridBrightnessSlider.value).toBe("0.8");
    expect(events.emitLanguageChanged).not.toHaveBeenCalled();
  });

  test("getSpeed reads the simulation speed select", () => {
    const { controller, els } = build();
    els.simSpeed.value = "8";
    expect(controller.getSpeed()).toBe(8);
  });
});
