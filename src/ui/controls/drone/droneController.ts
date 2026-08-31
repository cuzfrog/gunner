import type { DroneCatalog, DroneGroup, DroneLoadoutContext, DroneLoadoutResolver, DroneLoadoutValidation, DroneLoadoutValidator, FittingImport, ImportedDrone, ImportedFitting } from "../../../fitting";
import type { DroneSpec } from "../../../sim";
import type { StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { setText } from "../controlsDom";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem, createPopup, SummaryChipImpl } from "../shared";
import type { DroneController, DroneControllerDeps, DroneEls } from "./droneControllerContract";

export type { DroneController } from "./droneControllerContract";

export class DroneControllerImpl implements DroneController {
  readonly side: Side;
  private readonly els: DroneEls;
  private readonly fittingImport: FittingImport;
  private readonly droneCatalog: DroneCatalog;
  private readonly resolver: DroneLoadoutResolver;
  private readonly validator: DroneLoadoutValidator;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly popupGroup: PopupGroup;
  private readonly popupValue: Popup;
  private readonly droneList: SelectableListImpl;
  private readonly droneChip: SummaryChipImpl;
  private droneGroups: DroneGroup[] = [];
  private resolvedDrones: readonly ImportedDrone[] = [];
  private loadoutContext: DroneLoadoutContext | undefined;
  private conditions: StatConditions | undefined;
  private validationValue: DroneLoadoutValidation | undefined;
  private popupOpen = false;

  constructor(deps: DroneControllerDeps) {
    this.side = deps.side;
    this.els = deps.els;
    this.fittingImport = deps.fittingImport;
    this.droneCatalog = deps.droneCatalog;
    this.resolver = deps.droneLoadoutResolver;
    this.validator = deps.droneLoadoutValidator;
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
    return this.resolvedDrones[0];
  }

  currentDroneSpecs(): readonly DroneSpec[] {
    return this.resolvedDrones.map((d) => importedDroneToDroneSpec(d));
  }

  validation(): DroneLoadoutValidation | undefined {
    return this.validationValue;
  }

  applyImported(imported: ImportedFitting, conditions: StatConditions): void {
    this.loadoutContext = loadoutContextFromFitting(imported);
    this.conditions = conditions;
    this.droneGroups = imported.drones.map((d) => ({ typeId: d.typeId, count: d.count }));
    this.recompute();
    this.render();
  }

  restore(fitting?: string, conditions?: StatConditions, droneGroups?: readonly DroneGroup[]): void {
    if (fitting && conditions) {
      const imported = this.fittingImport.importFitting(fitting, conditions);
      if (imported && imported.drones.length > 0) {
        this.loadoutContext = loadoutContextFromFitting(imported);
        this.conditions = conditions;
        const known = droneGroups && droneGroups.length > 0 ? filterKnownGroups(droneGroups, this.droneCatalog) : [];
        this.droneGroups = known.length > 0 ? known : imported.drones.map((d) => ({ typeId: d.typeId, count: d.count }));
        this.recompute();
        this.render();
        return;
      }
    }
    this.clear();
  }

  clear(): void {
    this.popupGroup.close(this.popupValue);
    this.droneGroups = [];
    this.resolvedDrones = [];
    this.loadoutContext = undefined;
    this.conditions = undefined;
    this.validationValue = undefined;
    this.render();
  }

  capture(): { droneGroups: readonly DroneGroup[] } {
    return { droneGroups: [...this.droneGroups] };
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
    const drone = this.resolvedDrones[0];
    const hasDrone = drone !== undefined;
    this.els.trigger.disabled = this.droneGroups.length === 0;
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
    setText(this.els.count, String(this.totalCount()));
    if (drone.sizeClass === "sentry") {
      setText(this.els.orbitSpeed, "-");
      setText(this.els.maxVelocity, "-");
    } else {
      setText(this.els.orbitSpeed, `${formatWithCommas(drone.orbitSpeed, 0)} m/s`);
      setText(this.els.maxVelocity, `${formatWithCommas(drone.maxVelocity, 0)} m/s`);
    }
    this.renderDroneList();
  }

  private totalCount(): number {
    return this.droneGroups.reduce((sum, g) => sum + g.count, 0);
  }

  private recompute(): void {
    if (!this.loadoutContext || !this.conditions) {
      this.resolvedDrones = [];
      this.validationValue = undefined;
      return;
    }
    this.validationValue = this.validator.validate(this.droneGroups, this.loadoutContext.profile);
    this.resolvedDrones = this.resolver.resolve(this.droneGroups, this.loadoutContext, this.conditions);
  }

  private renderDroneList(): void {
    const items: SelectableItem[] = this.resolvedDrones.map((drone) => ({
      value: drone.typeId,
      label: drone.name,
      iconUrl: this.imageCatalog.itemIconUrl(drone.typeId),
      selected: false,
      quantity: String(drone.count),
    }));
    const buttons = this.droneList.render(this.els.list, items);
    for (const button of buttons) {
      button.addEventListener("click", () => this.popupGroup.close(this.popupValue));
    }
  }

  private clearStatDisplay(): void {
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

function loadoutContextFromFitting(imported: ImportedFitting): DroneLoadoutContext {
  const state = imported.fittingState;
  return {
    profile: state.profile,
    hullBonuses: state.hullBonuses,
    droneBoosterModules: state.droneBoosterModules,
  };
}

function filterKnownGroups(groups: readonly DroneGroup[], catalog: DroneCatalog): DroneGroup[] {
  const result: DroneGroup[] = [];
  for (const group of groups) {
    if (catalog.has(group.typeId) && group.count > 0) result.push({ typeId: group.typeId, count: group.count });
  }
  return result;
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
