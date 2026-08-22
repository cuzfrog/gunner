import { SIG_RESOLUTIONS, type SigResolutionClass, type TurretSpec } from "../../sim";
import type { CargoCharge, ChargeCatalog, FittingImport, GunFamilies, ImportedFitting, ImportedTurret } from "../../fitting";
import type { StatConditions } from "../../ships";
import { isSigResClass } from "../controlsFormat";
import { num } from "../controlsDom";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../imageCatalog";
import type { Popup } from "../popupGroup";
import type { ProfileParamOverrides } from "../settings";
import { TrackingInput } from "../trackingInput";
import { AmmoList, type AmmoListEls } from "./ammoList";
import { SigResIcons } from "./sigResIcons";

export interface TurretEls {
  readonly tracking: HTMLInputElement;
  readonly sigRes: HTMLSelectElement;
  readonly sigResOptions: HTMLElement;
  readonly optimal: HTMLInputElement;
  readonly falloff: HTMLInputElement;
  readonly attackerAmmoTrigger: HTMLButtonElement;
  readonly attackerAmmoSummary: HTMLElement;
  readonly attackerAmmoSummaryIcon: HTMLImageElement;
  readonly attackerAmmoPopup: HTMLElement;
  readonly attackerAmmoCargoLabel: HTMLElement;
  readonly attackerAmmoCargoList: HTMLElement;
  readonly attackerAmmoExpand: HTMLButtonElement;
  readonly attackerAmmoAllSection: HTMLElement;
  readonly attackerAmmoAllList: HTMLElement;
}

interface TurretControllerDeps {
  readonly els: TurretEls;
  readonly popup: Popup;
  readonly chargeCatalog: ChargeCatalog;
  readonly gunFamilies: GunFamilies;
  readonly imageCatalog: ImageCatalog;
  readonly trackingInput: TrackingInput;
  readonly i18n: I18n;
  readonly fittingImport: FittingImport;
  readonly overrides: () => Partial<ProfileParamOverrides>;
  readonly clearTurretOverrides: () => void;
  readonly onConfigChange: (persist: boolean) => void;
}

export class TurretController {
  private readonly els: TurretEls;
  private readonly popup: Popup;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly fittingImport: FittingImport;
  private readonly trackingInput: TrackingInput;
  private readonly overrides: () => Partial<ProfileParamOverrides>;
  private readonly clearTurretOverrides: () => void;
  private readonly onConfigChange: (persist: boolean) => void;
  private readonly ammoList: AmmoList;
  private readonly sigResIcons: SigResIcons;
  private attackerTurret?: ImportedTurret;
  private attackerCargoCharges: readonly CargoCharge[] = [];
  private attackerAmmo: string;
  private attackerAmmoAllExpanded = false;
  private ammoPopupOpen = false;

  constructor(deps: TurretControllerDeps) {
    this.els = deps.els;
    this.popup = deps.popup;
    this.chargeCatalog = deps.chargeCatalog;
    this.fittingImport = deps.fittingImport;
    this.trackingInput = deps.trackingInput;
    this.overrides = deps.overrides;
    this.clearTurretOverrides = deps.clearTurretOverrides;
    this.onConfigChange = deps.onConfigChange;
    this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
    this.ammoList = new AmmoList({
      els: this.ammoListEls(),
      chargeCatalog: this.chargeCatalog,
      imageCatalog: deps.imageCatalog,
      i18n: deps.i18n,
      onSelect: (name) => this.onAmmoItemClick(name),
      onExpand: () => this.onAmmoExpandClick(),
    });
    this.sigResIcons = new SigResIcons({ gunFamilies: deps.gunFamilies, imageCatalog: deps.imageCatalog });
    this.render();
  }

  turret(): ImportedTurret | undefined {
    return this.attackerTurret;
  }

  ammo(): string {
    return this.attackerAmmo;
  }

  applyImported(imported: ImportedFitting): void {
    this.attackerAmmoAllExpanded = false;
    const turret = imported.turret;
    this.attackerCargoCharges = imported.cargoCharges;
    if (turret) {
      this.attackerTurret = turret;
      this.attackerAmmo = turret.charge;
      this.clearTurretOverrides();
      this.setTurretInputs(turret);
    } else {
      this.attackerTurret = undefined;
      this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
    }
    this.render();
  }

  restore(fittingText?: string, conditions?: StatConditions, ammo?: string): void {
    this.attackerAmmoAllExpanded = false;
    if (ammo !== undefined) this.attackerAmmo = ammo;
    if (!fittingText || !conditions) {
      this.attackerTurret = undefined;
      this.attackerCargoCharges = [];
      this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
    } else {
      const imported = this.fittingImport.importFitting(fittingText, conditions);
      if (imported?.turret) {
        const restored = this.chargeCatalog.withCharge(imported.turret, this.attackerAmmo);
        this.attackerTurret = restored;
        this.attackerCargoCharges = imported.cargoCharges;
        this.attackerAmmo = restored.charge;
        this.setTurretInputs(restored);
      } else {
        this.attackerTurret = undefined;
        this.attackerCargoCharges = [];
        this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
      }
    }
    this.render();
  }

  clear(): void {
    this.attackerTurret = undefined;
    this.attackerCargoCharges = [];
    this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
    this.attackerAmmoAllExpanded = false;
    this.render();
  }

  currentTurretSpec(trackingOverride?: number): TurretSpec {
    return {
      tracking: trackingOverride ?? this.trackingInput.rad,
      sigResolution: SIG_RESOLUTIONS[this.currentSigResValue()],
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
    };
  }

  capture(): { ammo: string } {
    return { ammo: this.attackerAmmo };
  }

  isAmmoPopupOpen(): boolean {
    return this.ammoPopupOpen;
  }

  openAmmoPopup(): void {
    if (!this.attackerTurret) return;
    this.ammoPopupOpen = true;
    this.ammoList.setPopupOpen(true);
    this.render();
    this.ammoList.focusSelectedOrFirst();
  }

  closeAmmoPopup(): void {
    this.ammoPopupOpen = false;
    this.ammoList.setPopupOpen(false);
  }

  render(): void {
    this.ammoList.render({ turret: this.attackerTurret, ammo: this.attackerAmmo, cargo: this.attackerCargoCharges, allExpanded: this.attackerAmmoAllExpanded });
    this.sigResIcons.render({ sigResOptions: this.els.sigResOptions }, this.attackerTurret);
  }

  private applyAmmo(name: string): boolean {
    if (!this.attackerTurret) return false;
    const updated = this.chargeCatalog.withCharge(this.attackerTurret, name);
    if (updated === this.attackerTurret) return false;
    this.attackerTurret = updated;
    this.attackerAmmo = updated.charge;
    this.clearTurretOverrides();
    this.setTurretInputs(updated);
    this.render();
    this.onConfigChange(false);
    return true;
  }

  private onAmmoItemClick(name: string): void {
    if (!this.applyAmmo(name)) return;
    this.closeAmmoPopup();
    this.popup.focusTrigger();
  }

  private onAmmoExpandClick(): void {
    this.attackerAmmoAllExpanded = !this.attackerAmmoAllExpanded;
    this.render();
  }

  private setTurretInputs(turret: ImportedTurret): void {
    const sigResolution = SIG_RESOLUTIONS[turret.sigResolutionClass];
    const overrides = this.overrides();
    if (overrides.tracking === undefined) this.trackingInput.setRadValue(turret.tracking, sigResolution);
    if (overrides.sigRes === undefined) {
      this.els.sigRes.value = turret.sigResolutionClass;
      this.setSigResButtons(turret.sigResolutionClass);
    }
    if (overrides.optimal === undefined) this.els.optimal.value = String(Math.round(turret.optimal));
    if (overrides.falloff === undefined) this.els.falloff.value = String(Math.round(turret.falloff));
    this.els.tracking.value = String(this.trackingInput.displayValue(sigResolution));
  }

  private setSigResButtons(value: SigResolutionClass): void {
    for (const button of Array.from(this.els.sigResOptions.children)) {
      const active = button.getAttribute("data-value") === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }

  private currentSigResValue(): SigResolutionClass {
    const value = this.els.sigRes.value;
    if (!isSigResClass(value)) throw new Error(`Invalid sigRes value: ${value}`);
    return value;
  }

  private ammoListEls(): AmmoListEls {
    return {
      attackerAmmoTrigger: this.els.attackerAmmoTrigger,
      attackerAmmoSummary: this.els.attackerAmmoSummary,
      attackerAmmoSummaryIcon: this.els.attackerAmmoSummaryIcon,
      attackerAmmoPopup: this.els.attackerAmmoPopup,
      attackerAmmoCargoLabel: this.els.attackerAmmoCargoLabel,
      attackerAmmoCargoList: this.els.attackerAmmoCargoList,
      attackerAmmoExpand: this.els.attackerAmmoExpand,
      attackerAmmoAllSection: this.els.attackerAmmoAllSection,
      attackerAmmoAllList: this.els.attackerAmmoAllList,
    };
  }
}
