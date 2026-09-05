import { ATTRIBUTE_CLASSIFICATION } from "./attributeClassification";
import { EFFECT_CLASSIFICATION } from "./effectClassification";
import { NON_SCALING_EFFECT_IDS } from "./knownMaps";
import type { AttributeClassification, EffectClassification, RigDrawbackKind } from "./classificationTypes";
import type { HullBonusAttribute, SkillBonusType } from "../../../src/gamedata/fittingDb/types";

const HULL_BONUS_ATTRIBUTES: ReadonlySet<string> = new Set([
  "maxVelocity", "agility", "mwdSigBloom",
  "turretTracking", "turretOptimal", "turretFalloff", "turretDamage", "turretRoF",
  "missileDamage", "missileRoF", "missileVelocity", "missileFlightTime", "missileExplosionRadius", "missileExplosionVelocity",
  "droneDamage",
  "armorResist", "shieldResist", "shieldHpPercent", "armorHpPercent", "hullHpPercent", "plateHpPercent", "extenderHpPercent",
]);

const SKILL_BONUS_TYPES: ReadonlySet<string> = new Set([
  "turretDamage", "turretRoF", "turretTracking", "turretOptimal", "turretFalloff",
  "missileDamage", "missileRoF", "missileVelocity", "missileFlightTime", "missileExplosionRadius", "missileExplosionVelocity",
]);

function isHullBonusAttribute(s: string): s is HullBonusAttribute {
  return HULL_BONUS_ATTRIBUTES.has(s);
}

function isSkillBonusType(s: string): s is SkillBonusType {
  return SKILL_BONUS_TYPES.has(s);
}

export function classifyAttribute(id: number): AttributeClassification | undefined {
  return ATTRIBUTE_CLASSIFICATION[id];
}

export function isSemanticAttribute(id: number): boolean {
  const c = ATTRIBUTE_CLASSIFICATION[id];
  return c?.kind === "semantic";
}

export function isOutOfScopeAttribute(id: number): boolean {
  const c = ATTRIBUTE_CLASSIFICATION[id];
  return c?.kind === "outOfScope";
}

export function semanticAttributeToHullBonus(id: number): HullBonusAttribute | undefined {
  const c = ATTRIBUTE_CLASSIFICATION[id];
  if (c?.kind !== "semantic") return undefined;
  if (isHullBonusAttribute(c.semantic)) return c.semantic;
  return undefined;
}

export function semanticAttributeToSkillBonus(id: number): SkillBonusType | undefined {
  const c = ATTRIBUTE_CLASSIFICATION[id];
  if (c?.kind !== "semantic") return undefined;
  if (isSkillBonusType(c.semantic)) return c.semantic;
  return undefined;
}

export function classifyEffect(id: number): EffectClassification | undefined {
  return EFFECT_CLASSIFICATION[id];
}

export function isNonScalingEffect(id: number): boolean {
  const c = EFFECT_CLASSIFICATION[id];
  if (c?.kind === "modifier") return !c.scalesWithHullSkill;
  return NON_SCALING_EFFECT_IDS.has(id);
}

export function effectDrawbackKind(id: number): RigDrawbackKind | undefined {
  const c = EFFECT_CLASSIFICATION[id];
  if (c?.kind !== "modifier") return undefined;
  return c.drawback;
}
