import type { Popup } from "../popup";
import type { EwarLoadout, EwarProjection } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";

export interface EwarEls {
  readonly attackerEwarTrigger: HTMLButtonElement;
  readonly attackerEwarPopup: HTMLElement;
  readonly attackerEwarSummary: HTMLElement;
  readonly targetEwarTrigger: HTMLButtonElement;
  readonly targetEwarPopup: HTMLElement;
  readonly targetEwarSummary: HTMLElement;
}

export interface EwarHost {
  onConfigChange(): void;
}

export interface EwarController {
  setHost(host: EwarHost): void;
  setLoadout(side: "attacker" | "target", loadout: EwarLoadout): void;
  restore(side: "attacker" | "target", loadout: EwarLoadout | undefined, saved?: StoredEwarActivation): void;
  projection(side: "attacker" | "target", overloaded: boolean): EwarProjection | undefined;
  capture(side: "attacker" | "target"): StoredEwarActivation | undefined;
  fittedCount(side: "attacker" | "target"): number;
  popup(side: "attacker" | "target"): Popup;
  render(): void;
}
