import {
  PROPULSION_NONE,
  USER_SETTINGS_VERSION,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type ProfileSettings,
  type StoredBoosterActivation,
} from "../userSettings";
import type { SimValueParser } from "../../sim";
import {
  isNonNegative,
  isOptionalBoosterActivations,
  isOptionalFittedHullSummary,
  isPositive,
  isSkillLevel,
} from "../validators";
import type { ChargeCatalog } from "../../fitting";
import { toTypeId, type ShipId, type TypeId } from "../../gamedata/ids";
import type { Ships } from "../../ships";
import { resolveAmmoId, resolveHullId } from "../settingsCompat";
import type { ScalarField, ScalarValue } from "./profileTextFields";

const DEFAULT_TURRET_CHARGE_SIZE = 1;

export function parseScalarValue(
  field: ScalarField,
  value: string,
  simValueParser: SimValueParser,
  ships: Ships,
  chargeCatalog: ChargeCatalog,
): ScalarValue | undefined {
  if (value === "") return undefined;

  if (field === "version") return value === String(USER_SETTINGS_VERSION) ? USER_SETTINGS_VERSION : undefined;
  if (field === "shipAOverload" || field === "shipBOverload") return value === "true" ? true : value === "false" ? false : undefined;
  if (field === "shipAMode" || field === "shipBMode") return simValueParser.parseAutopilotMode(value);
  if (field === "shipASkillLevel" || field === "shipBSkillLevel") {
    const num = Number(value);
    return isSkillLevel(num) ? num : undefined;
  }
  if (field === "shipASigRes" || field === "shipBSigRes") {
    return simValueParser.parseSigResolutionClass(value);
  }
  if (field === "shipAFittedHull" || field === "shipBFittedHull") return parseFittedHullSummary(value);
  if (field === "shipAHullId" || field === "shipBHullId") return resolveLegacyHullId(value, ships);
  if (field === "shipAPropulsion" || field === "shipBPropulsion") {
    if (value === PROPULSION_NONE) return value;
    return ships.parsePropulsionId(value);
  }
  if (field === "shipAAmmo" || field === "shipBAmmo") return resolveLegacyAmmoId(value, chargeCatalog);
  if (field === "shipAWeaponKind" || field === "shipBWeaponKind") return value === "turret" || value === "missile" ? value : undefined;
  if (field === "shipAMissileAmmo" || field === "shipBMissileAmmo") return toTypeId(value);

  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (field === "initialDistance" || field === "shipBSig" || field === "shipASig") return isPositive(num) ? num : undefined;
  if (field === "shipAAggressivity" || field === "shipBAggressivity") return isNonNegative(num) ? simValueParser.normalizeAggressivity(num) : undefined;
  return isNonNegative(num) ? num : undefined;
}

export function parseOverrideValue(
  key: keyof ProfileParamOverrides,
  value: string,
  simValueParser: SimValueParser,
): ProfileParamOverrides[keyof ProfileParamOverrides] | undefined {
  if (value === "") return undefined;
  if (key === "sigRes") return simValueParser.parseSigResolutionClass(value);
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
    shipAHullId: raw.shipAHullId,
    shipAPropulsion: raw.shipAPropulsion,
    shipAFitting: raw.shipAFitting,
    shipAOverrides: raw.shipAOverrides,
    shipAFittedHull: raw.shipAFittedHull,
    shipAEwarActivation: raw.shipAEwarActivation,
    shipABoosterActivation: raw.shipABoosterActivation,
    shipAMissileBoosterActivation: raw.shipAMissileBoosterActivation,
    shipAAmmo: raw.shipAAmmo,
    shipAWeaponKind: raw.shipAWeaponKind,
    shipAMissileAmmo: raw.shipAMissileAmmo,
    shipBAmmo: raw.shipBAmmo,
    shipBWeaponKind: raw.shipBWeaponKind,
    shipBMissileAmmo: raw.shipBMissileAmmo,
    shipBSkillLevel: raw.shipBSkillLevel,
    shipBOverload: raw.shipBOverload,
    shipBHullId: raw.shipBHullId,
    shipBPropulsion: raw.shipBPropulsion,
    shipBFitting: raw.shipBFitting,
    shipBOverrides: raw.shipBOverrides,
    shipBFittedHull: raw.shipBFittedHull,
    shipBEwarActivation: raw.shipBEwarActivation,
    shipBBoosterActivation: raw.shipBBoosterActivation,
    shipBMissileBoosterActivation: raw.shipBMissileBoosterActivation,
  };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function resolveLegacyHullId(value: string, ships: Ships): ShipId | undefined {
  return resolveHullId(value, ships);
}

function resolveLegacyAmmoId(value: string, chargeCatalog: ChargeCatalog): TypeId {
  return resolveAmmoId(value, chargeCatalog) ?? chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
}
