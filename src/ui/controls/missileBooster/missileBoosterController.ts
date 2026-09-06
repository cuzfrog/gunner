import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { MissileBoosterLoadout, MissileBoosterProjection, MissileBoosterSpec, MissileEnhancerSpec, MissileScriptSpec } from "../../../sim";
import type { StoredMissileBoosterActivation } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { missileScriptStatSuffix } from "../controlsFormat";
import { html } from "../markup";
import type { PopupGroup } from "../popup";
import type { ModulesPopup } from "../modulesPopup";
import type { Side } from "../side";
import { ScriptSection, type ScriptOption, IconActionImpl, SectionBlockImpl, spriteIcon } from "../shared";
import type { MissileBoosterController, MissileBoosterEls } from "./missileBoosterControllerContract";
import type { MissileBoosterEffectDescriber } from "./missileBoosterEffectDescriber";

interface MutableMissileBoosterActivation {
  active: boolean;
  overloaded: boolean;
  script: MissileScriptSpec | undefined;
}

interface MissileBoosterState {
  loadout: MissileBoosterLoadout;
  activation: MutableMissileBoosterActivation[];
}

export class MissileBoosterControllerImpl implements MissileBoosterController {
  private readonly els: MissileBoosterEls;
  private readonly popupGroup: PopupGroup;
  private readonly modulesPopup: ModulesPopup;
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly describer: MissileBoosterEffectDescriber;
  private readonly states = new Map<Side, MissileBoosterState>();
  private readonly scriptSections: Record<Side, ScriptSection<number>>;
  private readonly computerNameSpans = new Map<Side, HTMLSpanElement[]>();
  private readonly overloadAction: IconActionImpl;
  private readonly sectionBlock: SectionBlockImpl;

  constructor(deps: { els: MissileBoosterEls; popupGroup: PopupGroup; modulesPopup: ModulesPopup; imageCatalog: ImageCatalog; fittingImport: FittingImport; i18n: I18n; events: UiEvents; describer: MissileBoosterEffectDescriber }) {
    this.els = deps.els;
    this.popupGroup = deps.popupGroup;
    this.modulesPopup = deps.modulesPopup;
    this.imageCatalog = deps.imageCatalog;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.describer = deps.describer;
    this.overloadAction = new IconActionImpl({
      buttonClass: "ewar-overload-button btn icon-button",
      iconSvg: spriteIcon("overload", 14, "currentColor", "overload-button-icon"),
      hint: "",
    });
    this.sectionBlock = new SectionBlockImpl();
    this.scriptSections = {
      shipA: this.buildScriptSection("shipA"),
      shipB: this.buildScriptSection("shipB"),
    };
    this.modulesPopup.registerOnClose("shipA", () => this.scriptSections.shipA.close());
    this.modulesPopup.registerOnClose("shipB", () => this.scriptSections.shipB.close());
    this.events.onFittingImported((side, imported) => this.setLoadout(side, imported.missileBoosts));
    this.events.onLanguageChanged(() => this.render());
    this.render();
  }

  setLoadout(side: Side, loadout: MissileBoosterLoadout): void {
    if (this.isEmpty(loadout)) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout) });
    }
    this.renderSide(side);
  }

  restore(side: Side, loadout: MissileBoosterLoadout | undefined, saved?: readonly StoredMissileBoosterActivation[]): void {
    if (!loadout || this.isEmpty(loadout)) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout, saved) });
    }
    this.renderSide(side);
  }

  projection(side: Side): MissileBoosterProjection | undefined {
    const state = this.states.get(side);
    if (!state || this.isEmpty(state.loadout)) return undefined;
    return { loadout: state.loadout, activation: { computers: state.activation } };
  }

  capture(side: Side): readonly StoredMissileBoosterActivation[] | undefined {
    const state = this.states.get(side);
    if (!state || this.isEmpty(state.loadout)) return undefined;
    return state.activation.map((a) => ({
      active: a.active,
      overloaded: a.overloaded,
      script: a.script?.moduleId ?? "none",
    }));
  }

  render(): void {
    this.renderSide("shipA");
    this.renderSide("shipB");
  }

  updateSummaries(): void {
    this.updateSummary("shipA");
    this.updateSummary("shipB");
  }

  private buildScriptSection(side: Side): ScriptSection<number> {
    return new ScriptSection<number>({
      popupId: `${sideId(side)}-missile-booster-script-popup`,
      mountEl: this.els.modulesFields[side],
      parentPopup: this.modulesPopup.popup(side),
      popupGroup: this.popupGroup,
      listShape: { itemClass: "ewar-script-option", nameClass: "", role: "menuitem" },
      placement: side === "shipA" ? "alongside-end" : "alongside-start",
      options: (index) => this.buildScriptOptions(side, index),
      onSelect: (index, value) => this.onScriptSelected(side, index, value),
      gearHint: (index) => this.gearHintForSide(side, index),
    });
  }

  private renderSide(side: Side): void {
    const section = this.els.sections[side];
    const summary = this.els.summaries[side];
    const state = this.states.get(side);
    this.scriptSections[side].close();
    this.computerNameSpans.delete(side);
    section.innerHTML = "";
    if (!state || this.isEmpty(state.loadout)) {
      section.hidden = true;
      summary.innerHTML = "";
      return;
    }
    section.hidden = false;
    this.updateSummary(side);
    if (state.loadout.computers.length > 0) {
      const rowContainer = html`<div></div>` as unknown as HTMLDivElement;
      this.renderComputers(side, state, rowContainer);
      const rows = Array.from(rowContainer.children);
      const block = this.sectionBlock.create(this.i18n.t("label.missileBooster.computer"), rows);
      section.appendChild(block);
    }
    if (state.loadout.enhancers.length > 0) {
      const rowContainer = html`<div></div>` as unknown as HTMLDivElement;
      this.renderEnhancers(side, state, rowContainer);
      const rows = Array.from(rowContainer.children);
      const block = this.sectionBlock.create(this.i18n.t("label.missileBooster.enhancer"), rows);
      section.appendChild(block);
    }
  }

  private updateSummary(side: Side): void {
    const summary = this.els.summaries[side];
    const state = this.states.get(side);
    summary.innerHTML = "";
    if (!state || this.isEmpty(state.loadout)) {
      summary.textContent = "";
      return;
    }
    if (state.loadout.computers.length > 0) {
      const active = state.activation.filter((a) => a.active).length;
      const hint = this.computerDescription(state);
      this.appendSummaryItem(summary, state.loadout.computers[0].moduleId, active, state.loadout.computers.length, hint);
    }
    if (state.loadout.enhancers.length > 0) {
      this.appendSummaryItem(summary, state.loadout.enhancers[0].moduleId, state.loadout.enhancers.length, state.loadout.enhancers.length, this.enhancerDescription(state));
    }
  }

  private computerDescription(state: MissileBoosterState): string {
    const projection: MissileBoosterProjection = { loadout: state.loadout, activation: { computers: state.activation } };
    return this.describer.computerHint(projection);
  }

  private enhancerDescription(state: MissileBoosterState): string {
    const projection: MissileBoosterProjection = { loadout: state.loadout, activation: { computers: state.activation } };
    return this.describer.enhancerHint(projection);
  }

  private appendSummaryItem(summary: HTMLElement, moduleId: TypeId, active: number, total: number, hint: string): void {
    const iconUrl = this.imageCatalog.itemIconUrl(moduleId);
    const item = html`<span class="trigger-summary-item" data-hint=${hint}><img class="ewar-summary-icon" alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}><span class="trigger-summary-count mono">${active}/${total}</span></span>` as unknown as HTMLSpanElement;
    summary.appendChild(item);
  }

  private isEmpty(loadout: MissileBoosterLoadout): boolean {
    return loadout.computers.length === 0 && loadout.enhancers.length === 0;
  }

  private clampActivation(loadout: MissileBoosterLoadout, saved?: readonly StoredMissileBoosterActivation[]): MutableMissileBoosterActivation[] {
    return loadout.computers.map((spec, i) => {
      const savedActivation = saved?.[i];
      const savedScript = savedActivation?.script;
      let script: MissileScriptSpec | undefined;
      if (savedScript === undefined) {
        script = spec.defaultScript;
      } else if (savedScript === "none" || savedScript === "") {
        script = undefined;
      } else {
        const byId = typeIdFromString(savedScript);
        script = byId !== undefined ? loadout.scripts.find((s) => s.moduleId === byId) : undefined;
        if (script === undefined) script = spec.defaultScript;
      }
      return { active: savedActivation?.active ?? true, overloaded: savedActivation?.overloaded ?? false, script };
    });
  }

  private renderComputers(side: Side, state: MissileBoosterState, section: HTMLElement): void {
    const nameSpans: HTMLSpanElement[] = [];
    for (let i = 0; i < state.loadout.computers.length; i++) {
      const computer = state.loadout.computers[i];
      const activation = state.activation[i];
      const row = html`<div class=${activation.active ? "ewar-row" : "ewar-row ewar-row-inactive"}></div>` as unknown as HTMLDivElement;
      const { button, nameSpan } = this.createModuleButton(activation.active, computer, activation.script, activation.overloaded);
      nameSpans.push(nameSpan);
      button.addEventListener("click", () => this.toggleComputer(side, i, button, row));
      row.appendChild(button);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, computer, () => this.toggleComputerOverload(side, i, overloadButton));
      row.appendChild(overloadButton);
      const gear = this.scriptSections[side].createGear(i, {
        hint: this.gearHintForScript(activation.script),
        disabled: !activation.active,
        dataIndex: i,
      });
      row.appendChild(gear);
      section.appendChild(row);
    }
    this.computerNameSpans.set(side, nameSpans);
  }

  private renderEnhancers(side: Side, state: MissileBoosterState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.enhancers.length; i++) {
      const enhancer = state.loadout.enhancers[i];
      const { button } = this.createEnhancerButton(enhancer);
      const row = html`<div class="ewar-row">${button}</div>` as unknown as HTMLDivElement;
      section.appendChild(row);
    }
  }

  private moduleDisplayName(spec: { readonly moduleId: TypeId }): string {
    return this.fittingImport.itemNameForId(spec.moduleId, this.i18n.current());
  }

  private scriptDisplayName(script: MissileScriptSpec | undefined): string {
    if (script === undefined) return this.i18n.t("missileBooster.script.none");
    return this.fittingImport.itemNameForId(script.moduleId, this.i18n.current());
  }

  private createModuleButton(active: boolean, computer: MissileBoosterSpec, script: MissileScriptSpec | undefined, overloaded: boolean): { button: HTMLButtonElement; nameSpan: HTMLSpanElement } {
    const displayName = this.moduleDisplayName(computer);
    const effectTitle = this.describer.computerModuleEffect(computer, script, overloaded);
    const iconUrl = this.imageCatalog.itemIconUrl(computer.moduleId);
    const nameSpan = html`<span class="truncate" data-hint=${effectTitle}>${displayName}</span>` as unknown as HTMLSpanElement;
    const button = html`<button type="button" class="ewar-module-toggle" aria-pressed=${String(active)} aria-label=${displayName}><img alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}>${nameSpan}</button>` as unknown as HTMLButtonElement;
    return { button, nameSpan };
  }

  private createEnhancerButton(enhancer: MissileEnhancerSpec): { button: HTMLButtonElement } {
    const displayName = this.moduleDisplayName(enhancer);
    const effectTitle = this.describer.enhancerModuleEffect(enhancer);
    const iconUrl = this.imageCatalog.itemIconUrl(enhancer.moduleId);
    const button = html`<button type="button" class="ewar-module-toggle" aria-disabled="true" aria-label=${displayName}><img alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}><span class="truncate" data-hint=${effectTitle}>${displayName}</span></button>` as unknown as HTMLButtonElement;
    return { button };
  }

  private createOverloadButton(active: boolean, overloaded: boolean, index: number, spec: { readonly moduleId: TypeId }, onToggle: () => void): HTMLButtonElement {
    const label = `${this.i18n.t("label.overload")} ${this.moduleDisplayName(spec)}`;
    const button = this.overloadAction.create(onToggle);
    button.setAttribute("data-index", String(index));
    button.setAttribute("aria-pressed", String(overloaded));
    button.setAttribute("data-hint", label);
    button.setAttribute("aria-label", label);
    if (!active) button.setAttribute("disabled", "");
    return button;
  }

  private gearHintForScript(script: MissileScriptSpec | undefined): string {
    const name = this.scriptDisplayName(script);
    return `${name}${script ? ` · ${missileScriptStatSuffix(script)}` : ""}`;
  }

  private gearHintForSide(side: Side, index: number): string {
    const state = this.states.get(side);
    if (!state) return this.i18n.t("missileBooster.script.none");
    return this.gearHintForScript(state.activation[index].script);
  }

  private buildScriptOptions(side: Side, index: number): readonly ScriptOption[] {
    const state = this.states.get(side);
    if (!state) return [];
    const current = state.activation[index].script;
    return [
      { value: "none", label: this.i18n.t("missileBooster.script.none"), selected: current === undefined },
      ...state.loadout.scripts.map((script) => ({
        value: String(script.moduleId),
        label: `${this.scriptDisplayName(script)} · ${missileScriptStatSuffix(script)}`,
        selected: current !== undefined && current.moduleId === script.moduleId,
      })),
    ];
  }

  private onScriptSelected(side: Side, index: number, value: string): void {
    const state = this.states.get(side);
    if (!state) return;
    if (value === "none") {
      state.activation[index].script = undefined;
    } else {
      const byId = typeIdFromString(value);
      if (byId === undefined) return;
      const script = state.loadout.scripts.find((s) => s.moduleId === byId);
      if (script === undefined) return;
      state.activation[index].script = script;
    }
    const script = state.activation[index].script;
    const nameSpan = this.computerNameSpans.get(side)?.[index];
    if (nameSpan) nameSpan.setAttribute("data-hint", this.describer.computerModuleEffect(state.loadout.computers[index], script, state.activation[index].overloaded));
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleComputer(side: Side, index: number, button: HTMLButtonElement, row: HTMLElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const activation = state.activation[index];
    activation.active = !activation.active;
    button.setAttribute("aria-pressed", String(activation.active));
    row.className = activation.active ? "ewar-row" : "ewar-row ewar-row-inactive";
    for (const child of row.children) {
      if (child instanceof HTMLButtonElement && child.getAttribute("data-index") === String(index)) {
        if (activation.active) child.removeAttribute("disabled");
        else child.setAttribute("disabled", "");
      }
    }
    const nameSpan = this.computerNameSpans.get(side)?.[index];
    if (nameSpan) nameSpan.setAttribute("data-hint", this.describer.computerModuleEffect(state.loadout.computers[index], activation.script, activation.overloaded));
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleComputerOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation[index].overloaded;
    state.activation[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));
    const nameSpan = this.computerNameSpans.get(side)?.[index];
    if (nameSpan) nameSpan.setAttribute("data-hint", this.describer.computerModuleEffect(state.loadout.computers[index], state.activation[index].script, overloaded));
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }
}

function sideId(side: Side): "ship-a" | "ship-b" {
  return side === "shipA" ? "ship-a" : "ship-b";
}

function typeIdFromString(value: string): TypeId | undefined {
  if (/^\d+$/.test(value)) return toTypeId(value);
  return undefined;
}
