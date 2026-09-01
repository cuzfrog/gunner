import type { StatConditions } from "../../../ships";
import type { PopupGroup } from "../popup";
import type { DroneController } from "../drone";
import type { Side } from "../side";

export interface PanelDroneLink {
  clear(): void;
  restore(fittingText: string | undefined, conditions: StatConditions): void;
}

export function createPanelDroneLink(side: Side, droneControllers: Record<Side, DroneController>, popupGroup: PopupGroup): PanelDroneLink {
  return new PanelDroneLinkImpl(droneControllers[side], popupGroup);
}

class PanelDroneLinkImpl implements PanelDroneLink {
  constructor(private readonly drone: DroneController, private readonly popupGroup: PopupGroup) {}

  clear(): void {
    this.popupGroup.close(this.drone.popup);
    this.drone.clear();
  }

  restore(fittingText: string | undefined, conditions: StatConditions): void {
    this.drone.restore(fittingText, conditions);
  }
}
