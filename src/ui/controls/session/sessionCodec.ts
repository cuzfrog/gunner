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
import { DEFAULT_GRID_BRIGHTNESS } from "../controlsFormat";
import { applyStartupDefaults } from "./startupDefaults";
import type { HintRotator } from "../hints";
import type { PreferencesController } from "../preferences";
import type { ProfileController } from "../profile";
import type { Side } from "../side";
import type { SidePanel } from "../sidePanel";
import type { TurretController, TurretOverrides } from "../turret";

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
  readonly initialDistance: HTMLInputElement;
}

export class SessionCodecImpl implements SessionCodec {
  private readonly els: SessionCodecEls;
  private readonly shipASide: SidePanel;
  private readonly shipBSide: SidePanel;
  private readonly turretControllers: Record<Side, TurretController>;
  private readonly turretOverridesBySide: Record<Side, TurretOverrides>;
  private readonly preferencesController: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly i18n: I18n;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly hintRotator: HintRotator;
  private readonly settingsStore: SettingsStore;
  private readonly events: UiEvents;
  private readonly ewarController: EwarController;
  private readonly boosterController: BoosterController;
  private readonly fittingImport: FittingImport;
  private readonly pristineSettings: UserSettings;

  constructor(deps: {
    els: SessionCodecEls;
    shipASide: SidePanel;
    shipBSide: SidePanel;
    turretControllers: Record<Side, TurretController>;
    turretOverridesBySide: Record<Side, TurretOverrides>;
    preferences: PreferencesController;
    profileController: ProfileController;
    i18n: I18n;
    chargeCatalog: ChargeCatalog;
    hintRotator: HintRotator;
    settingsStore: SettingsStore;
    events: UiEvents;
    ewarController: EwarController;
    boosterController: BoosterController;
    fittingImport: FittingImport;
  }) {
    this.els = deps.els;
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
    this.turretControllers = deps.turretControllers;
    this.turretOverridesBySide = deps.turretOverridesBySide;
    this.preferencesController = deps.preferences;
    this.profileController = deps.profileController;
    this.i18n = deps.i18n;
    this.chargeCatalog = deps.chargeCatalog;
    this.hintRotator = deps.hintRotator;
    this.settingsStore = deps.settingsStore;
    this.events = deps.events;
    this.ewarController = deps.ewarController;
    this.boosterController = deps.boosterController;
    this.fittingImport = deps.fittingImport;
    this.pristineSettings = this.capture();
    this.events.onProfileLoaded((name) => this.onProfileLoaded(name));
    this.events.onNewProfile(() => this.onNewProfile());
    this.events.onProfileDeleted(() => this.onProfileDeleted());
    this.events.onProfileTextLoaded((settings) => this.onProfileTextLoaded(settings));
  }

  capture(): UserSettings {
    const shipA = this.shipASide.capture();
    const shipB = this.shipBSide.capture();
    const shipATurret = this.turretControllers.shipA.capture();
    const shipBTurret = this.turretControllers.shipB.capture();
    const { rangeOverlayVisibility: _, ...preferences } = this.preferencesController.capture();
    return {
      version: USER_SETTINGS_VERSION,
      ...preferences,
      shipATracking: shipATurret.tracking,
      shipASigRes: shipATurret.sigRes,
      shipAOptimal: shipATurret.optimal,
      shipAFalloff: shipATurret.falloff,
      shipBTracking: shipBTurret.tracking,
      shipBSigRes: shipBTurret.sigRes,
      shipBOptimal: shipBTurret.optimal,
      shipBFalloff: shipBTurret.falloff,
      shipASpeed: shipA.speed,
      shipAMode: shipA.mode,
      shipARange: shipA.range,
      shipAAggressivity: shipA.aggressivity,
      shipAMass: shipA.mass,
      shipAInertia: shipA.inertia,
      shipASig: shipA.sig ?? 1,
      shipASkillLevel: shipA.skillLevel,
      shipAOverload: shipA.overload,
      shipAHullId: shipA.hull,
      shipAPropulsion: shipA.propulsion,
      shipAFitting: shipA.fitting,
      shipAOverrides: shipA.overrides,
      shipAFittedHull: shipA.fittedHull,
      initialDistance: this.getInitialDistance(),
      shipBSpeed: shipB.speed,
      shipBMode: shipB.mode,
      shipBRange: shipB.range,
      shipBAggressivity: shipB.aggressivity,
      shipBMass: shipB.mass,
      shipBInertia: shipB.inertia,
      shipBSkillLevel: shipB.skillLevel,
      shipBOverload: shipB.overload,
      shipBSig: shipB.sig ?? 1,
      shipBHullId: shipB.hull,
      shipBPropulsion: shipB.propulsion,
      shipBFitting: shipB.fitting,
      shipBOverrides: shipB.overrides,
      shipBFittedHull: shipB.fittedHull,
      shipAAmmo: shipATurret.ammo,
      shipBAmmo: shipBTurret.ammo,
      shipAEwarActivation: this.ewarController.capture("shipA"),
      shipBEwarActivation: this.ewarController.capture("shipB"),
      shipABoosterActivation: this.boosterController.capture("shipA"),
      shipBBoosterActivation: this.boosterController.capture("shipB"),
    };
  }

  captureProfile(): ProfileSettings {
    const {
      language: _, shipATrackingUnit: __, shipBTrackingUnit: ___, weaponRangeVisibility: ____, simSpeed: _____, gridBrightness: ______,
      autoZoom: _______, zoomFactor: ________, ...profile
    } = this.capture();
    return profile;
  }

  restore(settings: UserSettings, selectedName = ""): void {
    this.applyShipState(settings);
    this.preferencesController.restore({
      language: settings.language,
      shipATrackingUnit: settings.shipATrackingUnit,
      shipBTrackingUnit: settings.shipBTrackingUnit,
      weaponRangeVisibility: settings.weaponRangeVisibility,
      simSpeed: settings.simSpeed,
      gridBrightness: settings.gridBrightness ?? DEFAULT_GRID_BRIGHTNESS,
      autoZoom: settings.autoZoom ?? true,
      zoomFactor: settings.zoomFactor ?? 1,
    });
    this.i18n.translateDocument();
    this.shipASide.sections.skill.setOverloadDisabled();
    this.shipBSide.sections.skill.setOverloadDisabled();
    this.shipASide.sections.stats.updateAlignTime();
    this.shipBSide.sections.stats.updateAlignTime();
    this.hintRotator.refresh();
    this.profileController.markLoaded(selectedName);
    this.preferencesController.savePreferences();
    this.events.emitSessionRestored();
  }

  fromProfile(profile: ProfileSettings): UserSettings {
    const { rangeOverlayVisibility: _, ...preferences } = this.preferencesController.capture();
    return {
      ...profile,
      shipATracking: profile.shipATracking ?? 0,
      shipASigRes: profile.shipASigRes ?? "S",
      shipAOptimal: profile.shipAOptimal ?? 0,
      shipAFalloff: profile.shipAFalloff ?? 0,
      shipBTracking: profile.shipBTracking ?? 0,
      shipBSigRes: profile.shipBSigRes ?? "S",
      shipBOptimal: profile.shipBOptimal ?? 0,
      shipBFalloff: profile.shipBFalloff ?? 0,
      shipAAmmo: profile.shipAAmmo ?? this.chargeCatalog.usualForChargeSize(1),
      shipBAmmo: profile.shipBAmmo ?? this.chargeCatalog.usualForChargeSize(1),
      ...preferences,
    };
  }

  getInitialDistance(): number {
    return Math.max(num(this.els.initialDistance), 1);
  }

  private restoreEwar(side: Side, fitting: string | undefined, activation: StoredEwarActivation | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    const loadout = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.ewar : undefined;
    this.ewarController.restore(side, loadout, activation);
  }

  private restoreBooster(side: Side, fitting: string | undefined, activation: readonly StoredBoosterActivation[] | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    const loadout = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.boosts : undefined;
    this.boosterController.restore(side, loadout, activation);
  }

  resetToDefaults(): void {
    this.settingsStore.clearSelectedProfile();
    this.applyShipState(this.pristineSettings);
    this.applyDefaultStartup();
  }

  private applyShipState(settings: UserSettings): void {
    this.els.initialDistance.value = String(settings.initialDistance);
    this.shipASide.restore(this.shipASide.stateFrom(toCombatantSettings(settings, "shipA")));
    this.shipBSide.restore(this.shipBSide.stateFrom(toCombatantSettings(settings, "shipB")));
    this.turretOverridesBySide.shipA.set(settings.shipAOverrides ?? {});
    this.turretOverridesBySide.shipB.set(settings.shipBOverrides ?? {});
    this.turretControllers.shipA.restore({
      fitting: settings.shipAFitting,
      conditions: this.shipASide.skillConditions(),
      ammo: settings.shipAAmmo,
      tracking: settings.shipATracking,
      sigRes: settings.shipASigRes,
      optimal: settings.shipAOptimal,
      falloff: settings.shipAFalloff,
    });
    this.turretControllers.shipB.restore({
      fitting: settings.shipBFitting,
      conditions: this.shipBSide.skillConditions(),
      ammo: settings.shipBAmmo,
      tracking: settings.shipBTracking,
      sigRes: settings.shipBSigRes,
      optimal: settings.shipBOptimal,
      falloff: settings.shipBFalloff,
    });
    this.restoreEwar("shipA", settings.shipAFitting, settings.shipAEwarActivation);
    this.restoreEwar("shipB", settings.shipBFitting, settings.shipBEwarActivation);
    this.restoreBooster("shipA", settings.shipAFitting, settings.shipABoosterActivation);
    this.restoreBooster("shipB", settings.shipBFitting, settings.shipBBoosterActivation);
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
      shipASide: this.shipASide,
      shipBSide: this.shipBSide,
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

  private onProfileDeleted(): void {
    this.resetToDefaults();
    this.events.emitSessionReset();
  }
}
