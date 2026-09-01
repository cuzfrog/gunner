export function computeExpectedMultiplier(chance: number): number {
  if (chance <= 0) return 0;
  const wrecking = Math.min(chance, 0.01) * 3;
  const normal = Math.max(0, chance - 0.01) * (0.99 + chance) / 2;
  return wrecking + normal;
}
