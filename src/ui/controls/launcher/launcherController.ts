import type { FittingDb, FittingImport, LauncherCatalog, LauncherClass, LauncherClasses, MissileCatalog, MissileOption } from "../../../fitting";
import type { ImportedFitting, ImportedLauncher } from "../../../fitting";
import type { HullBonus } from "../../../gamedata/fittingDb";
import type { TypeId } from "../../../gamedata/ids";
import type { MissileSpec } from "../../../sim";
import type { ShipProfile, Ships, SkillLevel, StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { setText } from "../controlsDom";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import type { Popup } from "../popup";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem } from "../shared";
import type { LauncherController, LauncherControllerDeps } from "./launcherControllerContract";
import type { LauncherEls } from "./launcherControllerContract";

export type { LauncherController } from "./launcherControllerContract";

export class LauncherControllerImpl implements LauncherController {
  readonly side: Side;
  private readonly els: LauncherEls;
  private readonly fittingDb: FittingDb;
  private readonly fittingImport: FittingImport;
  private readonly missileCatalog: MissileCatalog;
  private readonly launcherCatalog: LauncherCatalog;
  private readonly launcherClasses: LauncherClasses;
  private readonly ships: Ships;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly popupGroup: PopupGroup;
  private readonly ammoPopupValue: Popup;
  private readonly attributesPopupValue: Popup;
  private selectedLauncher?: ImportedLauncher;
  private currentAmmoId: TypeId | undefined;
  private hullProfile: ShipProfile | undefined;
  private hullBonuses: readonly HullBonus[] = [];
  private skillLevel: SkillLevel = 5;
  private ammoPopupOpen = false;
  private attributesPopupOpen = false;
  private readonly ammoList: SelectableListImpl;

  constructor(deps: LauncherControllerDeps) {
    this.side = deps.side;
    this.els = deps.els;
    this.fittingDb = deps.fittingDb;
    this.fittingImport = deps.fittingImport;
    this.missileCatalog = deps.missileCatalog;
    this.launcherCatalog = deps.launcherCatalog;
    this.launcherClasses = deps.launcherClasses;
    this.ships = deps.ships;
    this.imageCatalog = deps.imageCatalog;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.popupGroup = deps.popupGroup;
    this.ammoList = new SelectableListImpl({
      itemClass: "launcher-ammo-item",
      nameClass: "launcher-ammo-name",
      iconClass: "launcher-ammo-icon",
      role: "option",
      wrapInListItem: true,
    });
    this.currentAmmoId = undefined;
    this.ammoPopupValue = this.createAmmoPopup();
    this.attributesPopupValue = this.createAttributesPopup();
    this.popupGroup.register(this.ammoPopupValue);
    this.popupGroup.register(this.attributesPopupValue);
    this.els.ammoTrigger.addEventListener("click", () => this.popupGroup.toggle(this.ammoPopupValue));
    this.els.attributesTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attributesPopupValue));
    this.events.onLanguageChanged(() => this.render());
    this.render();
  }

  get popup(): Popup { return this.ammoPopupValue; }

  launcher(): ImportedLauncher | undefined {
    return this.selectedLauncher;
  }

  ammoId(): TypeId | undefined {
    return this.currentAmmoId;
  }

  currentMissileSpec(): MissileSpec | undefined {
    const launcher = this.selectedLauncher;
    if (!launcher) return undefined;
    return importedLauncherToMissileSpec(launcher);
  }

  applyImported(imported: ImportedFitting, conditions: StatConditions): void {
    this.skillLevel = conditions.skillLevel;
    this.hullBonuses = this.fittingDb.hullBonuses[imported.profile.id] ?? [];
    this.selectedLauncher = imported.launcher;
    this.currentAmmoId = imported.launcher?.chargeId;
    this.render();
  }

  restore(fitting?: string, conditions?: StatConditions, ammoId?: TypeId): void {
    if (conditions) this.skillLevel = conditions.skillLevel;
    if (fitting && conditions) {
      const imported = this.resolveFitting(fitting, conditions);
      if (imported?.launcher) {
        this.hullBonuses = this.fittingDb.hullBonuses[imported.profile.id] ?? [];
        this.selectedLauncher = imported.launcher;
        this.currentAmmoId = imported.launcher.chargeId;
        if (ammoId && this.missileCatalog.has(ammoId)) {
          this.selectedLauncher = this.missileCatalog.withCharge(this.selectedLauncher, ammoId, this.hullBonuses, this.skillLevel);
          this.currentAmmoId = ammoId;
        }
      } else {
        this.selectedLauncher = undefined;
        this.currentAmmoId = undefined;
      }
    } else {
      this.selectedLauncher = undefined;
      this.currentAmmoId = undefined;
    }
    this.render();
  }

  setHullProfile(profile: ShipProfile | undefined): void {
    this.hullProfile = profile;
    this.renderClassSelector();
  }

  clear(): void {
    this.popupGroup.close(this.ammoPopupValue);
    this.popupGroup.close(this.attributesPopupValue);
    this.selectedLauncher = undefined;
    this.currentAmmoId = undefined;
    this.render();
  }

  capture(): { ammo: TypeId | undefined } {
    return { ammo: this.currentAmmoId };
  }

  isAmmoPopupOpen(): boolean {
    return this.ammoPopupOpen;
  }

  openAmmoPopup(): void {
    this.ammoPopupOpen = true;
    this.els.ammoTrigger.setAttribute("aria-expanded", "true");
  }

  closeAmmoPopup(): void {
    this.ammoPopupOpen = false;
    this.els.ammoTrigger.setAttribute("aria-expanded", "false");
  }

  render(): void {
    const launcher = this.selectedLauncher;
    const hasLauncher = launcher !== undefined;
    this.els.attributesTrigger.disabled = !hasLauncher;
    this.els.ammoTrigger.disabled = !hasLauncher;
    if (!hasLauncher) {
      this.els.attributesIcon.hidden = true;
      this.els.ammoSummaryIcon.hidden = true;
      this.renderClassSelector();
      this.renderAttributesSummary(undefined);
      setText(this.els.ammoSummary, "-");
      return;
    }
    this.renderIcon(this.els.attributesIcon, launcher.moduleId);
    this.renderIcon(this.els.ammoSummaryIcon, launcher.chargeId);
    const t = (key: string): string => this.i18n.t(key);
    setText(this.els.ammoSummary, launcher.chargeName);
    setText(this.els.volleyDamage, formatWithCommas(launcher.damagePerMissile * launcher.count, 1));
    setText(this.els.rateOfFire, `${formatNumber(launcher.cycleTime, 2)} s`);
    setText(this.els.explosionRadius, formatDistance(launcher.explosionRadius, t));
    setText(this.els.explosionVelocity, `${formatWithCommas(launcher.explosionVelocity, 0)} m/s`);
    setText(this.els.missileVelocity, `${formatWithCommas(launcher.maxVelocity, 0)} m/s`);
    setText(this.els.flightTime, `${formatNumber(launcher.flightTime, 1)} s`);
    setText(this.els.flightRange, formatDistance(launcher.maxVelocity * launcher.flightTime, t));
    setText(this.els.damageReductionFactor, formatNumber(launcher.damageReductionFactor, 2));
    this.renderAttributesSummary(launcher);
    this.renderAmmoList(launcher);
    this.renderClassSelector();
  }

  private renderAttributesSummary(launcher: ImportedLauncher | undefined): void {
    if (!launcher) {
      setText(this.els.attributesSummary, "-");
      return;
    }
    const t = (key: string): string => this.i18n.t(key);
    const range = formatDistance(launcher.maxVelocity * launcher.flightTime, t);
    const speed = `${formatWithCommas(launcher.maxVelocity, 0)} m/s`;
    const flight = `${formatNumber(launcher.flightTime, 1)}s`;
    setText(this.els.attributesSummary, `${range} / ${speed} / ${flight}`);
  }

  private renderIcon(icon: HTMLImageElement, typeId: TypeId): void {
    const url = this.imageCatalog.itemIconUrl(typeId);
    icon.src = url ?? "";
    icon.hidden = !url;
  }

  private renderClassSelector(): void {
    const launcher = this.selectedLauncher;
    const tier = this.hullProfile ? this.ships.shipTier(this.hullProfile) : undefined;
    const allowed = tier ? this.launcherClasses.classesForTiers([tier]) : this.launcherClasses.allClasses();
    const currentClass = launcher ? this.launcherClasses.classOf(launcher.moduleId) : undefined;
    this.els.classOptions.innerHTML = "";
    for (const cls of allowed) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn launcher-class-option";
      btn.dataset.value = cls;
      btn.setAttribute("aria-pressed", String(cls === currentClass));
      btn.textContent = launcherClassLabel(cls);
      if (!launcher) btn.disabled = true;
      btn.addEventListener("click", () => this.onClassSelect(cls));
      this.els.classOptions.appendChild(btn);
    }
  }

  private onClassSelect(target: LauncherClass): void {
    const launcher = this.selectedLauncher;
    if (!launcher) return;
    const currentClass = this.launcherClasses.classOf(launcher.moduleId);
    if (currentClass === target) return;
    const next = this.launcherCatalog.switchClass(launcher, target, this.hullBonuses, this.skillLevel);
    if (!next) return;
    this.selectedLauncher = next;
    this.currentAmmoId = next.chargeId;
    this.render();
    this.events.emitConfigInvalidated();
  }

  private renderAmmoList(launcher: ImportedLauncher): void {
    const options = this.missileOptionsForLauncher(launcher);
    const items: SelectableItem[] = options.map((option) => ({
      value: option.id,
      label: option.name,
      iconUrl: this.imageCatalog.itemIconUrl(option.id),
      selected: option.id === this.currentAmmoId,
    }));
    const buttons = this.ammoList.render(this.els.ammoList, items);
    for (let i = 0; i < options.length; i++) {
      const id = options[i].id;
      buttons[i].addEventListener("click", () => this.onAmmoSelect(id));
    }
  }

  private onAmmoSelect(missileId: TypeId): void {
    if (!this.selectedLauncher) return;
    this.selectedLauncher = this.missileCatalog.withCharge(this.selectedLauncher, missileId, this.hullBonuses, this.skillLevel);
    this.currentAmmoId = missileId;
    this.popupGroup.close(this.ammoPopupValue);
    this.render();
    this.events.emitConfigInvalidated();
  }

  private missileOptionsForLauncher(launcher: ImportedLauncher): readonly MissileOption[] {
    const stats = this.fittingDb.launchers[launcher.moduleId];
    if (!stats) return [];
    return this.missileCatalog.missilesForLauncher(stats);
  }

  private resolveFitting(fitting: string, conditions: StatConditions): ImportedFitting | undefined {
    return this.fittingImport.importFitting(fitting, conditions);
  }

  private createAmmoPopup(): Popup {
    const popup: Popup = {
      open: () => { this.els.ammoPopup.hidden = false; this.openAmmoPopup(); },
      close: () => { this.els.ammoPopup.hidden = true; this.closeAmmoPopup(); },
      isOpen: () => this.ammoPopupOpen,
      focusTrigger: () => this.els.ammoTrigger.focus(),
      contains: (domTarget: EventTarget) => domTarget instanceof Element && this.els.ammoField.contains(domTarget),
    };
    return popup;
  }

  private createAttributesPopup(): Popup {
    const popup: Popup = {
      open: () => { this.els.attributesPopup.hidden = false; this.attributesPopupOpen = true; this.els.attributesTrigger.setAttribute("aria-expanded", "true"); },
      close: () => { this.els.attributesPopup.hidden = true; this.attributesPopupOpen = false; this.els.attributesTrigger.setAttribute("aria-expanded", "false"); },
      isOpen: () => this.attributesPopupOpen,
      focusTrigger: () => this.els.attributesTrigger.focus(),
      contains: (domTarget: EventTarget) => domTarget instanceof Element && this.els.attributesField.contains(domTarget),
    };
    return popup;
  }
}

function importedLauncherToMissileSpec(launcher: ImportedLauncher): MissileSpec {
  return {
    kind: "missile",
    damagePerMissile: launcher.damagePerMissile,
    cycleTime: launcher.cycleTime,
    launcherCount: launcher.count,
    explosionRadius: launcher.explosionRadius,
    explosionVelocity: launcher.explosionVelocity,
    damageReductionFactor: launcher.damageReductionFactor,
    maxVelocity: launcher.maxVelocity,
    flightTime: launcher.flightTime,
    flightRange: launcher.maxVelocity * launcher.flightTime,
  };
}

function launcherClassLabel(cls: LauncherClass): string {
  switch (cls) {
    case "rocket": return "Rocket";
    case "light": return "Light";
    case "ham": return "HAM";
    case "heavy": return "Heavy";
    case "rapidLight": return "Rapid Light";
    case "torpedo": return "Torpedo";
    case "cruise": return "Cruise";
    case "rapidHeavy": return "Rapid Heavy";
    case "xlTorpedo": return "XL Torp";
    case "xlCruise": return "XL Cruise";
    case "rapidTorpedo": return "Rapid Torp";
  }
}
