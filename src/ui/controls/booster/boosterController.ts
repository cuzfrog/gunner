import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { BoostLoadout, TurretBoostProjection, TurretScriptSpec, TrackingBoosterSpec } from "../../../sim";
import type { StoredBoosterActivation } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { boosterScriptStatSuffix } from "../controlsFormat";
import { html } from "../markup";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem, IconActionImpl, SectionBlockImpl, spriteIcon } from "../shared";
import type { BoosterController, BoosterEls } from "./boosterControllerContract";

interface MutableBoosterActivation {
  active: boolean;
  overloaded: boolean;
  script: TurretScriptSpec | undefined;
}

interface BoosterState {
  loadout: BoostLoadout;
  activation: MutableBoosterActivation[];
}

export class BoosterControllerImpl implements BoosterController {
  private readonly els: BoosterEls;
  private readonly popupGroup: PopupGroup;
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly states = new Map<Side, BoosterState>();
  private readonly scriptPopups: Record<Side, Popup>;
  private readonly scriptGears = new Map<Side, { index: number; gear: HTMLButtonElement }>();
  private readonly scriptPopupEls = new Map<Side, HTMLElement>();
  private readonly computerNameSpans = new Map<Side, HTMLSpanElement[]>();
  private readonly scriptOptionList: SelectableListImpl;
  private readonly gearAction: IconActionImpl;
  private readonly sectionBlock: SectionBlockImpl;

  constructor(deps: { els: BoosterEls; popupGroup: PopupGroup; imageCatalog: ImageCatalog; fittingImport: FittingImport; i18n: I18n; events: UiEvents }) {
    this.els = deps.els;
    this.popupGroup = deps.popupGroup;
    this.imageCatalog = deps.imageCatalog;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.scriptOptionList = new SelectableListImpl({
      itemClass: "ewar-script-option",
      nameClass: "",
      role: "menuitem",
    });
    this.gearAction = new IconActionImpl({
      buttonClass: "ewar-script-gear btn icon-button",
      iconSvg: spriteIcon("gear"),
      hint: "",
      ariaHaspopup: "menu",
      ariaExpanded: false,
    });
    this.sectionBlock = new SectionBlockImpl();
    this.scriptPopups = { shipA: this.buildScriptPopup("shipA"), shipB: this.buildScriptPopup("shipB") };
    this.popupGroup.register(this.scriptPopups.shipA);
    this.popupGroup.register(this.scriptPopups.shipB);
    this.events.onFittingImported((side, imported) => this.setLoadout(side, imported.boosts));
    this.events.onLanguageChanged(() => this.render());
    this.render();
  }

  setLoadout(side: Side, loadout: BoostLoadout): void {
    if (loadout.computers.length === 0) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout) });
    }
    this.renderSide(side);
  }

  restore(side: Side, loadout: BoostLoadout | undefined, saved?: readonly StoredBoosterActivation[]): void {
    if (!loadout || loadout.computers.length === 0) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout, saved) });
    }
    this.renderSide(side);
  }

  projection(side: Side): TurretBoostProjection | undefined {
    const state = this.states.get(side);
    if (!state || state.loadout.computers.length === 0) return undefined;
    return { loadout: state.loadout, activation: { computers: state.activation } };
  }

  capture(side: Side): readonly StoredBoosterActivation[] | undefined {
    const state = this.states.get(side);
    if (!state || state.loadout.computers.length === 0) return undefined;
    return state.activation.map((a) => ({
      active: a.active,
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

  private buildScriptPopup(side: Side): Popup {
    const section = this.els.sections[side];
    const popup = html`<div id="${sideId(side)}-booster-script-popup" class="ewar-script-popup popup" role="menu" hidden></div>` as unknown as HTMLElement;
    section.appendChild(popup);
    this.scriptPopupEls.set(side, popup);
    return {
      isOpen: () => !popup.hidden,
      open: () => { popup.hidden = false; },
      close: () => {
        popup.hidden = true;
        const gear = this.scriptGears.get(side)?.gear;
        if (gear) gear.setAttribute("aria-expanded", "false");
      },
      focusTrigger: () => this.scriptGears.get(side)?.gear?.focus(),
      contains: (target) => target instanceof Element && target.closest(`#${sideId(side)}-booster-script-popup, #${sideId(side)}-booster-section`) !== null,
    };
  }

  private renderSide(side: Side): void {
    const section = this.els.sections[side];
    const summary = this.els.summaries[side];
    const state = this.states.get(side);
    this.scriptPopups[side].close();
    this.scriptGears.delete(side);
    this.computerNameSpans.delete(side);
    section.innerHTML = "";
    section.appendChild(this.scriptPopupEls.get(side)!);
    if (!state || state.loadout.computers.length === 0) {
      section.hidden = true;
      summary.innerHTML = "";
      return;
    }
    section.hidden = false;
    this.updateSummary(side);
    const rowContainer = html`<div></div>` as unknown as HTMLDivElement;
    this.renderComputers(side, state, rowContainer);
    const rows = Array.from(rowContainer.children);
    const block = this.sectionBlock.create(this.i18n.t("label.booster.computer"), rows);
    section.appendChild(block);
  }

  private updateSummary(side: Side): void {
    const summary = this.els.summaries[side];
    const state = this.states.get(side);
    summary.innerHTML = "";
    if (!state || state.loadout.computers.length === 0) {
      summary.textContent = "";
      return;
    }
    const active = state.activation.filter((a) => a.active).length;
    const hint = this.boosterDescription(state);
    this.appendSummaryItem(summary, state.loadout.computers[0].moduleId, active, state.loadout.computers.length, hint);
  }

  private boosterDescription(state: BoosterState): string {
    const projection: TurretBoostProjection = { loadout: state.loadout, activation: { computers: state.activation } };
    const tracking = this.bonusFor(projection, "trackingBonusPercent", "trackingMultiplier");
    const optimal = this.bonusFor(projection, "optimalBonusPercent", "optimalMultiplier");
    const falloff = this.bonusFor(projection, "falloffBonusPercent", "falloffMultiplier");
    const parts: string[] = [];
    if (tracking !== 0) parts.push(`${this.i18n.t("ewar.hover.tracking")} ${tracking > 0 ? "+" : ""}${tracking.toFixed(1)}%`);
    if (optimal !== 0) parts.push(`${this.i18n.t("ewar.hover.optimal")} ${optimal > 0 ? "+" : ""}${optimal.toFixed(1)}%`);
    if (falloff !== 0) parts.push(`${this.i18n.t("ewar.hover.falloff")} ${falloff > 0 ? "+" : ""}${falloff.toFixed(1)}%`);
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }

  private bonusFor(
    projection: TurretBoostProjection,
    bonusKey: "trackingBonusPercent" | "optimalBonusPercent" | "falloffBonusPercent",
    multiplierKey: "trackingMultiplier" | "optimalMultiplier" | "falloffMultiplier",
  ): number {
    let total = 0;
    for (let i = 0; i < projection.loadout.computers.length; i++) {
      const spec = projection.loadout.computers[i];
      const activation = projection.activation?.computers[i];
      if (!activation || !activation.active) continue;
      const multiplier = activation.script?.[multiplierKey] ?? 1;
      total += spec[bonusKey] * multiplier;
    }
    return total;
  }

  private appendSummaryItem(summary: HTMLElement, moduleId: TypeId, active: number, total: number, hint: string): void {
    const iconUrl = this.imageCatalog.itemIconUrl(moduleId);
    const item = html`<span class="trigger-summary-item" data-hint=${hint}><img class="ewar-summary-icon" alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}><span class="trigger-summary-count mono">${active}/${total}</span></span>` as unknown as HTMLSpanElement;
    summary.appendChild(item);
  }

  private clampActivation(loadout: BoostLoadout, saved?: readonly StoredBoosterActivation[]): MutableBoosterActivation[] {
    return loadout.computers.map((spec, i) => {
      const savedActivation = saved?.[i];
      const savedScript = savedActivation?.script;
      let script: TurretScriptSpec | undefined;
      if (savedScript === undefined) {
        script = spec.defaultScript;
      } else if (savedScript === "none" || savedScript === "") {
        script = undefined;
      } else {
        const byId = typeIdFromString(savedScript);
        script = byId !== undefined ? loadout.scripts.find((s) => s.moduleId === byId) : undefined;
        if (script === undefined) script = spec.defaultScript;
      }
      return { active: savedActivation?.active ?? true, overloaded: false, script };
    });
  }

  private renderComputers(side: Side, state: BoosterState, section: HTMLElement): void {
    const nameSpans: HTMLSpanElement[] = [];
    for (let i = 0; i < state.loadout.computers.length; i++) {
      const computer = state.loadout.computers[i];
      const activation = state.activation[i];
      const row = html`<div class=${activation.active ? "ewar-row" : "ewar-row ewar-row-inactive"}></div>` as unknown as HTMLDivElement;
      const { button, nameSpan } = this.createModuleButton(activation.active, computer, activation.script);
      nameSpans.push(nameSpan);
      button.addEventListener("click", () => this.toggleComputer(side, i, button, row));
      row.appendChild(button);
      const gear = this.createScriptGear(side, i, activation.script, activation.active);
      row.appendChild(gear);
      section.appendChild(row);
    }
    this.computerNameSpans.set(side, nameSpans);
  }

  private moduleDisplayName(spec: { readonly moduleId: TypeId }): string {
    return this.fittingImport.itemNameForId(spec.moduleId, this.i18n.current());
  }

  private scriptDisplayName(script: TurretScriptSpec | undefined): string {
    if (script === undefined) return this.i18n.t("ewar.script.none");
    return this.fittingImport.itemNameForId(script.moduleId, this.i18n.current());
  }

  private createModuleButton(active: boolean, computer: TrackingBoosterSpec, script: TurretScriptSpec | undefined): { button: HTMLButtonElement; nameSpan: HTMLSpanElement } {
    const displayName = this.moduleDisplayName(computer);
    const effectTitle = this.boosterModuleEffect(computer, script);
    const iconUrl = this.imageCatalog.itemIconUrl(computer.moduleId);
    const nameSpan = html`<span class="truncate" data-hint=${effectTitle}>${displayName}</span>` as unknown as HTMLSpanElement;
    const button = html`<button type="button" class="ewar-module-toggle" aria-pressed=${String(active)} aria-label=${displayName}><img alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}>${nameSpan}</button>` as unknown as HTMLButtonElement;
    return { button, nameSpan };
  }

  private boosterModuleEffect(spec: TrackingBoosterSpec, script: TurretScriptSpec | undefined): string {
    const tracking = spec.trackingBonusPercent * (script?.trackingMultiplier ?? 1);
    const optimal = spec.optimalBonusPercent * (script?.optimalMultiplier ?? 1);
    const falloff = spec.falloffBonusPercent * (script?.falloffMultiplier ?? 1);
    const parts: string[] = [];
    if (tracking !== 0) parts.push(`${this.i18n.t("ewar.hover.tracking")} ${tracking > 0 ? "+" : ""}${tracking.toFixed(1)}%`);
    if (optimal !== 0) parts.push(`${this.i18n.t("ewar.hover.optimal")} ${optimal > 0 ? "+" : ""}${optimal.toFixed(1)}%`);
    if (falloff !== 0) parts.push(`${this.i18n.t("ewar.hover.falloff")} ${falloff > 0 ? "+" : ""}${falloff.toFixed(1)}%`);
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }

  private createScriptGear(side: Side, index: number, script: TurretScriptSpec | undefined, active: boolean): HTMLButtonElement {
    const gear = this.gearAction.create(() => this.openScriptPopup(side, index, gear));
    gear.setAttribute("data-index", String(index));
    gear.setAttribute("aria-controls", `${sideId(side)}-booster-script-popup`);
    this.updateGearHint(gear, script);
    if (!active) gear.setAttribute("disabled", "");
    return gear;
  }

  private updateGearHint(gear: HTMLButtonElement, script: TurretScriptSpec | undefined): void {
    const name = this.scriptDisplayName(script);
    const hint = `${name}${script ? ` · ${boosterScriptStatSuffix(script)}` : ""}`;
    gear.setAttribute("data-hint", hint);
    gear.setAttribute("aria-label", hint);
  }

  private openScriptPopup(side: Side, index: number, gear: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    this.scriptGears.set(side, { index, gear });
    const popup = this.scriptPopupEls.get(side);
    if (!popup) return;
    const current = state.activation[index].script;
    const items: SelectableItem[] = [
      { value: "none", label: this.i18n.t("ewar.script.none"), selected: current === undefined },
      ...state.loadout.scripts.map((script) => ({
        value: script.moduleId,
        label: `${this.scriptDisplayName(script)} · ${boosterScriptStatSuffix(script)}`,
        selected: this.isSameScript(current, script),
      })),
    ];
    const buttons = this.scriptOptionList.render(popup, items);
    buttons[0].addEventListener("click", () => this.setScript(side, index, undefined, gear));
    for (let i = 0; i < state.loadout.scripts.length; i++) {
      const script = state.loadout.scripts[i];
      buttons[i + 1].addEventListener("click", () => this.setScript(side, index, script, gear));
    }
    gear.setAttribute("aria-expanded", "true");
    this.scriptPopups[side].open();
  }

  private isSameScript(a: TurretScriptSpec | undefined, b: TurretScriptSpec | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    return a.moduleId === b.moduleId;
  }

  private setScript(side: Side, index: number, script: TurretScriptSpec | undefined, gear: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    state.activation[index].script = script;
    this.updateGearHint(gear, script);
    const nameSpan = this.computerNameSpans.get(side)?.[index];
    if (nameSpan) nameSpan.setAttribute("data-hint", this.boosterModuleEffect(state.loadout.computers[index], script));
    this.scriptPopups[side].close();
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
    this.renderSide(side);
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
