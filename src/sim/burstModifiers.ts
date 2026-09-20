import { type BurstEffectKind, type BurstModifiers, type CommandBurstSpec, IDENTITY_BURST_MODIFIERS } from "./types";
import type { TypeId } from "../gamedata/ids";

/** Aggregates the live command burst effects of one side into per-kind multipliers. A module counts as live when `isActive` holds; several live bursts of the same kind keep the effect furthest from neutral, mirroring the game rule that the strongest same-buff application wins (no stacking between bursts). */
export function burstModifiers(bursts: readonly CommandBurstSpec[], isActive: (moduleId: TypeId) => boolean): BurstModifiers {
  const result: Record<BurstEffectKind, number> = { ...IDENTITY_BURST_MODIFIERS };
  for (const burst of bursts) {
    if (!isActive(burst.moduleId)) continue;
    for (const effect of burst.effects) {
      if (Math.abs(effect.multiplier - 1) > Math.abs(result[effect.kind] - 1)) result[effect.kind] = effect.multiplier;
    }
  }
  return result;
}
