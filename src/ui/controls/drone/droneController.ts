import type { DroneCatalog, DroneGroup, DroneLoadoutContext, DroneLoadoutResolver, DroneLoadoutValidation, DroneLoadoutValidator, FittingImport, ImportedDrone, ImportedFitting } from "../../../fitting";
import type { DroneSizeClass } from "../../../gamedata/fittingDb";
import type { TypeId } from "../../../gamedata/ids";
import type { DamageVector, DroneSpec } from "../../../sim";
import { damageVectorScale, damageVectorSum } from "../../../sim";
import type { StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { setText } from "../controlsDom";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import { html } from "../markup";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem, createPopup, SummaryChipImpl } from "../shared";
import type { DroneController, DroneControllerDeps, DroneEls } from "./droneControllerContract";

export type { DroneController } from "./droneControllerContract";

const SIZE_CLASSES: readonly DroneSizeClass[] = ["light", "medium", "heavy", "sentry"];

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
  private readonly catalogLists: Readonly<Record<DroneSizeClass, SelectableListImpl>>;
  private readonly catalogEls: Readonly<Record<DroneSizeClass, HTMLElement>>;
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
    this.catalogLists = {
      light: new SelectableListImpl({ itemClass: "drone-catalog-item selectable-item", nameClass: "drone-catalog-name", iconClass: "drone-catalog-icon", role: "option", wrapInListItem: true }),
      medium: new SelectableListImpl({ itemClass: "drone-catalog-item selectable-item", nameClass: "drone-catalog-name", iconClass: "drone-catalog-icon", role: "option", wrapInListItem: true }),
      heavy: new SelectableListImpl({ itemClass: "drone-catalog-item selectable-item", nameClass: "drone-catalog-name", iconClass: "drone-catalog-icon", role: "option", wrapInListItem: true }),
      sentry: new SelectableListImpl({ itemClass: "drone-catalog-item selectable-item", nameClass: "drone-catalog-name", iconClass: "drone-catalog-icon", role: "option", wrapInListItem: true }),
    };
    this.catalogEls = {
      light: this.els.catalogLight,
      medium: this.els.catalogMedium,
      heavy: this.els.catalogHeavy,
      sentry: this.els.catalogSentry,
    };
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
      if (imported) {
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
    this.renderTelemetry();
    this.renderLoadout();
    this.renderSummary();
    this.renderCatalog();
  }

  private renderTelemetry(): void {
    const drone = this.resolvedDrones[0];
    this.els.trigger.disabled = this.loadoutContext === undefined;
    if (!drone) {
      this.droneChip.render("-", undefined);
      this.clearStatDisplay();
      return;
    }
    this.droneChip.render(drone.name, this.imageCatalog.itemIconUrl(drone.typeId));
    const t = (key: string): string => this.i18n.t(key);
    setText(this.els.tracking, formatNumber(drone.tracking, 4));
    setText(this.els.optimal, formatDistance(drone.optimal, t));
    setText(this.els.falloff, formatDistance(drone.falloff, t));
    setText(this.els.damage, formatWithCommas(damageVectorSum(droneDamagePerShot(drone)), 1));
    setText(this.els.cycleTime, `${formatNumber(drone.cycleTime, 2)} s`);
    setText(this.els.count, String(this.totalCount()));
    if (drone.sizeClass === "sentry") {
      setText(this.els.orbitSpeed, "-");
      setText(this.els.maxVelocity, "-");
    } else {
      setText(this.els.orbitSpeed, `${formatWithCommas(drone.orbitSpeed, 0)} m/s`);
      setText(this.els.maxVelocity, `${formatWithCommas(drone.maxVelocity, 0)} m/s`);
    }
  }

  private renderLoadout(): void {
    this.els.loadoutList.innerHTML = "";
    for (const group of this.droneGroups) {
      const row = this.createLoadoutRow(group);
      this.els.loadoutList.appendChild(row);
    }
  }

  private createLoadoutRow(group: DroneGroup): Element {
    const drone = this.resolvedDrones.find((d) => d.typeId === group.typeId);
    const name = drone?.name ?? this.fittingImport.itemNameForId(group.typeId, this.i18n.current()) ?? String(group.typeId);
    const iconUrl = this.imageCatalog.itemIconUrl(group.typeId);
    const decrementBtn = html`<button type="button" class="btn drone-stepper-btn drone-stepper-minus" aria-label="Decrease count">-</button>` as HTMLElement;
    const incrementBtn = html`<button type="button" class="btn drone-stepper-btn drone-stepper-plus" aria-label="Increase count">+</button>` as HTMLElement;
    const removeBtn = html`<button type="button" class="btn drone-remove-btn" aria-label="Remove drone">x</button>` as HTMLElement;
    decrementBtn.addEventListener("click", () => this.decrementCount(group.typeId));
    incrementBtn.addEventListener("click", () => this.incrementCount(group.typeId));
    removeBtn.addEventListener("click", () => this.removeDrone(group.typeId));
    return html`<div class="drone-loadout-row" data-drone-id=${group.typeId}>
      <img class="drone-loadout-icon" alt="" src=${iconUrl ?? ""} hidden=${iconUrl === undefined ? "" : false}>
      <span class="drone-loadout-name truncate">${name}</span>
      <div class="drone-stepper">${decrementBtn}<span class="drone-stepper-count mono">${group.count}</span>${incrementBtn}</div>
      ${removeBtn}
    </div>` as Element;
  }

  private renderSummary(): void {
    const v = this.validationValue;
    const profile = this.loadoutContext?.profile;
    if (!v || !profile) {
      setText(this.els.summaryCount, "0/0");
      setText(this.els.summaryBandwidth, "0/0");
      setText(this.els.summaryBay, "0/0");
      this.els.summaryBar.classList.remove("is-invalid");
      return;
    }
    setText(this.els.summaryCount, `${v.totalCount}/${profile.maxActiveDrones}`);
    setText(this.els.summaryBandwidth, `${v.totalBandwidth}/${profile.droneBandwidth}`);
    setText(this.els.summaryBay, `${v.totalVolume}/${profile.droneCapacity}`);
    this.els.summaryBar.classList.toggle("is-invalid", !v.valid);
  }

  private renderCatalog(): void {
    for (const sizeClass of SIZE_CLASSES) {
      const options = this.droneCatalog.dronesByClass(sizeClass);
      const items: SelectableItem[] = options.map((opt) => ({
        value: opt.id,
        label: opt.name,
        iconUrl: this.imageCatalog.itemIconUrl(opt.id),
        selected: false,
      }));
      const buttons = this.catalogLists[sizeClass].render(this.catalogEls[sizeClass], items);
      for (const button of buttons) {
        const typeId = button.dataset.value as TypeId;
        button.addEventListener("click", () => this.addDrone(typeId));
      }
    }
  }

  private addDrone(typeId: TypeId): void {
    const existing = this.droneGroups.find((g) => g.typeId === typeId);
    if (existing) {
      this.droneGroups = this.droneGroups.map((g) => g.typeId === typeId ? { typeId, count: g.count + 1 } : g);
    } else {
      this.droneGroups = [...this.droneGroups, { typeId, count: 1 }];
    }
    this.recompute();
    this.render();
    this.events.emitConfigInvalidated();
  }

  private incrementCount(typeId: TypeId): void {
    this.droneGroups = this.droneGroups.map((g) => g.typeId === typeId ? { typeId, count: g.count + 1 } : g);
    this.recompute();
    this.render();
    this.events.emitConfigInvalidated();
  }

  private decrementCount(typeId: TypeId): void {
    const existing = this.droneGroups.find((g) => g.typeId === typeId);
    if (!existing) return;
    if (existing.count <= 1) {
      this.removeDrone(typeId);
      return;
    }
    this.droneGroups = this.droneGroups.map((g) => g.typeId === typeId ? { typeId, count: g.count - 1 } : g);
    this.recompute();
    this.render();
    this.events.emitConfigInvalidated();
  }

  private removeDrone(typeId: TypeId): void {
    this.droneGroups = this.droneGroups.filter((g) => g.typeId !== typeId);
    this.recompute();
    this.render();
    this.events.emitConfigInvalidated();
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
    orbitRange: drone.orbitRange,
    isSentry: drone.sizeClass === "sentry",
    controlRange: drone.controlRange,
  };
}

function droneDamagePerShot(drone: ImportedDrone): DamageVector {
  return damageVectorScale({ em: drone.emDamage, thermal: drone.thermalDamage, kinetic: drone.kineticDamage, explosive: drone.explosiveDamage }, drone.damageMultiplier);
}
