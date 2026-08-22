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
  type ChargeCatalog,
  type FittingImport,
  type GunFamilies,
  type PresetFittings,
} from "../fitting";
import type { I18n, Language } from "./i18n";
import type { ImageCatalog } from "./imageCatalog";
import type { SavedFittings } from "./savedFittings";
import { DomFittingPreview } from "./fittingPreview";
import {
  USER_SETTINGS_VERSION,
  type ClipboardProvider,
  type ProfileSettings,
  type PropulsionSelection,
  type SettingsStore,
  type UserSettings,
} from "./settings";

import { PreferencesController } from "./controls/preferencesController";
import { ProfileController } from "./controls/profileController";
import { TurretController } from "./controls/turretController";
import { FittingPopupController, type FittingPopupEls } from "./controls/fittingPopupController";
import { FittingPreviewManager } from "./controls/fittingPreviewManager";
import { ImportController, type ImportEls } from "./controls/importController";
import { HintRotator, type IHintRotator } from "./hintRotator";
import { HINT_CANDIDATES, LORES, TIP_TEXT } from "./hints";
import type { Timer } from "./timer";
import { createControlsEls, el, isHtmlSelectElement, isEventTargetWithClosest, num, type Els } from "./controlsDom";
import { SidePanel, type Side, type SidePanelHost } from "./sidePanel";
import { PopupGroup, type Popup } from "./popupGroup";
import { ChoiceGroup } from "./controls/choiceGroup";
import { EngagementReadout } from "./controls/engagementReadout";
import {
  AGGRESSIVITY_MIN,
  DEFAULT_GRID_BRIGHTNESS,
  formatNumber,
  isAutopilotMode,
  isSigResClass,
  parseManeuverAggressivity,
  profileSettingsOf,
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
  private readonly preferencesController: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly hintRotator: IHintRotator;
  private readonly previewManager: FittingPreviewManager;
  private readonly attackerFittingPopup: FittingPopupController;
  private readonly targetFittingPopup: FittingPopupController;
  private callbacks?: ControlsCallbacks;
  private playing = false;
  private readonly popupGroup: PopupGroup;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly attackerSkillPopup: Popup;
  private readonly targetSkillPopup: Popup;
  private readonly attackerPropulsionVariantPopup: Popup;
  private readonly targetPropulsionVariantPopup: Popup;
  private readonly importController: ImportController;
  private readonly attackerAmmoPopup: Popup;
  private readonly engagementReadout: EngagementReadout;
  private readonly sigResChoice: ChoiceGroup;
  private readonly turretController: TurretController;

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
    this.popupGroup = new PopupGroup();
    this.hintRotator = new HintRotator({
      element: el("slide-hints"),
      i18n,
      candidates: HINT_CANDIDATES,
      tipText: TIP_TEXT,
      lores: LORES,
      timer,
      intervalMs: 20_000,
    });
    this.els = createControlsEls();

    this.preferencesController = new PreferencesController({
      els: {
        tracking: this.els.tracking,
        trackingUnitRad: this.els.trackingUnitRad,
        trackingUnitScore: this.els.trackingUnitScore,
        langEn: this.els.langEn,
        langZh: this.els.langZh,
        langJa: this.els.langJa,
        gridBrightnessSlider: this.els.gridBrightnessSlider,
        gridBrightnessValue: this.els.gridBrightnessValue,
        maneuverAggressivity: this.els.maneuverAggressivity,
        maneuverAggressivitySlider: this.els.maneuverAggressivitySlider,
        maneuverAggressivityValue: this.els.maneuverAggressivityValue,
        simSpeed: this.els.simSpeed,
      },
      i18n: this.i18n,
      settingsStore: this.settingsStore,
      sigResolution: () => this.currentSigResolution(),
      onLanguageChanged: () => this.onLanguageChanged(),
    });
    this.profileController = new ProfileController({
      els: {
        profileName: this.els.profileName,
        profileSave: this.els.profileSave,
        profileSelect: this.els.profileSelect,
        profileDelete: this.els.profileDelete,
        shareStatus: this.els.shareStatus,
      },
      settingsStore: this.settingsStore,
      timer: this.timer,
      i18n: this.i18n,
      captureCurrent: () => profileSettingsOf(this.getSettings()),
      onLoaded: (name) => this.onProfileLoaded(name),
    });

    this.engagementReadout = new EngagementReadout({
      resDistance: el("res-distance"),
      resTransversal: el("res-transversal"),
      resAngular: el("res-angular"),
      resRadial: el("res-radial"),
      resTrackPen: el("res-track-pen"),
      resRangePen: el("res-range-pen"),
      resHit: el("res-hit"),
    });
    this.sigResChoice = new ChoiceGroup(this.els.sigResOptions, this.els.sigRes, ["S", "M", "L", "XL"]);

    const attackerPreview = new DomFittingPreview({
      container: this.els.attackerFittingPreview,
      i18n: this.i18n,
      imageCatalog: this.imageCatalog,
      viewport: () => window,
    });
    const targetPreview = new DomFittingPreview({
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
    this.attackerAmmoPopup = {
      isOpen: () => this.turretController.isAmmoPopupOpen(),
      open: () => this.turretController.openAmmoPopup(),
      close: () => this.turretController.closeAmmoPopup(),
      focusTrigger: () => this.els.attackerAmmoTrigger.focus(),
      contains: (target) => target instanceof Element && target.closest("#attacker-ammo-field") !== null,
    };
    this.turretController = new TurretController({
      els: {
        tracking: this.els.tracking,
        sigRes: this.els.sigRes,
        sigResOptions: this.els.sigResOptions,
        optimal: this.els.optimal,
        falloff: this.els.falloff,
        attackerAmmoTrigger: this.els.attackerAmmoTrigger,
        attackerAmmoSummary: this.els.attackerAmmoSummary,
        attackerAmmoSummaryIcon: this.els.attackerAmmoSummaryIcon,
        attackerAmmoPopup: this.els.attackerAmmoPopup,
        attackerAmmoCargoLabel: this.els.attackerAmmoCargoLabel,
        attackerAmmoCargoList: this.els.attackerAmmoCargoList,
        attackerAmmoExpand: this.els.attackerAmmoExpand,
        attackerAmmoAllSection: this.els.attackerAmmoAllSection,
        attackerAmmoAllList: this.els.attackerAmmoAllList,
      },
      popup: this.attackerAmmoPopup,
      chargeCatalog: this.chargeCatalog,
      gunFamilies: this.gunFamilies,
      imageCatalog: this.imageCatalog,
      trackingInput: this.preferencesController.trackingInput,
      i18n: this.i18n,
      fittingImport: this.fittingImport,
      overrides: () => this.attackerSide.overrides,
      clearTurretOverrides: () => {
        delete this.attackerSide.overrides.tracking;
        delete this.attackerSide.overrides.sigRes;
        delete this.attackerSide.overrides.optimal;
        delete this.attackerSide.overrides.falloff;
      },
      onConfigChange: (persist) => {
        this.preferencesController.savePreferences();
        if (persist) this.profileController.updateDirtyState();
        this.callbacks?.onConfigChange();
      },
    });

    this.importController = new ImportController({
      clipboard: this.clipboard,
      fittingImport: this.fittingImport,
      savedFittings: this.savedFittings,
      popupGroup: this.popupGroup,
      els: {
        importProfile: this.els.importProfile,
        importSidePopup: this.els.importSidePopup,
        importSideAttacker: this.els.importSideAttacker,
        importSideTarget: this.els.importSideTarget,
      },
      sidePanel: (side) => this.side(side),
      turret: this.turretController,
      preferences: this.preferencesController,
      profileController: this.profileController,
      getSettings: () => this.getSettings(),
      onConfigPersisted: () => this.onConfigPersisted(),
      onProfileTextLoaded: (settings) => this.onProfileTextLoaded(settings),
    });
    this.attackerSkillPopup = this.attackerSide.getSkillPopup();
    this.targetSkillPopup = this.targetSide.getSkillPopup();
    this.attackerPropulsionVariantPopup = this.attackerSide.getPropulsionVariantPopup();
    this.targetPropulsionVariantPopup = this.targetSide.getPropulsionVariantPopup();
    this.previewManager = new FittingPreviewManager({
      fittingImport: this.fittingImport,
      imageCatalog: this.imageCatalog,
      i18n: this.i18n,
      previewsBySide: { attacker: attackerPreview, target: targetPreview } as const,
      shipImageBySide: { attacker: this.els.attackerShipImage, target: this.els.targetShipImage } as const,
      eyeBySide: { attacker: this.els.attackerFittingEye, target: this.els.targetFittingEye } as const,
      profileOf: (side) => this.side(side).profile,
      fittingTextOf: (side) => this.side(side).fittingText,
    });
    this.attackerFittingPopup = this.createFittingPopup("attacker");
    this.targetFittingPopup = this.createFittingPopup("target");
    this.attackerSide.setFittingPopup(this.attackerFittingPopup);
    this.targetSide.setFittingPopup(this.targetFittingPopup);
    this.attackerSide.setFittingPreview(this.previewManager);
    this.targetSide.setFittingPreview(this.previewManager);
    this.popupGroup.register(this.attackerFittingPopup.popup);
    this.popupGroup.register(this.targetFittingPopup.popup);
    this.popupGroup.register(this.importController.popup);
    this.popupGroup.register(this.attackerAmmoPopup);

    this.populateHullDatalist();
    this.attackerSide.renderSkillOptions();
    this.targetSide.renderSkillOptions();

    this.restoreSavedState();
    this.bind();
    this.attackerSide.updateAlignTime();
    this.targetSide.updateAlignTime();
  }

  private side(side: Side): SidePanel {
    return side === "attacker" ? this.attackerSide : this.targetSide;
  }

  private createSidePanelHost(side: Side): SidePanelHost {
    return {
      updateFittingTrigger: (enabled) => this.updateFittingTrigger(side, enabled),
      onAttackerFittedHullCleared: () => {
        if (side === "attacker") this.onAttackerFittedHullCleared();
      },
      importEftFitting: (text, persist) => this.importController.importEftFitting(side, text, persist),
      mostRecentFittingFor: (hullName) => this.savedFittings.mostRecentFor(hullName),
      persistConfigChange: (notify) => this.persistConfigChange(notify),
      restoreAttackerTurret: () => {
        if (side === "attacker") this.turretController.restore(this.attackerSide.fittingText, this.attackerSide.skillConditions());
      },
      importFittingFromText: (text) => this.importController.importFromText(side, text),
      importFitting: () => this.importController.importFromClipboard(side),
    };
  }

  private onAttackerFittedHullCleared(): void {
    this.popupGroup.close(this.attackerAmmoPopup);
    this.turretController.clear();
  }

  private persistConfigChange(notify = true): void {
    this.preferencesController.savePreferences();
    this.profileController.updateDirtyState();
    if (notify) this.callbacks?.onConfigChange();
  }

  private onProfileLoaded(name: string): void {
    const profile = this.settingsStore.loadProfile(name);
    if (!profile) return;
    this.loadSettings(this.sessionSettings(profile), name);
    this.callbacks?.onReset();
  }

  private onLanguageChanged(): void {
    const selected = this.profileController.selectedName();
    this.i18n.translateDocument();
    this.profileController.refresh(selected);
    this.attackerSide.renderPropulsionOptions();
    this.targetSide.renderPropulsionOptions();
    this.turretController.render();
    this.attackerSide.clearImportHint();
    this.targetSide.clearImportHint();
    this.populateHullDatalist();
    this.attackerSide.refreshHullInputs();
    this.targetSide.refreshHullInputs();
    this.attackerFittingPopup.renderIfOpen();
    this.targetFittingPopup.renderIfOpen();
    this.previewManager.refresh();
    this.attackerSide.updateHullHint();
    this.targetSide.updateHullHint();
    this.attackerSide.renderSkillOptions();
    this.targetSide.renderSkillOptions();
    this.hintRotator.refresh();
    this.setPlaying(this.playing);
    this.profileController.updateDirtyState();
    this.callbacks?.onDisplayChange();
  }

  private restoreSavedState(): void {
    const startup = this.settingsStore.loadStartupState();
    if (startup.settings) {
      this.loadSettings(startup.settings, startup.selectedProfileName ?? "");
      return;
    }
    if (this.profileController.restoreFromStartup(startup)) return;
    const preferences = this.settingsStore.loadPreferences();
    this.preferencesController.applyPreferences(preferences);
    this.i18n.translateDocument();
    this.setDefaultSkillAndOverload();
    this.attackerSide.setOverloadDisabled();
    this.targetSide.setOverloadDisabled();
    this.setBestInitialDistance();
    this.preferencesController.updateManeuverAggressivityDisplay();
    this.preferencesController.updateManeuverAggressivityEnabled(this.els.attackerMode.value === "midships");
    this.setPlaying(false);
    this.attackerSide.renderPropulsionOptions();
    this.targetSide.renderPropulsionOptions();
    this.profileController.refresh();
  }

  private sessionSettings(profile: ProfileSettings): UserSettings {
    return {
      ...profile,
      attackerAmmo: profile.attackerAmmo ?? this.chargeCatalog.usualForChargeSize(1),
      ...this.preferencesController.capture(),
    };
  }

  getTurret(): TurretSpec {
    return this.turretController.currentTurretSpec(this.preferencesController.trackingInput.rad);
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
    return this.preferencesController.getSpeed();
  }

  getGridBrightness(): number {
    return this.preferencesController.getGridBrightness();
  }

  update(frame: EngagementFrame, hit: HitChanceBreakdown): void {
    this.engagementReadout.update(frame, hit, (key) => this.i18n.t(key));
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.els.play.textContent = this.i18n.t(
      playing ? "button.pause" : "button.play",
    );
  }

  setCallbacks(callbacks: ControlsCallbacks): void {
    this.callbacks = callbacks;
  }

  private getSettings(): UserSettings {
    return {
      version: USER_SETTINGS_VERSION,
      tracking: this.preferencesController.trackingInput.rad,
      ...this.preferencesController.capture(),
      sigRes: this.currentSigResValue(),
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
      attackerSpeed: num(this.els.attackerSpeed),
      attackerMode: this.currentMode("attacker"),
      attackerRange: num(this.els.attackerRange),
      maneuverAggressivity: parseManeuverAggressivity(this.els.maneuverAggressivity),
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
      attackerAmmo: this.turretController.capture().ammo,
    };
  }

  private loadSettings(settings: UserSettings, selectedName = ""): void {
    this.attackerSide.fittingText = settings.attackerFitting;
    this.attackerSide.overrides = settings.attackerOverrides ?? {};
    this.targetSide.fittingText = settings.targetFitting;
    this.targetSide.overrides = settings.targetOverrides ?? {};

    const sigResolution = SIG_RESOLUTIONS[settings.sigRes];
    this.els.sigRes.value = settings.sigRes;
    this.sigResChoice.set(settings.sigRes);
    this.preferencesController.trackingInput.setRadValue(settings.tracking, sigResolution);
    this.preferencesController.restore({
      language: settings.language,
      trackingUnit: settings.trackingUnit,
      simSpeed: settings.simSpeed,
      gridBrightness: settings.gridBrightness ?? DEFAULT_GRID_BRIGHTNESS,
    });

    this.els.optimal.value = String(settings.optimal);
    this.els.falloff.value = String(settings.falloff);
    this.els.attackerSpeed.value = formatNumber(settings.attackerSpeed);
    this.els.attackerMass.value = String(settings.attackerMass);
    this.els.attackerInertia.value = formatNumber(settings.attackerInertia, 6);
    this.els.attackerMode.value = settings.attackerMode;
    this.els.attackerRange.value = String(settings.attackerRange);
    this.els.maneuverAggressivity.value = String(settings.maneuverAggressivity ?? 1);
    this.els.initialDistance.value = String(settings.initialDistance);
    this.els.targetSpeed.value = formatNumber(settings.targetSpeed);
    this.els.targetMass.value = String(settings.targetMass);
    this.els.targetInertia.value = formatNumber(settings.targetInertia, 6);
    this.els.targetMode.value = settings.targetMode;
    this.els.targetRange.value = String(settings.targetRange);
    this.els.targetSig.value = String(settings.targetSig);

    this.attackerSide.loadHull(settings.attackerHull, settings.attackerPropulsion);
    this.targetSide.loadHull(settings.targetHull, settings.targetPropulsion);

    this.i18n.translateDocument();
    this.attackerSide.renderSkillOptions(settings.attackerSkillLevel ?? 5);
    this.targetSide.renderSkillOptions(settings.targetSkillLevel ?? 5);
    this.attackerSide.setOverloadActive(settings.attackerOverload ?? true);
    this.targetSide.setOverloadActive(settings.targetOverload ?? true);
    this.attackerSide.setOverloadDisabled();
    this.targetSide.setOverloadDisabled();

    this.turretController.restore(settings.attackerFitting, this.attackerSide.skillConditions(), settings.attackerAmmo);

    if (settings.attackerFittedHull) {
      this.attackerSide.restoreFittingSummary(settings.attackerFittedHull);
    }
    if (settings.targetFittedHull) {
      this.targetSide.restoreFittingSummary(settings.targetFittedHull);
    }
    this.setPlaying(this.playing);
    this.preferencesController.updateManeuverAggressivityDisplay();
    this.preferencesController.updateManeuverAggressivityEnabled(this.els.attackerMode.value === "midships");
    this.attackerSide.updateAlignTime();
    this.targetSide.updateAlignTime();
    this.hintRotator.refresh();
    this.profileController.markLoaded(selectedName);
    this.preferencesController.savePreferences();
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

  private currentMode(side: Side): AutopilotMode {
    const select = this.els[`${side}Mode`];
    if (!isHtmlSelectElement(select)) throw new Error(`Expected ${side}Mode to be a select`);
    const value = select.value;
    if (!isAutopilotMode(value)) throw new Error(`Invalid autopilot mode: ${value}`);
    return value;
  }

  private currentSigResolution(): number {
    return SIG_RESOLUTIONS[this.currentSigResValue()];
  }


  private onConfigPersisted(): void {
    this.preferencesController.savePreferences();
    this.profileController.updateDirtyState();
    this.callbacks?.onConfigChange();
  }

  private onProfileTextLoaded(settings: UserSettings): void {
    this.loadSettings(settings);
    this.profileController.showStatus("status.profileImported");
    this.callbacks?.onReset();
  }

  private bind(): void {
    this.els.play.addEventListener("click", () => this.callbacks?.onPlayPause());
    this.els.reset.addEventListener("click", () => this.callbacks?.onReset());
    this.els.simSpeed.addEventListener("change", () => {
      this.callbacks?.onSpeedChange(this.getSpeed());
    });
    this.els.trackingUnitRad.addEventListener("click", () => {
      this.preferencesController.setTrackingUnit("rad");
      this.profileController.updateDirtyState();
      this.callbacks?.onDisplayChange();
    });
    this.els.trackingUnitScore.addEventListener("click", () => {
      this.preferencesController.setTrackingUnit("score");
      this.profileController.updateDirtyState();
      this.callbacks?.onDisplayChange();
    });
    this.els.langEn.addEventListener("click", () => this.preferencesController.setLanguage("en"));
    this.els.langZh.addEventListener("click", () => this.preferencesController.setLanguage("zh"));
    this.els.langJa.addEventListener("click", () => this.preferencesController.setLanguage("ja"));
    this.els.profileSave.addEventListener("click", () => this.profileController.saveProfile());
    this.els.profileSelect.addEventListener("change", () => this.profileController.loadProfile());
    this.els.profileDelete.addEventListener("click", () => this.profileController.deleteProfile());
    this.els.shareLink.addEventListener("click", () => void this.importController.copyProfile());
    this.els.importProfile.addEventListener("click", () => void this.importController.importProfileClicked());
    this.els.importSideAttacker.addEventListener("click", () => void this.importController.onImportSideClick("attacker"));
    this.els.importSideTarget.addEventListener("click", () => void this.importController.onImportSideClick("target"));
    this.els.profileName.addEventListener("input", () => this.profileController.updateDirtyState());

    this.els.attackerImportFitting.addEventListener("click", () => void this.importController.importFromClipboard("attacker"));
    this.els.targetImportFitting.addEventListener("click", () => void this.importController.importFromClipboard("target"));

    const attackerPastePopup = this.els.attackerPastePopup;
    const targetPastePopup = this.els.targetPastePopup;
    attackerPastePopup.addEventListener("paste", (event: ClipboardEvent) => this.attackerSide.onPastePopupPaste(event));
    targetPastePopup.addEventListener("paste", (event: ClipboardEvent) => this.targetSide.onPastePopupPaste(event));

    this.els.attackerHull.addEventListener("input", () => this.attackerSide.onHullInput());
    this.els.attackerHull.addEventListener("change", () => this.attackerSide.onHullChange());
    this.els.attackerFittingTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attackerFittingPopup.popup));
    this.els.attackerFittingEye.addEventListener("click", () => this.previewManager.toggle("attacker"));
    this.els.attackerAmmoTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attackerAmmoPopup));
    this.els.attackerPropulsion.addEventListener("change", () => this.attackerSide.onPropulsionChange());
    this.els.attackerPropulsionGear.addEventListener("click", () => this.popupGroup.toggle(this.attackerPropulsionVariantPopup));
    this.els.attackerSkills.addEventListener("change", () => this.attackerSide.onSkillOrOverloadChange(true));
    this.els.attackerOverload.addEventListener("change", () => this.attackerSide.onSkillOrOverloadChange(false));
    this.els.attackerOverloadButton.addEventListener("click", () => this.attackerSide.onOverloadButtonClick());
    this.els.targetHull.addEventListener("input", () => this.targetSide.onHullInput());
    this.els.targetHull.addEventListener("change", () => this.targetSide.onHullChange());
    this.els.targetFittingTrigger.addEventListener("click", () => this.popupGroup.toggle(this.targetFittingPopup.popup));
    this.els.targetFittingEye.addEventListener("click", () => this.previewManager.toggle("target"));
    this.els.targetPropulsion.addEventListener("change", () => this.targetSide.onPropulsionChange());
    this.els.targetPropulsionGear.addEventListener("click", () => this.popupGroup.toggle(this.targetPropulsionVariantPopup));
    this.els.targetSkills.addEventListener("change", () => this.targetSide.onSkillOrOverloadChange(true));
    this.els.targetOverload.addEventListener("change", () => this.targetSide.onSkillOrOverloadChange(false));
    this.els.targetOverloadButton.addEventListener("click", () => this.targetSide.onOverloadButtonClick());

    this.els.attackerSkillTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attackerSkillPopup));
    this.els.targetSkillTrigger.addEventListener("click", () => this.popupGroup.toggle(this.targetSkillPopup));

    const displayInputs: (keyof typeof this.els)[] = ["tracking", "sigRes", "optimal", "falloff", "targetSig"];
    for (const id of displayInputs) {
      this.els[id].addEventListener("input", () => {
        if (id === "tracking") this.preferencesController.updateTrackingFromInput();
        if (id === "sigRes") this.preferencesController.updateTrackingForSigResolution();
        this.recordOverrideForDisplayInput(id);
        this.profileController.updateDirtyState();
        this.preferencesController.savePreferences();
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
        if (id === "attackerMode") {
          this.preferencesController.updateManeuverAggressivityEnabled(this.els.attackerMode.value === "midships");
        }
        this.recordOverrideForShipInput(id);
        this.profileController.updateDirtyState();
        this.preferencesController.savePreferences();
        this.callbacks?.onConfigChange();
      });
    }

    this.els.maneuverAggressivitySlider.addEventListener("input", () => {
      this.preferencesController.onManeuverAggressivityChange();
      this.callbacks?.onConfigChange();
      this.profileController.updateDirtyState();
    });
    this.els.gridBrightnessSlider.addEventListener("input", () => {
      this.preferencesController.onGridBrightnessChange();
      this.callbacks?.onDisplayChange();
      this.profileController.updateDirtyState();
    });

    document.addEventListener("pointerdown", (event: PointerEvent) => this.onDocumentPointerDown(event));
    document.addEventListener("keydown", (event: KeyboardEvent) => this.onDocumentKeyDown(event));
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

  private updateFittingTrigger(side: Side, enabled: boolean): void {
    this.els[`${side}FittingTrigger`].disabled = !enabled;
    this.els[`${side}FittingEye`].disabled = !enabled;
  }

  private recordOverrideForDisplayInput(id: keyof typeof this.els): void {
    if (id === "tracking") this.attackerSide.recordOverride("tracking", this.preferencesController.trackingInput.rad);
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
    if (!this.popupGroup.hasOpen() && !this.previewManager.openSide()) return;
    const target = event.target;
    if (!isEventTargetWithClosest(target)) return;
    this.popupGroup.onPointerDown(target);
    this.previewManager.handlePointerDown(target);
  }

  private onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    if (this.previewManager.openSide()) this.previewManager.handleEscape();
    this.popupGroup.onKeyDown(event);
  }

  private createFittingPopup(side: Side): FittingPopupController {
    return new FittingPopupController({
      side,
      popupGroup: this.popupGroup,
      savedFittings: this.savedFittings,
      presetFittings: this.presetFittings,
      fittingImport: this.fittingImport,
      imageCatalog: this.imageCatalog,
      i18n: this.i18n,
      els: this.fittingPopupEls(side),
      panelFor: (s) => this.side(s),
      applyFitting: (text) => this.importController.importEftFitting(side, text, true),
      previews: this.previewManager,
    });
  }

  private fittingPopupEls(side: Side): FittingPopupEls {
    return {
      trigger: this.els[`${side}FittingTrigger`],
      eye: this.els[`${side}FittingEye`],
      popup: this.els[`${side}FittingPopup`],
      savedList: this.els[`${side}FittingSavedList`],
      presetList: this.els[`${side}FittingPresetList`],
      savedLabel: this.els[`${side}FittingSavedLabel`],
      presetLabel: this.els[`${side}FittingPresetLabel`],
      empty: this.els[`${side}FittingEmpty`],
      shipImage: this.els[`${side}ShipImage`],
    };
  }

}
