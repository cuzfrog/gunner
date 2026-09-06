import type { SigResolutionClass } from "../sim";

export const STANDARD_SIGNATURE_RESOLUTION = 40_000;

export function sigResolutionClassFromChargeSize(chargeSize: number): SigResolutionClass {
  if (chargeSize >= 4) return "XL";
  if (chargeSize === 3) return "L";
  if (chargeSize === 2) return "M";
  return "S";
}

export function toTrackingScore(tracking: number, sigResolution: number): number {
  return (tracking * STANDARD_SIGNATURE_RESOLUTION) / sigResolution;
}

export function toTrackingRadPerSecond(score: number, sigResolution: number): number {
  return (score * sigResolution) / STANDARD_SIGNATURE_RESOLUTION;
}
