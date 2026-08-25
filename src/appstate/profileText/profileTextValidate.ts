import {
  USER_SETTINGS_VERSION,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type ProfileSettings,
  type StoredBoosterActivation,
} from "../userSettings";
import { clampManeuverAggressivity } from "../../sim";
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
  if (field === "shipASigRes" || field === "shipBSigRes") {
    return guards.isSigResolutionClass(value) ? value : undefined;
  }
  if (field === "shipAFittedHull" || field === "shipBFittedHull") return parseFittedHullSummary(value);
  if (field === "shipAHull" || field === "shipAPropulsion" || field === "shipBHull" || field === "shipBPropulsion") return value;
  if (field === "shipAAmmo" || field === "shipBAmmo") return value;

  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (field === "initialDistance" || field === "shipBSig" || field === "shipASig") return isPositive(num) ? num : undefined;
  if (field === "shipAAggressivity" || field === "shipBAggressivity") return isNonNegative(num) ? clampManeuverAggressivity(num) : undefined;
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
  if (key === "shipASig" || key === "shipBSig") return isPositive(num) ? num : undefined;
  return isNonNegative(num) ? num : undefined;
}

export function profileSettingsFromRaw(raw: Partial<ProfileSettings>): ProfileSettings | undefined {
  const shipATracking = raw.shipATracking;
  const shipASigRes = raw.shipASigRes;
  const shipAOptimal = raw.shipAOptimal;
  const shipAFalloff = raw.shipAFalloff;
  const shipBTracking = raw.shipBTracking;
  const shipBSigRes = raw.shipBSigRes;
  const shipBOptimal = raw.shipBOptimal;
  const shipBFalloff = raw.shipBFalloff;
  const version = raw.version;
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
    shipATracking === undefined ||
    shipASigRes === undefined ||
    shipAOptimal === undefined ||
    shipAFalloff === undefined ||
    shipBTracking === undefined ||
    shipBSigRes === undefined ||
    shipBOptimal === undefined ||
    shipBFalloff === undefined ||
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

  const shipAAggressivity = raw.shipAAggressivity ?? 1;
  const shipBAggressivity = raw.shipBAggressivity ?? 1;

  return {
    version,
    shipATracking,
    shipASigRes,
    shipAOptimal,
    shipAFalloff,
    shipBTracking,
    shipBSigRes,
    shipBOptimal,
    shipBFalloff,
    shipASpeed,
    shipAMode,
    shipARange,
    shipAAggressivity,
    shipAMass,
    shipAInertia,
    initialDistance,
    shipBSpeed,
    shipBMode,
    shipBRange,
    shipBAggressivity,
    shipBMass,
    shipBInertia,
    shipBSig,
    ...definedOptionalFields(raw),
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

function definedOptionalFields(raw: Partial<ProfileSettings>): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    shipASig: raw.shipASig,
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
    shipBAmmo: raw.shipBAmmo,
    shipBSkillLevel: raw.shipBSkillLevel,
    shipBOverload: raw.shipBOverload,
    shipBHull: raw.shipBHull,
    shipBPropulsion: raw.shipBPropulsion,
    shipBFitting: raw.shipBFitting,
    shipBOverrides: raw.shipBOverrides,
    shipBFittedHull: raw.shipBFittedHull,
    shipBEwarActivation: raw.shipBEwarActivation,
    shipBBoosterActivation: raw.shipBBoosterActivation,
  };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
