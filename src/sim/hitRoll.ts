import type { Rng } from "./rng";

export function rollHit(rng: Rng, hitChance: number): number {
  if (hitChance <= 0) return 0;
  const x = rng.next();
  if (x > hitChance) return 0;
  if (x < 0.01) return 3;
  return x + 0.49;
}
