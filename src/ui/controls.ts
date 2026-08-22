import type { FittedHull, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, Ships, SkillLevel, StatConditions } from "../ships";
import {
  SIG_RESOLUTIONS,
  alignTime,
  type EngagementFrame,
  type HitChance,
  type HitChanceBreakdown,
  type ShipConfig,
  type SigResolutionClass,
  type SimConfig,
  type TurretSpec,
} from "../sim";
import {
  describeFitting,
  gunFamilyOf,
  gunIconNames,
  type CargoCharge,
  type ChargeCatalog,
  type ChargeOption,
  type FittingImport,
  type FittingSummary,
  type ImportedFitting,
  type ImportedTurret,
  type PresetFittings,
} from "../fitting";
import type { I18n, Language } from "./i18n";
import type { ImageCatalog } from "./imageCatalog";
import { DomFittingPreview, type FittingPreview } from "./fittingPreview";
import type { SavedFittings } from "./savedFittings";
import {
  ClipboardUnavailableError,
  PROPULSION_NONE,
  USER_SETTINGS_VERSION,
  type ClipboardProvider,
  type DisplayPreferences,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type ProfileSettings,
  type PropulsionSelection,
  type SettingsStore,
  type UserSettings,
} from "./settings";
import { TrackingInput, type TrackingUnit } from "./trackingInput";
import { parseProfile, PROFILE_TEXT_HEADER, serializeProfile } from "./profileText";
import { HintRotator, type IHintRotator } from "./hintRotator";
import { HINT_CANDIDATES, TIP_TEXT } from "./hints";
import type { TimeoutId, Timer } from "./timer";

export interface ControlsCallbacks {
  readonly onReset: () => void;
  readonly onConfigChange: () => void;
  readonly onDisplayChange: () => void;
  readonly onPlayPause: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

export interface Controls {
  getTurret(): TurretSpec;
  getTargetSig(): number;
  getConfig(): SimConfig;
  getSpeed(): number;
  getGridBrightness(): number;
  update(frame: EngagementFrame, hit: HitChanceBreakdown): void;
  setPlaying(playing: boolean): void;
  setCallbacks(callbacks: ControlsCallbacks): void;
}

export class DomControls implements Controls {
  private readonly els: Record<string, HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLImageElement | HTMLElement>;
  private readonly hitChance: HitChance;
  private readonly i18n: I18n;
  private readonly settingsStore: SettingsStore;
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly presetFittings: PresetFittings;
  private readonly savedFittings: SavedFittings;
  private readonly clipboard: ClipboardProvider;
  private readonly timer: Timer;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly imageCatalog: ImageCatalog;
  private readonly trackingInput: TrackingInput;
  private readonly hintRotator: IHintRotator;
  private readonly attackerPreview: FittingPreview;
  private readonly targetPreview: FittingPreview;
  private callbacks?: ControlsCallbacks;
  private playing = false;
  private shareStatusTimeout?: TimeoutId;
  private readonly importHintTimeouts: { attacker?: TimeoutId; target?: TimeoutId } = { attacker: undefined, target: undefined };
  private openSkillSide: "attacker" | "target" | null = null;
  private openPasteSide: "attacker" | "target" | null = null;
  private openFittingSide: "attacker" | "target" | null = null;
  private openPropulsionVariantSide: "attacker" | "target" | null = null;
  private importSidePopupOpen = false;
  private pendingImportText?: string;
  private openPreviewSide: "attacker" | "target" | null = null;
  private currentPreviewAnchor?: HTMLElement;
  private currentPreviewText?: string;
  private readonly previewShowTimeouts: { attacker?: TimeoutId; target?: TimeoutId } = { attacker: undefined, target: undefined };
  private readonly previewHideTimeouts: { attacker?: TimeoutId; target?: TimeoutId } = { attacker: undefined, target: undefined };
  private openAmmo = false;
  private attackerAmmo = "";
  private attackerTurret?: ImportedTurret;
  private attackerCargoCharges: readonly CargoCharge[] = [];
  private attackerAmmoAllExpanded = false;
  private lastCommittedHull: { attacker?: string; target?: string } = {};
  private attackerProfile?: ShipProfile;
  private targetProfile?: ShipProfile;
  private attackerFittedHull?: FittedHullSummary;
  private targetFittedHull?: FittedHullSummary;
  private attackerFitting?: string;
  private targetFitting?: string;
  private attackerOverrides: Partial<ProfileParamOverrides> = {};
  private targetOverrides: Partial<ProfileParamOverrides> = {};
  private selectedProfile: ProfileSettings | null = null;
  private readonly sigResOriginalTitles: Partial<Record<SigResolutionClass, string>> = {};

  constructor({
    hitChance,
    i18n,
    settingsStore,
    ships,
    fittingImport,
    presetFittings,
    savedFittings,
    clipboard,
    timer,
    chargeCatalog,
    imageCatalog,
  }: {
    hitChance: HitChance;
    i18n: I18n;
    settingsStore: SettingsStore;
    ships: Ships;
    fittingImport: FittingImport;
    presetFittings: PresetFittings;
    savedFittings: SavedFittings;
    clipboard: ClipboardProvider;
    timer: Timer;
    chargeCatalog: ChargeCatalog;
    imageCatalog: ImageCatalog;
  }) {
    this.hitChance = hitChance;
    this.i18n = i18n;
    this.settingsStore = settingsStore;
    this.ships = ships;
    this.fittingImport = fittingImport;
    this.presetFittings = presetFittings;
    this.savedFittings = savedFittings;
    this.clipboard = clipboard;
    this.timer = timer;
    this.chargeCatalog = chargeCatalog;
    this.imageCatalog = imageCatalog;
    this.attackerAmmo = chargeCatalog.usualForChargeSize(1);
    this.trackingInput = new TrackingInput();
    this.hintRotator = new HintRotator({
      element: el("slide-hints"),
      i18n,
      candidates: HINT_CANDIDATES,
      tipText: TIP_TEXT,
      timer,
      intervalMs: 20_000,
    });
    this.els = {
      tracking: el("tracking"),
      trackingUnitRad: el("tracking-unit-rad"),
      trackingUnitScore: el("tracking-unit-score"),
      sigRes: el("sigRes"),
      sigResOptions: el("sig-res-options"),
      optimal: el("optimal"),
      falloff: el("falloff"),
      attackerAmmoField: el("attacker-ammo-field"),
      attackerAmmoTrigger: el("attacker-ammo-trigger"),
      attackerAmmoSummary: el("attacker-ammo-summary"),
      attackerAmmoSummaryIcon: el("attacker-ammo-summary-icon"),
      attackerAmmoPopup: el("attacker-ammo-popup"),
      attackerAmmoCargoLabel: el("attacker-ammo-cargo-label"),
      attackerAmmoCargoList: el("attacker-ammo-cargo-list"),
      attackerAmmoExpand: el("attacker-ammo-expand"),
      attackerAmmoAllSection: el("attacker-ammo-all-section"),
      attackerAmmoAllList: el("attacker-ammo-all-list"),
      hullOptions: el("hull-options"),
      attackerHull: el("attacker-hull"),
      attackerShipImage: el("attacker-ship-image"),
      attackerFittingTrigger: el("attacker-fitting-trigger"),
      attackerFittingPopup: el("attacker-fitting-popup"),
      attackerFittingPreview: el("attacker-fitting-preview"),
      attackerFittingSavedLabel: el("attacker-fitting-saved-label"),
      attackerFittingSavedList: el("attacker-fitting-saved-list"),
      attackerFittingPresetLabel: el("attacker-fitting-preset-label"),
      attackerFittingPresetList: el("attacker-fitting-preset-list"),
      attackerFittingEmpty: el("attacker-fitting-empty"),
      attackerHullHint: el("attacker-hull-hint"),
      attackerFittingName: el("attacker-fitting-name"),
      attackerImportFitting: el("attacker-import-fitting"),
      attackerImportStatus: el("attacker-import-status"),
      attackerPastePopup: el("attacker-paste-popup"),
      attackerPasteInput: el("attacker-paste-input"),
      attackerPropulsion: el("attacker-propulsion"),
      attackerPropulsionOptions: el("attacker-propulsion-options"),
      attackerPropulsionGear: el("attacker-propulsion-gear"),
      attackerPropulsionVariants: el("attacker-propulsion-variants"),
      attackerSkills: el("attacker-skills"),
      attackerSkillOptions: el("attacker-skill-options"),
      attackerSkillSummary: el("attacker-skill-summary"),
      attackerSkillTrigger: el("attacker-skill-trigger"),
      attackerSkillPopup: el("attacker-skill-popup"),
      attackerOverload: el("attacker-overload"),
      attackerOverloadButton: el("attacker-overload-button"),
      attackerSpeed: el("attacker-speed"),
      attackerMass: el("attacker-mass"),
      attackerInertia: el("attacker-inertia"),
      attackerAlignTime: el("attacker-align-time"),
      attackerMode: el("attacker-mode"),
      attackerRange: el("attacker-range"),
      maneuverAggressivity: el("maneuver-aggressivity"),
      maneuverAggressivitySlider: el("maneuver-aggressivity-slider"),
      maneuverAggressivityValue: el("maneuver-aggressivity-value"),
      initialDistance: el("initial-distance"),
      targetHull: el("target-hull"),
      targetShipImage: el("target-ship-image"),
      targetFittingTrigger: el("target-fitting-trigger"),
      targetFittingPopup: el("target-fitting-popup"),
      targetFittingPreview: el("target-fitting-preview"),
      targetFittingSavedLabel: el("target-fitting-saved-label"),
      targetFittingSavedList: el("target-fitting-saved-list"),
      targetFittingPresetLabel: el("target-fitting-preset-label"),
      targetFittingPresetList: el("target-fitting-preset-list"),
      targetFittingEmpty: el("target-fitting-empty"),
      targetHullHint: el("target-hull-hint"),
      targetFittingName: el("target-fitting-name"),
      targetImportFitting: el("target-import-fitting"),
      targetImportStatus: el("target-import-status"),
      targetPastePopup: el("target-paste-popup"),
      targetPasteInput: el("target-paste-input"),
      targetPropulsion: el("target-propulsion"),
      targetPropulsionOptions: el("target-propulsion-options"),
      targetPropulsionGear: el("target-propulsion-gear"),
      targetPropulsionVariants: el("target-propulsion-variants"),
      targetSkills: el("target-skills"),
      targetSkillOptions: el("target-skill-options"),
      targetSkillSummary: el("target-skill-summary"),
      targetSkillTrigger: el("target-skill-trigger"),
      targetSkillPopup: el("target-skill-popup"),
      targetOverload: el("target-overload"),
      targetOverloadButton: el("target-overload-button"),
      targetSpeed: el("target-speed"),
      targetMass: el("target-mass"),
      targetInertia: el("target-inertia"),
      targetAlignTime: el("target-align-time"),
      targetMode: el("target-mode"),
      targetRange: el("target-range"),
      targetSig: el("target-sig"),
      simSpeed: el("sim-speed"),
      profileName: el("profile-name"),
      profileSave: el("profile-save"),
      profileSelect: el("profile-select"),
      profileDelete: el("profile-delete"),
      shareLink: el("share-link"),
      importProfile: el("import-profile"),
      importSidePopup: el("import-side-popup"),
      importSideAttacker: el("import-side-attacker"),
      importSideTarget: el("import-side-target"),
      shareStatus: el("share-status"),
      langEn: el("lang-en"),
      langZh: el("lang-zh"),
      langJa: el("lang-ja"),
      play: el("play"),
      reset: el("reset"),
      resDistance: el("res-distance"),
      resTransversal: el("res-transversal"),
      resAngular: el("res-angular"),
      resRadial: el("res-radial"),
      resTrackPen: el("res-track-pen"),
      resRangePen: el("res-range-pen"),
      resHit: el("res-hit"),
      gridBrightnessSlider: el("grid-brightness-slider"),
      gridBrightnessValue: el("grid-brightness-value"),
    };

    this.attackerPreview = new DomFittingPreview({
      container: this.els.attackerFittingPreview,
      i18n: this.i18n,
      imageCatalog: this.imageCatalog,
    });
    this.targetPreview = new DomFittingPreview({
      container: this.els.targetFittingPreview,
      i18n: this.i18n,
      imageCatalog: this.imageCatalog,
    });

    this.renderAttackerAmmo();
    this.populateHullDatalist();
    this.renderSkillOptions("attacker");
    this.renderSkillOptions("target");

    this.restoreSavedState();
    this.bind();
    this.updateAlignTime("attacker");
    this.updateAlignTime("target");
  }

  private restoreSavedState(): void {
    const startup = this.settingsStore.loadStartupState();
    if (startup.settings) {
      this.loadSettings(startup.settings, startup.selectedProfileName ?? "");
      this.selectedProfile = startup.selectedProfileName ? profileSettingsOf(this.getSettings()) : null;
      this.updateSaveButtonState();
      return;
    }
    this.applyPreferences(this.settingsStore.loadPreferences());
    const selectedName = startup.selectedProfileName;
    const profile = selectedName ? this.settingsStore.loadProfile(selectedName) : null;
    if (selectedName && profile) {
      this.loadSettings(this.sessionSettings(profile), selectedName);
      this.selectedProfile = profileSettingsOf(this.getSettings());
      this.updateSaveButtonState();
      return;
    }
    this.i18n.translateDocument();
    this.setDefaultSkillAndOverload();
    this.setOverloadDisabled("attacker");
    this.setOverloadDisabled("target");
    this.updateUnitToggle();
    this.updateLanguageToggle();
    this.setBestInitialDistance();
    this.updateManeuverAggressivityDisplay();
    this.updateManeuverAggressivityEnabled();
    this.updateGridBrightnessDisplay();
    this.setPlaying(false);
    this.renderAllPropulsionOptions();
    this.renderProfiles(selectedName ?? "");
  }

  private applyPreferences(preferences: DisplayPreferences): void {
    this.i18n.setLanguage(preferences.language);
    const display = this.trackingInput.setUnit(preferences.trackingUnit, this.currentSigResolution());
    (this.els.tracking as HTMLInputElement).value = String(display);
    (this.els.simSpeed as HTMLSelectElement).value = String(preferences.simSpeed);
    this.updateGridBrightnessDisplay(preferences.gridBrightness);
  }

  private sessionSettings(profile: ProfileSettings): UserSettings {
    return {
      ...profile,
      attackerAmmo: profile.attackerAmmo ?? this.chargeCatalog.usualForChargeSize(1),
      language: this.i18n.current(),
      trackingUnit: this.trackingInput.unit,
      simSpeed: num(this.els.simSpeed),
      gridBrightness: this.getGridBrightness(),
    };
  }

  getTurret(): TurretSpec {
    return {
      tracking: this.trackingInput.rad,
      sigResolution: SIG_RESOLUTIONS[(this.els.sigRes as HTMLSelectElement).value as SigResolutionClass],
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
    };
  }

  getTargetSig(): number {
    return num(this.els.targetSig);
  }

  getConfig(): SimConfig {
    const initialDistance = Math.max(num(this.els.initialDistance), 1);
    const aggressivity = parseManeuverAggressivity(this.els.maneuverAggressivity as HTMLInputElement);
    const attacker: ShipConfig = {
      id: "attacker",
      maxSpeed: num(this.els.attackerSpeed),
      mass: num(this.els.attackerMass),
      inertiaModifier: num(this.els.attackerInertia),
      mode: (this.els.attackerMode as HTMLSelectElement).value as ShipConfig["mode"],
      desiredRange: num(this.els.attackerRange),
      aggressivity,
      orbitDirection: "cw",
    };
    const target: ShipConfig = {
      id: "target",
      maxSpeed: num(this.els.targetSpeed),
      mass: num(this.els.targetMass),
      inertiaModifier: num(this.els.targetInertia),
      mode: (this.els.targetMode as HTMLSelectElement).value as ShipConfig["mode"],
      desiredRange: num(this.els.targetRange),
      aggressivity: AGGRESSIVITY_MIN,
      orbitDirection: "cw",
    };
    return { attacker, target, initialDistance };
  }

  getSpeed(): number {
    return num(this.els.simSpeed);
  }

  getGridBrightness(): number {
    const value = Number.parseFloat((this.els.gridBrightnessSlider as HTMLInputElement).value);
    if (!Number.isFinite(value)) return DEFAULT_GRID_BRIGHTNESS;
    return Math.max(0, Math.min(1, value));
  }

  update(frame: EngagementFrame, hit: HitChanceBreakdown): void {
    const trackPenalty = Number.isFinite(hit.trackingTerm) ? (0.5 ** hit.trackingTerm) * 100 : 0;
    const rangePenalty = Number.isFinite(hit.rangeTerm) ? (0.5 ** hit.rangeTerm) * 100 : 0;

    setText(this.els.resDistance, this.formatDistance(frame.distance));
    setText(this.els.resTransversal, `${formatWithCommas(frame.transversalSpeed, 1)} m/s`);
    setText(this.els.resAngular, `${formatWithCommas(frame.angularVelocity, 4)} rad/s`);
    setText(this.els.resRadial, `${formatWithCommas(frame.radialVelocity, 1)} m/s`);
    setText(this.els.resTrackPen, `${formatWithCommas(trackPenalty, 1)}%`);
    setText(this.els.resRangePen, `${formatWithCommas(rangePenalty, 1)}%`);
    setText(this.els.resHit, `${formatWithCommas(hit.chance * 100, 1)}%`);

    (this.els.resHit as HTMLElement).style.color = hitChanceColor(hit.chance);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    (this.els.play as HTMLButtonElement).textContent = this.i18n.t(
      playing ? "button.pause" : "button.play",
    );
  }

  private onManeuverAggressivityChange(): void {
    const slider = this.els.maneuverAggressivitySlider as HTMLInputElement;
    const pos = Number.parseFloat(slider.value);
    const value = Math.round(aggressivityFromPosition(pos) * 100) / 100;
    this.updateManeuverAggressivityDisplay(value);
    this.updateSaveButtonState();
    this.savePreferences();
    this.callbacks?.onConfigChange();
  }

  private updateManeuverAggressivityDisplay(value?: number): void {
    const input = this.els.maneuverAggressivity as HTMLInputElement;
    const slider = this.els.maneuverAggressivitySlider as HTMLInputElement;
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

  private updateManeuverAggressivityEnabled(): void {
    const slider = this.els.maneuverAggressivitySlider as HTMLInputElement;
    slider.disabled = (this.els.attackerMode as HTMLSelectElement).value === "midships";
  }

  private onGridBrightnessChange(): void {
    this.updateGridBrightnessDisplay();
    this.updateSaveButtonState();
    this.savePreferences();
    this.callbacks?.onDisplayChange();
  }

  private updateGridBrightnessDisplay(value?: number): void {
    const slider = this.els.gridBrightnessSlider as HTMLInputElement;
    const output = this.els.gridBrightnessValue;
    const current = value ?? this.getGridBrightness();
    slider.value = String(current);
    setText(output, `${Math.round(current * 100)}%`);
    if ("setProperty" in slider.style) {
      slider.style.setProperty("--fill", `${current * 100}%`);
    }
  }

  setCallbacks(callbacks: ControlsCallbacks): void {
    this.callbacks = callbacks;
  }

  private getSettings(): UserSettings {
    return {
      version: USER_SETTINGS_VERSION,
      tracking: this.trackingInput.rad,
      trackingUnit: this.trackingInput.unit,
      sigRes: (this.els.sigRes as HTMLSelectElement).value as SigResolutionClass,
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
      attackerSpeed: num(this.els.attackerSpeed),
      attackerMode: (this.els.attackerMode as HTMLSelectElement).value as ShipConfig["mode"],
      attackerRange: num(this.els.attackerRange),
      maneuverAggressivity: parseManeuverAggressivity(this.els.maneuverAggressivity as HTMLInputElement),
      gridBrightness: this.getGridBrightness(),
      attackerMass: num(this.els.attackerMass),
      attackerInertia: num(this.els.attackerInertia),
      attackerSkillLevel: skillLevelFromString((this.els.attackerSkills as HTMLSelectElement).value),
      attackerOverload: (this.els.attackerOverload as HTMLInputElement).checked,
      attackerHull: this.attackerProfile?.name,
      attackerPropulsion: this.currentPropulsionSelection("attacker"),
      attackerFitting: this.attackerFitting,
      attackerOverrides: this.attackerOverrides,
      attackerFittedHull: this.attackerFittedHull,
      initialDistance: Math.max(num(this.els.initialDistance), 1),
      targetSpeed: num(this.els.targetSpeed),
      targetMode: (this.els.targetMode as HTMLSelectElement).value as ShipConfig["mode"],
      targetRange: num(this.els.targetRange),
      targetMass: num(this.els.targetMass),
      targetInertia: num(this.els.targetInertia),
      targetSkillLevel: skillLevelFromString((this.els.targetSkills as HTMLSelectElement).value),
      targetOverload: (this.els.targetOverload as HTMLInputElement).checked,
      targetSig: Math.max(num(this.els.targetSig), 1),
      targetHull: this.targetProfile?.name,
      targetPropulsion: this.currentPropulsionSelection("target"),
      targetFitting: this.targetFitting,
      targetOverrides: this.targetOverrides,
      targetFittedHull: this.targetFittedHull,
      attackerAmmo: this.attackerAmmo,
      simSpeed: num(this.els.simSpeed),
      language: this.i18n.current(),
    };
  }

  private currentPropulsionSelection(side: "attacker" | "target"): PropulsionSelection | undefined {
    const value = (this.els[`${side}Propulsion`] as HTMLSelectElement).value;
    if (value === PROPULSION_NONE) return PROPULSION_NONE;
    return this.ships.parsePropulsionId(value);
  }

  private currentPropulsionId(side: "attacker" | "target"): PropulsionId | undefined {
    const selection = this.currentPropulsionSelection(side);
    return selection === PROPULSION_NONE ? undefined : selection;
  }

  private loadSettings(settings: UserSettings, selectedName = ""): void {
    this.attackerFitting = settings.attackerFitting;
    this.attackerOverrides = settings.attackerOverrides ?? {};
    this.targetFitting = settings.targetFitting;
    this.targetOverrides = settings.targetOverrides ?? {};
    this.attackerAmmo = settings.attackerAmmo;
    this.i18n.setLanguage(settings.language);

    const sigResolution = SIG_RESOLUTIONS[settings.sigRes];
    this.trackingInput.setRadValue(settings.tracking, sigResolution);
    this.trackingInput.setUnit(settings.trackingUnit, sigResolution);

    (this.els.sigRes as HTMLSelectElement).value = settings.sigRes;
    this.setChoiceGroup(this.els.sigResOptions, settings.sigRes);
    (this.els.optimal as HTMLInputElement).value = String(settings.optimal);
    (this.els.falloff as HTMLInputElement).value = String(settings.falloff);
    (this.els.attackerSpeed as HTMLInputElement).value = formatNumber(settings.attackerSpeed);
    (this.els.attackerMass as HTMLInputElement).value = String(settings.attackerMass);
    (this.els.attackerInertia as HTMLInputElement).value = formatNumber(settings.attackerInertia, 6);
    (this.els.attackerMode as HTMLSelectElement).value = settings.attackerMode;
    (this.els.attackerRange as HTMLInputElement).value = String(settings.attackerRange);
    (this.els.maneuverAggressivity as HTMLInputElement).value = String(settings.maneuverAggressivity ?? 1);
    (this.els.gridBrightnessSlider as HTMLInputElement).value = String(settings.gridBrightness ?? DEFAULT_GRID_BRIGHTNESS);
    (this.els.initialDistance as HTMLInputElement).value = String(settings.initialDistance);
    (this.els.targetSpeed as HTMLInputElement).value = formatNumber(settings.targetSpeed);
    (this.els.targetMass as HTMLInputElement).value = String(settings.targetMass);
    (this.els.targetInertia as HTMLInputElement).value = formatNumber(settings.targetInertia, 6);
    (this.els.targetMode as HTMLSelectElement).value = settings.targetMode;
    (this.els.targetRange as HTMLInputElement).value = String(settings.targetRange);
    (this.els.targetSig as HTMLInputElement).value = String(settings.targetSig);
    (this.els.simSpeed as HTMLSelectElement).value = String(settings.simSpeed);

    this.loadHull("attacker", settings.attackerHull, settings.attackerPropulsion);
    this.loadHull("target", settings.targetHull, settings.targetPropulsion);

    this.i18n.translateDocument();
    this.renderSkillOptions("attacker", settings.attackerSkillLevel ?? 5);
    this.renderSkillOptions("target", settings.targetSkillLevel ?? 5);
    this.setOverloadActive("attacker", settings.attackerOverload ?? true);
    this.setOverloadActive("target", settings.targetOverload ?? true);
    this.setOverloadDisabled("attacker");
    this.setOverloadDisabled("target");

    this.restoreAttackerTurret();

    if (settings.attackerFittedHull) {
      this.restoreFittingSummary("attacker", settings.attackerFittedHull);
    }
    if (settings.targetFittedHull) {
      this.restoreFittingSummary("target", settings.targetFittedHull);
    }
    this.displayTrackingInput();
    this.updateUnitToggle();
    this.updateLanguageToggle();
    this.renderProfiles(selectedName);
    this.setPlaying(this.playing);
    this.updateManeuverAggressivityDisplay();
    this.updateManeuverAggressivityEnabled();
    this.updateGridBrightnessDisplay();
    this.updateAlignTime("attacker");
    this.updateAlignTime("target");
    this.hintRotator.refresh();
    this.savePreferences();
  }

  private setBestInitialDistance(): void {
    const turret = this.getTurret();
    const targetSig = this.getTargetSig();
    const targetSpeed = num(this.els.targetSpeed);
    const best = this.hitChance.findBestDistance(targetSpeed, turret, targetSig);
    if (!Number.isFinite(best) || best <= 0) return;

    (this.els.initialDistance as HTMLInputElement).value = String(Math.round(best));

    // Make the target's desired orbit range match the starting distance by default.
    (this.els.targetRange as HTMLInputElement).value = String(Math.round(best));
  }

  private currentSigResolution(): number {
    return SIG_RESOLUTIONS[(this.els.sigRes as HTMLSelectElement).value as SigResolutionClass];
  }

  private setTrackingUnit(unit: TrackingUnit): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.setUnit(unit, sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
    this.updateUnitToggle();
    this.savePreferences();
    this.updateSaveButtonState();
  }

  private updateTrackingFromInput(): void {
    const value = num(this.els.tracking);
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.setDisplayValue(value, sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
  }

  private updateTrackingForSigResolution(): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.displayValue(sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
  }

  private displayTrackingInput(): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.displayValue(sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
  }

  private updateUnitToggle(): void {
    const radActive = this.trackingInput.unit === "rad";
    const scoreActive = this.trackingInput.unit === "score";
    (this.els.trackingUnitRad as HTMLButtonElement).classList.toggle("active", radActive);
    (this.els.trackingUnitRad as HTMLButtonElement).setAttribute("aria-pressed", String(radActive));
    (this.els.trackingUnitScore as HTMLButtonElement).classList.toggle("active", scoreActive);
    (this.els.trackingUnitScore as HTMLButtonElement).setAttribute("aria-pressed", String(scoreActive));
  }

  private setLanguage(language: Language): void {
    const selected = (this.els.profileSelect as HTMLSelectElement).value;
    this.closeAllSkillPopups();
    this.i18n.setLanguage(language);
    this.i18n.translateDocument();
    this.updateLanguageToggle();
    this.renderProfiles(selected);
    this.renderAllPropulsionOptions();
    this.renderSigResIcons();
    this.clearImportHint("attacker");
    this.clearImportHint("target");
    this.populateHullDatalist();
    this.refreshHullInputs();
    if (this.openFittingSide) this.renderFittingPopup(this.openFittingSide);
    this.refreshPreview();
    this.updateHullHint("attacker", this.currentPropulsionModule("attacker"));
    this.updateHullHint("target", this.currentPropulsionModule("target"));
    this.renderSkillOptions("attacker");
    this.renderSkillOptions("target");
    this.hintRotator.refresh();
    this.setPlaying(this.playing);
    this.savePreferences();
    this.updateSaveButtonState();
    this.callbacks?.onDisplayChange();
  }

  private updateLanguageToggle(): void {
    const current = this.i18n.current();
    (this.els.langEn as HTMLButtonElement).classList.toggle("active", current === "en");
    (this.els.langEn as HTMLButtonElement).setAttribute("aria-pressed", String(current === "en"));
    (this.els.langZh as HTMLButtonElement).classList.toggle("active", current === "zh");
    (this.els.langZh as HTMLButtonElement).setAttribute("aria-pressed", String(current === "zh"));
    (this.els.langJa as HTMLButtonElement).classList.toggle("active", current === "ja");
    (this.els.langJa as HTMLButtonElement).setAttribute("aria-pressed", String(current === "ja"));
  }

  private savePreferences(): void {
    this.settingsStore.savePreferences({
      language: this.i18n.current(),
      trackingUnit: this.trackingInput.unit,
      simSpeed: num(this.els.simSpeed),
      gridBrightness: this.getGridBrightness(),
    });
  }

  private renderProfiles(selected = ""): void {
    const names = this.settingsStore.listProfiles();
    const select = this.els.profileSelect as HTMLSelectElement;
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = this.i18n.t("select.profile");
    select.appendChild(placeholder);
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    }
    select.value = selected;
  }

  private saveProfile(): void {
    const selected = (this.els.profileSelect as HTMLSelectElement).value;
    const name = (this.els.profileName as HTMLInputElement).value.trim();
    const profileName = name || selected;
    if (!profileName) return;
    const profile = profileSettingsOf(this.getSettings());
    this.settingsStore.saveProfile(profileName, profile);
    this.settingsStore.selectProfile(profileName);
    (this.els.profileName as HTMLInputElement).value = "";
    this.renderProfiles(profileName);
    this.selectedProfile = profile;
    this.updateSaveButtonState();
  }

  private loadProfile(): void {
    const name = (this.els.profileSelect as HTMLSelectElement).value;
    if (!name) return;
    const profile = this.settingsStore.loadProfile(name);
    if (!profile) return;
    this.loadSettings(this.sessionSettings(profile), name);
    this.selectedProfile = profileSettingsOf(this.getSettings());
    this.settingsStore.selectProfile(name);
    this.updateSaveButtonState();
    this.callbacks?.onReset();
  }

  private deleteProfile(): void {
    const name = (this.els.profileSelect as HTMLSelectElement).value;
    if (!name) return;
    this.settingsStore.deleteProfile(name);
    this.renderProfiles();
    this.selectedProfile = null;
    this.updateSaveButtonState();
  }

  private updateSaveButtonState(): void {
    const selected = (this.els.profileSelect as HTMLSelectElement).value;
    const name = (this.els.profileName as HTMLInputElement).value.trim();
    let saved: ProfileSettings | null = null;
    if (name && name !== selected) {
      saved = this.settingsStore.loadProfile(name);
    } else if (selected) {
      saved = this.selectedProfile;
    }
    const current = profileSettingsOf(this.getSettings());
    const pending = saved ? !settingsEqual(saved, current) : name.length > 0;
    (this.els.profileSave as HTMLButtonElement).classList.toggle("unsaved", pending);
  }

  private async importFitting(side: "attacker" | "target"): Promise<void> {
    if (this.openPasteSide === side) {
      this.closePastePopup(side);
      return;
    }
    if (this.openPasteSide !== null) this.closeAllPastePopups();
    let text: string;
    try {
      text = await this.clipboard.readText();
    } catch (error) {
      if (error instanceof ClipboardUnavailableError) {
        this.openPastePopup(side);
        return;
      }
      this.clearImportHintTimeout(side);
      this.showImportHint(side, "status.clipboardDenied", true);
      return;
    }
    await this.importFittingFromText(side, text);
  }

  private async importFittingFromText(side: "attacker" | "target", text: string): Promise<void> {
    this.clearImportHintTimeout(side);
    const trimmed = text.trimStart();
    if (trimmed.startsWith(PROFILE_TEXT_HEADER)) {
      const parsed = parseProfile(trimmed);
      const fitting = parsed === undefined ? undefined : side === "attacker" ? parsed.attackerFitting : parsed.targetFitting;
      if (fitting === undefined) {
        this.showImportHint(side, "status.fittingInvalid", true);
        return;
      }
      const imported = this.importEftFitting(side, fitting);
      if (imported) this.recordSavedFitting(imported, fitting);
      return;
    }
    const imported = this.importEftFitting(side, text);
    if (imported) this.recordSavedFitting(imported, text);
  }

  private recordSavedFitting(imported: ImportedFitting, text: string): void {
    this.savedFittings.record({ hull: imported.profile.name, name: imported.fittingName, text });
  }

  private importEftFitting(side: "attacker" | "target", text: string, persist = true): ImportedFitting | undefined {
    const conditions = this.skillConditions(side);
    const imported = this.fittingImport.importFitting(text, conditions);
    if (!imported) {
      this.showImportHint(side, "status.fittingInvalid", true);
      return undefined;
    }
    this.clearFittedHull(side);
    if (side === "attacker") {
      this.attackerFitting = text;
      this.attackerOverrides = {};
    } else {
      this.targetFitting = text;
      this.targetOverrides = {};
    }
    this.applyHull(side, imported.profile, imported.propulsion?.propulsionId, false, false);
    this.applyImportedFitting(side, this.fittedHullSummary(imported));
    if (side === "attacker") this.applyImportedTurret(imported);
    if (persist) {
      this.lastCommittedHull[side] = imported.profile.name;
      this.savePreferences();
      this.updateSaveButtonState();
      this.callbacks?.onConfigChange();
    }
    this.showImportHint(side, "status.fittingImported");
    return imported;
  }

  private async importProfileFromClipboard(): Promise<void> {
    if (this.importSidePopupOpen) {
      this.closeImportSidePopup(true);
      return;
    }
    let text: string;
    try {
      text = await this.clipboard.readText();
    } catch {
      this.showProfileStatus("status.clipboardDenied");
      return;
    }
    const trimmed = text.trimStart();
    if (trimmed.startsWith(PROFILE_TEXT_HEADER)) {
      const settings = this.profileFromText(text);
      if (!settings) {
        this.showProfileStatus("status.importInvalid");
        return;
      }
      this.loadSettings(settings);
      this.showProfileStatus("status.profileImported");
      return;
    }
    if (this.fittingImport.importFitting(text, NEUTRAL_STAT_CONDITIONS) === undefined) {
      this.showProfileStatus("status.importInvalid");
      return;
    }
    this.openImportSidePopup(text);
  }

  private openImportSidePopup(text: string): void {
    if (this.openAmmo) this.closeAttackerAmmoPopup();
    const popup = this.els.importSidePopup as HTMLElement;
    const trigger = this.els.importProfile as HTMLButtonElement;
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    this.pendingImportText = text;
    this.importSidePopupOpen = true;
    (this.els.importSideAttacker as HTMLButtonElement).focus();
  }

  private closeImportSidePopup(restoreFocus: boolean): void {
    const popup = this.els.importSidePopup as HTMLElement;
    const trigger = this.els.importProfile as HTMLButtonElement;
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    this.pendingImportText = undefined;
    this.importSidePopupOpen = false;
    if (restoreFocus) trigger.focus();
  }

  private async onImportSideClick(side: "attacker" | "target"): Promise<void> {
    const text = this.pendingImportText;
    this.closeImportSidePopup(false);
    if (text === undefined) return;
    await this.importFittingFromText(side, text);
  }

  private profileFromText(text: string): UserSettings | undefined {
    const parsed = parseProfile(text.trimStart());
    if (!parsed) return undefined;
    const ammo = this.resolveProfileAmmo(parsed);
    return {
      ...parsed,
      attackerAmmo: ammo,
      language: this.i18n.current(),
      trackingUnit: this.trackingInput.unit,
      simSpeed: num(this.els.simSpeed),
      gridBrightness: this.getGridBrightness(),
    };
  }

  private resolveProfileAmmo(parsed: ProfileSettings): string {
    if (parsed.attackerAmmo) return parsed.attackerAmmo;
    if (parsed.attackerFitting) {
      const imported = this.fittingImport.importFitting(parsed.attackerFitting, {
        skillLevel: parsed.attackerSkillLevel ?? 5,
        overloaded: parsed.attackerOverload ?? true,
      });
      if (imported?.turret) return imported.turret.charge;
    }
    return this.chargeCatalog.usualForChargeSize(1);
  }

  private fittedHullSummary(imported: ImportedFitting): FittedHullSummary {
    return {
      fittingName: imported.fittingName,
      propulsionId: imported.propulsion?.propulsionId,
      propulsionName: imported.propulsion?.propulsionName,
      fitted: imported.fitted,
      propulsion: imported.propulsion,
    };
  }

  private showImportHint(side: "attacker" | "target", key: string, isError = false): void {
    this.clearImportHintTimeout(side);
    const element = this.els[`${side}FittingName`] as HTMLElement;
    element.classList.toggle("error", isError);
    element.innerHTML = `<span class="fitting-name-value">${escapeHtml(this.i18n.t(key))}</span>`;
    element.hidden = false;
    this.importHintTimeouts[side] = this.timer.setTimeout(() => {
      this.importHintTimeouts[side] = undefined;
      this.clearImportHint(side);
    }, 5000);
  }

  private clearImportHint(side: "attacker" | "target"): void {
    this.clearImportHintTimeout(side);
    const element = this.els[`${side}FittingName`] as HTMLElement;
    element.classList.toggle("error", false);
    element.innerHTML = "";
    element.hidden = true;
  }

  private clearImportHintTimeout(side: "attacker" | "target"): void {
    const timeout = this.importHintTimeouts[side];
    if (timeout) {
      this.timer.clearTimeout(timeout);
      this.importHintTimeouts[side] = undefined;
    }
  }

  private async copyProfile(): Promise<void> {
    try {
      await this.clipboard.writeText(serializeProfile(profileSettingsOf(this.getSettings())));
      this.showProfileStatus("status.copied");
    } catch {
      this.showProfileStatus("status.failed");
    }
  }

  private showProfileStatus(key: string): void {
    setText(this.els.shareStatus, this.i18n.t(key));
    if (this.shareStatusTimeout) this.timer.clearTimeout(this.shareStatusTimeout);
    this.shareStatusTimeout = this.timer.setTimeout(() => setText(this.els.shareStatus, ""), 2000);
  }

  private bind(): void {
    (this.els.play as HTMLButtonElement).addEventListener("click", () => this.callbacks?.onPlayPause());
    (this.els.reset as HTMLButtonElement).addEventListener("click", () => this.callbacks?.onReset());
    (this.els.simSpeed as HTMLSelectElement).addEventListener("change", () => {
      this.callbacks?.onSpeedChange(this.getSpeed());
    });
    (this.els.trackingUnitRad as HTMLButtonElement).addEventListener("click", () => this.setTrackingUnit("rad"));
    (this.els.trackingUnitScore as HTMLButtonElement).addEventListener("click", () => this.setTrackingUnit("score"));
    (this.els.langEn as HTMLButtonElement).addEventListener("click", () => this.setLanguage("en"));
    (this.els.langZh as HTMLButtonElement).addEventListener("click", () => this.setLanguage("zh"));
    (this.els.langJa as HTMLButtonElement).addEventListener("click", () => this.setLanguage("ja"));
    (this.els.profileSave as HTMLButtonElement).addEventListener("click", () => this.saveProfile());
    (this.els.profileSelect as HTMLSelectElement).addEventListener("change", () => this.loadProfile());
    (this.els.profileDelete as HTMLButtonElement).addEventListener("click", () => this.deleteProfile());
    (this.els.shareLink as HTMLButtonElement).addEventListener("click", () => this.copyProfile());
    (this.els.importProfile as HTMLButtonElement).addEventListener("click", () => void this.importProfileFromClipboard());
    (this.els.importSideAttacker as HTMLButtonElement).addEventListener("click", () => void this.onImportSideClick("attacker"));
    (this.els.importSideTarget as HTMLButtonElement).addEventListener("click", () => void this.onImportSideClick("target"));
    (this.els.profileName as HTMLInputElement).addEventListener("input", () => this.updateSaveButtonState());

    (this.els.attackerImportFitting as HTMLButtonElement).addEventListener("click", () => this.importFitting("attacker"));
    (this.els.targetImportFitting as HTMLButtonElement).addEventListener("click", () => this.importFitting("target"));

    const attackerPastePopup = this.els.attackerPastePopup as HTMLElement;
    const targetPastePopup = this.els.targetPastePopup as HTMLElement;
    attackerPastePopup.addEventListener("paste", (event: ClipboardEvent) => this.onPastePopupPaste(event, "attacker"));
    targetPastePopup.addEventListener("paste", (event: ClipboardEvent) => this.onPastePopupPaste(event, "target"));

    (this.els.attackerHull as HTMLInputElement).addEventListener("input", () => this.onHullInput("attacker"));
    (this.els.attackerHull as HTMLInputElement).addEventListener("change", () => this.onHullChange("attacker"));
    (this.els.attackerFittingTrigger as HTMLButtonElement).addEventListener("click", () => this.toggleFittingPopup("attacker"));
    (this.els.attackerAmmoTrigger as HTMLButtonElement).addEventListener("click", () => this.toggleAttackerAmmoPopup());
    (this.els.attackerAmmoExpand as HTMLButtonElement).addEventListener("click", () => this.onAttackerAmmoExpandClick());
    (this.els.attackerPropulsion as HTMLSelectElement).addEventListener("change", () => this.onPropulsionChange("attacker"));
    (this.els.attackerPropulsionGear as HTMLButtonElement).addEventListener("click", () => this.onPropulsionGearClick("attacker"));
    (this.els.attackerSkills as HTMLSelectElement).addEventListener("change", () => this.onSkillOrOverloadChange("attacker", true));
    (this.els.attackerOverload as HTMLInputElement).addEventListener("change", () => this.onSkillOrOverloadChange("attacker", false));
    (this.els.attackerOverloadButton as HTMLButtonElement).addEventListener("click", () => this.onOverloadButtonClick("attacker"));
    (this.els.targetHull as HTMLInputElement).addEventListener("input", () => this.onHullInput("target"));
    (this.els.targetHull as HTMLInputElement).addEventListener("change", () => this.onHullChange("target"));
    this.attachShipImagePreviewListeners("attacker");
    this.attachShipImagePreviewListeners("target");
    (this.els.attackerFittingSavedList as HTMLElement).addEventListener("scroll", () => this.hidePreview("attacker"));
    (this.els.attackerFittingPresetList as HTMLElement).addEventListener("scroll", () => this.hidePreview("attacker"));
    (this.els.targetFittingSavedList as HTMLElement).addEventListener("scroll", () => this.hidePreview("target"));
    (this.els.targetFittingPresetList as HTMLElement).addEventListener("scroll", () => this.hidePreview("target"));
    (this.els.targetFittingTrigger as HTMLButtonElement).addEventListener("click", () => this.toggleFittingPopup("target"));
    (this.els.targetPropulsion as HTMLSelectElement).addEventListener("change", () => this.onPropulsionChange("target"));
    (this.els.targetPropulsionGear as HTMLButtonElement).addEventListener("click", () => this.onPropulsionGearClick("target"));
    (this.els.targetSkills as HTMLSelectElement).addEventListener("change", () => this.onSkillOrOverloadChange("target", true));
    (this.els.targetOverload as HTMLInputElement).addEventListener("change", () => this.onSkillOrOverloadChange("target", false));
    (this.els.targetOverloadButton as HTMLButtonElement).addEventListener("click", () => this.onOverloadButtonClick("target"));

    (this.els.attackerSkillTrigger as HTMLButtonElement).addEventListener("click", () => this.toggleSkillPopup("attacker"));
    (this.els.targetSkillTrigger as HTMLButtonElement).addEventListener("click", () => this.toggleSkillPopup("target"));

    this.bindChoiceGroup(this.els.sigResOptions, this.els.sigRes as HTMLSelectElement, ["S", "M", "L", "XL"]);

    const displayInputs: (keyof typeof this.els)[] = ["tracking", "sigRes", "optimal", "falloff", "targetSig"];
    for (const id of displayInputs) {
      this.els[id].addEventListener("input", () => {
        if (id === "tracking") this.updateTrackingFromInput();
        if (id === "sigRes") this.updateTrackingForSigResolution();
        this.recordOverrideForDisplayInput(id);
        this.updateSaveButtonState();
        this.savePreferences();
        this.callbacks?.onDisplayChange();
      });
    }

    const shipInputs: (keyof typeof this.els)[] = [
      "attackerSpeed",
      "attackerMass",
      "attackerInertia",
      "attackerMode",
      "attackerRange",
      "initialDistance",
      "targetSpeed",
      "targetMass",
      "targetInertia",
      "targetMode",
      "targetRange",
    ];
    for (const id of shipInputs) {
      this.els[id].addEventListener("input", () => {
        if (id === "attackerMass") this.updateSpeedFromMass("attacker");
        if (id === "targetMass") this.updateSpeedFromMass("target");
        if (id === "attackerMass" || id === "attackerInertia") this.updateAlignTime("attacker");
        if (id === "targetMass" || id === "targetInertia") this.updateAlignTime("target");
        if (id === "attackerMode") this.updateManeuverAggressivityEnabled();
        this.recordOverrideForShipInput(id);
        this.updateSaveButtonState();
        this.savePreferences();
        this.callbacks?.onConfigChange();
      });
    }

    (this.els.maneuverAggressivitySlider as HTMLInputElement).addEventListener("input", () => this.onManeuverAggressivityChange());
    (this.els.gridBrightnessSlider as HTMLInputElement).addEventListener("input", () => this.onGridBrightnessChange());

    document.addEventListener("pointerdown", (event: PointerEvent) => this.onDocumentPointerDown(event));
    document.addEventListener("keydown", (event: KeyboardEvent) => this.onDocumentKeyDown(event));
  }

  private formatDistance(m: number): string {
    if (m >= 10000) return `${formatWithCommas(m / 1000, 1)} ${this.i18n.t("unit.kilometer")}`;
    return `${formatWithCommas(Math.round(m))} ${this.i18n.t("unit.meter")}`;
  }

  private populateHullDatalist(): void {
    const datalist = this.els.hullOptions as HTMLDataListElement;
    datalist.innerHTML = "";
    for (const hull of this.presetFittings.listHulls()) {
      const option = document.createElement("option");
      option.value = hull;
      datalist.appendChild(option);
    }
  }

  private applyHull(
    side: "attacker" | "target",
    profile: ShipProfile,
    propulsionId?: PropulsionSelection,
    persist = false,
    updateStats = true,
  ): void {
    if (side === "attacker") this.attackerProfile = profile;
    else this.targetProfile = profile;

    (this.els[`${side}Hull`] as HTMLInputElement).value = this.ships.hullView(profile, this.i18n.current()).name;
    this.updateShipImage(side);
    this.setHullValidation(side, false);
    this.updateFittingTrigger(side, true);
    if (this.openFittingSide === side) this.renderFittingPopup(side);
    this.renderPropulsionOptions(side, propulsionId);

    if (updateStats) {
      this.updateShipStats(side, { updateInertia: true, updateMass: true, updateSig: true });
    } else {
      this.updateHullHint(side, this.currentPropulsionModule(side));
    }
    if (persist) {
      this.savePreferences();
      this.updateSaveButtonState();
      this.callbacks?.onConfigChange();
    }
  }

  private updateFittingTrigger(side: "attacker" | "target", enabled: boolean): void {
    (this.els[`${side}FittingTrigger`] as HTMLButtonElement).disabled = !enabled;
  }

  private toggleFittingPopup(side: "attacker" | "target"): void {
    if (this.openFittingSide === side) {
      this.closeFittingPopup(side);
      return;
    }
    if (this.openFittingSide !== null) this.closeAllFittingPopups();
    this.closeAllSkillPopups();
    this.closeAllPastePopups();
    if (this.openAmmo) this.closeAttackerAmmoPopup();
    this.openFittingPopup(side);
  }

  private openFittingPopup(side: "attacker" | "target"): void {
    const popup = this.els[`${side}FittingPopup`] as HTMLElement;
    const trigger = this.els[`${side}FittingTrigger`] as HTMLButtonElement;
    this.renderFittingPopup(side);
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    this.openFittingSide = side;
    const current = this.findFittingItem(side, (item) => item.getAttribute("aria-current") === "true");
    const first = current ?? this.findFittingItem(side, (item) => !item.disabled);
    first?.focus();
  }

  private findFittingItem(side: "attacker" | "target", predicate: (item: HTMLButtonElement) => boolean): HTMLButtonElement | undefined {
    const savedList = this.els[`${side}FittingSavedList`] as HTMLElement;
    const presetList = this.els[`${side}FittingPresetList`] as HTMLElement;
    for (const list of [savedList, presetList]) {
      for (const entry of list.children) {
        const item = entry.children[0] as HTMLButtonElement;
        if (predicate(item)) return item;
      }
    }
    return undefined;
  }

  private closeFittingPopup(side: "attacker" | "target"): void {
    const popup = this.els[`${side}FittingPopup`] as HTMLElement;
    const trigger = this.els[`${side}FittingTrigger`] as HTMLButtonElement;
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (this.openFittingSide === side) this.openFittingSide = null;
    this.hidePreview(side);
    trigger.focus();
  }

  private closeAllFittingPopups(): void {
    if (this.openFittingSide) this.closeFittingPopup(this.openFittingSide);
  }

  private renderFittingPopup(side: "attacker" | "target"): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const savedList = this.els[`${side}FittingSavedList`] as HTMLElement;
    const presetList = this.els[`${side}FittingPresetList`] as HTMLElement;
    const savedLabel = this.els[`${side}FittingSavedLabel`] as HTMLElement;
    const presetLabel = this.els[`${side}FittingPresetLabel`] as HTMLElement;
    const empty = this.els[`${side}FittingEmpty`] as HTMLElement;
    savedList.innerHTML = "";
    presetList.innerHTML = "";
    const currentText = side === "attacker" ? this.attackerFitting : this.targetFitting;

    if (!profile) {
      savedLabel.hidden = true;
      presetLabel.hidden = true;
      empty.hidden = true;
      return;
    }

    const conditions = this.skillConditions(side);
    const saved = this.savedFittings.listForHull(profile.name);
    savedLabel.hidden = saved.length === 0;
    for (const fitting of saved) {
      const item = this.createFittingItem(side, fitting.name, fitting.text, currentText, () => this.onFittingItemClick(side, fitting.text));
      this.attachFittingItemPreviewListeners(side, item, fitting.text);
      const imported = this.fittingImport.importFitting(fitting.text, conditions);
      if (!imported) {
        item.classList.toggle("invalid", true);
        const invalidText = this.i18n.t("fitting.invalid");
        item.title = invalidText;
        (item.children[0] as HTMLElement).title = invalidText;
        item.disabled = true;
        item.setAttribute("aria-disabled", "true");
      }
      const entry = this.createFittingEntry(item, () => {
        this.savedFittings.remove(fitting.id);
        this.renderFittingPopup(side);
        const next = this.findFittingItem(side, (it) => !it.disabled) ?? (this.els[`${side}FittingTrigger`] as HTMLButtonElement);
        next.focus();
      });
      savedList.appendChild(entry);
    }

    const presets = this.presetFittings.fittingsFor(profile.name);
    presetLabel.hidden = presets.length === 0;
    for (let index = 0; index < presets.length; index++) {
      const fit = presets[index];
      const text = this.presetFittings.eftText(profile.name, fit);
      const item = this.createFittingItem(side, fit.name, text, currentText, () => this.onFittingItemClick(side, text));
      this.attachFittingItemPreviewListeners(side, item, text);
      presetList.appendChild(this.createFittingEntry(item, undefined));
    }

    empty.hidden = saved.length > 0 || presets.length > 0;
  }

  private createFittingItem(
    side: "attacker" | "target",
    name: string,
    text: string,
    currentText: string | undefined,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fitting-item";
    button.setAttribute("role", "menuitem");
    if (currentText === text) button.setAttribute("aria-current", "true");
    const span = document.createElement("span");
    span.className = "fitting-item-name";
    span.textContent = name;
    span.title = name;
    button.appendChild(span);
    button.addEventListener("click", onClick);
    return button;
  }

  private createFittingEntry(item: HTMLButtonElement, onDelete: (() => void) | undefined): HTMLElement {
    const li = document.createElement("li");
    li.className = "fitting-entry";
    li.setAttribute("role", "presentation");
    li.appendChild(item);
    if (onDelete) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "fitting-delete";
      del.setAttribute("title", this.i18n.t("button.deleteFitting"));
      del.setAttribute("aria-label", this.i18n.t("button.deleteFitting"));
      del.innerHTML = DELETE_ICON_SVG;
      del.addEventListener("click", () => onDelete());
      li.appendChild(del);
    }
    return li;
  }

  private updateShipImage(side: "attacker" | "target"): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const image = this.els[`${side}ShipImage`];
    if (!isHtmlImageElement(image)) return;
    if (profile) {
      image.src = this.imageCatalog.shipImageUrl(profile.name);
      image.hidden = false;
    } else {
      image.hidden = true;
      image.src = "";
    }
  }

  private clearShipImage(side: "attacker" | "target"): void {
    const image = this.els[`${side}ShipImage`];
    if (!isHtmlImageElement(image)) return;
    image.hidden = true;
    image.src = "";
  }

  private previewOf(side: "attacker" | "target"): FittingPreview {
    return side === "attacker" ? this.attackerPreview : this.targetPreview;
  }

  private renderFittingPreview(side: "attacker" | "target", text: string, anchor: HTMLElement): void {
    const summary = describeFitting(text);
    if (!summary || summary.sections.length === 0) {
      this.hidePreview(side);
      return;
    }
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const shipImageUrl = profile ? this.imageCatalog.shipImageUrl(profile.name) : undefined;
    this.currentPreviewAnchor = anchor;
    this.currentPreviewText = text;
    this.openPreviewSide = side;
    this.previewOf(side).show(anchor, summary, shipImageUrl);
  }

  private hidePreview(side: "attacker" | "target"): void {
    this.previewOf(side).hide();
    if (this.openPreviewSide === side) {
      this.openPreviewSide = null;
      this.currentPreviewAnchor = undefined;
      this.currentPreviewText = undefined;
    }
    this.cancelPreviewTimers(side);
  }

  private refreshPreview(): void {
    if (!this.openPreviewSide || !this.currentPreviewAnchor || !this.currentPreviewText) return;
    if (!this.currentPreviewAnchor.isConnected) {
      this.hidePreview(this.openPreviewSide);
      return;
    }
    this.renderFittingPreview(this.openPreviewSide, this.currentPreviewText, this.currentPreviewAnchor);
  }

  private cancelPreviewTimers(side: "attacker" | "target"): void {
    if (this.previewShowTimeouts[side]) {
      this.timer.clearTimeout(this.previewShowTimeouts[side]);
      this.previewShowTimeouts[side] = undefined;
    }
    if (this.previewHideTimeouts[side]) {
      this.timer.clearTimeout(this.previewHideTimeouts[side]);
      this.previewHideTimeouts[side] = undefined;
    }
  }

  private startPreviewShow(side: "attacker" | "target", anchor: HTMLElement, text: string): void {
    this.cancelPreviewTimers(side);
    this.previewShowTimeouts[side] = this.timer.setTimeout(() => {
      this.previewShowTimeouts[side] = undefined;
      this.renderFittingPreview(side, text, anchor);
    }, 150);
  }

  private startPreviewHide(side: "attacker" | "target"): void {
    this.cancelPreviewTimers(side);
    this.previewHideTimeouts[side] = this.timer.setTimeout(() => {
      this.previewHideTimeouts[side] = undefined;
      this.hidePreview(side);
    }, 100);
  }

  private attachFittingItemPreviewListeners(side: "attacker" | "target", item: HTMLButtonElement, text: string): void {
    const show = () => this.startPreviewShow(side, item, text);
    const hide = () => this.startPreviewHide(side);
    item.addEventListener("mouseenter", show);
    item.addEventListener("focus", show);
    item.addEventListener("mouseleave", hide);
    item.addEventListener("blur", hide);
  }

  private attachShipImagePreviewListeners(side: "attacker" | "target"): void {
    const image = this.els[`${side}ShipImage`];
    if (!isHtmlImageElement(image)) return;
    image.addEventListener("mouseenter", () => {
      const text = side === "attacker" ? this.attackerFitting : this.targetFitting;
      if (text) this.startPreviewShow(side, image, text);
    });
    image.addEventListener("mouseleave", () => this.startPreviewHide(side));
  }

  private onFittingItemClick(side: "attacker" | "target", text: string): void {
    void this.importEftFitting(side, text);
    this.closeFittingPopup(side);
  }

  private clearHull(side: "attacker" | "target", resetInput: boolean, persist: boolean): void {
    if (side === "attacker") this.attackerProfile = undefined;
    else this.targetProfile = undefined;
    this.clearFittedHull(side);
    this.hidePreview(side);
    this.clearShipImage(side);
    delete this.lastCommittedHull[side];

    if (resetInput) {
      (this.els[`${side}Hull`] as HTMLInputElement).value = "";
    }
    this.updateFittingTrigger(side, false);
    if (this.openFittingSide === side) this.closeFittingPopup(side);
    if (side === "attacker" && this.openAmmo) this.closeAttackerAmmoPopup();
    this.updateHullHint(side);
    this.renderPropulsionOptions(side);
    if (persist) {
      this.savePreferences();
      this.updateSaveButtonState();
      this.callbacks?.onConfigChange();
    }
  }

  private clearFittedHull(side: "attacker" | "target"): void {
    this.hidePreview(side);
    if (side === "attacker") {
      this.attackerFittedHull = undefined;
      this.attackerFitting = undefined;
      this.attackerOverrides = {};
      this.attackerTurret = undefined;
      this.attackerCargoCharges = [];
      this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
      this.attackerAmmoAllExpanded = false;
      (this.els.attackerAmmoAllSection as HTMLElement).hidden = true;
      this.renderAttackerAmmo();
      this.renderSigResIcons();
    } else {
      this.targetFittedHull = undefined;
      this.targetFitting = undefined;
      this.targetOverrides = {};
    }
    this.clearImportHint(side);
  }

  private loadHull(
    side: "attacker" | "target",
    hullName?: string,
    propulsionId?: PropulsionSelection,
  ): void {
    if (!hullName) {
      this.clearHull(side, true, false);
      return;
    }
    const profile = this.ships.findHull(hullName);
    if (!profile) {
      this.clearHull(side, true, false);
      return;
    }
    this.applyHull(side, profile, propulsionId, false, false);
    this.lastCommittedHull[side] = profile.name;
  }

  private onHullInput(side: "attacker" | "target"): void {
    const value = (this.els[`${side}Hull`] as HTMLInputElement).value.trim();
    const profile = this.ships.findHull(value);
    if (profile) {
      this.applyProfile(side, profile, true, false);
    } else {
      this.setHullValidation(side, false);
    }
  }

  private onHullChange(side: "attacker" | "target"): void {
    const value = (this.els[`${side}Hull`] as HTMLInputElement).value.trim();
    if (value === "") {
      this.setHullValidation(side, false);
      this.clearHull(side, false, true);
      return;
    }
    const profile = this.ships.findHull(value);
    if (profile) {
      this.applyProfile(side, profile, true, true);
      return;
    }
    this.setHullValidation(side, true);
    this.clearHull(side, false, false);
    this.savePreferences();
    this.updateSaveButtonState();
    this.callbacks?.onConfigChange();
  }

  private applyProfile(
    side: "attacker" | "target",
    profile: ShipProfile,
    persist: boolean,
    autoSelect = false,
  ): void {
    const currentProfile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const isSameAsCurrent = currentProfile?.name === profile.name;
    const isGenuineChange = this.lastCommittedHull[side] !== profile.name;
    const propulsionId = isSameAsCurrent ? this.currentPropulsionSelection(side) : undefined;
    if (!isSameAsCurrent) this.clearFittedHull(side);
    this.applyHull(side, profile, propulsionId, false, !isSameAsCurrent);

    let imported: ImportedFitting | undefined;
    if (isGenuineChange && autoSelect) {
      const recent = this.savedFittings.mostRecentFor(profile.name);
      if (recent) imported = this.importEftFitting(side, recent.text, false);
    }

    if (persist) {
      if (autoSelect) this.lastCommittedHull[side] = imported?.profile.name ?? profile.name;
      this.savePreferences();
      this.updateSaveButtonState();
      this.callbacks?.onConfigChange();
    }
  }

  private applyImportedFitting(side: "attacker" | "target", summary: FittedHullSummary): void {
    if (side === "attacker") this.attackerFittedHull = summary;
    else this.targetFittedHull = summary;
    this.renderPropulsionOptions(side, summary.propulsionId ?? "");
    this.updateShipStats(side, { updateInertia: true, updateMass: true, updateSig: true });
  }

  private restoreFittingSummary(side: "attacker" | "target", summary: FittedHullSummary): void {
    if (side === "attacker") this.attackerFittedHull = summary;
    else this.targetFittedHull = summary;
    this.renderPropulsionOptions(side, this.currentPropulsionSelection(side) ?? "");
    this.clearImportHint(side);
    this.updateHullHint(side, this.currentFittedPropulsionModule(side, summary));
  }

  private clearAttackerTurretOverrides(): void {
    delete this.attackerOverrides.tracking;
    delete this.attackerOverrides.sigRes;
    delete this.attackerOverrides.optimal;
    delete this.attackerOverrides.falloff;
  }

  private renderAttackerAmmo(): void {
    const trigger = this.els.attackerAmmoTrigger;
    const summary = this.els.attackerAmmoSummary as HTMLElement;
    const summaryIcon = this.els.attackerAmmoSummaryIcon;
    if (!isHtmlButtonElement(trigger) || !isHtmlImageElement(summaryIcon)) return;
    const hasTurret = this.attackerTurret !== undefined;
    trigger.disabled = !hasTurret;
    setText(summary, hasTurret ? this.attackerAmmo : "—");
    if (!hasTurret) {
      summaryIcon.hidden = true;
      return;
    }
    const iconUrl = this.imageCatalog.itemIconUrl(this.attackerAmmo);
    summaryIcon.src = iconUrl ?? "";
    summaryIcon.hidden = !iconUrl;
    this.renderAttackerAmmoCargoList();
    this.renderAttackerAmmoAllList();
    this.renderAttackerAmmoExpand();
  }

  private renderSigResIcons(): void {
    const group = this.els.sigResOptions as HTMLElement;
    const turret = this.attackerTurret;
    for (const button of Array.from(group.children)) {
      if (!isHtmlButtonElement(button)) continue;
      const value = button.getAttribute("data-value") ?? "";
      if (!isSigResClass(value)) continue;
      const img = this.sigResIcon(button);
      const title = this.sigResOriginalTitle(value, button);
      if (turret) {
        const family = gunFamilyOf(turret.moduleName);
        const representative = gunIconNames(family)[value];
        const url = this.imageCatalog.itemIconUrl(representative);
        if (url) {
          img.src = url;
          img.hidden = false;
          button.title = `${representative} · ${title}`;
          continue;
        }
      }
      img.hidden = true;
      button.title = title;
    }
  }

  private sigResIcon(button: HTMLButtonElement): HTMLImageElement {
    for (const child of Array.from(button.children)) {
      if (isHtmlImageElement(child) && child.className === "sigres-icon") return child;
    }
    const img = document.createElement("img");
    img.className = "sigres-icon";
    img.alt = "";
    img.hidden = true;
    button.appendChild(img);
    return img;
  }

  private sigResOriginalTitle(value: SigResolutionClass, button: HTMLButtonElement): string {
    let title = this.sigResOriginalTitles[value];
    if (title === undefined) {
      title = button.title;
      this.sigResOriginalTitles[value] = title;
    }
    return title;
  }

  private renderAttackerAmmoCargoList(): void {
    const list = this.els.attackerAmmoCargoList as HTMLElement;
    const label = this.els.attackerAmmoCargoLabel as HTMLElement;
    list.innerHTML = "";
    if (!this.attackerTurret) {
      list.hidden = true;
      label.hidden = true;
      return;
    }
    const entries = this.ammoCargoEntries();
    if (entries.length === 0) {
      list.hidden = true;
      label.hidden = true;
      return;
    }
    list.hidden = false;
    label.hidden = false;
    for (const entry of entries) {
      const item = this.createAmmoItem(entry.name, entry.name === this.attackerAmmo, this.i18n.t("button.selectAmmo"));
      if (entry.quantity !== undefined) {
        const quantity = document.createElement("span");
        quantity.className = "ammo-item-quantity";
        quantity.textContent = `x${entry.quantity}`;
        item.appendChild(quantity);
      }
      item.addEventListener("click", () => this.onAttackerAmmoItemClick(entry.name));
      list.appendChild(item);
    }
  }

  private ammoCargoEntries(): { name: string; quantity?: number }[] {
    const loaded = this.attackerAmmo;
    const inCargo = this.attackerCargoCharges.some((c) => c.name === loaded);
    const entries: { name: string; quantity?: number }[] = [];
    if (!inCargo) entries.push({ name: loaded });
    for (const charge of this.attackerCargoCharges) {
      entries.push({ name: charge.name, quantity: charge.quantity });
    }
    return entries;
  }

  private renderAttackerAmmoAllList(): void {
    const list = this.els.attackerAmmoAllList as HTMLElement;
    const section = this.els.attackerAmmoAllSection as HTMLElement;
    list.innerHTML = "";
    if (!this.attackerTurret) {
      list.hidden = true;
      return;
    }
    const options = this.chargeCatalog.chargesForSize(this.attackerTurret.chargeSize);
    if (options.length === 0) {
      list.hidden = true;
      return;
    }
    list.hidden = false;
    for (const option of options) {
      const item = this.createAmmoItem(option.name, option.name === this.attackerAmmo, chargeStatSuffix(option));
      item.addEventListener("click", () => this.onAttackerAmmoItemClick(option.name));
      list.appendChild(item);
    }
    section.hidden = !this.attackerAmmoAllExpanded;
  }

  private createAmmoItem(name: string, selected: boolean, title: string): HTMLButtonElement {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ammo-item";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(selected));
    item.title = title;
    const iconUrl = this.imageCatalog.itemIconUrl(name);
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "ammo-item-icon";
      icon.src = iconUrl;
      icon.alt = "";
      item.appendChild(icon);
    }
    const label = document.createElement("span");
    label.className = "ammo-item-name";
    label.textContent = name;
    label.title = name;
    item.appendChild(label);
    return item;
  }

  private renderAttackerAmmoExpand(): void {
    const expand = this.els.attackerAmmoExpand as HTMLButtonElement;
    const key = this.attackerAmmoAllExpanded ? "ammo.hideAll" : "ammo.showAll";
    expand.setAttribute("data-i18n", key);
    setText(expand, this.i18n.t(key));
  }

  private onAttackerAmmoItemClick(name: string): void {
    if (this.applyAttackerAmmo(name)) this.closeAttackerAmmoPopup();
  }

  private toggleAttackerAmmoPopup(): void {
    if (this.openAmmo) {
      this.closeAttackerAmmoPopup();
      return;
    }
    this.closeAllSkillPopups();
    this.closeAllPastePopups();
    this.closeAllFittingPopups();
    this.openAttackerAmmoPopup();
  }

  private openAttackerAmmoPopup(): void {
    if (!this.attackerTurret) return;
    const popup = this.els.attackerAmmoPopup as HTMLElement;
    const trigger = this.els.attackerAmmoTrigger as HTMLButtonElement;
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    this.openAmmo = true;
    this.renderAttackerAmmo();
    const selected =
      ((this.els.attackerAmmoCargoList as HTMLElement).querySelector('[aria-selected="true"]') as HTMLButtonElement | null) ??
      ((this.els.attackerAmmoAllList as HTMLElement).querySelector('[aria-selected="true"]') as HTMLButtonElement | null);
    (selected ?? (this.els.attackerAmmoCargoList as HTMLElement).firstElementChild as HTMLButtonElement | null)?.focus();
  }

  private closeAttackerAmmoPopup(): void {
    const popup = this.els.attackerAmmoPopup as HTMLElement;
    const trigger = this.els.attackerAmmoTrigger as HTMLButtonElement;
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    this.openAmmo = false;
    trigger.focus();
  }

  private onAttackerAmmoExpandClick(): void {
    this.attackerAmmoAllExpanded = !this.attackerAmmoAllExpanded;
    this.renderAttackerAmmo();
  }

  private applyAttackerAmmo(name: string): boolean {
    if (!this.attackerTurret) return false;
    const updated = this.chargeCatalog.withCharge(this.attackerTurret, name);
    if (updated === this.attackerTurret) return false;
    this.attackerTurret = updated;
    this.attackerAmmo = updated.charge;
    this.clearAttackerTurretOverrides();
    this.setTurretInputs(updated);
    this.renderAttackerAmmo();
    this.savePreferences();
    this.callbacks?.onConfigChange();
    return true;
  }

  private setTurretInputs(turret: ImportedTurret): void {
    const sigResolution = SIG_RESOLUTIONS[turret.sigResolutionClass];
    if (this.attackerOverrides.tracking === undefined) this.trackingInput.setRadValue(turret.tracking, sigResolution);
    if (this.attackerOverrides.sigRes === undefined) {
      (this.els.sigRes as HTMLSelectElement).value = turret.sigResolutionClass;
      this.setChoiceGroup(this.els.sigResOptions, turret.sigResolutionClass);
    }
    if (this.attackerOverrides.optimal === undefined) (this.els.optimal as HTMLInputElement).value = String(Math.round(turret.optimal));
    if (this.attackerOverrides.falloff === undefined) (this.els.falloff as HTMLInputElement).value = String(Math.round(turret.falloff));
    this.displayTrackingInput();
  }

  private restoreAttackerTurret(): void {
    this.attackerAmmoAllExpanded = false;
    (this.els.attackerAmmoAllSection as HTMLElement).hidden = true;
    if (!this.attackerFitting || !this.attackerProfile) {
      this.attackerTurret = undefined;
      this.attackerCargoCharges = [];
      this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
      this.renderAttackerAmmo();
      this.renderSigResIcons();
      return;
    }
    const imported = this.fittingImport.importFitting(this.attackerFitting, this.skillConditions("attacker"));
    if (!imported?.turret) {
      this.attackerTurret = undefined;
      this.attackerCargoCharges = [];
      this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
      this.renderAttackerAmmo();
      this.renderSigResIcons();
      return;
    }
    const restored = this.chargeCatalog.withCharge(imported.turret, this.attackerAmmo);
    this.attackerTurret = restored;
    this.attackerCargoCharges = imported.cargoCharges;
    this.attackerAmmo = restored.charge;
    this.setTurretInputs(restored);
    this.renderAttackerAmmo();
    this.renderSigResIcons();
  }

  private applyImportedTurret(imported: ImportedFitting): void {
    const turret = imported.turret;
    if (!turret) {
      this.attackerTurret = undefined;
      this.attackerCargoCharges = imported.cargoCharges;
      this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
      this.attackerAmmoAllExpanded = false;
      (this.els.attackerAmmoAllSection as HTMLElement).hidden = true;
      this.renderAttackerAmmo();
      this.renderSigResIcons();
      return;
    }
    this.attackerTurret = turret;
    this.attackerCargoCharges = imported.cargoCharges;
    this.attackerAmmo = turret.charge;
    this.attackerAmmoAllExpanded = false;
    (this.els.attackerAmmoAllSection as HTMLElement).hidden = true;
    this.clearAttackerTurretOverrides();
    this.setTurretInputs(turret);
    this.renderAttackerAmmo();
    this.renderSigResIcons();
  }

  private currentPropulsionModule(side: "attacker" | "target"): PropulsionModule | undefined {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const id = this.currentPropulsionId(side);
    if (!profile || !id) return undefined;
    return this.ships.fittingOption(profile, id);
  }

  private onPropulsionChange(side: "attacker" | "target"): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) return;
    const propulsionId = this.currentPropulsionId(side);
    const fitted = side === "attacker" ? this.attackerFittedHull : this.targetFittedHull;
    let updated: FittedHullSummary | undefined;
    if (propulsionId) {
      const module = this.ships.fittingOption(profile, propulsionId);
      if (module) {
        const propulsionName = this.defaultPropulsionName(module);
        const propulsion = this.fittingImport.propulsionStats(propulsionName) ?? module;
        updated = {
          fittingName: fitted?.fittingName ?? "",
          fitted: fitted?.fitted ?? this.nakedFitted(profile),
          propulsionId,
          propulsionName,
          propulsion,
        };
      }
    } else if (fitted) {
      updated = fitted.fittingName ? { ...fitted, propulsionId: undefined, propulsionName: undefined, propulsion: undefined } : undefined;
    }
    if (updated) {
      if (side === "attacker") this.attackerFittedHull = updated;
      else this.targetFittedHull = updated;
    } else if (!propulsionId && fitted && !fitted.fittingName) {
      if (side === "attacker") this.attackerFittedHull = undefined;
      else this.targetFittedHull = undefined;
    }
    this.updateShipStats(side, { updateInertia: false, updateMass: true, updateSig: true });
    this.setOverloadDisabled(side);
    this.updatePropulsionVariantUI(side);
    this.updateSaveButtonState();
    this.savePreferences();
    this.callbacks?.onConfigChange();
  }

  private updatePropulsionVariantUI(side: "attacker" | "target"): void {
    const gear = this.els[`${side}PropulsionGear`] as HTMLButtonElement;
    const id = this.currentPropulsionId(side);
    gear.disabled = !id;
    this.renderPropulsionVariants(side);
  }

  private nakedFitted(profile: ShipProfile): FittedHull {
    return { mass: profile.mass, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 };
  }

  private defaultPropulsionName(module: PropulsionModule): string {
    const names = this.fittingImport.propulsionVariantNames(module);
    return names.find((name) => name === module.label) ?? names[0] ?? module.label;
  }

  private renderPropulsionVariants(side: "attacker" | "target"): void {
    const popup = this.els[`${side}PropulsionVariants`] as HTMLElement;
    const module = this.currentPropulsionModule(side);
    popup.innerHTML = "";
    if (!module) return;
    const fitted = side === "attacker" ? this.attackerFittedHull : this.targetFittedHull;
    const currentName = fitted?.propulsionName ?? this.defaultPropulsionName(module);
    for (const name of this.fittingImport.propulsionVariantNames(module)) {
      const item = this.createFittingItem(side, name, name, currentName, () => this.onPropulsionVariantClick(side, name));
      item.setAttribute("data-value", name);
      item.setAttribute("title", name);
      popup.appendChild(item);
    }
  }

  private onPropulsionVariantClick(side: "attacker" | "target", name: string): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const propulsion = this.fittingImport.propulsionStats(name);
    const propulsionId = this.currentPropulsionId(side);
    if (!profile || !propulsion || !propulsionId) return;
    const fitted = side === "attacker" ? this.attackerFittedHull : this.targetFittedHull;
    const updated: FittedHullSummary = {
      fittingName: fitted?.fittingName ?? "",
      fitted: fitted?.fitted ?? this.nakedFitted(profile),
      propulsionId,
      propulsionName: name,
      propulsion,
    };
    if (side === "attacker") this.attackerFittedHull = updated;
    else this.targetFittedHull = updated;
    this.updateShipStats(side, { updateInertia: false, updateMass: true, updateSig: true });
    this.renderPropulsionVariants(side);
    this.savePreferences();
    this.updateSaveButtonState();
    this.callbacks?.onConfigChange();
  }

  private onPropulsionGearClick(side: "attacker" | "target"): void {
    if (this.openPropulsionVariantSide === side) {
      this.closePropulsionVariantPopup(side);
      return;
    }
    if (this.openPropulsionVariantSide !== null) this.closePropulsionVariantPopup(this.openPropulsionVariantSide);
    this.closeAllSkillPopups();
    this.closeAllPastePopups();
    this.closeAllFittingPopups();
    if (this.importSidePopupOpen) this.closeImportSidePopup(false);
    if (this.openAmmo) this.closeAttackerAmmoPopup();
    this.openPropulsionVariantPopup(side);
  }

  private openPropulsionVariantPopup(side: "attacker" | "target"): void {
    const popup = this.els[`${side}PropulsionVariants`] as HTMLElement;
    const gear = this.els[`${side}PropulsionGear`] as HTMLButtonElement;
    this.renderPropulsionVariants(side);
    popup.hidden = false;
    gear.setAttribute("aria-expanded", "true");
    this.openPropulsionVariantSide = side;
    const active = Array.from(popup.children).find((child) => child.getAttribute("aria-current") === "true") as HTMLElement | null ?? null;
    const first = popup.firstElementChild as HTMLElement | null;
    (active ?? first)?.focus();
  }

  private closePropulsionVariantPopup(side: "attacker" | "target"): void {
    const popup = this.els[`${side}PropulsionVariants`] as HTMLElement;
    const gear = this.els[`${side}PropulsionGear`] as HTMLButtonElement;
    popup.hidden = true;
    gear.setAttribute("aria-expanded", "false");
    if (this.openPropulsionVariantSide === side) this.openPropulsionVariantSide = null;
  }

  private setHullValidation(side: "attacker" | "target", isInvalid: boolean): void {
    (this.els[`${side}Hull`] as HTMLInputElement).classList.toggle("hull-invalid", isInvalid);
  }

  private updateHullHint(side: "attacker" | "target", module?: PropulsionModule): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) {
      setText(this.els[`${side}HullHint`], "");
      return;
    }
    const view = this.ships.hullView(profile, this.i18n.current());
    let text = `${view.hullType} · ${view.faction}`;
    if (side === "target" && module?.kind === "microwarpdrive") {
      text += ` (sig ×${1 + module.sigBloom})`;
    }
    setText(this.els[`${side}HullHint`], text);
  }

  private refreshHullInputs(): void {
    const language = this.i18n.current();
    if (this.attackerProfile) {
      (this.els.attackerHull as HTMLInputElement).value = this.ships.hullView(this.attackerProfile, language).name;
    }
    if (this.targetProfile) {
      (this.els.targetHull as HTMLInputElement).value = this.ships.hullView(this.targetProfile, language).name;
    }
  }

  private renderAllPropulsionOptions(): void {
    this.renderPropulsionOptions("attacker", this.currentPropulsionSelection("attacker") ?? "");
    this.renderPropulsionOptions("target", this.currentPropulsionSelection("target") ?? "");
  }

  private renderPropulsionOptions(side: "attacker" | "target", selectedId = ""): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const select = this.els[`${side}Propulsion`] as HTMLSelectElement;
    const group = this.els[`${side}PropulsionOptions`] as HTMLElement;
    const gear = this.els[`${side}PropulsionGear`] as HTMLButtonElement;
    select.innerHTML = "";
    group.innerHTML = "";
    group.setAttribute("aria-label", this.i18n.t("label.propulsion"));
    select.disabled = !profile;

    const all = this.ships.allFittingOptions();
    const modules = profile ? this.ships.fittingOptions(profile) : all.slice(0, 3);
    const moduleSet = new Set(modules.map((module) => module.id));
    const selectedPropulsionId = this.ships.parsePropulsionId(selectedId);
    const noneRequested = selectedId === PROPULSION_NONE;
    let selected = "";

    for (const module of modules) {
      const option = document.createElement("option");
      option.value = module.id;
      option.textContent = propulsionOptionLabel(module);
      select.appendChild(option);
      const button = this.createPropulsionButton(group, module, () => this.onPropulsionButtonClick(side, module.id));
      button.disabled = !profile;
      button.setAttribute("aria-disabled", String(!profile));
    }

    const noneOption = document.createElement("option");
    noneOption.value = PROPULSION_NONE;
    noneOption.hidden = true;
    select.appendChild(noneOption);

    if (profile) {
      selected = noneRequested
        ? PROPULSION_NONE
        : selectedPropulsionId && moduleSet.has(selectedPropulsionId)
          ? selectedPropulsionId
          : (modules[0]?.id ?? "");
    }

    select.value = selected;
    this.setPropulsionActive(side, selected);
    gear.disabled = !profile || selected === PROPULSION_NONE || selected === "";
    this.renderPropulsionVariants(side);
    this.setOverloadDisabled(side);
    const popup = this.els[`${side}PropulsionVariants`] as HTMLElement;
    popup.hidden = true;
    gear.setAttribute("aria-expanded", "false");
    if (this.openPropulsionVariantSide === side) this.openPropulsionVariantSide = null;
  }

  private updateShipStats(
    side: "attacker" | "target",
    { updateInertia, updateMass, updateSig }: { updateInertia: boolean; updateMass: boolean; updateSig: boolean },
  ): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) return;

    const fitted = side === "attacker" ? this.attackerFittedHull : this.targetFittedHull;
    const propulsion = fitted ? this.currentFittedPropulsion(side, fitted) : this.currentPropulsionModule(side);
    const hintModule = fitted ? this.currentFittedPropulsionModule(side, fitted) : this.currentPropulsionModule(side);
    const conditions = this.skillConditions(side);
    const massKey: keyof ProfileParamOverrides = side === "attacker" ? "attackerMass" : "targetMass";
    const inertiaKey: keyof ProfileParamOverrides = side === "attacker" ? "attackerInertia" : "targetInertia";
    const speedKey: keyof ProfileParamOverrides = side === "attacker" ? "attackerSpeed" : "targetSpeed";
    let mass = num(this.els[`${side}Mass`]);

    if (updateMass || updateInertia || (side === "target" && updateSig)) {
      const stats = this.ships.fittedStats(profile, fitted?.fitted, propulsion, conditions);
      if (updateMass && !this.isOverridden(side, massKey)) {
        mass = stats.mass;
        (this.els[`${side}Mass`] as HTMLInputElement).value = String(mass);
      }
      if (updateInertia && !this.isOverridden(side, inertiaKey)) {
        (this.els[`${side}Inertia`] as HTMLInputElement).value = formatNumber(stats.inertiaModifier, 6);
      }
      if (side === "target" && updateSig && !this.isOverridden(side, "targetSig")) {
        (this.els.targetSig as HTMLInputElement).value = String(Math.max(1, stats.sigRadius));
      }
    }

    if (!this.isOverridden(side, speedKey)) {
      const speed = this.ships.maxSpeedForFittedMass(profile, fitted?.fitted, mass, propulsion, conditions);
      (this.els[`${side}Speed`] as HTMLInputElement).value = formatNumber(speed);
    }
    this.updateHullHint(side, hintModule);
    this.updateAlignTime(side);
  }

  private isOverridden(side: "attacker" | "target", key: keyof ProfileParamOverrides): boolean {
    const overrides = side === "attacker" ? this.attackerOverrides : this.targetOverrides;
    return overrides[key] !== undefined;
  }

  private currentFittedPropulsion(side: "attacker" | "target", fitted: FittedHullSummary): PropulsionStats | undefined {
    if (!fitted.propulsionId || !fitted.propulsion) return undefined;
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) return undefined;
    const currentId = this.currentPropulsionId(side);
    if (currentId === undefined) return undefined;
    if (currentId === fitted.propulsionId) return fitted.propulsion;
    return this.ships.fittingOption(profile, currentId);
  }

  private currentFittedPropulsionModule(side: "attacker" | "target", fitted: FittedHullSummary): PropulsionModule | undefined {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile || !fitted.propulsionId) return undefined;
    const currentId = this.currentPropulsionId(side);
    if (currentId === undefined) return undefined;
    return this.ships.fittingOption(profile, currentId);
  }

  private updateSpeedFromMass(side: "attacker" | "target"): void {
    const speedKey: keyof ProfileParamOverrides = side === "attacker" ? "attackerSpeed" : "targetSpeed";
    if (this.isOverridden(side, speedKey)) return;
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) return;
    const fitted = side === "attacker" ? this.attackerFittedHull : this.targetFittedHull;
    const conditions = this.skillConditions(side);
    const mass = num(this.els[`${side}Mass`]);
    const propulsion = fitted ? this.currentFittedPropulsion(side, fitted) : this.currentPropulsionModule(side);
    const speed = this.ships.maxSpeedForFittedMass(profile, fitted?.fitted, mass, propulsion, conditions);
    (this.els[`${side}Speed`] as HTMLInputElement).value = formatNumber(speed);
    this.updateAlignTime(side);
  }

  private updateAlignTime(side: "attacker" | "target"): void {
    const mass = num(this.els[`${side}Mass`]);
    const inertia = num(this.els[`${side}Inertia`]);
    const t = alignTime(mass, inertia);
    const input = this.els[`${side}Inertia`] as HTMLInputElement;
    const suffix = this.els[`${side}AlignTime`];
    if (Number.isFinite(t) && t > 0) {
      const value = `${t.toFixed(1)}${this.i18n.t("unit.second")}`;
      suffix.textContent = value;
      input.title = `${this.i18n.t("label.alignTime")}: ${value}`;
    } else {
      suffix.textContent = "";
      input.title = "";
    }
  }

  private skillConditions(side: "attacker" | "target"): { skillLevel: SkillLevel; overloaded: boolean } {
    const skill = side === "attacker" ? this.els.attackerSkills : this.els.targetSkills;
    const overload = side === "attacker" ? this.els.attackerOverload : this.els.targetOverload;
    return {
      skillLevel: skillLevelFromString((skill as HTMLSelectElement).value),
      overloaded: (overload as HTMLInputElement).checked,
    };
  }

  private setOverloadDisabled(side: "attacker" | "target"): void {
    const propulsion = this.els[`${side}Propulsion`] as HTMLSelectElement;
    const overload = this.els[`${side}Overload`] as HTMLInputElement;
    const button = this.els[`${side}OverloadButton`] as HTMLButtonElement;
    const disabled = this.currentPropulsionId(side) === undefined || propulsion.disabled;
    const active = !disabled && overload.checked;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    overload.disabled = disabled;
    button.disabled = disabled;
    button.setAttribute("aria-disabled", String(disabled));
  }

  private recordOverrideForDisplayInput(id: keyof typeof this.els): void {
    if (id === "tracking") this.recordOverride("attacker", "tracking", this.trackingInput.rad);
    if (id === "sigRes") this.recordOverride("attacker", "sigRes", (this.els.sigRes as HTMLSelectElement).value as SigResolutionClass);
    if (id === "optimal") this.recordOverride("attacker", "optimal", num(this.els.optimal));
    if (id === "falloff") this.recordOverride("attacker", "falloff", num(this.els.falloff));
    if (id === "targetSig") this.recordOverride("target", "targetSig", Math.max(num(this.els.targetSig), 1));
  }

  private recordOverrideForShipInput(id: keyof typeof this.els): void {
    if (id === "attackerSpeed") this.recordOverride("attacker", "attackerSpeed", num(this.els.attackerSpeed));
    if (id === "attackerMass") this.recordOverride("attacker", "attackerMass", num(this.els.attackerMass));
    if (id === "attackerInertia") this.recordOverride("attacker", "attackerInertia", num(this.els.attackerInertia));
    if (id === "targetSpeed") this.recordOverride("target", "targetSpeed", num(this.els.targetSpeed));
    if (id === "targetMass") this.recordOverride("target", "targetMass", num(this.els.targetMass));
    if (id === "targetInertia") this.recordOverride("target", "targetInertia", num(this.els.targetInertia));
  }

  private recordOverride<K extends keyof ProfileParamOverrides>(
    side: "attacker" | "target",
    key: K,
    value: ProfileParamOverrides[K],
  ): void {
    const overrides = side === "attacker" ? this.attackerOverrides : this.targetOverrides;
    overrides[key] = value;
  }

  private onSkillOrOverloadChange(side: "attacker" | "target", updateInertia: boolean): void {
    this.updateShipStats(side, { updateInertia, updateMass: false, updateSig: false });
    if (side === "attacker" && this.attackerProfile && this.attackerFitting) {
      this.restoreAttackerTurret();
    }
    this.updateSaveButtonState();
    this.savePreferences();
    if (side === "attacker" && !this.attackerProfile) return;
    if (side === "target" && !this.targetProfile) return;
    this.callbacks?.onConfigChange();
  }

  private setDefaultSkillAndOverload(): void {
    this.setSkillLevel("attacker", 5);
    this.setSkillLevel("target", 5);
    this.setOverloadActive("attacker", true);
    this.setOverloadActive("target", true);
  }

  private setSkillLevel(side: "attacker" | "target", level: SkillLevel): void {
    (this.els[`${side}Skills`] as HTMLSelectElement).value = String(level);
    this.setSkillActive(side, level);
  }

  private setSkillActive(side: "attacker" | "target", level: SkillLevel): void {
    const group = this.els[`${side}SkillOptions`] as HTMLElement;
    const value = String(level);
    for (const button of group.children) {
      const active = button.getAttribute("data-value") === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    const summary = skillOptionLabel(this.i18n, level);
    setText(this.els[`${side}SkillSummary`], summary);
  }

  private toggleSkillPopup(side: "attacker" | "target"): void {
    if (this.openSkillSide === side) {
      this.closeSkillPopup(side);
      return;
    }
    if (this.openSkillSide !== null && this.openSkillSide !== side) {
      this.closeSkillPopup(this.openSkillSide);
    }
    if (this.openAmmo) this.closeAttackerAmmoPopup();
    this.openSkillPopup(side);
  }

  private openSkillPopup(side: "attacker" | "target"): void {
    const popup = this.els[`${side}SkillPopup`] as HTMLElement;
    const trigger = this.els[`${side}SkillTrigger`] as HTMLButtonElement;
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    this.openSkillSide = side;
    const active = Array.from((this.els[`${side}SkillOptions`] as HTMLElement).children).find(
      (button) => button.getAttribute("aria-pressed") === "true",
    ) as HTMLButtonElement | undefined;
    active?.focus();
  }

  private closeSkillPopup(side: "attacker" | "target"): void {
    const popup = this.els[`${side}SkillPopup`] as HTMLElement;
    const trigger = this.els[`${side}SkillTrigger`] as HTMLButtonElement;
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (this.openSkillSide === side) this.openSkillSide = null;
  }

  private closeAllSkillPopups(): void {
    if (this.openSkillSide) this.closeSkillPopup(this.openSkillSide);
  }

  private openPastePopup(side: "attacker" | "target"): void {
    if (this.openPasteSide !== null && this.openPasteSide !== side) this.closeAllPastePopups();
    if (this.openAmmo) this.closeAttackerAmmoPopup();
    const popup = this.els[`${side}PastePopup`] as HTMLElement;
    const input = this.els[`${side}PasteInput`] as HTMLTextAreaElement;
    popup.hidden = false;
    this.openPasteSide = side;
    input.focus();
  }

  private closePastePopup(side: "attacker" | "target"): void {
    const popup = this.els[`${side}PastePopup`] as HTMLElement;
    const input = this.els[`${side}PasteInput`] as HTMLTextAreaElement;
    popup.hidden = true;
    input.blur();
    if (this.openPasteSide === side) this.openPasteSide = null;
  }

  private closeAllPastePopups(): void {
    if (this.openPasteSide) this.closePastePopup(this.openPasteSide);
  }

  private onPastePopupPaste(event: ClipboardEvent, side: "attacker" | "target"): void {
    const text = event.clipboardData?.getData("text/plain");
    if (!text) return;
    event.preventDefault();
    this.closePastePopup(side);
    void this.importFittingFromText(side, text);
  }

  private onDocumentPointerDown(event: PointerEvent): void {
    const hasOpenPopup =
      this.openSkillSide !== null ||
      this.openPasteSide !== null ||
      this.openFittingSide !== null ||
      this.openPropulsionVariantSide !== null ||
      this.importSidePopupOpen ||
      this.openAmmo ||
      this.openPreviewSide !== null;
    if (!hasOpenPopup) return;
    const target = event.target as Element | null;
    if (typeof target?.closest !== "function") return;
    if (this.openSkillSide !== null) {
      const insideSkill = target.closest("#attacker-skill-field, #target-skill-field");
      if (!insideSkill) this.closeAllSkillPopups();
    }
    if (this.openPasteSide !== null) {
      const insidePaste = target.closest("#attacker-paste-popup, #target-paste-popup, #attacker-import-fitting, #target-import-fitting");
      if (!insidePaste) this.closeAllPastePopups();
    }
    if (this.openFittingSide !== null) {
      const side = this.openFittingSide;
      const insideFitting = target.closest(`#${side}-fitting-popup, #${side}-fitting-trigger, #${side}-hull, #${side}-ship-image`);
      if (!insideFitting) this.closeAllFittingPopups();
    }
    if (this.openPreviewSide) {
      const side = this.openPreviewSide;
      const insidePreview = target.closest(`#${side}-ship-image, .fitting-popup`);
      if (!insidePreview) this.hidePreview(side);
    }
    if (this.importSidePopupOpen) {
      const insideImport = target.closest("#import-side-popup, #import-profile");
      if (!insideImport) this.closeImportSidePopup(false);
    }
    if (this.openAmmo) {
      const insideAmmo = target.closest("#attacker-ammo-field");
      if (!insideAmmo) this.closeAttackerAmmoPopup();
    }
    if (this.openPropulsionVariantSide !== null) {
      const side = this.openPropulsionVariantSide;
      const inside = target.closest(`#${side}-propulsion-variants, #${side}-propulsion-gear`);
      if (!inside) this.closePropulsionVariantPopup(side);
    }
  }

  private onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    if (this.openPreviewSide) this.hidePreview(this.openPreviewSide);
    if (this.openSkillSide !== null) {
      const side = this.openSkillSide;
      this.closeSkillPopup(side);
      (this.els[`${side}SkillTrigger`] as HTMLButtonElement).focus();
    }
    if (this.openPasteSide !== null) {
      const side = this.openPasteSide;
      this.closePastePopup(side);
      (this.els[`${side}ImportFitting`] as HTMLButtonElement).focus();
    }
    if (this.openFittingSide !== null) {
      const side = this.openFittingSide;
      this.closeFittingPopup(side);
      (this.els[`${side}FittingTrigger`] as HTMLButtonElement).focus();
    }
    if (this.importSidePopupOpen) {
      this.closeImportSidePopup(true);
    }
    if (this.openAmmo) {
      this.closeAttackerAmmoPopup();
    }
    if (this.openPropulsionVariantSide !== null) {
      const side = this.openPropulsionVariantSide;
      this.closePropulsionVariantPopup(side);
      (this.els[`${side}PropulsionGear`] as HTMLButtonElement).focus();
    }
  }

  private setOverloadActive(side: "attacker" | "target", active: boolean): void {
    const input = this.els[`${side}Overload`] as HTMLInputElement;
    const button = this.els[`${side}OverloadButton`] as HTMLButtonElement;
    input.checked = active;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  private setPropulsionActive(side: "attacker" | "target", propulsionId: string): void {
    const select = this.els[`${side}Propulsion`] as HTMLSelectElement;
    const group = this.els[`${side}PropulsionOptions`] as HTMLElement;
    select.value = propulsionId;
    for (const button of group.children) {
      const active = button.getAttribute("data-value") === propulsionId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }

  private currentSkillLevel(side: "attacker" | "target"): SkillLevel | undefined {
    const value = (this.els[`${side}Skills`] as HTMLSelectElement).value;
    if (value === "") return undefined;
    const level = skillLevelFromString(value);
    if (level === 0 && value !== "0") return undefined;
    return level;
  }

  private onPropulsionButtonClick(side: "attacker" | "target", propulsionId: string): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) return;
    const id = this.ships.parsePropulsionId(propulsionId);
    if (!id || !this.ships.fittingOption(profile, id)) return;
    const currentId = this.currentPropulsionId(side);
    const next = currentId === id ? PROPULSION_NONE : id;
    this.setPropulsionActive(side, next);
    this.els[`${side}Propulsion`].dispatchEvent(new Event("change"));
  }

  private onSkillButtonClick(side: "attacker" | "target", level: SkillLevel): void {
    this.setSkillActive(side, level);
    (this.els[`${side}Skills`] as HTMLSelectElement).value = String(level);
    this.els[`${side}Skills`].dispatchEvent(new Event("change"));
    this.closeSkillPopup(side);
    (this.els[`${side}SkillTrigger`] as HTMLButtonElement).focus();
  }

  private onOverloadButtonClick(side: "attacker" | "target"): void {
    const input = this.els[`${side}Overload`] as HTMLInputElement;
    this.setOverloadActive(side, !input.checked);
    input.dispatchEvent(new Event("change"));
  }

  private createButton(container: HTMLElement, value: string, text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-value", value);
    button.setAttribute("aria-pressed", "false");
    button.textContent = text;
    button.setAttribute("title", text);
    button.addEventListener("click", onClick);
    container.appendChild(button);
    return button;
  }

  private createPropulsionButton(container: HTMLElement, module: PropulsionModule, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-value", module.id);
    button.setAttribute("aria-pressed", "false");
    const text = propulsionOptionLabel(module);
    button.setAttribute("title", text);
    const iconUrl = this.imageCatalog.itemIconUrl(module.label);
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "propulsion-icon";
      icon.src = iconUrl;
      icon.alt = "";
      button.appendChild(icon);
    }
    const label = document.createElement("span");
    label.textContent = text;
    button.appendChild(label);
    button.addEventListener("click", onClick);
    container.appendChild(button);
    return button;
  }

  private createPlaceholderButton(container: HTMLElement): HTMLButtonElement {
    const button = this.createButton(container, "placeholder", "—", () => {});
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    return button;
  }

  private renderSkillOptions(side: "attacker" | "target", selectedValue: SkillLevel = this.currentSkillLevel(side) ?? 5): void {
    const select = this.els[`${side}Skills`] as HTMLSelectElement;
    const group = this.els[`${side}SkillOptions`] as HTMLElement;
    const selected = String(selectedValue);
    select.innerHTML = "";
    group.innerHTML = "";
    group.setAttribute("aria-label", this.i18n.t("label.skillLevel"));
    for (let level = 0; level <= 5; level++) {
      const skill = level as SkillLevel;
      const option = document.createElement("option");
      option.value = String(level);
      option.textContent = skillOptionLabel(this.i18n, skill);
      select.appendChild(option);
      const button = this.createButton(group, String(level), String(level), () => this.onSkillButtonClick(side, skill));
      button.title = skillOptionLabel(this.i18n, skill);
    }
    select.value = selected;
    this.setSkillActive(side, skillLevelFromString(selected));
  }

  private bindChoiceGroup(group: HTMLElement, select: HTMLSelectElement, values: readonly string[]): void {
    for (const button of Array.from(group.children)) {
      button.addEventListener("click", () => this.onChoiceButtonClick(group, select, button, values));
    }
  }

  private onChoiceButtonClick(
    group: HTMLElement,
    select: HTMLSelectElement,
    button: Element,
    values: readonly string[],
  ): void {
    const value = button.getAttribute("data-value") ?? "";
    if (!values.includes(value)) return;
    select.value = value;
    this.setChoiceGroup(group, value);
    select.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private setChoiceGroup(group: HTMLElement, value: string): void {
    for (const button of Array.from(group.children)) {
      const active = button.getAttribute("data-value") === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }
}

const AGGRESSIVITY_MIN = 0.01;
const AGGRESSIVITY_MAX = 100;
const DEFAULT_GRID_BRIGHTNESS = 0.2;
const DELETE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" ' +
  'aria-hidden="true"><use href="icons.svg#delete"></use></svg>';

function aggressivityFromPosition(pos: number): number {
  const clamped = Math.max(0, Math.min(1, pos));
  return AGGRESSIVITY_MIN * (AGGRESSIVITY_MAX / AGGRESSIVITY_MIN) ** clamped;
}

function positionFromAggressivity(value: number): number {
  const clamped = Math.max(AGGRESSIVITY_MIN, Math.min(AGGRESSIVITY_MAX, value));
  return Math.log(clamped / AGGRESSIVITY_MIN) / Math.log(AGGRESSIVITY_MAX / AGGRESSIVITY_MIN);
}

function parseManeuverAggressivity(input: HTMLInputElement): number {
  const value = Number.parseFloat(input.value);
  if (!Number.isFinite(value)) return 1;
  return Math.max(AGGRESSIVITY_MIN, Math.min(AGGRESSIVITY_MAX, value));
}

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (e === null) throw new Error(`Missing DOM element #${id}`);
  return e;
}

function isHtmlButtonElement(el: Element): el is HTMLButtonElement {
  return el.tagName === "BUTTON";
}

function isHtmlImageElement(el: Element): el is HTMLImageElement {
  return el.tagName === "IMG";
}

function num(input: HTMLInputElement | HTMLSelectElement | HTMLElement): number {
  const value = (input as HTMLInputElement).value;
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}

function profileSettingsOf(settings: UserSettings): ProfileSettings {
  const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, ...rest } = settings;
  return rest;
}

function settingsEqual(a: ProfileSettings, b: ProfileSettings): boolean {
  return JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());
}

function formatWithCommas(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function hitChanceColor(chance: number): string {
  if (chance >= 0.9) return "#9cc954";
  if (chance >= 0.5) return "#5ccbcb";
  if (chance >= 0.25) return "#fce447";
  if (chance >= 0.05) return "#f67c0f";
  return "#d81f27";
}

function propulsionOptionLabel(module: PropulsionModule): string {
  return module.id.replace(/^.*-/, "").toUpperCase();
}

function skillLevelFromString(value: string): SkillLevel {
  const level = Number.parseInt(value, 10);
  if (level === 0 || level === 1 || level === 2 || level === 3 || level === 4 || level === 5) return level;
  return 0;
}

function skillOptionLabel(i18n: I18n, level: SkillLevel): string {
  return `${i18n.t("skill.level")} ${level}`;
}

function formatNumber(value: number, decimals = 2): string {
  return String(Number(value.toFixed(decimals)));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function chargeStatSuffix(option: ChargeOption): string {
  const parts = [`range x${formatMultiplier(option.rangeMultiplier)}`, `track x${formatMultiplier(option.trackingMultiplier)}`];
  if (option.falloffMultiplier !== 1) {
    parts.splice(1, 0, `falloff x${formatMultiplier(option.falloffMultiplier)}`);
  }
  return parts.join(" · ");
}

function formatMultiplier(value: number): string {
  return String(Number(value.toFixed(2)));
}

function isSigResClass(value: string): value is SigResolutionClass {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

const NEUTRAL_STAT_CONDITIONS: StatConditions = { skillLevel: 5, overloaded: true };
