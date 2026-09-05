import { EMPTY_SENSOR_BOOST_LOADOUT, type SensorBoostLoadout, type SensorSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import type { PopupGroup } from "../popup";
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
    "targeting.sensorBoosters": "Sensor boosters",
    "targeting.signalAmplifiers": "Signal amplifiers",
    "targeting.overload": "Overload",
    "unit.mm": "mm",
    "unit.meter": "m",
  };
  return { t: (key: string) => map[key] ?? key } as unknown as I18n;
}

function fakeEvents(): UiEvents {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    onFittingImported: (cb: (...args: unknown[]) => void): void => { (listeners.onFittingImported ??= []).push(cb); },
    onLanguageChanged: (cb: (...args: unknown[]) => void): void => { (listeners.onLanguageChanged ??= []).push(cb); },
    emitConfigInvalidated: (): void => {},
    emitDistanceChanged: (): void => {},
    emitLanguageChanged: (): void => {},
  } as unknown as UiEvents;
}

function fakePopupGroup(): PopupGroup {
  return {
    register: (): void => {},
    toggle: (): void => {},
    closeAll: (): void => {},
  } as unknown as PopupGroup;
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
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents() });
    controller.render();
    expect(els.shipA.trigger.disabled).toBe(true);
  });

  test("enables trigger and renders sensor attributes when spec is set", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents() });
    controller.setSensorData("shipA", SPEC, undefined);
    expect(els.shipA.trigger.disabled).toBe(false);
    expect((els.shipA.section as unknown as FakeElement).children.length).toBeGreaterThan(0);
  });

  test("renders sensor booster modules when boosts are set", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents() });
    const boosts: SensorBoostLoadout = {
      boosters: [{ moduleName: "Sensor Booster II", moduleId: "1952" as never, scanResolutionBonusPercent: 30, maxTargetRangeBonusPercent: 30, overloadStrengthBonusPercent: 15, defaultScript: undefined }],
      amplifiers: [],
      boosterScripts: [],
    };
    controller.setSensorData("shipA", SPEC, boosts);
    expect(sectionText(els.shipA.section)).toContain("Sensor Booster II");
  });

  test("renders signal amplifier modules when amplifiers are set", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents() });
    const boosts: SensorBoostLoadout = {
      boosters: [],
      amplifiers: [{ moduleName: "Signal Amplifier II", moduleId: "1987" as never, scanResolutionBonusPercent: 15, maxTargetRangeBonusPercent: 30, maxLockedTargetsBonus: 2 }],
      boosterScripts: [],
    };
    controller.setSensorData("shipA", SPEC, boosts);
    expect(sectionText(els.shipA.section)).toContain("Signal Amplifier II");
  });

  test("does not render booster section when loadout is empty", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents() });
    controller.setSensorData("shipA", SPEC, EMPTY_SENSOR_BOOST_LOADOUT);
    expect(sectionText(els.shipA.section)).not.toContain("Sensor boosters");
    expect(sectionText(els.shipA.section)).not.toContain("Signal amplifiers");
  });

  test("updates summary with max targeting range", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents() });
    controller.setSensorData("shipA", SPEC, undefined);
    expect((els.shipA.summary as unknown as FakeElement).children.length).toBeGreaterThan(0);
  });

  test("clears summary when spec is removed", () => {
    const els = fakeEls();
    const controller = new TargetingControllerImpl({ els, popupGroup: fakePopupGroup(), i18n: fakeI18n(), events: fakeEvents() });
    controller.setSensorData("shipA", SPEC, undefined);
    controller.setSensorData("shipA", undefined, undefined);
    expect(els.shipA.summary.textContent).toBe("");
    expect(els.shipA.trigger.disabled).toBe(true);
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
