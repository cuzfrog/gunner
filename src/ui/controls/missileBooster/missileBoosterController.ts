import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { MissileBoosterLoadout, MissileBoosterProjection, MissileBoosterSpec, MissileEnhancerSpec, MissileScriptSpec } from "../../../sim";
import type { StoredMissileBoosterActivation } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { missileScriptStatSuffix } from "../controlsFormat";
import { html } from "../markup";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem, IconActionImpl, SectionBlockImpl, spriteIcon } from "../shared";
import type { MissileBoosterController, MissileBoosterEls } from "./missileBoosterControllerContract";

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
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly states = new Map<Side, MissileBoosterState>();
  private readonly scriptPopups: Record<Side, Popup>;
  private readonly scriptGears = new Map<Side, { index: number; gear: HTMLButtonElement }>();
  private readonly scriptPopupEls = new Map<Side, HTMLElement>();
  private readonly computerNameSpans = new Map<Side, HTMLSpanElement[]>();
  private readonly scriptOptionList: SelectableListImpl;
  private readonly gearAction: IconActionImpl;
  private readonly overloadAction: IconActionImpl;
  private readonly sectionBlock: SectionBlockImpl;

  constructor(deps: { els: MissileBoosterEls; popupGroup: PopupGroup; imageCatalog: ImageCatalog; fittingImport: FittingImport; i18n: I18n; events: UiEvents }) {
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
      title: "",
      ariaHaspopup: "menu",
      ariaExpanded: false,
    });
    this.overloadAction = new IconActionImpl({
      buttonClass: "ewar-overload-button btn icon-button",
      iconSvg: spriteIcon("overload", 14, "currentColor", "overload-button-icon"),
      title: "",
    });
    this.sectionBlock = new SectionBlockImpl();
    this.scriptPopups = { shipA: this.buildScriptPopup("shipA"), shipB: this.buildScriptPopup("shipB") };
    this.popupGroup.register(this.scriptPopups.shipA);
    this.popupGroup.register(this.scriptPopups.shipB);
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

  private buildScriptPopup(side: Side): Popup {
    const section = this.els.sections[side];
    const popup = html`<div id="${sideId(side)}-missile-booster-script-popup" class="ewar-script-popup popup" role="menu" hidden></div>` as unknown as HTMLElement;
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
      contains: (target) => target instanceof Element && target.closest(`#${sideId(side)}-missile-booster-script-popup, #${sideId(side)}-missile-booster-section`) !== null,
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
      const title = this.computerDescription(state);
      this.appendSummaryItem(summary, state.loadout.computers[0].moduleId, active, state.loadout.computers.length, title);
    }
    if (state.loadout.enhancers.length > 0) {
      this.appendSummaryItem(summary, state.loadout.enhancers[0].moduleId, state.loadout.enhancers.length, state.loadout.enhancers.length, this.enhancerDescription(state));
    }
  }

  private computerDescription(state: MissileBoosterState): string {
    const projection: MissileBoosterProjection = { loadout: state.loadout, activation: { computers: state.activation } };
    const explosionRadius = this.bonusFor(projection, "explosionRadiusBonusPercent", "explosionRadiusMultiplier");
    const explosionVelocity = this.bonusFor(projection, "explosionVelocityBonusPercent", "explosionVelocityMultiplier");
    const missileVelocity = this.bonusFor(projection, "missileVelocityBonusPercent", "missileVelocityMultiplier");
    const flightTime = this.bonusFor(projection, "flightTimeBonusPercent", "flightTimeMultiplier");
    const parts: string[] = [];
    if (explosionRadius !== 0) parts.push(`${this.i18n.t("ewar.hover.explosionRadius")} ${explosionRadius > 0 ? "+" : ""}${explosionRadius.toFixed(1)}%`);
    if (explosionVelocity !== 0) parts.push(`${this.i18n.t("ewar.hover.explosionVelocity")} ${explosionVelocity > 0 ? "+" : ""}${explosionVelocity.toFixed(1)}%`);
    if (missileVelocity !== 0) parts.push(`${this.i18n.t("ewar.hover.missileVelocity")} ${missileVelocity > 0 ? "+" : ""}${missileVelocity.toFixed(1)}%`);
    if (flightTime !== 0) parts.push(`${this.i18n.t("ewar.hover.flightTime")} ${flightTime > 0 ? "+" : ""}${flightTime.toFixed(1)}%`);
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }

  private enhancerDescription(state: MissileBoosterState): string {
    const projection: MissileBoosterProjection = { loadout: state.loadout, activation: { computers: state.activation } };
    const explosionRadius = this.enhancerBonusFor(projection, "explosionRadiusBonusPercent");
    const explosionVelocity = this.enhancerBonusFor(projection, "explosionVelocityBonusPercent");
    const missileVelocity = this.enhancerBonusFor(projection, "missileVelocityBonusPercent");
    const flightTime = this.enhancerBonusFor(projection, "flightTimeBonusPercent");
    const parts: string[] = [];
    if (explosionRadius !== 0) parts.push(`${this.i18n.t("ewar.hover.explosionRadius")} ${explosionRadius > 0 ? "+" : ""}${explosionRadius.toFixed(1)}%`);
    if (explosionVelocity !== 0) parts.push(`${this.i18n.t("ewar.hover.explosionVelocity")} ${explosionVelocity > 0 ? "+" : ""}${explosionVelocity.toFixed(1)}%`);
    if (missileVelocity !== 0) parts.push(`${this.i18n.t("ewar.hover.missileVelocity")} ${missileVelocity > 0 ? "+" : ""}${missileVelocity.toFixed(1)}%`);
    if (flightTime !== 0) parts.push(`${this.i18n.t("ewar.hover.flightTime")} ${flightTime > 0 ? "+" : ""}${flightTime.toFixed(1)}%`);
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }

  private bonusFor(
    projection: MissileBoosterProjection,
    bonusKey: "explosionRadiusBonusPercent" | "explosionVelocityBonusPercent" | "missileVelocityBonusPercent" | "flightTimeBonusPercent",
    multiplierKey: "explosionRadiusMultiplier" | "explosionVelocityMultiplier" | "missileVelocityMultiplier" | "flightTimeMultiplier",
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

  private enhancerBonusFor(
    projection: MissileBoosterProjection,
    bonusKey: "explosionRadiusBonusPercent" | "explosionVelocityBonusPercent" | "missileVelocityBonusPercent" | "flightTimeBonusPercent",
  ): number {
    let total = 0;
    for (const enhancer of projection.loadout.enhancers) {
      total += enhancer[bonusKey];
    }
    return total;
  }

  private appendSummaryItem(summary: HTMLElement, moduleId: TypeId, active: number, total: number, title: string): void {
    const iconUrl = this.imageCatalog.itemIconUrl(moduleId);
    const item = html`<span class="ewar-summary-item" title=${title}><img class="ewar-summary-icon" alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}><span class="ewar-summary-count mono">${active}/${total}</span></span>` as unknown as HTMLSpanElement;
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
      const { button, nameSpan } = this.createModuleButton(activation.active, computer, activation.script);
      nameSpans.push(nameSpan);
      button.addEventListener("click", () => this.toggleComputer(side, i, button, row));
      row.appendChild(button);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, computer, () => this.toggleComputerOverload(side, i, overloadButton));
      row.appendChild(overloadButton);
      const gear = this.createScriptGear(side, i, activation.script, activation.active);
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

  private createModuleButton(active: boolean, computer: MissileBoosterSpec, script: MissileScriptSpec | undefined): { button: HTMLButtonElement; nameSpan: HTMLSpanElement } {
    const displayName = this.moduleDisplayName(computer);
    const effectTitle = this.computerModuleEffect(computer, script);
    const iconUrl = this.imageCatalog.itemIconUrl(computer.moduleId);
    const nameSpan = html`<span class="truncate" title=${effectTitle}>${displayName}</span>` as unknown as HTMLSpanElement;
    const button = html`<button type="button" class="ewar-module-toggle" aria-pressed=${String(active)} aria-label=${displayName}><img alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}>${nameSpan}</button>` as unknown as HTMLButtonElement;
    return { button, nameSpan };
  }

  private createEnhancerButton(enhancer: MissileEnhancerSpec): { button: HTMLButtonElement } {
    const displayName = this.moduleDisplayName(enhancer);
    const effectTitle = this.enhancerModuleEffect(enhancer);
    const iconUrl = this.imageCatalog.itemIconUrl(enhancer.moduleId);
    const button = html`<button type="button" class="ewar-module-toggle" aria-pressed="true" aria-label=${displayName}><img alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}><span class="truncate" title=${effectTitle}>${displayName}</span></button>` as unknown as HTMLButtonElement;
    return { button };
  }

  private computerModuleEffect(spec: MissileBoosterSpec, script: MissileScriptSpec | undefined): string {
    const explosionRadius = spec.explosionRadiusBonusPercent * (script?.explosionRadiusMultiplier ?? 1);
    const explosionVelocity = spec.explosionVelocityBonusPercent * (script?.explosionVelocityMultiplier ?? 1);
    const missileVelocity = spec.missileVelocityBonusPercent * (script?.missileVelocityMultiplier ?? 1);
    const flightTime = spec.flightTimeBonusPercent * (script?.flightTimeMultiplier ?? 1);
    const parts: string[] = [];
    if (explosionRadius !== 0) parts.push(`${this.i18n.t("ewar.hover.explosionRadius")} ${explosionRadius > 0 ? "+" : ""}${explosionRadius.toFixed(1)}%`);
    if (explosionVelocity !== 0) parts.push(`${this.i18n.t("ewar.hover.explosionVelocity")} ${explosionVelocity > 0 ? "+" : ""}${explosionVelocity.toFixed(1)}%`);
    if (missileVelocity !== 0) parts.push(`${this.i18n.t("ewar.hover.missileVelocity")} ${missileVelocity > 0 ? "+" : ""}${missileVelocity.toFixed(1)}%`);
    if (flightTime !== 0) parts.push(`${this.i18n.t("ewar.hover.flightTime")} ${flightTime > 0 ? "+" : ""}${flightTime.toFixed(1)}%`);
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }

  private enhancerModuleEffect(spec: MissileEnhancerSpec): string {
    const parts: string[] = [];
    if (spec.explosionRadiusBonusPercent !== 0) parts.push(`${this.i18n.t("ewar.hover.explosionRadius")} ${spec.explosionRadiusBonusPercent > 0 ? "+" : ""}${spec.explosionRadiusBonusPercent.toFixed(1)}%`);
    if (spec.explosionVelocityBonusPercent !== 0) parts.push(`${this.i18n.t("ewar.hover.explosionVelocity")} ${spec.explosionVelocityBonusPercent > 0 ? "+" : ""}${spec.explosionVelocityBonusPercent.toFixed(1)}%`);
    if (spec.missileVelocityBonusPercent !== 0) parts.push(`${this.i18n.t("ewar.hover.missileVelocity")} ${spec.missileVelocityBonusPercent > 0 ? "+" : ""}${spec.missileVelocityBonusPercent.toFixed(1)}%`);
    if (spec.flightTimeBonusPercent !== 0) parts.push(`${this.i18n.t("ewar.hover.flightTime")} ${spec.flightTimeBonusPercent > 0 ? "+" : ""}${spec.flightTimeBonusPercent.toFixed(1)}%`);
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }

  private createOverloadButton(active: boolean, overloaded: boolean, index: number, spec: { readonly moduleId: TypeId }, onToggle: () => void): HTMLButtonElement {
    const label = `${this.i18n.t("label.overload")} ${this.moduleDisplayName(spec)}`;
    const button = this.overloadAction.create(onToggle);
    button.setAttribute("data-index", String(index));
    button.setAttribute("aria-pressed", String(overloaded));
    button.setAttribute("title", label);
    button.setAttribute("aria-label", label);
    if (!active) button.setAttribute("disabled", "");
    return button;
  }

  private createScriptGear(side: Side, index: number, script: MissileScriptSpec | undefined, active: boolean): HTMLButtonElement {
    const gear = this.gearAction.create(() => this.openScriptPopup(side, index, gear));
    gear.setAttribute("data-index", String(index));
    gear.setAttribute("aria-controls", `${sideId(side)}-missile-booster-script-popup`);
    this.updateGearTitle(gear, script);
    if (!active) gear.setAttribute("disabled", "");
    return gear;
  }

  private updateGearTitle(gear: HTMLButtonElement, script: MissileScriptSpec | undefined): void {
    const name = this.scriptDisplayName(script);
    const title = `${name}${script ? ` · ${missileScriptStatSuffix(script)}` : ""}`;
    gear.setAttribute("title", title);
    gear.setAttribute("aria-label", title);
  }

  private openScriptPopup(side: Side, index: number, gear: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    this.scriptGears.set(side, { index, gear });
    const popup = this.scriptPopupEls.get(side);
    if (!popup) return;
    const current = state.activation[index].script;
    const items: SelectableItem[] = [
      { value: "none", label: this.i18n.t("missileBooster.script.none"), selected: current === undefined },
      ...state.loadout.scripts.map((script) => ({
        value: script.moduleId,
        label: `${this.scriptDisplayName(script)} · ${missileScriptStatSuffix(script)}`,
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

  private isSameScript(a: MissileScriptSpec | undefined, b: MissileScriptSpec | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    return a.moduleId === b.moduleId;
  }

  private setScript(side: Side, index: number, script: MissileScriptSpec | undefined, gear: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    state.activation[index].script = script;
    this.updateGearTitle(gear, script);
    const nameSpan = this.computerNameSpans.get(side)?.[index];
    if (nameSpan) nameSpan.title = this.computerModuleEffect(state.loadout.computers[index], script);
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

  private toggleComputerOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation[index].overloaded;
    state.activation[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));
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
