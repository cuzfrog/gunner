import { toTypeId, type TypeId } from "../../../gamedata/ids";
import { type DisruptionScriptSpec, type EwarActivation, type EwarLoadout, type EwarProjection, type StasisGrapplerSpec, type WarpScramblerSpec } from "../../../sim";
import type { StoredDisruptionScript, StoredEwarActivation } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { scriptStatSuffix } from "../controlsFormat";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem, IconActionImpl, SectionBlockImpl } from "../shared";
import type { EwarController, EwarEls } from "./ewarControllerContract";
import type { EwarEffectDescriber } from "./ewarEffectDescriber";

interface MutableEwarActivation {
  webs: { active: boolean; overloaded: boolean }[];
  grapplers: { active: boolean; overloaded: boolean }[];
  disruptors: { active: boolean; overloaded: boolean; script: DisruptionScriptSpec | undefined }[];
  scramblers: { active: boolean; overloaded: boolean }[];
}

interface EwarState {
  loadout: EwarLoadout;
  activation: MutableEwarActivation;
}

export class EwarControllerImpl implements EwarController {
  private readonly els: EwarEls;
  private readonly popupGroup: PopupGroup;
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly ewarEffectDescriber: EwarEffectDescriber;
  private readonly events: UiEvents;
  private readonly states = new Map<Side, EwarState>();
  private readonly popups: Record<Side, Popup>;
  private readonly scriptPopups: Record<Side, Popup>;
  private readonly scriptGears = new Map<Side, { index: number; gear: HTMLButtonElement }>();
  private readonly scriptPopupEls = new Map<Side, HTMLElement>();
  private readonly disruptorNameSpans = new Map<Side, HTMLSpanElement[]>();
  private readonly scriptOptionList: SelectableListImpl;
  private readonly gearAction: IconActionImpl;
  private readonly overloadAction: IconActionImpl;
  private readonly sectionBlock: SectionBlockImpl;

  constructor(deps: { els: EwarEls; popupGroup: PopupGroup; imageCatalog: ImageCatalog; fittingImport: FittingImport; i18n: I18n; ewarEffectDescriber: EwarEffectDescriber; events: UiEvents }) {
    this.els = deps.els;
    this.popupGroup = deps.popupGroup;
    this.imageCatalog = deps.imageCatalog;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.ewarEffectDescriber = deps.ewarEffectDescriber;
    this.events = deps.events;
    this.scriptOptionList = new SelectableListImpl({
      itemClass: "ewar-script-option",
      nameClass: "ewar-script-name",
      iconClass: "ewar-script-icon",
      role: "menuitem",
    });
    this.gearAction = new IconActionImpl({
      buttonClass: "ewar-script-gear btn icon-button",
      iconSvg: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><use href="icons.svg#gear"></use></svg>',
      title: "",
      ariaHaspopup: "menu",
      ariaExpanded: false,
    });
    this.overloadAction = new IconActionImpl({
      buttonClass: "ewar-overload-button btn icon-button",
      iconSvg: '<svg class="overload-button-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><use href="icons.svg#overload"></use></svg>',
      title: "",
    });
    this.sectionBlock = new SectionBlockImpl();
    this.scriptPopups = { shipA: this.buildScriptPopup("shipA"), shipB: this.buildScriptPopup("shipB") };
    this.popups = { shipA: this.buildPopup("shipA"), shipB: this.buildPopup("shipB") };
    this.popupGroup.register(this.scriptPopups.shipA);
    this.popupGroup.register(this.scriptPopups.shipB);
    this.popupGroup.register(this.popups.shipA);
    this.popupGroup.register(this.popups.shipB);
    this.els.shipAEwarTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popups.shipA));
    this.els.shipBEwarTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popups.shipB));
    this.events.onFittingImported((side, imported) => this.setLoadout(side, imported.ewar));
    this.render();
  }

  setLoadout(side: Side, loadout: EwarLoadout): void {
    if (this.isEmpty(loadout)) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout) });
    }
    this.renderSide(side);
  }

  restore(side: Side, loadout: EwarLoadout | undefined, saved?: StoredEwarActivation): void {
    if (!loadout || this.isEmpty(loadout)) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout, saved) });
    }
    this.renderSide(side);
  }

  projection(side: Side): EwarProjection | undefined {
    const state = this.states.get(side);
    if (!state || this.isEmpty(state.loadout)) return undefined;
    return { loadout: state.loadout, activation: state.activation };
  }

  capture(side: Side): StoredEwarActivation | undefined {
    const state = this.states.get(side);
    if (!state || this.isEmpty(state.loadout)) return undefined;
    const storedScramblers = state.activation.scramblers.length > 0
      ? state.activation.scramblers.map((s) => ({ active: s.active, overloaded: s.overloaded }))
      : undefined;
    return {
      webs: state.activation.webs.map((w) => ({ active: w.active, overloaded: w.overloaded })),
      grapplers: state.activation.grapplers.map((g) => ({ active: g.active, overloaded: g.overloaded })),
      disruptors: state.activation.disruptors.map((d) => ({
        active: d.active,
        overloaded: d.overloaded,
        script: d.script?.moduleId ?? "none",
      })),
      ...(storedScramblers !== undefined ? { scramblers: storedScramblers } : {}),
    };
  }

  render(): void {
    this.renderSide("shipA");
    this.renderSide("shipB");
  }

  updateSummaries(): void {
    this.updateSummary("shipA");
    this.updateSummary("shipB");
  }

  private buildPopup(side: Side): Popup {
    const trigger = side === "shipA" ? this.els.shipAEwarTrigger : this.els.shipBEwarTrigger;
    const popup = side === "shipA" ? this.els.shipAEwarPopup : this.els.shipBEwarPopup;
    return {
      isOpen: () => !popup.hidden,
      open: () => { popup.hidden = false; trigger.setAttribute("aria-expanded", "true"); },
      close: () => {
        this.scriptPopups[side].close();
        popup.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      },
      focusTrigger: () => trigger.focus(),
      contains: (shipB) => shipB instanceof Element && shipB.closest(`#${sideId(side)}-ewar-field`) !== null,
    };
  }

  private buildScriptPopup(side: Side): Popup {
    const field = side === "shipA" ? this.els.shipAEwarField : this.els.shipBEwarField;
    const popup = document.createElement("div");
    popup.id = `${sideId(side)}-ewar-script-popup`;
    popup.className = "ewar-script-popup popup";
    popup.setAttribute("role", "menu");
    popup.hidden = true;
    field.appendChild(popup);
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
      contains: (shipB) => shipB instanceof Element && shipB.closest(`#${sideId(side)}-ewar-field`) !== null,
    };
  }

  private renderSide(side: Side): void {
    const trigger = side === "shipA" ? this.els.shipAEwarTrigger : this.els.shipBEwarTrigger;
    const popup = side === "shipA" ? this.els.shipAEwarPopup : this.els.shipBEwarPopup;
    const section = side === "shipA" ? this.els.shipAEwarSection : this.els.shipBEwarSection;
    const summary = side === "shipA" ? this.els.shipAEwarSummary : this.els.shipBEwarSummary;
    const state = this.states.get(side);
    const modulesLabel = this.i18n.t("label.modules");
    const labelSpan = trigger.querySelector?.(".ewar-label");
    if (labelSpan) labelSpan.textContent = modulesLabel;
    trigger.setAttribute("aria-label", modulesLabel);
    popup.setAttribute("aria-label", modulesLabel);
    this.scriptPopups[side].close();
    this.scriptGears.delete(side);
    this.disruptorNameSpans.delete(side);
    section.innerHTML = "";
    if (!state || this.isEmpty(state.loadout)) {
      trigger.disabled = true;
      trigger.title = this.i18n.t("title.ewar.empty");
      summary.innerHTML = "";
      this.popups[side].close();
      return;
    }
    trigger.disabled = false;
    trigger.title = "";
    this.updateSummary(side);
    const heading = document.createElement("div");
    heading.className = "preview-section-label";
    heading.textContent = modulesLabel;
    section.appendChild(heading);
    if (state.loadout.webs.length > 0) {
      this.renderSection(section, "label.ewar.web", (container) => this.renderWebs(side, state, container));
    }
    if (state.loadout.grapplers.length > 0) {
      this.renderSection(section, "label.ewar.grappler", (container) => this.renderGrapplers(side, state, container));
    }
    if (state.loadout.disruptors.length > 0) {
      this.renderSection(section, "label.ewar.disruptor", (container) => this.renderDisruptors(side, state, container));
    }
    if (state.loadout.scramblers.length > 0) {
      this.renderSection(section, "label.ewar.scrambler", (container) => this.renderScramblers(side, state, container));
    }
    this.popups[side].close();
  }

  private renderSection(
    parent: HTMLElement,
    labelKey: "label.ewar.web" | "label.ewar.grappler" | "label.ewar.disruptor" | "label.ewar.scrambler",
    renderRows: (container: HTMLElement) => void,
  ): void {
    const rowContainer = document.createElement("div");
    renderRows(rowContainer);
    const rows = Array.from(rowContainer.children) as unknown as (Element | DocumentFragment)[];
    const section = this.sectionBlock.create(this.i18n.t(labelKey), rows);
    parent.appendChild(section);
  }

  private updateSummary(side: Side): void {
    const summary = side === "shipA" ? this.els.shipAEwarSummary : this.els.shipBEwarSummary;
    const state = this.states.get(side);
    summary.innerHTML = "";
    if (!state || this.isEmpty(state.loadout)) {
      summary.textContent = "";
      return;
    }
    const projection: EwarProjection = { loadout: state.loadout, activation: state.activation };
    const webTotal = state.loadout.webs.length;
    const webActive = state.activation.webs.filter((w) => w.active).length;
    const webTitle = webTotal > 0 ? this.ewarEffectDescriber.webHint(projection) : "";
    if (webTotal > 0) this.appendSummaryItem(summary, state.loadout.webs[0].moduleId, webActive, webTotal, webTitle);
    const grapplerTotal = state.loadout.grapplers.length;
    const grapplerActive = state.activation.grapplers.filter((g) => g.active).length;
    const grapplerTitle = grapplerTotal > 0 ? this.ewarEffectDescriber.grapplerHint(projection) : "";
    if (grapplerTotal > 0) this.appendSummaryItem(summary, state.loadout.grapplers[0].moduleId, grapplerActive, grapplerTotal, grapplerTitle);
    const disruptorTotal = state.loadout.disruptors.length;
    const disruptorActive = state.activation.disruptors.filter((d) => d.active).length;
    const disruptorTitle = disruptorTotal > 0 ? this.ewarEffectDescriber.disruptorHint(projection) : "";
    if (disruptorTotal > 0) this.appendSummaryItem(summary, state.loadout.disruptors[0].moduleId, disruptorActive, disruptorTotal, disruptorTitle);
    const scramblerActive = state.activation.scramblers.filter((s) => s.active).length;
    const scramblerTitle = state.loadout.scramblers.length > 0 ? this.ewarEffectDescriber.scramblerHint(projection) : "";
    if (state.loadout.scramblers.length > 0) this.appendSummaryItem(summary, state.loadout.scramblers[0].moduleId, scramblerActive, state.loadout.scramblers.length, scramblerTitle);
  }

  private appendSummaryItem(summary: HTMLElement, moduleId: TypeId, active: number, total: number, title: string): void {
    const item = document.createElement("span");
    item.className = "ewar-summary-item";
    const iconUrl = this.imageCatalog.itemIconUrl(moduleId);
    const img = document.createElement("img");
    img.className = "ewar-summary-icon";
    img.alt = "";
    if (iconUrl !== undefined) img.src = iconUrl;
    img.hidden = iconUrl === undefined;
    item.appendChild(img);
    const count = document.createElement("span");
    count.className = "ewar-summary-count mono";
    count.textContent = `${active}/${total}`;
    item.appendChild(count);
    item.setAttribute("title", title);
    summary.appendChild(item);
  }

  private isEmpty(loadout: EwarLoadout): boolean {
    return loadout.webs.length === 0 && loadout.grapplers.length === 0 && loadout.disruptors.length === 0 && loadout.scramblers.length === 0;
  }

  private clampActivation(loadout: EwarLoadout, saved?: StoredEwarActivation): MutableEwarActivation {
    return {
      webs: loadout.webs.map((_, i) => {
        const savedWeb = saved?.webs?.[i];
        const active = typeof savedWeb === "boolean" ? savedWeb : savedWeb?.active ?? true;
        const overloaded = typeof savedWeb === "boolean" ? false : savedWeb?.overloaded ?? false;
        return { active, overloaded };
      }),
      grapplers: loadout.grapplers.map((_, i) => {
        const savedGrappler = saved?.grapplers?.[i];
        const active = typeof savedGrappler === "boolean" ? savedGrappler : savedGrappler?.active ?? true;
        const overloaded = typeof savedGrappler === "boolean" ? false : savedGrappler?.overloaded ?? false;
        return { active, overloaded };
      }),
      disruptors: loadout.disruptors.map((disruptor, i) => {
        const savedDisruptor = saved?.disruptors?.[i];
        const savedScript = savedDisruptor?.script;
        let script: DisruptionScriptSpec | undefined;
        if (savedScript === undefined) {
          script = disruptor.defaultScript;
        } else if (savedScript === "none") {
          script = undefined;
        } else {
          const byId = typeIdFromString(savedScript);
          script = byId !== undefined ? loadout.scripts.find((s) => s.moduleId === byId) : undefined;
          if (script === undefined) script = disruptor.defaultScript;
        }
        return {
          active: savedDisruptor?.active ?? true,
          overloaded: savedDisruptor?.overloaded ?? false,
          script,
        };
      }),
      scramblers: loadout.scramblers.map((_, i) => {
        const savedScrambler = saved?.scramblers?.[i];
        const active = typeof savedScrambler === "boolean" ? savedScrambler : savedScrambler?.active ?? true;
        const overloaded = typeof savedScrambler === "boolean" ? false : savedScrambler?.overloaded ?? false;
        return { active, overloaded };
      }),
    };
  }

  private renderWebs(side: Side, state: EwarState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.webs.length; i++) {
      const web = state.loadout.webs[i];
      const active = state.activation.webs[i].active;
      const overloaded = state.activation.webs[i].overloaded;
      const row = document.createElement("div");
      row.className = active ? "ewar-row" : "ewar-row ewar-row-inactive";
      const { button } = this.createModuleButton(active, web, this.ewarEffectDescriber.webModuleEffect(web));
      const overloadButton = this.createOverloadButton(active, overloaded, i, web, () => this.toggleWebOverload(side, i, overloadButton));
      button.addEventListener("click", () => this.toggleWeb(side, i, button, row));
      row.appendChild(button);
      row.appendChild(overloadButton);
      section.appendChild(row);
    }
  }

  private renderGrapplers(side: Side, state: EwarState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.grapplers.length; i++) {
      const grappler: StasisGrapplerSpec = state.loadout.grapplers[i];
      const activation = state.activation.grapplers[i];
      const row = document.createElement("div");
      row.className = activation.active ? "ewar-row" : "ewar-row ewar-row-inactive";
      const { button } = this.createModuleButton(activation.active, grappler, this.ewarEffectDescriber.grapplerModuleEffect(grappler));
      const onToggle = () => this.toggleGrapplerOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, grappler, onToggle);
      button.addEventListener("click", () => this.toggleGrappler(side, i, button, row));
      row.appendChild(button);
      row.appendChild(overloadButton);
      section.appendChild(row);
    }
  }

  private renderDisruptors(side: Side, state: EwarState, section: HTMLElement): void {
    const nameSpans: HTMLSpanElement[] = [];
    for (let i = 0; i < state.loadout.disruptors.length; i++) {
      const disruptor = state.loadout.disruptors[i];
      const activation = state.activation.disruptors[i];
      const row = document.createElement("div");
      row.className = activation.active ? "ewar-row" : "ewar-row ewar-row-inactive";
      const { button, nameSpan } = this.createModuleButton(activation.active, disruptor, this.ewarEffectDescriber.disruptorModuleEffect(disruptor, activation.script));
      nameSpans.push(nameSpan);
      const onToggle = () => this.toggleDisruptorOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, disruptor, onToggle);
      button.addEventListener("click", () => this.toggleDisruptor(side, i, button, row));
      row.appendChild(button);
      row.appendChild(overloadButton);
      const gear = this.createScriptGear(side, i, activation.script, activation.active);
      row.appendChild(gear);
      section.appendChild(row);
    }
    this.disruptorNameSpans.set(side, nameSpans);
  }

  private renderScramblers(side: Side, state: EwarState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.scramblers.length; i++) {
      const scrambler: WarpScramblerSpec = state.loadout.scramblers[i];
      const activation = state.activation.scramblers[i];
      const row = document.createElement("div");
      row.className = activation.active ? "ewar-row" : "ewar-row ewar-row-inactive";
      const { button } = this.createModuleButton(activation.active, scrambler, this.ewarEffectDescriber.scramblerModuleEffect());
      const onToggle = () => this.toggleScramblerOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, scrambler, onToggle);
      button.addEventListener("click", () => this.toggleScrambler(side, i, button, row));
      row.appendChild(button);
      row.appendChild(overloadButton);
      section.appendChild(row);
    }
  }

  private moduleDisplayName(spec: { readonly moduleId: TypeId }): string {
    return this.fittingImport.itemNameForId(spec.moduleId, this.i18n.current());
  }

  private createModuleButton(active: boolean, spec: { readonly moduleId: TypeId }, effectTitle: string): { button: HTMLButtonElement; nameSpan: HTMLSpanElement } {
    const displayName = this.moduleDisplayName(spec);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ewar-module-toggle";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", displayName);
    const iconUrl = this.imageCatalog.itemIconUrl(spec.moduleId);
    const img = document.createElement("img");
    img.className = "ewar-module-icon";
    if (iconUrl !== undefined) img.src = iconUrl;
    img.alt = "";
    img.hidden = iconUrl === undefined;
    button.appendChild(img);
    const nameSpan = document.createElement("span");
    nameSpan.className = "ewar-module-name truncate";
    nameSpan.textContent = displayName;
    nameSpan.title = effectTitle;
    button.appendChild(nameSpan);
    return { button, nameSpan };
  }

  private createScriptGear(side: Side, index: number, script: DisruptionScriptSpec | undefined, active: boolean): HTMLButtonElement {
    const gear = this.gearAction.create(() => this.openScriptPopup(side, index, gear));
    gear.setAttribute("data-index", String(index));
    gear.setAttribute("aria-controls", `${sideId(side)}-ewar-script-popup`);
    this.updateGearTitle(gear, script);
    if (!active) gear.setAttribute("disabled", "");
    return gear;
  }

  private createOverloadButton(
    active: boolean,
    overloaded: boolean,
    index: number,
    spec: { readonly moduleId: TypeId },
    onToggle: () => void,
  ): HTMLButtonElement {
    const label = `${this.i18n.t("label.overload")} ${this.moduleDisplayName(spec)}`;
    const button = this.overloadAction.create(onToggle);
    button.setAttribute("data-index", String(index));
    button.setAttribute("aria-pressed", String(overloaded));
    button.setAttribute("title", label);
    button.setAttribute("aria-label", label);
    if (!active) button.setAttribute("disabled", "");
    return button;
  }

  private openScriptPopup(side: Side, index: number, gear: HTMLButtonElement): void {
    this.scriptGears.set(side, { index, gear });
    this.renderScriptOptions(side, index);
    gear.setAttribute("aria-expanded", "true");
    this.scriptPopups[side].open();
  }

  private renderScriptOptions(side: Side, index: number): void {
    const popup = this.scriptPopupEls.get(side);
    const state = this.states.get(side);
    if (!popup || !state) return;
    popup.innerHTML = "";
    const current = state.activation.disruptors[index].script;
    const disruptor = state.loadout.disruptors[index];
    const label = document.createElement("div");
    label.id = `${sideId(side)}-ewar-script-label`;
    label.className = "ewar-script-popup-label";
    label.textContent = this.moduleDisplayName(disruptor);
    popup.setAttribute("aria-labelledby", label.id);
    popup.appendChild(label);

    const noneButton = this.scriptOptionList.createButton({
      value: "none",
      label: this.i18n.t("ewar.script.none"),
      title: this.i18n.t("ewar.script.none.hint"),
      selected: current === undefined,
    });
    noneButton.addEventListener("click", () => this.onScriptSelected(side, index, "none"));
    popup.appendChild(noneButton);

    for (const script of state.loadout.scripts) {
      const button = this.scriptOptionList.createButton({
        value: script.moduleId,
        label: this.fittingImport.itemNameForId(script.moduleId, this.i18n.current()),
        title: scriptStatSuffix(script),
        iconUrl: this.imageCatalog.itemIconUrl(script.moduleId),
        selected: this.isSameScript(current, script),
      });
      button.addEventListener("click", () => this.onScriptSelected(side, index, script.moduleId));
      popup.appendChild(button);
    }
  }

  private onScriptSelected(side: Side, index: number, value: string): void {
    const state = this.states.get(side);
    if (!state) return;
    if (value === "none") {
      this.onScriptInput(side, index, undefined);
      this.scriptPopups[side].close();
      this.scriptPopups[side].focusTrigger();
      return;
    }
    const byId = typeIdFromString(value);
    const script = byId !== undefined ? state.loadout.scripts.find((s) => s.moduleId === byId) : undefined;
    if (script === undefined) return;
    this.onScriptInput(side, index, script);
    this.scriptPopups[side].close();
    this.scriptPopups[side].focusTrigger();
  }

  private onScriptInput(side: Side, index: number, script: DisruptionScriptSpec | undefined): void {
    const state = this.states.get(side);
    if (!state) return;
    state.activation.disruptors[index].script = script;
    const gear = this.findGearFor(side, index);
    if (gear) this.updateGearTitle(gear, script);
    const nameSpan = this.disruptorNameSpans.get(side)?.[index];
    if (nameSpan) nameSpan.title = this.ewarEffectDescriber.disruptorModuleEffect(state.loadout.disruptors[index], script);
    this.events.emitConfigInvalidated();
  }

  private isSameScript(a: DisruptionScriptSpec | undefined, b: DisruptionScriptSpec | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    return a.moduleId === b.moduleId;
  }

  private findGearFor(side: Side, index: number): HTMLButtonElement | undefined {
    const gearState = this.scriptGears.get(side);
    return gearState?.index === index ? gearState.gear : undefined;
  }

  private updateGearTitle(gear: HTMLButtonElement, script: DisruptionScriptSpec | undefined): void {
    const title = script ? this.fittingImport.itemNameForId(script.moduleId, this.i18n.current()) : this.i18n.t("ewar.script.none");
    gear.setAttribute("title", title);
    gear.setAttribute("aria-label", title);
  }

  private toggleWeb(side: Side, index: number, button: HTMLButtonElement, row: HTMLElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const active = !state.activation.webs[index].active;
    state.activation.webs[index].active = active;
    button.setAttribute("aria-pressed", String(active));
    row.className = active ? "ewar-row" : "ewar-row ewar-row-inactive";
    for (const child of row.children) {
      if (child.getAttribute("data-index") === String(index) && child instanceof HTMLButtonElement) {
        child.disabled = !active;
      }
    }
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleWebOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation.webs[index].overloaded;
    state.activation.webs[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));

    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleDisruptor(side: Side, index: number, button: HTMLButtonElement, row: HTMLElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const active = !state.activation.disruptors[index].active;
    state.activation.disruptors[index].active = active;
    button.setAttribute("aria-pressed", String(active));
    row.className = active ? "ewar-row" : "ewar-row ewar-row-inactive";
    for (const child of row.children) {
      if (child.getAttribute("data-index") === String(index) && child instanceof HTMLButtonElement) {
        child.disabled = !active;
      }
    }
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleDisruptorOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation.disruptors[index].overloaded;
    state.activation.disruptors[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));

    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleScrambler(side: Side, index: number, button: HTMLButtonElement, row: HTMLElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const active = !state.activation.scramblers[index].active;
    state.activation.scramblers[index].active = active;
    button.setAttribute("aria-pressed", String(active));
    row.className = active ? "ewar-row" : "ewar-row ewar-row-inactive";
    for (const child of row.children) {
      if (child.getAttribute("data-index") === String(index) && child instanceof HTMLButtonElement) {
        child.disabled = !active;
      }
    }
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleScramblerOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation.scramblers[index].overloaded;
    state.activation.scramblers[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));

    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleGrappler(side: Side, index: number, button: HTMLButtonElement, row: HTMLElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const active = !state.activation.grapplers[index].active;
    state.activation.grapplers[index].active = active;
    button.setAttribute("aria-pressed", String(active));
    row.className = active ? "ewar-row" : "ewar-row ewar-row-inactive";
    for (const child of row.children) {
      if (child.getAttribute("data-index") === String(index) && child instanceof HTMLButtonElement) {
        child.disabled = !active;
      }
    }
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleGrapplerOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation.grapplers[index].overloaded;
    state.activation.grapplers[index].overloaded = overloaded;
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

