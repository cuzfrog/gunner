import { num, setText } from "../controlsDom";
import {
  DEFAULT_GRID_BRIGHTNESS,
  aggressivityFromPosition,
  parseManeuverAggressivity,
  positionFromAggressivity,
} from "../controlsFormat";
import type { I18n, Language } from "../i18n";
import type { DisplayPreferences, SettingsStore } from "../settings";
import { TrackingInput, type TrackingUnit } from "../trackingInput";

export interface PreferencesEls {
  readonly tracking: HTMLInputElement;
  readonly trackingUnitRad: HTMLButtonElement;
  readonly trackingUnitScore: HTMLButtonElement;
  readonly langEn: HTMLButtonElement;
  readonly langZh: HTMLButtonElement;
  readonly langJa: HTMLButtonElement;
  readonly gridBrightnessSlider: HTMLInputElement;
  readonly gridBrightnessValue: HTMLElement;
  readonly maneuverAggressivity: HTMLInputElement;
  readonly maneuverAggressivitySlider: HTMLInputElement;
  readonly maneuverAggressivityValue: HTMLElement;
  readonly simSpeed: HTMLSelectElement;
}

export class PreferencesController {
  readonly trackingInput: TrackingInput;
  private readonly els: PreferencesEls;
  private readonly i18n: I18n;
  private readonly settingsStore: SettingsStore;
  private readonly sigResolution: () => number;
  private readonly onLanguageChanged: () => void;

  constructor(deps: {
    els: PreferencesEls;
    i18n: I18n;
    settingsStore: SettingsStore;
    sigResolution: () => number;
    onLanguageChanged: () => void;
  }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.settingsStore = deps.settingsStore;
    this.sigResolution = deps.sigResolution;
    this.onLanguageChanged = deps.onLanguageChanged;
    this.trackingInput = new TrackingInput();
  }

  getSpeed(): number {
    return num(this.els.simSpeed);
  }

  getGridBrightness(): number {
    const value = Number.parseFloat(this.els.gridBrightnessSlider.value);
    if (!Number.isFinite(value)) return DEFAULT_GRID_BRIGHTNESS;
    return Math.max(0, Math.min(1, value));
  }

  setLanguage(language: Language): void {
    this.applyLanguage(language);
    this.savePreferences();
    this.onLanguageChanged();
  }

  applyPreferences(preferences: DisplayPreferences): void {
    this.applyDisplayPreferences(preferences);
  }

  restore(preferences: DisplayPreferences): void {
    this.applyDisplayPreferences(preferences);
  }

  savePreferences(): void {
    this.settingsStore.savePreferences(this.capture());
  }

  capture(): DisplayPreferences {
    return {
      language: this.i18n.current(),
      trackingUnit: this.trackingInput.unit,
      simSpeed: num(this.els.simSpeed),
      gridBrightness: this.getGridBrightness(),
    };
  }

  setTrackingUnit(unit: TrackingUnit): void {
    this.els.tracking.value = String(this.trackingInput.setUnit(unit, this.sigResolution()));
    this.updateUnitToggle();
    this.savePreferences();
  }

  updateTrackingFromInput(): void {
    const value = num(this.els.tracking);
    this.els.tracking.value = String(this.trackingInput.setDisplayValue(value, this.sigResolution()));
  }

  updateTrackingForSigResolution(): void {
    this.els.tracking.value = String(this.trackingInput.displayValue(this.sigResolution()));
  }

  displayTrackingInput(): void {
    this.els.tracking.value = String(this.trackingInput.displayValue(this.sigResolution()));
  }

  onGridBrightnessChange(): void {
    this.updateGridBrightnessDisplay();
    this.savePreferences();
  }

  updateGridBrightnessDisplay(value?: number): void {
    const slider = this.els.gridBrightnessSlider;
    const output = this.els.gridBrightnessValue;
    const current = value ?? this.getGridBrightness();
    slider.value = String(current);
    setText(output, `${Math.round(current * 100)}%`);
    if ("setProperty" in slider.style) {
      slider.style.setProperty("--fill", `${current * 100}%`);
    }
  }

  onManeuverAggressivityChange(): void {
    const slider = this.els.maneuverAggressivitySlider;
    const pos = Number.parseFloat(slider.value);
    const value = Math.round(aggressivityFromPosition(pos) * 100) / 100;
    this.updateManeuverAggressivityDisplay(value);
    this.savePreferences();
  }

  updateManeuverAggressivityDisplay(value?: number): void {
    const input = this.els.maneuverAggressivity;
    const slider = this.els.maneuverAggressivitySlider;
    const output = this.els.maneuverAggressivityValue;
    const current = value ?? parseManeuverAggressivity(input);
    input.value = String(current);
    setText(output, current.toFixed(2));
    const pos = positionFromAggressivity(current);
    slider.value = String(pos);
    if ("setProperty" in slider.style) {
      slider.style.setProperty("--fill", `${pos * 100}%`);
    }
  }

  updateManeuverAggressivityEnabled(isMidships: boolean): void {
    this.els.maneuverAggressivitySlider.disabled = isMidships;
  }

  private applyLanguage(language: Language): void {
    this.i18n.setLanguage(language);
    this.updateLanguageToggle();
  }

  private applyDisplayPreferences(preferences: DisplayPreferences): void {
    this.applyLanguage(preferences.language);
    this.els.tracking.value = String(this.trackingInput.setUnit(preferences.trackingUnit, this.sigResolution()));
    this.els.simSpeed.value = String(preferences.simSpeed);
    this.updateGridBrightnessDisplay(preferences.gridBrightness);
    this.updateUnitToggle();
  }

  private updateUnitToggle(): void {
    const radActive = this.trackingInput.unit === "rad";
    const scoreActive = this.trackingInput.unit === "score";
    this.els.trackingUnitRad.classList.toggle("active", radActive);
    this.els.trackingUnitRad.setAttribute("aria-pressed", String(radActive));
    this.els.trackingUnitScore.classList.toggle("active", scoreActive);
    this.els.trackingUnitScore.setAttribute("aria-pressed", String(scoreActive));
  }

  private updateLanguageToggle(): void {
    const current = this.i18n.current();
    this.els.langEn.classList.toggle("active", current === "en");
    this.els.langEn.setAttribute("aria-pressed", String(current === "en"));
    this.els.langZh.classList.toggle("active", current === "zh");
    this.els.langZh.setAttribute("aria-pressed", String(current === "zh"));
    this.els.langJa.classList.toggle("active", current === "ja");
    this.els.langJa.setAttribute("aria-pressed", String(current === "ja"));
  }
}
