import { num, setText } from "../controlsDom";
import { DEFAULT_GRID_BRIGHTNESS, aggressivityFromPosition, parseManeuverAggressivity, positionFromAggressivity } from "../controlsFormat";
import type { I18n, Language } from "../../i18n";
import type { TrackingInput } from "../trackingInput";
import type { DisplayPreferences, SettingsStore, TrackingUnit } from "../../../appstate";
import type { ItemNameCatalog } from "../../../gamedata/itemNames";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "../popup";
import type { RangeOverlayController } from "../rangeOverlay";

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
  readonly canvasSettingsTrigger: HTMLButtonElement;
  readonly canvasSettingsPopup: HTMLElement;
  readonly zoomSlider: HTMLInputElement;
  readonly zoomValue: HTMLElement;
  readonly autoZoomCheckbox: HTMLInputElement;
}

export interface PreferencesController {
  readonly popup: Popup;
  getSpeed(): number;
  getGridBrightness(): number;
  getAutoZoom(): boolean;
  getZoomFactor(): number;
  setLanguage(language: Language): void;
  applyPreferences(preferences: DisplayPreferences): void;
  restore(preferences: DisplayPreferences): void;
  savePreferences(): void;
  capture(): DisplayPreferences;
  setTrackingUnit(unit: TrackingUnit): void;
  onGridBrightnessChange(): void;
  updateGridBrightnessDisplay(value?: number): void;
  onManeuverAggressivityChange(): void;
  updateManeuverAggressivityDisplay(value?: number): void;
  updateManeuverAggressivityEnabled(isMidships: boolean): void;
  getManeuverAggressivity(): number;
  onZoomChange(): void;
  onAutoZoomChange(): void;
  updateZoomDisplay(value?: number): void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export class PreferencesControllerImpl implements PreferencesController {
  readonly trackingInput: TrackingInput;
  private readonly els: PreferencesEls;
  private readonly i18n: I18n;
  private readonly settingsStore: SettingsStore;
  private readonly sigResolution: () => number;
  private readonly events: UiEvents;
  private readonly itemNameCatalog: ItemNameCatalog;
  private readonly rangeOverlayController: RangeOverlayController;
  private readonly popupGroup: PopupGroup;
  private readonly canvasSettingsPopupValue: Popup;
  private canvasSettingsOpen = false;

  constructor(deps: {
    els: PreferencesEls;
    i18n: I18n;
    settingsStore: SettingsStore;
    trackingInput: TrackingInput;
    sigResolution: () => number;
    events: UiEvents;
    itemNameCatalog: ItemNameCatalog;
    rangeOverlayController: RangeOverlayController;
    popupGroup: PopupGroup;
  }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.settingsStore = deps.settingsStore;
    this.trackingInput = deps.trackingInput;
    this.sigResolution = deps.sigResolution;
    this.events = deps.events;
    this.itemNameCatalog = deps.itemNameCatalog;
    this.rangeOverlayController = deps.rangeOverlayController;
    this.popupGroup = deps.popupGroup;
    this.canvasSettingsPopupValue = {
      isOpen: () => this.canvasSettingsOpen,
      open: () => this.openCanvasSettings(),
      close: () => this.closeCanvasSettings(),
      focusTrigger: () => this.els.canvasSettingsTrigger.focus(),
      contains: (target) => this.containsCanvasSettings(target),
    };
    this.popupGroup.register(this.canvasSettingsPopupValue);
    this.els.trackingUnitRad.addEventListener("click", () => this.onTrackingUnitClick("rad"));
    this.els.trackingUnitScore.addEventListener("click", () => this.onTrackingUnitClick("score"));
    this.els.langEn.addEventListener("click", () => this.setLanguage("en"));
    this.els.langZh.addEventListener("click", () => this.setLanguage("zh"));
    this.els.langJa.addEventListener("click", () => this.setLanguage("ja"));
    this.els.maneuverAggressivitySlider.addEventListener("input", () => this.onManeuverAggressivityChange());
    this.els.gridBrightnessSlider.addEventListener("input", () => this.onGridBrightnessChange());
    this.els.canvasSettingsTrigger.addEventListener("click", () => this.toggleCanvasSettings());
    this.els.zoomSlider.addEventListener("input", () => this.onZoomChange());
    this.els.autoZoomCheckbox.addEventListener("change", () => this.onAutoZoomChange());
  }

  get popup(): Popup { return this.canvasSettingsPopupValue; }

  getSpeed(): number { return num(this.els.simSpeed); }

  getGridBrightness(): number {
    const value = Number.parseFloat(this.els.gridBrightnessSlider.value);
    if (!Number.isFinite(value)) return DEFAULT_GRID_BRIGHTNESS;
    return Math.max(0, Math.min(1, value));
  }

  getAutoZoom(): boolean { return this.els.autoZoomCheckbox.checked; }

  getZoomFactor(): number {
    const value = Number.parseFloat(this.els.zoomSlider.value);
    if (!Number.isFinite(value)) return 1;
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
  }

  setLanguage(language: Language): void {
    this.applyLanguage(language);
    this.savePreferences();
    this.loadPackAndRefresh(language);
  }

  applyPreferences(preferences: DisplayPreferences): void { this.applyDisplayPreferences(preferences); }

  restore(preferences: DisplayPreferences): void { this.applyDisplayPreferences(preferences); }

  savePreferences(): void { this.settingsStore.savePreferences(this.capture()); }

  capture(): DisplayPreferences {
    return {
      language: this.i18n.current(),
      trackingUnit: this.trackingInput.unit,
      simSpeed: num(this.els.simSpeed),
      gridBrightness: this.getGridBrightness(),
      hiddenRangeOverlays: this.rangeOverlayController.hiddenKinds(),
      autoZoom: this.getAutoZoom(),
      zoomFactor: this.getZoomFactor(),
    };
  }

  setTrackingUnit(unit: TrackingUnit): void {
    this.els.tracking.value = String(this.trackingInput.setUnit(unit, this.sigResolution()));
    this.updateUnitToggle();
    this.savePreferences();
    this.events.emitDisplayInvalidated();
  }

  onGridBrightnessChange(): void {
    this.updateGridBrightnessDisplay();
    this.savePreferences();
    this.events.emitDisplayInvalidated();
  }

  updateGridBrightnessDisplay(value?: number): void {
    const slider = this.els.gridBrightnessSlider;
    const output = this.els.gridBrightnessValue;
    const current = value ?? this.getGridBrightness();
    slider.value = String(current);
    setText(output, `${Math.round(current * 100)}%`);
    if ("setProperty" in slider.style) slider.style.setProperty("--fill", `${current * 100}%`);
  }

  onManeuverAggressivityChange(): void {
    const slider = this.els.maneuverAggressivitySlider;
    const pos = Number.parseFloat(slider.value);
    const value = Math.round(aggressivityFromPosition(pos) * 100) / 100;
    this.updateManeuverAggressivityDisplay(value);
    this.savePreferences();
    this.events.emitConfigInvalidated(true);
  }

  updateManeuverAggressivityDisplay(value?: number): void {
    const input = this.els.maneuverAggressivity;
    const slider = this.els.maneuverAggressivitySlider;
    const output = this.els.maneuverAggressivityValue;
    const current = value ?? this.getManeuverAggressivity();
    input.value = String(current);
    setText(output, current.toFixed(2));
    const pos = positionFromAggressivity(current);
    slider.value = String(pos);
    if ("setProperty" in slider.style) slider.style.setProperty("--fill", `${pos * 100}%`);
  }

  updateManeuverAggressivityEnabled(isMidships: boolean): void { this.els.maneuverAggressivitySlider.disabled = isMidships; }

  getManeuverAggressivity(): number { return parseManeuverAggressivity(this.els.maneuverAggressivity); }

  onZoomChange(): void {
    this.updateZoomDisplay();
    this.savePreferences();
    this.events.emitDisplayInvalidated();
  }

  onAutoZoomChange(): void {
    const autoZoom = this.getAutoZoom();
    this.els.zoomSlider.disabled = autoZoom;
    this.updateZoomDisplay();
    this.savePreferences();
    this.events.emitDisplayInvalidated();
  }

  updateZoomDisplay(value?: number): void {
    const slider = this.els.zoomSlider;
    const output = this.els.zoomValue;
    const current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value ?? this.getZoomFactor()));
    slider.value = String(current);
    setText(output, `${current.toFixed(2)}x`);
    const fill = ((current - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;
    if ("setProperty" in slider.style) slider.style.setProperty("--fill", `${fill}%`);
  }

  private onTrackingUnitClick(unit: TrackingUnit): void { this.setTrackingUnit(unit); }

  private applyLanguage(language: Language): void {
    this.i18n.setLanguage(language);
    this.updateLanguageToggle();
  }

  private applyDisplayPreferences(preferences: DisplayPreferences): void {
    this.applyLanguage(preferences.language);
    this.els.tracking.value = String(this.trackingInput.setUnit(preferences.trackingUnit, this.sigResolution()));
    this.els.simSpeed.value = String(preferences.simSpeed);
    this.updateGridBrightnessDisplay(preferences.gridBrightness);
    this.rangeOverlayController.restoreHidden(preferences.hiddenRangeOverlays);
    this.updateUnitToggle();
    this.els.autoZoomCheckbox.checked = preferences.autoZoom ?? true;
    this.els.zoomSlider.disabled = preferences.autoZoom ?? true;
    this.updateZoomDisplay(preferences.zoomFactor);
    if (preferences.language !== "en") this.loadPackAndRefresh(preferences.language);
  }

  private loadPackAndRefresh(language: Language): void {
    void this.itemNameCatalog
      .ensureLanguage(language)
      .then(() => this.events.emitLanguageChanged())
      .catch(() => this.events.emitLanguageChanged());
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

  private toggleCanvasSettings(): void {
    if (this.canvasSettingsOpen) this.closeCanvasSettings();
    else this.popupGroup.open(this.canvasSettingsPopupValue);
  }

  private openCanvasSettings(): void {
    this.els.canvasSettingsPopup.hidden = false;
    this.canvasSettingsOpen = true;
    this.els.canvasSettingsTrigger.setAttribute("aria-expanded", "true");
  }

  private closeCanvasSettings(): void {
    if (!this.canvasSettingsOpen && this.els.canvasSettingsPopup.hidden) return;
    this.els.canvasSettingsPopup.hidden = true;
    this.canvasSettingsOpen = false;
    this.els.canvasSettingsTrigger.setAttribute("aria-expanded", "false");
  }

  private containsCanvasSettings(target: EventTarget): boolean {
    if (!(target instanceof Element)) return false;
    return this.els.canvasSettingsPopup.contains(target) || this.els.canvasSettingsTrigger.contains(target);
  }
}
