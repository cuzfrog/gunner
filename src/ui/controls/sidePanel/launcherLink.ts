import type { ShipProfile, StatConditions } from "../../../ships";
import type { PopupGroup } from "../popup";
import type { LauncherController } from "../launcher";
import type { Side } from "../side";

export interface PanelLauncherLink {
  clear(): void;
  restore(fittingText: string | undefined, conditions: StatConditions): void;
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

  restore(fittingText: string | undefined, conditions: StatConditions): void {
    this.launcher.restore(fittingText, conditions);
  }

  setHullProfile(_profile: ShipProfile | undefined): void {
    // Launcher stats do not depend on hull bonuses directly; hull bonuses are
    // applied inside LauncherController via fittingDb. This seam exists for
    // future hull-bonus-driven launcher stats.
  }
}
