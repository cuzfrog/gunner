import type { ChargeCatalog, DroneGroup, FittingImport } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import {
  USER_SETTINGS_VERSION,
  type CombatantSettings,
  type ProfileSettings,
  type SessionSettings,
  type SettingsParser,
  type SettingsStore,
  type StartupState,
  type StoredBoosterActivation,
  type StoredEwarActivation,
  type StoredMissileBoosterActivation,
  type StoredSensorBoosterActivation,
  type StoredRahActivation,
  type StoredRepairMode,
  type StoredRepairerActivation,
  type UserSettings,
} from "../../../appstate";
import type { EwarController } from "../ewar";
import type { BoosterController } from "../booster";
import type { MissileBoosterController } from "../missileBooster";
import type { SensorBoosterController } from "../sensorBooster";
import type { DefenseController } from "../defense";
import type { TargetingController } from "../targeting";
import type { LauncherController } from "../launcher";
import type { DroneController } from "../drone";
import type { WeaponSystemSwitch } from "../sidePanel";
import { num } from "../controlsDom";
import { applyStartupDefaults } from "./startupDefaults";
import type { HintRotator } from "../hints";
import type { PreferencesController } from "../preferences";
import type { ProfileController } from "../profile";
import type { Side } from "../side";
import type { SidePanel, SidePanelState } from "../sidePanel";
import type { TurretController, TurretOverrides } from "../turret";

export interface SessionCodec {
  capture(): UserSettings;
  captureProfile(): ProfileSettings;
  getInitialDistance(): number;
  restore(settings: SessionSettings, selectedName?: string): void;
  fromProfile(profile: ProfileSettings): SessionSettings;
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
  private readonly launcherControllers: Record<Side, LauncherController>;
  private readonly droneControllers: Record<Side, DroneController>;
  private readonly weaponSystemSwitches: Record<Side, WeaponSystemSwitch>;
  private readonly preferencesController: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly i18n: I18n;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly hintRotator: HintRotator;
  private readonly settingsStore: SettingsStore;
  private readonly events: UiEvents;
  private readonly ewarController: EwarController;
  private readonly boosterController: BoosterController;
  private readonly missileBoosterController: MissileBoosterController;
  private readonly sensorBoosterController: SensorBoosterController;
  private readonly defenseController: DefenseController;
  private readonly targetingController: TargetingController;
  private readonly fittingImport: FittingImport;
  private readonly parser: SettingsParser;
  private readonly pristineSettings: SessionSettings;

  constructor(deps: {
    els: SessionCodecEls;
    shipASide: SidePanel;
    shipBSide: SidePanel;
    turretControllers: Record<Side, TurretController>;
    turretOverridesBySide: Record<Side, TurretOverrides>;
    launcherControllers: Record<Side, LauncherController>;
    droneControllers: Record<Side, DroneController>;
    weaponSystemSwitches: Record<Side, WeaponSystemSwitch>;
    preferences: PreferencesController;
    profileController: ProfileController;
    i18n: I18n;
    chargeCatalog: ChargeCatalog;
    hintRotator: HintRotator;
    settingsStore: SettingsStore;
    events: UiEvents;
    ewarController: EwarController;
    boosterController: BoosterController;
    missileBoosterController: MissileBoosterController;
    sensorBoosterController: SensorBoosterController;
    defenseController: DefenseController;
    targetingController: TargetingController;
    fittingImport: FittingImport;
    parser: SettingsParser;
  }) {
    this.els = deps.els;
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
    this.turretControllers = deps.turretControllers;
    this.turretOverridesBySide = deps.turretOverridesBySide;
    this.launcherControllers = deps.launcherControllers;
    this.droneControllers = deps.droneControllers;
    this.weaponSystemSwitches = deps.weaponSystemSwitches;
    this.preferencesController = deps.preferences;
    this.profileController = deps.profileController;
    this.i18n = deps.i18n;
    this.chargeCatalog = deps.chargeCatalog;
    this.hintRotator = deps.hintRotator;
    this.settingsStore = deps.settingsStore;
    this.events = deps.events;
    this.ewarController = deps.ewarController;
    this.boosterController = deps.boosterController;
    this.missileBoosterController = deps.missileBoosterController;
    this.sensorBoosterController = deps.sensorBoosterController;
    this.defenseController = deps.defenseController;
    this.targetingController = deps.targetingController;
    this.fittingImport = deps.fittingImport;
    this.parser = deps.parser;
    this.pristineSettings = this.parser.fromWire(this.capture());
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
    const shipALauncher = this.launcherControllers.shipA.capture();
    const shipBLauncher = this.launcherControllers.shipB.capture();
    const shipADrone = this.droneControllers.shipA.capture();
    const shipBDrone = this.droneControllers.shipB.capture();
    const shipAWeaponKind = this.weaponSystemSwitches.shipA.activeKind();
    const shipBWeaponKind = this.weaponSystemSwitches.shipB.activeKind();
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
      shipADefenseSkills: shipA.defenseSkills,
      shipATargetingSkills: shipA.targetingSkills,
      shipAOverload: shipA.overload,
      shipAWeaponOverload: shipA.weaponOverload,
      shipADamageEnabled: this.defenseController.damageEnabled("shipA"),
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
      shipBDefenseSkills: shipB.defenseSkills,
      shipBTargetingSkills: shipB.targetingSkills,
      shipBOverload: shipB.overload,
      shipBWeaponOverload: shipB.weaponOverload,
      shipBDamageEnabled: this.defenseController.damageEnabled("shipB"),
      shipBSig: shipB.sig ?? 1,
      shipBHullId: shipB.hull,
      shipBPropulsion: shipB.propulsion,
      shipBFitting: shipB.fitting,
      shipBOverrides: shipB.overrides,
      shipBFittedHull: shipB.fittedHull,
      shipAAmmo: shipATurret.ammo,
      shipBAmmo: shipBTurret.ammo,
      shipAWeaponKind,
      shipBWeaponKind,
      shipAMissileAmmo: shipALauncher.ammo,
      shipBMissileAmmo: shipBLauncher.ammo,
      shipADroneGroups: shipADrone.droneGroups,
      shipBDroneGroups: shipBDrone.droneGroups,
      shipAEwarActivation: this.ewarController.capture("shipA"),
      shipBEwarActivation: this.ewarController.capture("shipB"),
      shipABoosterActivation: this.boosterController.capture("shipA"),
      shipBBoosterActivation: this.boosterController.capture("shipB"),
      shipAMissileBoosterActivation: this.missileBoosterController.capture("shipA"),
      shipBMissileBoosterActivation: this.missileBoosterController.capture("shipB"),
      shipASensorBoosterActivation: this.sensorBoosterController.capture("shipA"),
      shipBSensorBoosterActivation: this.sensorBoosterController.capture("shipB"),
      shipARepMode: this.defenseController.repairMode("shipA"),
      shipBRepMode: this.defenseController.repairMode("shipB"),
      shipARepairerActivation: this.defenseController.repairerActivation("shipA"),
      shipBRepairerActivation: this.defenseController.repairerActivation("shipB"),
      shipARahActivation: this.defenseController.rahActivation("shipA"),
      shipBRahActivation: this.defenseController.rahActivation("shipB"),
    };
  }

  captureProfile(): ProfileSettings {
    const {
      language: _, shipATrackingUnit: __, shipBTrackingUnit: ___, weaponRangeVisibility: ____, simSpeed: _____, gridBrightness: ______,
      autoZoom: _______, zoomFactor: ________, ...profile
    } = this.capture();
    return profile;
  }

  restore(settings: SessionSettings, selectedName = ""): void {
    this.applyShipState(settings);
    this.preferencesController.restore(settings.display);
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

  fromProfile(profile: ProfileSettings): SessionSettings {
    return this.parser.fromProfile(profile, this.preferencesController.capture());
  }

  getInitialDistance(): number {
    return Math.max(num(this.els.initialDistance), 1);
  }

  private restoreEwar(side: Side, fitting: string | undefined, activation: StoredEwarActivation | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    const loadout = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.ewar : undefined;
    this.ewarController.restore(side, loadout, activation);
  }

  private restoreDefense(side: Side, fitting: string | undefined, enabled: boolean, repMode: StoredRepairMode, repairerActivation: readonly StoredRepairerActivation[], rahActivation: StoredRahActivation | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    const defense = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.defense : undefined;
    if (defense) this.defenseController.setDefenseSpec(side, defense);
    this.defenseController.restore(side, enabled, repMode, repairerActivation, rahActivation);
  }

  private restoreBooster(side: Side, fitting: string | undefined, activation: readonly StoredBoosterActivation[] | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    const loadout = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.boosts : undefined;
    this.boosterController.restore(side, loadout, activation);
  }

  private restoreMissileBooster(side: Side, fitting: string | undefined, activation: readonly StoredMissileBoosterActivation[] | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    const loadout = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.missileBoosts : undefined;
    this.missileBoosterController.restore(side, loadout, activation);
  }

  private restoreSensorBooster(side: Side, fitting: string | undefined, activation: readonly StoredSensorBoosterActivation[] | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    const loadout = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions())?.sensorBoosts : undefined;
    this.sensorBoosterController.restore(side, loadout, activation);
  }

  private restoreSensorData(side: Side, fitting: string | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    const imported = fitting ? this.fittingImport.importFitting(fitting, panel.skillConditions()) : undefined;
    panel.setSensorData(imported?.sensorSpec, imported?.sensorBoosts);
    this.targetingController.setSensorData(side, imported?.sensorSpec, imported?.sensorBoosts);
  }

  private restoreLauncher(side: Side, fitting: string | undefined, ammoId: TypeId | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    this.launcherControllers[side].restore(fitting, panel.skillConditions(), ammoId);
  }

  private restoreDrone(side: Side, fitting: string | undefined, droneGroups: readonly DroneGroup[] | undefined): void {
    const panel = side === "shipA" ? this.shipASide : this.shipBSide;
    this.droneControllers[side].restore(fitting, panel.skillConditions(), droneGroups);
  }

  resetToDefaults(): void {
    this.settingsStore.clearSelectedProfile();
    this.applyShipState(this.pristineSettings);
    this.applyDefaultStartup();
  }

  private applyShipState(settings: SessionSettings): void {
    this.els.initialDistance.value = String(settings.initialDistance);
    this.shipASide.clearSelectionSession();
    this.shipBSide.clearSelectionSession();
    this.shipASide.restore(sidePanelStateOf(settings.shipA));
    this.shipBSide.restore(sidePanelStateOf(settings.shipB));
    this.turretOverridesBySide.shipA.set(settings.shipA.overrides);
    this.turretOverridesBySide.shipB.set(settings.shipB.overrides);
    this.turretControllers.shipA.restore({
      fitting: settings.shipA.fitting,
      conditions: this.shipASide.skillConditions(),
      ammo: settings.shipA.ammo,
      tracking: settings.shipA.tracking,
      sigRes: settings.shipA.sigRes,
      optimal: settings.shipA.optimal,
      falloff: settings.shipA.falloff,
    });
    this.turretControllers.shipB.restore({
      fitting: settings.shipB.fitting,
      conditions: this.shipBSide.skillConditions(),
      ammo: settings.shipB.ammo,
      tracking: settings.shipB.tracking,
      sigRes: settings.shipB.sigRes,
      optimal: settings.shipB.optimal,
      falloff: settings.shipB.falloff,
    });
    this.restoreLauncher("shipA", settings.shipA.fitting, settings.shipA.missileAmmo);
    this.restoreLauncher("shipB", settings.shipB.fitting, settings.shipB.missileAmmo);
    this.restoreDrone("shipA", settings.shipA.fitting, settings.shipA.droneGroups);
    this.restoreDrone("shipB", settings.shipB.fitting, settings.shipB.droneGroups);
    this.weaponSystemSwitches.shipA.setActiveKind(settings.shipA.weaponKind ?? "turret");
    this.weaponSystemSwitches.shipB.setActiveKind(settings.shipB.weaponKind ?? "turret");
    this.weaponSystemSwitches.shipA.autoToggle(this.turretControllers.shipA.turret() !== undefined, this.launcherControllers.shipA.launcher() !== undefined, this.droneControllers.shipA.drone() !== undefined);
    this.weaponSystemSwitches.shipB.autoToggle(this.turretControllers.shipB.turret() !== undefined, this.launcherControllers.shipB.launcher() !== undefined, this.droneControllers.shipB.drone() !== undefined);
    this.restoreEwar("shipA", settings.shipA.fitting, settings.shipA.ewarActivation);
    this.restoreEwar("shipB", settings.shipB.fitting, settings.shipB.ewarActivation);
    this.restoreBooster("shipA", settings.shipA.fitting, settings.shipA.boosterActivation);
    this.restoreBooster("shipB", settings.shipB.fitting, settings.shipB.boosterActivation);
    this.restoreMissileBooster("shipA", settings.shipA.fitting, settings.shipA.missileBoosterActivation);
    this.restoreMissileBooster("shipB", settings.shipB.fitting, settings.shipB.missileBoosterActivation);
    this.restoreSensorBooster("shipA", settings.shipA.fitting, settings.shipA.sensorBoosterActivation);
    this.restoreSensorBooster("shipB", settings.shipB.fitting, settings.shipB.sensorBoosterActivation);
    this.restoreSensorData("shipA", settings.shipA.fitting);
    this.restoreSensorData("shipB", settings.shipB.fitting);
    this.restoreDefense("shipA", settings.shipA.fitting, settings.shipA.damageEnabled, settings.shipA.repMode ?? "auto", settings.shipA.repairerActivation ?? [], settings.shipA.rahActivation);
    this.restoreDefense("shipB", settings.shipB.fitting, settings.shipB.damageEnabled, settings.shipB.repMode ?? "auto", settings.shipB.repairerActivation ?? [], settings.shipB.rahActivation);
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

function sidePanelStateOf(combatant: CombatantSettings): SidePanelState {
  return {
    speed: combatant.speed,
    mass: combatant.mass,
    inertia: combatant.inertia,
    mode: combatant.mode,
    range: combatant.range,
    aggressivity: combatant.aggressivity,
    skillLevel: combatant.skillLevel,
    defenseSkills: combatant.defenseSkills,
    targetingSkills: combatant.targetingSkills,
    overload: combatant.overload,
    weaponOverload: combatant.weaponOverload,
    damageEnabled: combatant.damageEnabled,
    hull: combatant.hull,
    propulsion: combatant.propulsion,
    fitting: combatant.fitting,
    overrides: combatant.overrides,
    fittedHull: combatant.fittedHull,
    sig: combatant.sig,
  };
}
