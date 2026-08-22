import type { ChargeCatalog } from "../../fitting";
import type { Ships } from "../../ships";
import { decodeBase64 } from "./urlCodec";
import { USER_SETTINGS_VERSION, PROPULSION_NONE, type PropulsionSelection, type ProfileSettings, type UserSettings } from "./userSettings";
import {
  isAutopilotMode,
  isLanguage,
  isNonNegative,
  isOptionalBoolean,
  isOptionalFittedHullSummary,
  isOptionalFittingText,
  isOptionalNonEmptyString,
  isOptionalNonNegative,
  isOptionalProfileParamOverrides,
  isOptionalSkillLevel,
  isPositive,
  isSettingsVersion,
  isSigResolutionClass,
  stripDisplayPreferences,
} from "./validators";

export function isOptionalPropulsionSelection(ships: Ships, value: unknown): value is PropulsionSelection | undefined {
  return value === undefined || value === PROPULSION_NONE || ships.parsePropulsionId(value) !== undefined;
}

export function isProfileSettings(ships: Ships, value: unknown): value is ProfileSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    isSettingsVersion(s.version) &&
    isNonNegative(s.tracking) &&
    isSigResolutionClass(s.sigRes) &&
    isNonNegative(s.optimal) &&
    isNonNegative(s.falloff) &&
    isNonNegative(s.attackerSpeed) &&
    isAutopilotMode(s.attackerMode) &&
    isNonNegative(s.attackerRange) &&
    isOptionalNonNegative(s.maneuverAggressivity) &&
    isNonNegative(s.attackerMass) &&
    isNonNegative(s.attackerInertia) &&
    isOptionalSkillLevel(s.attackerSkillLevel) &&
    isOptionalBoolean(s.attackerOverload) &&
    isPositive(s.initialDistance) &&
    isNonNegative(s.targetSpeed) &&
    isAutopilotMode(s.targetMode) &&
    isNonNegative(s.targetRange) &&
    isNonNegative(s.targetMass) &&
    isNonNegative(s.targetInertia) &&
    isOptionalSkillLevel(s.targetSkillLevel) &&
    isOptionalBoolean(s.targetOverload) &&
    isPositive(s.targetSig) &&
    isOptionalNonEmptyString(s.attackerHull) &&
    isOptionalPropulsionSelection(ships, s.attackerPropulsion) &&
    isOptionalNonEmptyString(s.targetHull) &&
    isOptionalPropulsionSelection(ships, s.targetPropulsion) &&
    isOptionalFittedHullSummary(s.attackerFittedHull) &&
    isOptionalFittedHullSummary(s.targetFittedHull) &&
    isOptionalFittingText(s.attackerFitting) &&
    isOptionalFittingText(s.targetFitting) &&
    isOptionalProfileParamOverrides(s.attackerOverrides) &&
    isOptionalProfileParamOverrides(s.targetOverrides) &&
    isOptionalNonEmptyString(s.attackerAmmo)
  );
}

export function isUserSettings(ships: Ships, value: unknown): value is UserSettings {
  if (!isProfileSettings(ships, value)) return false;
  const s = value as Record<string, unknown>;
  return isLanguage(s.language) && (s.trackingUnit === "rad" || s.trackingUnit === "score");
}

const DEFAULT_TURRET_CHARGE_SIZE = 1;

export function toProfileSettings(deps: { ships: Ships; chargeCatalog: ChargeCatalog }, value: unknown): ProfileSettings | null {
  if (!isProfileSettings(deps.ships, value)) return null;
  const withVersion = { ...value, version: USER_SETTINGS_VERSION } as Record<string, unknown>;
  if (withVersion.attackerAmmo === undefined) {
    withVersion.attackerAmmo = deps.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
  }
  return stripDisplayPreferences(withVersion as ProfileSettings);
}

export function parseUserSettings(deps: { ships: Ships; chargeCatalog: ChargeCatalog }, raw: string): UserSettings | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isUserSettings(deps.ships, parsed)) return null;
    parsed.version = USER_SETTINGS_VERSION;
    if (parsed.attackerAmmo === undefined) {
      parsed.attackerAmmo = deps.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseProfiles(deps: { ships: Ships; chargeCatalog: ChargeCatalog }, raw: string): Record<string, ProfileSettings> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isProfileStorage(parsed)) return {};
    const result: Record<string, ProfileSettings> = {};
    for (const name of Object.keys(parsed)) {
      const settings = toProfileSettings(deps, parsed[name]);
      if (settings) result[name] = settings;
    }
    return result;
  } catch {
    return {};
  }
}

function isProfileStorage(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function decodeUrlSettings(deps: { ships: Ships; chargeCatalog: ChargeCatalog }, encoded: string): UserSettings | null {
  try {
    return parseUserSettings(deps, decodeBase64(encoded));
  } catch {
    return null;
  }
}
