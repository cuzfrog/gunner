import { type DefenseAssessment, type DefenseLayer, type DefenseSpec, type DefenseView, type EngagementView, type RepairerSpec, EMPTY_DEFENSE_SPEC } from "../../../sim";
import type { TypeId } from "../../../gamedata/ids";
import type { StoredRahActivation, StoredRepairMode, StoredRepairerActivation } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import { formatWithCommas } from "../controlsFormat";
import { DAMAGE_ICON_URLS, DAMAGE_TYPE_ORDER } from "../damageTypeIcons";
import { html } from "../markup";
import type { Popup, PopupGroup } from "../popup";
import { SectionBlockImpl } from "../shared";
import type { Side } from "../side";
import type { DefenseController, DefenseEls } from "./defenseControllerContract";

const DEFENSE_LAYERS: readonly DefenseLayer[] = ["shield", "armor", "hull"];

export class DefenseControllerImpl implements DefenseController {
  private readonly els: DefenseEls;
  private readonly popupGroup: PopupGroup;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly specs = new Map<Side, DefenseSpec>();
  private readonly assessments = new Map<Side, DefenseAssessment>();
  private readonly damageEnabledState: Record<Side, boolean> = { shipA: true, shipB: true };
  private readonly repairModeState: Record<Side, StoredRepairMode> = { shipA: "auto", shipB: "auto" };
  private readonly repairerActivationState: Record<Side, StoredRepairerActivation[]> = { shipA: [], shipB: [] };
  private readonly rahActivationState: Record<Side, StoredRahActivation | undefined> = { shipA: undefined, shipB: undefined };
  private readonly damageToggleButtons: Record<Side, HTMLButtonElement | undefined> = { shipA: undefined, shipB: undefined };
  private readonly popups: Record<Side, Popup>;
  private readonly sectionBlock: SectionBlockImpl;
  private defenseView: DefenseView | undefined;

  constructor(deps: { els: DefenseEls; popupGroup: PopupGroup; i18n: I18n; events: UiEvents }) {
    this.els = deps.els;
    this.popupGroup = deps.popupGroup;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.sectionBlock = new SectionBlockImpl();
    this.popups = { shipA: this.buildPopup("shipA"), shipB: this.buildPopup("shipB") };
    this.popupGroup.register(this.popups.shipA);
    this.popupGroup.register(this.popups.shipB);
    this.els.shipADefenseTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popups.shipA));
    this.els.shipBDefenseTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popups.shipB));
    this.events.onFittingImported((side, imported) => this.setDefenseSpec(side, imported.defense));
    this.events.onLanguageChanged(() => this.render());
    this.render();
  }

  setDefenseSpec(side: Side, spec: DefenseSpec): void {
    if (isEmptySpec(spec)) {
      this.specs.delete(side);
    } else {
      this.specs.set(side, spec);
    }
    this.renderSide(side);
  }

  spec(side: Side): DefenseSpec | undefined {
    return this.specs.get(side);
  }

  updateAssessments(view: EngagementView): void {
    this.assessments.set("shipA", view.defenses.shipA);
    this.assessments.set("shipB", view.defenses.shipB);
    if (!this.popups.shipA.isOpen()) this.renderSide("shipA");
    if (!this.popups.shipB.isOpen()) this.renderSide("shipB");
  }

  updateDefenseView(view: DefenseView): void {
    this.defenseView = view;
  }

  updateSummaries(): void {
    this.updateSummary("shipA");
    this.updateSummary("shipB");
  }

  signaturePenalty(side: Side): number {
    return this.specs.get(side)?.signaturePenalty ?? 0;
  }

  updateEffectiveSig(side: Side, baseSig: number): void {
    const el = side === "shipA" ? this.els.shipAEffectiveSig : this.els.shipBEffectiveSig;
    const penalty = this.signaturePenalty(side);
    if (penalty > 0) {
      el.textContent = `${formatWithCommas(baseSig + penalty)}m`;
      el.classList.add("is-negative");
      el.setAttribute("data-hint", this.i18n.t("hint.effectiveSigPenalty").replace("{penalty}", formatWithCommas(penalty)));
    } else {
      el.textContent = "";
      el.classList.remove("is-negative");
    }
  }

  damageEnabled(side: Side): boolean {
    return this.damageEnabledState[side];
  }

  setDamageEnabled(side: Side, enabled: boolean): void {
    this.damageEnabledState[side] = enabled;
    this.renderDamageEnabled(side);
    this.events.emitConfigInvalidated();
  }

  repairMode(side: Side): StoredRepairMode {
    return this.repairModeState[side];
  }

  setRepairMode(side: Side, mode: StoredRepairMode): void {
    this.repairModeState[side] = mode;
    this.events.emitConfigInvalidated();
  }

  repairerActivation(side: Side): readonly StoredRepairerActivation[] {
    return this.repairerActivationState[side];
  }

  setRepairerActivation(side: Side, index: number, active: boolean, overloaded: boolean): void {
    const list = this.repairerActivationState[side];
    while (list.length <= index) list.push({ active: true, overloaded: true });
    list[index] = { active, overloaded };
    this.events.emitConfigInvalidated();
  }

  rahActivation(side: Side): StoredRahActivation | undefined {
    return this.rahActivationState[side];
  }

  setRahActivation(side: Side, active: boolean, overloaded: boolean): void {
    this.rahActivationState[side] = { active, overloaded };
    this.events.emitConfigInvalidated();
  }

  restore(side: Side, enabled: boolean, repMode?: StoredRepairMode, repairerActivation?: readonly StoredRepairerActivation[], rahActivation?: StoredRahActivation): void {
    this.damageEnabledState[side] = enabled;
    if (repMode !== undefined) this.repairModeState[side] = repMode;
    if (repairerActivation !== undefined) this.repairerActivationState[side] = [...repairerActivation];
    this.rahActivationState[side] = rahActivation;
  }

  cyclingEffects(side: Side): readonly { readonly moduleId: TypeId; readonly hint: string }[] {
    const spec = this.specs.get(side);
    if (!spec || !this.defenseView) return [];
    const effects: { moduleId: TypeId; hint: string }[] = [];
    const repairerViews = this.defenseView.repairers[side];
    for (let i = 0; i < spec.repairers.length && i < repairerViews.length; i++) {
      const repairerSpec = spec.repairers[i];
      const repairerView = repairerViews[i];
      if (!repairerView.cycling || repairerSpec.moduleId === undefined) continue;
      effects.push({ moduleId: repairerSpec.moduleId, hint: this.i18n.t(layerLabelKey(repairerSpec.layer)) });
    }
    const rahView = this.defenseView.rah[side];
    if (rahView?.cycling && spec.rah?.moduleId !== undefined) {
      effects.push({ moduleId: spec.rah.moduleId, hint: this.i18n.t("defense.rah") });
    }
    return effects;
  }

  render(): void {
    this.renderSide("shipA");
    this.renderSide("shipB");
  }

  private buildPopup(side: Side): Popup {
    const trigger = side === "shipA" ? this.els.shipADefenseTrigger : this.els.shipBDefenseTrigger;
    const popup = side === "shipA" ? this.els.shipADefensePopup : this.els.shipBDefensePopup;
    const field = side === "shipA" ? this.els.shipADefenseField : this.els.shipBDefenseField;
    return {
      isOpen: () => !popup.hidden,
      open: () => { popup.hidden = false; trigger.setAttribute("aria-expanded", "true"); },
      close: () => { popup.hidden = true; trigger.setAttribute("aria-expanded", "false"); },
      focusTrigger: () => trigger.focus(),
      contains: (domTarget) => domTarget instanceof Element && field.contains(domTarget),
    };
  }

  private renderSide(side: Side): void {
    const trigger = side === "shipA" ? this.els.shipADefenseTrigger : this.els.shipBDefenseTrigger;
    const popup = side === "shipA" ? this.els.shipADefensePopup : this.els.shipBDefensePopup;
    const section = side === "shipA" ? this.els.shipADefenseSection : this.els.shipBDefenseSection;
    const spec = this.specs.get(side);
    const defenseLabel = this.i18n.t("label.defense");
    const labelSpan = trigger.querySelector?.(".defense-label");
    if (labelSpan) labelSpan.textContent = defenseLabel;
    trigger.setAttribute("aria-label", defenseLabel);
    popup.setAttribute("aria-label", defenseLabel);
    section.innerHTML = "";
    if (!spec) {
      trigger.disabled = true;
      trigger.setAttribute("data-hint", this.i18n.t("title.defense.empty"));
      this.updateSummary(side);
      this.popups[side].close();
      return;
    }
    trigger.disabled = false;
    trigger.setAttribute("data-hint", "");
    this.updateSummary(side);
    const heading = html`<div class="preview-section-label">${defenseLabel}</div>`;
    section.appendChild(heading);
    this.renderResistsSection(section, spec);
    this.renderHpSection(section, spec);
    this.renderEhpSection(section, side);
    this.renderRepairerSection(section, spec);
    this.renderShieldRegenSection(section, side);
    this.renderDamageEnabledSection(section, side);
    this.renderRepairModeSection(section, side);
    this.renderRepairerActivationSection(section, side, spec);
    this.renderRahActivationSection(section, side, spec);
    this.popups[side].close();
  }

  private renderResistsSection(section: HTMLElement, spec: DefenseSpec): void {
    const rows: (Element | DocumentFragment)[] = [];
    for (const layer of DEFENSE_LAYERS) {
      const layerSpec = spec.layers[layer];
      const cells: (Element | DocumentFragment)[] = [];
      for (const type of DAMAGE_TYPE_ORDER) {
        const iconUrl = DAMAGE_ICON_URLS[type];
        const resistPercent = Math.round(layerSpec.resists[type] * 100);
        const cell = html`<span class="defense-resist-cell"><img class="defense-resist-icon" alt="" src=${iconUrl}><span class="defense-resist-value mono">${resistPercent}%</span></span>`;
        cells.push(cell);
      }
      const row = html`<div class="defense-layer-row"><span class="defense-layer-label">${this.i18n.t(layerLabelKey(layer))}</span><span class="defense-resist-grid">${cells}</span></div>`;
      rows.push(row);
    }
    const block = this.sectionBlock.create(this.i18n.t("defense.resists"), rows);
    section.appendChild(block);
  }

  private renderHpSection(section: HTMLElement, spec: DefenseSpec): void {
    const rows: (Element | DocumentFragment)[] = [];
    for (const layer of DEFENSE_LAYERS) {
      const layerSpec = spec.layers[layer];
      const row = html`<div class="defense-hp-row"><span class="defense-hp-label">${this.i18n.t(layerLabelKey(layer))}</span><span class="defense-hp-value mono">${formatWithCommas(layerSpec.hp)}</span></div>`;
      rows.push(row);
    }
    const block = this.sectionBlock.create(this.i18n.t("defense.hp"), rows);
    section.appendChild(block);
  }

  private renderEhpSection(section: HTMLElement, side: Side): void {
    const assessment = this.assessments.get(side);
    if (!assessment) return;
    const rows: (Element | DocumentFragment)[] = [];
    for (const layer of DEFENSE_LAYERS) {
      const layerEhp = assessment.layers[layer];
      const row = html`<div class="defense-ehp-row"><span class="defense-ehp-label">${this.i18n.t(layerLabelKey(layer))}</span><span class="defense-ehp-value mono">${formatWithCommas(layerEhp.ehp)}</span></div>`;
      rows.push(row);
    }
    const totalRow = html`<div class="defense-ehp-row"><span class="defense-ehp-label">${this.i18n.t("defense.totalEhp")}</span><span class="defense-ehp-value mono">${formatWithCommas(assessment.totalEhp)}</span></div>`;
    rows.push(totalRow);
    const block = this.sectionBlock.create(this.i18n.t("defense.ehp"), rows);
    section.appendChild(block);
  }

  private renderRepairerSection(section: HTMLElement, spec: DefenseSpec): void {
    if (spec.repairers.length === 0) return;
    const rows: (Element | DocumentFragment)[] = [];
    for (const repairer of spec.repairers) {
      const hpPerSecond = repairer.amount / repairer.cycleTime;
      const row = html`<div class="defense-repairer-row"><span class="defense-repairer-name">${this.i18n.t(layerLabelKey(repairer.layer))}</span><span class="defense-repairer-stats mono">${formatWithCommas(hpPerSecond, 1)} ${this.i18n.t("defense.repairPerSecond")} · ${formatWithCommas(repairer.cycleTime, 1)}s ${this.i18n.t("defense.cycleTime")}</span></div>`;
      rows.push(row);
    }
    const block = this.sectionBlock.create(this.i18n.t("defense.repairers"), rows);
    section.appendChild(block);
  }

  private renderShieldRegenSection(section: HTMLElement, side: Side): void {
    const assessment = this.assessments.get(side);
    if (!assessment || assessment.shieldRegenPerSecond <= 0) return;
    const row = html`<div class="defense-hp-row"><span class="defense-hp-label">${this.i18n.t("defense.shieldRegen")}</span><span class="defense-hp-value mono">${formatWithCommas(assessment.shieldRegenPerSecond, 1)} ${this.i18n.t("defense.repairPerSecond")}</span></div>`;
    const block = this.sectionBlock.create(this.i18n.t("defense.shieldRegen"), [row]);
    section.appendChild(block);
  }

  private renderDamageEnabledSection(section: HTMLElement, side: Side): void {
    const enabled = this.damageEnabledState[side];
    const label = this.i18n.t("label.damageEnabled");
    const button = html`<button class="defense-damage-toggle" aria-pressed=${enabled ? "true" : "false"}>${label}: ${enabled ? this.i18n.t("defense.damageEnabled.on") : this.i18n.t("defense.damageEnabled.off")}</button>`;
    button.addEventListener("click", () => {
      this.setDamageEnabled(side, !this.damageEnabledState[side]);
    });
    this.damageToggleButtons[side] = button as unknown as HTMLButtonElement;
    const block = this.sectionBlock.create(this.i18n.t("label.damageEnabled"), [button]);
    section.appendChild(block);
  }

  private renderDamageEnabled(side: Side): void {
    const button = this.damageToggleButtons[side];
    if (!button) return;
    const enabled = this.damageEnabledState[side];
    const label = this.i18n.t("label.damageEnabled");
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
    button.textContent = `${label}: ${enabled ? this.i18n.t("defense.damageEnabled.on") : this.i18n.t("defense.damageEnabled.off")}`;
  }

  private renderRepairModeSection(section: HTMLElement, side: Side): void {
    const mode = this.repairModeState[side];
    const autoButton = html`<button class="defense-repair-mode-toggle" aria-pressed=${mode === "auto" ? "true" : "false"}>${this.i18n.t("defense.repairMode.auto")}</button>`;
    const manualButton = html`<button class="defense-repair-mode-toggle" aria-pressed=${mode === "manual" ? "true" : "false"}>${this.i18n.t("defense.repairMode.manual")}</button>`;
    autoButton.addEventListener("click", () => { this.setRepairMode(side, "auto"); this.renderSide(side); });
    manualButton.addEventListener("click", () => { this.setRepairMode(side, "manual"); this.renderSide(side); });
    const block = this.sectionBlock.create(this.i18n.t("label.repairMode"), [autoButton, manualButton]);
    section.appendChild(block);
  }

  private renderRepairerActivationSection(section: HTMLElement, side: Side, spec: DefenseSpec): void {
    if (spec.repairers.length === 0) return;
    const autoMode = this.repairModeState[side] === "auto";
    const repairerViews = this.defenseView?.repairers[side] ?? [];
    const rows: (Element | DocumentFragment)[] = [];
    for (let i = 0; i < spec.repairers.length; i++) {
      const repairer = spec.repairers[i];
      const repairerView = repairerViews[i];
      const activation = this.repairerActivationState[side][i] ?? { active: true, overloaded: true };
      const activeButton = html`<button class="defense-module-toggle" aria-pressed=${activation.active ? "true" : "false"}${autoMode ? " disabled" : ""}>${this.i18n.t(activation.active ? "defense.module.active" : "defense.module.inactive")}</button>`;
      const overloadButton = html`<button class="defense-module-overload" aria-pressed=${activation.overloaded ? "true" : "false"}${autoMode ? " disabled" : ""}>${this.i18n.t("defense.module.overload")}</button>`;
      activeButton.addEventListener("click", () => { this.setRepairerActivation(side, i, !activation.active, activation.overloaded); this.renderSide(side); });
      overloadButton.addEventListener("click", () => { this.setRepairerActivation(side, i, activation.active, !activation.overloaded); this.renderSide(side); });
      const statusParts: string[] = [];
      if (repairerView) {
        statusParts.push(`${this.i18n.t("defense.module.hpPerSecond")} ${repairerView.hpPerSecond.toFixed(1)}`);
        if (repairerView.cycling) statusParts.push(this.i18n.t("defense.module.cycling"));
        if (repairerView.reloading) statusParts.push(this.i18n.t("defense.module.reloading"));
        if (repairerSpecHasAncillary(repairer)) statusParts.push(`${this.i18n.t("defense.module.charges")} ${repairerView.ancillaryCharges}`);
      }
      const statusSpan = statusParts.length > 0 ? html`<span class="defense-module-status">${statusParts.join(" · ")}</span>` : "";
      const row = html`<div class="defense-module-row"><span class="defense-module-name">${this.i18n.t(layerLabelKey(repairer.layer))}</span>${statusSpan}<span class="defense-module-controls">${activeButton}${overloadButton}</span></div>`;
      rows.push(row);
    }
    const block = this.sectionBlock.create(this.i18n.t("defense.repairers"), rows);
    section.appendChild(block);
  }

  private renderRahActivationSection(section: HTMLElement, side: Side, spec: DefenseSpec): void {
    if (!spec.rah) return;
    const autoMode = this.repairModeState[side] === "auto";
    const activation = this.rahActivationState[side] ?? { active: true, overloaded: true };
    const activeButton = html`<button class="defense-module-toggle" aria-pressed=${activation.active ? "true" : "false"}${autoMode ? " disabled" : ""}>${this.i18n.t(activation.active ? "defense.module.active" : "defense.module.inactive")}</button>`;
    const overloadButton = html`<button class="defense-module-overload" aria-pressed=${activation.overloaded ? "true" : "false"}${autoMode ? " disabled" : ""}>${this.i18n.t("defense.module.overload")}</button>`;
    activeButton.addEventListener("click", () => { this.setRahActivation(side, !activation.active, activation.overloaded); this.renderSide(side); });
    overloadButton.addEventListener("click", () => { this.setRahActivation(side, activation.active, !activation.overloaded); this.renderSide(side); });
    const row = html`<div class="defense-module-row"><span class="defense-module-name">${this.i18n.t("defense.rah")}</span><span class="defense-module-controls">${activeButton}${overloadButton}</span></div>`;
    const block = this.sectionBlock.create(this.i18n.t("defense.rah"), [row]);
    section.appendChild(block);
  }

  private updateSummary(side: Side): void {
    const summary = side === "shipA" ? this.els.shipADefenseSummary : this.els.shipBDefenseSummary;
    const spec = this.specs.get(side);
    summary.innerHTML = "";
    if (!spec) {
      summary.textContent = "";
      return;
    }
    const assessment = this.assessments.get(side);
    const totalEhp = assessment?.totalEhp ?? computeTotalEhp(spec);
    const item = html`<span class="defense-summary-item"><span class="defense-summary-count mono">${formatWithCommas(totalEhp)} EHP</span></span>`;
    summary.appendChild(item);
  }
}

function isEmptySpec(spec: DefenseSpec): boolean {
  return spec === EMPTY_DEFENSE_SPEC || (spec.layers.shield.hp === 0 && spec.layers.armor.hp === 0 && spec.layers.hull.hp === 0 && spec.repairers.length === 0);
}

function layerLabelKey(layer: DefenseLayer): string {
  if (layer === "shield") return "defense.layer.shield";
  if (layer === "armor") return "defense.layer.armor";
  return "defense.layer.hull";
}

function repairerSpecHasAncillary(spec: RepairerSpec): boolean {
  return spec.ancillary !== undefined;
}

function computeTotalEhp(spec: DefenseSpec): number {
  let total = 0;
  for (const layer of DEFENSE_LAYERS) {
    const layerSpec = spec.layers[layer];
    let effectiveResonance = 0;
    for (const type of DAMAGE_TYPE_ORDER) {
      effectiveResonance += 0.25 * (1 - layerSpec.resists[type]);
    }
    total += effectiveResonance > 0 ? layerSpec.hp / effectiveResonance : 0;
  }
  return Math.round(total);
}
