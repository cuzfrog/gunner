import type { FittingCalculator, FittingDb, FittingImport, FittingOverridesStore, FittingState, LauncherClass, LauncherClasses, MissileCatalog, MissileOption } from "../../../fitting";
import { applyFittingOverrides } from "../../../fitting";
import type { ImportedFitting, ImportedLauncher } from "../../../fitting";
import type { HullBonus } from "../../../gamedata/fittingDb";
import type { TypeId } from "../../../gamedata/ids";
import type { MissileSpec } from "../../../sim";
import { damageVectorSum } from "../../../sim";
import type { ShipProfile, Ships, SkillLevel, StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import type { PanelConfigurationMemory } from "../../panelConfigurationMemory";
import { setText } from "../controlsDom";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import type { Popup } from "../popup";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem, createPopup, SummaryChipImpl, VariantSection, type VariantItem } from "../shared";
import { ChoiceGroupImpl, type ChoiceGroupOption } from "../choiceGroup";
import type { LauncherController, LauncherControllerDeps } from "./launcherControllerContract";
import type { LauncherEls } from "./launcherControllerContract";

export type { LauncherController } from "./launcherControllerContract";

export class LauncherControllerImpl implements LauncherController {
  readonly side: Side;
  private readonly els: LauncherEls;
  private readonly fittingDb: FittingDb;
  private readonly fittingImport: FittingImport;
  private readonly missileCatalog: MissileCatalog;
  private readonly launcherClasses: LauncherClasses;
  private readonly ships: Ships;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly popupGroup: PopupGroup;
  private readonly calculator: FittingCalculator;
  private readonly fittingOverrides: FittingOverridesStore;
  private readonly panelMemory: PanelConfigurationMemory;
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
  private readonly ammoChip: SummaryChipImpl;
  private readonly classChoice: ChoiceGroupImpl;
  private readonly variantSection: VariantSection;
  private fittingState?: FittingState;
  private conditions?: StatConditions;
  private originalLauncherModuleId?: TypeId;

  constructor(deps: LauncherControllerDeps) {
    this.side = deps.side;
    this.els = deps.els;
    this.fittingDb = deps.fittingDb;
    this.fittingImport = deps.fittingImport;
    this.missileCatalog = deps.missileCatalog;
    this.launcherClasses = deps.launcherClasses;
    this.ships = deps.ships;
    this.imageCatalog = deps.imageCatalog;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.popupGroup = deps.popupGroup;
    this.calculator = deps.fittingCalculator;
    this.fittingOverrides = deps.fittingOverrides;
    this.panelMemory = deps.panelMemory;
    this.ammoList = new SelectableListImpl({
      itemClass: "launcher-ammo-item selectable-item",
      nameClass: "launcher-ammo-name",
      iconClass: "launcher-ammo-icon",
      role: "option",
      wrapInListItem: true,
    });
    this.ammoChip = new SummaryChipImpl(this.els.ammoSummary, this.els.ammoSummaryIcon);
    this.classChoice = new ChoiceGroupImpl({
      group: deps.els.classOptions,
      shape: { buttonClass: "btn", iconClass: "choice-icon", labelClass: "truncate", valueClass: "choice-value mono" },
    });
    this.els.classOptions.addEventListener("input", () => this.onClassChoiceInput());
    this.currentAmmoId = undefined;
    this.ammoPopupValue = this.createAmmoPopup();
    this.attributesPopupValue = this.createAttributesPopup();
    this.popupGroup.register(this.ammoPopupValue);
    this.popupGroup.register(this.attributesPopupValue);
    this.els.ammoTrigger.addEventListener("click", () => this.popupGroup.toggle(this.ammoPopupValue));
    this.els.attributesTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attributesPopupValue));
    this.variantSection = new VariantSection({
      gear: this.els.variantGear,
      popupEl: this.els.variants,
      listShape: { itemClass: "fitting-item btn", nameClass: "fitting-item-name", iconClass: "launcher-variant-icon", role: "menuitem" },
      variants: () => this.discoverLauncherVariants(),
      currentId: () => this.selectedLauncher?.moduleId,
      onSelect: (id) => this.onVariantSelect(id),
      isEnabled: () => this.selectedLauncher !== undefined,
    });
    this.popupGroup.register(this.variantSection.popup);
    this.els.variantGear.addEventListener("click", () => this.popupGroup.toggle(this.variantSection.popup));
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
    this.conditions = conditions;
    this.hullBonuses = this.fittingDb.hullBonuses[imported.profile.id] ?? [];
    this.fittingState = imported.fittingState;
    this.fittingOverrides.clear();
    this.panelMemory.clear();
    this.selectedLauncher = imported.launcher;
    this.currentAmmoId = imported.launcher?.chargeId;
    if (imported.launcher) {
      this.originalLauncherModuleId = imported.launcher.moduleId;
      this.panelMemory.rememberLauncher(this.launcherClasses.classOf(imported.launcher.moduleId), { moduleId: imported.launcher.moduleId, ammoId: imported.launcher.chargeId });
    }
    this.render();
  }

  restore(fitting?: string, conditions?: StatConditions, ammoId?: TypeId): void {
    if (conditions) this.skillLevel = conditions.skillLevel;
    if (fitting && conditions) {
      const imported = this.resolveFitting(fitting, conditions);
      if (imported?.launcher) {
        this.conditions = conditions;
        this.fittingState = imported.fittingState;
        this.hullBonuses = this.fittingDb.hullBonuses[imported.profile.id] ?? [];
        this.fittingOverrides.clear();
        this.panelMemory.clear();
        this.selectedLauncher = imported.launcher;
        this.currentAmmoId = imported.launcher.chargeId;
        this.originalLauncherModuleId = imported.launcher.moduleId;
        if (ammoId && this.missileCatalog.has(ammoId)) {
          this.fittingOverrides.setLauncherCharge(this.selectedLauncher.moduleId, ammoId);
          const patched = applyFittingOverrides(this.fittingState!, this.fittingOverrides.get());
          this.selectedLauncher = this.calculator.resolveLauncher(patched, conditions)!;
          this.currentAmmoId = this.selectedLauncher.chargeId;
        }
        this.panelMemory.rememberLauncher(this.launcherClasses.classOf(this.selectedLauncher.moduleId), { moduleId: this.selectedLauncher.moduleId, ammoId: this.currentAmmoId });
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
    this.popupGroup.close(this.variantSection.popup);
    this.selectedLauncher = undefined;
    this.currentAmmoId = undefined;
    this.fittingState = undefined;
    this.conditions = undefined;
    this.originalLauncherModuleId = undefined;
    this.fittingOverrides.clear();
    this.panelMemory.clear();
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
      this.ammoChip.render("-", undefined);
      this.renderClassSelector();
      this.variantSection.updateUI();
      return;
    }
    this.ammoChip.render(launcher.chargeName, this.imageCatalog.itemIconUrl(launcher.chargeId));
    const t = (key: string): string => this.i18n.t(key);
    setText(this.els.volleyDamage, formatWithCommas(damageVectorSum(launcher.damagePerMissile) * launcher.count, 1));
    setText(this.els.rateOfFire, `${formatNumber(launcher.cycleTime, 2)} s`);
    setText(this.els.explosionRadius, formatDistance(launcher.explosionRadius, t));
    setText(this.els.explosionVelocity, `${formatWithCommas(launcher.explosionVelocity, 0)} m/s`);
    setText(this.els.missileVelocity, `${formatWithCommas(launcher.maxVelocity, 0)} m/s`);
    setText(this.els.flightTime, `${formatNumber(launcher.flightTime, 1)} s`);
    setText(this.els.flightRange, formatDistance(launcher.maxVelocity * launcher.flightTime, t));
    setText(this.els.damageReductionFactor, formatNumber(launcher.damageReductionFactor, 2));
    this.renderAmmoList(launcher);
    this.renderClassSelector();
    this.variantSection.updateUI();
  }

  private renderClassSelector(): void {
    const launcher = this.selectedLauncher;
    const tier = this.hullProfile ? this.ships.shipTier(this.hullProfile) ?? "small" : "small";
    const allowed = this.launcherClasses.classesForTiers([tier]);
    const currentClass = launcher ? this.launcherClasses.classOf(launcher.moduleId) : undefined;
    const t = (key: string): string => this.i18n.t(key);
    const options: ChoiceGroupOption[] = allowed.map((cls) => ({
      value: cls,
      label: this.i18n.t(`label.launcherClass.${cls}`),
      iconUrl: launcher ? this.imageCatalog.itemIconUrl(this.launcherClasses.representativeOf(cls)) : undefined,
      valueText: `(${formatDistance(this.explosionRadiusForClass(cls), t)})`,
      disabled: !launcher,
    }));
    this.classChoice.render(options, currentClass ?? "");
  }

  private explosionRadiusForClass(cls: LauncherClass): number {
    const launcherStats = this.fittingDb.launchers[this.launcherClasses.representativeOf(cls)];
    if (!launcherStats) return 0;
    const missileId = this.missileCatalog.usualForLauncher(launcherStats);
    if (!missileId) return 0;
    return this.fittingDb.missiles[missileId]?.explosionRadius ?? 0;
  }

  private onClassChoiceInput(): void {
    let target: LauncherClass | undefined;
    for (const button of Array.from(this.els.classOptions.children)) {
      if (button.getAttribute("aria-pressed") === "true") {
        target = parseLauncherClass(button.getAttribute("data-value"), this.launcherClasses.allClasses());
        break;
      }
    }
    if (!target) return;
    this.onClassSelect(target);
  }

  private onClassSelect(target: LauncherClass): void {
    const launcher = this.selectedLauncher;
    if (!launcher || !this.originalLauncherModuleId) return;
    const currentClass = this.launcherClasses.classOf(launcher.moduleId);
    if (currentClass === target) return;
    const remembered = this.panelMemory.recallLauncher(target);
    const targetModuleId = remembered?.moduleId ?? this.launcherClasses.representativeOf(target);
    const targetLauncherStats = this.fittingDb.launchers[targetModuleId];
    const targetAmmoId = remembered?.ammoId ?? (targetLauncherStats ? this.missileCatalog.usualForLauncher(targetLauncherStats) : undefined);
    this.fittingOverrides.clearLauncher();
    this.fittingOverrides.setLauncherModule(this.originalLauncherModuleId, targetModuleId);
    if (targetAmmoId) this.fittingOverrides.setLauncherCharge(targetModuleId, targetAmmoId);
    this.recompute();
    this.rememberCurrentLauncherSelection();
  }

  private renderAmmoList(launcher: ImportedLauncher): void {
    const options = this.missileOptionsForLauncher(launcher);
    const items: SelectableItem[] = options.map((option) => ({
      value: option.id,
      label: option.name,
      hintContent: "ammo-hint",
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
    this.fittingOverrides.setLauncherCharge(this.selectedLauncher.moduleId, missileId);
    this.popupGroup.close(this.ammoPopupValue);
    this.recompute();
    this.rememberCurrentLauncherSelection();
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
    return createPopup({
      popupEl: this.els.ammoPopup,
      triggerEl: this.els.ammoTrigger,
      fieldEl: this.els.ammoField,
      onOpen: () => this.openAmmoPopup(),
      onClose: () => this.closeAmmoPopup(),
      isOpen: () => this.ammoPopupOpen,
    });
  }

  private createAttributesPopup(): Popup {
    return createPopup({
      popupEl: this.els.attributesPopup,
      triggerEl: this.els.attributesTrigger,
      fieldEl: this.els.attributesField,
      onOpen: () => { this.attributesPopupOpen = true; },
      onClose: () => { this.attributesPopupOpen = false; },
      isOpen: () => this.attributesPopupOpen,
    });
  }

  private discoverLauncherVariants(): readonly VariantItem[] {
    const launcher = this.selectedLauncher;
    if (!launcher) return [];
    const cls = this.launcherClasses.classOf(launcher.moduleId);
    const language = this.i18n.current();
    return this.launcherClasses.variantsForClass(cls).map((stats) => ({
      id: stats.id,
      name: this.fittingImport.itemNameForId(stats.id, language) ?? stats.name,
      iconUrl: this.imageCatalog.itemIconUrl(stats.id),
    }));
  }

  private onVariantSelect(moduleId: TypeId): void {
    const launcher = this.selectedLauncher;
    if (!launcher || !this.originalLauncherModuleId) return;
    this.fittingOverrides.clearLauncher();
    this.fittingOverrides.setLauncherModule(this.originalLauncherModuleId, moduleId);
    this.popupGroup.close(this.variantSection.popup);
    this.recompute();
    this.rememberCurrentLauncherSelection();
  }

  private recompute(): void {
    if (!this.fittingState || !this.conditions) return;
    const patched = applyFittingOverrides(this.fittingState, this.fittingOverrides.get());
    const launcher = this.calculator.resolveLauncher(patched, this.conditions);
    this.selectedLauncher = launcher;
    this.currentAmmoId = launcher?.chargeId;
    this.render();
    this.events.emitConfigInvalidated();
  }

  private rememberCurrentLauncherSelection(): void {
    if (!this.selectedLauncher || this.currentAmmoId === undefined) return;
    this.panelMemory.rememberLauncher(
      this.launcherClasses.classOf(this.selectedLauncher.moduleId),
      { moduleId: this.selectedLauncher.moduleId, ammoId: this.currentAmmoId },
    );
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

function parseLauncherClass(value: string | null, valid: readonly LauncherClass[]): LauncherClass | undefined {
  if (!value) return undefined;
  return valid.find((cls) => cls === value);
}
