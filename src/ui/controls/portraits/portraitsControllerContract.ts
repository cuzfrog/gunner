import type { ShipProfile } from "../../../ships";
import type { Side } from "../side";

export interface CombatantProfiles {
  profile(side: Side): ShipProfile | undefined;
}

export interface PortraitsEls {
  readonly shipA: HTMLElement;
  readonly shipB: HTMLElement;
  readonly shipAImage: HTMLImageElement;
  readonly shipBImage: HTMLImageElement;
  readonly shipAEffects: HTMLElement;
  readonly shipBEffects: HTMLElement;
  readonly shipAHpBars: HTMLElement;
  readonly shipBHpBars: HTMLElement;
}

export interface PortraitsController {
  update(): void;
}
