import { toTypeId, type TypeId } from "../../../gamedata/ids";
import { EMPTY_EWAR_LOADOUT } from "../../../sim";
import type { DisruptionScriptSpec, EwarLoadout, SensorDampenerScriptSpec, SensorDampenerSpec, StasisGrapplerSpec, StasisWebSpec, TargetPainterSpec, TrackingDisruptorSpec, WarpScramblerSpec } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";
import type { Language } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { createControlsEls } from "../elements";
import type { Popup, PopupGroup } from "../popup";
import { FakeElement, fakeDocument, getFake, mockFittingImport } from "../../testing";
import { UiEventsImpl } from "../../events";
import { EwarControllerImpl } from "./ewarController";
import type { EwarEls } from "./ewarControllerContract";
import type { EwarEffectDescriber } from "./ewarEffectDescriber";

const WEB: StasisWebSpec = { moduleName: "Stasis Webifier I", moduleId: toTypeId("526"), maxRange: 10000, speedFactor: -0.5, overloadRangeBonusPercent: 15 };
const WEB2: StasisWebSpec = { moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 12000, speedFactor: -0.55, overloadRangeBonusPercent: 15 };
const WEB3: StasisWebSpec = { ...WEB, moduleName: "Stasis Webifier III", moduleId: toTypeId("528") };
const OPTIMAL_SCRIPT: DisruptionScriptSpec & { readonly moduleId: TypeId } = {
  name: "Optimal Range Disruption Script", moduleId: toTypeId("29005"), trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2,
};
const TRACKING_SCRIPT: DisruptionScriptSpec & { readonly moduleId: TypeId } = {
  name: "Tracking Speed Disruption Script", moduleId: toTypeId("29007"), trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0,
};
const SCRIPTS: readonly (DisruptionScriptSpec & { readonly moduleId: TypeId })[] = [OPTIMAL_SCRIPT, TRACKING_SCRIPT];
const DISRUPTOR: TrackingDisruptorSpec = {
  moduleName: "Tracking Disruptor I", moduleId: toTypeId("2108"), optimal: 10000, falloff: 30000,
  disruption: -0.2, defaultScript: undefined, overloadStrengthBonusPercent: 20,
};
const DISRUPTOR2: TrackingDisruptorSpec = {
  moduleName: "Tracking Disruptor II", moduleId: toTypeId("2109"), optimal: 12000, falloff: 35000,
  disruption: -0.25, defaultScript: OPTIMAL_SCRIPT, overloadStrengthBonusPercent: 20,
};
const SCRAMBLER: WarpScramblerSpec = { moduleName: "Warp Scrambler II", moduleId: toTypeId("448"), maxRange: 9000, overloadRangeBonusPercent: 20 };
const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", moduleId: toTypeId("41040"), optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
const PAINTER: TargetPainterSpec = { moduleName: "Target Painter II", moduleId: toTypeId("12275"), maxRange: 36000, falloff: 90000, signatureRadiusBonusPercent: 30, overloadStrengthBonusPercent: 20 };
const SCAN_RES_SCRIPT: SensorDampenerScriptSpec & { readonly moduleId: TypeId } = {
  name: "Scan Resolution Dampening Script", moduleId: toTypeId("42532"), scanResolutionMultiplier: 2, maxTargetRangeMultiplier: 0,
};
const TARGET_RANGE_SCRIPT: SensorDampenerScriptSpec & { readonly moduleId: TypeId } = {
  name: "Targeting Range Dampening Script", moduleId: toTypeId("42533"), scanResolutionMultiplier: 0, maxTargetRangeMultiplier: 2,
};
const DAMPENER_SCRIPTS: readonly (SensorDampenerScriptSpec & { readonly moduleId: TypeId })[] = [SCAN_RES_SCRIPT, TARGET_RANGE_SCRIPT];
const DAMPENER: SensorDampenerSpec = {
  moduleName: "Sensor Dampener I", moduleId: toTypeId("2119"), optimal: 10000, falloff: 30000,
  scanResolutionBonusPercent: -20, maxTargetRangeBonusPercent: -20, defaultScript: undefined, overloadStrengthBonusPercent: 20,
};
const DAMPENER2: SensorDampenerSpec = {
  moduleName: "Sensor Dampener II", moduleId: toTypeId("2120"), optimal: 12000, falloff: 35000,
  scanResolutionBonusPercent: -25, maxTargetRangeBonusPercent: -25, defaultScript: SCAN_RES_SCRIPT, overloadStrengthBonusPercent: 20,
};

class FakePopupGroup implements PopupGroup {
  private readonly popups: Popup[] = [];

  register(popup: Popup): void { this.popups.push(popup); }

  open(popup: Popup): void {
    for (const p of this.popups) if (p !== popup && p.isOpen()) p.close();
    if (!popup.isOpen()) popup.open();
  }

  toggle(popup: Popup): void {
    if (popup.isOpen()) this.close(popup);
    else this.open(popup);
  }

  close(popup: Popup): void {
    if (popup.isOpen()) popup.close();
  }

  closeAll(): void {
    for (const p of this.popups) if (p.isOpen()) p.close();
  }

  hasOpen(): boolean {
    return this.popups.some((p) => p.isOpen());
  }

  onPointerDown(_domTarget: EventTarget | null): void {}

  onKeyDown(_event: { readonly key: string }): void {}
}

function buildEwarController(
  language: Language = "en",
  beforeConstruct?: (document: Document, els: ReturnType<typeof createControlsEls>) => void,
) {
  const document = fakeDocument();
  globalThis.document = document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  const i18n = vi.mocked<I18n>({
    current: vi.fn(() => language),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn((_shipId) => ""),
    itemIconUrl: vi.fn((id) => `icons/${String(id)}.png`),
  });
  const popupGroup = new FakePopupGroup();
  const els = createControlsEls();
  const ewarEls: EwarEls = {
    shipA: els.shipA.ewar,
    shipB: els.shipB.ewar,
  };
  const shipAPopup = ewarEls.shipA.popup;
  const shipBPopup = ewarEls.shipB.popup;
  shipAPopup.appendChild(els.shipA.ewar.section);
  shipAPopup.appendChild(els.shipA.boosterSection);
  shipBPopup.appendChild(els.shipB.ewar.section);
  shipBPopup.appendChild(els.shipB.boosterSection);
  shipAPopup.hidden = true;
  shipBPopup.hidden = true;
  if (beforeConstruct) beforeConstruct(document, els);
  const NAME_FOR_ID: Record<string, string> = {
    "526": "Stasis Webifier I",
    "527": "Stasis Webifier II",
    "528": "Stasis Webifier III",
    "2108": "Tracking Disruptor I",
    "2109": "Tracking Disruptor II",
    "448": "Warp Scrambler II",
    "41040": "Heavy Stasis Grappler I",
    "12275": "Target Painter II",
    "2119": "Sensor Dampener I",
    "2120": "Sensor Dampener II",
    "29005": "Optimal Range Disruption Script",
    "29007": "Tracking Speed Disruption Script",
    "42532": "Scan Resolution Dampening Script",
    "42533": "Targeting Range Dampening Script",
  };
  const fittingImport = vi.mocked(mockFittingImport());
  fittingImport.itemNameForId = vi.fn((id: TypeId, lang: string) => {
    const name = NAME_FOR_ID[id] ?? id;
    return lang === "en" ? name : `${name} (${lang})`;
  });
  const ewarEffectDescriber = vi.mocked<EwarEffectDescriber>({
    webDescription: vi.fn(() => "web-title"),
    webHint: vi.fn(() => "web-hint"),
    grapplerDescription: vi.fn(() => "grappler-title"),
    grapplerHint: vi.fn(() => "grappler-hint"),
    disruptorDescription: vi.fn(() => "disruptor-title"),
    disruptorHint: vi.fn(() => "disruptor-hint"),
    scramblerDescription: vi.fn(() => "scrambler-title"),
    scramblerHint: vi.fn(() => "scrambler-hint"),
    painterHint: vi.fn(() => "painter-hint"),
    dampenerHint: vi.fn(() => "dampener-hint"),
    painterModuleEffect: vi.fn(() => "painter-effect"),
    dampenerModuleEffect: vi.fn(() => "dampener-effect"),
    webModuleEffect: vi.fn(() => "web-effect"),
    grapplerModuleEffect: vi.fn(() => "grappler-effect"),
    disruptorModuleEffect: vi.fn(() => "disruptor-effect"),
    scramblerModuleEffect: vi.fn(() => "scrambler-effect"),
  });
  const events = new UiEventsImpl();
  const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
  const controller = new EwarControllerImpl({ els: ewarEls, popupGroup, imageCatalog, fittingImport, i18n, ewarEffectDescriber, events });
  events.emitDistanceChanged(5000);
  return { document, controller, els, i18n, imageCatalog, popupGroup, fittingImport, ewarEffectDescriber, events, emitConfigInvalidated };
}

function ewarSection(document: Document, side: "shipA" | "shipB"): FakeElement {
  return getFake(document, `${side === "shipA" ? "ship-a" : "ship-b"}-ewar-section`);
}

function webSection(document: Document, side: "shipA" | "shipB"): FakeElement | undefined {
  return ewarSection(document, side).children.find((section) => section.children[0]?.textContent === "label.ewar.web");
}

function grapplerSection(document: Document, side: "shipA" | "shipB"): FakeElement | undefined {
  return ewarSection(document, side).children.find((section) => section.children[0]?.textContent === "label.ewar.grappler");
}

function disruptorSection(document: Document, side: "shipA" | "shipB"): FakeElement | undefined {
  return ewarSection(document, side).children.find((section) => section.children[0]?.textContent === "label.ewar.disruptor");
}

function dampenerSection(document: Document, side: "shipA" | "shipB"): FakeElement | undefined {
  return ewarSection(document, side).children.find((section) => section.children[0]?.textContent === "label.ewar.dampener");
}

function scramblerSection(document: Document, side: "shipA" | "shipB"): FakeElement | undefined {
  return ewarSection(document, side).children.find((section) => section.children[0]?.textContent === "label.ewar.scrambler");
}

function overloadFor(row: FakeElement): FakeElement {
  const button = row.children.find((child) => child.className.split(" ").includes("ewar-overload-button"));
  if (!button) throw new Error("Missing overload button");
  return button;
}

function gearFor(row: FakeElement): FakeElement {
  const gear = row.children.find((child) => child.className.split(" ").includes("ewar-script-gear"));
  if (!gear) throw new Error("Missing script gear");
  return gear;
}

function scriptPopupFor(document: Document, side: "shipA" | "shipB"): FakeElement {
  const field = getFake(document, `${side === "shipA" ? "ship-a" : "ship-b"}-ewar-field`);
  const popup = field.children[0];
  if (!popup) throw new Error(`Missing script popup for ${side}`);
  return popup;
}

function scriptOptionFor(popup: FakeElement, value: string): FakeElement | undefined {
  return popup.children.find((child) => child.getAttribute("data-value") === value);
}

function selectedScriptOption(popup: FakeElement): FakeElement | undefined {
  return popup.children.find((child) => child.getAttribute("aria-current") === "true");
}

describe("EwarController", () => {
  test("setLoadout renders sections, rows, and per-kind summary for mixed loadouts and disables trigger for empty loadouts", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [WEB2], disruptors: [DISRUPTOR, DISRUPTOR2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    const trigger = getFake(document, "ship-a-ewar-trigger");
    const summary = getFake(document, "ship-a-ewar-summary");
    const popup = getFake(document, "ship-a-ewar-popup");
    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute("aria-label")).toBe("label.modules");
    expect(trigger.getAttribute("data-hint")).toBe("");
    expect(popup.getAttribute("aria-label")).toBe("label.modules");
    expect(summary.children.length).toBe(2);

    const webSummary = summary.children[0];
    expect(webSummary.className).toBe("trigger-summary-item");
    expect(webSummary.children[0].tagName).toBe("IMG");
    expect(webSummary.children[0].src).toBe("icons/527.png");
    expect(webSummary.children[0].hidden).toBe(false);
    expect(webSummary.children[1].className).toBe("trigger-summary-count mono");
    expect(webSummary.children[1].textContent).toBe("1/1");

    const disruptorSummary = summary.children[1];
    expect(disruptorSummary.className).toBe("trigger-summary-item");
    expect(disruptorSummary.children[0].tagName).toBe("IMG");
    expect(disruptorSummary.children[0].src).toBe("icons/2108.png");
    expect(disruptorSummary.children[0].hidden).toBe(false);
    expect(disruptorSummary.children[1].textContent).toBe("2/2");

    expect(ewarSection(document, "shipA").children.filter((c) => c.className === "preview-section").length).toBe(2);
    const webs = webSection(document, "shipA")!;
    expect(webs.className).toBe("preview-section");
    expect(webs.children[0].className).toBe("preview-section-label");
    expect(webs.children[0].textContent).toBe("label.ewar.web");
    expect(webs.children.length).toBe(2);

    const webRow = webs.children[1];
    expect(webRow.className).toBe("ewar-row");
    const webButton = webRow.children[0];
    expect(webButton.tagName).toBe("BUTTON");
    expect(webButton.getAttribute("aria-pressed")).toBe("true");
    expect(webButton.children[0].tagName).toBe("IMG");
    expect(webButton.children[0].hidden).toBe(false);
    expect(webButton.children[1].textContent).toBe(WEB2.moduleName);
    expect(webButton.children[1].getAttribute("data-hint")).toBe("web-effect");

    const disruptors = disruptorSection(document, "shipA")!;
    expect(disruptors.className).toBe("preview-section");
    expect(disruptors.children[0].textContent).toBe("label.ewar.disruptor");
    expect(disruptors.children.length).toBe(3);

    const firstDisruptorRow = disruptors.children[1];
    expect(firstDisruptorRow.className).toBe("ewar-row");
    const toggle = firstDisruptorRow.children[0];
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.children[1].textContent).toBe(DISRUPTOR.moduleName);

    const firstGear = gearFor(firstDisruptorRow);
    expect(firstGear.tagName).toBe("BUTTON");
    expect(firstGear.className).toBe("ewar-script-gear btn icon-button");
    expect(firstGear.getAttribute("aria-haspopup")).toBe("menu");
    expect(firstGear.getAttribute("aria-expanded")).toBe("false");
    expect(firstGear.getAttribute("aria-controls")).toBe("ship-a-ewar-script-popup");
    expect(firstGear.getAttribute("data-hint")).toBe("ewar.script.none");
    expect(firstGear.getAttribute("aria-label")).toBe("ewar.script.none");
    expect(firstGear.disabled).toBe(false);

    const secondRow = disruptors.children[2];
    const secondGear = gearFor(secondRow);
    expect(secondGear.getAttribute("data-hint")).toBe("Optimal Range Disruption Script");
    expect(secondGear.getAttribute("aria-label")).toBe("Optimal Range Disruption Script");
    expect(secondGear.disabled).toBe(false);

    controller.setLoadout("shipB", EMPTY_EWAR_LOADOUT);
    const shipBTrigger = getFake(document, "ship-b-ewar-trigger");
    expect(shipBTrigger.disabled).toBe(true);
    expect(shipBTrigger.getAttribute("data-hint")).toBe("title.ewar.empty");
    expect(getFake(document, "ship-b-ewar-summary").children.length).toBe(0);
    expect(ewarSection(document, "shipB").children.length).toBe(0);
  });

  test("grappler-only loadout renders a section, summary, and toggles overload", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], grapplers: [GRAPPLER], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    const summary = getFake(document, "ship-a-ewar-summary");
    expect(summary.children.length).toBe(1);
    expect(summary.children[0].children[1].textContent).toBe("1/1");
    expect(summary.children[0].getAttribute("data-hint")).toBe("grappler-hint");
    expect(ewarEffectDescriber.grapplerHint).toHaveBeenCalled();

    const grapplers = grapplerSection(document, "shipA")!;
    expect(grapplers.children[0].textContent).toBe("label.ewar.grappler");
    expect(grapplers.children.length).toBe(2);
    const row = grapplers.children[1];
    expect(row.className).toBe("ewar-row");
    const button = row.children[0];
    expect(button.children[1].textContent).toBe(GRAPPLER.moduleName);
    const overload = overloadFor(row);
    expect(overload.getAttribute("aria-pressed")).toBe("false");

    overload.trigger("click");
    expect(overload.getAttribute("aria-pressed")).toBe("true");
    expect(controller.projection("shipA")!.activation!.grapplers[0]!.overloaded).toBe(true);
  });

  test("scrambler-only loadout renders, summarizes, and projects", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], grapplers: [], disruptors: [], scramblers: [SCRAMBLER], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    const trigger = getFake(document, "ship-a-ewar-trigger");
    const summary = getFake(document, "ship-a-ewar-summary");
    expect(trigger.disabled).toBe(false);
    expect(summary.children.length).toBe(1);
    expect(summary.children[0].getAttribute("data-hint")).toBe("scrambler-hint");
    expect(ewarSection(document, "shipA").children.filter((c) => c.className === "preview-section").length).toBe(1);
    expect(scramblerSection(document, "shipA")!.children[0].textContent).toBe("label.ewar.scrambler");
    expect(controller.projection("shipA")).toEqual({
      loadout,
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [{ active: true, overloaded: false }], painters: [], dampeners: [] },
    });
    expect(ewarEffectDescriber.scramblerHint).toHaveBeenCalled();
  });

  test("toggling a web flips state, updates its section summary, and does not close popup", () => {
    const { controller, document, emitConfigInvalidated } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB, WEB2], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const summary = getFake(document, "ship-a-ewar-summary");

    const section = webSection(document, "shipA")!;
    const firstRow = section.children[1];
    const firstToggle = firstRow.children[0];
    const firstOverload = overloadFor(firstRow);
    expect(summary.children[0].children[1].textContent).toBe("2/2");
    expect(firstOverload.disabled).toBe(false);
    firstToggle.trigger("click");
    expect(summary.children[0].children[1].textContent).toBe("1/2");
    expect(popup.hidden).toBe(false);
    expect(firstToggle.getAttribute("aria-pressed")).toBe("false");
    expect(firstOverload.disabled).toBe(true);
    expect(section.children[2].children[0].getAttribute("aria-pressed")).toBe("true");
    expect(controller.capture("shipA")?.webs).toEqual([
      { active: false, overloaded: false },
      { active: true, overloaded: false },
    ]);
    expect(emitConfigInvalidated).toHaveBeenCalled();

    firstToggle.trigger("click");
    expect(summary.children[0].children[1].textContent).toBe("2/2");
    expect(firstOverload.disabled).toBe(false);
    expect(controller.capture("shipA")?.webs).toEqual([
      { active: true, overloaded: false },
      { active: true, overloaded: false },
    ]);
  });

  test("toggling a disruptor disables its overload button and script gear", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("shipB", { webs: [], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-b-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(document, "shipB")!;
    const row = section.children[1];
    const gear = gearFor(row);
    const overload = overloadFor(row);
    expect(row.className).toBe("ewar-row");
    expect(gear.disabled).toBe(false);
    expect(overload.disabled).toBe(false);
    row.children[0].trigger("click");
    expect(row.className).toBe("ewar-row ewar-row-inactive");
    expect(row.children[0].getAttribute("aria-pressed")).toBe("false");
    expect(gear.disabled).toBe(true);
    expect(overload.disabled).toBe(true);
    row.children[0].trigger("click");
    expect(row.className).toBe("ewar-row");
    expect(row.children[0].getAttribute("aria-pressed")).toBe("true");
    expect(gear.disabled).toBe(false);
    expect(overload.disabled).toBe(false);
  });

  test("renders one, two, or zero sections based on loadout contents", () => {
    const { controller, document } = buildEwarController();
    const trigger = getFake(document, "ship-a-ewar-trigger");
    const popup = getFake(document, "ship-a-ewar-popup");
    const ewar = ewarSection(document, "shipA");

    controller.setLoadout("shipA", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });
    expect(trigger.getAttribute("aria-label")).toBe("label.modules");
    expect(popup.getAttribute("aria-label")).toBe("label.modules");
    expect(ewar.children.filter((c) => c.className === "preview-section").length).toBe(1);
    expect(webSection(document, "shipA")!.children[0].textContent).toBe("label.ewar.web");

    controller.setLoadout("shipA", { webs: [], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });
    expect(ewar.children.filter((c) => c.className === "preview-section").length).toBe(1);
    expect(disruptorSection(document, "shipA")!.children[0].textContent).toBe("label.ewar.disruptor");

    controller.setLoadout("shipA", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });
    expect(ewar.children.filter((c) => c.className === "preview-section").length).toBe(2);
    expect(webSection(document, "shipA")!.children[0].textContent).toBe("label.ewar.web");
    expect(disruptorSection(document, "shipA")!.children[0].textContent).toBe("label.ewar.disruptor");

    controller.setLoadout("shipA", EMPTY_EWAR_LOADOUT);
    expect(ewar.children.length).toBe(0);
  });

  test("TD script choice persists per row and survives capture/restore round-trip", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [DISRUPTOR, DISRUPTOR2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.setLoadout("shipB", loadout);

    const popup = getFake(document, "ship-b-ewar-popup");
    popup.hidden = false;

    const section = disruptorSection(document, "shipB")!;
    const firstRow = section.children[1];
    const firstGear = gearFor(firstRow);
    firstGear.trigger("click");
    const firstScriptPopup = scriptPopupFor(document, "shipB");
    expect(firstScriptPopup.hidden).toBe(false);
    scriptOptionFor(firstScriptPopup, String(OPTIMAL_SCRIPT.moduleId))!.trigger("click");
    expect(controller.capture("shipB")?.disruptors?.[0]?.script).toBe(OPTIMAL_SCRIPT.moduleId);
    expect(firstGear.getAttribute("data-hint")).toBe("Optimal Range Disruption Script");

    const secondRow = section.children[2];
    const secondGear = gearFor(secondRow);
    secondGear.trigger("click");
    const secondScriptPopup = scriptPopupFor(document, "shipB");
    scriptOptionFor(secondScriptPopup, String(TRACKING_SCRIPT.moduleId))!.trigger("click");
    expect(controller.capture("shipB")?.disruptors?.[1]?.script).toBe(TRACKING_SCRIPT.moduleId);

    const captured = controller.capture("shipB");
    expect(captured).toEqual({
      webs: [],
      grapplers: [],
      disruptors: [
        { active: true, overloaded: false, script: OPTIMAL_SCRIPT.moduleId },
        { active: true, overloaded: false, script: TRACKING_SCRIPT.moduleId },
      ],
      painters: [],
      dampeners: [],
    });

    controller.restore("shipB", loadout, captured);
    const restored = controller.capture("shipB");
    expect(restored).toEqual(captured);

    const restoredSection = disruptorSection(document, "shipB")!;
    expect(gearFor(restoredSection.children[1]).getAttribute("data-hint")).toBe("Optimal Range Disruption Script");
    expect(gearFor(restoredSection.children[2]).getAttribute("data-hint")).toBe("Tracking Speed Disruption Script");
  });

  test("stale saved activation is clamped to a shorter loadout", () => {
    const { controller } = buildEwarController();
    const longLoadout: EwarLoadout = { webs: [WEB, WEB2, WEB3], disruptors: [DISRUPTOR, DISRUPTOR2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    const saved: StoredEwarActivation = {
      webs: [
        { active: false, overloaded: true },
        { active: true, overloaded: false },
        { active: false, overloaded: true },
        { active: true, overloaded: false },
      ],
      grapplers: [],
      disruptors: [
        { active: false, overloaded: true, script: TRACKING_SCRIPT.moduleId },
        { active: true, overloaded: false, script: "none" },
        { active: true, overloaded: true, script: OPTIMAL_SCRIPT.moduleId },
      ],
    };
    controller.setLoadout("shipA", longLoadout);
    const shortLoadout: EwarLoadout = { webs: [WEB, WEB2], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.restore("shipA", shortLoadout, saved);

    expect(controller.capture("shipA")).toEqual({
      webs: [{ active: false, overloaded: true }, { active: true, overloaded: false }],
      grapplers: [],
      disruptors: [{ active: false, overloaded: true, script: TRACKING_SCRIPT.moduleId }],
      painters: [],
      dampeners: [],
    });
  });

  test("projection returns undefined for empty loadouts and carries per-module overload", () => {
    const { controller } = buildEwarController();
    expect(controller.projection("shipA")).toBeUndefined();
    expect(controller.projection("shipB")).toBeUndefined();

    const loadout: EwarLoadout = { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);
    expect(controller.projection("shipA")).toEqual({
      loadout,
      activation: { webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [] },
    });

    controller.setLoadout("shipA", EMPTY_EWAR_LOADOUT);
    expect(controller.projection("shipA")).toBeUndefined();
  });

  test("capture returns StoredEwarActivation matching the current state", () => {
    const { controller, document } = buildEwarController();
    const d2: TrackingDisruptorSpec = { ...DISRUPTOR2, defaultScript: undefined };
    const loadout: EwarLoadout = { webs: [WEB, WEB2], disruptors: [DISRUPTOR, d2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.setLoadout("shipB", loadout);

    const popup = getFake(document, "ship-b-ewar-popup");
    popup.hidden = false;

    const webSec = webSection(document, "shipB")!;
    webSec.children[2].children[0].trigger("click");
    const disruptorSec = disruptorSection(document, "shipB")!;
    disruptorSec.children[2].children[0].trigger("click");
    const firstGear = gearFor(disruptorSec.children[1]);
    firstGear.trigger("click");
    const scriptPopup = scriptPopupFor(document, "shipB");
    scriptOptionFor(scriptPopup, String(TRACKING_SCRIPT.moduleId))!.trigger("click");

    expect(controller.capture("shipB")).toEqual({
      webs: [{ active: true, overloaded: false }, { active: false, overloaded: false }],
      grapplers: [],
      disruptors: [
        { active: true, overloaded: false, script: TRACKING_SCRIPT.moduleId },
        { active: false, overloaded: false, script: "none" },
      ],
      painters: [],
      dampeners: [],
    });
  });

  test("popup controls visibility and trigger aria-expanded", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    const trigger = getFake(document, "ship-a-ewar-trigger");
    const popup = getFake(document, "ship-a-ewar-popup");
    expect(popup.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.trigger("click");
    expect(popup.hidden).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.trigger("click");
    expect(popup.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test("script popup opens from gear, highlights current option, and closes on selection", () => {
    const { controller, document, emitConfigInvalidated } = buildEwarController();
    controller.setLoadout("shipA", { webs: [], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(document, "shipA")!;
    const row = section.children[1];
    const gear = gearFor(row);
    gear.trigger("click");

    const scriptPopup = scriptPopupFor(document, "shipA");
    expect(scriptPopup.hidden).toBe(false);
    expect(gear.getAttribute("aria-expanded")).toBe("true");
    expect(scriptPopup.children.length).toBe(4);
    expect(scriptPopup.children[0].textContent).toBe(DISRUPTOR2.moduleName);
    expect(selectedScriptOption(scriptPopup)?.getAttribute("data-value")).toBe(String(OPTIMAL_SCRIPT.moduleId));

    scriptOptionFor(scriptPopup, String(TRACKING_SCRIPT.moduleId))!.trigger("click");
    expect(scriptPopup.hidden).toBe(true);
    expect(gear.getAttribute("aria-expanded")).toBe("false");
    expect(gear.getAttribute("data-hint")).toBe("Tracking Speed Disruption Script");
    expect(gear.getAttribute("aria-label")).toBe("Tracking Speed Disruption Script");
    expect(emitConfigInvalidated).toHaveBeenCalled();
    expect(controller.capture("shipA")).toEqual({
      webs: [],
      grapplers: [],
      disruptors: [{ active: true, overloaded: false, script: TRACKING_SCRIPT.moduleId }],
      painters: [],
      dampeners: [],
    });
  });

  test("selecting a disruptor script updates the module button title to reflect the script multipliers", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    controller.setLoadout("shipA", { webs: [], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });
    ewarEffectDescriber.disruptorModuleEffect.mockReturnValue("disruptor-with-optimal");
    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(document, "shipA")!;
    const row = section.children[1];
    const button = row.children[0];
    const gear = gearFor(row);
    expect(button.children[1].getAttribute("data-hint")).toBe("disruptor-effect");
    gear.trigger("click");
    const scriptPopup = scriptPopupFor(document, "shipA");
    ewarEffectDescriber.disruptorModuleEffect.mockReturnValue("disruptor-with-tracking");
    scriptOptionFor(scriptPopup, String(TRACKING_SCRIPT.moduleId))!.trigger("click");
    expect(button.children[1].getAttribute("data-hint")).toBe("disruptor-with-tracking");
    expect(ewarEffectDescriber.disruptorModuleEffect).toHaveBeenCalledWith(DISRUPTOR2, TRACKING_SCRIPT);
  });

  test("setLoadout renders translated module names and keeps icon inputs canonical", () => {
    const { controller, document, fittingImport, imageCatalog } = buildEwarController("zh");
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });
    const webSectionEl = webSection(document, "shipA")!;
    const webButton = webSectionEl.children[1].children[0];
    const overloadButton = overloadFor(webSectionEl.children[1]);
    expect(webButton.children[1].textContent).toBe(`${WEB.moduleName} (zh)`);
    expect(webButton.children[1].getAttribute("data-hint")).toBe("web-effect");
    expect(webButton.getAttribute("aria-label")).toBe(`${WEB.moduleName} (zh)`);
    expect(overloadButton.getAttribute("aria-label")).toContain(`${WEB.moduleName} (zh)`);
    expect(fittingImport.itemNameForId).toHaveBeenCalledWith(WEB.moduleId, "zh");
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith(WEB.moduleId);
    expect(imageCatalog.itemIconUrl).not.toHaveBeenCalledWith(`${WEB.moduleName} (zh)`);
  });

  test("module button title shows the effect description instead of the module name", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [GRAPPLER], scramblers: [SCRAMBLER], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });
    const webButton = webSection(document, "shipA")!.children[1].children[0];
    expect(webButton.children[1].getAttribute("data-hint")).toBe("web-effect");
    expect(ewarEffectDescriber.webModuleEffect).toHaveBeenCalledWith(WEB);
    const grapplerButton = grapplerSection(document, "shipA")!.children[1].children[0];
    expect(grapplerButton.children[1].getAttribute("data-hint")).toBe("grappler-effect");
    expect(ewarEffectDescriber.grapplerModuleEffect).toHaveBeenCalledWith(GRAPPLER);
    const disruptorButton = disruptorSection(document, "shipA")!.children[1].children[0];
    expect(disruptorButton.children[1].getAttribute("data-hint")).toBe("disruptor-effect");
    expect(ewarEffectDescriber.disruptorModuleEffect).toHaveBeenCalledWith(DISRUPTOR, undefined);
    const scramblerButton = scramblerSection(document, "shipA")!.children[1].children[0];
    expect(scramblerButton.children[1].getAttribute("data-hint")).toBe("scrambler-effect");
    expect(ewarEffectDescriber.scramblerModuleEffect).toHaveBeenCalled();
  });

  test("summary hides an icon when no icon URL is available", () => {
    const { controller, document, imageCatalog } = buildEwarController();
    imageCatalog.itemIconUrl.mockImplementation((id) =>
      id === WEB.moduleId ? undefined : `icons/${String(id)}.png`
    );
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const summary = getFake(document, "ship-a-ewar-summary");
    expect(summary.children[0].children[0].tagName).toBe("IMG");
    expect(summary.children[0].children[0].hidden).toBe(true);
    expect(summary.children[0].children[0].src).toBe("");
    expect(summary.children[1].children[0].src).toBe("icons/2108.png");
  });

  test("selecting None persists over capture/restore round-trip", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(document, "shipA")!;
    const gear = gearFor(section.children[1]);
    gear.trigger("click");

    const scriptPopup = scriptPopupFor(document, "shipA");
    scriptOptionFor(scriptPopup, "none")!.trigger("click");
    expect(controller.capture("shipA")?.disruptors?.[0]?.script).toBe("none");
    expect(gear.getAttribute("data-hint")).toBe("ewar.script.none");

    controller.restore("shipA", loadout, controller.capture("shipA"));
    expect(gearFor(disruptorSection(document, "shipA")!.children[1]).getAttribute("data-hint")).toBe("ewar.script.none");
    expect(controller.capture("shipA")?.disruptors?.[0]?.script).toBe("none");
  });

  test("script popup renders localized names, icons, and multiplier tooltips", () => {
    const { controller, document, imageCatalog, fittingImport } = buildEwarController("zh");
    controller.setLoadout("shipA", { webs: [], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(document, "shipA")!;
    gearFor(section.children[1]).trigger("click");

    const scriptPopup = scriptPopupFor(document, "shipA");
    const noneOption = scriptOptionFor(scriptPopup, "none")!;
    expect(noneOption.children.length).toBe(1);
    expect(noneOption.children[0].textContent).toBe("ewar.script.none");
    expect(noneOption.getAttribute("data-hint")).toBe("ewar.script.none.hint");

    const optimalOption = scriptOptionFor(scriptPopup, String(OPTIMAL_SCRIPT.moduleId))!;
    expect(optimalOption.children[0].tagName).toBe("IMG");
    expect(optimalOption.children[0].src).toBe("icons/29005.png");
    expect(optimalOption.children[1].textContent).toBe("Optimal Range Disruption Script (zh)");
    expect(fittingImport.itemNameForId).toHaveBeenCalledWith(OPTIMAL_SCRIPT.moduleId, "zh");
    expect(optimalOption.getAttribute("data-hint")).toBe("optimal x2 · falloff x2 · track x0");
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith(OPTIMAL_SCRIPT.moduleId);
  });

  test("overload buttons are present per web and disruptor row", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB, WEB2], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const webRows = webSection(document, "shipA")!.children.slice(1);
    const disruptorRows = disruptorSection(document, "shipA")!.children.slice(1);
    for (const row of webRows) expect(overloadFor(row).className).toBe("ewar-overload-button btn icon-button");
    for (const row of disruptorRows) expect(overloadFor(row).className).toBe("ewar-overload-button btn icon-button");
  });

  test("clicking an overload button toggles its aria-pressed and capture output", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "shipA")!.children[1];
    const webOverload = overloadFor(webRow);
    const disruptorRow = disruptorSection(document, "shipA")!.children[1];
    const disruptorOverload = overloadFor(disruptorRow);

    expect(webOverload.getAttribute("aria-pressed")).toBe("false");
    expect(disruptorOverload.getAttribute("aria-pressed")).toBe("false");
    webOverload.trigger("click");
    disruptorOverload.trigger("click");
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
    expect(disruptorOverload.getAttribute("aria-pressed")).toBe("true");
    expect(controller.capture("shipA")).toEqual({
      webs: [{ active: true, overloaded: true }],
      grapplers: [],
      disruptors: [{ active: true, overloaded: true, script: OPTIMAL_SCRIPT.moduleId }],
      painters: [],
      dampeners: [],
    });
  });

  test("overload button is disabled when its module is off", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("shipB", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-b-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "shipB")!.children[1];
    const webOverload = overloadFor(webRow);
    webOverload.trigger("click");
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
    webRow.children[0].trigger("click");
    expect(webOverload.disabled).toBe(true);
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
  });

  test("overload state is preserved when its module is toggled off and back on", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "shipA")!.children[1];
    const webOverload = overloadFor(webRow);
    webOverload.trigger("click");
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");

    webRow.children[0].trigger("click");
    expect(webRow.className).toBe("ewar-row ewar-row-inactive");
    expect(webOverload.disabled).toBe(true);

    webRow.children[0].trigger("click");
    expect(webRow.className).toBe("ewar-row");
    expect(webOverload.disabled).toBe(false);
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
    expect(controller.capture("shipA")?.webs?.[0]).toEqual({ active: true, overloaded: true });
  });

  test("overload button has an accessible label that includes the module name", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "shipA")!.children[1];
    const webOverload = overloadFor(webRow);
    expect(webOverload.getAttribute("aria-label")).toBe(`label.overload ${WEB.moduleName}`);
    expect(webOverload.getAttribute("data-hint")).toBe(`label.overload ${WEB.moduleName}`);

    const disruptorRow = disruptorSection(document, "shipA")!.children[1];
    const disruptorOverload = overloadFor(disruptorRow);
    expect(disruptorOverload.getAttribute("aria-label")).toBe(`label.overload ${DISRUPTOR2.moduleName}`);
  });

  test("web rows are marked inactive when their module is off", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "shipA")!.children[1];
    expect(webRow.className).toBe("ewar-row");
    webRow.children[0].trigger("click");
    expect(webRow.className).toBe("ewar-row ewar-row-inactive");
    webRow.children[0].trigger("click");
    expect(webRow.className).toBe("ewar-row");
  });

  test("summary items receive title attributes from the effect describer", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const summary = getFake(document, "ship-a-ewar-summary");
    expect(summary.children[0].getAttribute("data-hint")).toBe("web-hint");
    expect(summary.children[1].getAttribute("data-hint")).toBe("disruptor-hint");
    expect(ewarEffectDescriber.webHint).toHaveBeenCalled();
    expect(ewarEffectDescriber.disruptorHint).toHaveBeenCalled();
  });

  test("toggling a module refreshes the summary title", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    ewarEffectDescriber.webHint.mockReturnValue("web-active");
    const section = webSection(document, "shipA")!;
    section.children[1].children[0].trigger("click");
    expect(getFake(document, "ship-a-ewar-summary").children[0].getAttribute("data-hint")).toBe("web-active");
  });

  test("updateSummaries refreshes both sides", () => {
    const { controller, ewarEffectDescriber } = buildEwarController();
    controller.setLoadout("shipA", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });
    controller.setLoadout("shipB", { webs: [WEB2], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], });
    ewarEffectDescriber.webHint.mockClear();

    controller.updateSummaries();
    expect(ewarEffectDescriber.webHint).toHaveBeenCalledTimes(2);
  });

  test("renderSide clears only the ewar section and leaves the booster section untouched", () => {
    const sentinelHolder: { el?: FakeElement } = {};
    const { controller, document } = buildEwarController("en", (document) => {
      sentinelHolder.el = document.createElement("div") as unknown as FakeElement;
      sentinelHolder.el.textContent = "booster sentinel";
      getFake(document, "ship-a-booster-section").appendChild(sentinelHolder.el);
    });

    expect(getFake(document, "ship-a-booster-section").children.length).toBe(1);
    expect(getFake(document, "ship-a-booster-section").children[0]).toBe(sentinelHolder.el!);

    const loadout: EwarLoadout = { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [], scripts: SCRIPTS, dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    expect(ewarSection(document, "shipA").children.filter((c) => c.className === "preview-section").length).toBe(1);
    expect(getFake(document, "ship-a-booster-section").children.length).toBe(1);
    expect(getFake(document, "ship-a-booster-section").children[0]).toBe(sentinelHolder.el!);
  });

  test("painter section renders rows with toggle and overload buttons", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [PAINTER], dampeners: [], scripts: [], dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    const section = ewarSection(document, "shipA").children.find((s) => s.children[0]?.textContent === "label.ewar.painter");
    expect(section).toBeDefined();
    const rows = section!.children.filter((c) => c.className.includes("ewar-row"));
    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.children.find((c) => c.className === "ewar-module-toggle")).toBeDefined();
    expect(row.children.find((c) => c.className.split(" ").includes("ewar-overload-button"))).toBeDefined();
  });

  test("painter toggle deactivates the row and updates the summary", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [PAINTER], dampeners: [], scripts: [], dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    const section = ewarSection(document, "shipA").children.find((s) => s.children[0]?.textContent === "label.ewar.painter");
    const row = section!.children.find((c) => c.className.includes("ewar-row"))!;
    const button = row.children.find((c) => c.className === "ewar-module-toggle")!;
    button.dispatchEvent(new Event("click"));

    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(row.className).toContain("ewar-row-inactive");
    expect(ewarEffectDescriber.painterHint).toHaveBeenCalled();
  });

  test("painter overload toggle flips aria-pressed", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [PAINTER], dampeners: [], scripts: [], dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    const section = ewarSection(document, "shipA").children.find((s) => s.children[0]?.textContent === "label.ewar.painter");
    const row = section!.children.find((c) => c.className.includes("ewar-row"))!;
    const overloadButton = overloadFor(row);
    expect(overloadButton.getAttribute("aria-pressed")).toBe("false");
    overloadButton.dispatchEvent(new Event("click"));
    expect(overloadButton.getAttribute("aria-pressed")).toBe("true");
  });

  test("painter capture and restore round-trips activation", () => {
    const { controller } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [PAINTER, PAINTER], dampeners: [], scripts: [], dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);
    const captured = controller.capture("shipA");
    expect(captured?.painters).toEqual([{ active: true, overloaded: false }, { active: true, overloaded: false }]);

    controller.restore("shipA", loadout, { webs: [], grapplers: [], disruptors: [], painters: [{ active: false, overloaded: true }, { active: true, overloaded: false }] });
    const restored = controller.capture("shipA");
    expect(restored?.painters).toEqual([{ active: false, overloaded: true }, { active: true, overloaded: false }]);
  });

  test("painter summary shows active count and hint", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [PAINTER, PAINTER], dampeners: [], scripts: [], dampenerScripts: [], };
    controller.setLoadout("shipA", loadout);

    const summary = getFake(document, "ship-a-ewar-summary");
    const painterSummary = summary.children.find((c) => c.children[0]?.src === "icons/12275.png");
    expect(painterSummary).toBeDefined();
    expect(painterSummary!.children[1].textContent).toBe("2/2");
    expect(ewarEffectDescriber.painterHint).toHaveBeenCalled();
  });

  test("dampener section renders rows with toggle, overload, and script gear buttons", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [DAMPENER2], scripts: [], dampenerScripts: DAMPENER_SCRIPTS, };
    controller.setLoadout("shipA", loadout);

    const section = dampenerSection(document, "shipA")!;
    expect(section).toBeDefined();
    expect(section.children[0].textContent).toBe("label.ewar.dampener");
    expect(section.children.length).toBe(2);
    const row = section.children[1];
    expect(row.className).toBe("ewar-row");
    const button = row.children[0];
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.children[1].textContent).toBe(DAMPENER2.moduleName);
    expect(button.children[1].getAttribute("data-hint")).toBe("dampener-effect");
    expect(ewarEffectDescriber.dampenerModuleEffect).toHaveBeenCalledWith(DAMPENER2, SCAN_RES_SCRIPT);
    const gear = gearFor(row);
    expect(gear.getAttribute("data-hint")).toBe("Scan Resolution Dampening Script");
    expect(gear.disabled).toBe(false);
    const overload = overloadFor(row);
    expect(overload.getAttribute("aria-pressed")).toBe("false");
  });

  test("dampener toggle deactivates the row and disables overload and gear", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [DAMPENER], scripts: [], dampenerScripts: DAMPENER_SCRIPTS, };
    controller.setLoadout("shipA", loadout);

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const section = dampenerSection(document, "shipA")!;
    const row = section.children[1];
    const button = row.children[0];
    const gear = gearFor(row);
    const overload = overloadFor(row);
    expect(row.className).toBe("ewar-row");
    button.trigger("click");
    expect(row.className).toBe("ewar-row ewar-row-inactive");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(gear.disabled).toBe(true);
    expect(overload.disabled).toBe(true);
    button.trigger("click");
    expect(row.className).toBe("ewar-row");
    expect(gear.disabled).toBe(false);
    expect(overload.disabled).toBe(false);
  });

  test("dampener overload toggle flips aria-pressed and capture output", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [DAMPENER], scripts: [], dampenerScripts: DAMPENER_SCRIPTS, };
    controller.setLoadout("shipA", loadout);

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const row = dampenerSection(document, "shipA")!.children[1];
    const overload = overloadFor(row);
    expect(overload.getAttribute("aria-pressed")).toBe("false");
    overload.trigger("click");
    expect(overload.getAttribute("aria-pressed")).toBe("true");
    expect(controller.capture("shipA")?.dampeners).toEqual([{ active: true, overloaded: true, script: "none" }]);
  });

  test("dampener script choice persists per row and survives capture/restore round-trip", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [DAMPENER, DAMPENER2], scripts: [], dampenerScripts: DAMPENER_SCRIPTS, };
    controller.setLoadout("shipB", loadout);

    const popup = getFake(document, "ship-b-ewar-popup");
    popup.hidden = false;

    const section = dampenerSection(document, "shipB")!;
    const firstRow = section.children[1];
    const firstGear = gearFor(firstRow);
    firstGear.trigger("click");
    const firstScriptPopup = scriptPopupFor(document, "shipB");
    expect(firstScriptPopup.hidden).toBe(false);
    scriptOptionFor(firstScriptPopup, String(TARGET_RANGE_SCRIPT.moduleId))!.trigger("click");
    expect(controller.capture("shipB")?.dampeners?.[0]?.script).toBe(TARGET_RANGE_SCRIPT.moduleId);
    expect(firstGear.getAttribute("data-hint")).toBe("Targeting Range Dampening Script");

    const secondRow = section.children[2];
    const secondGear = gearFor(secondRow);
    secondGear.trigger("click");
    const secondScriptPopup = scriptPopupFor(document, "shipB");
    scriptOptionFor(secondScriptPopup, String(SCAN_RES_SCRIPT.moduleId))!.trigger("click");
    expect(controller.capture("shipB")?.dampeners?.[1]?.script).toBe(SCAN_RES_SCRIPT.moduleId);

    const captured = controller.capture("shipB");
    expect(captured).toEqual({
      webs: [],
      grapplers: [],
      disruptors: [],
      painters: [],
      dampeners: [
        { active: true, overloaded: false, script: TARGET_RANGE_SCRIPT.moduleId },
        { active: true, overloaded: false, script: SCAN_RES_SCRIPT.moduleId },
      ],
    });

    controller.restore("shipB", loadout, captured);
    const restored = controller.capture("shipB");
    expect(restored).toEqual(captured);

    const restoredSection = dampenerSection(document, "shipB")!;
    expect(gearFor(restoredSection.children[1]).getAttribute("data-hint")).toBe("Targeting Range Dampening Script");
    expect(gearFor(restoredSection.children[2]).getAttribute("data-hint")).toBe("Scan Resolution Dampening Script");
  });

  test("dampener capture and restore round-trips activation with default script", () => {
    const { controller } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [DAMPENER2], scripts: [], dampenerScripts: DAMPENER_SCRIPTS, };
    controller.setLoadout("shipA", loadout);
    const captured = controller.capture("shipA");
    expect(captured?.dampeners).toEqual([{ active: true, overloaded: false, script: SCAN_RES_SCRIPT.moduleId }]);

    controller.restore("shipA", loadout, { webs: [], grapplers: [], disruptors: [], painters: [], dampeners: [{ active: false, overloaded: true, script: "none" }] });
    const restored = controller.capture("shipA");
    expect(restored?.dampeners).toEqual([{ active: false, overloaded: true, script: "none" }]);
  });

  test("dampener summary shows active count and hint", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [DAMPENER, DAMPENER2], scripts: [], dampenerScripts: DAMPENER_SCRIPTS, };
    controller.setLoadout("shipA", loadout);

    const summary = getFake(document, "ship-a-ewar-summary");
    const dampenerSummary = summary.children.find((c) => c.children[0]?.src === "icons/2119.png");
    expect(dampenerSummary).toBeDefined();
    expect(dampenerSummary!.children[1].textContent).toBe("2/2");
    expect(dampenerSummary!.getAttribute("data-hint")).toBe("dampener-hint");
    expect(ewarEffectDescriber.dampenerHint).toHaveBeenCalled();
  });

  test("dampener projection carries per-module overload and script", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [DAMPENER2], scripts: [], dampenerScripts: DAMPENER_SCRIPTS, };
    controller.setLoadout("shipA", loadout);
    expect(controller.projection("shipA")).toEqual({
      loadout,
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [{ active: true, overloaded: false, script: SCAN_RES_SCRIPT }] },
    });

    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const row = dampenerSection(document, "shipA")!.children[1];
    const overload = overloadFor(row);
    overload.trigger("click");
    expect(controller.projection("shipA")!.activation!.dampeners[0]!.overloaded).toBe(true);
  });

  test("selecting a dampener script updates the module button hint by calling dampenerModuleEffect with the selected script", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    controller.setLoadout("shipA", { webs: [], disruptors: [], grapplers: [], scramblers: [], painters: [], dampeners: [DAMPENER2], scripts: [], dampenerScripts: DAMPENER_SCRIPTS, });
    ewarEffectDescriber.dampenerModuleEffect.mockReturnValue("dampener-with-scan");
    const popup = getFake(document, "ship-a-ewar-popup");
    popup.hidden = false;
    const section = dampenerSection(document, "shipA")!;
    const row = section.children[1];
    const button = row.children[0];
    const gear = gearFor(row);
    expect(button.children[1].getAttribute("data-hint")).toBe("dampener-effect");
    gear.trigger("click");
    const scriptPopup = scriptPopupFor(document, "shipA");
    ewarEffectDescriber.dampenerModuleEffect.mockReturnValue("dampener-with-target");
    scriptOptionFor(scriptPopup, String(TARGET_RANGE_SCRIPT.moduleId))!.trigger("click");
    expect(button.children[1].getAttribute("data-hint")).toBe("dampener-with-target");
    expect(ewarEffectDescriber.dampenerModuleEffect).toHaveBeenCalledWith(DAMPENER2, TARGET_RANGE_SCRIPT);
  });
});
