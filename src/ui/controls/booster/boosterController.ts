import type { BoostLoadout, TurretBoostProjection, TurretScriptSpec, TrackingBoosterSpec } from "../../../sim";
import type { StoredBoosterActivation } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { boosterScriptStatSuffix } from "../controlsFormat";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../sidePanel";
import type { BoosterController, BoosterEls, BoosterHost } from "./boosterControllerContract";

interface MutableBoosterActivation {
  active: boolean;
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
  private readonly states = new Map<Side, BoosterState>();
  private readonly popups: Record<Side, Popup>;
  private readonly scriptPopups: Record<Side, Popup>;
  private readonly scriptGears = new Map<Side, { index: number; gear: HTMLButtonElement }>();
  private readonly scriptPopupEls = new Map<Side, HTMLElement>();
  private host?: BoosterHost;

  constructor(deps: { els: BoosterEls; popupGroup: PopupGroup; imageCatalog: ImageCatalog; fittingImport: FittingImport; i18n: I18n }) {
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
    this.els.attackerBoosterTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popups.attacker));
    this.els.targetBoosterTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popups.target));
    this.render();
  }

  setHost(host: BoosterHost): void {
    this.host = host;
  }

  setLoadout(side: Side, loadout: BoostLoadout): void {
    if (loadout.computers.length === 0) {
      this.states.delete(side);
    } else {
      this.states.set(side, { loadout, activation: this.clampActivation(loadout) });
    }
    this.host?.onConfigChange();
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
      script: a.script?.name ?? "none",
    }));
  }


  render(): void {
    this.renderSide("attacker");
    this.renderSide("target");
  }

  updateSummaries(): void {
    this.updateSummary("attacker");
    this.updateSummary("target");
  }

  private buildPopup(side: Side): Popup {
    const trigger = side === "attacker" ? this.els.attackerBoosterTrigger : this.els.targetBoosterTrigger;
    const popup = side === "attacker" ? this.els.attackerBoosterPopup : this.els.targetBoosterPopup;
    return {
      isOpen: () => !popup.hidden,
      open: () => { popup.hidden = false; trigger.setAttribute("aria-expanded", "true"); },
      close: () => {
        this.scriptPopups[side].close();
        popup.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      },
      focusTrigger: () => trigger.focus(),
      contains: (target) => target instanceof Element && target.closest(`#${side}-booster-field`) !== null,
    };
  }

  private buildScriptPopup(side: Side): Popup {
    const field = side === "attacker" ? this.els.attackerBoosterField : this.els.targetBoosterField;
    const popup = document.createElement("div");
    popup.id = `${side}-booster-script-popup`;
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
      contains: (target) => target instanceof Element && target.closest(`#${side}-booster-field`) !== null,
    };
  }

  private renderSide(side: Side): void {
    const trigger = side === "attacker" ? this.els.attackerBoosterTrigger : this.els.targetBoosterTrigger;
    const popup = side === "attacker" ? this.els.attackerBoosterPopup : this.els.targetBoosterPopup;
    const summary = side === "attacker" ? this.els.attackerBoosterSummary : this.els.targetBoosterSummary;
    const state = this.states.get(side);
    const label = this.i18n.t("label.booster.computer");
    const labelSpan = trigger.querySelector?.(".booster-label");
    if (labelSpan) labelSpan.textContent = label;
    trigger.setAttribute("aria-label", label);
    popup.setAttribute("aria-label", label);
    this.scriptPopups[side].close();
    this.scriptGears.delete(side);
    popup.innerHTML = "";
    if (!state || state.loadout.computers.length === 0) {
      trigger.disabled = true;
      trigger.title = this.i18n.t("title.booster.empty");
      summary.innerHTML = "";
      return;
    }
    trigger.disabled = false;
    trigger.title = "";
    this.updateSummary(side);
    this.renderSection(popup, "label.booster.computer", (section) => this.renderComputers(side, state, section));
  }

  private renderSection(popup: HTMLElement, labelKey: "label.booster.computer", renderRows: (section: HTMLElement) => void): void {
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
    const summary = side === "attacker" ? this.els.attackerBoosterSummary : this.els.targetBoosterSummary;
    const state = this.states.get(side);
    summary.innerHTML = "";
    if (!state || state.loadout.computers.length === 0) {
      summary.textContent = "";
      return;
    }
    const active = state.activation.filter((a) => a.active).length;
    const title = this.boosterDescription(state);
    this.appendSummaryItem(summary, state.loadout.computers[0].moduleName, active, state.loadout.computers.length, title);
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

  private appendSummaryItem(summary: HTMLElement, moduleName: string, active: number, total: number, title: string): void {
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
    item.setAttribute("title", title);
    summary.appendChild(item);
  }

  private clampActivation(loadout: BoostLoadout, saved?: readonly StoredBoosterActivation[]): MutableBoosterActivation[] {
    return loadout.computers.map((spec, i) => {
      const savedActivation = saved?.[i];
      const savedScriptName = savedActivation?.script;
      let script: TurretScriptSpec | undefined;
      if (savedScriptName === "none" || savedScriptName === "") {
        script = undefined;
      } else if (savedScriptName !== undefined) {
        script = loadout.scripts.find((s) => s.name === savedScriptName) ?? spec.defaultScript;
      } else {
        script = spec.defaultScript;
      }
      return { active: savedActivation?.active ?? true, script };
    });
  }

  private renderComputers(side: Side, state: BoosterState, section: HTMLElement): void {
    for (let i = 0; i < state.loadout.computers.length; i++) {
      const computer = state.loadout.computers[i];
      const activation = state.activation[i];
      const row = document.createElement("div");
      row.className = activation.active ? "ewar-row" : "ewar-row ewar-row-inactive";
      const button = this.createModuleButton(activation.active, computer.moduleName);
      button.addEventListener("click", () => this.toggleComputer(side, i, button, row));
      row.appendChild(button);
      const gear = this.createScriptGear(side, i, activation.script, activation.active);
      row.appendChild(gear);
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

  private createScriptGear(side: Side, index: number, script: TurretScriptSpec | undefined, active: boolean): HTMLButtonElement {
    const gear = document.createElement("button");
    gear.type = "button";
    gear.className = "ewar-script-gear";
    gear.setAttribute("data-index", String(index));
    gear.setAttribute("aria-haspopup", "menu");
    gear.setAttribute("aria-expanded", "false");
    gear.setAttribute("aria-controls", `${side}-booster-script-popup`);
    gear.innerHTML = (
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">' +
      '<use href="icons.svg#gear"></use></svg>'
    );
    this.updateGearTitle(gear, script);
    gear.disabled = !active;
    gear.addEventListener("click", () => this.openScriptPopup(side, index, gear));
    return gear;
  }

  private updateGearTitle(gear: HTMLButtonElement, script: TurretScriptSpec | undefined): void {
    const name = script?.name ?? this.i18n.t("ewar.script.none");
    const title = `${name}${script ? ` · ${boosterScriptStatSuffix(script)}` : ""}`;
    gear.title = title;
    gear.setAttribute("aria-label", title);
  }

  private openScriptPopup(side: Side, index: number, gear: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    this.scriptGears.set(side, { index, gear });
    const popup = this.scriptPopupEls.get(side);
    if (!popup) return;
    popup.innerHTML = "";
    const current = state.activation[index].script;
    const noneButton = this.createScriptOption(side, index, gear, undefined, current === undefined);
    popup.appendChild(noneButton);
    for (const script of state.loadout.scripts) {
      popup.appendChild(this.createScriptOption(side, index, gear, script, current?.name === script.name));
    }
    gear.setAttribute("aria-expanded", "true");
    this.scriptPopups[side].open();
  }

  private createScriptOption(side: Side, index: number, gear: HTMLButtonElement, script: TurretScriptSpec | undefined, selected: boolean): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ewar-script-option";
    if (selected) button.setAttribute("aria-current", "true");
    button.setAttribute("role", "menuitem");
    button.textContent = script ? `${script.name} · ${boosterScriptStatSuffix(script)}` : this.i18n.t("ewar.script.none");
    button.addEventListener("click", () => this.setScript(side, index, script, gear));
    return button;
  }

  private setScript(side: Side, index: number, script: TurretScriptSpec | undefined, gear: HTMLButtonElement): void {
    const state = this.states.get(side);
    if (!state) return;
    state.activation[index].script = script;
    this.updateGearTitle(gear, script);
    this.scriptPopups[side].close();
    this.updateSummary(side);
    this.host?.onConfigChange();
  }

  private toggleComputer(side: Side, index: number, button: HTMLButtonElement, row: HTMLElement): void {
    const state = this.states.get(side);
    if (!state) return;
    const activation = state.activation[index];
    activation.active = !activation.active;
    button.setAttribute("aria-pressed", String(activation.active));
    row.className = activation.active ? "ewar-row" : "ewar-row ewar-row-inactive";
    this.renderSide(side);
    this.host?.onConfigChange();
  }
}
