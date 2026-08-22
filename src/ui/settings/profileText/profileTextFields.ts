import type { FittedHullSummary, ProfileParamOverrides, ProfileSettings } from "../userSettings";

export type Side = "attacker" | "target";
export type ScalarField = keyof Omit<ProfileSettings, "attackerFitting" | "targetFitting" | "attackerOverrides" | "targetOverrides">;
export type ScalarValue = string | number | boolean | FittedHullSummary;

export const GLOBAL_FIELDS: readonly ScalarField[] = [
  "version",
  "tracking",
  "sigRes",
  "optimal",
  "falloff",
  "attackerAmmo",
  "initialDistance",
  "maneuverAggressivity",
] as const;

export const ATTACKER_FIELDS: readonly ScalarField[] = [
  "attackerSpeed",
  "attackerMode",
  "attackerRange",
  "attackerMass",
  "attackerInertia",
  "attackerSkillLevel",
  "attackerOverload",
  "attackerHull",
  "attackerPropulsion",
  "attackerFittedHull",
] as const;

export const TARGET_FIELDS: readonly ScalarField[] = [
  "targetSpeed",
  "targetMode",
  "targetRange",
  "targetMass",
  "targetInertia",
  "targetSig",
  "targetSkillLevel",
  "targetOverload",
  "targetHull",
  "targetPropulsion",
  "targetFittedHull",
] as const;

export const ALL_FIELDS: readonly ScalarField[] = [...GLOBAL_FIELDS, ...ATTACKER_FIELDS, ...TARGET_FIELDS] as const;

export const OVERRIDE_KEYS: readonly (keyof ProfileParamOverrides)[] = [
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
] as const;

export const DOT_KEY_TO_FIELD: ReadonlyMap<string, ScalarField> = buildDotKeyToFieldMap();
export const OVERRIDE_DOT_KEY_TO_FULL: ReadonlyMap<string, keyof ProfileParamOverrides> = buildOverrideDotKeyToFullMap();

function buildDotKeyToFieldMap(): ReadonlyMap<string, ScalarField> {
  const map = new Map<string, ScalarField>();
  for (const field of ALL_FIELDS) {
    map.set(dotKeyForField(field), field);
  }
  map.set("attacker.ammo", "attackerAmmo");
  return map;
}

function buildOverrideDotKeyToFullMap(): ReadonlyMap<string, keyof ProfileParamOverrides> {
  const map = new Map<string, keyof ProfileParamOverrides>();
  for (const key of OVERRIDE_KEYS) {
    const attackerDot = overrideDotKeyForFull("attacker", key);
    if (attackerDot !== undefined) map.set(attackerDot, key);
    const targetDot = overrideDotKeyForFull("target", key);
    if (targetDot !== undefined) map.set(targetDot, key);
  }
  return map;
}

export function dotKeyForField(field: ScalarField): string {
  if (field === "attackerAmmo") return "ammo";
  if (field.startsWith("attacker")) return `attacker.${lowerFirst(field.slice("attacker".length))}`;
  if (field.startsWith("target")) return `target.${lowerFirst(field.slice("target".length))}`;
  return field;
}

export function sideFromFittingDotKey(dotKey: string): Side | undefined {
  if (dotKey === "attacker") return "attacker";
  if (dotKey === "target") return "target";
  return undefined;
}

export function overrideDotKeyForFull(side: Side, full: keyof ProfileParamOverrides): string | undefined {
  if (full === "tracking" || full === "sigRes" || full === "optimal" || full === "falloff") {
    return `override.${side}.${full}`;
  }
  if (side === "attacker" && full.startsWith("attacker")) {
    return `override.attacker.${lowerFirst(full.slice("attacker".length))}`;
  }
  if (side === "target" && full.startsWith("target")) {
    return `override.target.${lowerFirst(full.slice("target".length))}`;
  }
  return undefined;
}

function lowerFirst(value: string): string {
  if (value === "") return value;
  return value[0].toLowerCase() + value.slice(1);
}

