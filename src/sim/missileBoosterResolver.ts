import type { StackingPenalty } from "./stackingPenalty";
import type { MissileBoosterProjection, MissileSpec } from "./types";

export interface MissileBoosterResolver {
  boostedMissile(missile: MissileSpec, projection: MissileBoosterProjection | undefined): MissileSpec;
}

export class MissileBoosterResolverImpl implements MissileBoosterResolver {
  private readonly stacking: StackingPenalty;

  constructor({ stackingPenalty }: { stackingPenalty: StackingPenalty }) {
    this.stacking = stackingPenalty;
  }

  boostedMissile(missile: MissileSpec, projection: MissileBoosterProjection | undefined): MissileSpec {
    if (!projection) return missile;
    const explosionRadiusMultipliers: number[] = [];
    const explosionVelocityMultipliers: number[] = [];
    const missileVelocityMultipliers: number[] = [];
    const flightTimeMultipliers: number[] = [];

    for (let i = 0; i < projection.loadout.computers.length; i++) {
      const spec = projection.loadout.computers[i];
      const activation = projection.activation?.computers[i];
      if (!activation || !activation.active) continue;

      const overloadFactor = activation.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const script = activation.script ?? spec.defaultScript;
      const erMultiplier = script ? script.explosionRadiusMultiplier : 1;
      const evMultiplier = script ? script.explosionVelocityMultiplier : 1;
      const mvMultiplier = script ? script.missileVelocityMultiplier : 1;
      const ftMultiplier = script ? script.flightTimeMultiplier : 1;

      const erPercent = spec.explosionRadiusBonusPercent * overloadFactor * erMultiplier;
      const evPercent = spec.explosionVelocityBonusPercent * overloadFactor * evMultiplier;
      const mvPercent = spec.missileVelocityBonusPercent * overloadFactor * mvMultiplier;
      const ftPercent = spec.flightTimeBonusPercent * overloadFactor * ftMultiplier;

      if (erPercent !== 0) explosionRadiusMultipliers.push(1 + erPercent / 100);
      if (evPercent !== 0) explosionVelocityMultipliers.push(1 + evPercent / 100);
      if (mvPercent !== 0) missileVelocityMultipliers.push(1 + mvPercent / 100);
      if (ftPercent !== 0) flightTimeMultipliers.push(1 + ftPercent / 100);
    }

    for (const enhancer of projection.loadout.enhancers) {
      if (enhancer.explosionRadiusBonusPercent !== 0) explosionRadiusMultipliers.push(1 + enhancer.explosionRadiusBonusPercent / 100);
      if (enhancer.explosionVelocityBonusPercent !== 0) explosionVelocityMultipliers.push(1 + enhancer.explosionVelocityBonusPercent / 100);
      if (enhancer.missileVelocityBonusPercent !== 0) missileVelocityMultipliers.push(1 + enhancer.missileVelocityBonusPercent / 100);
      if (enhancer.flightTimeBonusPercent !== 0) flightTimeMultipliers.push(1 + enhancer.flightTimeBonusPercent / 100);
    }

    const maxVelocity = missile.maxVelocity * this.stacking.apply(missileVelocityMultipliers);
    const flightTime = missile.flightTime * this.stacking.apply(flightTimeMultipliers);
    return {
      ...missile,
      explosionRadius: missile.explosionRadius * this.stacking.apply(explosionRadiusMultipliers),
      explosionVelocity: missile.explosionVelocity * this.stacking.apply(explosionVelocityMultipliers),
      maxVelocity,
      flightTime,
      flightRange: maxVelocity * flightTime,
    };
  }
}
