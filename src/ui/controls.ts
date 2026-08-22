import type { Ships, SkillLevel } from "../ships";
import {
  SIG_RESOLUTIONS,
  type AutopilotMode,
  type EngagementFrame,
  type HitChance,
  type HitChanceBreakdown,
  type ShipConfig,
  type SigResolutionClass,
  type SimConfig,
  type TurretSpec,
} from "../sim";
import {
  type CargoCharge,
  type ChargeCatalog,
  type FittingImport,
  type FittingSummary,
  type GunFamilies,
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
import { HINT_CANDIDATES, LORES, TIP_TEXT } from "./hints";
import type { TimeoutId, Timer } from "./timer";
import {
  el,
  elOf,
  fittingAreaSelector,
  isHtmlButtonElement,
  isHtmlImageElement,
  isHtmlInputElement,
  isHtmlSelectElement,
  isHtmlTextAreaElement,
  isEventTargetWithClosest,
  num,
  setText,
  type Els,
} from "./controlsDom";
import { SidePanel, type SidePanelHost } from "./sidePanel";
import { PopupGroup, type Popup } from "./popupGroup";
import {
  AGGRESSIVITY_MAX,
  AGGRESSIVITY_MIN,
  DEFAULT_GRID_BRIGHTNESS,
  NEUTRAL_STAT_CONDITIONS,
  aggressivityFromPosition,
  chargeStatSuffix,
  formatNumber,
  formatWithCommas,
  hitChanceColor,
  isAutopilotMode,
  isSigResClass,
  parseManeuverAggressivity,
  positionFromAggressivity,
  profileSettingsOf,
  settingsEqual,
  skillLevelFromString,
} from "./controlsFormat";

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
  private readonly els: Els;
  private readonly hitChance: HitChance;
  private readonly i18n: I18n;
  private readonly settingsStore: SettingsStore;
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly gunFamilies: GunFamilies;
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
  private openFittingSide: "attacker" | "target" | null = null;
  private importSidePopupOpen = false;
  private pendingImportText?: string;
  private openPreviewSide: "attacker" | "target" | null = null;
  private currentPreviewAnchor?: HTMLElement;
  private currentPreviewText?: string;
  private currentPreviewEye?: HTMLButtonElement;
  private currentPreviewInMenu = false;
  private openAmmo = false;
  private attackerAmmo = "";
  private attackerTurret?: ImportedTurret;
  private attackerCargoCharges: readonly CargoCharge[] = [];
  private attackerAmmoAllExpanded = false;
  private readonly popupGroup: PopupGroup;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly attackerSkillPopup: Popup;
  private readonly targetSkillPopup: Popup;
  private readonly attackerPastePopup: Popup;
  private readonly targetPastePopup: Popup;
  private readonly attackerPropulsionVariantPopup: Popup;
  private readonly targetPropulsionVariantPopup: Popup;
  private readonly attackerFittingPopup: Popup;
  private readonly targetFittingPopup: Popup;
  private readonly importSidePopup: Popup;
  private readonly attackerAmmoPopup: Popup;
  private selectedProfile: ProfileSettings | null = null;
  private readonly sigResOriginalTitles: Partial<Record<SigResolutionClass, string>> = {};

  constructor({
    hitChance,
    i18n,
    settingsStore,
    ships,
    fittingImport,
    gunFamilies,
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
    gunFamilies: GunFamilies;
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
    this.gunFamilies = gunFamilies;
    this.presetFittings = presetFittings;
    this.savedFittings = savedFittings;
    this.clipboard = clipboard;
    this.timer = timer;
    this.chargeCatalog = chargeCatalog;
    this.imageCatalog = imageCatalog;
    this.attackerAmmo = chargeCatalog.usualForChargeSize(1);
    this.popupGroup = new PopupGroup();
    this.trackingInput = new TrackingInput();
    this.hintRotator = new HintRotator({
      element: el("slide-hints"),
      i18n,
      candidates: HINT_CANDIDATES,
      tipText: TIP_TEXT,
      lores: LORES,
      timer,
      intervalMs: 20_000,
    });
    this.els = {
      tracking: elOf("tracking", isHtmlInputElement),
      trackingUnitRad: elOf("tracking-unit-rad", isHtmlButtonElement),
      trackingUnitScore: elOf("tracking-unit-score", isHtmlButtonElement),
      sigRes: elOf("sigRes", isHtmlSelectElement),
      sigResOptions: el("sig-res-options"),
      optimal: elOf("optimal", isHtmlInputElement),
      falloff: elOf("falloff", isHtmlInputElement),
      attackerAmmoField: el("attacker-ammo-field"),
      attackerAmmoTrigger: elOf("attacker-ammo-trigger", isHtmlButtonElement),
      attackerAmmoSummary: el("attacker-ammo-summary"),
      attackerAmmoSummaryIcon: elOf("attacker-ammo-summary-icon", isHtmlImageElement),
      attackerAmmoPopup: el("attacker-ammo-popup"),
      attackerAmmoCargoLabel: el("attacker-ammo-cargo-label"),
      attackerAmmoCargoList: el("attacker-ammo-cargo-list"),
      attackerAmmoExpand: elOf("attacker-ammo-expand", isHtmlButtonElement),
      attackerAmmoAllSection: el("attacker-ammo-all-section"),
      attackerAmmoAllList: el("attacker-ammo-all-list"),
      hullOptions: el("hull-options"),
      attackerHull: elOf("attacker-hull", isHtmlInputElement),
      attackerShipImage: elOf("attacker-ship-image", isHtmlImageElement),
      attackerFittingTrigger: elOf("attacker-fitting-trigger", isHtmlButtonElement),
      attackerFittingEye: elOf("attacker-fitting-eye", isHtmlButtonElement),
      attackerFittingPopup: el("attacker-fitting-popup"),
      attackerFittingPreview: el("attacker-fitting-preview"),
      attackerFittingSavedLabel: el("attacker-fitting-saved-label"),
      attackerFittingSavedList: el("attacker-fitting-saved-list"),
      attackerFittingPresetLabel: el("attacker-fitting-preset-label"),
      attackerFittingPresetList: el("attacker-fitting-preset-list"),
      attackerFittingEmpty: el("attacker-fitting-empty"),
      attackerHullHint: el("attacker-hull-hint"),
      attackerFittingName: el("attacker-fitting-name"),
      attackerImportFitting: elOf("attacker-import-fitting", isHtmlButtonElement),
      attackerPastePopup: el("attacker-paste-popup"),
      attackerPasteInput: elOf("attacker-paste-input", isHtmlTextAreaElement),
      attackerPropulsion: elOf("attacker-propulsion", isHtmlSelectElement),
      attackerPropulsionOptions: el("attacker-propulsion-options"),
      attackerPropulsionGear: elOf("attacker-propulsion-gear", isHtmlButtonElement),
      attackerPropulsionVariants: el("attacker-propulsion-variants"),
      attackerSkills: elOf("attacker-skills", isHtmlSelectElement),
      attackerSkillOptions: el("attacker-skill-options"),
      attackerSkillSummary: el("attacker-skill-summary"),
      attackerSkillTrigger: elOf("attacker-skill-trigger", isHtmlButtonElement),
      attackerSkillPopup: el("attacker-skill-popup"),
      attackerOverload: elOf("attacker-overload", isHtmlInputElement),
      attackerOverloadButton: elOf("attacker-overload-button", isHtmlButtonElement),
      attackerSpeed: elOf("attacker-speed", isHtmlInputElement),
      attackerMass: elOf("attacker-mass", isHtmlInputElement),
      attackerInertia: elOf("attacker-inertia", isHtmlInputElement),
      attackerAlignTime: el("attacker-align-time"),
      attackerMode: elOf("attacker-mode", isHtmlSelectElement),
      attackerRange: elOf("attacker-range", isHtmlInputElement),
      maneuverAggressivity: elOf("maneuver-aggressivity", isHtmlInputElement),
      maneuverAggressivitySlider: elOf("maneuver-aggressivity-slider", isHtmlInputElement),
      maneuverAggressivityValue: el("maneuver-aggressivity-value"),
      initialDistance: elOf("initial-distance", isHtmlInputElement),
      targetHull: elOf("target-hull", isHtmlInputElement),
      targetShipImage: elOf("target-ship-image", isHtmlImageElement),
      targetFittingTrigger: elOf("target-fitting-trigger", isHtmlButtonElement),
      targetFittingEye: elOf("target-fitting-eye", isHtmlButtonElement),
      targetFittingPopup: el("target-fitting-popup"),
      targetFittingPreview: el("target-fitting-preview"),
      targetFittingSavedLabel: el("target-fitting-saved-label"),
      targetFittingSavedList: el("target-fitting-saved-list"),
      targetFittingPresetLabel: el("target-fitting-preset-label"),
      targetFittingPresetList: el("target-fitting-preset-list"),
      targetFittingEmpty: el("target-fitting-empty"),
      targetHullHint: el("target-hull-hint"),
      targetFittingName: el("target-fitting-name"),
      targetImportFitting: elOf("target-import-fitting", isHtmlButtonElement),
      targetPastePopup: el("target-paste-popup"),
      targetPasteInput: elOf("target-paste-input", isHtmlTextAreaElement),
      targetPropulsion: elOf("target-propulsion", isHtmlSelectElement),
      targetPropulsionOptions: el("target-propulsion-options"),
      targetPropulsionGear: elOf("target-propulsion-gear", isHtmlButtonElement),
      targetPropulsionVariants: el("target-propulsion-variants"),
      targetSkills: elOf("target-skills", isHtmlSelectElement),
      targetSkillOptions: el("target-skill-options"),
      targetSkillSummary: el("target-skill-summary"),
      targetSkillTrigger: elOf("target-skill-trigger", isHtmlButtonElement),
      targetSkillPopup: el("target-skill-popup"),
      targetOverload: elOf("target-overload", isHtmlInputElement),
      targetOverloadButton: elOf("target-overload-button", isHtmlButtonElement),
      targetSpeed: elOf("target-speed", isHtmlInputElement),
      targetMass: elOf("target-mass", isHtmlInputElement),
      targetInertia: elOf("target-inertia", isHtmlInputElement),
      targetAlignTime: el("target-align-time"),
      targetMode: elOf("target-mode", isHtmlSelectElement),
      targetRange: elOf("target-range", isHtmlInputElement),
      targetSig: elOf("target-sig", isHtmlInputElement),
      simSpeed: elOf("sim-speed", isHtmlSelectElement),
      profileName: elOf("profile-name", isHtmlInputElement),
      profileSave: elOf("profile-save", isHtmlButtonElement),
      profileSelect: elOf("profile-select", isHtmlSelectElement),
      profileDelete: elOf("profile-delete", isHtmlButtonElement),
      shareLink: elOf("share-link", isHtmlButtonElement),
      importProfile: elOf("import-profile", isHtmlButtonElement),
      importSidePopup: el("import-side-popup"),
      importSideAttacker: elOf("import-side-attacker", isHtmlButtonElement),
      importSideTarget: elOf("import-side-target", isHtmlButtonElement),
      shareStatus: el("share-status"),
      langEn: elOf("lang-en", isHtmlButtonElement),
      langZh: elOf("lang-zh", isHtmlButtonElement),
      langJa: elOf("lang-ja", isHtmlButtonElement),
      play: elOf("play", isHtmlButtonElement),
      reset: elOf("reset", isHtmlButtonElement),
      resDistance: el("res-distance"),
      resTransversal: el("res-transversal"),
      resAngular: el("res-angular"),
      resRadial: el("res-radial"),
      resTrackPen: el("res-track-pen"),
      resRangePen: el("res-range-pen"),
      resHit: el("res-hit"),
      gridBrightnessSlider: elOf("grid-brightness-slider", isHtmlInputElement),
      gridBrightnessValue: el("grid-brightness-value"),
    };

    this.attackerPreview = new DomFittingPreview({
      container: this.els.attackerFittingPreview,
      i18n: this.i18n,
      imageCatalog: this.imageCatalog,
      viewport: () => window,
    });
    this.targetPreview = new DomFittingPreview({
      container: this.els.targetFittingPreview,
      i18n: this.i18n,
      imageCatalog: this.imageCatalog,
      viewport: () => window,
    });
    this.attackerSide = new SidePanel({
      side: "attacker",
      host: this.createSidePanelHost("attacker"),
      popupGroup: this.popupGroup,
      els: {
        hull: this.els.attackerHull,
        shipImage: this.els.attackerShipImage,
        fittingName: this.els.attackerFittingName,
        hullHint: this.els.attackerHullHint,
        speed: this.els.attackerSpeed,
        mass: this.els.attackerMass,
        inertia: this.els.attackerInertia,
        alignTime: this.els.attackerAlignTime,
        mode: this.els.attackerMode,
        range: this.els.attackerRange,
        skills: this.els.attackerSkills,
        skillOptions: this.els.attackerSkillOptions,
        skillSummary: this.els.attackerSkillSummary,
        skillTrigger: this.els.attackerSkillTrigger,
        skillPopup: this.els.attackerSkillPopup,
        overload: this.els.attackerOverload,
        overloadButton: this.els.attackerOverloadButton,
        pastePopup: this.els.attackerPastePopup,
        pasteInput: this.els.attackerPasteInput,
        importFitting: this.els.attackerImportFitting,
        propulsion: this.els.attackerPropulsion,
        propulsionOptions: this.els.attackerPropulsionOptions,
        propulsionGear: this.els.attackerPropulsionGear,
        propulsionVariants: this.els.attackerPropulsionVariants,
      },
      i18n: this.i18n,
      ships: this.ships,
      fittingImport: this.fittingImport,
      imageCatalog: this.imageCatalog,
      timer: this.timer,
    });
    this.targetSide = new SidePanel({
      side: "target",
      host: this.createSidePanelHost("target"),
      popupGroup: this.popupGroup,
      els: {
        hull: this.els.targetHull,
        shipImage: this.els.targetShipImage,
        fittingName: this.els.targetFittingName,
        hullHint: this.els.targetHullHint,
        speed: this.els.targetSpeed,
        mass: this.els.targetMass,
        inertia: this.els.targetInertia,
        alignTime: this.els.targetAlignTime,
        mode: this.els.targetMode,
        range: this.els.targetRange,
        targetSig: this.els.targetSig,
        skills: this.els.targetSkills,
        skillOptions: this.els.targetSkillOptions,
        skillSummary: this.els.targetSkillSummary,
        skillTrigger: this.els.targetSkillTrigger,
        skillPopup: this.els.targetSkillPopup,
        overload: this.els.targetOverload,
        overloadButton: this.els.targetOverloadButton,
        pastePopup: this.els.targetPastePopup,
        pasteInput: this.els.targetPasteInput,
        importFitting: this.els.targetImportFitting,
        propulsion: this.els.targetPropulsion,
        propulsionOptions: this.els.targetPropulsionOptions,
        propulsionGear: this.els.targetPropulsionGear,
        propulsionVariants: this.els.targetPropulsionVariants,
      },
      i18n: this.i18n,
      ships: this.ships,
      fittingImport: this.fittingImport,
      imageCatalog: this.imageCatalog,
      timer: this.timer,
    });

    this.attackerSkillPopup = this.attackerSide.getSkillPopup();
    this.targetSkillPopup = this.targetSide.getSkillPopup();
    this.attackerPastePopup = this.attackerSide.getPastePopup();
    this.targetPastePopup = this.targetSide.getPastePopup();
    this.attackerPropulsionVariantPopup = this.attackerSide.getPropulsionVariantPopup();
    this.targetPropulsionVariantPopup = this.targetSide.getPropulsionVariantPopup();
    this.attackerFittingPopup = this.createFittingPopup("attacker");
    this.targetFittingPopup = this.createFittingPopup("target");
    this.importSidePopup = this.createImportSidePopup();
    this.attackerAmmoPopup = this.createAttackerAmmoPopup();
    this.popupGroup.register(this.attackerFittingPopup);
    this.popupGroup.register(this.targetFittingPopup);
    this.popupGroup.register(this.importSidePopup);
    this.popupGroup.register(this.attackerAmmoPopup);

    this.renderAttackerAmmo();
    this.populateHullDatalist();
    this.attackerSide.renderSkillOptions();
    this.targetSide.renderSkillOptions();

    this.restoreSavedState();
    this.bind();
    this.attackerSide.updateAlignTime();
    this.targetSide.updateAlignTime();
  }

  private side(side: "attacker" | "target"): SidePanel {
    return side === "attacker" ? this.attackerSide : this.targetSide;
  }

  private createSidePanelHost(side: "attacker" | "target"): SidePanelHost {
    const fittingPopup = () => (side === "attacker" ? this.attackerFittingPopup : this.targetFittingPopup);
    return {
      updateFittingTrigger: (enabled) => this.updateFittingTrigger(side, enabled),
      isFittingPopupOpen: () => fittingPopup().isOpen(),
      renderFittingPopup: () => {
        if (fittingPopup().isOpen()) this.renderFittingPopup(side);
      },
      closeFittingPopup: () => {
        const popup = fittingPopup();
        if (popup.isOpen()) this.popupGroup.close(popup);
      },
      hidePreview: () => this.hidePreview(side),
      onAttackerFittedHullCleared: () => {
        if (side === "attacker") this.onAttackerFittedHullCleared();
      },
      importEftFitting: (text, persist) => this.importEftFitting(side, text, persist),
      mostRecentFittingFor: (hullName) => this.savedFittings.mostRecentFor(hullName),
      persistConfigChange: (notify) => this.persistConfigChange(notify),
      restoreAttackerTurret: () => {
        if (side === "attacker") this.restoreAttackerTurret();
      },
      importFittingFromText: (text) => this.importFittingFromText(side, text),
      importFitting: () => this.importFitting(side),
    };
  }

  private onAttackerFittedHullCleared(): void {
    this.popupGroup.close(this.attackerAmmoPopup);
    this.attackerTurret = undefined;
    this.attackerCargoCharges = [];
    this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
    this.attackerAmmoAllExpanded = false;
    this.els.attackerAmmoAllSection.hidden = true;
    this.renderAttackerAmmo();
    this.renderSigResIcons();
  }

  private persistConfigChange(notify = true): void {
    this.savePreferences();
    this.updateSaveButtonState();
    if (notify) this.callbacks?.onConfigChange();
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
    this.attackerSide.setOverloadDisabled();
    this.targetSide.setOverloadDisabled();
    this.updateUnitToggle();
    this.updateLanguageToggle();
    this.setBestInitialDistance();
    this.updateManeuverAggressivityDisplay();
    this.updateManeuverAggressivityEnabled();
    this.updateGridBrightnessDisplay();
    this.setPlaying(false);
    this.attackerSide.renderPropulsionOptions();
    this.targetSide.renderPropulsionOptions();
    this.renderProfiles(selectedName ?? "");
  }

  private applyPreferences(preferences: DisplayPreferences): void {
    this.i18n.setLanguage(preferences.language);
    const display = this.trackingInput.setUnit(preferences.trackingUnit, this.currentSigResolution());
    this.els.tracking.value = String(display);
    this.els.simSpeed.value = String(preferences.simSpeed);
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
      sigResolution: SIG_RESOLUTIONS[this.currentSigResValue()],
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
    };
  }

  getTargetSig(): number {
    return num(this.els.targetSig);
  }

  getConfig(): SimConfig {
    const initialDistance = Math.max(num(this.els.initialDistance), 1);
    const aggressivity = parseManeuverAggressivity(this.els.maneuverAggressivity);
    const attacker: ShipConfig = {
      id: "attacker",
      maxSpeed: num(this.els.attackerSpeed),
      mass: num(this.els.attackerMass),
      inertiaModifier: num(this.els.attackerInertia),
      mode: this.currentMode("attacker"),
      desiredRange: num(this.els.attackerRange),
      aggressivity,
      orbitDirection: "cw",
    };
    const target: ShipConfig = {
      id: "target",
      maxSpeed: num(this.els.targetSpeed),
      mass: num(this.els.targetMass),
      inertiaModifier: num(this.els.targetInertia),
      mode: this.currentMode("target"),
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
    const value = Number.parseFloat(this.els.gridBrightnessSlider.value);
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

    this.els.resHit.style.color = hitChanceColor(hit.chance);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.els.play.textContent = this.i18n.t(
      playing ? "button.pause" : "button.play",
    );
  }

  private onManeuverAggressivityChange(): void {
    const slider = this.els.maneuverAggressivitySlider;
    const pos = Number.parseFloat(slider.value);
    const value = Math.round(aggressivityFromPosition(pos) * 100) / 100;
    this.updateManeuverAggressivityDisplay(value);
    this.updateSaveButtonState();
    this.savePreferences();
    this.callbacks?.onConfigChange();
  }

  private updateManeuverAggressivityDisplay(value?: number): void {
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

  private updateManeuverAggressivityEnabled(): void {
    const slider = this.els.maneuverAggressivitySlider;
    slider.disabled = this.els.attackerMode.value === "midships";
  }

  private onGridBrightnessChange(): void {
    this.updateGridBrightnessDisplay();
    this.updateSaveButtonState();
    this.savePreferences();
    this.callbacks?.onDisplayChange();
  }

  private updateGridBrightnessDisplay(value?: number): void {
    const slider = this.els.gridBrightnessSlider;
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
      sigRes: this.currentSigResValue(),
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
      attackerSpeed: num(this.els.attackerSpeed),
      attackerMode: this.currentMode("attacker"),
      attackerRange: num(this.els.attackerRange),
      maneuverAggressivity: parseManeuverAggressivity(this.els.maneuverAggressivity),
      gridBrightness: this.getGridBrightness(),
      attackerMass: num(this.els.attackerMass),
      attackerInertia: num(this.els.attackerInertia),
      attackerSkillLevel: skillLevelFromString(this.els.attackerSkills.value),
      attackerOverload: this.els.attackerOverload.checked,
      attackerHull: this.attackerSide.profile?.name,
      attackerPropulsion: this.attackerSide.currentPropulsionSelection(),
      attackerFitting: this.attackerSide.fittingText,
      attackerOverrides: this.attackerSide.overrides,
      attackerFittedHull: this.attackerSide.fittedHull,
      initialDistance: Math.max(num(this.els.initialDistance), 1),
      targetSpeed: num(this.els.targetSpeed),
      targetMode: this.currentMode("target"),
      targetRange: num(this.els.targetRange),
      targetMass: num(this.els.targetMass),
      targetInertia: num(this.els.targetInertia),
      targetSkillLevel: skillLevelFromString(this.els.targetSkills.value),
      targetOverload: this.els.targetOverload.checked,
      targetSig: Math.max(num(this.els.targetSig), 1),
      targetHull: this.targetSide.profile?.name,
      targetPropulsion: this.targetSide.currentPropulsionSelection(),
      targetFitting: this.targetSide.fittingText,
      targetOverrides: this.targetSide.overrides,
      targetFittedHull: this.targetSide.fittedHull,
      attackerAmmo: this.attackerAmmo,
      simSpeed: num(this.els.simSpeed),
      language: this.i18n.current(),
    };
  }

  private loadSettings(settings: UserSettings, selectedName = ""): void {
    this.attackerSide.fittingText = settings.attackerFitting;
    this.attackerSide.overrides = settings.attackerOverrides ?? {};
    this.targetSide.fittingText = settings.targetFitting;
    this.targetSide.overrides = settings.targetOverrides ?? {};
    this.attackerAmmo = settings.attackerAmmo;
    this.i18n.setLanguage(settings.language);

    const sigResolution = SIG_RESOLUTIONS[settings.sigRes];
    this.trackingInput.setRadValue(settings.tracking, sigResolution);
    this.trackingInput.setUnit(settings.trackingUnit, sigResolution);

    this.els.sigRes.value = settings.sigRes;
    this.setChoiceGroup(this.els.sigResOptions, settings.sigRes);
    this.els.optimal.value = String(settings.optimal);
    this.els.falloff.value = String(settings.falloff);
    this.els.attackerSpeed.value = formatNumber(settings.attackerSpeed);
    this.els.attackerMass.value = String(settings.attackerMass);
    this.els.attackerInertia.value = formatNumber(settings.attackerInertia, 6);
    this.els.attackerMode.value = settings.attackerMode;
    this.els.attackerRange.value = String(settings.attackerRange);
    this.els.maneuverAggressivity.value = String(settings.maneuverAggressivity ?? 1);
    this.els.gridBrightnessSlider.value = String(settings.gridBrightness ?? DEFAULT_GRID_BRIGHTNESS);
    this.els.initialDistance.value = String(settings.initialDistance);
    this.els.targetSpeed.value = formatNumber(settings.targetSpeed);
    this.els.targetMass.value = String(settings.targetMass);
    this.els.targetInertia.value = formatNumber(settings.targetInertia, 6);
    this.els.targetMode.value = settings.targetMode;
    this.els.targetRange.value = String(settings.targetRange);
    this.els.targetSig.value = String(settings.targetSig);
    this.els.simSpeed.value = String(settings.simSpeed);

    this.attackerSide.loadHull(settings.attackerHull, settings.attackerPropulsion);
    this.targetSide.loadHull(settings.targetHull, settings.targetPropulsion);

    this.i18n.translateDocument();
    this.attackerSide.renderSkillOptions(settings.attackerSkillLevel ?? 5);
    this.targetSide.renderSkillOptions(settings.targetSkillLevel ?? 5);
    this.attackerSide.setOverloadActive(settings.attackerOverload ?? true);
    this.targetSide.setOverloadActive(settings.targetOverload ?? true);
    this.attackerSide.setOverloadDisabled();
    this.targetSide.setOverloadDisabled();

    this.restoreAttackerTurret();

    if (settings.attackerFittedHull) {
      this.attackerSide.restoreFittingSummary(settings.attackerFittedHull);
    }
    if (settings.targetFittedHull) {
      this.targetSide.restoreFittingSummary(settings.targetFittedHull);
    }
    this.displayTrackingInput();
    this.updateUnitToggle();
    this.updateLanguageToggle();
    this.renderProfiles(selectedName);
    this.setPlaying(this.playing);
    this.updateManeuverAggressivityDisplay();
    this.updateManeuverAggressivityEnabled();
    this.updateGridBrightnessDisplay();
    this.attackerSide.updateAlignTime();
    this.targetSide.updateAlignTime();
    this.hintRotator.refresh();
    this.savePreferences();
  }

  private setBestInitialDistance(): void {
    const turret = this.getTurret();
    const targetSig = this.getTargetSig();
    const targetSpeed = num(this.els.targetSpeed);
    const best = this.hitChance.findBestDistance(targetSpeed, turret, targetSig);
    if (!Number.isFinite(best) || best <= 0) return;

    this.els.initialDistance.value = String(Math.round(best));

    // Make the target's desired orbit range match the starting distance by default.
    this.els.targetRange.value = String(Math.round(best));
  }

  private currentSigResValue(): SigResolutionClass {
    const value = this.els.sigRes.value;
    if (!isSigResClass(value)) throw new Error(`Invalid sigRes value: ${value}`);
    return value;
  }

  private currentMode(side: "attacker" | "target"): AutopilotMode {
    const select = this.els[`${side}Mode`];
    if (!isHtmlSelectElement(select)) throw new Error(`Expected ${side}Mode to be a select`);
    const value = select.value;
    if (!isAutopilotMode(value)) throw new Error(`Invalid autopilot mode: ${value}`);
    return value;
  }

  private currentSigResolution(): number {
    return SIG_RESOLUTIONS[this.currentSigResValue()];
  }

  private setTrackingUnit(unit: TrackingUnit): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.setUnit(unit, sigResolution);
    this.els.tracking.value = String(display);
    this.updateUnitToggle();
    this.savePreferences();
    this.updateSaveButtonState();
  }

  private updateTrackingFromInput(): void {
    const value = num(this.els.tracking);
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.setDisplayValue(value, sigResolution);
    this.els.tracking.value = String(display);
  }

  private updateTrackingForSigResolution(): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.displayValue(sigResolution);
    this.els.tracking.value = String(display);
  }

  private displayTrackingInput(): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.displayValue(sigResolution);
    this.els.tracking.value = String(display);
  }

  private updateUnitToggle(): void {
    const radActive = this.trackingInput.unit === "rad";
    const scoreActive = this.trackingInput.unit === "score";
    this.els.trackingUnitRad.classList.toggle("active", radActive);
    this.els.trackingUnitRad.setAttribute("aria-pressed", String(radActive));
    this.els.trackingUnitScore.classList.toggle("active", scoreActive);
    this.els.trackingUnitScore.setAttribute("aria-pressed", String(scoreActive));
  }

  private setLanguage(language: Language): void {
    const selected = this.els.profileSelect.value;
    this.popupGroup.close(this.attackerSkillPopup);
    this.popupGroup.close(this.targetSkillPopup);
    this.i18n.setLanguage(language);
    this.i18n.translateDocument();
    this.updateLanguageToggle();
    this.renderProfiles(selected);
    this.attackerSide.renderPropulsionOptions();
    this.targetSide.renderPropulsionOptions();
    this.renderSigResIcons();
    this.attackerSide.clearImportHint();
    this.targetSide.clearImportHint();
    this.populateHullDatalist();
    this.attackerSide.refreshHullInputs();
    this.targetSide.refreshHullInputs();
    if (this.openFittingSide) this.renderFittingPopup(this.openFittingSide);
    this.refreshPreview();
    this.attackerSide.updateHullHint();
    this.targetSide.updateHullHint();
    this.attackerSide.renderSkillOptions();
    this.targetSide.renderSkillOptions();
    this.hintRotator.refresh();
    this.setPlaying(this.playing);
    this.savePreferences();
    this.updateSaveButtonState();
    this.callbacks?.onDisplayChange();
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
    const select = this.els.profileSelect;
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
    const selected = this.els.profileSelect.value;
    const name = this.els.profileName.value.trim();
    const profileName = name || selected;
    if (!profileName) return;
    const profile = profileSettingsOf(this.getSettings());
    this.settingsStore.saveProfile(profileName, profile);
    this.settingsStore.selectProfile(profileName);
    this.els.profileName.value = "";
    this.renderProfiles(profileName);
    this.selectedProfile = profile;
    this.updateSaveButtonState();
  }

  private loadProfile(): void {
    const name = this.els.profileSelect.value;
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
    const name = this.els.profileSelect.value;
    if (!name) return;
    this.settingsStore.deleteProfile(name);
    this.renderProfiles();
    this.selectedProfile = null;
    this.updateSaveButtonState();
  }

  private updateSaveButtonState(): void {
    const selected = this.els.profileSelect.value;
    const name = this.els.profileName.value.trim();
    let saved: ProfileSettings | null = null;
    if (name && name !== selected) {
      saved = this.settingsStore.loadProfile(name);
    } else if (selected) {
      saved = this.selectedProfile;
    }
    const current = profileSettingsOf(this.getSettings());
    const pending = saved ? !settingsEqual(saved, current) : name.length > 0;
    this.els.profileSave.classList.toggle("unsaved", pending);
  }

  private async importFitting(side: "attacker" | "target"): Promise<void> {
    const pastePopup = side === "attacker" ? this.attackerPastePopup : this.targetPastePopup;
    if (pastePopup.isOpen()) {
      this.popupGroup.close(pastePopup);
      return;
    }
    if (this.attackerPastePopup.isOpen()) this.popupGroup.close(this.attackerPastePopup);
    if (this.targetPastePopup.isOpen()) this.popupGroup.close(this.targetPastePopup);
    let text: string;
    try {
      text = await this.clipboard.readText();
    } catch (error) {
      if (error instanceof ClipboardUnavailableError) {
        this.popupGroup.open(pastePopup);
        return;
      }
      const panel = this.side(side);
      panel.clearImportHintTimeout();
      panel.showImportHint("status.clipboardDenied", true);
      return;
    }
    await this.importFittingFromText(side, text);
  }

  private async importFittingFromText(side: "attacker" | "target", text: string): Promise<void> {
    const panel = this.side(side);
    panel.clearImportHintTimeout();
    const trimmed = text.trimStart();
    if (trimmed.startsWith(PROFILE_TEXT_HEADER)) {
      const parsed = parseProfile(trimmed);
      const fitting = parsed === undefined ? undefined : side === "attacker" ? parsed.attackerFitting : parsed.targetFitting;
      if (fitting === undefined) {
        panel.showImportHint("status.fittingInvalid", true);
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
    const panel = this.side(side);
    const conditions = panel.skillConditions();
    const imported = this.fittingImport.importFitting(text, conditions);
    if (!imported) {
      panel.showImportHint("status.fittingInvalid", true);
      return undefined;
    }
    panel.clearFittedHull();
    panel.fittingText = text;
    panel.overrides = {};
    panel.loadHull(imported.profile.name, imported.propulsion?.propulsionId);
    panel.applyImportedFitting(this.fittedHullSummary(imported));
    if (side === "attacker") this.applyImportedTurret(imported);
    if (persist) {
      panel.lastCommittedHull = imported.profile.name;
      this.savePreferences();
      this.updateSaveButtonState();
      this.callbacks?.onConfigChange();
    }
    panel.showImportHint("status.fittingImported");
    return imported;
  }

  private async onImportProfileClick(): Promise<void> {
    if (this.importSidePopup.isOpen()) {
      this.popupGroup.close(this.importSidePopup);
      this.importSidePopup.focusTrigger();
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
    this.pendingImportText = text;
    this.popupGroup.open(this.importSidePopup);
  }

  private openImportSidePopup(text: string): void {
    const popup = this.els.importSidePopup;
    const trigger = this.els.importProfile;
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    this.pendingImportText = text;
    this.importSidePopupOpen = true;
    this.els.importSideAttacker.focus();
  }

  private closeImportSidePopup(): void {
    const popup = this.els.importSidePopup;
    const trigger = this.els.importProfile;
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    this.pendingImportText = undefined;
    this.importSidePopupOpen = false;
  }

  private async onImportSideClick(side: "attacker" | "target"): Promise<void> {
    const text = this.pendingImportText;
    this.popupGroup.close(this.importSidePopup);
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
    this.els.play.addEventListener("click", () => this.callbacks?.onPlayPause());
    this.els.reset.addEventListener("click", () => this.callbacks?.onReset());
    this.els.simSpeed.addEventListener("change", () => {
      this.callbacks?.onSpeedChange(this.getSpeed());
    });
    this.els.trackingUnitRad.addEventListener("click", () => this.setTrackingUnit("rad"));
    this.els.trackingUnitScore.addEventListener("click", () => this.setTrackingUnit("score"));
    this.els.langEn.addEventListener("click", () => this.setLanguage("en"));
    this.els.langZh.addEventListener("click", () => this.setLanguage("zh"));
    this.els.langJa.addEventListener("click", () => this.setLanguage("ja"));
    this.els.profileSave.addEventListener("click", () => this.saveProfile());
    this.els.profileSelect.addEventListener("change", () => this.loadProfile());
    this.els.profileDelete.addEventListener("click", () => this.deleteProfile());
    this.els.shareLink.addEventListener("click", () => this.copyProfile());
    this.els.importProfile.addEventListener("click", () => void this.onImportProfileClick());
    this.els.importSideAttacker.addEventListener("click", () => void this.onImportSideClick("attacker"));
    this.els.importSideTarget.addEventListener("click", () => void this.onImportSideClick("target"));
    this.els.profileName.addEventListener("input", () => this.updateSaveButtonState());

    this.els.attackerImportFitting.addEventListener("click", () => this.attackerSide.onImportFittingClick());
    this.els.targetImportFitting.addEventListener("click", () => this.targetSide.onImportFittingClick());

    const attackerPastePopup = this.els.attackerPastePopup;
    const targetPastePopup = this.els.targetPastePopup;
    attackerPastePopup.addEventListener("paste", (event: ClipboardEvent) => this.attackerSide.onPastePopupPaste(event));
    targetPastePopup.addEventListener("paste", (event: ClipboardEvent) => this.targetSide.onPastePopupPaste(event));

    this.els.attackerHull.addEventListener("input", () => this.attackerSide.onHullInput());
    this.els.attackerHull.addEventListener("change", () => this.attackerSide.onHullChange());
    this.els.attackerFittingTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attackerFittingPopup));
    this.els.attackerFittingEye.addEventListener("click", () => this.toggleFittingPreview("attacker"));
    this.els.attackerAmmoTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attackerAmmoPopup));
    this.els.attackerAmmoExpand.addEventListener("click", () => this.onAttackerAmmoExpandClick());
    this.els.attackerPropulsion.addEventListener("change", () => this.attackerSide.onPropulsionChange());
    this.els.attackerPropulsionGear.addEventListener("click", () => this.popupGroup.toggle(this.attackerPropulsionVariantPopup));
    this.els.attackerSkills.addEventListener("change", () => this.attackerSide.onSkillOrOverloadChange(true));
    this.els.attackerOverload.addEventListener("change", () => this.attackerSide.onSkillOrOverloadChange(false));
    this.els.attackerOverloadButton.addEventListener("click", () => this.attackerSide.onOverloadButtonClick());
    this.els.targetHull.addEventListener("input", () => this.targetSide.onHullInput());
    this.els.targetHull.addEventListener("change", () => this.targetSide.onHullChange());
    this.els.targetFittingTrigger.addEventListener("click", () => this.popupGroup.toggle(this.targetFittingPopup));
    this.els.targetFittingEye.addEventListener("click", () => this.toggleFittingPreview("target"));
    this.els.targetPropulsion.addEventListener("change", () => this.targetSide.onPropulsionChange());
    this.els.targetPropulsionGear.addEventListener("click", () => this.popupGroup.toggle(this.targetPropulsionVariantPopup));
    this.els.targetSkills.addEventListener("change", () => this.targetSide.onSkillOrOverloadChange(true));
    this.els.targetOverload.addEventListener("change", () => this.targetSide.onSkillOrOverloadChange(false));
    this.els.targetOverloadButton.addEventListener("click", () => this.targetSide.onOverloadButtonClick());

    this.els.attackerSkillTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attackerSkillPopup));
    this.els.targetSkillTrigger.addEventListener("click", () => this.popupGroup.toggle(this.targetSkillPopup));

    this.bindChoiceGroup(this.els.sigResOptions, this.els.sigRes, ["S", "M", "L", "XL"]);

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
        if (id === "attackerMass") this.attackerSide.updateSpeedFromMass();
        if (id === "targetMass") this.targetSide.updateSpeedFromMass();
        if (id === "attackerMass" || id === "attackerInertia") this.attackerSide.updateAlignTime();
        if (id === "targetMass" || id === "targetInertia") this.targetSide.updateAlignTime();
        if (id === "attackerMode") this.updateManeuverAggressivityEnabled();
        this.recordOverrideForShipInput(id);
        this.updateSaveButtonState();
        this.savePreferences();
        this.callbacks?.onConfigChange();
      });
    }

    this.els.maneuverAggressivitySlider.addEventListener("input", () => this.onManeuverAggressivityChange());
    this.els.gridBrightnessSlider.addEventListener("input", () => this.onGridBrightnessChange());

    document.addEventListener("pointerdown", (event: PointerEvent) => this.onDocumentPointerDown(event));
    document.addEventListener("keydown", (event: KeyboardEvent) => this.onDocumentKeyDown(event));
  }

  private formatDistance(m: number): string {
    if (m >= 10000) return `${formatWithCommas(m / 1000, 1)} ${this.i18n.t("unit.kilometer")}`;
    return `${formatWithCommas(Math.round(m))} ${this.i18n.t("unit.meter")}`;
  }

  private populateHullDatalist(): void {
    const datalist = this.els.hullOptions;
    datalist.innerHTML = "";
    for (const hull of this.presetFittings.listHulls()) {
      const option = document.createElement("option");
      option.value = hull;
      datalist.appendChild(option);
    }
  }

  private updateFittingTrigger(side: "attacker" | "target", enabled: boolean): void {
    this.els[`${side}FittingTrigger`].disabled = !enabled;
    this.els[`${side}FittingEye`].disabled = !enabled;
  }

  private openFittingPopup(side: "attacker" | "target"): void {
    const popup = this.els[`${side}FittingPopup`];
    const trigger = this.els[`${side}FittingTrigger`];
    this.renderFittingPopup(side);
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    this.openFittingSide = side;
    const current = this.findFittingItem(side, (item) => item.getAttribute("aria-current") === "true");
    const first = current ?? this.findFittingItem(side, (item) => !item.disabled);
    first?.focus();
  }

  private findFittingItem(side: "attacker" | "target", predicate: (item: HTMLButtonElement) => boolean): HTMLButtonElement | undefined {
    const savedList = this.els[`${side}FittingSavedList`];
    const presetList = this.els[`${side}FittingPresetList`];
    for (const list of [savedList, presetList]) {
      for (const entry of list.children) {
        const item = entry.children[0];
        if (!isHtmlButtonElement(item)) continue;
        if (predicate(item)) return item;
      }
    }
    return undefined;
  }

  private closeFittingPopup(side: "attacker" | "target"): void {
    const popup = this.els[`${side}FittingPopup`];
    const trigger = this.els[`${side}FittingTrigger`];
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (this.openFittingSide === side) this.openFittingSide = null;
    if (this.openPreviewSide === side && this.currentPreviewInMenu) this.hidePreview(side);
  }

  private renderFittingPopup(side: "attacker" | "target"): void {
    const profile = side === "attacker" ? this.attackerSide.profile : this.targetSide.profile;
    const savedList = this.els[`${side}FittingSavedList`];
    const presetList = this.els[`${side}FittingPresetList`];
    const savedLabel = this.els[`${side}FittingSavedLabel`];
    const presetLabel = this.els[`${side}FittingPresetLabel`];
    const empty = this.els[`${side}FittingEmpty`];
    savedList.innerHTML = "";
    presetList.innerHTML = "";
    const currentText = side === "attacker" ? this.attackerSide.fittingText : this.targetSide.fittingText;

    if (!profile) {
      savedLabel.hidden = true;
      presetLabel.hidden = true;
      empty.hidden = true;
      return;
    }

    const conditions = this.side(side).skillConditions();
    const saved = this.savedFittings.listForHull(profile.name);
    savedLabel.hidden = saved.length === 0;
    for (const fitting of saved) {
      const onFittingClick = () => this.onFittingItemClick(side, fitting.text);
      const item = this.createFittingItem(fitting.name, fitting.text, currentText, onFittingClick);
      const imported = this.fittingImport.importFitting(fitting.text, conditions);
      if (!imported) {
        item.classList.toggle("invalid", true);
        const invalidText = this.i18n.t("fitting.invalid");
        item.title = invalidText;
        item.disabled = true;
        item.setAttribute("aria-disabled", "true");
      }
      const entry = this.createFittingEntry(side, item, fitting.text, () => {
        this.savedFittings.remove(fitting.id);
        this.renderFittingPopup(side);
        const next = this.findFittingItem(side, (it) => !it.disabled) ?? this.els[`${side}FittingTrigger`];
        next.focus();
      });
      savedList.appendChild(entry);
    }

    const presets = this.presetFittings.fittingsFor(profile.name);
    presetLabel.hidden = presets.length === 0;
    for (let index = 0; index < presets.length; index++) {
      const fit = presets[index];
      const text = this.presetFittings.eftText(profile.name, fit);
      const onFittingClick = () => this.onFittingItemClick(side, text);
      const item = this.createFittingItem(fit.name, text, currentText, onFittingClick);
      presetList.appendChild(this.createFittingEntry(side, item, text, undefined));
    }

    empty.hidden = saved.length > 0 || presets.length > 0;
  }

  private createFittingItem(
    name: string,
    text: string,
    currentText: string | undefined,
    onClick: () => void,
    iconUrl?: string,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fitting-item";
    button.setAttribute("role", "menuitem");
    if (currentText === text) button.setAttribute("aria-current", "true");
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "propulsion-icon";
      icon.src = iconUrl;
      icon.alt = "";
      button.appendChild(icon);
    }
    const span = document.createElement("span");
    span.className = "fitting-item-name";
    span.textContent = name;
    span.title = name;
    button.appendChild(span);
    button.addEventListener("click", onClick);
    return button;
  }

  private createFittingEntry(
    side: "attacker" | "target",
    item: HTMLButtonElement,
    text: string,
    onDelete: (() => void) | undefined,
  ): HTMLElement {
    const li = document.createElement("li");
    li.className = "fitting-entry";
    li.setAttribute("role", "presentation");
    li.appendChild(item);
    li.appendChild(this.createFittingItemEye(side, text));
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

  private createFittingItemEye(side: "attacker" | "target", text: string): HTMLButtonElement {
    const eye = document.createElement("button");
    eye.type = "button";
    eye.className = "fitting-item-eye";
    eye.setAttribute("aria-pressed", "false");
    eye.setAttribute("title", this.i18n.t("button.fittingDetails"));
    eye.setAttribute("aria-label", this.i18n.t("button.fittingDetails"));
    eye.innerHTML = EYE_ICON_SVG;
    eye.addEventListener("click", () => this.showFittingPreview(side, text, eye, eye, true));
    return eye;
  }

  private previewOf(side: "attacker" | "target"): FittingPreview {
    return side === "attacker" ? this.attackerPreview : this.targetPreview;
  }

  private renderFittingPreview(side: "attacker" | "target", text: string, anchor: HTMLElement, eye: HTMLButtonElement): void {
    const summary = this.fittingImport.summarize(text);
    if (!summary || summary.sections.length === 0) {
      this.hidePreview(side);
      return;
    }
    const profile = side === "attacker" ? this.attackerSide.profile : this.targetSide.profile;
    const shipImageUrl = profile ? this.imageCatalog.shipImageUrl(profile.name) : undefined;
    this.currentPreviewEye?.setAttribute("aria-pressed", "false");
    this.currentPreviewAnchor = anchor;
    this.currentPreviewText = text;
    this.currentPreviewEye = eye;
    this.openPreviewSide = side;
    eye.setAttribute("aria-pressed", "true");
    this.previewOf(side).show(anchor, summary, shipImageUrl, () => this.hidePreview(side));
  }

  private showFittingPreview(side: "attacker" | "target", text: string, anchor: HTMLElement, eye: HTMLButtonElement, inMenu = false): void {
    if (this.openPreviewSide === side && this.currentPreviewText === text && this.currentPreviewAnchor === anchor) {
      this.hidePreview(side);
      return;
    }
    this.renderFittingPreview(side, text, anchor, eye);
    this.currentPreviewInMenu = inMenu;
  }

  private toggleFittingPreview(side: "attacker" | "target"): void {
    const text = side === "attacker" ? this.attackerSide.fittingText : this.targetSide.fittingText;
    if (!text) return;
    this.showFittingPreview(side, text, this.els[`${side}ShipImage`], this.els[`${side}FittingEye`]);
  }

  private hidePreview(side: "attacker" | "target"): void {
    this.previewOf(side).hide();
    if (this.openPreviewSide === side) {
      this.openPreviewSide = null;
      this.currentPreviewAnchor = undefined;
      this.currentPreviewText = undefined;
      this.currentPreviewInMenu = false;
    }
    this.currentPreviewEye?.setAttribute("aria-pressed", "false");
    this.currentPreviewEye = undefined;
  }

  private refreshPreview(): void {
    if (!this.openPreviewSide || !this.currentPreviewAnchor || !this.currentPreviewText) return;
    if (!this.currentPreviewAnchor.isConnected) {
      this.hidePreview(this.openPreviewSide);
      return;
    }
    const eye = this.currentPreviewEye ?? this.els[`${this.openPreviewSide}FittingEye`];
    this.renderFittingPreview(this.openPreviewSide, this.currentPreviewText, this.currentPreviewAnchor, eye);
  }

  private onFittingItemClick(side: "attacker" | "target", text: string): void {
    const imported = this.importEftFitting(side, text);
    const fittingPopup = side === "attacker" ? this.attackerFittingPopup : this.targetFittingPopup;
    this.popupGroup.close(fittingPopup);
    fittingPopup.focusTrigger();
    if (imported && this.openPreviewSide === side && !this.currentPreviewInMenu) {
      this.renderFittingPreview(side, text, this.els[`${side}ShipImage`], this.els[`${side}FittingEye`]);
    }
  }

  private clearAttackerTurretOverrides(): void {
    delete this.attackerSide.overrides.tracking;
    delete this.attackerSide.overrides.sigRes;
    delete this.attackerSide.overrides.optimal;
    delete this.attackerSide.overrides.falloff;
  }

  private renderAttackerAmmo(): void {
    const trigger = this.els.attackerAmmoTrigger;
    const summary = this.els.attackerAmmoSummary;
    const summaryIcon = this.els.attackerAmmoSummaryIcon;
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
    const group = this.els.sigResOptions;
    const turret = this.attackerTurret;
    for (const button of Array.from(group.children)) {
      if (!isHtmlButtonElement(button)) continue;
      const value = button.getAttribute("data-value") ?? "";
      if (!isSigResClass(value)) continue;
      const img = this.sigResIcon(button);
      const title = this.sigResOriginalTitle(value, button);
      if (turret) {
        const family = this.gunFamilies.familyOf(turret.moduleName);
        const representative = this.gunFamilies.representativeOf(family, value);
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
    const list = this.els.attackerAmmoCargoList;
    const label = this.els.attackerAmmoCargoLabel;
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
    const list = this.els.attackerAmmoAllList;
    const section = this.els.attackerAmmoAllSection;
    list.innerHTML = "";
    if (!this.attackerTurret) {
      list.hidden = true;
      return;
    }
    const options = this.chargeCatalog.chargesForTurret(this.attackerTurret);
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
    const expand = this.els.attackerAmmoExpand;
    const key = this.attackerAmmoAllExpanded ? "ammo.hideAll" : "ammo.showAll";
    expand.setAttribute("data-i18n", key);
    setText(expand, this.i18n.t(key));
  }

  private onAttackerAmmoItemClick(name: string): void {
    if (!this.applyAttackerAmmo(name)) return;
    this.popupGroup.close(this.attackerAmmoPopup);
    this.attackerAmmoPopup.focusTrigger();
  }

  private openAttackerAmmoPopup(): void {
    if (!this.attackerTurret) return;
    const popup = this.els.attackerAmmoPopup;
    const trigger = this.els.attackerAmmoTrigger;
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    this.openAmmo = true;
    this.renderAttackerAmmo();
    const cargoSelected = this.els.attackerAmmoCargoList.querySelector('[aria-selected="true"]');
    const allSelected = this.els.attackerAmmoAllList.querySelector('[aria-selected="true"]');
    const selected =
      (cargoSelected && isHtmlButtonElement(cargoSelected) ? cargoSelected : null) ??
      (allSelected && isHtmlButtonElement(allSelected) ? allSelected : null);
    const firstChild = this.els.attackerAmmoCargoList.firstElementChild;
    const first = firstChild && isHtmlButtonElement(firstChild) ? firstChild : null;
    (selected ?? first)?.focus();
  }

  private closeAttackerAmmoPopup(): void {
    const popup = this.els.attackerAmmoPopup;
    const trigger = this.els.attackerAmmoTrigger;
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    this.openAmmo = false;
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
    if (this.attackerSide.overrides.tracking === undefined) this.trackingInput.setRadValue(turret.tracking, sigResolution);
    if (this.attackerSide.overrides.sigRes === undefined) {
      this.els.sigRes.value = turret.sigResolutionClass;
      this.setChoiceGroup(this.els.sigResOptions, turret.sigResolutionClass);
    }
    if (this.attackerSide.overrides.optimal === undefined) this.els.optimal.value = String(Math.round(turret.optimal));
    if (this.attackerSide.overrides.falloff === undefined) this.els.falloff.value = String(Math.round(turret.falloff));
    this.displayTrackingInput();
  }

  private restoreAttackerTurret(): void {
    this.attackerAmmoAllExpanded = false;
    this.els.attackerAmmoAllSection.hidden = true;
    if (!this.attackerSide.fittingText || !this.attackerSide.profile) {
      this.attackerTurret = undefined;
      this.attackerCargoCharges = [];
      this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
      this.renderAttackerAmmo();
      this.renderSigResIcons();
      return;
    }
    const imported = this.fittingImport.importFitting(this.attackerSide.fittingText, this.attackerSide.skillConditions());
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
      this.els.attackerAmmoAllSection.hidden = true;
      this.renderAttackerAmmo();
      this.renderSigResIcons();
      return;
    }
    this.attackerTurret = turret;
    this.attackerCargoCharges = imported.cargoCharges;
    this.attackerAmmo = turret.charge;
    this.attackerAmmoAllExpanded = false;
    this.els.attackerAmmoAllSection.hidden = true;
    this.clearAttackerTurretOverrides();
    this.setTurretInputs(turret);
    this.renderAttackerAmmo();
    this.renderSigResIcons();
  }


  private recordOverrideForDisplayInput(id: keyof typeof this.els): void {
    if (id === "tracking") this.attackerSide.recordOverride("tracking", this.trackingInput.rad);
    if (id === "sigRes") this.attackerSide.recordOverride("sigRes", this.currentSigResValue());
    if (id === "optimal") this.attackerSide.recordOverride("optimal", num(this.els.optimal));
    if (id === "falloff") this.attackerSide.recordOverride("falloff", num(this.els.falloff));
    if (id === "targetSig") this.targetSide.recordOverride("targetSig", Math.max(num(this.els.targetSig), 1));
  }

  private recordOverrideForShipInput(id: keyof typeof this.els): void {
    if (id === "attackerSpeed") this.attackerSide.recordOverride("attackerSpeed", num(this.els.attackerSpeed));
    if (id === "attackerMass") this.attackerSide.recordOverride("attackerMass", num(this.els.attackerMass));
    if (id === "attackerInertia") this.attackerSide.recordOverride("attackerInertia", num(this.els.attackerInertia));
    if (id === "targetSpeed") this.targetSide.recordOverride("targetSpeed", num(this.els.targetSpeed));
    if (id === "targetMass") this.targetSide.recordOverride("targetMass", num(this.els.targetMass));
    if (id === "targetInertia") this.targetSide.recordOverride("targetInertia", num(this.els.targetInertia));
  }

  private setDefaultSkillAndOverload(): void {
    this.attackerSide.setSkillLevel(5);
    this.targetSide.setSkillLevel(5);
    this.attackerSide.setOverloadActive(true);
    this.targetSide.setOverloadActive(true);
  }

  private onDocumentPointerDown(event: PointerEvent): void {
    if (!this.popupGroup.hasOpen() && !this.openPreviewSide) return;
    const target = event.target;
    if (!isEventTargetWithClosest(target)) return;
    this.popupGroup.onPointerDown(target);
    if (this.openPreviewSide) {
      const side = this.openPreviewSide;
      if (target.closest(fittingAreaSelector(side)) === null) this.hidePreview(side);
    }
  }

  private onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    if (this.openPreviewSide) {
      const side = this.openPreviewSide;
      const eye = this.currentPreviewEye ?? this.els[`${side}FittingEye`];
      this.hidePreview(side);
      eye.focus();
    }
    this.popupGroup.onKeyDown(event);
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

  private createFittingPopup(side: "attacker" | "target"): Popup {
    return {
      isOpen: () => this.openFittingSide === side,
      open: () => this.openFittingPopup(side),
      close: () => this.closeFittingPopup(side),
      focusTrigger: () => this.els[`${side}FittingTrigger`].focus(),
      contains: (target) => target instanceof Element && target.closest(fittingAreaSelector(side)) !== null,
    };
  }

  private createImportSidePopup(): Popup {
    return {
      isOpen: () => this.importSidePopupOpen,
      open: () => this.openImportSidePopup(this.pendingImportText ?? ""),
      close: () => this.closeImportSidePopup(),
      focusTrigger: () => this.els.importProfile.focus(),
      contains: (target) => target instanceof Element && target.closest("#import-side-popup, #import-profile") !== null,
    };
  }

  private createAttackerAmmoPopup(): Popup {
    return {
      isOpen: () => this.openAmmo,
      open: () => this.openAttackerAmmoPopup(),
      close: () => this.closeAttackerAmmoPopup(),
      focusTrigger: () => this.els.attackerAmmoTrigger.focus(),
      contains: (target) => target instanceof Element && target.closest("#attacker-ammo-field") !== null,
    };
  }
}

const DELETE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" ' +
  'aria-hidden="true"><use href="icons.svg#delete"></use></svg>';

const EYE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" ' +
  'aria-hidden="true"><use href="icons.svg#eye"></use></svg>';
