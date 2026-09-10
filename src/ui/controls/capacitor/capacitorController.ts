import type { CapBoosterMode, CapBoosterSimSpec, CapacitorView, IncomingDrainState } from "../../../sim";
import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { ItemNameCatalog } from "../../../gamedata";
import type { CapacitorBoosterStats, CapacitorStats } from "../../../fitting";
import type { StoredCapBoosterCharge, StoredCapBoosterMode } from "../../../appstate";
import type { I18n, Language } from "../../i18n";
import type { UiEvents } from "../../events";
import { formatWithCommas } from "../controlsFormat";
import { ChoiceGroupImpl } from "../choiceGroup";
import { html } from "../markup";
import type { PopupGroup } from "../popup";
import { IconActionImpl, PopupField, ScriptSection, SectionBlockImpl, spriteIcon, type ScriptOption } from "../shared";
import type { Side } from "../side";
import type { CapacitorController, CapacitorEls } from "./capacitorControllerContract";

const LOW_PERCENT = 33;
const CRITICAL_PERCENT = 25;
const GJ = "GJ";
const GJ_PER_SECOND = "GJ/s";
const STATE_RUNNING = "running";
const STATE_STARVED = "starved";
const STATE_OFF = "off";

interface BoosterLiveRefs {
  readonly moduleId: TypeId;
  readonly status: HTMLElement;
  readonly injectButton: HTMLButtonElement;
}

interface LiveRefs {
  readonly barFill: HTMLElement;
  readonly barValue: HTMLElement;
  readonly percentage: HTMLElement;
  readonly net: HTMLElement;
  readonly usageRows: UsageRowRefs[];
  boosters: BoosterLiveRefs[];
  incoming: HTMLElement | undefined;
}

interface UsageRowRefs {
  readonly moduleId: TypeId;
  readonly element: HTMLElement;
  readonly stateLabel: HTMLElement;
}

interface SummaryRefs {
  readonly value: HTMLElement;
}

export class CapacitorControllerImpl implements CapacitorController {
  private readonly els: CapacitorEls;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly popupGroup: PopupGroup;
  private readonly statsBySide = new Map<Side, CapacitorStats>();
  private readonly runtimeViews: Record<Side, CapacitorView | undefined> = { shipA: undefined, shipB: undefined };
  private readonly infiniteState: Record<Side, boolean> = { shipA: false, shipB: false };
  private readonly boosterModes: Record<Side, Map<TypeId, CapBoosterMode>> = { shipA: new Map(), shipB: new Map() };
  private readonly boosterCharges: Record<Side, Map<TypeId, TypeId>> = { shipA: new Map(), shipB: new Map() };
  private readonly sectionBlock: SectionBlockImpl;
  private readonly injectAction: IconActionImpl;
  private readonly fields: Record<Side, PopupField>;
  private readonly itemNameCatalog: ItemNameCatalog;
  private readonly chargeSections: Record<Side, ScriptSection<TypeId>>;
  private readonly liveRefs: Record<Side, LiveRefs | undefined> = { shipA: undefined, shipB: undefined };
  private readonly summaryRefs: Record<Side, SummaryRefs | undefined> = { shipA: undefined, shipB: undefined };
  private playing = false;

  constructor(deps: { els: CapacitorEls; popupGroup: PopupGroup; i18n: I18n; events: UiEvents; itemNameCatalog: ItemNameCatalog }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.popupGroup = deps.popupGroup;
    this.itemNameCatalog = deps.itemNameCatalog;
    this.sectionBlock = new SectionBlockImpl();
    this.injectAction = new IconActionImpl({
      buttonClass: "capacitor-inject-button btn icon-button",
      iconSvg: spriteIcon("ammo", 16, "currentColor"),
      hint: "",
    });
    this.fields = {
      shipA: new PopupField({ els: deps.els.shipA, popupGroup: deps.popupGroup }),
      shipB: new PopupField({ els: deps.els.shipB, popupGroup: deps.popupGroup }),
    };
    this.chargeSections = {
      shipA: this.buildChargeSection("shipA"),
      shipB: this.buildChargeSection("shipB"),
    };
    this.events.onFittingImported((side, imported) => this.setCapacitorStats(side, imported.capacitor));
    this.events.onLanguageChanged(() => this.render());
    this.render();
  }

  setCapacitorStats(side: Side, stats: CapacitorStats): void {
    if (stats.spec.capacity <= 0) this.statsBySide.delete(side);
    else this.statsBySide.set(side, stats);
    this.renderSide(side);
  }

  updateRuntime(view: Record<Side, CapacitorView>): void {
    this.runtimeViews.shipA = view.shipA;
    this.runtimeViews.shipB = view.shipB;
    this.updateLive("shipA");
    this.updateLive("shipB");
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.updateLive("shipA");
    this.updateLive("shipB");
  }

  render(): void {
    this.renderSide("shipA");
    this.renderSide("shipB");
  }

  infiniteCapacitor(side: Side): boolean {
    return this.infiniteState[side];
  }

  setInfiniteCapacitor(side: Side, infinite: boolean): void {
    this.infiniteState[side] = infinite;
    this.events.emitConfigInvalidated();
  }

  capBoosterMode(side: Side, moduleId: TypeId): CapBoosterMode {
    return this.boosterModes[side].get(moduleId) ?? "auto";
  }

  setCapBoosterMode(side: Side, moduleId: TypeId, mode: CapBoosterMode): void {
    this.boosterModes[side].set(moduleId, mode);
    this.events.emitConfigInvalidated();
  }

  capBoosterCharge(side: Side, moduleId: TypeId): TypeId | undefined {
    return this.boosterCharges[side].get(moduleId) ?? this.fittedCharge(side, moduleId);
  }

  setCapBoosterCharge(side: Side, moduleId: TypeId, chargeId: TypeId): void {
    this.boosterCharges[side].set(moduleId, chargeId);
    this.events.emitConfigInvalidated();
  }

  capBoosterSpecs(side: Side): readonly CapBoosterSimSpec[] {
    const stats = this.statsBySide.get(side);
    if (!stats) return [];
    const specs: CapBoosterSimSpec[] = [];
    for (const booster of stats.boosters) {
      const chargeId = this.capBoosterCharge(side, booster.moduleId);
      if (chargeId === undefined) continue;
      const option = booster.chargeOptions.find((candidate) => candidate.id === chargeId);
      if (!option) continue;
      specs.push({
        moduleId: booster.moduleId,
        amount: option.amount,
        cycleTime: booster.cycleTime,
        clipSize: option.clipSize,
        reloadTime: booster.reloadTime,
        mode: this.capBoosterMode(side, booster.moduleId),
      });
    }
    return specs;
  }

  restore(side: Side, infinite: boolean, modes?: readonly StoredCapBoosterMode[], charges?: readonly StoredCapBoosterCharge[]): void {
    this.infiniteState[side] = infinite;
    this.boosterModes[side] = new Map((modes ?? []).map((entry) => [entry.moduleId, entry.mode]));
    this.boosterCharges[side] = new Map((charges ?? []).map((entry) => [entry.moduleId, entry.chargeId]));
    this.renderSide(side);
  }

  capture(side: Side): { infinite: boolean; modes: readonly StoredCapBoosterMode[]; charges: readonly StoredCapBoosterCharge[] } {
    return {
      infinite: this.infiniteState[side],
      modes: [...this.boosterModes[side].entries()].map(([moduleId, mode]) => ({ moduleId, mode })),
      charges: [...this.boosterCharges[side].entries()].map(([moduleId, chargeId]) => ({ moduleId, chargeId })),
    };
  }

  private buildChargeSection(side: Side): ScriptSection<TypeId> {
    return new ScriptSection<TypeId>({
      popupId: `${sideId(side)}-capacitor-charge-popup`,
      mountEl: this.els[side].field,
      parentPopup: this.fields[side].popup,
      popupGroup: this.popupGroup,
      listShape: { itemClass: "capacitor-charge-option", nameClass: "capacitor-charge-name", role: "menuitem" },
      placement: side === "shipA" ? "alongside-end" : "alongside-start",
      options: (moduleId) => this.chargeOptions(side, moduleId),
      onSelect: (moduleId, value) => { this.setCapBoosterCharge(side, moduleId, toTypeId(value)); this.renderSide(side); },
      gearHint: (moduleId) => this.chargeGearHint(side, moduleId),
      heading: () => this.i18n.t("capacitor.selectCharge"),
    });
  }

  private chargeOptions(side: Side, moduleId: TypeId): readonly ScriptOption[] {
    const booster = this.boosterFor(side, moduleId);
    if (!booster) return [];
    const current = this.capBoosterCharge(side, moduleId);
    return booster.chargeOptions.map((option) => ({
      value: option.id,
      label: option.name,
      hint: `${formatWithCommas(option.amount)} ${GJ}`,
      selected: option.id === current,
    }));
  }

  private chargeGearHint(side: Side, moduleId: TypeId): string {
    const booster = this.boosterFor(side, moduleId);
    const chargeId = this.capBoosterCharge(side, moduleId);
    const option = booster?.chargeOptions.find((candidate) => candidate.id === chargeId);
    return option ? option.name : this.i18n.t("capacitor.selectCharge");
  }

  private boosterFor(side: Side, moduleId: TypeId): CapacitorBoosterStats | undefined {
    return this.statsBySide.get(side)?.boosters.find((booster) => booster.moduleId === moduleId);
  }

  private fittedCharge(side: Side, moduleId: TypeId): TypeId | undefined {
    return this.boosterFor(side, moduleId)?.chargeId;
  }

  private renderSide(side: Side): void {
    const field = this.fields[side];
    const section = field.clearSection();
    const stats = this.statsBySide.get(side);
    const label = this.i18n.t("label.capacitor");
    field.applyLabel(label);
    this.liveRefs[side] = undefined;
    this.summaryRefs[side] = undefined;
    if (!stats) {
      field.setEnabled(false, this.i18n.t("title.capacitor.empty"));
      this.els[side].summary.innerHTML = "";
      field.close();
      return;
    }
    field.setEnabled(true, "");
    this.renderSummary(side);
    if (!section) return;
    section.appendChild(this.sectionBlock.create(this.i18n.t("capacitor.runtime"), this.runtimeRows(side)));
    section.appendChild(this.sectionBlock.create(this.i18n.t("capacitor.stats"), this.statRows(stats)));
    this.renderUsageSection(section, side, stats);
    this.renderIncomingSection(side, section);
    this.renderBoosterSection(section, side, stats);
    this.renderInfiniteSection(section, side);
    this.updateLive(side);
  }

  private runtimeRows(side: Side): (Element | DocumentFragment)[] {
    const row = html`<div class="capacitor-bar-row"><div class="capacitor-bar-track"><div class="capacitor-bar-fill"></div></div><span class="capacitor-bar-value mono"></span></div>` as unknown as HTMLElement;
    const percentage = html`<span class="capacitor-value mono"></span>` as unknown as HTMLElement;
    const net = html`<span class="capacitor-value mono"></span>` as unknown as HTMLElement;
    const track = row.querySelector<HTMLElement>(".capacitor-bar-track");
    const fill = track?.querySelector<HTMLElement>(".capacitor-bar-fill");
    const barValue = row.querySelector<HTMLElement>(".capacitor-bar-value");
    if (!track || !fill || !barValue) throw new Error("capacitor bar markup incomplete");
    this.liveRefs[side] = {
      barFill: fill,
      barValue,
      percentage,
      net,
      usageRows: [],
      boosters: [],
      incoming: undefined,
    };
    return [
      row,
      html`<div class="capacitor-stat-row"><span class="capacitor-stat-label">${this.i18n.t("capacitor.percentage")}</span>${percentage}</div>`,
      html`<div class="capacitor-stat-row"><span class="capacitor-stat-label">${this.i18n.t("capacitor.net")}</span>${net}</div>`,
    ];
  }

  private statRows(stats: CapacitorStats): (Element | DocumentFragment)[] {
    return [
      this.statRow("capacitor.capacity", `${formatWithCommas(Math.round(stats.spec.capacity))} ${GJ}`),
      this.statRow("capacitor.recharge", `${formatWithCommas(stats.spec.rechargeTime, 1)}s`),
      this.statRow("capacitor.peak", `${formatWithCommas(stats.peakRecharge, 2)} ${GJ_PER_SECOND}`),
      this.statRow("capacitor.usage", `${formatWithCommas(stats.usagePerSecond, 2)} ${GJ_PER_SECOND}`),
      this.statRow("capacitor.delta", `${formatWithCommas(stats.peakRecharge - stats.usagePerSecond, 2)} ${GJ_PER_SECOND}`),
      this.statRow("capacitor.stability", this.stabilityText(stats)),
    ];
  }

  private statRow(labelKey: string, value: string): Element | DocumentFragment {
    return html`<div class="capacitor-stat-row"><span class="capacitor-stat-label">${this.i18n.t(labelKey)}</span><span class="capacitor-value mono">${value}</span></div>`;
  }

  private stabilityText(stats: CapacitorStats): string {
    return stats.stablePercent !== undefined
      ? this.i18n.t("capacitor.stable").replace("{percent}", formatWithCommas(stats.stablePercent, 1))
      : this.i18n.t("capacitor.depletes").replace("{time}", formatDuration(stats.depletesInSeconds ?? 0));
  }

  private renderUsageSection(section: HTMLElement, side: Side, stats: CapacitorStats): void {
    const live = this.liveRefs[side];
    if (!live || stats.rows.length === 0) return;
    const rows: (Element | DocumentFragment)[] = [];
    for (const row of stats.rows) {
      const name = row.count > 1 ? `${row.moduleName} x${row.count}` : row.moduleName;
      const element = html`<div class="capacitor-usage-row"><span class="capacitor-usage-name">${name}</span><span class="capacitor-usage-value mono">${formatWithCommas(row.perSecond, 2)} ${GJ_PER_SECOND}</span><span class="capacitor-row-state" hidden></span></div>` as unknown as HTMLElement;
      const stateLabel = element.querySelector<HTMLElement>(".capacitor-row-state");
      if (!stateLabel) throw new Error("capacitor usage row markup incomplete");
      live.usageRows.push({ moduleId: row.moduleId, element, stateLabel });
      rows.push(element);
    }
    section.appendChild(this.sectionBlock.create(this.i18n.t("capacitor.usage"), rows));
    this.updateUsageRows(side);
  }

  private renderIncomingSection(side: Side, section: HTMLElement): void {
    const live = this.liveRefs[side];
    if (!live) return;
    const container = html`<div></div>` as unknown as HTMLElement;
    live.incoming = container;
    section.appendChild(this.sectionBlock.create(this.i18n.t("capacitor.incoming"), [container]));
    this.updateIncomingRows(side);
  }

  private updateIncomingRows(side: Side): void {
    const live = this.liveRefs[side];
    if (!live?.incoming) return;
    live.incoming.innerHTML = "";
    const incoming = this.runtimeViews[side]?.incoming ?? [];
    if (incoming.length === 0) {
      live.incoming.appendChild(this.incomingRow(undefined));
      return;
    }
    const language = this.i18n.current();
    for (const entry of incoming) live.incoming.appendChild(this.incomingRow(entry, language));
  }

  private incomingRow(entry: IncomingDrainState | undefined, language?: Language): HTMLElement {
    if (!entry) return html`<div class="capacitor-incoming-row is-off"><span class="capacitor-incoming-name">${this.i18n.t("capacitor.incoming.none")}</span></div>` as unknown as HTMLElement;
    const name = entry.count > 1 ? `${this.itemNameCatalog.nameForId(entry.moduleId, language ?? "en")} x${entry.count}` : this.itemNameCatalog.nameForId(entry.moduleId, language ?? "en");
    const perSecond = entry.interval > 0 ? entry.amount / entry.interval : 0;
    const element = html`<div class="capacitor-incoming-row"><span class="capacitor-incoming-name">${name}</span><span class="capacitor-incoming-value mono">${formatWithCommas(perSecond, 2)} ${GJ_PER_SECOND}</span><span class="capacitor-row-state" hidden></span></div>` as unknown as HTMLElement;
    const stateLabel = element.querySelector<HTMLElement>(".capacitor-row-state");
    if (!stateLabel) throw new Error("capacitor incoming row markup incomplete");
    element.className = entry.running ? "capacitor-incoming-row" : "capacitor-incoming-row is-off";
    stateLabel.hidden = entry.running;
    stateLabel.textContent = entry.running ? "" : this.i18n.t("capacitor.rowOff");
    return element;
  }

  private updateUsageRows(side: Side): void {
    const live = this.liveRefs[side];
    if (!live) return;
    for (const ref of live.usageRows) {
      const state = this.usageRowState(side, ref.moduleId);
      ref.element.className = state === STATE_RUNNING ? "capacitor-usage-row" : state === STATE_STARVED ? "capacitor-usage-row is-starved" : "capacitor-usage-row is-off";
      ref.stateLabel.textContent = this.i18n.t(state === STATE_STARVED ? "capacitor.insufficient" : "capacitor.rowOff");
      ref.stateLabel.hidden = state === STATE_RUNNING;
    }
  }

  private usageRowState(side: Side, moduleId: TypeId): "running" | "starved" | "off" {
    const view = this.runtimeViews[side];
    if (!view) return STATE_RUNNING;
    if (view.starvedModuleIds.includes(moduleId)) return STATE_STARVED;
    const drain = view.drains.find((candidate) => candidate.moduleId === moduleId);
    if (drain) {
      if (!drain.running) return STATE_OFF;
      if (drain.starved) return STATE_STARVED;
    }
    return STATE_RUNNING;
  }

  private renderBoosterSection(section: HTMLElement, side: Side, stats: CapacitorStats): void {
    if (stats.boosters.length === 0) return;
    const refs: BoosterLiveRefs[] = [];
    const rows: (Element | DocumentFragment)[] = [];
    for (const booster of stats.boosters) {
      const modeGroup = this.buildModeGroup(side, booster.moduleId);
      const injectButton = this.buildInjectButton(side, booster.moduleId);
      const gear = this.chargeSections[side].createGear(booster.moduleId, { hint: this.chargeGearHint(side, booster.moduleId) });
      const status = html`<span class="capacitor-booster-status mono"></span>` as unknown as HTMLElement;
      const controls = html`<span class="capacitor-booster-controls">${modeGroup}${gear}${injectButton}</span>` as unknown as HTMLElement;
      rows.push(html`<div class="capacitor-booster-row"><span class="capacitor-booster-name">${booster.moduleName}</span>${controls}${status}</div>`);
      refs.push({ moduleId: booster.moduleId, status, injectButton });
    }
    const live = this.liveRefs[side];
    if (live) live.boosters = refs;
    section.appendChild(this.sectionBlock.create(this.i18n.t("capacitor.boosters"), rows));
  }

  private buildModeGroup(side: Side, moduleId: TypeId): HTMLElement {
    const group = html`<div class="segmented-control"></div>` as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape: { buttonClass: "btn" } });
    choice.render([
      { value: "auto", label: this.i18n.t("defense.repairMode.auto") },
      { value: "manual", label: this.i18n.t("defense.repairMode.manual") },
    ], this.capBoosterMode(side, moduleId));
    group.addEventListener("input", () => {
      const value = choice.value();
      if (value === "auto" || value === "manual") {
        this.setCapBoosterMode(side, moduleId, value);
        this.renderSide(side);
      }
    });
    return group;
  }

  private buildInjectButton(side: Side, moduleId: TypeId): HTMLButtonElement {
    const label = this.i18n.t("capacitor.inject");
    const button = this.injectAction.create(() => this.inject(side, moduleId));
    button.setAttribute("data-hint", label);
    button.setAttribute("aria-label", label);
    button.setAttribute("disabled", "");
    return button;
  }

  private inject(side: Side, moduleId: TypeId): void {
    const view = this.runtimeViews[side];
    if (!view) return;
    const index = view.boosters.findIndex((booster) => booster.moduleId === moduleId);
    if (index < 0) return;
    this.events.emitCapBoosterInject(side, index);
    this.updateLive(side);
  }

  private renderInfiniteSection(section: HTMLElement, side: Side): void {
    const group = html`<div class="segmented-control"></div>` as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape: { buttonClass: "btn" } });
    choice.render([
      { value: "finite", label: this.i18n.t("capacitor.infinite.off") },
      { value: "infinite", label: this.i18n.t("capacitor.infinite.on") },
    ], this.infiniteState[side] ? "infinite" : "finite");
    group.addEventListener("input", () => this.setInfiniteCapacitor(side, choice.value() === "infinite"));
    section.appendChild(this.sectionBlock.create(this.i18n.t("capacitor.infinite"), [group]));
  }

  private updateLive(side: Side): void {
    this.renderSummaryValue(side);
    const view = this.runtimeViews[side];
    const live = this.liveRefs[side];
    if (!live) return;
    this.updateIncomingRows(side);
    if (!view) return;
    const percentage = clampPercentage(view.percentage);
    live.barFill.style.setProperty("--fill", `${percentage.toFixed(1)}%`);
    live.barFill.className = percentage < CRITICAL_PERCENT ? (percentage <= 0 ? "capacitor-bar-fill is-empty" : "capacitor-bar-fill is-critical") : percentage < LOW_PERCENT ? "capacitor-bar-fill is-low" : "capacitor-bar-fill";
    live.barValue.textContent = `${formatWithCommas(Math.round(view.cap))} / ${formatWithCommas(Math.round(view.capacity))} ${GJ}`;
    live.percentage.textContent = `${percentage.toFixed(1)}%`;
    live.net.textContent = `${view.netPerSecond >= 0 ? "+" : ""}${formatWithCommas(view.netPerSecond, 2)} ${GJ_PER_SECOND}`;
    this.updateUsageRows(side);
    for (const ref of live.boosters) {
      const booster = view.boosters.find((candidate) => candidate.moduleId === ref.moduleId);
      if (!booster) continue;
      ref.status.textContent = this.boosterStatusText(booster);
      if (booster.mode === "manual" && !booster.reloading && booster.charges > 0 && booster.cycleTimer <= 0) ref.injectButton.removeAttribute("disabled");
      else ref.injectButton.setAttribute("disabled", "");
    }
  }

  private boosterStatusText(booster: CapacitorView["boosters"][number]): string {
    if (booster.reloading) return `${this.i18n.t("capacitor.reloading").replace("{time}", booster.reloadTimer.toFixed(1))} 0/${booster.clipSize}`;
    return `${booster.charges}/${booster.clipSize}`;
  }

  private renderSummary(side: Side): void {
    const summary = this.els[side].summary;
    summary.innerHTML = "";
    const value = html`<span class="trigger-summary-item"><span class="trigger-summary-count mono"></span></span>` as unknown as HTMLElement;
    const span = value.querySelector<HTMLElement>(".trigger-summary-count");
    if (!span) throw new Error("capacitor summary markup incomplete");
    summary.appendChild(value);
    this.summaryRefs[side] = { value: span };
    this.renderSummaryValue(side);
  }

  private renderSummaryValue(side: Side): void {
    const refs = this.summaryRefs[side];
    const stats = this.statsBySide.get(side);
    if (!refs || !stats) return;
    const view = this.runtimeViews[side];
    const live = this.playing && view !== undefined;
    const text = live && view
      ? `${clampPercentage(view.percentage).toFixed(1)}%`
      : this.stabilityText(stats);
    refs.value.textContent = text;
    if (live && view) {
      const percentage = clampPercentage(view.percentage);
      refs.value.className = percentage < CRITICAL_PERCENT ? (percentage <= 0 ? "trigger-summary-count mono is-empty" : "trigger-summary-count mono is-critical") : percentage < LOW_PERCENT ? "trigger-summary-count mono is-low" : "trigger-summary-count mono";
    } else {
      refs.value.className = "trigger-summary-count mono";
    }
  }
}

function clampPercentage(percentage: number): number {
  return Math.min(100, Math.max(0, percentage));
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function sideId(side: Side): string {
  return side === "shipA" ? "ship-a" : "ship-b";
}
