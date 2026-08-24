import { isAutopilotMode, isSigResolutionClass, type AutopilotMode, type SigResolutionClass } from "../../sim";
import {
  USER_SETTINGS_VERSION,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type ProfileSettings,
} from "../userSettings";
import {
  isNonNegative,
  isOptionalFittedHullSummary,
  isPositive,
  isSkillLevel,
} from "../validators";
import type { ScalarField, ScalarValue } from "./profileTextFields";

export function parseScalarValue(field: ScalarField, value: string): ScalarValue | undefined {
  if (value === "") return undefined;

  if (field === "version") return value === String(USER_SETTINGS_VERSION) ? USER_SETTINGS_VERSION : undefined;
  if (field === "attackerOverload" || field === "targetOverload") return value === "true" ? true : value === "false" ? false : undefined;
  if (field === "attackerMode" || field === "targetMode") return isAutopilotMode(value) ? value : undefined;
  if (field === "attackerSkillLevel" || field === "targetSkillLevel") {
    const num = Number(value);
    return isSkillLevel(num) ? num : undefined;
  }
  if (field === "sigRes") return isSigResolutionClass(value) ? value : undefined;
  if (field === "attackerFittedHull" || field === "targetFittedHull") return parseFittedHullSummary(value);
  if (field === "attackerHull" || field === "attackerPropulsion" || field === "targetHull" || field === "targetPropulsion") return value;
  if (field === "attackerAmmo") return value;

  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (field === "initialDistance" || field === "targetSig") return isPositive(num) ? num : undefined;
  if (field === "maneuverAggressivity") return isNonNegative(num) ? num : undefined;
  return isNonNegative(num) ? num : undefined;
}

export function parseOverrideValue(
  key: keyof ProfileParamOverrides,
  value: string,
): ProfileParamOverrides[keyof ProfileParamOverrides] | undefined {
  if (value === "") return undefined;
  if (key === "sigRes") return isSigResolutionClass(value) ? value : undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (key === "targetSig") return isPositive(num) ? num : undefined;
  return isNonNegative(num) ? num : undefined;
}

export function profileSettingsFromRaw(raw: Partial<ProfileSettings>): ProfileSettings | undefined {
  const version = raw.version;
  const tracking = raw.tracking;
  const sigRes = raw.sigRes;
  const optimal = raw.optimal;
  const falloff = raw.falloff;
  const attackerSpeed = raw.attackerSpeed;
  const attackerMode = raw.attackerMode;
  const attackerRange = raw.attackerRange;
  const attackerMass = raw.attackerMass;
  const attackerInertia = raw.attackerInertia;
  const initialDistance = raw.initialDistance;
  const targetSpeed = raw.targetSpeed;
  const targetMode = raw.targetMode;
  const targetRange = raw.targetRange;
  const targetMass = raw.targetMass;
  const targetInertia = raw.targetInertia;
  const targetSig = raw.targetSig;

  if (
    version === undefined ||
    tracking === undefined ||
    sigRes === undefined ||
    optimal === undefined ||
    falloff === undefined ||
    attackerSpeed === undefined ||
    attackerMode === undefined ||
    attackerRange === undefined ||
    attackerMass === undefined ||
    attackerInertia === undefined ||
    initialDistance === undefined ||
    targetSpeed === undefined ||
    targetMode === undefined ||
    targetRange === undefined ||
    targetMass === undefined ||
    targetInertia === undefined ||
    targetSig === undefined
  ) {
    return undefined;
  }

  return {
    version,
    tracking,
    sigRes,
    optimal,
    falloff,
    attackerSpeed,
    attackerMode,
    attackerRange,
    attackerMass,
    attackerInertia,
    initialDistance,
    targetSpeed,
    targetMode,
    targetRange,
    targetMass,
    targetInertia,
    targetSig,
    attackerSkillLevel: raw.attackerSkillLevel,
    attackerOverload: raw.attackerOverload,
    attackerHull: raw.attackerHull,
    attackerPropulsion: raw.attackerPropulsion,
    attackerFitting: raw.attackerFitting,
    attackerOverrides: raw.attackerOverrides,
    attackerFittedHull: raw.attackerFittedHull,
    attackerEwarActivation: raw.attackerEwarActivation,
    attackerAmmo: raw.attackerAmmo,
    targetSkillLevel: raw.targetSkillLevel,
    targetOverload: raw.targetOverload,
    targetHull: raw.targetHull,
    targetPropulsion: raw.targetPropulsion,
    targetFitting: raw.targetFitting,
    targetOverrides: raw.targetOverrides,
    targetFittedHull: raw.targetFittedHull,
    targetEwarActivation: raw.targetEwarActivation,
    maneuverAggressivity: raw.maneuverAggressivity,
  };
}

export function parseFittedHullSummary(value: string): FittedHullSummary | undefined {
  try {
    const parsed = JSON.parse(value);
    return isOptionalFittedHullSummary(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
