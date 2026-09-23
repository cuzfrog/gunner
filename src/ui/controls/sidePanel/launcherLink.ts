import type { ShipProfile, StatConditions } from "../../../ships";
import type { PopupGroup } from "../popup";
import type { LauncherController } from "../launcher";
import type { Side } from "../side";

export interface PanelLauncherLink {
  clear(): void;
  updateConditions(conditions: StatConditions): void;
  setHullProfile(profile: ShipProfile | undefined): void;
}

export function createPanelLauncherLink(side: Side, launcherControllers: Record<Side, LauncherController>, popupGroup: PopupGroup): PanelLauncherLink {
  return new PanelLauncherLinkImpl(launcherControllers[side], popupGroup);
}

class PanelLauncherLinkImpl implements PanelLauncherLink {
  constructor(private readonly launcher: LauncherController, private readonly popupGroup: PopupGroup) {}

  clear(): void {
    this.popupGroup.close(this.launcher.popup);
    this.launcher.clear();
  }

  updateConditions(conditions: StatConditions): void {
    this.launcher.updateConditions(conditions);
  }

  setHullProfile(profile: ShipProfile | undefined): void {
    this.launcher.setHullProfile(profile);
  }
}
