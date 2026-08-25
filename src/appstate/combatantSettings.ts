import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { SkillLevel } from "../ships";
import {
  USER_SETTINGS_VERSION,
  type DisplayPreferences,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type PropulsionSelection,
  type StoredBoosterActivation,
  type StoredEwarActivation,
  type TrackingUnit,
  type UserSettings as UserSettingsWire,
} from "./userSettings";
import type { Language } from "./language";

export interface CombatantSettings {
  readonly speed: number;
  readonly mode: AutopilotMode;
  readonly range: number;
  readonly mass: number;
  readonly inertia: number;
  readonly skillLevel?: SkillLevel;
  readonly overload?: boolean;
  readonly hull?: string;
  readonly propulsion?: PropulsionSelection;
  readonly fitting?: string;
  readonly overrides?: Partial<ProfileParamOverrides>;
  readonly fittedHull?: FittedHullSummary;
  readonly ewarActivation?: StoredEwarActivation;
  readonly boosterActivation?: readonly StoredBoosterActivation[];
  readonly sig?: number;
}

export type TargetCombatantSettings = CombatantSettings & { readonly sig: number };

export interface UserSettings {
  readonly version: typeof USER_SETTINGS_VERSION;
  readonly language: Language;
  readonly simSpeed: number;
  readonly trackingUnit: TrackingUnit;
  readonly gridBrightness: number;
  readonly autoZoom: boolean;
  readonly zoomFactor: number;
  readonly display: DisplayPreferences;
  readonly maneuverAggressivity?: number;
  readonly attacker: CombatantSettings;
  readonly target: TargetCombatantSettings;
  readonly tracking: number;
  readonly sigRes: SigResolutionClass;
  readonly optimal: number;
  readonly falloff: number;
  readonly initialDistance: number;
  readonly attackerAmmo: string;
}

export function toCombatantSettings(settings: UserSettingsWire, side: "attacker" | "target"): CombatantSettings {
  if (side === "attacker") {
    return {
      speed: settings.attackerSpeed,
      mode: settings.attackerMode,
      range: settings.attackerRange,
      mass: settings.attackerMass,
      inertia: settings.attackerInertia,
      skillLevel: settings.attackerSkillLevel,
      overload: settings.attackerOverload,
      hull: settings.attackerHull,
      propulsion: settings.attackerPropulsion,
      fitting: settings.attackerFitting,
      overrides: settings.attackerOverrides,
      fittedHull: settings.attackerFittedHull,
      ewarActivation: settings.attackerEwarActivation,
      boosterActivation: settings.attackerBoosterActivation,
    };
  }
  return {
    speed: settings.targetSpeed,
    mode: settings.targetMode,
    range: settings.targetRange,
    mass: settings.targetMass,
    inertia: settings.targetInertia,
    skillLevel: settings.targetSkillLevel,
    overload: settings.targetOverload,
    hull: settings.targetHull,
    propulsion: settings.targetPropulsion,
    fitting: settings.targetFitting,
    overrides: settings.targetOverrides,
    fittedHull: settings.targetFittedHull,
    ewarActivation: settings.targetEwarActivation,
    boosterActivation: settings.targetBoosterActivation,
    sig: settings.targetSig,
  };
}
