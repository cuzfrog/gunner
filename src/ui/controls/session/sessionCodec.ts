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
  readonly initialDistance: HTMLInputElement;
}

export class SessionCodecImpl implements SessionCodec {
  private readonly els: SessionCodecEls;
  private readonly shipASide: SidePanel;
  private readonly shipBSide: SidePanel;
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
    els: SessionCodecEls; shipASide: SidePanel; shipBSide: SidePanel; turret: TurretController; turretOverrides: TurretOverrides;
    preferences: PreferencesController; profileController: ProfileController; i18n: I18n; chargeCatalog: ChargeCatalog;
    sigResChoice: ChoiceGroup; hintRotator: HintRotator; settingsStore: SettingsStore; events: UiEvents;
    trackingInput: TrackingInput; ewarController: EwarController; boosterController: BoosterController; fittingImport: FittingImport;
  }) {
    this.els = deps.els;
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
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
    this.events.onProfileDeleted(() => this.onProfileDeleted());
    this.events.onProfileTextLoaded((settings) => this.onProfileTextLoaded(settings));
  }

  capture(): UserSettings {
    const shipA = this.shipASide.capture();
    const shipB = this.shipBSide.capture();
    const turret = this.turretController.capture();
    const { hiddenRangeOverlays: _, ...preferences } = this.preferencesController.capture();
    return {
      version: USER_SETTINGS_VERSION,
      tracking: this.trackingInput.rad,
      ...preferences,
      sigRes: turret.sigRes,
      optimal: turret.optimal,
      falloff: turret.falloff,
      shipASpeed: shipA.speed,
      shipAMode: shipA.mode,
      shipARange: shipA.range,
      shipAAggressivity: shipA.aggressivity,
      shipAMass: shipA.mass,
      shipAInertia: shipA.inertia,
      shipASig: shipA.sig ?? 1,
      shipASkillLevel: shipA.skillLevel,
      shipAOverload: shipA.overload,
      shipAHull: shipA.hull,
      shipAPropulsion: shipA.propulsion,
      shipAFitting: shipA.fitting,
      shipAOverrides: this.turretOverrides.get(),
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
      shipBHull: shipB.hull,
      shipBPropulsion: shipB.propulsion,
      shipBFitting: shipB.fitting,
      shipBOverrides: shipB.overrides,
      shipBFittedHull: shipB.fittedHull,
      shipAAmmo: turret.ammo,
      shipAEwarActivation: this.ewarController.capture("shipA"),
      shipBEwarActivation: this.ewarController.capture("shipB"),
      shipABoosterActivation: this.boosterController.capture("shipA"),
      shipBBoosterActivation: this.boosterController.capture("shipB"),
    };
  }

  captureProfile(): ProfileSettings {
    const {
      language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____,
      autoZoom: _____, zoomFactor: ______, ...profile
    } = this.capture();
    return profile;
  }

  restore(settings: UserSettings, selectedName = ""): void {
    this.applyShipState(settings);
    this.preferencesController.restore({
      language: settings.language,
      trackingUnit: settings.trackingUnit,
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
    const { hiddenRangeOverlays: _, ...preferences } = this.preferencesController.capture();
    return {
      ...profile,
      shipAAmmo: profile.shipAAmmo ?? this.chargeCatalog.usualForChargeSize(1),
      ...preferences,
    };
  }

  getInitialDistance(): number {
    return Math.max(num(this.els.initialDistance), 1);
  }

  private restoreEwar(side: "shipA" | "shipB", fitting: string | undefined, activation: StoredEwarActivation | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    const loadout = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.ewar : undefined;
    this.ewarController.restore(side, loadout, activation);
  }

  private restoreBooster(
    side: "shipA" | "shipB", fitting: string | undefined, activation: readonly StoredBoosterActivation[] | undefined,
  ): void {
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
    const sigResolution = SIG_RESOLUTIONS[settings.sigRes];
    this.els.sigRes.value = settings.sigRes;
    this.sigResChoice.set(settings.sigRes);
    this.trackingInput.setRadValue(settings.tracking, sigResolution);
    this.els.optimal.value = String(settings.optimal);
    this.els.falloff.value = String(settings.falloff);
    this.els.initialDistance.value = String(settings.initialDistance);
    this.shipASide.restore(this.shipASide.stateFrom(toCombatantSettings(settings, "shipA")));
    this.shipBSide.restore(this.shipBSide.stateFrom(toCombatantSettings(settings, "shipB")));
    this.turretOverrides.set(settings.shipAOverrides ?? {});
    this.turretController.restore({
      fitting: settings.shipAFitting, conditions: this.shipASide.skillConditions(), ammo: settings.shipAAmmo,
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
