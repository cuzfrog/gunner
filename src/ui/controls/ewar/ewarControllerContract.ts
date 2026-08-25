import type { EwarLoadout, EwarProjection } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";

export interface EwarEls {
  readonly shipAEwarField: HTMLElement;
  readonly shipAEwarTrigger: HTMLButtonElement;
  readonly shipAEwarPopup: HTMLElement;
  readonly shipAEwarSection: HTMLElement;
  readonly shipAEwarSummary: HTMLElement;
  readonly shipBEwarField: HTMLElement;
  readonly shipBEwarTrigger: HTMLButtonElement;
  readonly shipBEwarPopup: HTMLElement;
  readonly shipBEwarSection: HTMLElement;
  readonly shipBEwarSummary: HTMLElement;
}

export interface EwarController {
  setLoadout(side: "shipA" | "shipB", loadout: EwarLoadout): void;
  restore(side: "shipA" | "shipB", loadout: EwarLoadout | undefined, saved?: StoredEwarActivation): void;
  projection(side: "shipA" | "shipB"): EwarProjection | undefined;
  capture(side: "shipA" | "shipB"): StoredEwarActivation | undefined;
  render(): void;
  updateSummaries(): void;
}
