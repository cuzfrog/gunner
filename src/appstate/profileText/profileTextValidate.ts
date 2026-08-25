import {
  USER_SETTINGS_VERSION,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type ProfileSettings,
  type StoredBoosterActivation,
} from "../userSettings";
import {
  isNonNegative,
  isOptionalBoosterActivations,
  isOptionalFittedHullSummary,
  isPositive,
  isSkillLevel,
} from "../validators";
import type { SettingGuards } from "../settingGuards";
import type { ScalarField, ScalarValue } from "./profileTextFields";

export function parseScalarValue(field: ScalarField, value: string, guards: SettingGuards): ScalarValue | undefined {
  if (value === "") return undefined;

  if (field === "version") return value === String(USER_SETTINGS_VERSION) ? USER_SETTINGS_VERSION : undefined;
  if (field === "shipAOverload" || field === "shipBOverload") return value === "true" ? true : value === "false" ? false : undefined;
  if (field === "shipAMode" || field === "shipBMode") return guards.isAutopilotMode(value) ? value : undefined;
  if (field === "shipASkillLevel" || field === "shipBSkillLevel") {
    const num = Number(value);
    return isSkillLevel(num) ? num : undefined;
  }
  if (field === "sigRes") return guards.isSigResolutionClass(value) ? value : undefined;
  if (field === "shipAFittedHull" || field === "shipBFittedHull") return parseFittedHullSummary(value);
  if (field === "shipAHull" || field === "shipAPropulsion" || field === "shipBHull" || field === "shipBPropulsion") return value;
  if (field === "shipAAmmo") return value;

  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (field === "initialDistance" || field === "shipBSig") return isPositive(num) ? num : undefined;
  if (field === "maneuverAggressivity") return isNonNegative(num) ? num : undefined;
  return isNonNegative(num) ? num : undefined;
}

export function parseOverrideValue(
  key: keyof ProfileParamOverrides,
  value: string,
  guards: SettingGuards,
): ProfileParamOverrides[keyof ProfileParamOverrides] | undefined {
  if (value === "") return undefined;
  if (key === "sigRes") return guards.isSigResolutionClass(value) ? value : undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (key === "shipBSig") return isPositive(num) ? num : undefined;
  return isNonNegative(num) ? num : undefined;
}

export function profileSettingsFromRaw(raw: Partial<ProfileSettings>): ProfileSettings | undefined {
  const version = raw.version;
  const tracking = raw.tracking;
  const sigRes = raw.sigRes;
  const optimal = raw.optimal;
  const falloff = raw.falloff;
  const shipASpeed = raw.shipASpeed;
  const shipAMode = raw.shipAMode;
  const shipARange = raw.shipARange;
  const shipAMass = raw.shipAMass;
  const shipAInertia = raw.shipAInertia;
  const initialDistance = raw.initialDistance;
  const shipBSpeed = raw.shipBSpeed;
  const shipBMode = raw.shipBMode;
  const shipBRange = raw.shipBRange;
  const shipBMass = raw.shipBMass;
  const shipBInertia = raw.shipBInertia;
  const shipBSig = raw.shipBSig;

  if (
    version === undefined ||
    tracking === undefined ||
    sigRes === undefined ||
    optimal === undefined ||
    falloff === undefined ||
    shipASpeed === undefined ||
    shipAMode === undefined ||
    shipARange === undefined ||
    shipAMass === undefined ||
    shipAInertia === undefined ||
    initialDistance === undefined ||
    shipBSpeed === undefined ||
    shipBMode === undefined ||
    shipBRange === undefined ||
    shipBMass === undefined ||
    shipBInertia === undefined ||
    shipBSig === undefined
  ) {
    return undefined;
  }

  return {
    version,
    tracking,
    sigRes,
    optimal,
    falloff,
    shipASpeed,
    shipAMode,
    shipARange,
    shipAMass,
    shipAInertia,
    initialDistance,
    shipBSpeed,
    shipBMode,
    shipBRange,
    shipBMass,
    shipBInertia,
    shipBSig,
    shipASkillLevel: raw.shipASkillLevel,
    shipAOverload: raw.shipAOverload,
    shipAHull: raw.shipAHull,
    shipAPropulsion: raw.shipAPropulsion,
    shipAFitting: raw.shipAFitting,
    shipAOverrides: raw.shipAOverrides,
    shipAFittedHull: raw.shipAFittedHull,
    shipAEwarActivation: raw.shipAEwarActivation,
    shipABoosterActivation: raw.shipABoosterActivation,
    shipAAmmo: raw.shipAAmmo,
    shipBSkillLevel: raw.shipBSkillLevel,
    shipBOverload: raw.shipBOverload,
    shipBHull: raw.shipBHull,
    shipBPropulsion: raw.shipBPropulsion,
    shipBFitting: raw.shipBFitting,
    shipBOverrides: raw.shipBOverrides,
    shipBFittedHull: raw.shipBFittedHull,
    shipBEwarActivation: raw.shipBEwarActivation,
    shipBBoosterActivation: raw.shipBBoosterActivation,
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
