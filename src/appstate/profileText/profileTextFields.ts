import type { DroneGroup } from "../../fitting";
import type { FittedHullSummary, ProfileParamOverrides, ProfileSettings, StoredBoosterActivation, StoredEwarActivation, StoredMissileBoosterActivation } from "../userSettings";

export type Side = "shipA" | "shipB";
export type ScalarField = keyof Omit<ProfileSettings, "shipAFitting" | "shipBFitting" | "shipAOverrides" | "shipBOverrides">;
export type ScalarValue = string | number | boolean | FittedHullSummary | StoredEwarActivation | readonly StoredBoosterActivation[] | readonly StoredMissileBoosterActivation[] | readonly DroneGroup[];

export const GLOBAL_FIELDS: readonly ScalarField[] = [
  "version",
  "initialDistance",
] as const;

export const SHIP_A_FIELDS: readonly ScalarField[] = [
  "shipASpeed",
  "shipAMode",
  "shipARange",
  "shipAAggressivity",
  "shipAMass",
  "shipAInertia",
  "shipASig",
  "shipASkillLevel",
  "shipAOverload",
  "shipAHullId",
  "shipAPropulsion",
  "shipAFittedHull",
  "shipAEwarActivation",
  "shipABoosterActivation",
  "shipAMissileBoosterActivation",
  "shipATracking",
  "shipASigRes",
  "shipAOptimal",
  "shipAFalloff",
  "shipAAmmo",
  "shipAWeaponKind",
  "shipAMissileAmmo",
  "shipADroneGroups",
] as const;

export const SHIP_B_FIELDS: readonly ScalarField[] = [
  "shipBSpeed",
  "shipBMode",
  "shipBRange",
  "shipBAggressivity",
  "shipBMass",
  "shipBInertia",
  "shipBSig",
  "shipBSkillLevel",
  "shipBOverload",
  "shipBHullId",
  "shipBPropulsion",
  "shipBFittedHull",
  "shipBEwarActivation",
  "shipBBoosterActivation",
  "shipBMissileBoosterActivation",
  "shipBTracking",
  "shipBSigRes",
  "shipBOptimal",
  "shipBFalloff",
  "shipBAmmo",
  "shipBWeaponKind",
  "shipBMissileAmmo",
  "shipBDroneGroups",
] as const;

export const ALL_FIELDS: readonly ScalarField[] = [...GLOBAL_FIELDS, ...SHIP_A_FIELDS, ...SHIP_B_FIELDS] as const;

export const OVERRIDE_KEYS: readonly (keyof ProfileParamOverrides)[] = [
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
] as const;

export const DOT_KEY_TO_FIELD: ReadonlyMap<string, ScalarField> = buildDotKeyToFieldMap();
export const OVERRIDE_DOT_KEY_TO_FULL: ReadonlyMap<string, keyof ProfileParamOverrides> = buildOverrideDotKeyToFullMap();

function buildDotKeyToFieldMap(): ReadonlyMap<string, ScalarField> {
  const map = new Map<string, ScalarField>();
  for (const field of ALL_FIELDS) {
    map.set(dotKeyForField(field), field);
  }
  return map;
}

function buildOverrideDotKeyToFullMap(): ReadonlyMap<string, keyof ProfileParamOverrides> {
  const map = new Map<string, keyof ProfileParamOverrides>();
  for (const key of OVERRIDE_KEYS) {
    const shipADot = overrideDotKeyForFull("shipA", key);
    if (shipADot !== undefined) map.set(shipADot, key);
    const shipBDot = overrideDotKeyForFull("shipB", key);
    if (shipBDot !== undefined) map.set(shipBDot, key);
  }
  return map;
}

export function dotKeyForField(field: ScalarField): string {
  if (field.startsWith("shipA")) return `shipA.${lowerFirst(field.slice("shipA".length))}`;
  if (field.startsWith("shipB")) return `shipB.${lowerFirst(field.slice("shipB".length))}`;
  return field;
}

export function sideFromFittingDotKey(dotKey: string): Side | undefined {
  if (dotKey === "shipA") return "shipA";
  if (dotKey === "shipB") return "shipB";
  return undefined;
}

export function overrideDotKeyForFull(side: Side, full: keyof ProfileParamOverrides): string | undefined {
  if (full === "tracking" || full === "sigRes" || full === "optimal" || full === "falloff") {
    return `override.${side}.${full}`;
  }
  if (side === "shipA" && full.startsWith("shipA")) {
    return `override.shipA.${lowerFirst(full.slice("shipA".length))}`;
  }
  if (side === "shipB" && full.startsWith("shipB")) {
    return `override.shipB.${lowerFirst(full.slice("shipB".length))}`;
  }
  return undefined;
}

function lowerFirst(value: string): string {
  if (value === "") return value;
  return value[0].toLowerCase() + value.slice(1);
}

