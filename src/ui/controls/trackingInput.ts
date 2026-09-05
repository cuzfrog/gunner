import { toTrackingRadPerSecond, toTrackingScore } from "../../fitting";
import type { TrackingUnit } from "../../appstate";

export interface TrackingInput {
  readonly rad: number;
  readonly unit: TrackingUnit;
  setRadValue(rad: number, sigResolution: number): number;
  setUnit(unit: TrackingUnit, sigResolution: number): number;
  setDisplayValue(displayValue: number, sigResolution: number): number;
  displayValue(sigResolution: number): number;
  displayFor(rad: number, sigResolution: number): number;
}

export class TrackingInputImpl implements TrackingInput {
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

  displayFor(rad: number, sigResolution: number): number {
    return this.currentUnit === "score" ? toTrackingScore(rad, sigResolution) : rad;
  }
}
