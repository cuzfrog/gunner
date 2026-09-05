import { type DamageVector, type DefenseLayer, type DefenseLayerSpec, type DefenseSpec, type RepairerSpec, DAMAGE_TYPES } from "./types";

export interface LayerEhp {
  readonly layer: DefenseLayer;
  readonly hp: number;
  readonly ehp: number;
}

export interface DefenseAssessment {
  readonly layers: Readonly<Record<DefenseLayer, LayerEhp>>;
  readonly totalEhp: number;
  readonly repairPerSecond: Readonly<Record<DefenseLayer, number>>;
  readonly shieldRegenPerSecond: number;
  readonly actualIncomingDps: number;
  readonly actualIncomingByLayer: Readonly<Record<DefenseLayer, number>>;
}

export interface DefenseAssessor {
  assess(spec: DefenseSpec, incoming: DamageVector, overloaded: boolean): DefenseAssessment;
}

export const EMPTY_DEFENSE_ASSESSMENT: DefenseAssessment = {
  layers: {
    shield: { layer: "shield", hp: 0, ehp: 0 },
    armor: { layer: "armor", hp: 0, ehp: 0 },
    hull: { layer: "hull", hp: 0, ehp: 0 },
  },
  totalEhp: 0,
  repairPerSecond: { shield: 0, armor: 0, hull: 0 },
  shieldRegenPerSecond: 0,
  actualIncomingDps: 0,
  actualIncomingByLayer: { shield: 0, armor: 0, hull: 0 },
};

export class DefenseAssessorImpl implements DefenseAssessor {
  assess(spec: DefenseSpec, incoming: DamageVector, overloaded: boolean): DefenseAssessment {
    const totalIncoming = sumVector(incoming);
    const shares = totalIncoming > 0 ? normalizeShares(incoming, totalIncoming) : uniformShares();

    const shieldEhp = computeLayerEhp(spec.layers.shield, shares);
    const armorEhp = computeLayerEhp(spec.layers.armor, shares);
    const hullEhp = computeLayerEhp(spec.layers.hull, shares);
    const totalEhp = shieldEhp + armorEhp + hullEhp;

    const repairPerSecond = computeRepairPerSecond(spec.repairers, overloaded);
    const shieldRegenPerSecond = computeShieldRegen(spec);

    return {
      layers: {
        shield: { layer: "shield", hp: spec.layers.shield.hp, ehp: shieldEhp },
        armor: { layer: "armor", hp: spec.layers.armor.hp, ehp: armorEhp },
        hull: { layer: "hull", hp: spec.layers.hull.hp, ehp: hullEhp },
      },
      totalEhp,
      repairPerSecond,
      shieldRegenPerSecond,
      actualIncomingDps: 0,
      actualIncomingByLayer: { shield: 0, armor: 0, hull: 0 },
    };
  }
}

function computeLayerEhp(layer: DefenseLayerSpec, shares: Readonly<Record<keyof DamageVector, number>>): number {
  let effectiveResonance = 0;
  for (const type of DAMAGE_TYPES) {
    effectiveResonance += shares[type] * (1 - layer.resists[type]);
  }
  return effectiveResonance > 0 ? layer.hp / effectiveResonance : 0;
}

function computeRepairPerSecond(repairers: readonly RepairerSpec[], overloaded: boolean): Readonly<Record<DefenseLayer, number>> {
  const result: Record<DefenseLayer, number> = { shield: 0, armor: 0, hull: 0 };
  for (const rep of repairers) {
    const amount = overloaded ? rep.amount * rep.overload.amountMultiplier : rep.amount;
    const cycleTime = overloaded ? rep.cycleTime * rep.overload.cycleTimeMultiplier : rep.cycleTime;
    result[rep.layer] += amount / cycleTime;
  }
  return result;
}

function computeShieldRegen(spec: DefenseSpec): number {
  if (spec.shieldRechargeTime <= 0) return 0;
  const shieldHp = spec.layers.shield.hp;
  if (shieldHp <= 0) return 0;
  return peakShieldRegen(shieldHp, spec.shieldRechargeTime);
}

function peakShieldRegen(shieldHp: number, rechargeTime: number): number {
  return 2.5 * shieldHp / rechargeTime;
}

function sumVector(vec: DamageVector): number {
  return vec.em + vec.thermal + vec.kinetic + vec.explosive;
}

function normalizeShares(vec: DamageVector, total: number): Readonly<Record<keyof DamageVector, number>> {
  return {
    em: vec.em / total,
    thermal: vec.thermal / total,
    kinetic: vec.kinetic / total,
    explosive: vec.explosive / total,
  };
}

function uniformShares(): Readonly<Record<keyof DamageVector, number>> {
  return { em: 0.25, thermal: 0.25, kinetic: 0.25, explosive: 0.25 };
}
