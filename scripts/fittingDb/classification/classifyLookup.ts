import { ATTRIBUTE_CLASSIFICATION } from "./attributeClassification";
import { EFFECT_CLASSIFICATION } from "./effectClassification";
import type { RigDrawbackKind } from "./classificationTypes";
import type { HullBonusAttribute } from "../../../src/gamedata/fittingDb/types";

const HULL_BONUS_ATTRIBUTES: ReadonlySet<string> = new Set([
  "maxVelocity", "agility", "mwdSigBloom",
  "turretTracking", "turretOptimal", "turretFalloff", "turretDamage", "turretRoF",
  "missileDamage", "missileRoF", "missileVelocity", "missileFlightTime", "missileExplosionRadius", "missileExplosionVelocity",
  "droneDamage",
  "armorResist", "shieldResist", "shieldHpPercent", "armorHpPercent", "hullHpPercent", "plateHpPercent", "extenderHpPercent",
]);

function isHullBonusAttribute(s: string): s is HullBonusAttribute {
  return HULL_BONUS_ATTRIBUTES.has(s);
}

export function semanticAttributeToHullBonus(id: number): HullBonusAttribute | undefined {
  const c = ATTRIBUTE_CLASSIFICATION[id];
  if (c?.kind !== "semantic") return undefined;
  if (isHullBonusAttribute(c.semantic)) return c.semantic;
  return undefined;
}

export function isOutOfScopeAttribute(id: number): boolean {
  const c = ATTRIBUTE_CLASSIFICATION[id];
  return c?.kind === "outOfScope";
}

export function isNonScalingEffect(id: number): boolean {
  const c = EFFECT_CLASSIFICATION[id];
  if (c?.kind === "modifier") return !c.scalesWithHullSkill;
  return false;
}

export function effectDrawbackKind(id: number): RigDrawbackKind | undefined {
  const c = EFFECT_CLASSIFICATION[id];
  if (c?.kind !== "modifier") return undefined;
  return c.drawback;
}
