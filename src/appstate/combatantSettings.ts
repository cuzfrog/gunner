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

export type ShipBCombatantSettings = CombatantSettings & { readonly sig: number };

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
  readonly shipA: CombatantSettings;
  readonly shipB: ShipBCombatantSettings;
  readonly tracking: number;
  readonly sigRes: SigResolutionClass;
  readonly optimal: number;
  readonly falloff: number;
  readonly initialDistance: number;
  readonly shipAAmmo: string;
}

export function toCombatantSettings(settings: UserSettingsWire, side: "shipA" | "shipB"): CombatantSettings {
  if (side === "shipA") {
    return {
      speed: settings.shipASpeed,
      mode: settings.shipAMode,
      range: settings.shipARange,
      mass: settings.shipAMass,
      inertia: settings.shipAInertia,
      skillLevel: settings.shipASkillLevel,
      overload: settings.shipAOverload,
      hull: settings.shipAHull,
      propulsion: settings.shipAPropulsion,
      fitting: settings.shipAFitting,
      overrides: settings.shipAOverrides,
      fittedHull: settings.shipAFittedHull,
      ewarActivation: settings.shipAEwarActivation,
      boosterActivation: settings.shipABoosterActivation,
    };
  }
  return {
    speed: settings.shipBSpeed,
    mode: settings.shipBMode,
    range: settings.shipBRange,
    mass: settings.shipBMass,
    inertia: settings.shipBInertia,
    skillLevel: settings.shipBSkillLevel,
    overload: settings.shipBOverload,
    hull: settings.shipBHull,
    propulsion: settings.shipBPropulsion,
    fitting: settings.shipBFitting,
    overrides: settings.shipBOverrides,
    fittedHull: settings.shipBFittedHull,
    ewarActivation: settings.shipBEwarActivation,
    boosterActivation: settings.shipBBoosterActivation,
    sig: settings.shipBSig,
  };
}
