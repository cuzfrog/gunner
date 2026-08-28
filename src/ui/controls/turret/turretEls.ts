import type { createControlsEls } from "../elements";
import type { Side } from "../side";

type ControlsElements = ReturnType<typeof createControlsEls>;

export interface TurretEls {
  readonly tracking: HTMLInputElement;
  readonly sigRes: HTMLSelectElement;
  readonly sigResOptions: HTMLElement;
  readonly optimal: HTMLInputElement;
  readonly falloff: HTMLInputElement;
  readonly ammoField: HTMLElement;
  readonly ammoTrigger: HTMLButtonElement;
  readonly ammoSummary: HTMLElement;
  readonly ammoSummaryIcon: HTMLImageElement;
  readonly ammoPopup: HTMLElement;
  readonly ammoCargoLabel: HTMLElement;
  readonly ammoCargoList: HTMLElement;
  readonly ammoExpand: HTMLButtonElement;
  readonly ammoAllSection: HTMLElement;
  readonly ammoAllList: HTMLElement;
}

export function collectTurretEls(els: ControlsElements, side: Side): TurretEls {
  const combatant = els[side];
  return {
    tracking: combatant.tracking,
    sigRes: combatant.sigRes,
    sigResOptions: combatant.sigResOptions,
    optimal: combatant.optimal,
    falloff: combatant.falloff,
    ammoField: combatant.ammoField,
    ammoTrigger: combatant.ammoTrigger,
    ammoSummary: combatant.ammoSummary,
    ammoSummaryIcon: combatant.ammoSummaryIcon,
    ammoPopup: combatant.ammoPopup,
    ammoCargoLabel: combatant.ammoCargoLabel,
    ammoCargoList: combatant.ammoCargoList,
    ammoExpand: combatant.ammoExpand,
    ammoAllSection: combatant.ammoAllSection,
    ammoAllList: combatant.ammoAllList,
  };
}
