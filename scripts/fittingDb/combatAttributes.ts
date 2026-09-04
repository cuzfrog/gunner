export const SHIELD_EM_RESONANCE = 271;
export const SHIELD_THERMAL_RESONANCE = 272;
export const SHIELD_KINETIC_RESONANCE = 273;
export const SHIELD_EXPLOSIVE_RESONANCE = 274;
export const ARMOR_EM_RESONANCE = 267;
export const ARMOR_THERMAL_RESONANCE = 268;
export const ARMOR_KINETIC_RESONANCE = 269;
export const ARMOR_EXPLOSIVE_RESONANCE = 270;
export const HULL_EM_RESONANCE = 113;
export const HULL_THERMAL_RESONANCE = 111;
export const HULL_KINETIC_RESONANCE = 109;
export const HULL_EXPLOSIVE_RESONANCE = 110;

export const SHIELD_CAPACITY = 263;
export const ARMOR_HP = 265;
export const STRUCTURE_HP = 9;

export const SHIELD_RECHARGE_RATE = 479;
export const SHIELD_BONUS = 68;
export const ARMOR_DAMAGE_AMOUNT = 84;
export const STRUCTURE_DAMAGE_AMOUNT = 83;
export const DURATION = 73;
export const RESISTANCE_SHIFT_AMOUNT = 1849;

export const CAPACITOR_NEED = 6;
export const MASS = 4;
export const SIGNATURE_RADIUS = 552;
export const MAX_VELOCITY = 37;

export const SHIELD_RESONANCE_ATTRS = new Set([SHIELD_EM_RESONANCE, SHIELD_THERMAL_RESONANCE, SHIELD_KINETIC_RESONANCE, SHIELD_EXPLOSIVE_RESONANCE]);
export const ARMOR_RESONANCE_ATTRS = new Set([ARMOR_EM_RESONANCE, ARMOR_THERMAL_RESONANCE, ARMOR_KINETIC_RESONANCE, ARMOR_EXPLOSIVE_RESONANCE]);
export const HULL_RESONANCE_ATTRS = new Set([HULL_EM_RESONANCE, HULL_THERMAL_RESONANCE, HULL_KINETIC_RESONANCE, HULL_EXPLOSIVE_RESONANCE]);

export type DefenseLayer = "shield" | "armor" | "hull";

export function resistLayerForAttr(attrId: number): DefenseLayer | undefined {
  if (SHIELD_RESONANCE_ATTRS.has(attrId)) return "shield";
  if (ARMOR_RESONANCE_ATTRS.has(attrId)) return "armor";
  if (HULL_RESONANCE_ATTRS.has(attrId)) return "hull";
  return undefined;
}

export function hpLayerForAttr(attrId: number): DefenseLayer | undefined {
  if (attrId === SHIELD_CAPACITY) return "shield";
  if (attrId === ARMOR_HP) return "armor";
  if (attrId === STRUCTURE_HP) return "hull";
  return undefined;
}
