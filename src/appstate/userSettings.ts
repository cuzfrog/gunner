import type { AutopilotMode, SigResolutionClass, WeaponKind } from "../sim";
import type { FittedHull, PropulsionId, PropulsionKind, PropulsionStats, SkillLevel } from "../ships";
import type { ShipId, TypeId } from "../gamedata/ids";
import type { DroneGroup } from "../fitting";
import type { Language } from "./language";

export const USER_SETTINGS_VERSION = 14 as const;
export const PROPULSION_NONE = "none" as const;
export type TrackingUnit = "rad" | "score";
export type WeaponRangeVisibility = "shipA" | "shipB" | "both" | "none";
export type PropulsionSelection = PropulsionId | typeof PROPULSION_NONE;
export type StoredDisruptionScript = TypeId | "none";

export interface StoredBoosterActivation {
  readonly active: boolean;
  readonly script: StoredDisruptionScript;
}

export interface StoredEwarActivation {
  readonly webs?: readonly { readonly active: boolean; readonly overloaded: boolean }[];
  readonly grapplers?: readonly { readonly active: boolean; readonly overloaded: boolean }[];
  readonly disruptors?: readonly { readonly active: boolean; readonly overloaded: boolean; readonly script: StoredDisruptionScript }[];
  readonly scramblers?: readonly { readonly active: boolean; readonly overloaded: boolean }[];
  readonly painters?: readonly { readonly active: boolean; readonly overloaded: boolean }[];
}

export interface StoredMissileBoosterActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly script: StoredDisruptionScript;
}

export interface FittedHullSummary {
  readonly fittingName: string;
  readonly propulsionId?: PropulsionId;
  readonly propulsionModuleId?: TypeId;
  readonly propulsionName?: string;
  readonly propulsionKind?: PropulsionKind;
  readonly fitted: FittedHull;
  readonly propulsion?: PropulsionStats;
  readonly baseMaxSpeed?: number;
}

export interface ProfileParamOverrides {
  shipAMass?: number;
  shipAInertia?: number;
  shipASpeed?: number;
  shipASig?: number;
  shipBMass?: number;
  shipBInertia?: number;
  shipBSig?: number;
  shipBSpeed?: number;
  tracking?: number;
  sigRes?: SigResolutionClass;
  optimal?: number;
  falloff?: number;
}


export interface UserSettings {
  version: typeof USER_SETTINGS_VERSION;
  shipATrackingUnit: TrackingUnit;
  shipBTrackingUnit: TrackingUnit;
  weaponRangeVisibility: WeaponRangeVisibility;
  shipATracking: number;
  shipASigRes: SigResolutionClass;
  shipAOptimal: number;
  shipAFalloff: number;
  shipBTracking: number;
  shipBSigRes: SigResolutionClass;
  shipBOptimal: number;
  shipBFalloff: number;
  tracking?: number;
  sigRes?: SigResolutionClass;
  optimal?: number;
  falloff?: number;
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
  shipAWeaponOverload?: boolean;
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
  shipBWeaponOverload?: boolean;
  shipAHullId?: ShipId;
  shipAPropulsion?: PropulsionSelection;
  shipBHullId?: ShipId;
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
  shipAMissileBoosterActivation?: readonly StoredMissileBoosterActivation[];
  shipBMissileBoosterActivation?: readonly StoredMissileBoosterActivation[];
  shipAAmmo: TypeId;
  shipBAmmo: TypeId;
  shipAWeaponKind?: WeaponKind;
  shipBWeaponKind?: WeaponKind;
  shipAMissileAmmo?: TypeId;
  shipBMissileAmmo?: TypeId;
  shipADroneGroups?: readonly DroneGroup[];
  shipBDroneGroups?: readonly DroneGroup[];
  simSpeed: number;
  language: Language;
}

export type ProfileSettings = Omit<
  UserSettings,
  | "language"
  | "shipATrackingUnit"
  | "shipBTrackingUnit"
  | "weaponRangeVisibility"
  | "simSpeed"
  | "gridBrightness"
  | "autoZoom"
  | "zoomFactor"
  | "tracking"
  | "sigRes"
  | "optimal"
  | "falloff"
  | "shipAAmmo"
  | "shipBAmmo"
> & {
  shipAAmmo?: TypeId;
  shipBAmmo?: TypeId;
};

export interface DisplayPreferences {
  readonly language: Language;
  readonly shipATrackingUnit: TrackingUnit;
  readonly shipBTrackingUnit: TrackingUnit;
  readonly weaponRangeVisibility: WeaponRangeVisibility;
  readonly simSpeed: number;
  readonly gridBrightness: number;
  readonly rangeOverlayVisibility?: Record<string, WeaponRangeVisibility>;
  readonly autoZoom?: boolean;
  readonly zoomFactor?: number;
}
