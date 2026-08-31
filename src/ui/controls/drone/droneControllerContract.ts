import type { DroneCatalog, DroneGroup, DroneLoadoutResolver, DroneLoadoutValidation, DroneLoadoutValidator, FittingImport, ImportedDrone, ImportedFitting } from "../../../fitting";
import type { DroneSpec } from "../../../sim";
import type { StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";

export interface DroneControllerDeps {
  readonly side: Side;
  readonly els: DroneEls;
  readonly fittingImport: FittingImport;
  readonly droneCatalog: DroneCatalog;
  readonly droneLoadoutResolver: DroneLoadoutResolver;
  readonly droneLoadoutValidator: DroneLoadoutValidator;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly events: UiEvents;
  readonly popupGroup: PopupGroup;
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
  currentDroneSpecs(): readonly DroneSpec[];
  validation(): DroneLoadoutValidation | undefined;
  applyImported(imported: ImportedFitting, conditions: StatConditions): void;
  restore(fitting?: string, conditions?: StatConditions, droneGroups?: readonly DroneGroup[]): void;
  clear(): void;
  capture(): { droneGroups: readonly DroneGroup[] };
  isPopupOpen(): boolean;
  openPopup(): void;
  closePopup(): void;
  render(): void;
}
