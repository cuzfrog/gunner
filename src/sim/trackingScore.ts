const STANDARD_SIGNATURE_RESOLUTION = 40000; // mm-scale reference used by EVE's in-game score

export type TrackingUnit = "rad" | "score";

export function toTrackingScore(tracking: number, sigResolution: number): number {
  return (tracking * STANDARD_SIGNATURE_RESOLUTION) / sigResolution;
}

export function toTrackingRadPerSecond(score: number, sigResolution: number): number {
  return (score * sigResolution) / STANDARD_SIGNATURE_RESOLUTION;
}
