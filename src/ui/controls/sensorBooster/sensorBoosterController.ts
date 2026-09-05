import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { SensorBoostLoadout, SensorBoostProjection, SensorBoosterSpec, SensorBoosterScriptSpec, SignalAmplifierSpec } from "../../../sim";
import type { StoredSensorBoosterActivation } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { html } from "../markup";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem, IconActionImpl, SectionBlockImpl, spriteIcon } from "../shared";
import type { SensorBoosterController, SensorBoosterEls } from "./sensorBoosterControllerContract";
import type { SensorBoosterEffectDescriber } from "./sensorBoosterEffectDescriber";

interface MutableSensorBoosterActivation {
  active: boolean;
  overloaded: boolean;
  script: SensorBoosterScriptSpec | undefined;
}

interface SensorBoosterState {
  loadout: SensorBoostLoadout;
  activation: MutableSensorBoosterActivation[];
}

export class SensorBoosterControllerImpl implements SensorBoosterController {
  private readonly els: SensorBoosterEls;
  private readonly popupGroup: PopupGroup;
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly describer: SensorBoosterEffectDescriber;
  private readonly states = new Map<Side, SensorBoosterState>();
  private readonly scriptPopups: Record<Side, Popup>;
  private readonly scriptGears = new Map<Side, { index: number; gear: HTMLButtonElement }>();
  private readonly scriptPopupEls = new Map<Side, HTMLElement>();
  private readonly boosterNameSpans = new Map<Side, HTMLSpanElement[]>();
  private readonly scriptOptionList: SelectableListImpl;
  private readonly gearAction: IconActionImpl;
  private readonly overloadAction: IconActionImpl;
  private readonly sectionBlock: SectionBlockImpl;

  constructor(deps: { els: SensorBoosterEls; popupGroup: PopupGroup; imageCatalog: ImageCatalog; fittingImport: FittingImport; i18n: I18n; events: UiEvents; describer: SensorBoosterEffectDescriber }) {
    this.els = deps.els;
    this.popupGroup = deps.popupGroup;
    this.imageCatalog = deps.imageCatalog;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.describer = deps.describer;
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
    this.overloadAction = new IconActionImpl({
      buttonClass: "ewar-overload-button btn icon-button",
      iconSvg: spriteIcon("overload", 14, "currentColor", "overload-button-icon"),
      hint: "",
    });
    this.sectionBlock = new SectionBlockImpl();
    this.scriptPopups = { shipA: this.buildScriptPopup("shipA"), shipB: this.buildScriptPopup("shipB") };
    this.popupGroup.register(this.scriptPopups.shipA);
    this.popupGroup.register(this.scriptPopups.shipB);
    this.events.onFittingImported((side, imported) => this.setLoadout(side, imported.sensorBoosts));
    this.events.onLanguageChanged(() => this.render());
    this.render();
  }

  setLoadout(side: Side, loadout: SensorBoostLoadout): void {
    if (this.isEmpty(loadout)) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout) });
    }
    this.renderSide(side);
  }

  restore(side: Side, loadout: SensorBoostLoadout | undefined, saved?: readonly StoredSensorBoosterActivation[]): void {
    if (!loadout || this.isEmpty(loadout)) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout, saved) });
    }
    this.renderSide(side);
  }

  projection(side: Side): SensorBoostProjection | undefined {
    const state = this.states.get(side);
    if (!state || this.isEmpty(state.loadout)) return undefined;
    return { loadout: state.loadout, activation: state.activation };
  }

  capture(side: Side): readonly StoredSensorBoosterActivation[] | undefined {
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
    const popup = html`<div id="${sideId(side)}-sensor-booster-script-popup" class="ewar-script-popup popup" role="menu" hidden></div>` as unknown as HTMLElement;
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
      contains: (target) => target instanceof Element && target.closest(`#${sideId(side)}-sensor-booster-script-popup, #${sideId(side)}-sensor-booster-section`) !== null,
    };
  }

  private renderSide(side: Side): void {
    const section = this.els.sections[side];
    const summary = this.els.summaries[side];
    const state = this.states.get(side);
    this.scriptPopups[side].close();
    this.scriptGears.delete(side);
    this.boosterNameSpans.delete(side);
    section.innerHTML = "";
    section.appendChild(this.scriptPopupEls.get(side)!);
    if (!state || this.isEmpty(state.loadout)) {
      section.hidden = true;
      summary.innerHTML = "";
      return;
    }
    section.hidden = false;
    this.updateSummary(side);
    if (state.loadout.boosters.length > 0) {
      const rowContainer = html`<div></div>` as unknown as HTMLDivElement;
      this.renderBoosters(side, state, rowContainer);
      const rows = Array.from(rowContainer.children);
      const block = this.sectionBlock.create(this.i18n.t("label.sensorBooster.booster"), rows);
      section.appendChild(block);
    }
    if (state.loadout.amplifiers.length > 0) {
      const rowContainer = html`<div></div>` as unknown as HTMLDivElement;
      this.renderAmplifiers(side, state, rowContainer);
      const rows = Array.from(rowContainer.children);
      const block = this.sectionBlock.create(this.i18n.t("label.sensorBooster.amplifier"), rows);
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
    if (state.loadout.boosters.length > 0) {
      const active = state.activation.filter((a) => a.active).length;
      const hint = this.boosterDescription(state);
      this.appendSummaryItem(summary, state.loadout.boosters[0].moduleId, active, state.loadout.boosters.length, hint);
    }
    if (state.loadout.amplifiers.length > 0) {
      this.appendSummaryItem(summary, state.loadout.amplifiers[0].moduleId, state.loadout.amplifiers.length, state.loadout.amplifiers.length, this.amplifierDescription(state));
    }
  }

  private boosterDescription(state: SensorBoosterState): string {
    const projection: SensorBoostProjection = { loadout: state.loadout, activation: state.activation };
    return this.describer.boosterHint(projection);
  }

  private amplifierDescription(state: SensorBoosterState): string {
    const projection: SensorBoostProjection = { loadout: state.loadout, activation: state.activation };
    return this.describer.amplifierHint(projection);
  }

  private appendSummaryItem(summary: HTMLElement, moduleId: TypeId, active: number, total: number, hint: string): void {
    const iconUrl = this.imageCatalog.itemIconUrl(moduleId);
    const item = html`<span class="trigger-summary-item" data-hint=${hint}><img class="ewar-summary-icon" alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}><span class="trigger-summary-count mono">${active}/${total}</span></span>` as unknown as HTMLSpanElement;
    summary.appendChild(item);
  }

  private isEmpty(loadout: SensorBoostLoadout): boolean {
    return loadout.boosters.length === 0 && loadout.amplifiers.length === 0;
  }

  private clampActivation(loadout: SensorBoostLoadout, saved?: readonly StoredSensorBoosterActivation[]): MutableSensorBoosterActivation[] {
    return loadout.boosters.map((spec, i) => {
      const savedActivation = saved?.[i];
      const savedScript = savedActivation?.script;
      let script: SensorBoosterScriptSpec | undefined;
      if (savedScript === undefined) {
        script = spec.defaultScript;
      } else if (savedScript === "none" || savedScript === "") {
        script = undefined;
      } else {
        const byId = typeIdFromString(savedScript);
        script = byId !== undefined ? loadout.boosterScripts.find((s) => s.moduleId === byId) : undefined;
        if (script === undefined) script = spec.defaultScript;
      }
      return { active: savedActivation?.active ?? true, overloaded: savedActivation?.overloaded ?? false, script };
    });
  }

  private renderBoosters(side: Side, state: SensorBoosterState, section: HTMLElement): void {
    const nameSpans: HTMLSpanElement[] = [];
    for (let i = 0; i < state.loadout.boosters.length; i++) {
      const booster = state.loadout.boosters[i];
      const activation = state.activation[i];
      const row = html`<div class=${activation.active ? "ewar-row" : "ewar-row ewar-row-inactive"}></div>` as unknown as HTMLDivElement;
      const { button, nameSpan } = this.createModuleButton(activation.active, booster, activation.script, activation.overloaded);
      nameSpans.push(nameSpan);
      button.addEventListener("click", () => this.toggleBooster(side, i, button, row));
      row.appendChild(button);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, booster, () => this.toggleBoosterOverload(side, i, overloadButton));
      row.appendChild(overloadButton);
      const gear = this.createScriptGear(side, i, activation.script, activation.active);
      row.appendChild(gear);
      section.appendChild(row);
    }
    this.boosterNameSpans.set(side, nameSpans);
  }

  private renderAmplifiers(side: Side, state: SensorBoosterState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.amplifiers.length; i++) {
      const amplifier = state.loadout.amplifiers[i];
      const { button } = this.createAmplifierButton(amplifier);
      const row = html`<div class="ewar-row">${button}</div>` as unknown as HTMLDivElement;
      section.appendChild(row);
    }
  }

  private moduleDisplayName(spec: { readonly moduleId: TypeId }): string {
    return this.fittingImport.itemNameForId(spec.moduleId, this.i18n.current());
  }

  private scriptDisplayName(script: SensorBoosterScriptSpec | undefined): string {
    if (script === undefined) return this.i18n.t("sensorBooster.script.none");
    return this.fittingImport.itemNameForId(script.moduleId, this.i18n.current());
  }

  private createModuleButton(active: boolean, booster: SensorBoosterSpec, script: SensorBoosterScriptSpec | undefined, overloaded: boolean): { button: HTMLButtonElement; nameSpan: HTMLSpanElement } {
    const displayName = this.moduleDisplayName(booster);
    const effectTitle = this.describer.boosterModuleEffect(booster, script, overloaded);
    const iconUrl = this.imageCatalog.itemIconUrl(booster.moduleId);
    const nameSpan = html`<span class="truncate" data-hint=${effectTitle}>${displayName}</span>` as unknown as HTMLSpanElement;
    const button = html`<button type="button" class="ewar-module-toggle" aria-pressed=${String(active)} aria-label=${displayName}><img alt="" src=${iconUrl} hidden=${iconUrl === undefined ? "" : false}>${nameSpan}</button>` as unknown as HTMLButtonElement;
    return { button, nameSpan };
  }

  private createAmplifierButton(amplifier: SignalAmplifierSpec): { button: HTMLButtonElement } {
    const displayName = this.moduleDisplayName(amplifier);
    const effectTitle = this.describer.amplifierModuleEffect(amplifier);
    const iconUrl = this.imageCatalog.itemIconUrl(amplifier.moduleId);
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

  private createScriptGear(side: Side, index: number, script: SensorBoosterScriptSpec | undefined, active: boolean): HTMLButtonElement {
    const gear = this.gearAction.create(() => this.openScriptPopup(side, index, gear));
    gear.setAttribute("data-index", String(index));
    gear.setAttribute("aria-controls", `${sideId(side)}-sensor-booster-script-popup`);
    this.updateGearHint(gear, script);
    if (!active) gear.setAttribute("disabled", "");
    return gear;
  }

  private updateGearHint(gear: HTMLButtonElement, script: SensorBoosterScriptSpec | undefined): void {
    const name = this.scriptDisplayName(script);
    const hint = `${name}${script ? ` · ${scriptStatSuffix(script)}` : ""}`;
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
      { value: "none", label: this.i18n.t("sensorBooster.script.none"), selected: current === undefined },
      ...state.loadout.boosterScripts.map((script) => ({
        value: script.moduleId,
        label: `${this.scriptDisplayName(script)} · ${scriptStatSuffix(script)}`,
        selected: this.isSameScript(current, script),
      })),
    ];
    const buttons = this.scriptOptionList.render(popup, items);
    buttons[0].addEventListener("click", () => this.setScript(side, index, undefined, gear));
    for (let i = 0; i < state.loadout.boosterScripts.length; i++) {
      const script = state.loadout.boosterScripts[i];
      buttons[i + 1].addEventListener("click", () => this.setScript(side, index, script, gear));
    }
    gear.setAttribute("aria-expanded", "true");
    this.scriptPopups[side].open();
  }

  private isSameScript(a: SensorBoosterScriptSpec | undefined, b: SensorBoosterScriptSpec | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    return a.moduleId === b.moduleId;
  }

  private setScript(side: Side, index: number, script: SensorBoosterScriptSpec | undefined, gear: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    state.activation[index].script = script;
    this.updateGearHint(gear, script);
    const nameSpan = this.boosterNameSpans.get(side)?.[index];
    if (nameSpan) nameSpan.setAttribute("data-hint", this.describer.boosterModuleEffect(state.loadout.boosters[index], script, state.activation[index].overloaded));
    this.scriptPopups[side].close();
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleBooster(side: Side, index: number, button: HTMLButtonElement, row: HTMLElement): void {
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
    const nameSpan = this.boosterNameSpans.get(side)?.[index];
    if (nameSpan) nameSpan.setAttribute("data-hint", this.describer.boosterModuleEffect(state.loadout.boosters[index], activation.script, activation.overloaded));
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleBoosterOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation[index].overloaded;
    state.activation[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));
    const nameSpan = this.boosterNameSpans.get(side)?.[index];
    if (nameSpan) nameSpan.setAttribute("data-hint", this.describer.boosterModuleEffect(state.loadout.boosters[index], state.activation[index].script, overloaded));
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

function scriptStatSuffix(script: SensorBoosterScriptSpec): string {
  const parts: string[] = [];
  if (script.scanResolutionMultiplier !== 0) parts.push(`Scan Res ×${script.scanResolutionMultiplier}`);
  if (script.maxTargetRangeMultiplier !== 0) parts.push(`Range ×${script.maxTargetRangeMultiplier}`);
  return parts.length > 0 ? parts.join(" · ") : "ECCM";
}
