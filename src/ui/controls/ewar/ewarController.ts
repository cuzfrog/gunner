import { toTypeId, type TypeId } from "../../../gamedata/ids";
import { type DisruptionScriptSpec, type EwarActivation, type EwarLoadout, type EwarProjection, type SensorDampenerScriptSpec, type SensorDampenerSpec, type StasisGrapplerSpec, type TargetPainterSpec, type WarpScramblerSpec } from "../../../sim";
import type { StoredDisruptionScript, StoredEwarActivation } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { formatMultiplier, scriptStatSuffix } from "../controlsFormat";
import { html } from "../markup";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl, type SelectableItem, IconActionImpl, SectionBlockImpl, spriteIcon } from "../shared";
import type { EwarController, EwarEls } from "./ewarControllerContract";
import type { EwarEffectDescriber } from "./ewarEffectDescriber";
import type { ModulesPopup } from "../modulesPopup";

interface MutableEwarActivation {
  webs: { active: boolean; overloaded: boolean }[];
  grapplers: { active: boolean; overloaded: boolean }[];
  disruptors: { active: boolean; overloaded: boolean; script: DisruptionScriptSpec | undefined }[];
  scramblers: { active: boolean; overloaded: boolean }[];
  painters: { active: boolean; overloaded: boolean }[];
  dampeners: { active: boolean; overloaded: boolean; script: SensorDampenerScriptSpec | undefined }[];
}

interface EwarState {
  loadout: EwarLoadout;
  activation: MutableEwarActivation;
}

export class EwarControllerImpl implements EwarController {
  private readonly els: EwarEls;
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly ewarEffectDescriber: EwarEffectDescriber;
  private readonly events: UiEvents;
  private readonly states = new Map<Side, EwarState>();
  private readonly scriptPopups: Record<Side, Popup>;
  private readonly scriptGears = new Map<Side, { kind: "disruptor" | "dampener"; index: number; gear: HTMLButtonElement }>();
  private readonly scriptPopupEls = new Map<Side, HTMLElement>();
  private readonly disruptorNameSpans = new Map<Side, HTMLSpanElement[]>();
  private readonly dampenerNameSpans = new Map<Side, HTMLSpanElement[]>();
  private readonly scriptOptionList: SelectableListImpl;
  private readonly gearAction: IconActionImpl;
  private readonly overloadAction: IconActionImpl;
  private readonly sectionBlock: SectionBlockImpl;

  constructor(deps: { els: EwarEls; popupGroup: PopupGroup; imageCatalog: ImageCatalog; fittingImport: FittingImport; i18n: I18n; ewarEffectDescriber: EwarEffectDescriber; events: UiEvents; modulesPopup: ModulesPopup }) {
    this.els = deps.els;
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
    deps.popupGroup.register(this.scriptPopups.shipA);
    deps.popupGroup.register(this.scriptPopups.shipB);
    deps.modulesPopup.registerOnClose("shipA", () => this.scriptPopups.shipA.close());
    deps.modulesPopup.registerOnClose("shipB", () => this.scriptPopups.shipB.close());
    this.events.onFittingImported((side, imported) => this.setLoadout(side, imported.ewar));
    this.events.onLanguageChanged(() => this.render());
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
      painters: state.activation.painters.map((p) => ({ active: p.active, overloaded: p.overloaded })),
      dampeners: state.activation.dampeners.map((d) => ({
        active: d.active,
        overloaded: d.overloaded,
        script: d.script?.moduleId ?? "none",
      })),
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

  private buildScriptPopup(side: Side): Popup {
    const field = this.els[side].field;
    const popup = html`<div id="${sideId(side)}-ewar-script-popup" class="ewar-script-popup popup" role="menu" hidden></div>` as unknown as HTMLDivElement;
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
    const section = this.els[side].section;
    const summary = this.els[side].summary;
    const state = this.states.get(side);
    const modulesLabel = this.i18n.t("label.modules");
    this.scriptPopups[side].close();
    this.scriptGears.delete(side);
    this.disruptorNameSpans.delete(side);
    this.dampenerNameSpans.delete(side);
    section.innerHTML = "";
    if (!state || this.isEmpty(state.loadout)) {
      section.hidden = true;
      summary.innerHTML = "";
      return;
    }
    section.hidden = false;
    this.updateSummary(side);
    const heading = html`<div class="preview-section-label">${modulesLabel}</div>`;
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
    if (state.loadout.painters.length > 0) {
      this.renderSection(section, "label.ewar.painter", (container) => this.renderPainters(side, state, container));
    }
    if (state.loadout.dampeners.length > 0) {
      this.renderSection(section, "label.ewar.dampener", (container) => this.renderDampeners(side, state, container));
    }
  }

  private renderSection(
    parent: HTMLElement,
    labelKey: "label.ewar.web" | "label.ewar.grappler" | "label.ewar.disruptor" | "label.ewar.scrambler" | "label.ewar.painter" | "label.ewar.dampener",
    renderRows: (container: HTMLElement) => void,
  ): void {
    const rowContainer = html`<div></div>` as unknown as HTMLDivElement;
    renderRows(rowContainer);
    const rows = Array.from(rowContainer.children) as unknown as (Element | DocumentFragment)[];
    const section = this.sectionBlock.create(this.i18n.t(labelKey), rows);
    parent.appendChild(section);
  }

  private updateSummary(side: Side): void {
    const summary = this.els[side].summary;
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
    const painterActive = state.activation.painters.filter((p) => p.active).length;
    const painterTitle = state.loadout.painters.length > 0 ? this.ewarEffectDescriber.painterHint(projection) : "";
    if (state.loadout.painters.length > 0) this.appendSummaryItem(summary, state.loadout.painters[0].moduleId, painterActive, state.loadout.painters.length, painterTitle);
    const dampenerTotal = state.loadout.dampeners.length;
    const dampenerActive = state.activation.dampeners.filter((d) => d.active).length;
    const dampenerTitle = dampenerTotal > 0 ? this.ewarEffectDescriber.dampenerHint(projection) : "";
    if (dampenerTotal > 0) this.appendSummaryItem(summary, state.loadout.dampeners[0].moduleId, dampenerActive, dampenerTotal, dampenerTitle);
  }

  private appendSummaryItem(summary: HTMLElement, moduleId: TypeId, active: number, total: number, hint: string): void {
    const iconUrl = this.imageCatalog.itemIconUrl(moduleId);
    const img = html`<img class="ewar-summary-icon" alt="" src=${iconUrl}>` as unknown as HTMLImageElement;
    if (iconUrl === undefined) img.hidden = true;
    const item = html`<span class="trigger-summary-item" data-hint=${hint}>${img}<span class="trigger-summary-count mono">${active}/${total}</span></span>`;
    summary.appendChild(item);
  }

  private isEmpty(loadout: EwarLoadout): boolean {
    return loadout.webs.length === 0 && loadout.grapplers.length === 0 && loadout.disruptors.length === 0 && loadout.scramblers.length === 0 && loadout.painters.length === 0 && loadout.dampeners.length === 0;
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
      painters: loadout.painters.map((_, i) => {
        const savedPainter = saved?.painters?.[i];
        const active = typeof savedPainter === "boolean" ? savedPainter : savedPainter?.active ?? true;
        const overloaded = typeof savedPainter === "boolean" ? false : savedPainter?.overloaded ?? false;
        return { active, overloaded };
      }),
      dampeners: loadout.dampeners.map((dampener, i) => {
        const savedDampener = saved?.dampeners?.[i];
        const savedScript = savedDampener?.script;
        let script: SensorDampenerScriptSpec | undefined;
        if (savedScript === undefined) {
          script = dampener.defaultScript;
        } else if (savedScript === "none") {
          script = undefined;
        } else {
          const byId = typeIdFromString(savedScript);
          script = byId !== undefined ? loadout.dampenerScripts.find((s) => s.moduleId === byId) : undefined;
          if (script === undefined) script = dampener.defaultScript;
        }
        return { active: savedDampener?.active ?? true, overloaded: savedDampener?.overloaded ?? false, script };
      }),
    };
  }

  private renderWebs(side: Side, state: EwarState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.webs.length; i++) {
      const web = state.loadout.webs[i];
      const active = state.activation.webs[i].active;
      const overloaded = state.activation.webs[i].overloaded;
      const { button } = this.createModuleButton(active, web, this.ewarEffectDescriber.webModuleEffect(web));
      const overloadButton = this.createOverloadButton(active, overloaded, i, web, () => this.toggleWebOverload(side, i, overloadButton));
      button.addEventListener("click", () => this.toggleWeb(side, i, button, row));
      const row = html`<div class=${active ? "ewar-row" : "ewar-row ewar-row-inactive"}>${[button, overloadButton]}</div>` as unknown as HTMLDivElement;
      section.appendChild(row);
    }
  }

  private renderGrapplers(side: Side, state: EwarState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.grapplers.length; i++) {
      const grappler: StasisGrapplerSpec = state.loadout.grapplers[i];
      const activation = state.activation.grapplers[i];
      const { button } = this.createModuleButton(activation.active, grappler, this.ewarEffectDescriber.grapplerModuleEffect(grappler));
      const onToggle = () => this.toggleGrapplerOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, grappler, onToggle);
      button.addEventListener("click", () => this.toggleGrappler(side, i, button, row));
      const row = html`<div class=${activation.active ? "ewar-row" : "ewar-row ewar-row-inactive"}>${[button, overloadButton]}</div>` as unknown as HTMLDivElement;
      section.appendChild(row);
    }
  }

  private renderDisruptors(side: Side, state: EwarState, section: HTMLElement): void {
    const nameSpans: HTMLSpanElement[] = [];
    for (let i = 0; i < state.loadout.disruptors.length; i++) {
      const disruptor = state.loadout.disruptors[i];
      const activation = state.activation.disruptors[i];
      const { button, nameSpan } = this.createModuleButton(activation.active, disruptor, this.ewarEffectDescriber.disruptorModuleEffect(disruptor, activation.script));
      nameSpans.push(nameSpan);
      const onToggle = () => this.toggleDisruptorOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, disruptor, onToggle);
      button.addEventListener("click", () => this.toggleDisruptor(side, i, button, row));
      const gear = this.createScriptGear(side, i, activation.script, activation.active);
      const row = html`<div class=${activation.active ? "ewar-row" : "ewar-row ewar-row-inactive"}>${[button, overloadButton, gear]}</div>` as unknown as HTMLDivElement;
      section.appendChild(row);
    }
    this.disruptorNameSpans.set(side, nameSpans);
  }

  private renderScramblers(side: Side, state: EwarState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.scramblers.length; i++) {
      const scrambler: WarpScramblerSpec = state.loadout.scramblers[i];
      const activation = state.activation.scramblers[i];
      const { button } = this.createModuleButton(activation.active, scrambler, this.ewarEffectDescriber.scramblerModuleEffect());
      const onToggle = () => this.toggleScramblerOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, scrambler, onToggle);
      button.addEventListener("click", () => this.toggleScrambler(side, i, button, row));
      const row = html`<div class=${activation.active ? "ewar-row" : "ewar-row ewar-row-inactive"}>${[button, overloadButton]}</div>` as unknown as HTMLDivElement;
      section.appendChild(row);
    }
  }

  private renderPainters(side: Side, state: EwarState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.painters.length; i++) {
      const painter: TargetPainterSpec = state.loadout.painters[i];
      const activation = state.activation.painters[i];
      const { button } = this.createModuleButton(activation.active, painter, this.ewarEffectDescriber.painterModuleEffect(painter));
      const onToggle = () => this.togglePainterOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, painter, onToggle);
      button.addEventListener("click", () => this.togglePainter(side, i, button, row));
      const row = html`<div class=${activation.active ? "ewar-row" : "ewar-row ewar-row-inactive"}>${[button, overloadButton]}</div>` as unknown as HTMLDivElement;
      section.appendChild(row);
    }
  }

  private renderDampeners(side: Side, state: EwarState, section: HTMLElement): void {
    const nameSpans: HTMLSpanElement[] = [];
    for (let i = 0; i < state.loadout.dampeners.length; i++) {
      const dampener: SensorDampenerSpec = state.loadout.dampeners[i];
      const activation = state.activation.dampeners[i];
      const { button, nameSpan } = this.createModuleButton(activation.active, dampener, this.ewarEffectDescriber.dampenerModuleEffect(dampener, activation.script));
      nameSpans.push(nameSpan);
      const onToggle = () => this.toggleDampenerOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, dampener, onToggle);
      button.addEventListener("click", () => this.toggleDampener(side, i, button, row));
      const gear = this.createDampenerScriptGear(side, i, activation.script, activation.active);
      const row = html`<div class=${activation.active ? "ewar-row" : "ewar-row ewar-row-inactive"}>${[button, overloadButton, gear]}</div>` as unknown as HTMLDivElement;
      section.appendChild(row);
    }
    this.dampenerNameSpans.set(side, nameSpans);
  }

  private moduleDisplayName(spec: { readonly moduleId: TypeId }): string {
    return this.fittingImport.itemNameForId(spec.moduleId, this.i18n.current());
  }

  private createModuleButton(active: boolean, spec: { readonly moduleId: TypeId }, effectTitle: string): { button: HTMLButtonElement; nameSpan: HTMLSpanElement } {
    const displayName = this.moduleDisplayName(spec);
    const iconUrl = this.imageCatalog.itemIconUrl(spec.moduleId);
    const img = html`<img class="ewar-module-icon" alt="" src=${iconUrl}>` as unknown as HTMLImageElement;
    if (iconUrl === undefined) img.hidden = true;
    const nameSpan = html`<span class="ewar-module-name truncate" data-hint=${effectTitle}>${displayName}</span>` as unknown as HTMLSpanElement;
    const button = html`<button type="button" class="ewar-module-toggle" aria-pressed=${String(active)} aria-label=${displayName}>${img}${nameSpan}</button>` as unknown as HTMLButtonElement;
    return { button, nameSpan };
  }

  private createScriptGear(side: Side, index: number, script: DisruptionScriptSpec | undefined, active: boolean): HTMLButtonElement {
    const gear = this.gearAction.create(() => this.openScriptPopup(side, "disruptor", index, gear));
    gear.setAttribute("data-index", String(index));
    gear.setAttribute("aria-controls", `${sideId(side)}-ewar-script-popup`);
    this.updateGearHint(gear, script);
    if (!active) gear.setAttribute("disabled", "");
    return gear;
  }

  private createDampenerScriptGear(side: Side, index: number, script: SensorDampenerScriptSpec | undefined, active: boolean): HTMLButtonElement {
    const gear = this.gearAction.create(() => this.openScriptPopup(side, "dampener", index, gear));
    gear.setAttribute("data-index", String(index));
    gear.setAttribute("aria-controls", `${sideId(side)}-ewar-script-popup`);
    this.updateGearHint(gear, script);
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
    button.setAttribute("data-hint", label);
    button.setAttribute("aria-label", label);
    if (!active) button.setAttribute("disabled", "");
    return button;
  }

  private openScriptPopup(side: Side, kind: "disruptor" | "dampener", index: number, gear: HTMLButtonElement): void {
    this.scriptGears.set(side, { kind, index, gear });
    this.renderScriptOptions(side, kind, index);
    gear.setAttribute("aria-expanded", "true");
    this.scriptPopups[side].open();
  }

  private renderScriptOptions(side: Side, kind: "disruptor" | "dampener", index: number): void {
    const popup = this.scriptPopupEls.get(side);
    const state = this.states.get(side);
    if (!popup || !state) return;
    popup.innerHTML = "";
    if (kind === "disruptor") {
      this.renderDisruptorScriptOptions(side, state, index, popup);
    } else {
      this.renderDampenerScriptOptions(side, state, index, popup);
    }
  }

  private renderDisruptorScriptOptions(side: Side, state: EwarState, index: number, popup: HTMLElement): void {
    const current = state.activation.disruptors[index].script;
    const disruptor = state.loadout.disruptors[index];
    const labelId = `${sideId(side)}-ewar-script-label`;
    const label = html`<div id="${labelId}" class="ewar-script-popup-label">${this.moduleDisplayName(disruptor)}</div>`;
    popup.setAttribute("aria-labelledby", labelId);
    popup.appendChild(label);

    const noneButton = this.scriptOptionList.createButton({
      value: "none",
      label: this.i18n.t("ewar.script.none"),
      hint: this.i18n.t("ewar.script.none.hint"),
      selected: current === undefined,
    });
    noneButton.addEventListener("click", () => this.onScriptSelected(side, "disruptor", index, "none"));
    popup.appendChild(noneButton);

    for (const script of state.loadout.scripts) {
      const button = this.scriptOptionList.createButton({
        value: script.moduleId,
        label: this.fittingImport.itemNameForId(script.moduleId, this.i18n.current()),
        hint: scriptStatSuffix(script),
        iconUrl: this.imageCatalog.itemIconUrl(script.moduleId),
        selected: this.isSameScript(current, script),
      });
      button.addEventListener("click", () => this.onScriptSelected(side, "disruptor", index, script.moduleId));
      popup.appendChild(button);
    }
  }

  private renderDampenerScriptOptions(side: Side, state: EwarState, index: number, popup: HTMLElement): void {
    const current = state.activation.dampeners[index].script;
    const dampener = state.loadout.dampeners[index];
    const labelId = `${sideId(side)}-ewar-script-label`;
    const label = html`<div id="${labelId}" class="ewar-script-popup-label">${this.moduleDisplayName(dampener)}</div>`;
    popup.setAttribute("aria-labelledby", labelId);
    popup.appendChild(label);

    const noneButton = this.scriptOptionList.createButton({
      value: "none",
      label: this.i18n.t("ewar.script.none"),
      hint: this.i18n.t("ewar.script.none.hint"),
      selected: current === undefined,
    });
    noneButton.addEventListener("click", () => this.onScriptSelected(side, "dampener", index, "none"));
    popup.appendChild(noneButton);

    for (const script of state.loadout.dampenerScripts) {
      const button = this.scriptOptionList.createButton({
        value: script.moduleId,
        label: this.fittingImport.itemNameForId(script.moduleId, this.i18n.current()),
        hint: `scan res x${formatMultiplier(script.scanResolutionMultiplier)} · target range x${formatMultiplier(script.maxTargetRangeMultiplier)}`,
        iconUrl: this.imageCatalog.itemIconUrl(script.moduleId),
        selected: this.isSameScript(current, script),
      });
      button.addEventListener("click", () => this.onScriptSelected(side, "dampener", index, script.moduleId));
      popup.appendChild(button);
    }
  }

  private onScriptSelected(side: Side, kind: "disruptor" | "dampener", index: number, value: string): void {
    const state = this.states.get(side);
    if (!state) return;
    if (value === "none") {
      this.onScriptInput(side, kind, index, undefined);
      this.scriptPopups[side].close();
      this.scriptPopups[side].focusTrigger();
      return;
    }
    const byId = typeIdFromString(value);
    if (byId === undefined) return;
    if (kind === "disruptor") {
      const script = state.loadout.scripts.find((s) => s.moduleId === byId);
      if (script === undefined) return;
      this.onScriptInput(side, kind, index, script);
    } else {
      const script = state.loadout.dampenerScripts.find((s) => s.moduleId === byId);
      if (script === undefined) return;
      this.onScriptInput(side, kind, index, script);
    }
    this.scriptPopups[side].close();
    this.scriptPopups[side].focusTrigger();
  }

  private onScriptInput(side: Side, kind: "disruptor" | "dampener", index: number, script: DisruptionScriptSpec | SensorDampenerScriptSpec | undefined): void {
    const state = this.states.get(side);
    if (!state) return;
    if (kind === "disruptor") {
      const disruptorScript = script as DisruptionScriptSpec | undefined;
      state.activation.disruptors[index].script = disruptorScript;
      const gear = this.findGearFor(side, kind, index);
      if (gear) this.updateGearHint(gear, disruptorScript);
      const nameSpan = this.disruptorNameSpans.get(side)?.[index];
      if (nameSpan) nameSpan.setAttribute("data-hint", this.ewarEffectDescriber.disruptorModuleEffect(state.loadout.disruptors[index], disruptorScript));
    } else {
      const dampenerScript = script as SensorDampenerScriptSpec | undefined;
      state.activation.dampeners[index].script = dampenerScript;
      const gear = this.findGearFor(side, kind, index);
      if (gear) this.updateGearHint(gear, dampenerScript);
      const nameSpan = this.dampenerNameSpans.get(side)?.[index];
      if (nameSpan) nameSpan.setAttribute("data-hint", this.ewarEffectDescriber.dampenerModuleEffect(state.loadout.dampeners[index], dampenerScript));
    }
    this.events.emitConfigInvalidated();
  }

  private isSameScript(a: { readonly moduleId: TypeId } | undefined, b: { readonly moduleId: TypeId } | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    return a.moduleId === b.moduleId;
  }

  private findGearFor(side: Side, kind: "disruptor" | "dampener", index: number): HTMLButtonElement | undefined {
    const gearState = this.scriptGears.get(side);
    return gearState?.kind === kind && gearState?.index === index ? gearState.gear : undefined;
  }

  private updateGearHint(gear: HTMLButtonElement, script: { readonly moduleId: TypeId } | undefined): void {
    const hint = script ? this.fittingImport.itemNameForId(script.moduleId, this.i18n.current()) : this.i18n.t("ewar.script.none");
    gear.setAttribute("data-hint", hint);
    gear.setAttribute("aria-label", hint);
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

  private togglePainter(side: Side, index: number, button: HTMLButtonElement, row: HTMLElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const active = !state.activation.painters[index].active;
    state.activation.painters[index].active = active;
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

  private togglePainterOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation.painters[index].overloaded;
    state.activation.painters[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));

    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private toggleDampener(side: Side, index: number, button: HTMLButtonElement, row: HTMLElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const active = !state.activation.dampeners[index].active;
    state.activation.dampeners[index].active = active;
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

  private toggleDampenerOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation.dampeners[index].overloaded;
    state.activation.dampeners[index].overloaded = overloaded;
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

