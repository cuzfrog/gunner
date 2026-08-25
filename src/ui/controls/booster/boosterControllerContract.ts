import type { BoostLoadout, TurretBoostProjection } from "../../../sim";
import type { StoredBoosterActivation } from "../../../appstate";
import type { Side } from "../side";

export interface BoosterEls {
  readonly sections: Record<Side, HTMLElement>;
  readonly summaries: Record<Side, HTMLElement>;
}

export interface BoosterController {
  setLoadout(side: "attacker" | "target", loadout: BoostLoadout): void;
  restore(side: "attacker" | "target", loadout: BoostLoadout | undefined, saved?: readonly StoredBoosterActivation[]): void;
  projection(side: "attacker" | "target"): TurretBoostProjection | undefined;
  capture(side: "attacker" | "target"): readonly StoredBoosterActivation[] | undefined;
  render(): void;
  updateSummaries(): void;
}
