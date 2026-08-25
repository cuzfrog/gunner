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

export interface BoosterController {
  setLoadout(side: "attacker" | "target", loadout: BoostLoadout): void;
  restore(side: "attacker" | "target", loadout: BoostLoadout | undefined, saved?: readonly StoredBoosterActivation[]): void;
  projection(side: "attacker" | "target"): TurretBoostProjection | undefined;
  capture(side: "attacker" | "target"): readonly StoredBoosterActivation[] | undefined;
  render(): void;
  updateSummaries(): void;
}
