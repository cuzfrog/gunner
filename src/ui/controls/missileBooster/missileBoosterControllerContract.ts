import type { MissileBoosterLoadout, MissileBoosterProjection } from "../../../sim";
import type { StoredMissileBoosterActivation } from "../../../appstate";
import type { Side } from "../side";

export interface MissileBoosterEls {
  readonly sections: Record<Side, HTMLElement>;
  readonly summaries: Record<Side, HTMLElement>;
  readonly modulesFields: Record<Side, HTMLElement>;
}

export interface MissileBoosterController {
  setLoadout(side: Side, loadout: MissileBoosterLoadout): void;
  restore(side: Side, loadout: MissileBoosterLoadout | undefined, saved?: readonly StoredMissileBoosterActivation[]): void;
  projection(side: Side): MissileBoosterProjection | undefined;
  capture(side: Side): readonly StoredMissileBoosterActivation[] | undefined;
  render(): void;
  updateSummaries(): void;
}
