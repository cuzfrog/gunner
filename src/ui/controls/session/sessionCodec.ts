import { SIG_RESOLUTIONS, type HitChance } from "../../../sim";
import type { ChargeCatalog } from "../../../fitting";
import type { I18n } from "../../i18n";
import { USER_SETTINGS_VERSION, type ProfileSettings, type SettingsStore, type StartupState, type UserSettings } from "../../../appstate";
import { num } from "../controlsDom";
import type { SessionControl } from "./sessionControl";
import { DEFAULT_GRID_BRIGHTNESS, formatNumber } from "../controlsFormat";
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

  constructor(deps: {
    els: Els; attackerSide: SidePanel; targetSide: SidePanel; turret: TurretController; turretOverrides: TurretOverrides;
    preferences: PreferencesController; profileController: ProfileController; i18n: I18n; chargeCatalog: ChargeCatalog;
    sigResChoice: ChoiceGroup; hintRotator: HintRotator; settingsStore: SettingsStore; hitChance: HitChance;
    trackingInput: TrackingInput;
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
    if (this.sessionControl) this.sessionControl.setPlaying(this.sessionControl.isPlaying());
    this.preferencesController.updateManeuverAggressivityDisplay();
    this.preferencesController.updateManeuverAggressivityEnabled(this.els.attackerMode.value === "midships");
    this.attackerSide.updateAlignTime();
    this.targetSide.updateAlignTime();
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

  restoreStartup(startup: StartupState): void {
    if (startup.settings) {
      this.restore(startup.settings, startup.selectedProfileName ?? "");
      return;
    }
    if (this.profileController.restoreFromStartup(startup)) return;
    const preferences = this.settingsStore.loadPreferences();
    this.preferencesController.applyPreferences(preferences);
    this.i18n.translateDocument();
    this.setInitialDefaults();
  }

  private setInitialDefaults(): void {
    this.setDefaultSkillAndOverload();
    this.attackerSide.setOverloadDisabled();
    this.targetSide.setOverloadDisabled();
    this.setBestInitialDistance();
    this.preferencesController.updateManeuverAggressivityDisplay();
    this.preferencesController.updateManeuverAggressivityEnabled(this.els.attackerMode.value === "midships");
    this.sessionControl?.setPlaying(false);
    this.attackerSide.renderPropulsionOptions();
    this.targetSide.renderPropulsionOptions();
    this.profileController.refresh();
  }

  private setDefaultSkillAndOverload(): void {
    this.attackerSide.setSkillLevel(5);
    this.targetSide.setSkillLevel(5);
    this.attackerSide.setOverloadActive(true);
    this.targetSide.setOverloadActive(true);
  }

  private setBestInitialDistance(): void {
    const turret = this.turretController.currentTurretSpec(this.trackingInput.rad);
    const targetState = this.targetSide.capture();
    const best = this.hitChance.findBestDistance(targetState.speed, turret, targetState.sig ?? 1);
    if (!Number.isFinite(best) || best <= 0) return;
    this.els.initialDistance.value = String(Math.round(best));
    this.els.targetRange.value = String(Math.round(best));
  }
}
