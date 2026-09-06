import type { AutopilotMode, SigResolutionClass, WeaponKind } from "../sim";
import type { DefenseSkills, SkillLevel, TargetingSkills } from "../ships";
import type { ShipId, TypeId } from "../gamedata/ids";
import type { DroneGroup } from "../fitting";
import {
  USER_SETTINGS_VERSION,
  type DisplayPreferences,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type PropulsionSelection,
  type StoredBoosterActivation,
  type StoredEwarActivation,
  type StoredMissileBoosterActivation,
  type StoredRahActivation,
  type StoredRepairMode,
  type StoredRepairerActivation,
  type StoredSensorBoosterActivation,
} from "./userSettings";

export interface CombatantSettings {
  readonly speed: number;
  readonly mode: AutopilotMode;
  readonly range: number;
  readonly mass: number;
  readonly inertia: number;
  readonly aggressivity: number;
  readonly skillLevel?: SkillLevel;
  readonly defenseSkills?: DefenseSkills;
  readonly targetingSkills?: TargetingSkills;
  readonly overload: boolean;
  readonly weaponOverload: boolean;
  readonly damageEnabled: boolean;
  readonly hull?: ShipId;
  readonly propulsion?: PropulsionSelection;
  readonly fitting?: string;
  readonly overrides: Partial<ProfileParamOverrides>;
  readonly fittedHull?: FittedHullSummary;
  readonly ewarActivation?: StoredEwarActivation;
  readonly boosterActivation?: readonly StoredBoosterActivation[];
  readonly missileBoosterActivation?: readonly StoredMissileBoosterActivation[];
  readonly sensorBoosterActivation?: readonly StoredSensorBoosterActivation[];
  readonly repMode?: StoredRepairMode;
  readonly repairerActivation?: readonly StoredRepairerActivation[];
  readonly rahActivation?: StoredRahActivation;
  readonly sig?: number;
  readonly tracking: number;
  readonly sigRes: SigResolutionClass;
  readonly optimal: number;
  readonly falloff: number;
  readonly ammo: TypeId;
  readonly weaponKind?: WeaponKind;
  readonly missileAmmo?: TypeId;
  readonly droneGroups?: readonly DroneGroup[];
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
