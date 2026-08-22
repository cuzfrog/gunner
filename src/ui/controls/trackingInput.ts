import type { TrackingUnit } from "../settings";

export class TrackingInput {
  private currentUnit: TrackingUnit = "rad";
  private radValue: number = 0.32;

  get rad(): number {
    return this.radValue;
  }

  get unit(): TrackingUnit {
    return this.currentUnit;
  }

  setRadValue(rad: number, sigResolution: number): number {
    this.radValue = rad;
    return this.displayValue(sigResolution);
  }

  setUnit(unit: TrackingUnit, sigResolution: number): number {
    if (this.currentUnit === unit) return this.displayValue(sigResolution);
    this.currentUnit = unit;
    return this.displayValue(sigResolution);
  }

  setDisplayValue(displayValue: number, sigResolution: number): number {
    this.radValue = this.currentUnit === "score" ? toTrackingRadPerSecond(displayValue, sigResolution) : displayValue;
    return this.displayValue(sigResolution);
  }

  displayValue(sigResolution: number): number {
    return this.currentUnit === "score" ? toTrackingScore(this.radValue, sigResolution) : this.radValue;
  }
}

const STANDARD_SIGNATURE_RESOLUTION = 40000; // mm-scale reference used by EVE's in-game score

function toTrackingScore(tracking: number, sigResolution: number): number {
  return (tracking * STANDARD_SIGNATURE_RESOLUTION) / sigResolution;
}

function toTrackingRadPerSecond(score: number, sigResolution: number): number {
  return (score * sigResolution) / STANDARD_SIGNATURE_RESOLUTION;
}
