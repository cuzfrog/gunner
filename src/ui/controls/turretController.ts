import { SIG_RESOLUTIONS, type SigResolutionClass, type TurretSpec } from "../../sim";
import type { CargoCharge, ChargeCatalog, FittingImport, GunFamilies, ImportedFitting, ImportedTurret } from "../../fitting";
import type { StatConditions } from "../../ships";
import { num } from "./controlsDom";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { Popup } from "./popupGroup";
import type { ProfileParamOverrides } from "../settings";
import { TrackingInput } from "./trackingInput";
import { AmmoList, type AmmoListEls } from "./ammoList";
import { SigResButtons } from "./sigResButtons";
import { SigResIcons } from "./sigResIcons";
import { TurretEls } from "./turretEls";
import { TurretInputSet } from "./turretInputSet";
import { TurretStateResolver } from "./turretStateResolver";

interface TurretControllerDeps {
  readonly els: TurretEls; readonly popup: Popup; readonly chargeCatalog: ChargeCatalog; readonly gunFamilies: GunFamilies; readonly imageCatalog: ImageCatalog;
  readonly trackingInput: TrackingInput; readonly i18n: I18n; readonly fittingImport: FittingImport; readonly resolver: TurretStateResolver;
  readonly overrides: () => Partial<ProfileParamOverrides>; readonly clearTurretOverrides: () => void; readonly onConfigChange: (persist: boolean) => void;
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
  private readonly inputSet: TurretInputSet;
  private readonly resolver: TurretStateResolver;
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
    this.resolver = deps.resolver;
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
    this.inputSet = new TurretInputSet({
      els: this.els,
      trackingInput: this.trackingInput,
      sigResButtons: new SigResButtons({ sigResOptions: this.els.sigResOptions }),
      overrides: this.overrides,
    });
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
    const { turret, cargoCharges, ammo } = this.resolver.resolveFromImported(imported);
    this.attackerCargoCharges = cargoCharges;
    this.attackerTurret = turret;
    this.attackerAmmo = ammo;
    if (turret) {
      this.clearTurretOverrides();
      this.inputSet.set(turret);
    }
    this.render();
  }

  restore(settings: { fitting?: string; conditions?: StatConditions; ammo?: string }): void;
  restore(fittingText?: string, conditions?: StatConditions, ammo?: string): void;
  restore(arg1?: string | { fitting?: string; conditions?: StatConditions; ammo?: string }, arg2?: StatConditions, arg3?: string): void {
    const settings = typeof arg1 === "object" ? arg1 : { fitting: arg1, conditions: arg2, ammo: arg3 };
    const { fitting, conditions, ammo } = settings ?? {};
    this.attackerAmmoAllExpanded = false;
    if (ammo !== undefined) this.attackerAmmo = ammo;
    if (!fitting || !conditions) {
      this.attackerTurret = undefined;
      this.attackerCargoCharges = [];
      this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
    } else {
      const { turret, cargoCharges, ammo: resolvedAmmo } = this.resolver.resolveFromFitting(fitting, conditions, this.attackerAmmo);
      this.attackerTurret = turret;
      this.attackerCargoCharges = cargoCharges;
      this.attackerAmmo = resolvedAmmo;
      if (turret) this.inputSet.set(turret);
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
      sigResolution: SIG_RESOLUTIONS[this.inputSet.currentSigResValue()],
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
    };
  }

  capture(): { sigRes: SigResolutionClass; optimal: number; falloff: number; ammo: string } {
    return { sigRes: this.inputSet.currentSigResValue(), optimal: num(this.els.optimal), falloff: num(this.els.falloff), ammo: this.attackerAmmo };
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
    this.inputSet.set(updated);
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
