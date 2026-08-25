import type { ShipProfile } from "../../../ships";
import type { Side } from "../side";

export interface CombatantProfiles {
  profile(side: Side): ShipProfile | undefined;
}

export interface PortraitsEls {
  readonly attacker: HTMLElement;
  readonly target: HTMLElement;
  readonly attackerImage: HTMLImageElement;
  readonly targetImage: HTMLImageElement;
  readonly attackerEffects: HTMLElement;
  readonly targetEffects: HTMLElement;
}

export interface PortraitsController {
  update(): void;
}
