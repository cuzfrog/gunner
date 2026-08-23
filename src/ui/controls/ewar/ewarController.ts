import { ALL_ACTIVE } from "../../../sim";
import type { DisruptionScript, EwarActivation, EwarLoadout, EwarProjection } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { ChoiceGroupImpl } from "../choiceGroup";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../sidePanel";
import type { EwarController, EwarEls, EwarHost } from "./ewarControllerContract";

const SCRIPT_VALUES: readonly DisruptionScript[] = ["none", "optimalRange", "trackingSpeed"];

interface MutableEwarActivation {
  webs: { active: boolean }[];
  disruptors: { active: boolean; script: DisruptionScript }[];
}

interface EwarState {
  loadout: EwarLoadout;
  activation: MutableEwarActivation;
}

export class EwarControllerImpl implements EwarController {
  private readonly els: EwarEls;
  private readonly popupGroup: PopupGroup;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly states = new Map<Side, EwarState>();
  private readonly popups: Record<Side, Popup>;
  private host?: EwarHost;

  constructor(deps: { els: EwarEls; popupGroup: PopupGroup; imageCatalog: ImageCatalog; i18n: I18n }) {
    this.els = deps.els;
    this.popupGroup = deps.popupGroup;
    this.imageCatalog = deps.imageCatalog;
    this.i18n = deps.i18n;
    this.popups = { attacker: this.buildPopup("attacker"), target: this.buildPopup("target") };
    this.popupGroup.register(this.popups.attacker);
    this.popupGroup.register(this.popups.target);
    this.render();
  }

  setHost(host: EwarHost): void {
    this.host = host;
  }

  setLoadout(side: Side, loadout: EwarLoadout): void {
    this.states.set(side, { loadout, activation: toMutableActivation(ALL_ACTIVE(loadout)) });
    this.host?.onConfigChange();
    this.renderSide(side);
  }

  restore(side: Side, loadout: EwarLoadout | undefined, saved?: StoredEwarActivation): void {
    if (!loadout || (loadout.webs.length === 0 && loadout.disruptors.length === 0)) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout, saved) });
    }
    this.renderSide(side);
  }

  projection(side: Side, overloaded: boolean): EwarProjection | undefined {
    const state = this.states.get(side);
    if (!state || (state.loadout.webs.length === 0 && state.loadout.disruptors.length === 0)) return undefined;
    return { loadout: state.loadout, activation: state.activation, overloaded };
  }

  capture(side: Side): StoredEwarActivation | undefined {
    const state = this.states.get(side);
    if (!state || (state.loadout.webs.length === 0 && state.loadout.disruptors.length === 0)) return undefined;
    return {
      webs: state.activation.webs.map((w) => w.active),
      disruptors: state.activation.disruptors.map((d) => ({ active: d.active, script: d.script })),
    };
  }

  fittedCount(side: Side): number {
    const state = this.states.get(side);
    if (!state) return 0;
    return state.loadout.webs.length + state.loadout.disruptors.length;
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
      close: () => { popup.hidden = true; trigger.setAttribute("aria-expanded", "false"); },
      focusTrigger: () => trigger.focus(),
      contains: (target) => target instanceof Element && target.closest(`#${side}-ewar-field`) !== null,
    };
  }

  private renderSide(side: Side): void {
    const trigger = side === "attacker" ? this.els.attackerEwarTrigger : this.els.targetEwarTrigger;
    const popup = side === "attacker" ? this.els.attackerEwarPopup : this.els.targetEwarPopup;
    const summary = side === "attacker" ? this.els.attackerEwarSummary : this.els.targetEwarSummary;
    const state = this.states.get(side);
    const label = this.ewarLabel(state);
    const labelSpan = trigger.querySelector?.(".ewar-label");
    if (labelSpan) labelSpan.textContent = label;
    trigger.setAttribute("aria-label", label);
    popup.setAttribute("aria-label", label);
    popup.innerHTML = "";
    if (!state || (state.loadout.webs.length === 0 && state.loadout.disruptors.length === 0)) {
      trigger.disabled = true;
      trigger.title = this.i18n.t("title.ewar.empty");
      summary.textContent = "";
      return;
    }
    trigger.disabled = false;
    trigger.title = "";
    this.updateSummary(side);
    this.renderWebs(side, state, popup);
    this.renderDisruptors(side, state, popup);
  }

  private ewarLabel(state: EwarState | undefined): string {
    const hasWebs = state !== undefined && state.loadout.webs.length > 0;
    const hasDisruptors = state !== undefined && state.loadout.disruptors.length > 0;
    if (hasWebs && !hasDisruptors) return this.i18n.t("label.ewar.web");
    if (!hasWebs && hasDisruptors) return this.i18n.t("label.ewar.disruptor");
    return this.i18n.t("label.ewar.mixed");
  }

  private updateSummary(side: Side): void {
    const summary = side === "attacker" ? this.els.attackerEwarSummary : this.els.targetEwarSummary;
    const state = this.states.get(side);
    if (!state || (state.loadout.webs.length === 0 && state.loadout.disruptors.length === 0)) {
      summary.textContent = "";
      return;
    }
    const activeCount = state.activation.webs.filter((w) => w.active).length + state.activation.disruptors.filter((d) => d.active).length;
    const totalCount = state.loadout.webs.length + state.loadout.disruptors.length;
    summary.textContent = totalCount > 0 ? `${activeCount}/${totalCount}` : "";
  }

  private clampActivation(loadout: EwarLoadout, saved?: StoredEwarActivation): MutableEwarActivation {
    return {
      webs: loadout.webs.map((_, i) => ({ active: saved?.webs?.[i] ?? true })),
      disruptors: loadout.disruptors.map((disruptor, i) => ({
        active: saved?.disruptors?.[i]?.active ?? true,
        script: saved?.disruptors?.[i]?.script ?? disruptor.defaultScript,
      })),
    };
  }

  private renderWebs(side: Side, state: EwarState, popup: HTMLElement): void {
    for (let i = 0; i < state.loadout.webs.length; i++) {
      const web = state.loadout.webs[i];
      const active = state.activation.webs[i].active;
      const button = this.createModuleButton(active, web.moduleName);
      button.addEventListener("click", () => this.toggleWeb(side, i, button));
      const row = document.createElement("div");
      row.className = "ewar-row";
      row.appendChild(button);
      popup.appendChild(row);
    }
  }

  private renderDisruptors(side: Side, state: EwarState, popup: HTMLElement): void {
    for (let i = 0; i < state.loadout.disruptors.length; i++) {
      const disruptor = state.loadout.disruptors[i];
      const active = state.activation.disruptors[i].active;
      const row = document.createElement("div");
      row.className = active ? "ewar-row" : "ewar-row ewar-row-inactive";
      const button = this.createModuleButton(active, disruptor.moduleName);
      button.addEventListener("click", () => this.toggleDisruptor(side, i, button, row));
      row.appendChild(button);
      const select = document.createElement("select");
      select.hidden = true;
      for (const value of SCRIPT_VALUES) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      }
      select.value = state.activation.disruptors[i].script;
      select.addEventListener("input", () => this.onScriptInput(side, i, select.value));
      row.appendChild(select);
      const group = document.createElement("div");
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", disruptor.moduleName);
      group.className = "ewar-script-choice";
      for (const value of SCRIPT_VALUES) {
        const scriptButton = document.createElement("button");
        scriptButton.type = "button";
        scriptButton.setAttribute("data-value", value);
        scriptButton.textContent = this.i18n.t(scriptI18nKey(value));
        scriptButton.title = this.i18n.t(scriptHintI18nKey(value));
        scriptButton.disabled = !active;
        group.appendChild(scriptButton);
      }
      row.appendChild(group);
      const choice = new ChoiceGroupImpl(group, select, SCRIPT_VALUES);
      choice.set(state.activation.disruptors[i].script);
      popup.appendChild(row);
    }
  }

  private createModuleButton(active: boolean, moduleName: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ewar-module-toggle";
    button.setAttribute("aria-pressed", String(active));
    const iconUrl = this.imageCatalog.itemIconUrl(moduleName);
    const img = document.createElement("img");
    if (iconUrl !== undefined) img.src = iconUrl;
    img.alt = "";
    img.hidden = iconUrl === undefined;
    button.appendChild(img);
    const nameSpan = document.createElement("span");
    nameSpan.textContent = moduleName;
    nameSpan.title = moduleName;
    button.appendChild(nameSpan);
    return button;
  }

  private onScriptInput(side: Side, index: number, value: string): void {
    const script = toDisruptionScript(value);
    if (script === undefined) return;
    const state = this.states.get(side);
    if (!state) return;
    state.activation.disruptors[index].script = script;
    this.host?.onConfigChange();
  }

  private toggleWeb(side: Side, index: number, button: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    state.activation.webs[index].active = !state.activation.webs[index].active;
    button.setAttribute("aria-pressed", String(state.activation.webs[index].active));
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
    const scriptGroup = row.children[2];
    for (const child of scriptGroup.children) {
      (child as HTMLButtonElement).disabled = !active;
    }
    this.updateSummary(side);
    this.host?.onConfigChange();
  }
}

function toMutableActivation(activation: EwarActivation): MutableEwarActivation {
  return {
    webs: activation.webs.map((w) => ({ active: w.active })),
    disruptors: activation.disruptors.map((d) => ({ active: d.active, script: d.script })),
  };
}

function toDisruptionScript(value: string): DisruptionScript | undefined {
  return SCRIPT_VALUES.find((v) => v === value);
}

function scriptI18nKey(script: DisruptionScript): "ewar.script.none" | "ewar.script.optimal" | "ewar.script.tracking" {
  return script === "none" ? "ewar.script.none" : script === "optimalRange" ? "ewar.script.optimal" : "ewar.script.tracking";
}

function scriptHintI18nKey(script: DisruptionScript): "ewar.script.none.hint" | "ewar.script.optimal.hint" | "ewar.script.tracking.hint" {
  return script === "none" ? "ewar.script.none.hint" : script === "optimalRange" ? "ewar.script.optimal.hint" : "ewar.script.tracking.hint";
}
