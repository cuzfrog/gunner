import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { FittedHull, PropulsionId, PropulsionStats, SkillLevel } from "../ships";
import type { Language } from "./language";

export const USER_SETTINGS_VERSION = 10 as const;
export const PROPULSION_NONE = "none" as const;
export type TrackingUnit = "rad" | "score";
export type PropulsionSelection = PropulsionId | typeof PROPULSION_NONE;
export type StoredDisruptionScript = string;

export interface StoredBoosterActivation {
  readonly active: boolean;
  readonly script: StoredDisruptionScript;
}

export interface StoredEwarActivation {
  readonly webs?: readonly { readonly active: boolean; readonly overloaded: boolean }[];
  readonly grapplers?: readonly { readonly active: boolean; readonly overloaded: boolean }[];
  readonly disruptors?: readonly { readonly active: boolean; readonly overloaded: boolean; readonly script: StoredDisruptionScript }[];
  readonly scramblers?: readonly { readonly active: boolean; readonly overloaded: boolean }[];
}

export interface FittedHullSummary {
  readonly fittingName: string;
  readonly propulsionId?: PropulsionId;
  readonly propulsionName?: string;
  readonly fitted: FittedHull;
  readonly propulsion?: PropulsionStats;
  readonly baseMaxSpeed?: number;
}

export type ProfileParamOverrides = Pick<
  UserSettings,
  | "attackerMass"
  | "attackerInertia"
  | "attackerSpeed"
  | "targetMass"
  | "targetInertia"
  | "targetSig"
  | "targetSpeed"
  | "tracking"
  | "sigRes"
  | "optimal"
  | "falloff"
>;

export interface UserSettings {
  version: typeof USER_SETTINGS_VERSION;
  tracking: number;
  trackingUnit: TrackingUnit;
  sigRes: SigResolutionClass;
  optimal: number;
  falloff: number;
  attackerSpeed: number;
  attackerMode: AutopilotMode;
  attackerRange: number;
  maneuverAggressivity?: number;
  gridBrightness?: number;
  attackerMass: number;
  attackerInertia: number;
  attackerSkillLevel?: SkillLevel;
  attackerOverload?: boolean;
  initialDistance: number;
  targetSpeed: number;
  targetMode: AutopilotMode;
  targetRange: number;
  targetMass: number;
  targetInertia: number;
  targetSig: number;
  targetSkillLevel?: SkillLevel;
  targetOverload?: boolean;
  attackerHull?: string;
  attackerPropulsion?: PropulsionSelection;
  targetHull?: string;
  targetPropulsion?: PropulsionSelection;
  attackerFitting?: string;
  attackerOverrides?: Partial<ProfileParamOverrides>;
  targetFitting?: string;
  targetOverrides?: Partial<ProfileParamOverrides>;
  attackerFittedHull?: FittedHullSummary;
  targetFittedHull?: FittedHullSummary;
  attackerEwarActivation?: StoredEwarActivation;
  targetEwarActivation?: StoredEwarActivation;
  attackerBoosterActivation?: readonly StoredBoosterActivation[];
  targetBoosterActivation?: readonly StoredBoosterActivation[];
  attackerAmmo: string;
  simSpeed: number;
  language: Language;
}

export type ProfileSettings = Omit<UserSettings, "language" | "trackingUnit" | "simSpeed" | "gridBrightness" | "attackerAmmo"> & {
  attackerAmmo?: string;
};

export interface DisplayPreferences {
  readonly language: Language;
  readonly trackingUnit: TrackingUnit;
  readonly simSpeed: number;
  readonly gridBrightness: number;
  readonly hiddenRangeOverlays?: readonly string[];
}

export interface StartupState {
  readonly settings: UserSettings | null;
  readonly selectedProfileName: string | null;
}
