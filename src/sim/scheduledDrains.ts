import type { CommandBurstSpec, EwarProjection, MissileBoosterProjection, ScheduledDrain, SensorBoostProjection, TurretBoostProjection } from "./types";
import { actingEwarFamilies } from "./types";

export function scheduledDrainsFromProjections(ewar: EwarProjection, boosts: TurretBoostProjection, missileBoosts: MissileBoosterProjection, sensorBoosts: SensorBoostProjection, commandBursts: readonly CommandBurstSpec[]): readonly ScheduledDrain[] {
  const drains: ScheduledDrain[] = [];
  // Nosferatu specs carry no capacitorNeed, so they drop out here - their transfer debits the target, not the user.
  for (const family of actingEwarFamilies(ewar.loadout, ewar.activation)) {
    family.specs.forEach((spec, i) => {
      if (spec.capacitorNeed === undefined || spec.cycleTime === undefined || spec.capacitorNeed <= 0) return;
      drains.push({ moduleId: spec.moduleId, amount: spec.capacitorNeed, interval: spec.cycleTime, active: family.activeAt(i) ?? true });
    });
  }
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
