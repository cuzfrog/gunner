import type { FittingDb, FittingImport, MissileCatalog, MissileOption } from "../../../fitting";
import type { ImportedFitting, ImportedLauncher } from "../../../fitting";
import type { HullBonus } from "../../../gamedata/fittingDb";
import type { TypeId } from "../../../gamedata/ids";
import type { SkillLevel, StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { setText } from "../controlsDom";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import type { Popup } from "../popup";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import type { LauncherController, LauncherControllerDeps } from "./launcherControllerContract";
import type { LauncherEls } from "./launcherControllerContract";

export type { LauncherController } from "./launcherControllerContract";

export class LauncherControllerImpl implements LauncherController {
  readonly side: Side;
  private readonly els: LauncherEls;
  private readonly fittingDb: FittingDb;
  private readonly fittingImport: FittingImport;
  private readonly missileCatalog: MissileCatalog;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly popupGroup: PopupGroup;
  private readonly popupValue: Popup;
  private selectedLauncher?: ImportedLauncher;
  private currentAmmoId: TypeId;
  private hullBonuses: readonly HullBonus[] = [];
  private skillLevel: SkillLevel = 5;
  private ammoPopupOpen = false;

  constructor(deps: LauncherControllerDeps) {
    this.side = deps.side;
    this.els = deps.els;
    this.fittingDb = deps.fittingDb;
    this.fittingImport = deps.fittingImport;
    this.missileCatalog = deps.missileCatalog;
    this.imageCatalog = deps.imageCatalog;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.popupGroup = deps.popupGroup;
    this.currentAmmoId = "" as TypeId;
    this.popupValue = this.createAmmoPopup();
    this.els.ammoTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popupValue));
    this.events.onLanguageChanged(() => this.render());
  }

  get popup(): Popup { return this.popupValue; }

  launcher(): ImportedLauncher | undefined {
    return this.selectedLauncher;
  }

  ammoId(): TypeId {
    return this.currentAmmoId;
  }

  applyImported(imported: ImportedFitting, conditions: StatConditions): void {
    this.skillLevel = conditions.skillLevel;
    this.hullBonuses = this.fittingDb.hullBonuses[imported.profile.id] ?? [];
    this.selectedLauncher = imported.launcher;
    if (imported.launcher) {
      this.currentAmmoId = imported.launcher.chargeId;
    }
    this.render();
  }

  restore(fitting?: string, conditions?: StatConditions, ammo?: string): void {
    if (conditions) this.skillLevel = conditions.skillLevel;
    if (fitting && conditions) {
      const imported = this.resolveFitting(fitting, conditions);
      if (imported?.launcher) {
        this.hullBonuses = this.fittingDb.hullBonuses[imported.profile.id] ?? [];
        this.selectedLauncher = imported.launcher;
        this.currentAmmoId = imported.launcher.chargeId;
        if (ammo) {
          const ammoId = this.missileCatalog.idForName(ammo);
          if (ammoId && this.missileCatalog.has(ammoId)) {
            this.selectedLauncher = this.missileCatalog.withCharge(this.selectedLauncher, ammoId, this.hullBonuses, this.skillLevel);
            this.currentAmmoId = ammoId;
          }
        }
      } else {
        this.selectedLauncher = undefined;
      }
    } else {
      this.selectedLauncher = undefined;
    }
    this.render();
  }

  clear(): void {
    this.popupGroup.close(this.popupValue);
    this.selectedLauncher = undefined;
    this.currentAmmoId = "" as TypeId;
    this.render();
  }

  capture(): { ammo: TypeId } {
    return { ammo: this.currentAmmoId };
  }

  isAmmoPopupOpen(): boolean {
    return this.ammoPopupOpen;
  }

  openAmmoPopup(): void {
    this.ammoPopupOpen = true;
  }

  closeAmmoPopup(): void {
    this.ammoPopupOpen = false;
  }

  render(): void {
    const launcher = this.selectedLauncher;
    const hasLauncher = launcher !== undefined;
    this.els.panel.classList.toggle("is-hidden", !hasLauncher);
    if (!hasLauncher) return;
    const t = (key: string): string => this.i18n.t(key);
    setText(this.els.ammoSummary, launcher.chargeName);
    setText(this.els.volleyDamage, formatWithCommas(launcher.damagePerMissile * launcher.count, 1));
    setText(this.els.rateOfFire, `${formatNumber(launcher.cycleTime, 2)} s`);
    setText(this.els.explosionRadius, formatDistance(launcher.explosionRadius, t));
    setText(this.els.explosionVelocity, `${formatWithCommas(launcher.explosionVelocity, 0)} m/s`);
    setText(this.els.missileVelocity, `${formatWithCommas(launcher.maxVelocity, 0)} m/s`);
    setText(this.els.flightTime, `${formatNumber(launcher.flightTime, 1)} s`);
    setText(this.els.flightRange, formatDistance(launcher.maxVelocity * launcher.flightTime, t));
    this.renderAmmoList(launcher);
  }

  private renderAmmoList(launcher: ImportedLauncher): void {
    const options = this.missileOptionsForLauncher(launcher);
    this.els.ammoList.innerHTML = "";
    for (const option of options) {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.classList.add("ammo-list-item");
      if (option.id === this.currentAmmoId) li.classList.add("is-selected");
      const iconUrl = this.imageCatalog.itemIconUrl(option.id);
      if (iconUrl) {
        const img = document.createElement("img");
        img.classList.add("ammo-list-icon");
        img.src = iconUrl;
        img.alt = "";
        li.appendChild(img);
      }
      const nameSpan = document.createElement("span");
      nameSpan.classList.add("ammo-list-name", "truncate");
      nameSpan.textContent = option.name;
      li.appendChild(nameSpan);
      li.addEventListener("click", () => this.onAmmoSelect(option.id));
      this.els.ammoList.appendChild(li);
    }
  }

  private onAmmoSelect(missileId: TypeId): void {
    if (!this.selectedLauncher) return;
    this.selectedLauncher = this.missileCatalog.withCharge(this.selectedLauncher, missileId, this.hullBonuses, this.skillLevel);
    this.currentAmmoId = missileId;
    this.popupGroup.close(this.popupValue);
    this.render();
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
      contains: (domTarget: EventTarget) => domTarget instanceof Element && this.els.ammoPopup.contains(domTarget),
    };
    return popup;
  }
}
