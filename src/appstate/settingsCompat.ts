import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { SkillLevel } from "../ships";
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

export function normalizeLegacySettings(record: Record<string, unknown>): void {
  normalizeLegacyOverrides(record, "attackerOverrides", "shipAOverrides");
  normalizeLegacyOverrides(record, "targetOverrides", "shipBOverrides");
  const entries = Object.entries(record);
  for (const [oldKey, value] of entries) {
    if (oldKey === "version" || oldKey === "language" || oldKey === "trackingUnit" || oldKey === "simSpeed") continue;
    const newKey = newKeyFor(oldKey);
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
      const newInnerKey = newKeyFor(key);
      normalized[newInnerKey ?? key] = value;
    }
    record[newKey] = normalized;
  }
  delete record[oldKey];
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
