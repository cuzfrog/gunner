import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { ItemNameCatalog } from "../../../gamedata";
import type { CapacitorStats } from "../../../fitting";
import type { CapacitorView } from "../../../sim";
import { FakeElement, fakeDocument } from "../../testing";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "../popup";
import { CapacitorControllerImpl } from "./capacitorController";
import type { CapacitorEls } from "./capacitorControllerContract";
import type { StoredCapBoosterCharge, StoredCapBoosterMode } from "../../../appstate";

class FakePopupGroup implements PopupGroup {
  private readonly popups: Popup[] = [];
  register(popup: Popup): void { this.popups.push(popup); }
  open(popup: Popup): void { for (const p of this.popups) if (p !== popup && p.isOpen()) p.close(); if (!popup.isOpen()) popup.open(); }
  toggle(popup: Popup): void { if (popup.isOpen()) this.close(popup); else this.open(popup); }
  close(popup: Popup): void { if (popup.isOpen()) popup.close(); }
  closeAll(): void { for (const p of this.popups) if (p.isOpen()) p.close(); }
  hasOpen(): boolean { return this.popups.some((p) => p.isOpen()); }
  onPointerDown(): void {}
  onKeyDown(): void {}
}

const TEMPLATES: Record<string, string> = {
  "label.capacitor": "Capacitor",
  "title.capacitor.empty": "No fitting imported",
  "capacitor.runtime": "Runtime",
  "capacitor.stats": "Statistics",
  "capacitor.capacity": "Capacity",
  "capacitor.recharge": "Recharge time",
  "capacitor.peak": "Peak recharge",
  "capacitor.usage": "Usage",
  "capacitor.delta": "Delta",
  "capacitor.stability": "Stability",
  "capacitor.stable": "Stable @ {percent}%",
  "capacitor.depletes": "Depletes in {time}",
  "capacitor.percentage": "Charge",
  "capacitor.net": "Net",
  "capacitor.infinite": "Infinite capacitor",
  "capacitor.infinite.on": "Infinite",
  "capacitor.infinite.off": "Finite",
  "capacitor.boosters": "Cap boosters",
  "capacitor.selectCharge": "Cap booster charge",
  "capacitor.inject": "Inject charge",
  "capacitor.reloading": "Reloading {time}s",
  "capacitor.insufficient": "Insufficient capacitor",
  "capacitor.rowOff": "Off",
  "capacitor.incoming": "Incoming drain",
  "capacitor.incoming.none": "No incoming drains",
  "defense.repairMode.auto": "Auto",
  "defense.repairMode.manual": "Manual",
};

function buildI18n(): I18n {
  return { current: vi.fn(() => "en"), setLanguage: vi.fn(), t: vi.fn((key: string) => TEMPLATES[key] ?? key), translateDocument: vi.fn() } as unknown as I18n;
}

interface EventsMock {
  onFittingImported: ReturnType<typeof vi.fn>;
  onLanguageChanged: ReturnType<typeof vi.fn>;
  emitConfigInvalidated: ReturnType<typeof vi.fn>;
  emitCapBoosterInject: ReturnType<typeof vi.fn>;
}

function buildEvents(): { events: UiEvents; mock: EventsMock } {
  const mock: EventsMock = {
    onFittingImported: vi.fn(),
    onLanguageChanged: vi.fn(),
    emitConfigInvalidated: vi.fn(),
    emitCapBoosterInject: vi.fn(),
  };
  return { events: mock as unknown as UiEvents, mock };
}

function buildEls(): CapacitorEls {
  const cast = (el: FakeElement) => el as unknown as HTMLElement;
  const trigger = (el: FakeElement) => el as unknown as HTMLButtonElement;
  const side = () => ({
    field: cast(new FakeElement()),
    trigger: trigger(new FakeElement()),
    popup: cast(new FakeElement()),
    section: cast(new FakeElement()),
    summary: cast(new FakeElement()),
  });
  return { shipA: side(), shipB: side() };
}

function capacitorStats(overrides: Partial<CapacitorStats> = {}): CapacitorStats {
  return {
    spec: { capacity: 6375, rechargeTime: 648 },
    peakRecharge: 24.59,
    rows: [],
    usagePerSecond: 10,
    boosters: [],
    stablePercent: 87.3,
    ...overrides,
  };
}

function capacitorView(overrides: Partial<CapacitorView> = {}): CapacitorView {
  return {
    cap: 1000, capacity: 6375, percentage: 15.7, regenPerSecond: 10, netPerSecond: -5.25, incomingDrainPerSecond: 0,
    starved: false, starvedModuleIds: [], propulsionStarved: false, drains: [], boosters: [], incoming: [],
    ...overrides,
  };
}

const BOOSTER_MODULE = toTypeId("3581");
const CHARGE_NAVY = toTypeId("11269");
const NEUTRALIZER_MODULE = toTypeId("12271");
const NOSFERATU_MODULE = toTypeId("12259");

function buildCatalog(): ItemNameCatalog {
  return { nameForId: vi.fn((id: TypeId) => (id === NEUTRALIZER_MODULE ? "Heavy Energy Neutralizer II" : id === NOSFERATU_MODULE ? "Medium Energy Nosferatu II" : `mod-${id}`)) };
}

function statsWithBooster(chargeId: TypeId | undefined): CapacitorStats {
  return capacitorStats({
    boosters: [{
      moduleId: BOOSTER_MODULE,
      moduleName: "Capacitor Booster II",
      ...(chargeId !== undefined ? { chargeId } : {}),
      cycleTime: 10,
      reloadTime: 60,
      chargeOptions: [{ id: CHARGE_NAVY, name: "Navy Cap Booster 800", amount: 800, clipSize: 3 }],
    }],
  });
}

function findByClass(root: FakeElement, className: string): FakeElement[] {
  const out: FakeElement[] = [];
  for (const child of root.children) {
    if (child.className.split(" ").includes(className)) out.push(child);
    out.push(...findByClass(child, className));
  }
  return out;
}

function textOf(el: FakeElement): string {
  return el.textContent + el.children.map(textOf).join("");
}

function summaryText(els: CapacitorEls): string {
  return (els.shipA.summary as unknown as FakeElement).children.map(textOf).join("");
}

describe("CapacitorControllerImpl stats rendering", () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
    globalThis.Element = FakeElement as unknown as typeof Element;
    globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  });

  test("disables the field and clears the summary when no capacitor stats exist", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    expect(els.shipA.trigger.disabled).toBe(true);
    expect(els.shipA.trigger.getAttribute("data-hint")).toBe("No fitting imported");
    expect(summaryText(els)).toBe("");
  });

  test("enables the field and shows the stable percentage in the summary", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats());
    expect(els.shipA.trigger.disabled).toBe(false);
    expect(summaryText(els)).toBe("Stable @ 87.3%");
  });

  test("shows the depletion countdown in the summary when the fitting is not cap-stable", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats({ stablePercent: undefined, depletesInSeconds: 90.4 }));
    expect(summaryText(els)).toBe("Depletes in 1:30");
  });

  test("renders static stats and the runtime bar into the popup section", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats());
    const section = els.shipA.section as unknown as FakeElement;
    const statRows = findByClass(section, "capacitor-stat-row").map(textOf);
    expect(statRows.some((t) => t.includes("Capacity") && t.includes("6,375"))).toBe(true);
    expect(statRows.some((t) => t.includes("Stable @ 87.3%"))).toBe(true);
  });

  test("updates runtime values and colors the bar by charge thresholds", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats());
    controller.updateRuntime({ shipA: capacitorView(), shipB: capacitorView() });
    const section = els.shipA.section as unknown as FakeElement;
    const fill = findByClass(section, "capacitor-bar-fill")[0];
    expect(fill.style["--fill"]).toBe("15.7%");
    expect(fill.className).toBe("capacitor-bar-fill is-critical");
    const net = findByClass(section, "capacitor-value").map(textOf).find((text) => text.includes("-5.25"));
    expect(net).toBeDefined();
  });

  test("marks a usage row starved with the insufficient-capacitor hint", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats({
      rows: [{ moduleId: BOOSTER_MODULE, moduleName: "Microwarpdrive II", amount: 200, cycleTime: 10, perSecond: 20, count: 1 }],
    }));
    controller.updateRuntime({ shipA: capacitorView({ starvedModuleIds: [BOOSTER_MODULE] }), shipB: capacitorView() });
    const section = els.shipA.section as unknown as FakeElement;
    const row = findByClass(section, "capacitor-usage-row")[0];
    expect(row.className).toBe("capacitor-usage-row is-starved");
    const stateLabel = findByClass(section, "capacitor-row-state")[0];
    expect(stateLabel.hidden).toBe(false);
    expect(stateLabel.textContent).toBe("Insufficient capacitor");
  });

  test("keeps usage rows running when no runtime view arrived yet", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats({
      rows: [{ moduleId: BOOSTER_MODULE, moduleName: "Microwarpdrive II", amount: 200, cycleTime: 10, perSecond: 20, count: 1 }],
    }));
    const section = els.shipA.section as unknown as FakeElement;
    const row = findByClass(section, "capacitor-usage-row")[0];
    expect(row.className).toBe("capacitor-usage-row");
    expect(findByClass(section, "capacitor-row-state")[0].hidden).toBe(true);
  });

  test("shows a booster reload countdown and re-enables manual inject between cycles", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", statsWithBooster(CHARGE_NAVY));
    const reloading = capacitorView({
      boosters: [{ moduleId: BOOSTER_MODULE, amount: 800, cycleTime: 10, clipSize: 3, reloadTime: 60, mode: "manual", charges: 0, cycleTimer: 0, reloading: true, reloadTimer: 3.04 }],
    });
    controller.updateRuntime({ shipA: reloading, shipB: capacitorView() });
    const section = els.shipA.section as unknown as FakeElement;
    const status = findByClass(section, "capacitor-booster-status")[0];
    expect(status.textContent).toBe("Reloading 3.0s 0/3");
    const inject = findByClass(section, "capacitor-inject-button")[0];
    expect(inject.getAttribute("disabled")).not.toBeNull();
    const ready = capacitorView({
      boosters: [{ moduleId: BOOSTER_MODULE, amount: 800, cycleTime: 10, clipSize: 3, reloadTime: 60, mode: "manual", charges: 2, cycleTimer: 0, reloading: false, reloadTimer: 0 }],
    });
    controller.updateRuntime({ shipA: ready, shipB: capacitorView() });
    expect(status.textContent).toBe("2/3");
    expect(inject.getAttribute("disabled")).toBeNull();
  });
});

describe("CapacitorControllerImpl summary and playing state", () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
    globalThis.Element = FakeElement as unknown as typeof Element;
    globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  });

  test("live percentage replaces the static summary while playing and keeps the threshold class", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats());
    controller.updateRuntime({ shipA: capacitorView({ percentage: 41.06 }), shipB: capacitorView() });
    controller.setPlaying(true);
    expect(summaryText(els)).toBe("41.1%");
    const value = findByClass(els.shipA.summary as unknown as FakeElement, "trigger-summary-count")[0];
    expect(value.className).toBe("trigger-summary-count mono");
    controller.updateRuntime({ shipA: capacitorView({ percentage: 30 }), shipB: capacitorView() });
    expect(summaryText(els)).toBe("30.0%");
    expect(findByClass(els.shipA.summary as unknown as FakeElement, "trigger-summary-count")[0].className).toBe("trigger-summary-count mono is-low");
    controller.setPlaying(false);
    expect(summaryText(els)).toBe("Stable @ 87.3%");
  });
});

describe("CapacitorControllerImpl configuration state", () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
    globalThis.Element = FakeElement as unknown as typeof Element;
    globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  });

  test("infinite capacitor toggle defaults to false and emits config invalidation on change", () => {
    const els = buildEls();
    const { events, mock } = buildEvents();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events, itemNameCatalog: buildCatalog() });
    expect(controller.infiniteCapacitor("shipA")).toBe(false);
    controller.setInfiniteCapacitor("shipA", true);
    expect(controller.infiniteCapacitor("shipA")).toBe(true);
    expect(mock.emitConfigInvalidated).toHaveBeenCalledTimes(1);
    expect(controller.infiniteCapacitor("shipB")).toBe(false);
  });

  test("booster mode defaults to auto and emits config invalidation on change", () => {
    const els = buildEls();
    const { events, mock } = buildEvents();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events, itemNameCatalog: buildCatalog() });
    expect(controller.capBoosterMode("shipA", BOOSTER_MODULE)).toBe("auto");
    controller.setCapBoosterMode("shipA", BOOSTER_MODULE, "manual");
    expect(controller.capBoosterMode("shipA", BOOSTER_MODULE)).toBe("manual");
    expect(mock.emitConfigInvalidated).toHaveBeenCalledTimes(1);
  });

  test("capBoosterSpecs uses the fitted charge unless overridden and excludes unresolvable boosters", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", statsWithBooster(CHARGE_NAVY));
    expect(controller.capBoosterCharge("shipA", BOOSTER_MODULE)).toBe(CHARGE_NAVY);
    expect(controller.capBoosterSpecs("shipA")).toEqual([{ moduleId: BOOSTER_MODULE, amount: 800, cycleTime: 10, clipSize: 3, reloadTime: 60, mode: "auto" }]);
    controller.setCapBoosterCharge("shipA", BOOSTER_MODULE, toTypeId("99999999"));
    expect(controller.capBoosterSpecs("shipA")).toEqual([]);
    controller.setCapBoosterMode("shipA", BOOSTER_MODULE, "manual");
    controller.setCapBoosterCharge("shipA", BOOSTER_MODULE, CHARGE_NAVY);
    expect(controller.capBoosterSpecs("shipA")).toEqual([{ moduleId: BOOSTER_MODULE, amount: 800, cycleTime: 10, clipSize: 3, reloadTime: 60, mode: "manual" }]);
  });

  test("boosters without any charge are excluded from the sim specs", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", statsWithBooster(undefined));
    expect(controller.capBoosterCharge("shipA", BOOSTER_MODULE)).toBeUndefined();
    expect(controller.capBoosterSpecs("shipA")).toEqual([]);
  });

  test("capture and restore round-trip the capacitor configuration", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setInfiniteCapacitor("shipA", true);
    controller.setCapBoosterMode("shipA", BOOSTER_MODULE, "manual");
    controller.setCapBoosterCharge("shipA", BOOSTER_MODULE, CHARGE_NAVY);
    const captured = controller.capture("shipA");
    expect(captured).toEqual({
      infinite: true,
      modes: [{ moduleId: BOOSTER_MODULE, mode: "manual" }],
      charges: [{ moduleId: BOOSTER_MODULE, chargeId: CHARGE_NAVY }],
    });
    const restored = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    restored.restore("shipA", captured.infinite, captured.modes as readonly StoredCapBoosterMode[], captured.charges as readonly StoredCapBoosterCharge[]);
    expect(restored.infiniteCapacitor("shipA")).toBe(true);
    expect(restored.capBoosterMode("shipA", BOOSTER_MODULE)).toBe("manual");
    expect(restored.capBoosterCharge("shipA", BOOSTER_MODULE)).toBe(CHARGE_NAVY);
  });
});

describe("CapacitorControllerImpl events", () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
    globalThis.Element = FakeElement as unknown as typeof Element;
    globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  });

  test("refreshes the stats when a fitting is imported", () => {
    const els = buildEls();
    const { events, mock } = buildEvents();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events, itemNameCatalog: buildCatalog() });
    const listener = mock.onFittingImported.mock.calls[0][0] as (side: "shipA" | "shipB", imported: { capacitor: CapacitorStats }) => void;
    listener("shipA", { capacitor: capacitorStats() });
    expect(summaryText(els)).toBe("Stable @ 87.3%");
  });

  test("manual inject emits the booster index for the clicked module", () => {
    const els = buildEls();
    const { events, mock } = buildEvents();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events, itemNameCatalog: buildCatalog() });
    const second = toTypeId("2031");
    const twoBoosters = capacitorStats({
      boosters: [
        { moduleId: BOOSTER_MODULE, moduleName: "First", chargeId: CHARGE_NAVY, cycleTime: 10, reloadTime: 60, chargeOptions: [{ id: CHARGE_NAVY, name: "Navy Cap Booster 800", amount: 800, clipSize: 3 }] },
        { moduleId: second, moduleName: "Second", cycleTime: 10, reloadTime: 60, chargeOptions: [{ id: CHARGE_NAVY, name: "Navy Cap Booster 800", amount: 800, clipSize: 3 }] },
      ],
    });
    controller.setCapacitorStats("shipA", twoBoosters);
    controller.updateRuntime({
      shipA: capacitorView({ boosters: [
        { moduleId: BOOSTER_MODULE, amount: 800, cycleTime: 10, clipSize: 3, reloadTime: 60, mode: "manual", charges: 2, cycleTimer: 0, reloading: false, reloadTimer: 0 },
        { moduleId: second, amount: 800, cycleTime: 10, clipSize: 3, reloadTime: 60, mode: "manual", charges: 1, cycleTimer: 0, reloading: false, reloadTimer: 0 },
      ] }),
      shipB: capacitorView(),
    });
    const section = els.shipA.section as unknown as FakeElement;
    const buttons = findByClass(section, "capacitor-inject-button");
    expect(buttons.length).toBe(2);
    (buttons[1] as unknown as FakeElement).trigger("click");
    expect(mock.emitCapBoosterInject).toHaveBeenCalledWith("shipA", 1);
  });

  test("re-renders on language change", () => {
    const els = buildEls();
    const { events, mock } = buildEvents();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats());
    expect(summaryText(els)).toBe("Stable @ 87.3%");
    const listener = mock.onLanguageChanged.mock.calls[0][0] as () => void;
    listener();
    expect(summaryText(els)).toBe("Stable @ 87.3%");
  });
});

describe("CapacitorControllerImpl incoming drains", () => {
  test("shows the empty incoming state before any drains arrive", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats());
    const section = els.shipA.section as unknown as FakeElement;
    const rows = findByClass(section, "capacitor-incoming-row");
    expect(rows.length).toBe(1);
    expect(rows[0].className).toBe("capacitor-incoming-row is-off");
    expect(textOf(rows[0])).toBe("No incoming drains");
  });

  test("renders incoming drain rows with catalog names and per-second values", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats());
    controller.updateRuntime({
      shipA: capacitorView({ incoming: [
        { moduleId: NEUTRALIZER_MODULE, amount: 1200, interval: 24, transfer: false, count: 2, timer: 3, running: true },
        { moduleId: NOSFERATU_MODULE, amount: 36, interval: 5, transfer: true, count: 1, timer: 0, running: true },
      ] }),
      shipB: capacitorView(),
    });
    const section = els.shipA.section as unknown as FakeElement;
    const rows = findByClass(section, "capacitor-incoming-row");
    expect(rows.length).toBe(2);
    expect(rows[0].className).toBe("capacitor-incoming-row");
    expect(textOf(rows[0])).toContain("Heavy Energy Neutralizer II x2");
    expect(textOf(rows[0])).toContain("50.00 GJ/s");
    expect(textOf(rows[1])).toContain("Medium Energy Nosferatu II");
    expect(textOf(rows[1])).toContain("7.20 GJ/s");
    const states = findByClass(section, "capacitor-row-state");
    expect(states.every((state) => state.hidden)).toBe(true);
  });

  test("marks incoming rows off when the drain is not running", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.setCapacitorStats("shipA", capacitorStats());
    controller.updateRuntime({
      shipA: capacitorView({ incoming: [{ moduleId: NEUTRALIZER_MODULE, amount: 600, interval: 24, transfer: false, count: 1, timer: 0, running: false }] }),
      shipB: capacitorView(),
    });
    const section = els.shipA.section as unknown as FakeElement;
    const row = findByClass(section, "capacitor-incoming-row")[0];
    expect(row.className).toBe("capacitor-incoming-row is-off");
    const stateLabel = findByClass(section, "capacitor-row-state")[0];
    expect(stateLabel.hidden).toBe(false);
    expect(stateLabel.textContent).toBe("Off");
  });

  test("rebuilds incoming rows when a fitting replaces the runtime view", () => {
    const els = buildEls();
    const controller = new CapacitorControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildEvents().events, itemNameCatalog: buildCatalog() });
    controller.updateRuntime({
      shipA: capacitorView({ incoming: [{ moduleId: NEUTRALIZER_MODULE, amount: 600, interval: 24, transfer: false, count: 1, timer: 0, running: true }] }),
      shipB: capacitorView(),
    });
    controller.setCapacitorStats("shipA", capacitorStats());
    const section = els.shipA.section as unknown as FakeElement;
    const rows = findByClass(section, "capacitor-incoming-row");
    expect(rows.length).toBe(1);
    expect(textOf(rows[0])).toContain("Heavy Energy Neutralizer II");
  });
});
