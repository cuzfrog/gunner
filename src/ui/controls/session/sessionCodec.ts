import { SIG_RESOLUTIONS, type HitChance } from "../../../sim";
import type { ChargeCatalog, FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import { USER_SETTINGS_VERSION, type ProfileSettings, type SettingsStore, type StartupState, type StoredEwarActivation, type UserSettings } from "../../../appstate";
import type { EwarController } from "../ewar";
import { num } from "../controlsDom";
import type { SessionControl } from "./sessionControl";
import { DEFAULT_GRID_BRIGHTNESS, formatNumber } from "../controlsFormat";
import { applyStartupDefaults } from "./startupDefaults";
import type { ChoiceGroup } from "../choiceGroup";
import type { Els } from "../elementsContract";
import type { HintRotator } from "../hints";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { SidePanel } from "../sidePanel";
import type { TurretController } from "../turret";
import type { TurretOverrides } from "../turret";
import type { TrackingInput } from "../trackingInput";

export interface SessionCodec {
  capture(): UserSettings;
  getInitialDistance(): number;
  restore(settings: UserSettings, selectedName?: string): void;
  fromProfile(profile: ProfileSettings): UserSettings;
  restoreStartup(startup: StartupState): void;
  setSessionControl(sessionControl: SessionControl): void;
}

export class SessionCodecImpl implements SessionCodec {
  private readonly els: Els;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly turretController: TurretController;
  private readonly turretOverrides: TurretOverrides;
  private readonly preferencesController: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly i18n: I18n;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly sigResChoice: ChoiceGroup;
  private readonly hintRotator: HintRotator;
  private readonly settingsStore: SettingsStore;
  private readonly hitChance: HitChance;
  private sessionControl?: SessionControl;
  private readonly trackingInput: TrackingInput;
  private readonly ewarController: EwarController;
  private readonly fittingImport: FittingImport;

  constructor(deps: {
    els: Els; attackerSide: SidePanel; targetSide: SidePanel; turret: TurretController; turretOverrides: TurretOverrides;
    preferences: PreferencesController; profileController: ProfileController; i18n: I18n; chargeCatalog: ChargeCatalog;
    sigResChoice: ChoiceGroup; hintRotator: HintRotator; settingsStore: SettingsStore; hitChance: HitChance;
    trackingInput: TrackingInput; ewarController: EwarController; fittingImport: FittingImport;
  }) {
    this.els = deps.els;
    this.attackerSide = deps.attackerSide;
    this.targetSide = deps.targetSide;
    this.turretController = deps.turret;
    this.turretOverrides = deps.turretOverrides;
    this.preferencesController = deps.preferences;
    this.profileController = deps.profileController;
    this.i18n = deps.i18n;
    this.chargeCatalog = deps.chargeCatalog;
    this.sigResChoice = deps.sigResChoice;
    this.hintRotator = deps.hintRotator;
    this.settingsStore = deps.settingsStore;
    this.hitChance = deps.hitChance;
    this.trackingInput = deps.trackingInput;
    this.ewarController = deps.ewarController;
    this.fittingImport = deps.fittingImport;
  }

  setSessionControl(sessionControl: SessionControl): void {
    this.sessionControl = sessionControl;
  }

  capture(): UserSettings {
    const attacker = this.attackerSide.capture();
    const target = this.targetSide.capture();
    const turret = this.turretController.capture();
    const preferences = this.preferencesController.capture();
    return {
      version: USER_SETTINGS_VERSION,
      tracking: this.trackingInput.rad,
      ...preferences,
      sigRes: turret.sigRes,
      optimal: turret.optimal,
      falloff: turret.falloff,
      attackerSpeed: attacker.speed,
      attackerMode: attacker.mode,
      attackerRange: attacker.range,
      maneuverAggressivity: this.preferencesController.getManeuverAggressivity(),
      attackerMass: attacker.mass,
      attackerInertia: attacker.inertia,
      attackerSkillLevel: attacker.skillLevel,
      attackerOverload: attacker.overload,
      attackerHull: attacker.hull,
      attackerPropulsion: attacker.propulsion,
      attackerFitting: attacker.fitting,
      attackerOverrides: this.turretOverrides.get(),
      attackerFittedHull: attacker.fittedHull,
      initialDistance: this.getInitialDistance(),
      targetSpeed: target.speed,
      targetMode: target.mode,
      targetRange: target.range,
      targetMass: target.mass,
      targetInertia: target.inertia,
      targetSkillLevel: target.skillLevel,
      targetOverload: target.overload,
      targetSig: target.sig ?? 1,
      targetHull: target.hull,
      targetPropulsion: target.propulsion,
      targetFitting: target.fitting,
      targetOverrides: target.overrides,
      targetFittedHull: target.fittedHull,
      attackerAmmo: turret.ammo,
      attackerEwarActivation: this.ewarController.capture("attacker"),
      targetEwarActivation: this.ewarController.capture("target"),
    };
  }

  restore(settings: UserSettings, selectedName = ""): void {
    const sigResolution = SIG_RESOLUTIONS[settings.sigRes];
    this.els.sigRes.value = settings.sigRes;
    this.sigResChoice.set(settings.sigRes);
    this.trackingInput.setRadValue(settings.tracking, sigResolution);
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
    this.attackerSide.restore(this.attackerSide.stateFrom(settings));
    this.targetSide.restore(this.targetSide.stateFrom(settings));
    this.i18n.translateDocument();
    this.turretOverrides.set(settings.attackerOverrides ?? {});
    this.turretController.restore({
      fitting: settings.attackerFitting, conditions: this.attackerSide.skillConditions(), ammo: settings.attackerAmmo,
    });
    this.restoreEwar("attacker", settings.attackerFitting, settings.attackerEwarActivation);
    this.restoreEwar("target", settings.targetFitting, settings.targetEwarActivation);
    this.attackerSide.sections.skill.setOverloadDisabled(this.ewarController.fittedCount("attacker"));
    this.targetSide.sections.skill.setOverloadDisabled(this.ewarController.fittedCount("target"));
    if (this.sessionControl) this.sessionControl.setPlaying(this.sessionControl.isPlaying());
    this.preferencesController.updateManeuverAggressivityDisplay();
    this.preferencesController.updateManeuverAggressivityEnabled(this.els.attackerMode.value === "midships");
    this.attackerSide.sections.stats.updateAlignTime();
    this.targetSide.sections.stats.updateAlignTime();
    this.hintRotator.refresh();
    this.profileController.markLoaded(selectedName);
    this.preferencesController.savePreferences();
  }

  fromProfile(profile: ProfileSettings): UserSettings {
    return {
      ...profile,
      attackerAmmo: profile.attackerAmmo ?? this.chargeCatalog.usualForChargeSize(1),
      ...this.preferencesController.capture(),
    };
  }

  getInitialDistance(): number {
    return Math.max(num(this.els.initialDistance), 1);
  }

  private restoreEwar(side: "attacker" | "target", fitting: string | undefined, activation: StoredEwarActivation | undefined): void {
    const panel = side === "attacker" ? this.attackerSide : this.targetSide;
    const loadout = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.ewar : undefined;
    this.ewarController.restore(side, loadout, activation);
  }

  restoreStartup(startup: StartupState): void {
    if (startup.settings) {
      this.restore(startup.settings, startup.selectedProfileName ?? "");
      return;
    }
    if (this.profileController.restoreFromStartup(startup)) return;
    const preferences = this.settingsStore.loadPreferences();
    this.preferencesController.applyPreferences(preferences);
    this.i18n.translateDocument();
    applyStartupDefaults({
      attackerSide: this.attackerSide,
      targetSide: this.targetSide,
      turretController: this.turretController,
      trackingInput: this.trackingInput,
      els: this.els,
      hitChance: this.hitChance,
      preferencesController: this.preferencesController,
      profileController: this.profileController,
      sessionControl: this.sessionControl,
    });
  }
}
