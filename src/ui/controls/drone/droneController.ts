import type { FittingImport, ImportedDrone } from "../../../fitting";
import type { ImportedFitting } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { DroneSpec } from "../../../sim";
import type { StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { setText } from "../controlsDom";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import type { Popup } from "../popup";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem, createPopup, SummaryChipImpl } from "../shared";
import type { DroneController, DroneControllerDeps } from "./droneControllerContract";
import type { DroneEls } from "./droneControllerContract";

export type { DroneController } from "./droneControllerContract";

export class DroneControllerImpl implements DroneController {
  readonly side: Side;
  private readonly els: DroneEls;
  private readonly fittingImport: FittingImport;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly popupGroup: PopupGroup;
  private readonly popupValue: Popup;
  private readonly droneList: SelectableListImpl;
  private readonly droneChip: SummaryChipImpl;
  private importedDrones: readonly ImportedDrone[] = [];
  private selectedTypeId: TypeId | undefined;
  private selectedDrone: ImportedDrone | undefined;
  private popupOpen = false;

  constructor(deps: DroneControllerDeps) {
    this.side = deps.side;
    this.els = deps.els;
    this.fittingImport = deps.fittingImport;
    this.imageCatalog = deps.imageCatalog;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.popupGroup = deps.popupGroup;
    this.droneList = new SelectableListImpl({
      itemClass: "drone-item selectable-item",
      nameClass: "drone-item-name",
      iconClass: "drone-item-icon",
      role: "option",
      wrapInListItem: true,
    });
    this.droneChip = new SummaryChipImpl(this.els.summary, this.els.summaryIcon);
    this.popupValue = createPopup({
      popupEl: this.els.popup,
      triggerEl: this.els.trigger,
      fieldEl: this.els.field,
      onOpen: () => this.openPopup(),
      onClose: () => this.closePopup(),
      isOpen: () => this.popupOpen,
    });
    this.popupGroup.register(this.popupValue);
    this.els.trigger.addEventListener("click", () => this.popupGroup.toggle(this.popupValue));
    this.events.onLanguageChanged(() => this.render());
    this.render();
  }

  get popup(): Popup { return this.popupValue; }

  drone(): ImportedDrone | undefined {
    return this.selectedDrone;
  }

  currentDroneSpec(): DroneSpec | undefined {
    const drone = this.selectedDrone;
    if (!drone) return undefined;
    return importedDroneToDroneSpec(drone);
  }

  applyImported(imported: ImportedFitting, conditions: StatConditions): void {
    this.importedDrones = imported.drones;
    this.selectDefault();
    this.render();
  }

  restore(fitting?: string, conditions?: StatConditions, droneTypeId?: TypeId): void {
    if (fitting && conditions) {
      const imported = this.fittingImport.importFitting(fitting, conditions);
      if (imported && imported.drones.length > 0) {
        this.importedDrones = imported.drones;
        if (droneTypeId && this.importedDrones.some((d) => d.typeId === droneTypeId)) {
          this.selectedTypeId = droneTypeId;
          this.selectedDrone = this.importedDrones.find((d) => d.typeId === droneTypeId);
        } else {
          this.selectDefault();
        }
        this.render();
        return;
      }
    }
    this.importedDrones = [];
    this.selectedTypeId = undefined;
    this.selectedDrone = undefined;
    this.render();
  }

  clear(): void {
    this.popupGroup.close(this.popupValue);
    this.importedDrones = [];
    this.selectedTypeId = undefined;
    this.selectedDrone = undefined;
    this.render();
  }

  capture(): { droneTypeId: TypeId | undefined } {
    return { droneTypeId: this.selectedTypeId };
  }

  isPopupOpen(): boolean {
    return this.popupOpen;
  }

  openPopup(): void {
    this.popupOpen = true;
    this.els.trigger.setAttribute("aria-expanded", "true");
  }

  closePopup(): void {
    this.popupOpen = false;
    this.els.trigger.setAttribute("aria-expanded", "false");
  }

  render(): void {
    const drone = this.selectedDrone;
    const hasDrone = drone !== undefined;
    this.els.trigger.disabled = this.importedDrones.length === 0;
    if (!hasDrone) {
      this.droneChip.render("-", undefined);
      this.clearStatDisplay();
      this.renderDroneList();
      return;
    }
    this.droneChip.render(drone.name, this.imageCatalog.itemIconUrl(drone.typeId));
    const t = (key: string): string => this.i18n.t(key);
    setText(this.els.tracking, formatNumber(drone.tracking, 4));
    setText(this.els.optimal, formatDistance(drone.optimal, t));
    setText(this.els.falloff, formatDistance(drone.falloff, t));
    const damagePerShot = droneDamagePerShot(drone);
    setText(this.els.damage, formatWithCommas(damagePerShot, 1));
    setText(this.els.cycleTime, `${formatNumber(drone.cycleTime, 2)} s`);
    setText(this.els.count, String(drone.count));
    if (drone.sizeClass === "sentry") {
      setText(this.els.orbitSpeed, "-");
      setText(this.els.maxVelocity, "-");
    } else {
      setText(this.els.orbitSpeed, `${formatWithCommas(drone.orbitSpeed, 0)} m/s`);
      setText(this.els.maxVelocity, `${formatWithCommas(drone.maxVelocity, 0)} m/s`);
    }
    this.renderDroneList();
  }

  private selectDefault(): void {
    if (this.importedDrones.length === 0) {
      this.selectedTypeId = undefined;
      this.selectedDrone = undefined;
      return;
    }
    if (this.selectedTypeId && this.importedDrones.some((d) => d.typeId === this.selectedTypeId)) {
      this.selectedDrone = this.importedDrones.find((d) => d.typeId === this.selectedTypeId);
      return;
    }
    this.selectedTypeId = this.importedDrones[0].typeId;
    this.selectedDrone = this.importedDrones[0];
  }

  private renderDroneList(): void {
    const items: SelectableItem[] = this.importedDrones.map((drone) => ({
      value: drone.typeId,
      label: drone.name,
      iconUrl: this.imageCatalog.itemIconUrl(drone.typeId),
      selected: drone.typeId === this.selectedTypeId,
      quantity: String(drone.count),
    }));
    const buttons = this.droneList.render(this.els.list, items);
    for (let i = 0; i < this.importedDrones.length; i++) {
      const typeId = this.importedDrones[i].typeId;
      buttons[i].addEventListener("click", () => this.onDroneSelect(typeId));
    }
  }

  private onDroneSelect(typeId: TypeId): void {
    const drone = this.importedDrones.find((d) => d.typeId === typeId);
    if (!drone) return;
    this.selectedTypeId = typeId;
    this.selectedDrone = drone;
    this.popupGroup.close(this.popupValue);
    this.render();
    this.events.emitConfigInvalidated();
  }

  private clearStatDisplay(): void {
    const t = (key: string): string => this.i18n.t(key);
    setText(this.els.tracking, "-");
    setText(this.els.optimal, "-");
    setText(this.els.falloff, "-");
    setText(this.els.damage, "-");
    setText(this.els.cycleTime, "-");
    setText(this.els.count, "-");
    setText(this.els.orbitSpeed, "-");
    setText(this.els.maxVelocity, "-");
  }
}

function importedDroneToDroneSpec(drone: ImportedDrone): DroneSpec {
  return {
    kind: "drone",
    tracking: drone.tracking,
    sigResolution: drone.sigResolution,
    optimal: drone.optimal,
    falloff: drone.falloff,
    damagePerShot: droneDamagePerShot(drone),
    cycleTime: drone.cycleTime,
    droneCount: drone.count,
    maxVelocity: drone.maxVelocity,
    orbitSpeed: drone.orbitSpeed,
    isSentry: drone.sizeClass === "sentry",
  };
}

function droneDamagePerShot(drone: ImportedDrone): number {
  return (drone.emDamage + drone.thermalDamage + drone.kineticDamage + drone.explosiveDamage) * drone.damageMultiplier;
}
