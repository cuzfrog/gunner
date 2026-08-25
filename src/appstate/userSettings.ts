import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { FittedHull, PropulsionId, PropulsionKind, PropulsionStats, SkillLevel } from "../ships";
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
  readonly propulsionKind?: PropulsionKind;
  readonly fitted: FittedHull;
  readonly propulsion?: PropulsionStats;
  readonly baseMaxSpeed?: number;
}

export type ProfileParamOverrides = Pick<
  UserSettings,
  | "shipAMass"
  | "shipAInertia"
  | "shipASpeed"
  | "shipBMass"
  | "shipBInertia"
  | "shipBSig"
  | "shipBSpeed"
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
  shipASpeed: number;
  shipAMode: AutopilotMode;
  shipARange: number;
  shipAAggressivity?: number;
  shipBAggressivity?: number;
  gridBrightness?: number;
  autoZoom?: boolean;
  zoomFactor?: number;
  shipAMass: number;
  shipAInertia: number;
  shipASkillLevel?: SkillLevel;
  shipAOverload?: boolean;
  initialDistance: number;
  shipBSpeed: number;
  shipBMode: AutopilotMode;
  shipBRange: number;
  shipBMass: number;
  shipBInertia: number;
  shipASig?: number;
  shipBSig: number;
  shipBSkillLevel?: SkillLevel;
  shipBOverload?: boolean;
  shipAHull?: string;
  shipAPropulsion?: PropulsionSelection;
  shipBHull?: string;
  shipBPropulsion?: PropulsionSelection;
  shipAFitting?: string;
  shipAOverrides?: Partial<ProfileParamOverrides>;
  shipBFitting?: string;
  shipBOverrides?: Partial<ProfileParamOverrides>;
  shipAFittedHull?: FittedHullSummary;
  shipBFittedHull?: FittedHullSummary;
  shipAEwarActivation?: StoredEwarActivation;
  shipBEwarActivation?: StoredEwarActivation;
  shipABoosterActivation?: readonly StoredBoosterActivation[];
  shipBBoosterActivation?: readonly StoredBoosterActivation[];
  shipAAmmo: string;
  simSpeed: number;
  language: Language;
}

export type ProfileSettings = Omit<UserSettings, "language" | "trackingUnit" | "simSpeed" | "gridBrightness" | "autoZoom" | "zoomFactor" | "shipAAmmo"> & {
  shipAAmmo?: string;
};

export interface DisplayPreferences {
  readonly language: Language;
  readonly trackingUnit: TrackingUnit;
  readonly simSpeed: number;
  readonly gridBrightness: number;
  readonly hiddenRangeOverlays?: readonly string[];
  readonly autoZoom?: boolean;
  readonly zoomFactor?: number;
}

export interface StartupState {
  readonly settings: UserSettings | null;
  readonly selectedProfileName: string | null;
}
