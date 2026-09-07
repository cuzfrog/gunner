import type { Rng } from "./rng";

export type HitRollStrategy = (rng: Rng, hitChance: number, expectedMultiplier: number) => number;

export function sampledHitRoll(rng: Rng, hitChance: number): number {
  return rollHit(rng, hitChance);
}

export function expectedHitRoll(_rng: Rng, _hitChance: number, expectedMultiplier: number): number {
  return expectedMultiplier;
}

function rollHit(rng: Rng, hitChance: number): number {
  if (hitChance <= 0) return 0;
  const x = rng.next();
  if (x > hitChance) return 0;
  if (x < 0.01) return 3;
  return x + 0.49;
}

export { rollHit as _rollHit };
