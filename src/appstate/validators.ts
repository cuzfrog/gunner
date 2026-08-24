import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { FittedHull, PropulsionStats, SkillLevel } from "../ships";
import type { Language } from "./language";
import type { FittedHullSummary, ProfileParamOverrides, ProfileSettings, StoredEwarActivation, UserSettings } from "./userSettings";

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "zh" || value === "ja";
}

export function isSigResolutionClass(value: unknown): value is SigResolutionClass {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

export function isAutopilotMode(value: unknown): value is AutopilotMode {
  return value === "orbit" || value === "keepAtRange" || value === "midships";
}

export function isOptionalEwarActivation(value: unknown): value is StoredEwarActivation | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  if (s.webs !== undefined && (!Array.isArray(s.webs) || !s.webs.every(isStoredWebActivation))) return false;
  if (s.disruptors !== undefined) {
    if (!Array.isArray(s.disruptors)) return false;
    for (const item of s.disruptors) {
      if (!isStoredDisruptorActivation(item)) return false;
    }
  }
  return true;
}

function isStoredWebActivation(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.active === "boolean" && (item.overloaded === undefined || typeof item.overloaded === "boolean");
}

function isStoredDisruptorActivation(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.active === "boolean" &&
    (item.overloaded === undefined || typeof item.overloaded === "boolean") &&
    typeof item.script === "string" &&
    item.script.length > 0
  );
}

export function isSkillLevel(value: unknown): value is SkillLevel {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function isOptionalSkillLevel(value: unknown): value is SkillLevel | undefined {
  return value === undefined || isSkillLevel(value);
}

export function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isNonNegative(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

export function isPositive(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

export function isOptionalNonNegative(value: unknown): value is number | undefined {
  return value === undefined || (isFiniteNumber(value) && value >= 0);
}

export function isOptionalUnitInterval(value: unknown): value is number | undefined {
  return value === undefined || (isFiniteNumber(value) && value >= 0 && value <= 1);
}

export function isSettingsVersion(value: unknown): value is 5 | 6 | 7 | 8 {
  return value === 5 || value === 6 || value === 7 || value === 8;
}

export function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length > 0);
}

export function isOptionalFittingText(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length > 0);
}

const PROFILE_PARAM_OVERRIDE_KEYS: readonly (keyof ProfileParamOverrides)[] = [
  "attackerMass",
  "attackerInertia",
  "attackerSpeed",
  "targetMass",
  "targetInertia",
  "targetSig",
  "targetSpeed",
  "tracking",
  "sigRes",
  "optimal",
  "falloff",
];

export function isOptionalProfileParamOverrides(value: unknown): value is Partial<ProfileParamOverrides> | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  for (const key of Object.keys(s)) {
    if (!PROFILE_PARAM_OVERRIDE_KEYS.includes(key as keyof ProfileParamOverrides)) return false;
    if (key === "sigRes") {
      if (!(s[key] === undefined || isSigResolutionClass(s[key]))) return false;
    } else if (key === "targetSig") {
      if (!(s[key] === undefined || isPositive(s[key]))) return false;
    } else {
      if (!(s[key] === undefined || isNonNegative(s[key]))) return false;
    }
  }
  return true;
}

export function isFittedHull(value: unknown): value is FittedHull {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  if (s.massMultiplier === undefined) s.massMultiplier = 1;
  return (
    isNonNegative(s.mass) &&
    isPositive(s.massMultiplier) &&
    isPositive(s.speedMultiplier) &&
    isPositive(s.inertiaMultiplier) &&
    isPositive(s.sigMultiplier) &&
    isNonNegative(s.sigRadiusAdd)
  );
}

export function isOptionalPropulsionStats(value: unknown): value is PropulsionStats | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return isNonNegative(s.thrust) && isNonNegative(s.speedBonus) && isNonNegative(s.massAddition) && isNonNegative(s.sigBloom);
}

export function isOptionalFittedHullSummary(value: unknown): value is FittedHullSummary | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.fittingName !== "string") return false;
  if (!isFittedHull(s.fitted)) return false;
  if (!isOptionalPropulsionStats(s.propulsion)) return false;
  if (s.propulsionId !== undefined && typeof s.propulsionId !== "string") return false;
  if (s.propulsionName !== undefined && typeof s.propulsionName !== "string") return false;
  return true;
}

export function stripDisplayPreferences(value: ProfileSettings): ProfileSettings {
  const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, ...rest } = value as Record<string, unknown>;
  return rest as ProfileSettings;
}

export function profilesEqual(a: ProfileSettings, b: ProfileSettings): boolean {
  return JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());
}
