import type { Popup } from "../popup";
import type { BoostLoadout, TurretBoostProjection } from "../../../sim";
import type { StoredBoosterActivation } from "../../../appstate";

export interface BoosterEls {
  readonly attackerBoosterField: HTMLElement;
  readonly attackerBoosterTrigger: HTMLButtonElement;
  readonly attackerBoosterPopup: HTMLElement;
  readonly attackerBoosterSummary: HTMLElement;
  readonly targetBoosterField: HTMLElement;
  readonly targetBoosterTrigger: HTMLButtonElement;
  readonly targetBoosterPopup: HTMLElement;
  readonly targetBoosterSummary: HTMLElement;
}

export interface BoosterHost {
  onConfigChange(): void;
}

export interface BoosterController {
  setHost(host: BoosterHost): void;
  setLoadout(side: "attacker" | "target", loadout: BoostLoadout): void;
  restore(side: "attacker" | "target", loadout: BoostLoadout | undefined, saved?: readonly StoredBoosterActivation[]): void;
  projection(side: "attacker" | "target"): TurretBoostProjection | undefined;
  capture(side: "attacker" | "target"): readonly StoredBoosterActivation[] | undefined;
  popup(side: "attacker" | "target"): Popup;
  render(): void;
  updateSummaries(): void;
}
