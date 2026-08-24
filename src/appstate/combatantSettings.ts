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
