import type { SensorBoostLoadout, SensorBoostProjection } from "../../../sim";
import type { StoredSensorBoosterActivation } from "../../../appstate";
import type { Side } from "../side";

export interface SensorBoosterEls {
  readonly sections: Record<Side, HTMLElement>;
  readonly summaries: Record<Side, HTMLElement>;
}

export interface SensorBoosterController {
  setLoadout(side: Side, loadout: SensorBoostLoadout): void;
  restore(side: Side, loadout: SensorBoostLoadout | undefined, saved?: readonly StoredSensorBoosterActivation[]): void;
  projection(side: Side): SensorBoostProjection | undefined;
  capture(side: Side): readonly StoredSensorBoosterActivation[] | undefined;
  render(): void;
  updateSummaries(): void;
}
