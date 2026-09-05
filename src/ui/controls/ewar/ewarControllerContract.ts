import type { EwarLoadout, EwarProjection } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";
import type { Sided } from "../side";

export interface EwarFieldEls {
  readonly field: HTMLElement;
  readonly section: HTMLElement;
  readonly summary: HTMLElement;
}

export type EwarEls = Sided<EwarFieldEls>;

export interface EwarController {
  setLoadout(side: "shipA" | "shipB", loadout: EwarLoadout): void;
  restore(side: "shipA" | "shipB", loadout: EwarLoadout | undefined, saved?: StoredEwarActivation): void;
  projection(side: "shipA" | "shipB"): EwarProjection | undefined;
  capture(side: "shipA" | "shipB"): StoredEwarActivation | undefined;
  render(): void;
  updateSummaries(): void;
}
