import type { FittedHull, PropulsionKind, PropulsionStats, SkillLevel } from "../ships";
import { toTypeId } from "../gamedata/ids";
import type { Language } from "./language";
import type { SimValueParser } from "../sim";
import type { FittedHullSummary, ProfileParamOverrides, ProfileSettings, StoredBoosterActivation, StoredEwarActivation, UserSettings, WeaponRangeVisibility } from "./userSettings";

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "zh" || value === "ja";
}

export function isOptionalEwarActivation(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  const s = value;
  if (s.webs !== undefined && (!Array.isArray(s.webs) || !s.webs.every(isStoredWebActivation))) return false;
  if (s.grapplers !== undefined && (!Array.isArray(s.grapplers) || !s.grapplers.every(isStoredWebActivation))) return false;
  if (s.disruptors !== undefined) {
    if (!Array.isArray(s.disruptors)) return false;
    for (const item of s.disruptors) {
      if (!isStoredDisruptorActivation(item)) return false;
    }
  }
  if (s.scramblers !== undefined && (!Array.isArray(s.scramblers) || !s.scramblers.every(isStoredScramblerActivation))) return false;
  return true;
}

export function isOptionalBoosterActivation(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  const item = value;
  return typeof item.active === "boolean" && isStoredBoosterScript(item.script);
}

export function isOptionalBoosterActivations(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every(isOptionalBoosterActivation);
}

function isTypeIdString(value: string): boolean {
  try {
    toTypeId(value);
    return true;
  } catch {
    return false;
  }
}

function isStoredDisruptionScript(value: unknown): boolean {
  return typeof value === "string" && (value === "none" || isTypeIdString(value));
}

function isStoredBoosterScript(value: unknown): boolean {
  return typeof value === "string" && (value === "none" || isTypeIdString(value));
}

function isStoredWebActivation(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  if (!isRecord(value)) return false;
  const item = value;
  return typeof item.active === "boolean" && (item.overloaded === undefined || typeof item.overloaded === "boolean");
}

function isStoredDisruptorActivation(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const item = value;
  return (
    typeof item.active === "boolean" &&
    (item.overloaded === undefined || typeof item.overloaded === "boolean") &&
    isStoredDisruptionScript(item.script)
  );
}

function isStoredScramblerActivation(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  if (!isRecord(value)) return false;
  const item = value;
  return typeof item.active === "boolean" && (item.overloaded === undefined || typeof item.overloaded === "boolean");
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

export function isOptionalPositive(value: unknown): value is number | undefined {
  return value === undefined || (isFiniteNumber(value) && value > 0);
}

export function isOptionalUnitInterval(value: unknown): value is number | undefined {
  return value === undefined || (isFiniteNumber(value) && value >= 0 && value <= 1);
}

export function isSettingsVersion(value: unknown): value is 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 {
  return value === 5 || value === 6 || value === 7 || value === 8 || value === 9 || value === 10 || value === 11 || value === 12 || value === 13;
}

export function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length > 0);
}

export function isOptionalFittingText(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length > 0);
}

const PROFILE_PARAM_OVERRIDE_KEYS: readonly (keyof ProfileParamOverrides)[] = [
  "shipAMass",
  "shipAInertia",
  "shipASpeed",
  "shipASig",
  "shipBMass",
  "shipBInertia",
  "shipBSig",
  "shipBSpeed",
  "tracking",
  "sigRes",
  "optimal",
  "falloff",
];

export function isOptionalProfileParamOverrides(value: unknown, guards: SimValueParser): value is Partial<ProfileParamOverrides> | undefined {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  const s = value;
  for (const key of Object.keys(s)) {
    if (!PROFILE_PARAM_OVERRIDE_KEYS.some((k) => k === key)) return false;
    if (key === "sigRes") {
      if (!(s[key] === undefined || guards.parseSigResolutionClass(s[key]) !== undefined)) return false;
    } else if (key === "shipASig" || key === "shipBSig") {
      if (!(s[key] === undefined || isPositive(s[key]))) return false;
    } else {
      if (!(s[key] === undefined || isNonNegative(s[key]))) return false;
    }
  }
  return true;
}

export function isFittedHull(value: unknown): value is FittedHull {
  if (!isRecord(value)) return false;
  const s = value;
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
  if (!isRecord(value)) return false;
  const s = value;
  return isNonNegative(s.thrust) && isNonNegative(s.speedBonus) && isNonNegative(s.massAddition) && isNonNegative(s.sigBloom);
}

export function isOptionalFittedHullSummary(value: unknown): value is FittedHullSummary | undefined {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  const s = value;
  if (typeof s.fittingName !== "string") return false;
  if (!isFittedHull(s.fitted)) return false;
  if (!isOptionalPropulsionStats(s.propulsion)) return false;
  if (s.propulsionId !== undefined && typeof s.propulsionId !== "string") return false;
  if (s.propulsionModuleId !== undefined && typeof s.propulsionModuleId !== "string") return false;
  if (s.propulsionName !== undefined && typeof s.propulsionName !== "string") return false;
  if (s.propulsionKind !== undefined && !isPropulsionKind(s.propulsionKind)) return false;
  if (s.baseMaxSpeed !== undefined && !isNonNegative(s.baseMaxSpeed)) return false;
  return true;
}

export function isOptionalRangeOverlayVisibility(value: unknown): value is Record<string, WeaponRangeVisibility> | undefined {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "web" && key !== "grappler" && key !== "scrambler" && key !== "disruptor") return false;
    const v = record[key];
    if (v !== "shipA" && v !== "shipB" && v !== "both" && v !== "none") return false;
  }
  return true;
}

export function stripDisplayPreferences(value: ProfileSettings): ProfileSettings {
  const { language: _, shipATrackingUnit: __, shipBTrackingUnit: ___, weaponRangeVisibility: ____, simSpeed: _____, gridBrightness: ______, rangeOverlayVisibility: _______, autoZoom: ________, zoomFactor: _________, ...rest } = value as Record<string, unknown>;
  return rest as ProfileSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPropulsionKind(value: unknown): value is PropulsionKind {
  return value === "afterburner" || value === "microwarpdrive";
}
