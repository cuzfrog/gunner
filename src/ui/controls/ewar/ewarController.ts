import { toTypeId, type TypeId } from "../../../gamedata/ids";
import { type DisruptionScriptSpec, type EwarActivation, type EwarLoadout, type EwarProjection, type SensorDampenerScriptSpec, type SensorDampenerSpec, type StasisGrapplerSpec, type TargetPainterSpec, type WarpScramblerSpec } from "../../../sim";
import type { StoredDisruptionScript, StoredEwarActivation } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import { formatMultiplier, scriptStatSuffix } from "../controlsFormat";
import { html } from "../markup";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import { IconActionImpl, type ScriptOption, ScriptSection, SectionBlockImpl, spriteIcon } from "../shared";
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

type EwarScriptKey = { kind: "disruptor" | "dampener"; index: number };

export class EwarControllerImpl implements EwarController {
  private readonly els: EwarEls;
  private readonly popupGroup: PopupGroup;
  private readonly modulesPopup: ModulesPopup;
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly ewarEffectDescriber: EwarEffectDescriber;
  private readonly events: UiEvents;
  private readonly states = new Map<Side, EwarState>();
  private readonly scriptSections: Record<Side, ScriptSection<EwarScriptKey>>;
  private readonly disruptorNameSpans = new Map<Side, HTMLSpanElement[]>();
  private readonly dampenerNameSpans = new Map<Side, HTMLSpanElement[]>();
  private readonly overloadAction: IconActionImpl;
  private readonly sectionBlock: SectionBlockImpl;

  constructor(deps: { els: EwarEls; popupGroup: PopupGroup; imageCatalog: ImageCatalog; fittingImport: FittingImport; i18n: I18n; ewarEffectDescriber: EwarEffectDescriber; events: UiEvents; modulesPopup: ModulesPopup }) {
    this.els = deps.els;
    this.popupGroup = deps.popupGroup;
    this.modulesPopup = deps.modulesPopup;
    this.imageCatalog = deps.imageCatalog;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.ewarEffectDescriber = deps.ewarEffectDescriber;
    this.events = deps.events;
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

  private buildScriptSection(side: Side): ScriptSection<EwarScriptKey> {
    return new ScriptSection<EwarScriptKey>({
      popupId: `${sideId(side)}-ewar-script-popup`,
      mountEl: this.els[side].field,
      parentPopup: this.modulesPopup.popup(side),
      popupGroup: this.popupGroup,
      listShape: { itemClass: "ewar-script-option", nameClass: "ewar-script-name", iconClass: "ewar-script-icon", role: "menuitem" },
      placement: side === "shipA" ? "alongside-end" : "alongside-start",
      options: (key) => this.buildScriptOptions(side, key),
      onSelect: (key, value) => this.onScriptSelected(side, key, value),
      gearHint: (key) => this.gearHintForSide(side, key),
      heading: (key) => this.headingForSide(side, key),
    });
  }

  private renderSide(side: Side): void {
    const section = this.els[side].section;
    const summary = this.els[side].summary;
    const state = this.states.get(side);
    const modulesLabel = this.i18n.t("label.modules");
    this.scriptSections[side].close();
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
      const key: EwarScriptKey = { kind: "disruptor", index: i };
      const gear = this.scriptSections[side].createGear(key, {
        hint: this.gearHintForSide(side, key),
        disabled: !activation.active,
        dataIndex: i,
      });
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
      const key: EwarScriptKey = { kind: "dampener", index: i };
      const gear = this.scriptSections[side].createGear(key, {
        hint: this.gearHintForSide(side, key),
        disabled: !activation.active,
        dataIndex: i,
      });
      const row = html`<div class=${activation.active ? "ewar-row" : "ewar-row ewar-row-inactive"}>${[button, overloadButton, gear]}</div>` as unknown as HTMLDivElement;
      section.appendChild(row);
    }
    this.dampenerNameSpans.set(side, nameSpans);
  }

  private moduleDisplayName(spec: { readonly moduleId: TypeId }): string {
    return this.fittingImport.itemNameForId(spec.moduleId, this.i18n.current());
  }

  private scriptDisplayName(script: { readonly moduleId: TypeId } | undefined): string {
    if (script === undefined) return this.i18n.t("ewar.script.none");
    return this.fittingImport.itemNameForId(script.moduleId, this.i18n.current());
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

  private buildScriptOptions(side: Side, key: EwarScriptKey): readonly ScriptOption[] {
    const state = this.states.get(side);
    if (!state) return [];
    if (key.kind === "disruptor") {
      const current = state.activation.disruptors[key.index].script;
      return [
        { value: "none", label: this.i18n.t("ewar.script.none"), hint: this.i18n.t("ewar.script.none.hint"), selected: current === undefined },
        ...state.loadout.scripts.map((script) => ({
          value: String(script.moduleId),
          label: this.scriptDisplayName(script),
          hint: scriptStatSuffix(script),
          iconUrl: this.imageCatalog.itemIconUrl(script.moduleId),
          selected: current !== undefined && current.moduleId === script.moduleId,
        })),
      ];
    }
    const current = state.activation.dampeners[key.index].script;
    return [
      { value: "none", label: this.i18n.t("ewar.script.none"), hint: this.i18n.t("ewar.script.none.hint"), selected: current === undefined },
      ...state.loadout.dampenerScripts.map((script) => ({
        value: String(script.moduleId),
        label: this.scriptDisplayName(script),
        hint: `scan res x${formatMultiplier(script.scanResolutionMultiplier)} · target range x${formatMultiplier(script.maxTargetRangeMultiplier)}`,
        iconUrl: this.imageCatalog.itemIconUrl(script.moduleId),
        selected: current !== undefined && current.moduleId === script.moduleId,
      })),
    ];
  }

  private onScriptSelected(side: Side, key: EwarScriptKey, value: string): void {
    const state = this.states.get(side);
    if (!state) return;
    if (key.kind === "disruptor") {
      if (value === "none") {
        state.activation.disruptors[key.index].script = undefined;
      } else {
        const byId = typeIdFromString(value);
        if (byId === undefined) return;
        const script = state.loadout.scripts.find((s) => s.moduleId === byId);
        if (script === undefined) return;
        state.activation.disruptors[key.index].script = script;
      }
      const script = state.activation.disruptors[key.index].script;
      const nameSpan = this.disruptorNameSpans.get(side)?.[key.index];
      if (nameSpan) nameSpan.setAttribute("data-hint", this.ewarEffectDescriber.disruptorModuleEffect(state.loadout.disruptors[key.index], script));
    } else {
      if (value === "none") {
        state.activation.dampeners[key.index].script = undefined;
      } else {
        const byId = typeIdFromString(value);
        if (byId === undefined) return;
        const script = state.loadout.dampenerScripts.find((s) => s.moduleId === byId);
        if (script === undefined) return;
        state.activation.dampeners[key.index].script = script;
      }
      const script = state.activation.dampeners[key.index].script;
      const nameSpan = this.dampenerNameSpans.get(side)?.[key.index];
      if (nameSpan) nameSpan.setAttribute("data-hint", this.ewarEffectDescriber.dampenerModuleEffect(state.loadout.dampeners[key.index], script));
    }
    this.updateSummary(side);
    this.events.emitConfigInvalidated();
  }

  private gearHintForSide(side: Side, key: EwarScriptKey): string {
    const state = this.states.get(side);
    if (!state) return this.i18n.t("ewar.script.none");
    const script = key.kind === "disruptor" ? state.activation.disruptors[key.index].script : state.activation.dampeners[key.index].script;
    return this.scriptDisplayName(script);
  }

  private headingForSide(side: Side, key: EwarScriptKey): string {
    const state = this.states.get(side);
    if (!state) return "";
    const spec = key.kind === "disruptor" ? state.loadout.disruptors[key.index] : state.loadout.dampeners[key.index];
    return this.moduleDisplayName(spec);
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
