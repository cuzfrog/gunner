import { SIG_RESOLUTIONS, type SigResolutionClass, type SimValueParser, type TurretSpec } from "../../../sim";
import type { CargoCharge, ChargeCatalog, FittingCalculator, FittingImport, FittingOverridesStore, FittingState, GunFamilies, ImportedFitting, ImportedTurret } from "../../../fitting";
import { applyFittingOverrides } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { HullTier, ShipProfile, Ships, SkillLevel, StatConditions } from "../../../ships";
import type { TrackingUnit } from "../../../appstate";
import type { TrackingInput } from "../trackingInput";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import type { PanelConfigurationMemory } from "../../panelConfigurationMemory";
import { isHtmlButtonElement, num } from "../controlsDom";
import type { Popup } from "../popup";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import { AmmoList, type AmmoListEls } from "./ammoList";
import { ChoiceGroupImpl } from "../choiceGroup";
import { SigResIcons } from "./sigResIcons";
import { TurretInputSet } from "./turretInputSet";
import { TurretStateResolver } from "./turretStateResolver";
import { VariantSection, type VariantItem } from "../shared";
import type { TurretController, TurretControllerDeps } from "./turretControllerContract";
import type { TurretEls } from "./turretEls";
import type { TurretOverrides } from "./turretOverrides";

const SIG_RESOLUTIONS_ORDER: readonly SigResolutionClass[] = ["S", "M", "L", "XL"] as const;
const HULL_TIER_TO_SIG_RES: Record<HullTier, SigResolutionClass> = {
  small: "S", medium: "M", large: "L", capital: "XL",
} as const;

export type { TurretController } from "./turretControllerContract";

interface RestoreSettings {
  fitting?: string;
  conditions?: StatConditions;
  ammo?: string;
  tracking?: number;
  sigRes?: SigResolutionClass;
  optimal?: number;
  falloff?: number;
}

export class TurretControllerImpl implements TurretController {
  readonly side: Side;
  private readonly els: TurretEls;
  private readonly popupValue: Popup;
  private readonly popupGroup: PopupGroup;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly fittingImport: FittingImport;
  private readonly trackingInput: TrackingInput;
  private readonly i18n: I18n;
  private readonly turretOverrides: TurretOverrides;
  private readonly ammoList: AmmoList;
  private readonly sigResIcons: SigResIcons;
  private readonly inputSet: TurretInputSet;
  private readonly resolver: TurretStateResolver;
  private readonly variantSection: VariantSection;
  private readonly gunFamilies: GunFamilies;
  private readonly imageCatalog: ImageCatalog;
  private readonly ships: Ships;
  private readonly events: UiEvents;
  private readonly simValueParser: SimValueParser;
  private readonly calculator: FittingCalculator;
  private readonly fittingOverrides: FittingOverridesStore;
  private readonly panelMemory: PanelConfigurationMemory;
  private selectedTurret?: ImportedTurret;
  private importedTurrets: readonly ImportedTurret[] = [];
  private allowedSigResClasses: readonly SigResolutionClass[] = SIG_RESOLUTIONS_ORDER;
  private cargoCharges: readonly CargoCharge[] = [];
  private currentAmmoId: TypeId;
  private skillLevel: SkillLevel = 5;
  private allExpanded = false;
  private ammoPopupOpen = false;
  private fittingState?: FittingState;
  private conditions?: StatConditions;
  private originalTurretModuleId?: TypeId;

  constructor(deps: TurretControllerDeps) {
    this.side = deps.side;
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
    this.simValueParser = deps.simValueParser;
    this.calculator = deps.fittingCalculator;
    this.fittingOverrides = deps.fittingOverrides;
    this.panelMemory = deps.panelMemory;
    this.currentAmmoId = this.chargeCatalog.usualForChargeSize(1);
    this.popupValue = this.createAmmoPopup();
    this.els.ammoTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popupValue));
    this.ammoList = new AmmoList({
      els: this.els,
      chargeCatalog: this.chargeCatalog,
      imageCatalog: deps.imageCatalog,
      fittingImport: this.fittingImport,
      i18n: deps.i18n,
      onSelect: (name) => this.onAmmoItemClick(name),
      onExpand: () => this.onAmmoExpandClick(),
    });
    this.sigResIcons = new SigResIcons({ gunFamilies: deps.gunFamilies, imageCatalog: deps.imageCatalog, i18n: deps.i18n, fittingImport: this.fittingImport, simValueParser: this.simValueParser });
    this.gunFamilies = deps.gunFamilies;
    this.imageCatalog = deps.imageCatalog;
    this.variantSection = new VariantSection({
      gear: this.els.variantGear,
      popupEl: this.els.variants,
      listShape: { itemClass: "fitting-item btn", nameClass: "fitting-item-name", iconClass: "turret-variant-icon", role: "menuitem" },
      variants: () => this.discoverTurretVariants(),
      currentId: () => this.selectedTurret?.moduleId,
      onSelect: (id) => this.onVariantSelect(id),
      isEnabled: () => this.selectedTurret !== undefined,
    });
    this.popupGroup.register(this.variantSection.popup);
    this.els.variantGear.addEventListener("click", () => this.popupGroup.toggle(this.variantSection.popup));
    this.inputSet = new TurretInputSet({
      els: this.els,
      trackingInput: this.trackingInput,
      sigResChoice: new ChoiceGroupImpl({ group: this.els.sigResOptions, select: this.els.sigRes, staticValues: [...SIG_RESOLUTIONS_ORDER] }),
      turretOverrides: this.turretOverrides,
      simValueParser: this.simValueParser,
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
    return this.selectedTurret;
  }

  ammo(): string {
    return this.fittingImport.itemNameForId(this.currentAmmoId, "en");
  }

  ammoId(): TypeId {
    return this.currentAmmoId;
  }

  applyImported(imported: ImportedFitting, conditions: StatConditions): void {
    this.allExpanded = false;
    this.skillLevel = conditions.skillLevel;
    this.conditions = conditions;
    this.fittingState = imported.fittingState;
    this.fittingOverrides.clear();
    this.panelMemory.clear();
    const { turret, turrets, cargoCharges, ammo } = this.resolver.resolveFromImported(imported);
    this.cargoCharges = cargoCharges;
    this.selectedTurret = turret;
    this.importedTurrets = turrets;
    this.currentAmmoId = ammo;
    if (turret) {
      this.originalTurretModuleId = turret.moduleId;
      this.turretOverrides.clearTurret();
      this.panelMemory.rememberTurret(this.gunFamilies.familyOf(turret.moduleId), turret.sigResolutionClass, { moduleId: turret.moduleId, ammoId: ammo });
      this.inputSet.set(turret);
    }
    this.render();
  }

  restore(
    fitting?: string,
    conditions?: StatConditions,
    ammo?: string,
    tracking?: number,
    sigRes?: SigResolutionClass,
    optimal?: number,
    falloff?: number,
  ): void;
  restore(settings: RestoreSettings): void;
  restore(
    arg1?: string | RestoreSettings,
    arg2?: StatConditions,
    arg3?: string,
    arg4?: number,
    arg5?: SigResolutionClass,
    arg6?: number,
    arg7?: number,
  ): void {
    const settings: RestoreSettings =
      typeof arg1 === "object"
        ? arg1
        : { fitting: arg1, conditions: arg2, ammo: arg3, tracking: arg4, sigRes: arg5, optimal: arg6, falloff: arg7 };
    this.allExpanded = false;
    if (settings.conditions) this.skillLevel = settings.conditions.skillLevel;
    if (settings.fitting && settings.conditions) {
      const imported = this.fittingImport.importFitting(settings.fitting, settings.conditions);
      this.conditions = settings.conditions;
      this.fittingState = imported?.fittingState;
      this.fittingOverrides.clear();
      this.panelMemory.clear();
      const { turret, turrets, cargoCharges, ammo: resolvedAmmo } = this.resolver.resolveFromFitting(
        settings.fitting,
        settings.conditions,
        settings.ammo,
      );
      this.selectedTurret = turret;
      this.importedTurrets = turrets;
      this.cargoCharges = cargoCharges;
      this.currentAmmoId = resolvedAmmo;
      if (turret) {
        this.originalTurretModuleId = turret.moduleId;
        if (settings.ammo) this.fittingOverrides.setTurretCharge(turret.moduleId, resolvedAmmo);
        this.panelMemory.rememberTurret(this.gunFamilies.familyOf(turret.moduleId), turret.sigResolutionClass, { moduleId: turret.moduleId, ammoId: resolvedAmmo });
        this.inputSet.set(turret);
      }
    } else {
      this.selectedTurret = undefined;
      this.importedTurrets = [];
      this.cargoCharges = [];
      this.currentAmmoId = this.chargeCatalog.usualForChargeSize(1);
    }
    if (!this.selectedTurret) {
      this.applyRawTurretValues(settings.tracking, settings.sigRes, settings.optimal, settings.falloff);
    }
    this.render();
  }

  private applyRawTurretValues(tracking?: number, sigRes?: SigResolutionClass, optimal?: number, falloff?: number): void {
    const sigResValue = sigRes ?? this.currentSigResClass();
    const sigResolution = SIG_RESOLUTIONS[sigResValue];
    if (sigRes !== undefined) {
      this.els.sigRes.value = sigRes;
      this.inputSet.setSigRes(sigRes);
    }
    if (tracking !== undefined) {
      this.trackingInput.setRadValue(tracking, sigResolution);
      this.els.tracking.value = String(this.trackingInput.displayValue(sigResolution));
    }
    if (optimal !== undefined) this.els.optimal.value = String(Math.round(optimal));
    if (falloff !== undefined) this.els.falloff.value = String(Math.round(falloff));
  }

  clear(): void {
    this.popupGroup.close(this.variantSection.popup);
    this.selectedTurret = undefined;
    this.importedTurrets = [];
    this.cargoCharges = [];
    this.fittingState = undefined;
    this.conditions = undefined;
    this.originalTurretModuleId = undefined;
    this.fittingOverrides.clear();
    this.panelMemory.clear();
    this.currentAmmoId = this.chargeCatalog.usualForChargeSize(1);
    this.allExpanded = false;
    this.render();
  }

  currentTurretSpec(trackingOverride?: number): TurretSpec | undefined {
    if (!this.selectedTurret) return undefined;
    return {
      kind: "turret",
      tracking: trackingOverride ?? this.trackingInput.rad,
      sigResolution: SIG_RESOLUTIONS[this.currentSigResClass()],
      optimal: num(this.els.optimal), falloff: num(this.els.falloff),
      damagePerShot: this.selectedTurret.damagePerShot,
      cycleTime: this.selectedTurret.cycleTime,
      turretCount: this.selectedTurret.turretCount,
    };
  }
  currentTurretSpecs(trackingOverride?: number): readonly TurretSpec[] {
    if (this.importedTurrets.length <= 1) {
      const spec = this.currentTurretSpec(trackingOverride);
      return spec ? [spec] : [];
    }
    const tracking = trackingOverride ?? this.trackingInput.rad;
    const sigResolution = SIG_RESOLUTIONS[this.currentSigResClass()];
    const optimal = num(this.els.optimal);
    const falloff = num(this.els.falloff);
    return this.importedTurrets.map((turret) => ({
      kind: "turret" as const,
      tracking,
      sigResolution,
      optimal,
      falloff,
      damagePerShot: turret.damagePerShot,
      cycleTime: turret.cycleTime,
      turretCount: turret.turretCount,
    }));
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
    if (this.selectedTurret && this.originalTurretModuleId) {
      const family = this.gunFamilies.familyOf(this.selectedTurret.moduleId);
      const remembered = this.panelMemory.recallTurret(family, sigRes);
      const targetModuleId = remembered?.moduleId ?? this.gunFamilies.representativeOf(family, sigRes);
      const targetAmmoId = remembered?.ammoId ?? this.currentAmmoId;
      this.cargoCharges = [];
      this.fittingOverrides.clearTurret();
      this.fittingOverrides.setTurretModule(this.originalTurretModuleId, targetModuleId);
      this.fittingOverrides.setTurretCharge(targetModuleId, targetAmmoId);
      this.recompute();
      this.rememberCurrentSelection();
      return;
    }
    this.inputSet.setSigRes(sigRes);
    this.turretOverrides.set({ sigRes });
    this.events.emitDisplayInvalidated();
  }

  private onTurretSpecInput(key: "optimal" | "falloff"): void {
    const value = num(key === "optimal" ? this.els.optimal : this.els.falloff);
    this.turretOverrides.set(key === "optimal" ? { optimal: value } : { falloff: value });
    this.events.emitDisplayInvalidated();
  }

  capture(): { tracking: number; sigRes: SigResolutionClass; optimal: number; falloff: number; ammo: TypeId } {
    return {
      tracking: this.trackingInput.rad,
      sigRes: this.inputSet.currentSigResValue(),
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
      ammo: this.currentAmmoId,
    };
  }

  isAmmoPopupOpen(): boolean {
    return this.ammoPopupOpen;
  }

  openAmmoPopup(): void {
    if (!this.selectedTurret) return;
    this.ammoPopupOpen = true;
    this.ammoList.setPopupOpen(true);
    this.render();
    this.ammoList.focusSelectedOrFirst();
  }

  closeAmmoPopup(): void {
    this.ammoPopupOpen = false;
    this.ammoList.setPopupOpen(false);
  }

  setTrackingUnit(unit: TrackingUnit): void {
    this.trackingInput.setUnit(unit, SIG_RESOLUTIONS[this.currentSigResClass()]);
    this.els.tracking.value = String(this.trackingInput.displayValue(SIG_RESOLUTIONS[this.currentSigResClass()]));
  }

  trackingUnit(): TrackingUnit {
    return this.trackingInput.unit;
  }

  setHullProfile(profile: ShipProfile | undefined): void {
    const tiers = profile ? this.ships.turretSizeOptions(profile) : [];
    this.allowedSigResClasses = tiers.map((tier) => HULL_TIER_TO_SIG_RES[tier]);
    this.clampSigRes();
    this.render();
  }

  render(): void {
    const hasGuns = this.selectedTurret !== undefined;
    this.inputSet.setEnabled(hasGuns);
    this.els.ammoTrigger.disabled = !hasGuns;
    this.els.ammoTrigger.title = hasGuns ? "" : this.i18n.t("turret.noGuns");
    this.ammoList.render({
      turret: this.selectedTurret, ammo: this.currentAmmoId,
      cargo: this.cargoCharges, allExpanded: this.allExpanded,
    });
    this.sigResIcons.render({ sigResOptions: this.els.sigResOptions }, this.selectedTurret);
    this.renderSigResState();
    this.variantSection.updateUI();
  }

  private applyAmmo(id: TypeId): boolean {
    if (!this.selectedTurret) return false;
    this.fittingOverrides.setTurretCharge(this.selectedTurret.moduleId, id);
    this.recompute();
    this.rememberCurrentSelection();
    return true;
  }

  private onAmmoItemClick(id: TypeId): void {
    if (!this.applyAmmo(id)) return;
    this.closeAmmoPopup();
    this.popupValue.focusTrigger();
  }

  private onAmmoExpandClick(): void {
    this.allExpanded = !this.allExpanded;
    this.render();
  }

  private createAmmoPopup(): Popup {
    return {
      isOpen: () => this.isAmmoPopupOpen(),
      open: () => this.openAmmoPopup(),
      close: () => this.closeAmmoPopup(),
      focusTrigger: () => this.els.ammoTrigger.focus(),
      contains: (shipB) => shipB instanceof Element && this.els.ammoField.contains(shipB),
    };
  }

  private clampSigRes(): void {
    const current = this.inputSet.currentSigResValue();
    if (this.allowedSigResClasses.includes(current)) return;
    this.turretOverrides.set({ sigRes: undefined });
    if (this.selectedTurret && this.allowedSigResClasses.includes(this.selectedTurret.sigResolutionClass)) {
      this.inputSet.setSigRes(this.selectedTurret.sigResolutionClass);
      return;
    }
    const highest = this.allowedSigResClasses[this.allowedSigResClasses.length - 1];
    if (highest) this.inputSet.setSigRes(highest);
  }

  private renderSigResState(): void {
    const notFittable = this.i18n.t("turret.notFittable");
    const allowed = new Set(this.allowedSigResClasses);
    const hasGuns = this.selectedTurret !== undefined;
    for (const button of Array.from(this.els.sigResOptions.children)) {
      if (!isHtmlButtonElement(button)) continue;
      const sigRes = this.simValueParser.parseSigResolutionClass(button.getAttribute("data-value") ?? "");
      if (sigRes === undefined) continue;
      button.disabled = !hasGuns || !allowed.has(sigRes);
      if (hasGuns && button.disabled) button.title = notFittable;
    }
    for (const option of Array.from(this.els.sigRes.options)) {
      const sigRes = this.simValueParser.parseSigResolutionClass(option.value);
      if (sigRes === undefined) continue;
      option.disabled = !hasGuns || !allowed.has(sigRes);
    }
  }

  private discoverTurretVariants(): readonly VariantItem[] {
    const turret = this.selectedTurret;
    if (!turret) return [];
    const family = this.gunFamilies.familyOf(turret.moduleId);
    const chargeSize = turret.chargeSize;
    const language = this.i18n.current();
    return this.gunFamilies.variantsForFamily(family, chargeSize).map((stats) => ({
      id: stats.id,
      name: this.fittingImport.itemNameForId(stats.id, language) ?? stats.name,
      iconUrl: this.imageCatalog.itemIconUrl(stats.id),
    }));
  }

  private onVariantSelect(moduleId: TypeId): void {
    const turret = this.selectedTurret;
    if (!turret || !this.originalTurretModuleId) return;
    this.fittingOverrides.clearTurret();
    this.fittingOverrides.setTurretModule(this.originalTurretModuleId, moduleId);
    this.popupGroup.close(this.variantSection.popup);
    this.recompute();
    this.rememberCurrentSelection();
  }

  private recompute(): void {
    if (!this.fittingState || !this.conditions) return;
    const patched = applyFittingOverrides(this.fittingState, this.fittingOverrides.get());
    const turrets = this.calculator.resolveTurrets(patched, this.conditions);
    this.importedTurrets = turrets;
    this.selectedTurret = turrets[0];
    if (this.selectedTurret) {
      this.currentAmmoId = this.selectedTurret.chargeId;
      this.turretOverrides.clearTurret();
      this.inputSet.set(this.selectedTurret);
    }
    this.render();
    this.events.emitConfigInvalidated();
  }

  private rememberCurrentSelection(): void {
    if (!this.selectedTurret) return;
    this.panelMemory.rememberTurret(
      this.gunFamilies.familyOf(this.selectedTurret.moduleId),
      this.selectedTurret.sigResolutionClass,
      { moduleId: this.selectedTurret.moduleId, ammoId: this.currentAmmoId },
    );
  }
}
