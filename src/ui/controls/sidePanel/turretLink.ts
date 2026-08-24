import type { ShipProfile, StatConditions } from "../../../ships";
import type { PopupGroup } from "./popup";
import type { TurretController } from "../turret";
import type { Side } from "./side";

export interface PanelTurretLink {
  clear(): void;
  restore(fittingText: string | undefined, conditions: StatConditions): void;
  setHullProfile(profile: ShipProfile | undefined): void;
}

export function createPanelTurretLink(side: Side, turret: TurretController, popupGroup: PopupGroup): PanelTurretLink {
  if (side === "attacker") return new AttackerPanelTurretLink(turret, popupGroup);
  return new NoopPanelTurretLink();
}

class AttackerPanelTurretLink implements PanelTurretLink {
  constructor(private readonly turret: TurretController, private readonly popupGroup: PopupGroup) {}

  clear(): void {
    this.popupGroup.close(this.turret.popup);
    this.turret.clear();
  }

  restore(fittingText: string | undefined, conditions: StatConditions): void {
    this.turret.restore(fittingText, conditions);
  }

  setHullProfile(profile: ShipProfile | undefined): void {
    this.turret.setHullProfile(profile);
  }
}

class NoopPanelTurretLink implements PanelTurretLink {
  clear(): void {}
  restore(_fittingText: string | undefined, _conditions: StatConditions): void {}
  setHullProfile(_profile: ShipProfile | undefined): void {}
}
