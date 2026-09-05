import type { SensorBoostProjection, SensorSpec } from "../../../sim";
import type { SensorBoosterResolver } from "../../../sim";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import type { PopupGroup } from "../popup";
import type { SensorBoosterController } from "../sensorBooster";
import { FakeElement, fakeDocument } from "../../testing";
import { TargetingControllerImpl } from "./targetingController";
import type { TargetingController, TargetingEls } from "./targetingControllerContract";

function fakeEls(): TargetingEls {
  const make = (): HTMLElement => new FakeElement() as unknown as HTMLElement;
  const makeButton = (): HTMLButtonElement => new FakeElement() as unknown as HTMLButtonElement;
  return {
    shipA: { field: make(), trigger: makeButton(), popup: make(), section: make(), summary: make() },
    shipB: { field: make(), trigger: makeButton(), popup: make(), section: make(), summary: make() },
  };
}

function fakeI18n(): I18n {
  const map: Record<string, string> = {
    "label.targeting": "Targeting",
    "title.targeting.empty": "No targeting data available",
    "targeting.attributes": "Sensor attributes",
    "targeting.scanResolution": "Scan resolution",
    "targeting.maxTargetingRange": "Max targeting range",
    "targeting.maxLockedTargets": "Max locked targets",
    "unit.mm": "mm",
    "unit.meter": "m",
  };
  return { t: (key: string) => map[key] ?? key } as unknown as I18n;
}

function fakeEvents(): UiEvents & { readonly listeners: Record<string, ((...args: unknown[]) => void)[]> } {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    listeners,
    onFittingImported: (cb: (...args: unknown[]) => void): void => { (listeners.onFittingImported ??= []).push(cb); },
    onLanguageChanged: (cb: (...args: unknown[]) => void): void => { (listeners.onLanguageChanged ??= []).push(cb); },
    onConfigInvalidated: (cb: (...args: unknown[]) => void): void => { (listeners.onConfigInvalidated ??= []).push(cb); },
    emitConfigInvalidated: (): void => {},
    emitLanguageChanged: (): void => {},
  } as unknown as UiEvents & { readonly listeners: Record<string, ((...args: unknown[]) => void)[]> };
}

function fakePopupGroup(): PopupGroup {
  return {
    register: (): void => {},
    toggle: (): void => {},
    closeAll: (): void => {},
  } as unknown as PopupGroup;
}

function fakeSensorBoosterController(projection: SensorBoostProjection | undefined = undefined): SensorBoosterController {
  return {
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn(() => projection),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  } as unknown as SensorBoosterController;
}

function fakeResolver(): SensorBoosterResolver {
  return {
    boostedSensorSpec: vi.fn((spec: SensorSpec) => spec),
  } as unknown as SensorBoosterResolver;
}

const SPEC: SensorSpec = { scanResolution: 200, maxTargetingRange: 30000, maxLockedTargets: 4 };

describe("TargetingController", () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
    globalThis.Element = FakeElement as unknown as typeof Element;
    globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  });

  test("renders disabled trigger when no sensor spec is set", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents(), sensorBoosterController: fakeSensorBoosterController(), resolver: fakeResolver() });
    controller.render();
    expect(els.shipA.trigger.disabled).toBe(true);
  });

  test("enables trigger and renders sensor attributes when spec is set", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents(), sensorBoosterController: fakeSensorBoosterController(), resolver: fakeResolver() });
    controller.setSensorData("shipA", SPEC);
    expect(els.shipA.trigger.disabled).toBe(false);
    expect((els.shipA.section as unknown as FakeElement).children.length).toBeGreaterThan(0);
  });

  test("does not render booster or amplifier module lists", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents(), sensorBoosterController: fakeSensorBoosterController(), resolver: fakeResolver() });
    controller.setSensorData("shipA", SPEC);
    const text = sectionText(els.shipA.section);
    expect(text).not.toContain("Sensor boosters");
    expect(text).not.toContain("Signal amplifiers");
    expect(text).not.toContain("Sensor Booster II");
  });

  test("displays boosted sensor attributes from resolver", () => {
    const els = fakeEls();
    const boosted: SensorSpec = { scanResolution: 260, maxTargetingRange: 39000, maxLockedTargets: 5 };
    const resolver = {
      boostedSensorSpec: vi.fn(() => boosted),
    } as unknown as SensorBoosterResolver;
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents(), sensorBoosterController: fakeSensorBoosterController(), resolver });
    controller.setSensorData("shipA", SPEC);
    const text = sectionText(els.shipA.section);
    expect(text).toContain("260");
    expect(text).toContain("39,000");
    expect(text).toContain("5");
    expect(resolver.boostedSensorSpec).toHaveBeenCalledWith(SPEC, undefined);
  });

  test("forwards controller projection to resolver", () => {
    const els = fakeEls();
    const projection = { loadout: { boosters: [], amplifiers: [], boosterScripts: [] }, activation: [] } as unknown as SensorBoostProjection;
    const sensorBoosterController = fakeSensorBoosterController(projection);
    const resolver = {
      boostedSensorSpec: vi.fn((spec: SensorSpec) => spec),
    } as unknown as SensorBoosterResolver;
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents(), sensorBoosterController, resolver });
    controller.setSensorData("shipA", SPEC);
    expect(sensorBoosterController.projection).toHaveBeenCalledWith("shipA");
    expect(resolver.boostedSensorSpec).toHaveBeenCalledWith(SPEC, projection);
  });

  test("updates displayed values when config is invalidated after projection change", () => {
    const els = fakeEls();
    const events = fakeEvents();
    let currentBoosted: SensorSpec = { scanResolution: 200, maxTargetingRange: 30000, maxLockedTargets: 4 };
    const resolver = {
      boostedSensorSpec: vi.fn(() => currentBoosted),
    } as unknown as SensorBoosterResolver;
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events, sensorBoosterController: fakeSensorBoosterController(), resolver });
    controller.setSensorData("shipA", SPEC);
    expect(sectionText(els.shipA.summary)).toContain("30,000");
    currentBoosted = { scanResolution: 260, maxTargetingRange: 39000, maxLockedTargets: 5 };
    for (const cb of events.listeners.onConfigInvalidated ?? []) cb();
    expect(sectionText(els.shipA.summary)).toContain("39,000");
  });

  test("renders boosted values for shipB", () => {
    const els = fakeEls();
    const boosted: SensorSpec = { scanResolution: 400, maxTargetingRange: 50000, maxLockedTargets: 6 };
    const resolver = {
      boostedSensorSpec: vi.fn(() => boosted),
    } as unknown as SensorBoosterResolver;
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents(), sensorBoosterController: fakeSensorBoosterController(), resolver });
    controller.setSensorData("shipB", SPEC);
    const text = sectionText(els.shipB.section);
    expect(text).toContain("400");
    expect(text).toContain("50,000");
    expect(text).toContain("6");
    expect(resolver.boostedSensorSpec).toHaveBeenCalledWith(SPEC, undefined);
  });

  test("updates summary with boosted max targeting range", () => {
    const els = fakeEls();
    const boosted: SensorSpec = { scanResolution: 260, maxTargetingRange: 39000, maxLockedTargets: 5 };
    const resolver = {
      boostedSensorSpec: vi.fn(() => boosted),
    } as unknown as SensorBoosterResolver;
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents(), sensorBoosterController: fakeSensorBoosterController(), resolver });
    controller.setSensorData("shipA", SPEC);
    expect(sectionText(els.shipA.summary)).toContain("39,000");
  });

  test("clears summary when spec is removed", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents(), sensorBoosterController: fakeSensorBoosterController(), resolver: fakeResolver() });
    controller.setSensorData("shipA", SPEC);
    controller.setSensorData("shipA", undefined);
    expect(els.shipA.summary.textContent).toBe("");
    expect(els.shipA.trigger.disabled).toBe(true);
  });

  test("re-renders on config invalidated to reflect booster toggle changes", () => {
    const els = fakeEls();
    const events = fakeEvents();
    const resolver = fakeResolver();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events, sensorBoosterController: fakeSensorBoosterController(), resolver });
    controller.setSensorData("shipA", SPEC);
    expect(events.listeners.onConfigInvalidated?.length).toBe(1);
    const summaryBefore = (els.shipA.summary as unknown as FakeElement).children.length;
    expect(summaryBefore).toBeGreaterThan(0);
    for (const cb of events.listeners.onConfigInvalidated ?? []) cb();
    const summaryAfter = (els.shipA.summary as unknown as FakeElement).children.length;
    expect(summaryAfter).toBeGreaterThan(0);
  });
});

function sectionText(el: HTMLElement): string {
  const parts: string[] = [];
  function walk(node: FakeElement): void {
    if (node.textContent) parts.push(node.textContent);
    for (const child of node.children) walk(child);
  }
  walk(el as unknown as FakeElement);
  return parts.join(" ");
}
