import type { BoostLoadout, TurretBoostProjection } from "../../../sim";
import type { StoredBoosterActivation } from "../../../appstate";
import type { Side } from "../side";

export interface BoosterEls {
  readonly sections: Record<Side, HTMLElement>;
  readonly summaries: Record<Side, HTMLElement>;
  readonly modulesFields: Record<Side, HTMLElement>;
}

export interface BoosterController {
  setLoadout(side: "shipA" | "shipB", loadout: BoostLoadout): void;
  restore(side: "shipA" | "shipB", loadout: BoostLoadout | undefined, saved?: readonly StoredBoosterActivation[]): void;
  projection(side: "shipA" | "shipB"): TurretBoostProjection | undefined;
  capture(side: "shipA" | "shipB"): readonly StoredBoosterActivation[] | undefined;
  render(): void;
  updateSummaries(): void;
}
