import type { ChargeCatalog } from "../fitting";
import { toShipId, toTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { ShipProfile, Ships, SkillLevel } from "../ships";
import type { FittedHullSummary, PropulsionSelection, StoredBoosterActivation, StoredEwarActivation } from "./userSettings";

const SHIP_A_LEGACY_PREFIX = "attacker";
const SHIP_B_LEGACY_PREFIX = "target";
const SHIP_A_PREFIX = "shipA";
const SHIP_B_PREFIX = "shipB";

export interface LegacyUserSettings {
  attackerSpeed?: number;
  attackerMode?: AutopilotMode;
  attackerRange?: number;
  attackerMass?: number;
  attackerInertia?: number;
  attackerSkillLevel?: SkillLevel;
  attackerOverload?: boolean;
  attackerHull?: string;
  attackerPropulsion?: PropulsionSelection;
  attackerFitting?: string;
  attackerFittedHull?: FittedHullSummary;
  attackerEwarActivation?: StoredEwarActivation;
  attackerBoosterActivation?: readonly StoredBoosterActivation[];
  attackerAmmo?: string;
  attackerOverrides?: Record<string, unknown>;
  maneuverAggressivity?: number;
  targetSpeed?: number;
  targetMode?: AutopilotMode;
  targetRange?: number;
  targetMass?: number;
  targetInertia?: number;
  targetSig?: number;
  targetSkillLevel?: SkillLevel;
  targetOverload?: boolean;
  targetHull?: string;
  targetPropulsion?: PropulsionSelection;
  targetFitting?: string;
  targetFittedHull?: FittedHullSummary;
  targetEwarActivation?: StoredEwarActivation;
  targetBoosterActivation?: readonly StoredBoosterActivation[];
  targetOverrides?: Record<string, unknown>;
}

export function resolveHullId(name: string, ships: Ships): ShipId | undefined {
  const trimmed = name.trim();
  try {
    const id = toShipId(trimmed);
    return ships.findHullById(id)?.id;
  } catch {
    return ships.findHull(trimmed)?.id;
  }
}

export function resolveHull(name: string, ships: Ships): ShipProfile | undefined {
  const trimmed = name.trim();
  try {
    const id = toShipId(trimmed);
    return ships.findHullById(id);
  } catch {
    return ships.findHull(trimmed);
  }
}

export function resolveAmmoId(name: string, chargeCatalog: ChargeCatalog): TypeId | undefined {
  const trimmed = name.trim();
  try {
    const id = toTypeId(trimmed);
    if (chargeCatalog.has(id)) return id;
  } catch {
    // fall through to name lookup
  }
  return chargeCatalog.idForName(trimmed);
}

export function normalizeLegacySettings(record: Record<string, unknown>): void {
  normalizeLegacyOverrides(record, "attackerOverrides", "shipAOverrides");
  normalizeLegacyOverrides(record, "targetOverrides", "shipBOverrides");
  const entries = Object.entries(record);
  for (const [oldKey, value] of entries) {
    if (oldKey === "version" || oldKey === "language" || oldKey === "trackingUnit" || oldKey === "simSpeed") continue;
    const newKey = newTopLevelKeyFor(oldKey);
    if (newKey !== undefined && newKey !== oldKey && !(newKey in record)) {
      record[newKey] = value;
      delete record[oldKey];
    }
  }
}

function normalizeLegacyOverrides(record: Record<string, unknown>, oldKey: string, newKey: string): void {
  const overrides = record[oldKey];
  if (overrides === undefined) return;
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    delete record[oldKey];
    return;
  }
  if (!(newKey in record)) {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
      const newInnerKey = newOverrideKeyFor(key);
      if (newInnerKey === undefined) continue;
      normalized[newInnerKey] = value;
    }
    record[newKey] = normalized;
  }
  delete record[oldKey];
}

function newTopLevelKeyFor(oldKey: string): string | undefined {
  const canonicalTurret = canonicalTurretKeyFor(oldKey);
  if (canonicalTurret !== undefined) return canonicalTurret;
  return newKeyFor(oldKey);
}

function newOverrideKeyFor(oldKey: string): string | undefined {
  if (isTurretOverrideKey(oldKey)) return oldKey;
  const sidePrefix = sidePrefixFor(oldKey);
  if (sidePrefix === undefined) return oldKey;
  const rest = oldKey.slice(sidePrefix.length);
  if (isTurretOverrideKey(rest)) return lowerFirst(rest);
  return `${sidePrefix === SHIP_A_LEGACY_PREFIX ? SHIP_A_PREFIX : SHIP_B_PREFIX}${rest}`;
}

function newKeyFor(oldKey: string): string | undefined {
  if (oldKey.startsWith(SHIP_A_LEGACY_PREFIX)) {
    return `${SHIP_A_PREFIX}${oldKey.slice(SHIP_A_LEGACY_PREFIX.length)}`;
  }
  if (oldKey.startsWith(SHIP_B_LEGACY_PREFIX)) {
    return `${SHIP_B_PREFIX}${oldKey.slice(SHIP_B_LEGACY_PREFIX.length)}`;
  }
  return oldKey;
}

function canonicalTurretKeyFor(oldKey: string): string | undefined {
  if (oldKey === "tracking") return "shipATracking";
  if (oldKey === "sigRes") return "shipASigRes";
  if (oldKey === "optimal") return "shipAOptimal";
  if (oldKey === "falloff") return "shipAFalloff";
  if (oldKey === "ammo") return "shipAAmmo";
  return undefined;
}

function isTurretOverrideKey(oldKey: string): boolean {
  const key = oldKey.toLowerCase();
  return key === "tracking" || key === "sigres" || key === "optimal" || key === "falloff";
}

function sidePrefixFor(oldKey: string): string | undefined {
  if (oldKey.startsWith(SHIP_A_LEGACY_PREFIX)) return SHIP_A_LEGACY_PREFIX;
  if (oldKey.startsWith(SHIP_B_LEGACY_PREFIX)) return SHIP_B_LEGACY_PREFIX;
  return undefined;
}

function lowerFirst(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}
