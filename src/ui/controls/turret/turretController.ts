import { isSigResolutionClass, SIG_RESOLUTIONS, type SigResolutionClass, type TurretSpec } from "../../../sim";
import type { CargoCharge, ChargeCatalog, FittingImport, GunFamilies, ImportedFitting, ImportedTurret } from "../../../fitting";
import type { HullTier, ShipProfile, Ships, StatConditions } from "../../../ships";
import type { ProfileParamOverrides } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import { isHtmlButtonElement, num } from "../controlsDom";
import type { Popup } from "../popup";
import { AmmoList, type AmmoListEls } from "./ammoList";
import { SigResButtons } from "./sigResButtons";
import { SigResIcons } from "./sigResIcons";
import { TurretInputSet } from "./turretInputSet";
import { TurretStateResolver } from "./turretStateResolver";
import type { TurretController, TurretControllerDeps } from "./turretControllerContract";
import type { TurretOverrides } from "./turretOverrides";
import type { PopupGroup } from "../popup";

const SIG_RESOLUTIONS_ORDER: readonly SigResolutionClass[] = ["S", "M", "L", "XL"] as const;
const HULL_TIER_TO_SIG_RES: Record<HullTier, SigResolutionClass> = {
  small: "S", medium: "M", large: "L", capital: "XL",
} as const;

export type { TurretController } from "./turretControllerContract";

export class TurretControllerImpl implements TurretController {
  private readonly els: TurretControllerDeps["els"];
  private readonly popupValue: Popup;
  private readonly popupGroup: PopupGroup;
  private readonly chargeCatalog: TurretControllerDeps["chargeCatalog"];
  private readonly fittingImport: TurretControllerDeps["fittingImport"];
  private readonly trackingInput: TurretControllerDeps["trackingInput"];
  private readonly i18n: I18n;
  private readonly turretOverrides: TurretOverrides;
  private readonly ammoList: AmmoList;
  private readonly sigResIcons: SigResIcons;
  private readonly inputSet: TurretInputSet;
  private readonly resolver: TurretControllerDeps["resolver"];
  private readonly ships: TurretControllerDeps["ships"];
  private readonly events: UiEvents;
  private attackerTurret?: ImportedTurret;
  private allowedSigResClasses: readonly SigResolutionClass[] = SIG_RESOLUTIONS_ORDER;
  private attackerCargoCharges: readonly CargoCharge[] = [];
  private attackerAmmo: string;
  private attackerAmmoAllExpanded = false;
  private ammoPopupOpen = false;

  constructor(deps: TurretControllerDeps) {
    this.els = deps.els;
    this.popupGroup = deps.popupGroup;
    this.chargeCatalog = deps.chargeCatalog;
    this.fittingImport = deps.fittingImport;
    this.trackingInput = deps.trackingInput;
    this.i18n = deps.i18n;
    this.turretOverrides = deps.turretOverrides;
    this.resolver = deps.resolver;
    this.ships = deps.ships;
    this.events = deps.events;
    this.attackerAmmo = this.chargeCatalog.usualForChargeSize(1);
    this.popupValue = this.createAmmoPopup();
    this.els.attackerAmmoTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popupValue));
    this.ammoList = new AmmoList({
      els: this.ammoListEls(),
      chargeCatalog: this.chargeCatalog,
      imageCatalog: deps.imageCatalog,
      fittingImport: this.fittingImport,
      i18n: deps.i18n,
      onSelect: (name) => this.onAmmoItemClick(name),
      onExpand: () => this.onAmmoExpandClick(),
    });
    this.sigResIcons = new SigResIcons({ gunFamilies: deps.gunFamilies, imageCatalog: deps.imageCatalog });
    this.inputSet = new TurretInputSet({
      els: this.els,
      trackingInput: this.trackingInput,
      sigResButtons: new SigResButtons({ sigResOptions: this.els.sigResOptions }),
      turretOverrides: this.turretOverrides,
    });
    this.els.tracking.addEventListener("input", () => this.onTrackingInput());
    this.els.sigRes.addEventListener("input", () => this.onSigResChange());
    this.els.optimal.addEventListener("input", () => this.onTurretSpecInput("optimal"));
    this.els.falloff.addEventListener("input", () => this.onTurretSpecInput("falloff"));
    this.events.onLanguageChanged(() => this.render());
    this.render();
  }

  get popup(): Popup { return this.popupValue; }

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
      this.turretOverrides.clearTurret();
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
      sigResolution: SIG_RESOLUTIONS[this.currentSigResClass()],
      optimal: num(this.els.optimal), falloff: num(this.els.falloff),
    };
  }

  currentSigResClass(): SigResolutionClass {
    return this.inputSet.currentSigResValue();
  }

  private currentSigResolution(): number {
    return SIG_RESOLUTIONS[this.currentSigResClass()];
  }

  private onTrackingInput(): void {
    const value = num(this.els.tracking);
    this.els.tracking.value = String(this.trackingInput.setDisplayValue(value, this.currentSigResolution()));
    this.turretOverrides.set({ tracking: this.trackingInput.rad });
    this.events.emitDisplayInvalidated();
  }

  private onSigResChange(): void {
    const sigRes = this.currentSigResClass();
    this.inputSet.setSigRes(sigRes);
    this.turretOverrides.set({ sigRes });
    this.events.emitDisplayInvalidated();
  }

  private onTurretSpecInput(key: "optimal" | "falloff"): void {
    const spec = this.currentTurretSpec();
    this.turretOverrides.set({ [key]: spec[key] } as Partial<ProfileParamOverrides>);
    this.events.emitDisplayInvalidated();
  }

  capture(): { sigRes: SigResolutionClass; optimal: number; falloff: number; ammo: string } {
    return {
      sigRes: this.inputSet.currentSigResValue(), optimal: num(this.els.optimal),
      falloff: num(this.els.falloff), ammo: this.attackerAmmo,
    };
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

  setHullProfile(profile: ShipProfile | undefined): void {
    const tiers = profile ? this.ships.turretSizeOptions(profile) : [];
    this.allowedSigResClasses = tiers.map((tier) => HULL_TIER_TO_SIG_RES[tier]);
    this.clampSigRes();
    this.render();
  }

  render(): void {
    this.ammoList.render({
      turret: this.attackerTurret, ammo: this.attackerAmmo,
      cargo: this.attackerCargoCharges, allExpanded: this.attackerAmmoAllExpanded,
    });
    this.sigResIcons.render({ sigResOptions: this.els.sigResOptions }, this.attackerTurret);
    this.renderSigResState();
  }

  private applyAmmo(name: string): boolean {
    if (!this.attackerTurret) return false;
    const updated = this.chargeCatalog.withCharge(this.attackerTurret, name);
    if (updated === this.attackerTurret) return false;
    this.attackerTurret = updated;
    this.attackerAmmo = updated.charge;
    this.turretOverrides.clearTurret();
    this.inputSet.set(updated);
    this.render();
    this.events.emitConfigInvalidated(false);
    return true;
  }

  private onAmmoItemClick(name: string): void {
    if (!this.applyAmmo(name)) return;
    this.closeAmmoPopup();
    this.popupValue.focusTrigger();
  }

  private onAmmoExpandClick(): void {
    this.attackerAmmoAllExpanded = !this.attackerAmmoAllExpanded;
    this.render();
  }

  private createAmmoPopup(): Popup {
    return {
      isOpen: () => this.isAmmoPopupOpen(),
      open: () => this.openAmmoPopup(),
      close: () => this.closeAmmoPopup(),
      focusTrigger: () => this.els.attackerAmmoTrigger.focus(),
      contains: (target) => target instanceof Element && target.closest("#attacker-ammo-field") !== null,
    };
  }

  private clampSigRes(): void {
    const current = this.inputSet.currentSigResValue();
    if (this.allowedSigResClasses.includes(current)) return;
    this.turretOverrides.set({ sigRes: undefined });
    if (this.attackerTurret && this.allowedSigResClasses.includes(this.attackerTurret.sigResolutionClass)) {
      this.inputSet.setSigRes(this.attackerTurret.sigResolutionClass);
      return;
    }
    const highest = this.allowedSigResClasses[this.allowedSigResClasses.length - 1];
    if (highest) this.inputSet.setSigRes(highest);
  }

  private renderSigResState(): void {
    const notFittable = this.i18n.t("turret.notFittable");
    const allowed = new Set(this.allowedSigResClasses);
    for (const button of Array.from(this.els.sigResOptions.children)) {
      if (!isHtmlButtonElement(button)) continue;
      const value = button.getAttribute("data-value") ?? "";
      if (!isSigResolutionClass(value)) continue;
      button.disabled = !allowed.has(value);
      if (button.disabled) button.title = notFittable;
    }
    for (const option of Array.from(this.els.sigRes.options)) {
      if (!isSigResolutionClass(option.value)) continue;
      option.disabled = !allowed.has(option.value);
    }
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
