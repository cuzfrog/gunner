import type { DroneCatalog, FittingCalculator, FittingDb, FittingImport, ImportedDrone } from "../../../fitting";
import type { ImportedFitting } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { DroneSpec } from "../../../sim";
import type { ShipProfile, Ships, StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import type { Popup } from "../popup";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";

export interface DroneControllerDeps {
  readonly side: Side;
  readonly els: DroneEls;
  readonly fittingDb: FittingDb;
  readonly fittingImport: FittingImport;
  readonly droneCatalog: DroneCatalog;
  readonly ships: Ships;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly events: UiEvents;
  readonly popupGroup: PopupGroup;
  readonly fittingCalculator: FittingCalculator;
}

export interface DroneEls {
  readonly trigger: HTMLButtonElement;
  readonly summary: HTMLElement;
  readonly summaryIcon: HTMLImageElement;
  readonly popup: HTMLElement;
  readonly list: HTMLElement;
  readonly field: HTMLElement;
  readonly tracking: HTMLElement;
  readonly optimal: HTMLElement;
  readonly falloff: HTMLElement;
  readonly damage: HTMLElement;
  readonly cycleTime: HTMLElement;
  readonly orbitSpeed: HTMLElement;
  readonly maxVelocity: HTMLElement;
  readonly count: HTMLElement;
}

export interface DroneController {
  readonly side: Side;
  readonly popup: Popup;
  drone(): ImportedDrone | undefined;
  currentDroneSpec(): DroneSpec | undefined;
  applyImported(imported: ImportedFitting, conditions: StatConditions): void;
  restore(fitting?: string, conditions?: StatConditions, droneTypeId?: TypeId): void;
  setHullProfile(profile: ShipProfile | undefined): void;
  clear(): void;
  capture(): { droneTypeId: TypeId | undefined };
  isPopupOpen(): boolean;
  openPopup(): void;
  closePopup(): void;
  render(): void;
}
