import type { EwarLoadout, EwarProjection } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";

export interface EwarEls {
  readonly attackerEwarField: HTMLElement;
  readonly attackerEwarTrigger: HTMLButtonElement;
  readonly attackerEwarPopup: HTMLElement;
  readonly attackerEwarSummary: HTMLElement;
  readonly targetEwarField: HTMLElement;
  readonly targetEwarTrigger: HTMLButtonElement;
  readonly targetEwarPopup: HTMLElement;
  readonly targetEwarSummary: HTMLElement;
}

export interface EwarController {
  setLoadout(side: "attacker" | "target", loadout: EwarLoadout): void;
  restore(side: "attacker" | "target", loadout: EwarLoadout | undefined, saved?: StoredEwarActivation): void;
  projection(side: "attacker" | "target"): EwarProjection | undefined;
  capture(side: "attacker" | "target"): StoredEwarActivation | undefined;
  render(): void;
  updateSummaries(): void;
}
