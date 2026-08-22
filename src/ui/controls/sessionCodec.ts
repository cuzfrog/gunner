import { SIG_RESOLUTIONS } from "../../sim";
import type { ChargeCatalog } from "../../fitting";
import type { I18n } from "../i18n";
import {
  USER_SETTINGS_VERSION,
  type ProfileSettings,
  type SettingsStore,
  type StartupState,
  type UserSettings,
} from "../settings";
import { num } from "./controlsDom";
import { DEFAULT_GRID_BRIGHTNESS, formatNumber, parseManeuverAggressivity } from "./controlsFormat";
import { ChoiceGroup } from "./choiceGroup";
import type { Els } from "./elements";
import type { IHintRotator } from "./hintRotator";
import type { PreferencesController } from "./preferencesController";
import type { ProfileController } from "./profileController";
import type { SidePanel, SidePanelState } from "./sidePanel";
import type { TurretController } from "./turretController";

export class SessionCodec {
  private readonly els: Els;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly turretController: TurretController;
  private readonly preferencesController: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly i18n: I18n;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly sigResChoice: ChoiceGroup;
  private readonly hintRotator: IHintRotator;
  private readonly settingsStore: SettingsStore;
  private readonly isPlaying: () => boolean;
  private readonly setPlaying: (playing: boolean) => void;
  private readonly onSetInitialDefaults: () => void;

  constructor(deps: {
    els: Els;
    attackerSide: SidePanel;
    targetSide: SidePanel;
    turret: TurretController;
    preferences: PreferencesController;
    profileController: ProfileController;
    i18n: I18n;
    chargeCatalog: ChargeCatalog;
    sigResChoice: ChoiceGroup;
    hintRotator: IHintRotator;
    settingsStore: SettingsStore;
    isPlaying: () => boolean;
    setPlaying: (playing: boolean) => void;
    onSetInitialDefaults: () => void;
  }) {
    this.els = deps.els;
    this.attackerSide = deps.attackerSide;
    this.targetSide = deps.targetSide;
    this.turretController = deps.turret;
    this.preferencesController = deps.preferences;
    this.profileController = deps.profileController;
    this.i18n = deps.i18n;
    this.chargeCatalog = deps.chargeCatalog;
    this.sigResChoice = deps.sigResChoice;
    this.hintRotator = deps.hintRotator;
    this.settingsStore = deps.settingsStore;
    this.isPlaying = deps.isPlaying;
    this.setPlaying = deps.setPlaying;
    this.onSetInitialDefaults = deps.onSetInitialDefaults;
  }

  capture(): UserSettings {
    const attacker = this.attackerSide.capture();
    const target = this.targetSide.capture();
    const turret = this.turretController.capture();
    const preferences = this.preferencesController.capture();
    return {
      version: USER_SETTINGS_VERSION,
      tracking: this.preferencesController.trackingInput.rad,
      ...preferences,
      sigRes: turret.sigRes,
      optimal: turret.optimal,
      falloff: turret.falloff,
      attackerSpeed: attacker.speed,
      attackerMode: attacker.mode,
      attackerRange: attacker.range,
      maneuverAggressivity: parseManeuverAggressivity(this.els.maneuverAggressivity),
      attackerMass: attacker.mass,
      attackerInertia: attacker.inertia,
      attackerSkillLevel: attacker.skillLevel,
      attackerOverload: attacker.overload,
      attackerHull: attacker.hull,
      attackerPropulsion: attacker.propulsion,
      attackerFitting: attacker.fitting,
      attackerOverrides: attacker.overrides,
      attackerFittedHull: attacker.fittedHull,
      initialDistance: Math.max(num(this.els.initialDistance), 1),
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

    this.attackerSide.restore(this.sidePanelState(settings, "attacker"));
    this.targetSide.restore(this.sidePanelState(settings, "target"));

    this.i18n.translateDocument();
    this.turretController.restore({ fitting: settings.attackerFitting, conditions: this.attackerSide.skillConditions(), ammo: settings.attackerAmmo });

    this.setPlaying(this.isPlaying());
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

  restoreStartup(startup: StartupState): void {
    if (startup.settings) {
      this.restore(startup.settings, startup.selectedProfileName ?? "");
      return;
    }
    if (this.profileController.restoreFromStartup(startup)) return;
    const preferences = this.settingsStore.loadPreferences();
    this.preferencesController.applyPreferences(preferences);
    this.i18n.translateDocument();
    this.onSetInitialDefaults();
  }

  private sidePanelState(settings: UserSettings, side: "attacker" | "target"): SidePanelState {
    if (side === "attacker") {
      return {
        speed: settings.attackerSpeed,
        mass: settings.attackerMass,
        inertia: settings.attackerInertia,
        mode: settings.attackerMode,
        range: settings.attackerRange,
        skillLevel: settings.attackerSkillLevel,
        overload: settings.attackerOverload ?? true,
        hull: settings.attackerHull,
        propulsion: settings.attackerPropulsion,
        fitting: settings.attackerFitting,
        overrides: settings.attackerOverrides ?? {},
        fittedHull: settings.attackerFittedHull,
      };
    }
    return {
      speed: settings.targetSpeed,
      mass: settings.targetMass,
      inertia: settings.targetInertia,
      mode: settings.targetMode,
      range: settings.targetRange,
      skillLevel: settings.targetSkillLevel,
      overload: settings.targetOverload ?? true,
      hull: settings.targetHull,
      propulsion: settings.targetPropulsion,
      fitting: settings.targetFitting,
      overrides: settings.targetOverrides ?? {},
      fittedHull: settings.targetFittedHull,
      sig: settings.targetSig,
    };
  }
}
