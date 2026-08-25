import { SIG_RESOLUTIONS } from "../../../sim";
import type { ChargeCatalog, FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import {
  USER_SETTINGS_VERSION,
  toCombatantSettings,
  type ProfileSettings,
  type SettingsStore,
  type StartupState,
  type StoredBoosterActivation,
  type StoredEwarActivation,
  type UserSettings,
} from "../../../appstate";
import type { EwarController } from "../ewar";
import type { BoosterController } from "../booster";
import { num } from "../controlsDom";
import { DEFAULT_GRID_BRIGHTNESS, formatNumber } from "../controlsFormat";
import { applyStartupDefaults } from "./startupDefaults";
import type { ChoiceGroup } from "../choiceGroup";
import type { HintRotator } from "../hints";
import type { PreferencesController } from "../preferences";
import type { ProfileController } from "../profile";
import type { SidePanel } from "../sidePanel";
import type { TurretController } from "../turret";
import type { TurretOverrides } from "../turret";
import type { TrackingInput } from "../trackingInput";

export interface SessionCodec {
  capture(): UserSettings;
  captureProfile(): ProfileSettings;
  getInitialDistance(): number;
  restore(settings: UserSettings, selectedName?: string): void;
  fromProfile(profile: ProfileSettings): UserSettings;
  restoreStartup(startup: StartupState): void;
  resetToDefaults(): void;
}

interface SessionCodecEls {
  readonly sigRes: HTMLSelectElement;
  readonly optimal: HTMLInputElement;
  readonly falloff: HTMLInputElement;
  readonly attackerSpeed: HTMLInputElement;
  readonly attackerMass: HTMLInputElement;
  readonly attackerInertia: HTMLInputElement;
  readonly attackerMode: HTMLSelectElement;
  readonly attackerRange: HTMLInputElement;
  readonly maneuverAggressivity: HTMLInputElement;
  readonly initialDistance: HTMLInputElement;
  readonly targetSpeed: HTMLInputElement;
  readonly targetMass: HTMLInputElement;
  readonly targetInertia: HTMLInputElement;
  readonly targetMode: HTMLSelectElement;
  readonly targetRange: HTMLInputElement;
  readonly targetSig: HTMLInputElement;
}

export class SessionCodecImpl implements SessionCodec {
  private readonly els: SessionCodecEls;
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
  private readonly events: UiEvents;
  private readonly trackingInput: TrackingInput;
  private readonly ewarController: EwarController;
  private readonly boosterController: BoosterController;
  private readonly fittingImport: FittingImport;
  private readonly pristineSettings: UserSettings;

  constructor(deps: {
    els: SessionCodecEls; attackerSide: SidePanel; targetSide: SidePanel; turret: TurretController; turretOverrides: TurretOverrides;
    preferences: PreferencesController; profileController: ProfileController; i18n: I18n; chargeCatalog: ChargeCatalog;
    sigResChoice: ChoiceGroup; hintRotator: HintRotator; settingsStore: SettingsStore; events: UiEvents;
    trackingInput: TrackingInput; ewarController: EwarController; boosterController: BoosterController; fittingImport: FittingImport;
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
    this.events = deps.events;
    this.trackingInput = deps.trackingInput;
    this.ewarController = deps.ewarController;
    this.boosterController = deps.boosterController;
    this.fittingImport = deps.fittingImport;
    this.pristineSettings = this.capture();
    this.events.onProfileLoaded((name) => this.onProfileLoaded(name));
    this.events.onNewProfile(() => this.onNewProfile());
    this.events.onProfileTextLoaded((settings) => this.onProfileTextLoaded(settings));
  }

  capture(): UserSettings {
    const attacker = this.attackerSide.capture();
    const target = this.targetSide.capture();
    const turret = this.turretController.capture();
    const { hiddenRangeOverlays: _, ...preferences } = this.preferencesController.capture();
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
      attackerBoosterActivation: this.boosterController.capture("attacker"),
      targetBoosterActivation: this.boosterController.capture("target"),
    };
  }

  captureProfile(): ProfileSettings {
    const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, ...profile } = this.capture();
    return profile;
  }

  restore(settings: UserSettings, selectedName = ""): void {
    this.applyShipState(settings);
    this.preferencesController.restore({
      language: settings.language,
      trackingUnit: settings.trackingUnit,
      simSpeed: settings.simSpeed,
      gridBrightness: settings.gridBrightness ?? DEFAULT_GRID_BRIGHTNESS,
    });
    this.i18n.translateDocument();
    this.attackerSide.sections.skill.setOverloadDisabled();
    this.targetSide.sections.skill.setOverloadDisabled();
    this.preferencesController.updateManeuverAggressivityDisplay();
    this.preferencesController.updateManeuverAggressivityEnabled(this.els.attackerMode.value === "midships");
    this.attackerSide.sections.stats.updateAlignTime();
    this.targetSide.sections.stats.updateAlignTime();
    this.hintRotator.refresh();
    this.profileController.markLoaded(selectedName);
    this.preferencesController.savePreferences();
    this.events.emitSessionRestored();
  }

  fromProfile(profile: ProfileSettings): UserSettings {
    const { hiddenRangeOverlays: _, ...preferences } = this.preferencesController.capture();
    return {
      ...profile,
      attackerAmmo: profile.attackerAmmo ?? this.chargeCatalog.usualForChargeSize(1),
      ...preferences,
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

  private restoreBooster(side: "attacker" | "target", fitting: string | undefined, activation: readonly StoredBoosterActivation[] | undefined): void {
    const panel = side === "attacker" ? this.attackerSide : this.targetSide;
    const loadout = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.boosts : undefined;
    this.boosterController.restore(side, loadout, activation);
  }

  resetToDefaults(): void {
    this.settingsStore.clearSelectedProfile();
    this.applyShipState(this.pristineSettings);
    this.applyDefaultStartup();
  }

  private applyShipState(settings: UserSettings): void {
    const sigResolution = SIG_RESOLUTIONS[settings.sigRes];
    this.els.sigRes.value = settings.sigRes;
    this.sigResChoice.set(settings.sigRes);
    this.trackingInput.setRadValue(settings.tracking, sigResolution);
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
    this.attackerSide.restore(this.attackerSide.stateFrom(toCombatantSettings(settings, "attacker")));
    this.targetSide.restore(this.targetSide.stateFrom(toCombatantSettings(settings, "target")));
    this.turretOverrides.set(settings.attackerOverrides ?? {});
    this.turretController.restore({
      fitting: settings.attackerFitting, conditions: this.attackerSide.skillConditions(), ammo: settings.attackerAmmo,
    });
    this.restoreEwar("attacker", settings.attackerFitting, settings.attackerEwarActivation);
    this.restoreEwar("target", settings.targetFitting, settings.targetEwarActivation);
    this.restoreBooster("attacker", settings.attackerFitting, settings.attackerBoosterActivation);
    this.restoreBooster("target", settings.targetFitting, settings.targetBoosterActivation);
  }

  restoreStartup(startup: StartupState): void {
    if (startup.settings) {
      this.restore(startup.settings, startup.selectedProfileName ?? "");
      return;
    }
    if (this.profileController.restoreFromStartup(startup)) return;
    this.applyDefaultStartup();
  }

  private applyDefaultStartup(): void {
    const preferences = this.settingsStore.loadPreferences();
    this.preferencesController.applyPreferences(preferences);
    this.i18n.translateDocument();
    applyStartupDefaults({
      attackerSide: this.attackerSide,
      targetSide: this.targetSide,
      preferencesController: this.preferencesController,
      profileController: this.profileController,
    });
    this.events.emitStartupDefaultsApplied();
  }

  private onProfileLoaded(name: string): void {
    const profile = this.settingsStore.loadProfile(name);
    if (!profile) return;
    this.restore(this.fromProfile(profile), name);
  }

  private onProfileTextLoaded(settings: ProfileSettings): void {
    this.restore(this.fromProfile(settings));
    this.profileController.showStatus("status.profileImported");
  }

  private onNewProfile(): void {
    this.resetToDefaults();
    this.profileController.showStatus("status.newProfile");
    this.events.emitSessionReset();
  }
}
