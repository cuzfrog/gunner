import type { FighterCatalog, FighterGroup, FighterLoadoutContext, FighterLoadoutResolver, FighterLoadoutValidation, FighterLoadoutValidator, FittingImport, ImportedFighter, ImportedFitting } from "../../../fitting";
import type { FighterKind } from "../../../gamedata/fittingDb";
import type { TypeId } from "../../../gamedata/ids";
import type { DamageVector, FighterSpec } from "../../../sim";
import { damageVectorSum } from "../../../sim";
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
import type { FighterController, FighterControllerDeps, FighterEls } from "./fighterControllerContract";

export type { FighterController } from "./fighterControllerContract";

const KINDS: readonly FighterKind[] = ["light", "heavy", "support"];

export class FighterControllerImpl implements FighterController {
  readonly side: Side;
  private readonly els: FighterEls;
  private readonly fittingImport: FittingImport;
  private readonly fighterCatalog: FighterCatalog;
  private readonly resolver: FighterLoadoutResolver;
  private readonly validator: FighterLoadoutValidator;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly popupGroup: PopupGroup;
  private readonly popupValue: Popup;
  private readonly catalogLists: Readonly<Record<FighterKind, SelectableListImpl>>;
  private readonly catalogEls: Readonly<Record<FighterKind, HTMLElement>>;
  private readonly fighterChip: SummaryChipImpl;
  private fighterGroups: FighterGroup[] = [];
  private resolvedFighters: readonly ImportedFighter[] = [];
  private loadoutContext: FighterLoadoutContext | undefined;
  private conditions: StatConditions | undefined;
  private validationValue: FighterLoadoutValidation | undefined;
  private popupOpen = false;

  constructor(deps: FighterControllerDeps) {
    this.side = deps.side;
    this.els = deps.els;
    this.fittingImport = deps.fittingImport;
    this.fighterCatalog = deps.fighterCatalog;
    this.resolver = deps.fighterLoadoutResolver;
    this.validator = deps.fighterLoadoutValidator;
    this.imageCatalog = deps.imageCatalog;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.popupGroup = deps.popupGroup;
    this.catalogLists = {
      light: new SelectableListImpl({ itemClass: "drone-catalog-item selectable-item", nameClass: "drone-catalog-name", iconClass: "drone-catalog-icon", role: "option", wrapInListItem: true }),
      heavy: new SelectableListImpl({ itemClass: "drone-catalog-item selectable-item", nameClass: "drone-catalog-name", iconClass: "drone-catalog-icon", role: "option", wrapInListItem: true }),
      support: new SelectableListImpl({ itemClass: "drone-catalog-item selectable-item", nameClass: "drone-catalog-name", iconClass: "drone-catalog-icon", role: "option", wrapInListItem: true }),
    };
    this.catalogEls = {
      light: this.els.catalogLight,
      heavy: this.els.catalogHeavy,
      support: this.els.catalogSupport,
    };
    this.fighterChip = new SummaryChipImpl(this.els.summary, this.els.summaryIcon);
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

  fighters(): readonly ImportedFighter[] {
    return this.resolvedFighters;
  }

  currentFighterSpecs(): readonly FighterSpec[] {
    return this.resolvedFighters.filter((f) => f.attack !== undefined).map((f) => importedFighterToFighterSpec(f));
  }

  validation(): FighterLoadoutValidation | undefined {
    return this.validationValue;
  }

  applyImported(imported: ImportedFitting, conditions: StatConditions): void {
    this.loadoutContext = loadoutContextFromFitting(imported);
    this.conditions = conditions;
    this.fighterGroups = imported.fighters.map((f) => ({ typeId: f.typeId, count: f.count }));
    this.recompute();
    this.render();
  }

  restore(fitting?: string, conditions?: StatConditions, fighterGroups?: readonly FighterGroup[]): void {
    if (fitting && conditions) {
      const imported = this.fittingImport.importFitting(fitting, conditions);
      if (imported) {
        this.loadoutContext = loadoutContextFromFitting(imported);
        this.conditions = conditions;
        const known = fighterGroups && fighterGroups.length > 0 ? filterKnownGroups(fighterGroups, this.fighterCatalog) : [];
        this.fighterGroups = known.length > 0 ? known : imported.fighters.map((f) => ({ typeId: f.typeId, count: f.count }));
        this.recompute();
        this.render();
        return;
      }
    }
    this.clear();
  }

  clear(): void {
    this.popupGroup.close(this.popupValue);
    this.fighterGroups = [];
    this.resolvedFighters = [];
    this.loadoutContext = undefined;
    this.conditions = undefined;
    this.validationValue = undefined;
    this.render();
  }

  capture(): { fighterGroups: readonly FighterGroup[] } {
    return { fighterGroups: [...this.fighterGroups] };
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
    const fighter = this.resolvedFighters[0];
    this.els.trigger.disabled = this.loadoutContext === undefined;
    if (!fighter) {
      this.fighterChip.render("-", undefined);
      this.clearStatDisplay();
      return;
    }
    this.fighterChip.render(fighter.name, this.imageCatalog.itemIconUrl(fighter.typeId));
    const t = (key: string): string => this.i18n.t(key);
    setText(this.els.count, String(this.totalCount()));
    if (fighter.attack === undefined) {
      setText(this.els.optimal, "-");
      setText(this.els.falloff, "-");
      setText(this.els.damage, this.i18n.t("fighter.notSimulated"));
      setText(this.els.cycleTime, "-");
      setText(this.els.maxVelocity, `${formatWithCommas(fighter.maxVelocity, 0)} m/s`);
      return;
    }
    setText(this.els.optimal, formatDistance(fighter.attack.optimal, t));
    setText(this.els.falloff, formatDistance(fighter.attack.falloff, t));
    setText(this.els.damage, formatWithCommas(fighterVolley(fighter), 1));
    setText(this.els.cycleTime, `${formatNumber(fighter.attack.cycleTime, 2)} s`);
    setText(this.els.maxVelocity, `${formatWithCommas(fighter.maxVelocity, 0)} m/s`);
  }

  private renderLoadout(): void {
    this.els.loadoutList.innerHTML = "";
    for (const group of this.fighterGroups) {
      this.els.loadoutList.appendChild(this.createLoadoutRow(group));
    }
  }

  private createLoadoutRow(group: FighterGroup): Element {
    const fighter = this.resolvedFighters.find((f) => f.typeId === group.typeId);
    const name = fighter?.name ?? this.fittingImport.itemNameForId(group.typeId, this.i18n.current()) ?? String(group.typeId);
    const iconUrl = this.imageCatalog.itemIconUrl(group.typeId);
    const decrementBtn = html`<button type="button" class="btn drone-stepper-btn drone-stepper-minus" aria-label="Decrease count">-</button>` as HTMLElement;
    const incrementBtn = html`<button type="button" class="btn drone-stepper-btn drone-stepper-plus" aria-label="Increase count">+</button>` as HTMLElement;
    const removeBtn = html`<button type="button" class="btn drone-remove-btn" aria-label="Remove fighter">x</button>` as HTMLElement;
    decrementBtn.addEventListener("click", () => this.decrementCount(group.typeId));
    incrementBtn.addEventListener("click", () => this.incrementCount(group.typeId));
    removeBtn.addEventListener("click", () => this.removeFighter(group.typeId));
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
      setText(this.els.summarySquadrons, "0/0");
      setText(this.els.summaryCount, "0/0");
      setText(this.els.summaryHangar, "0/0");
      this.els.summaryBar.classList.remove("is-invalid");
      return;
    }
    setText(this.els.summarySquadrons, `${v.totalSquadrons}/${profile.fighterTubes}`);
    setText(this.els.summaryCount, `${v.totalFighters}`);
    setText(this.els.summaryHangar, `${formatWithCommas(v.totalVolume, 0)}/${formatWithCommas(v.hangarCapacity, 0)}`);
    this.els.summaryBar.classList.toggle("is-invalid", !v.valid);
  }

  private renderCatalog(): void {
    for (const kind of KINDS) {
      const options = this.fighterCatalog.fightersByKind(kind);
      const items: SelectableItem[] = options.map((opt) => ({
        value: opt.id,
        label: opt.name,
        hintContent: "fighter",
        iconUrl: this.imageCatalog.itemIconUrl(opt.id),
        selected: false,
      }));
      const buttons = this.catalogLists[kind].render(this.catalogEls[kind], items);
      for (const button of buttons) {
        const typeId = button.dataset.value as TypeId;
        button.addEventListener("click", () => this.addFighter(typeId));
      }
    }
  }

  private addFighter(typeId: TypeId): void {
    const existing = this.fighterGroups.find((g) => g.typeId === typeId);
    if (existing) {
      this.fighterGroups = this.fighterGroups.map((g) => g.typeId === typeId ? { typeId, count: g.count + 1 } : g);
    } else {
      this.fighterGroups = [...this.fighterGroups, { typeId, count: 1 }];
    }
    this.recompute();
    this.render();
    this.events.emitConfigInvalidated();
  }

  private incrementCount(typeId: TypeId): void {
    this.fighterGroups = this.fighterGroups.map((g) => g.typeId === typeId ? { typeId, count: g.count + 1 } : g);
    this.recompute();
    this.render();
    this.events.emitConfigInvalidated();
  }

  private decrementCount(typeId: TypeId): void {
    const existing = this.fighterGroups.find((g) => g.typeId === typeId);
    if (!existing) return;
    if (existing.count <= 1) {
      this.removeFighter(typeId);
      return;
    }
    this.fighterGroups = this.fighterGroups.map((g) => g.typeId === typeId ? { typeId, count: g.count - 1 } : g);
    this.recompute();
    this.render();
    this.events.emitConfigInvalidated();
  }

  private removeFighter(typeId: TypeId): void {
    this.fighterGroups = this.fighterGroups.filter((g) => g.typeId !== typeId);
    this.recompute();
    this.render();
    this.events.emitConfigInvalidated();
  }

  private totalCount(): number {
    return this.fighterGroups.reduce((sum, g) => sum + g.count, 0);
  }

  private recompute(): void {
    if (!this.loadoutContext || !this.conditions) {
      this.resolvedFighters = [];
      this.validationValue = undefined;
      return;
    }
    this.validationValue = this.validator.validate(this.fighterGroups, this.loadoutContext.profile);
    this.resolvedFighters = this.resolver.resolve(this.fighterGroups, this.loadoutContext, this.conditions);
  }

  private clearStatDisplay(): void {
    setText(this.els.optimal, "-");
    setText(this.els.falloff, "-");
    setText(this.els.damage, "-");
    setText(this.els.cycleTime, "-");
    setText(this.els.count, "-");
    setText(this.els.maxVelocity, "-");
  }
}

function loadoutContextFromFitting(imported: ImportedFitting): FighterLoadoutContext {
  const state = imported.fittingState;
  return {
    profile: state.profile,
    hullBonuses: state.hullBonuses,
    droneBoosterModules: state.droneBoosterModules,
  };
}

function filterKnownGroups(groups: readonly FighterGroup[], catalog: FighterCatalog): FighterGroup[] {
  const result: FighterGroup[] = [];
  for (const group of groups) {
    if (catalog.has(group.typeId) && group.count > 0) result.push({ typeId: group.typeId, count: group.count });
  }
  return result;
}

function importedFighterToFighterSpec(fighter: ImportedFighter): FighterSpec {
  const attack = fighter.attack!;
  return {
    kind: "fighter",
    moduleId: fighter.typeId,
    damagePerVolley: fighterVolleyByType(fighter),
    cycleTime: attack.cycleTime,
    fighterCount: fighter.count,
    maxVelocity: fighter.maxVelocity,
    orbitRange: fighter.orbitRange,
    explosionRadius: attack.explosionRadius,
    explosionVelocity: attack.explosionVelocity,
    damageReductionFactor: Math.log(attack.damageReductionFactor) / Math.log(attack.damageReductionSensitivity),
    optimal: attack.optimal,
    falloff: attack.falloff,
    magazine: attack.numShots > 0 ? { numShots: attack.numShots, rearmTime: attack.rearmTime, refuelingTime: fighter.refuelingTime } : undefined,
  };
}

function fighterVolley(fighter: ImportedFighter): number {
  return damageVectorSum(fighterVolleyByType(fighter));
}

function fighterVolleyByType(fighter: ImportedFighter): DamageVector {
  const attack = fighter.attack!;
  return { em: attack.emDamage * attack.damageMultiplier, thermal: attack.thermalDamage * attack.damageMultiplier, kinetic: attack.kineticDamage * attack.damageMultiplier, explosive: attack.explosiveDamage * attack.damageMultiplier };
}
