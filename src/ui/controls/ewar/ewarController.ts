import { type DisruptionScriptSpec, type EwarActivation, type EwarLoadout, type EwarProjection, type WarpScramblerSpec } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { scriptStatSuffix } from "../controlsFormat";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../sidePanel";
import type { EwarController, EwarEls, EwarHost } from "./ewarControllerContract";

interface MutableEwarActivation {
  webs: { active: boolean; overloaded: boolean }[];
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
  private readonly states = new Map<Side, EwarState>();
  private readonly popups: Record<Side, Popup>;
  private readonly scriptPopups: Record<Side, Popup>;
  private readonly scriptGears = new Map<Side, { index: number; gear: HTMLButtonElement }>();
  private readonly scriptPopupEls = new Map<Side, HTMLElement>();
  private host?: EwarHost;

  constructor(deps: { els: EwarEls; popupGroup: PopupGroup; imageCatalog: ImageCatalog; fittingImport: FittingImport; i18n: I18n }) {
    this.els = deps.els;
    this.popupGroup = deps.popupGroup;
    this.imageCatalog = deps.imageCatalog;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.scriptPopups = { attacker: this.buildScriptPopup("attacker"), target: this.buildScriptPopup("target") };
    this.popups = { attacker: this.buildPopup("attacker"), target: this.buildPopup("target") };
    this.popupGroup.register(this.scriptPopups.attacker);
    this.popupGroup.register(this.scriptPopups.target);
    this.popupGroup.register(this.popups.attacker);
    this.popupGroup.register(this.popups.target);
    this.render();
  }

  setHost(host: EwarHost): void {
    this.host = host;
  }

  setLoadout(side: Side, loadout: EwarLoadout): void {
    if (this.isEmpty(loadout)) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout) });
    }
    this.host?.onConfigChange();
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
    const scramblers = state?.loadout.scramblers ?? [];
    if (!state || (state.loadout.webs.length === 0 && state.loadout.disruptors.length === 0 && scramblers.length === 0)) return undefined;
    const activation: EwarActivation = {
      webs: state.activation.webs,
      disruptors: state.activation.disruptors,
      ...(state.activation.scramblers.length > 0 ? { scramblers: state.activation.scramblers } : {}),
    };
    return { loadout: state.loadout, activation };
  }

  capture(side: Side): StoredEwarActivation | undefined {
    const state = this.states.get(side);
    const scramblers = state?.loadout.scramblers ?? [];
    if (!state || (state.loadout.webs.length === 0 && state.loadout.disruptors.length === 0 && scramblers.length === 0)) return undefined;
    const storedScramblers = state.activation.scramblers.length > 0
      ? state.activation.scramblers.map((s) => ({ active: s.active, overloaded: s.overloaded }))
      : undefined;
    return {
      webs: state.activation.webs.map((w) => ({ active: w.active, overloaded: w.overloaded })),
      disruptors: state.activation.disruptors.map((d) => ({
        active: d.active,
        overloaded: d.overloaded,
        script: d.script?.name ?? "none",
      })),
      ...(storedScramblers !== undefined ? { scramblers: storedScramblers } : {}),
    };
  }

  popup(side: Side): Popup {
    return this.popups[side];
  }

  render(): void {
    this.renderSide("attacker");
    this.renderSide("target");
  }

  private buildPopup(side: Side): Popup {
    const trigger = side === "attacker" ? this.els.attackerEwarTrigger : this.els.targetEwarTrigger;
    const popup = side === "attacker" ? this.els.attackerEwarPopup : this.els.targetEwarPopup;
    return {
      isOpen: () => !popup.hidden,
      open: () => { popup.hidden = false; trigger.setAttribute("aria-expanded", "true"); },
      close: () => {
        this.scriptPopups[side].close();
        popup.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      },
      focusTrigger: () => trigger.focus(),
      contains: (target) => target instanceof Element && target.closest(`#${side}-ewar-field`) !== null,
    };
  }

  private buildScriptPopup(side: Side): Popup {
    const field = side === "attacker" ? this.els.attackerEwarField : this.els.targetEwarField;
    const popup = document.createElement("div");
    popup.id = `${side}-ewar-script-popup`;
    popup.className = "ewar-script-popup";
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
      contains: (target) => target instanceof Element && target.closest(`#${side}-ewar-field`) !== null,
    };
  }

  private renderSide(side: Side): void {
    const trigger = side === "attacker" ? this.els.attackerEwarTrigger : this.els.targetEwarTrigger;
    const popup = side === "attacker" ? this.els.attackerEwarPopup : this.els.targetEwarPopup;
    const summary = side === "attacker" ? this.els.attackerEwarSummary : this.els.targetEwarSummary;
    const state = this.states.get(side);
    const modulesLabel = this.i18n.t("label.modules");
    const labelSpan = trigger.querySelector?.(".ewar-label");
    if (labelSpan) labelSpan.textContent = modulesLabel;
    trigger.setAttribute("aria-label", modulesLabel);
    popup.setAttribute("aria-label", modulesLabel);
    this.scriptPopups[side].close();
    this.scriptGears.delete(side);
    popup.innerHTML = "";
    if (!state) {
      trigger.disabled = true;
      trigger.title = this.i18n.t("title.ewar.empty");
      summary.innerHTML = "";
      return;
    }
    const scramblers = state.loadout.scramblers ?? [];
    if (state.loadout.webs.length === 0 && state.loadout.disruptors.length === 0 && scramblers.length === 0) {
      trigger.disabled = true;
      trigger.title = this.i18n.t("title.ewar.empty");
      summary.innerHTML = "";
      return;
    }
    trigger.disabled = false;
    trigger.title = "";
    this.updateSummary(side);
    if (state.loadout.webs.length > 0) {
      this.renderSection(popup, "label.ewar.web", (section) => this.renderWebs(side, state, section));
    }
    if (state.loadout.disruptors.length > 0) {
      this.renderSection(popup, "label.ewar.disruptor", (section) => this.renderDisruptors(side, state, section));
    }
    if (scramblers.length > 0) {
      this.renderSection(popup, "label.ewar.scrambler", (section) => this.renderScramblers(side, state, section));
    }
  }

  private renderSection(
    popup: HTMLElement,
    labelKey: "label.ewar.web" | "label.ewar.disruptor" | "label.ewar.scrambler",
    renderRows: (section: HTMLElement) => void,
  ): void {
    const section = document.createElement("div");
    section.className = "preview-section";
    const label = document.createElement("div");
    label.className = "preview-section-label";
    label.textContent = this.i18n.t(labelKey);
    section.appendChild(label);
    renderRows(section);
    popup.appendChild(section);
  }

  private updateSummary(side: Side): void {
    const summary = side === "attacker" ? this.els.attackerEwarSummary : this.els.targetEwarSummary;
    const state = this.states.get(side);
    summary.innerHTML = "";
    if (!state) {
      summary.textContent = "";
      return;
    }
    const scramblers = state.loadout.scramblers ?? [];
    if (state.loadout.webs.length === 0 && state.loadout.disruptors.length === 0 && scramblers.length === 0) {
      summary.textContent = "";
      return;
    }
    const webTotal = state.loadout.webs.length;
    const webActive = state.activation.webs.filter((w) => w.active).length;
    if (webTotal > 0) this.appendSummaryItem(summary, state.loadout.webs[0].moduleName, webActive, webTotal);
    const disruptorTotal = state.loadout.disruptors.length;
    const disruptorActive = state.activation.disruptors.filter((d) => d.active).length;
    if (disruptorTotal > 0) this.appendSummaryItem(summary, state.loadout.disruptors[0].moduleName, disruptorActive, disruptorTotal);
    const scramblerActive = state.activation.scramblers.filter((s) => s.active).length;
    if (scramblers.length > 0) this.appendSummaryItem(summary, scramblers[0].moduleName, scramblerActive, scramblers.length);
  }

  private appendSummaryItem(summary: HTMLElement, moduleName: string, active: number, total: number): void {
    const item = document.createElement("span");
    item.className = "ewar-summary-item";
    const iconUrl = this.imageCatalog.itemIconUrl(moduleName);
    const img = document.createElement("img");
    img.className = "ewar-summary-icon";
    img.alt = "";
    if (iconUrl !== undefined) img.src = iconUrl;
    img.hidden = iconUrl === undefined;
    item.appendChild(img);
    const count = document.createElement("span");
    count.className = "ewar-summary-count";
    count.textContent = `${active}/${total}`;
    item.appendChild(count);
    summary.appendChild(item);
  }

  private isEmpty(loadout: EwarLoadout): boolean {
    return loadout.webs.length === 0 && loadout.disruptors.length === 0 && (loadout.scramblers ?? []).length === 0;
  }

  private clampActivation(loadout: EwarLoadout, saved?: StoredEwarActivation): MutableEwarActivation {
    return {
      webs: loadout.webs.map((_, i) => {
        const savedWeb = saved?.webs?.[i];
        const active = typeof savedWeb === "boolean" ? savedWeb : savedWeb?.active ?? true;
        const overloaded = typeof savedWeb === "boolean" ? false : savedWeb?.overloaded ?? false;
        return { active, overloaded };
      }),
      disruptors: loadout.disruptors.map((disruptor, i) => {
        const savedDisruptor = saved?.disruptors?.[i];
        const savedScript = savedDisruptor?.script;
        let script: DisruptionScriptSpec | undefined;
        if (savedScript === "none") {
          script = undefined;
        } else if (savedScript !== undefined) {
          script = loadout.scripts.find((s) => s.name === savedScript) ?? disruptor.defaultScript;
        } else {
          script = disruptor.defaultScript;
        }
        return {
          active: savedDisruptor?.active ?? true,
          overloaded: savedDisruptor?.overloaded ?? false,
          script,
        };
      }),
      scramblers: (loadout.scramblers ?? []).map((_, i) => {
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
      const button = this.createModuleButton(active, web.moduleName);
      const overloadButton = this.createOverloadButton(active, overloaded, i, web.moduleName, () => this.toggleWebOverload(side, i, overloadButton));
      button.addEventListener("click", () => this.toggleWeb(side, i, button, row));
      row.appendChild(button);
      row.appendChild(overloadButton);
      section.appendChild(row);
    }
  }

  private renderDisruptors(side: Side, state: EwarState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.disruptors.length; i++) {
      const disruptor = state.loadout.disruptors[i];
      const activation = state.activation.disruptors[i];
      const row = document.createElement("div");
      row.className = activation.active ? "ewar-row" : "ewar-row ewar-row-inactive";
      const button = this.createModuleButton(activation.active, disruptor.moduleName);
      const onToggle = () => this.toggleDisruptorOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, disruptor.moduleName, onToggle);
      button.addEventListener("click", () => this.toggleDisruptor(side, i, button, row));
      row.appendChild(button);
      row.appendChild(overloadButton);
      const gear = this.createScriptGear(side, i, activation.script, activation.active);
      row.appendChild(gear);
      section.appendChild(row);
    }
  }

  private renderScramblers(side: Side, state: EwarState, section: HTMLElement): void {
    const scramblers = state.loadout.scramblers ?? [];
    for (let i = 0; i < scramblers.length; i++) {
      const scrambler: WarpScramblerSpec = scramblers[i];
      const activation = state.activation.scramblers[i];
      const row = document.createElement("div");
      row.className = activation.active ? "ewar-row" : "ewar-row ewar-row-inactive";
      const button = this.createModuleButton(activation.active, scrambler.moduleName);
      const onToggle = () => this.toggleScramblerOverload(side, i, overloadButton);
      const overloadButton = this.createOverloadButton(activation.active, activation.overloaded, i, scrambler.moduleName, onToggle);
      button.addEventListener("click", () => this.toggleScrambler(side, i, button, row));
      row.appendChild(button);
      row.appendChild(overloadButton);
      section.appendChild(row);
    }
  }

  private createModuleButton(active: boolean, moduleName: string): HTMLButtonElement {
    const displayName = this.fittingImport.itemName(moduleName, this.i18n.current());
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ewar-module-toggle";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", displayName);
    const iconUrl = this.imageCatalog.itemIconUrl(moduleName);
    const img = document.createElement("img");
    if (iconUrl !== undefined) img.src = iconUrl;
    img.alt = "";
    img.hidden = iconUrl === undefined;
    button.appendChild(img);
    const nameSpan = document.createElement("span");
    nameSpan.textContent = displayName;
    nameSpan.title = displayName;
    button.appendChild(nameSpan);
    return button;
  }

  private createScriptGear(side: Side, index: number, script: DisruptionScriptSpec | undefined, active: boolean): HTMLButtonElement {
    const gear = document.createElement("button");
    gear.type = "button";
    gear.className = "ewar-script-gear";
    gear.setAttribute("data-index", String(index));
    gear.setAttribute("aria-haspopup", "menu");
    gear.setAttribute("aria-expanded", "false");
    gear.setAttribute("aria-controls", `${side}-ewar-script-popup`);
    gear.innerHTML = (
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">' +
      '<use href="icons.svg#gear"></use></svg>'
    );
    this.updateGearTitle(gear, script);
    gear.disabled = !active;
    gear.addEventListener("click", () => this.openScriptPopup(side, index, gear));
    return gear;
  }

  private createOverloadButton(
    active: boolean,
    overloaded: boolean,
    index: number,
    moduleName: string,
    onToggle: () => void,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ewar-overload-button";
    button.setAttribute("data-index", String(index));
    button.setAttribute("aria-pressed", String(overloaded));
    const label = `${this.i18n.t("label.overload")} ${this.fittingImport.itemName(moduleName, this.i18n.current())}`;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = (
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">' +
      '<use href="icons.svg#overload"></use></svg>'
    );
    button.disabled = !active;
    button.classList.toggle("active", overloaded);
    button.addEventListener("click", onToggle);
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
    label.id = `${side}-ewar-script-label`;
    label.className = "ewar-script-popup-label";
    label.textContent = this.fittingImport.itemName(disruptor.moduleName, this.i18n.current());
    popup.setAttribute("aria-labelledby", label.id);
    popup.appendChild(label);

    const noneHint = this.i18n.t("ewar.script.none.hint");
    const noneButton = this.createScriptOptionButton(
      "none",
      this.i18n.t("ewar.script.none"),
      noneHint,
      undefined,
      current === undefined,
    );
    noneButton.addEventListener("click", () => this.onScriptSelected(side, index, "none"));
    popup.appendChild(noneButton);

    for (const script of state.loadout.scripts) {
      const name = this.fittingImport.itemName(script.name, this.i18n.current());
      const iconUrl = this.imageCatalog.itemIconUrl(script.name);
      const button = this.createScriptOptionButton(
        script.name,
        name,
        scriptStatSuffix(script),
        iconUrl,
        current?.name === script.name,
      );
      button.addEventListener("click", () => this.onScriptSelected(side, index, script.name));
      popup.appendChild(button);
    }
  }

  private createScriptOptionButton(
    value: string,
    text: string,
    title: string,
    iconUrl: string | undefined,
    selected: boolean,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ewar-script-option";
    button.setAttribute("role", "menuitem");
    button.setAttribute("data-value", value);
    if (selected) button.setAttribute("aria-current", "true");
    button.title = title;
    if (iconUrl !== undefined) {
      const img = document.createElement("img");
      img.src = iconUrl;
      img.alt = "";
      button.appendChild(img);
    }
    const nameSpan = document.createElement("span");
    nameSpan.textContent = text;
    nameSpan.title = text;
    button.appendChild(nameSpan);
    return button;
  }

  private onScriptSelected(side: Side, index: number, value: string): void {
    const state = this.states.get(side);
    if (!state) return;
    const script = value === "none" ? undefined : state.loadout.scripts.find((s) => s.name === value);
    if (value !== "none" && script === undefined) return;
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
    this.host?.onConfigChange();
  }

  private findGearFor(side: Side, index: number): HTMLButtonElement | undefined {
    const gearState = this.scriptGears.get(side);
    return gearState?.index === index ? gearState.gear : undefined;
  }

  private updateGearTitle(gear: HTMLButtonElement, script: DisruptionScriptSpec | undefined): void {
    const title = script ? this.fittingImport.itemName(script.name, this.i18n.current()) : this.i18n.t("ewar.script.none");
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
    this.host?.onConfigChange();
  }

  private toggleWebOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation.webs[index].overloaded;
    state.activation.webs[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));
    button.classList.toggle("active", overloaded);
    this.updateSummary(side);
    this.host?.onConfigChange();
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
    this.host?.onConfigChange();
  }

  private toggleDisruptorOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation.disruptors[index].overloaded;
    state.activation.disruptors[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));
    button.classList.toggle("active", overloaded);
    this.updateSummary(side);
    this.host?.onConfigChange();
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
    this.host?.onConfigChange();
  }

  private toggleScramblerOverload(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const overloaded = !state.activation.scramblers[index].overloaded;
    state.activation.scramblers[index].overloaded = overloaded;
    button.setAttribute("aria-pressed", String(overloaded));
    button.classList.toggle("active", overloaded);
    this.updateSummary(side);
    this.host?.onConfigChange();
  }
}

