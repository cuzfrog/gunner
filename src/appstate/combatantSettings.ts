import type { AutopilotMode, SigResolutionClass, WeaponKind } from "../sim";
import type { SkillLevel } from "../ships";
import type { ShipId, TypeId } from "../gamedata/ids";
import {
  USER_SETTINGS_VERSION,
  type DisplayPreferences,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type PropulsionSelection,
  type StoredBoosterActivation,
  type StoredEwarActivation,
} from "./userSettings";

export interface CombatantSettings {
  readonly speed: number;
  readonly mode: AutopilotMode;
  readonly range: number;
  readonly mass: number;
  readonly inertia: number;
  readonly aggressivity: number;
  readonly skillLevel?: SkillLevel;
  readonly overload: boolean;
  readonly hull?: ShipId;
  readonly propulsion?: PropulsionSelection;
  readonly fitting?: string;
  readonly overrides: Partial<ProfileParamOverrides>;
  readonly fittedHull?: FittedHullSummary;
  readonly ewarActivation?: StoredEwarActivation;
  readonly boosterActivation?: readonly StoredBoosterActivation[];
  readonly sig?: number;
  readonly tracking: number;
  readonly sigRes: SigResolutionClass;
  readonly optimal: number;
  readonly falloff: number;
  readonly ammo: TypeId;
  readonly weaponKind?: WeaponKind;
  readonly missileAmmo?: TypeId;
}

export interface SessionSettings {
  readonly version: typeof USER_SETTINGS_VERSION;
  readonly display: DisplayPreferences;
  readonly shipA: CombatantSettings;
  readonly shipB: CombatantSettings;
  readonly initialDistance: number;
}

export interface StartupState {
  readonly settings: SessionSettings | null;
  readonly selectedProfileName: string | null;
}
