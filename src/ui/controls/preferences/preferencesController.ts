import { num, setText } from "../controlsDom";
import { DEFAULT_GRID_BRIGHTNESS } from "../controlsFormat";
import type { I18n, Language } from "../../i18n";
import type { DisplayPreferences, SettingsStore, TrackingUnit } from "../../../appstate";
import type { ItemNameCatalog } from "../../../gamedata/itemNames";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "../popup";
import type { RangeOverlayController } from "../rangeOverlay";
import type { TurretController } from "../turret";
import type { Side } from "../side";

export interface PreferencesEls {
  readonly trackingUnit: Readonly<Record<Side, { readonly rad: HTMLButtonElement; readonly score: HTMLButtonElement }>>;
  readonly langEn: HTMLButtonElement;
  readonly langZh: HTMLButtonElement;
  readonly langJa: HTMLButtonElement;
  readonly gridBrightnessSlider: HTMLInputElement;
  readonly gridBrightnessValue: HTMLElement;
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
  onZoomChange(): void;
  onAutoZoomChange(): void;
  updateZoomDisplay(value?: number): void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export class PreferencesControllerImpl implements PreferencesController {
  private readonly els: PreferencesEls;
  private readonly i18n: I18n;
  private readonly settingsStore: SettingsStore;
  private readonly shipATurretController: TurretController;
  private readonly shipBTurretController: TurretController;
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
    shipATurretController: TurretController;
    shipBTurretController: TurretController;
    events: UiEvents;
    itemNameCatalog: ItemNameCatalog;
    rangeOverlayController: RangeOverlayController;
    popupGroup: PopupGroup;
  }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.settingsStore = deps.settingsStore;
    this.shipATurretController = deps.shipATurretController;
    this.shipBTurretController = deps.shipBTurretController;
    this.events = deps.events;
    this.itemNameCatalog = deps.itemNameCatalog;
    this.rangeOverlayController = deps.rangeOverlayController;
    this.popupGroup = deps.popupGroup;
    this.canvasSettingsPopupValue = {
      isOpen: () => this.canvasSettingsOpen,
      open: () => this.openCanvasSettings(),
      close: () => this.closeCanvasSettings(),
      focusTrigger: () => this.els.canvasSettingsTrigger.focus(),
      contains: (domTarget) => this.containsCanvasSettings(domTarget),
    };
    this.popupGroup.register(this.canvasSettingsPopupValue);
    for (const unit of Object.values(this.els.trackingUnit)) {
      unit.rad.addEventListener("click", () => this.onTrackingUnitClick("rad"));
      unit.score.addEventListener("click", () => this.onTrackingUnitClick("score"));
    }
    this.els.langEn.addEventListener("click", () => this.setLanguage("en"));
    this.els.langZh.addEventListener("click", () => this.setLanguage("zh"));
    this.els.langJa.addEventListener("click", () => this.setLanguage("ja"));
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
      trackingUnit: this.shipATurretController.trackingUnit(),
      simSpeed: num(this.els.simSpeed),
      gridBrightness: this.getGridBrightness(),
      hiddenRangeOverlays: this.rangeOverlayController.hiddenKinds(),
      autoZoom: this.getAutoZoom(),
      zoomFactor: this.getZoomFactor(),
    };
  }

  setTrackingUnit(unit: TrackingUnit): void {
    this.shipATurretController.setTrackingUnit(unit);
    this.shipBTurretController.setTrackingUnit(unit);
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
    this.shipATurretController.setTrackingUnit(preferences.trackingUnit);
    this.shipBTurretController.setTrackingUnit(preferences.trackingUnit);
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
    const unit = this.shipATurretController.trackingUnit();
    for (const buttons of Object.values(this.els.trackingUnit)) {
      buttons.rad.setAttribute("aria-pressed", String(unit === "rad"));
      buttons.score.setAttribute("aria-pressed", String(unit === "score"));
    }
  }

  private updateLanguageToggle(): void {
    const current = this.i18n.current();
    this.els.langEn.setAttribute("aria-pressed", String(current === "en"));
    this.els.langZh.setAttribute("aria-pressed", String(current === "zh"));
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

  private containsCanvasSettings(domTarget: EventTarget): boolean {
    if (!(domTarget instanceof Element)) return false;
    return this.els.canvasSettingsPopup.contains(domTarget) || this.els.canvasSettingsTrigger.contains(domTarget);
  }
}
