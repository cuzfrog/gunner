/** Seconds to acquire a target lock: the EVE formula 40000 / (scanResolution * asinh(sigRadius)^2). */
export function lockTime(scanResolution: number, targetSigRadius: number): number {
  if (scanResolution <= 0) return Infinity;
  if (targetSigRadius <= 0) return Infinity;
  return 40000 / (scanResolution * Math.asinh(targetSigRadius) ** 2);
}
