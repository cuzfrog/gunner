import type { CommandBurstSpec, EwarProjection, MissileBoosterProjection, ScheduledDrain, SensorBoostProjection, TurretBoostProjection } from "./types";

export function scheduledDrainsFromProjections(ewar: EwarProjection, boosts: TurretBoostProjection, missileBoosts: MissileBoosterProjection, sensorBoosts: SensorBoostProjection, commandBursts: readonly CommandBurstSpec[]): readonly ScheduledDrain[] {
  const drains: ScheduledDrain[] = [];
  const activation = ewar.activation;
  const ewarFamilies = [
    { specs: ewar.loadout.webs, activeAt: (i: number) => activation?.webs[i]?.active },
    { specs: ewar.loadout.grapplers, activeAt: (i: number) => activation?.grapplers[i]?.active },
    { specs: ewar.loadout.disruptors, activeAt: (i: number) => activation?.disruptors[i]?.active },
    { specs: ewar.loadout.scramblers, activeAt: (i: number) => activation?.scramblers[i]?.active },
    { specs: ewar.loadout.painters, activeAt: (i: number) => activation?.painters[i]?.active },
    { specs: ewar.loadout.dampeners, activeAt: (i: number) => activation?.dampeners[i]?.active },
  ] as const;
  for (const family of ewarFamilies) {
    family.specs.forEach((spec, i) => {
      if (spec.capacitorNeed === undefined || spec.cycleTime === undefined || spec.capacitorNeed <= 0) return;
      drains.push({ moduleId: spec.moduleId, amount: spec.capacitorNeed, interval: spec.cycleTime, active: family.activeAt(i) ?? true });
    });
  }
  ewar.loadout.neutralizers.forEach((spec, i) => {
    if (spec.capacitorNeed <= 0) return;
    drains.push({ moduleId: spec.moduleId, amount: spec.capacitorNeed, interval: spec.cycleTime, active: activation?.neutralizers[i]?.active ?? true });
  });
  const boosterFamilies = [
    { specs: boosts.loadout.computers, activation: boosts.activation?.computers },
    { specs: missileBoosts.loadout.computers, activation: missileBoosts.activation?.computers },
    { specs: sensorBoosts.loadout.boosters, activation: sensorBoosts.activation },
  ] as const;
  for (const family of boosterFamilies) {
    family.specs.forEach((spec, i) => {
      if (spec.capacitorNeed === undefined || spec.cycleTime === undefined || spec.capacitorNeed <= 0) return;
      drains.push({ moduleId: spec.moduleId, amount: spec.capacitorNeed, interval: spec.cycleTime, active: family.activation?.[i]?.active ?? true });
    });
  }
  for (const burst of commandBursts) {
    if (burst.capacitorNeed <= 0 || burst.cycleTime <= 0) continue;
    drains.push({ moduleId: burst.moduleId, amount: burst.capacitorNeed, interval: burst.cycleTime, active: true });
  }
  return drains;
}
