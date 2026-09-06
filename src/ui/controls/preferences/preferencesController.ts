import { num, setText } from "../controlsDom";
import { DEFAULT_GRID_BRIGHTNESS } from "../controlsFormat";
import type { I18n, Language } from "../../i18n";
import type { DisplayPreferences, HpValueDisplay, SettingsStore, TrackingUnit, WeaponRangeVisibility } from "../../../appstate";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "../popup";
import type { RangeOverlayController } from "../rangeOverlay";
import type { TurretController } from "../turret";
import type { DroneController } from "../drone";
import type { Side } from "../side";
import type { ItemNameLoader } from "../../../gamedata";
import type { PortraitsController } from "../portraits";

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
  readonly hpValueNone: HTMLButtonElement;
  readonly hpValuePercentage: HTMLButtonElement;
  readonly hpValueAbsolute: HTMLButtonElement;
  readonly weaponRangeButton: HTMLButtonElement;
  readonly droneRangeButton: HTMLButtonElement;
  readonly droneControlRangeButton: HTMLButtonElement;
}

export interface PreferencesController {
  readonly popup: Popup;
  getSpeed(): number;
  getGridBrightness(): number;
  getAutoZoom(): boolean;
  getZoomFactor(): number;
  getWeaponRangeVisibility(): WeaponRangeVisibility;
  getDroneRangeVisibility(): WeaponRangeVisibility;
  getDroneControlRangeVisibility(): WeaponRangeVisibility;
  getHpValueDisplay(): HpValueDisplay;
  setLanguage(language: Language): void;
  applyPreferences(preferences: DisplayPreferences): void;
  restore(preferences: DisplayPreferences): void;
  savePreferences(): void;
  capture(): DisplayPreferences;
  setTrackingUnit(side: Side, unit: TrackingUnit): void;
  cycleWeaponRange(): void;
  cycleDroneRange(): void;
  cycleDroneControlRange(): void;
  setHpValueDisplay(mode: HpValueDisplay): void;
  onGridBrightnessChange(): void;
  updateGridBrightnessDisplay(value?: number): void;
  onZoomChange(): void;
  onAutoZoomChange(): void;
  updateZoomDisplay(value?: number): void;
}

const WEAPON_RANGE_CYCLE: readonly WeaponRangeVisibility[] = ["both", "shipA", "shipB", "none"];

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export class PreferencesControllerImpl implements PreferencesController {
  private readonly els: PreferencesEls;
  private readonly i18n: I18n;
  private readonly settingsStore: SettingsStore;
  private readonly shipATurretController: TurretController;
  private readonly shipBTurretController: TurretController;
  private readonly shipADroneController: DroneController;
  private readonly shipBDroneController: DroneController;
  private readonly events: UiEvents;
  private readonly rangeOverlayController: RangeOverlayController;
  private readonly popupGroup: PopupGroup;
  private readonly itemNameLoader: ItemNameLoader;
  private readonly portraitsController: PortraitsController;
  private readonly canvasSettingsPopupValue: Popup;
  private canvasSettingsOpen = false;
  private weaponRangeVisibility: WeaponRangeVisibility = "both";
  private droneRangeVisibility: WeaponRangeVisibility = "none";
  private droneControlRangeVisibility: WeaponRangeVisibility = "none";
  private hpValueDisplay: HpValueDisplay = "none";

  constructor(deps: {
    els: PreferencesEls;
    i18n: I18n;
    settingsStore: SettingsStore;
    shipATurretController: TurretController;
    shipBTurretController: TurretController;
    shipADroneController: DroneController;
    shipBDroneController: DroneController;
    events: UiEvents;
    rangeOverlayController: RangeOverlayController;
    popupGroup: PopupGroup;
    itemNameLoader: ItemNameLoader;
    portraitsController: PortraitsController;
  }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.settingsStore = deps.settingsStore;
    this.shipATurretController = deps.shipATurretController;
    this.shipBTurretController = deps.shipBTurretController;
    this.shipADroneController = deps.shipADroneController;
    this.shipBDroneController = deps.shipBDroneController;
    this.events = deps.events;
    this.rangeOverlayController = deps.rangeOverlayController;
    this.popupGroup = deps.popupGroup;
    this.itemNameLoader = deps.itemNameLoader;
    this.portraitsController = deps.portraitsController;
    this.canvasSettingsPopupValue = {
      isOpen: () => this.canvasSettingsOpen,
      open: () => this.openCanvasSettings(),
      close: () => this.closeCanvasSettings(),
      focusTrigger: () => this.els.canvasSettingsTrigger.focus(),
      contains: (domTarget) => this.containsCanvasSettings(domTarget),
    };
    this.popupGroup.register(this.canvasSettingsPopupValue);
    for (const side of Object.keys(this.els.trackingUnit) as Side[]) {
      this.els.trackingUnit[side].rad.addEventListener("click", () => this.onTrackingUnitClick(side, "rad"));
      this.els.trackingUnit[side].score.addEventListener("click", () => this.onTrackingUnitClick(side, "score"));
    }
    this.els.langEn.addEventListener("click", () => this.setLanguage("en"));
    this.els.langZh.addEventListener("click", () => this.setLanguage("zh"));
    this.els.langJa.addEventListener("click", () => this.setLanguage("ja"));
    this.els.gridBrightnessSlider.addEventListener("input", () => this.onGridBrightnessChange());
    this.els.canvasSettingsTrigger.addEventListener("click", () => this.toggleCanvasSettings());
    this.els.zoomSlider.addEventListener("input", () => this.onZoomChange());
    this.els.weaponRangeButton.addEventListener("click", () => this.cycleWeaponRange());
    this.els.droneRangeButton.addEventListener("click", () => this.cycleDroneRange());
    this.els.droneControlRangeButton.addEventListener("click", () => this.cycleDroneControlRange());
    this.els.autoZoomCheckbox.addEventListener("change", () => this.onAutoZoomChange());
    this.els.hpValueNone.addEventListener("click", () => this.setHpValueDisplay("none"));
    this.els.hpValuePercentage.addEventListener("click", () => this.setHpValueDisplay("percentage"));
    this.els.hpValueAbsolute.addEventListener("click", () => this.setHpValueDisplay("absolute"));
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
      shipATrackingUnit: this.shipATurretController.trackingUnit(),
      shipBTrackingUnit: this.shipBTurretController.trackingUnit(),
      weaponRangeVisibility: this.weaponRangeVisibility,
      droneRangeVisibility: this.droneRangeVisibility,
      droneControlRangeVisibility: this.droneControlRangeVisibility,
      simSpeed: num(this.els.simSpeed),
      gridBrightness: this.getGridBrightness(),
      rangeOverlayVisibility: this.rangeOverlayController.overlayVisibility(),
      autoZoom: this.getAutoZoom(),
      zoomFactor: this.getZoomFactor(),
      hpValueDisplay: this.hpValueDisplay,
    };
  }

  getWeaponRangeVisibility(): WeaponRangeVisibility {
    return this.weaponRangeVisibility;
  }

  getDroneRangeVisibility(): WeaponRangeVisibility {
    return this.droneRangeVisibility;
  }

  getDroneControlRangeVisibility(): WeaponRangeVisibility {
    return this.droneControlRangeVisibility;
  }

  getHpValueDisplay(): HpValueDisplay {
    return this.hpValueDisplay;
  }

  setHpValueDisplay(mode: HpValueDisplay): void {
    this.hpValueDisplay = mode;
    this.updateHpValueDisplayToggle();
    this.portraitsController.setHpValueDisplay(mode);
    this.savePreferences();
  }

  cycleWeaponRange(): void {
    this.weaponRangeVisibility = cycleVisibility(WEAPON_RANGE_CYCLE, this.weaponRangeVisibility);
    this.updateWeaponRangeButton();
    this.savePreferences();
    this.events.emitDisplayInvalidated();
  }

  cycleDroneRange(): void {
    this.droneRangeVisibility = cycleDroneVisibility(this.shipADroneController, this.shipBDroneController, this.droneRangeVisibility);
    this.updateRangeButton(this.els.droneRangeButton, this.droneRangeVisibility, "label.droneRange");
    this.savePreferences();
    this.events.emitDisplayInvalidated();
  }

  cycleDroneControlRange(): void {
    this.droneControlRangeVisibility = cycleDroneVisibility(this.shipADroneController, this.shipBDroneController, this.droneControlRangeVisibility);
    this.updateRangeButton(this.els.droneControlRangeButton, this.droneControlRangeVisibility, "label.droneControlRange");
    this.savePreferences();
    this.events.emitDisplayInvalidated();
  }

  setTrackingUnit(side: Side, unit: TrackingUnit): void {
    const controller = side === "shipA" ? this.shipATurretController : this.shipBTurretController;
    controller.setTrackingUnit(unit);
    this.updateUnitToggle("shipA");
    this.updateUnitToggle("shipB");
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

  private onTrackingUnitClick(side: Side, unit: TrackingUnit): void { this.setTrackingUnit(side, unit); }

  private applyLanguage(language: Language): void {
    this.i18n.setLanguage(language);
    this.updateLanguageToggle();
    this.updateWeaponRangeButton();
    this.updateRangeButton(this.els.droneRangeButton, this.droneRangeVisibility, "label.droneRange");
    this.updateRangeButton(this.els.droneControlRangeButton, this.droneControlRangeVisibility, "label.droneControlRange");
  }

  private applyDisplayPreferences(preferences: DisplayPreferences): void {
    this.applyLanguage(preferences.language);
    this.shipATurretController.setTrackingUnit(preferences.shipATrackingUnit);
    this.shipBTurretController.setTrackingUnit(preferences.shipBTrackingUnit);
    this.weaponRangeVisibility = preferences.weaponRangeVisibility;
    this.droneRangeVisibility = preferences.droneRangeVisibility;
    this.droneControlRangeVisibility = preferences.droneControlRangeVisibility;
    this.els.simSpeed.value = String(preferences.simSpeed);
    this.updateGridBrightnessDisplay(preferences.gridBrightness);
    this.rangeOverlayController.restoreVisibility(preferences.rangeOverlayVisibility);
    this.updateUnitToggle("shipA");
    this.updateUnitToggle("shipB");
    this.updateWeaponRangeButton();
    this.updateRangeButton(this.els.droneRangeButton, this.droneRangeVisibility, "label.droneRange");
    this.updateRangeButton(this.els.droneControlRangeButton, this.droneControlRangeVisibility, "label.droneControlRange");
    this.els.autoZoomCheckbox.checked = preferences.autoZoom ?? true;
    this.els.zoomSlider.disabled = preferences.autoZoom ?? true;
    this.updateZoomDisplay(preferences.zoomFactor);
    this.hpValueDisplay = preferences.hpValueDisplay ?? "none";
    this.updateHpValueDisplayToggle();
    this.portraitsController.setHpValueDisplay(this.hpValueDisplay);
    if (preferences.language !== "en") this.loadPackAndRefresh(preferences.language);
  }

  private loadPackAndRefresh(language: Language): void {
    this.events.emitLanguageChanged();
    this.itemNameLoader.ensureLoaded(language);
  }

  private updateUnitToggle(side: Side): void {
    const controller = side === "shipA" ? this.shipATurretController : this.shipBTurretController;
    const unit = controller.trackingUnit();
    const buttons = this.els.trackingUnit[side];
    buttons.rad.setAttribute("aria-pressed", String(unit === "rad"));
    buttons.score.setAttribute("aria-pressed", String(unit === "score"));
  }

  private updateWeaponRangeButton(): void {
    this.updateRangeButton(this.els.weaponRangeButton, this.weaponRangeVisibility, "label.weaponRange");
    this.els.weaponRangeButton.setAttribute("data-weapon-range", this.weaponRangeVisibility);
  }

  private updateRangeButton(button: HTMLButtonElement, visibility: WeaponRangeVisibility, labelKey: string): void {
    const visible = visibility !== "none";
    button.setAttribute("aria-pressed", String(visible));
    button.textContent = this.i18n.t(labelKey);
  }

  private updateLanguageToggle(): void {
    const current = this.i18n.current();
    this.els.langEn.setAttribute("aria-pressed", String(current === "en"));
    this.els.langZh.setAttribute("aria-pressed", String(current === "zh"));
    this.els.langJa.setAttribute("aria-pressed", String(current === "ja"));
  }

  private updateHpValueDisplayToggle(): void {
    this.els.hpValueNone.setAttribute("aria-pressed", String(this.hpValueDisplay === "none"));
    this.els.hpValuePercentage.setAttribute("aria-pressed", String(this.hpValueDisplay === "percentage"));
    this.els.hpValueAbsolute.setAttribute("aria-pressed", String(this.hpValueDisplay === "absolute"));
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

function cycleVisibility(cycle: readonly WeaponRangeVisibility[], current: WeaponRangeVisibility): WeaponRangeVisibility {
  const index = cycle.indexOf(current);
  return cycle[(index + 1) % cycle.length];
}

function cycleDroneVisibility(shipA: DroneController, shipB: DroneController, current: WeaponRangeVisibility): WeaponRangeVisibility {
  const hasA = shipA.currentDroneSpecs().length > 0;
  const hasB = shipB.currentDroneSpecs().length > 0;
  const cycle = droneRangeCycle(hasA, hasB);
  const index = cycle.indexOf(current);
  if (index < 0) return cycle[0];
  return cycle[(index + 1) % cycle.length];
}

function droneRangeCycle(hasA: boolean, hasB: boolean): readonly WeaponRangeVisibility[] {
  if (hasA && hasB) return ["both", "shipA", "shipB", "none"];
  if (hasA) return ["both", "shipA", "none"];
  if (hasB) return ["both", "shipB", "none"];
  return ["none"];
}
