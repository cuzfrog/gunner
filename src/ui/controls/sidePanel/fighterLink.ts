import type { StatConditions } from "../../../ships";
import type { PopupGroup } from "../popup";
import type { FighterController } from "../fighter";
import type { Side } from "../side";

export interface PanelFighterLink {
  clear(): void;
  updateConditions(conditions: StatConditions): void;
}

export function createPanelFighterLink(side: Side, fighterControllers: Record<Side, FighterController>, popupGroup: PopupGroup): PanelFighterLink {
  return new PanelFighterLinkImpl(fighterControllers[side], popupGroup);
}

class PanelFighterLinkImpl implements PanelFighterLink {
  constructor(private readonly fighter: FighterController, private readonly popupGroup: PopupGroup) {}

  clear(): void {
    this.popupGroup.close(this.fighter.popup);
    this.fighter.clear();
  }

  updateConditions(conditions: StatConditions): void {
    this.fighter.updateConditions(conditions);
  }
}
