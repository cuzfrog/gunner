import { EMPTY_EWAR_LOADOUT } from "../../../sim";
import type { DisruptionScriptSpec, EwarLoadout, StasisGrapplerSpec, StasisWebSpec, TrackingDisruptorSpec, WarpScramblerSpec } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";
import type { Language } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { createControlsEls } from "../elements";
import type { Popup, PopupGroup } from "../popup";
import { FakeElement, fakeDocument, getFake, mockFittingImport } from "../../testing";
import { UiEventsImpl } from "../../events";
import { EwarControllerImpl } from "./ewarController";
import type { EwarEffectDescriber } from "./ewarEffectDescriber";

const WEB: StasisWebSpec = { moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: -0.5, overloadRangeBonusPercent: 15 };
const WEB2: StasisWebSpec = { moduleName: "Stasis Webifier II", maxRange: 12000, speedFactor: -0.55, overloadRangeBonusPercent: 15 };
const WEB3: StasisWebSpec = { ...WEB, moduleName: "Stasis Webifier III" };
const OPTIMAL_SCRIPT: DisruptionScriptSpec = {
  name: "Optimal Range Disruption Script", trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2,
};
const TRACKING_SCRIPT: DisruptionScriptSpec = {
  name: "Tracking Speed Disruption Script", trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0,
};
const SCRIPTS: readonly DisruptionScriptSpec[] = [OPTIMAL_SCRIPT, TRACKING_SCRIPT];
const DISRUPTOR: TrackingDisruptorSpec = {
  moduleName: "Tracking Disruptor I", optimal: 10000, falloff: 30000,
  disruption: -0.2, defaultScript: undefined, overloadStrengthBonusPercent: 20,
};
const DISRUPTOR2: TrackingDisruptorSpec = {
  moduleName: "Tracking Disruptor II", optimal: 12000, falloff: 35000,
  disruption: -0.25, defaultScript: OPTIMAL_SCRIPT, overloadStrengthBonusPercent: 20,
};
const SCRAMBLER: WarpScramblerSpec = { moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 };
const GRAPPLER: StasisGrapplerSpec = { moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };

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

  onPointerDown(_target: EventTarget | null): void {}

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
    shipImageUrl: vi.fn(),
    itemIconUrl: vi.fn((name) => `icons/${name.replaceAll(" ", "_")}.png`),
    droneIconUrl: vi.fn(),
  });
  const popupGroup = new FakePopupGroup();
  const els = createControlsEls();
  const attackerPopup = els.attackerEwarPopup;
  const targetPopup = els.targetEwarPopup;
  attackerPopup.appendChild(els.attackerEwarSection);
  attackerPopup.appendChild(els.attackerBoosterSection);
  targetPopup.appendChild(els.targetEwarSection);
  targetPopup.appendChild(els.targetBoosterSection);
  attackerPopup.hidden = true;
  targetPopup.hidden = true;
  if (beforeConstruct) beforeConstruct(document, els);
  const fittingImport = vi.mocked(mockFittingImport());
  fittingImport.itemName = vi.fn((name: string, lang: string) => (lang === "en" ? name : `${name} (${lang})`));
  const ewarEffectDescriber = vi.mocked<EwarEffectDescriber>({
    webDescription: vi.fn(() => "web-title"),
    webHint: vi.fn(() => "web-hint"),
    grapplerDescription: vi.fn(() => "grappler-title"),
    grapplerHint: vi.fn(() => "grappler-hint"),
    disruptorDescription: vi.fn(() => "disruptor-title"),
    disruptorHint: vi.fn(() => "disruptor-hint"),
    scramblerDescription: vi.fn(() => "scrambler-title"),
    scramblerHint: vi.fn(() => "scrambler-hint"),
  });
  const events = new UiEventsImpl();
  const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
  const controller = new EwarControllerImpl({ els, popupGroup, imageCatalog, fittingImport, i18n, ewarEffectDescriber, events });
  events.emitDistanceChanged(5000);
  return { document, controller, els, i18n, imageCatalog, popupGroup, fittingImport, ewarEffectDescriber, events, emitConfigInvalidated };
}

function ewarSection(document: Document, side: "attacker" | "target"): FakeElement {
  return getFake(document, `${side}-ewar-section`);
}

function webSection(document: Document, side: "attacker" | "target"): FakeElement | undefined {
  return ewarSection(document, side).children.find((section) => section.children[0]?.textContent === "label.ewar.web");
}

function grapplerSection(document: Document, side: "attacker" | "target"): FakeElement | undefined {
  return ewarSection(document, side).children.find((section) => section.children[0]?.textContent === "label.ewar.grappler");
}

function disruptorSection(document: Document, side: "attacker" | "target"): FakeElement | undefined {
  return ewarSection(document, side).children.find((section) => section.children[0]?.textContent === "label.ewar.disruptor");
}

function scramblerSection(document: Document, side: "attacker" | "target"): FakeElement | undefined {
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

function scriptPopupFor(document: Document, side: "attacker" | "target"): FakeElement {
  const field = getFake(document, `${side}-ewar-field`);
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
    const loadout: EwarLoadout = { webs: [WEB2], disruptors: [DISRUPTOR, DISRUPTOR2], grapplers: [], scramblers: [], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);

    const trigger = getFake(document, "attacker-ewar-trigger");
    const summary = getFake(document, "attacker-ewar-summary");
    const popup = getFake(document, "attacker-ewar-popup");
    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute("aria-label")).toBe("label.modules");
    expect(trigger.title).toBe("");
    expect(popup.getAttribute("aria-label")).toBe("label.modules");
    expect(summary.children.length).toBe(2);

    const webSummary = summary.children[0];
    expect(webSummary.className).toBe("ewar-summary-item");
    expect(webSummary.children[0].tagName).toBe("IMG");
    expect(webSummary.children[0].src).toBe("icons/Stasis_Webifier_II.png");
    expect(webSummary.children[0].hidden).toBe(false);
    expect(webSummary.children[1].className).toBe("ewar-summary-count mono");
    expect(webSummary.children[1].textContent).toBe("1/1");

    const disruptorSummary = summary.children[1];
    expect(disruptorSummary.className).toBe("ewar-summary-item");
    expect(disruptorSummary.children[0].tagName).toBe("IMG");
    expect(disruptorSummary.children[0].src).toBe("icons/Tracking_Disruptor_I.png");
    expect(disruptorSummary.children[0].hidden).toBe(false);
    expect(disruptorSummary.children[1].textContent).toBe("2/2");

    expect(ewarSection(document, "attacker").children.filter((c) => c.className === "preview-section").length).toBe(2);
    const webs = webSection(document, "attacker")!;
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
    expect(webButton.children[1].title).toBe(WEB2.moduleName);

    const disruptors = disruptorSection(document, "attacker")!;
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
    expect(firstGear.getAttribute("aria-controls")).toBe("attacker-ewar-script-popup");
    expect(firstGear.getAttribute("title")).toBe("ewar.script.none");
    expect(firstGear.getAttribute("aria-label")).toBe("ewar.script.none");
    expect(firstGear.disabled).toBe(false);

    const secondRow = disruptors.children[2];
    const secondGear = gearFor(secondRow);
    expect(secondGear.getAttribute("title")).toBe("Optimal Range Disruption Script");
    expect(secondGear.getAttribute("aria-label")).toBe("Optimal Range Disruption Script");
    expect(secondGear.disabled).toBe(false);

    controller.setLoadout("target", EMPTY_EWAR_LOADOUT);
    const targetTrigger = getFake(document, "target-ewar-trigger");
    expect(targetTrigger.disabled).toBe(true);
    expect(targetTrigger.title).toBe("title.ewar.empty");
    expect(getFake(document, "target-ewar-summary").children.length).toBe(0);
    expect(ewarSection(document, "target").children.length).toBe(0);
  });

  test("grappler-only loadout renders a section, summary, and toggles overload", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], grapplers: [GRAPPLER], disruptors: [], scramblers: [], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);

    const summary = getFake(document, "attacker-ewar-summary");
    expect(summary.children.length).toBe(1);
    expect(summary.children[0].children[1].textContent).toBe("1/1");
    expect(summary.children[0].getAttribute("title")).toBe("grappler-hint");
    expect(ewarEffectDescriber.grapplerHint).toHaveBeenCalled();

    const grapplers = grapplerSection(document, "attacker")!;
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
    expect(controller.projection("attacker")!.activation!.grapplers[0]!.overloaded).toBe(true);
  });

  test("scrambler-only loadout renders, summarizes, and projects", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], grapplers: [], disruptors: [], scramblers: [SCRAMBLER], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);

    const trigger = getFake(document, "attacker-ewar-trigger");
    const summary = getFake(document, "attacker-ewar-summary");
    expect(trigger.disabled).toBe(false);
    expect(summary.children.length).toBe(1);
    expect(summary.children[0].getAttribute("title")).toBe("scrambler-hint");
    expect(ewarSection(document, "attacker").children.filter((c) => c.className === "preview-section").length).toBe(1);
    expect(scramblerSection(document, "attacker")!.children[0].textContent).toBe("label.ewar.scrambler");
    expect(controller.projection("attacker")).toEqual({
      loadout,
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [{ active: true, overloaded: false }] },
    });
    expect(ewarEffectDescriber.scramblerHint).toHaveBeenCalled();
  });

  test("toggling a web flips state, updates its section summary, and does not close popup", () => {
    const { controller, document, emitConfigInvalidated } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB, WEB2], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const summary = getFake(document, "attacker-ewar-summary");

    const section = webSection(document, "attacker")!;
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
    expect(controller.capture("attacker")?.webs).toEqual([
      { active: false, overloaded: false },
      { active: true, overloaded: false },
    ]);
    expect(emitConfigInvalidated).toHaveBeenCalledWith(true);

    firstToggle.trigger("click");
    expect(summary.children[0].children[1].textContent).toBe("2/2");
    expect(firstOverload.disabled).toBe(false);
    expect(controller.capture("attacker")?.webs).toEqual([
      { active: true, overloaded: false },
      { active: true, overloaded: false },
    ]);
  });

  test("toggling a disruptor disables its overload button and script gear", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("target", { webs: [], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(document, "target")!;
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
    const trigger = getFake(document, "attacker-ewar-trigger");
    const popup = getFake(document, "attacker-ewar-popup");
    const ewar = ewarSection(document, "attacker");

    controller.setLoadout("attacker", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS });
    expect(trigger.getAttribute("aria-label")).toBe("label.modules");
    expect(popup.getAttribute("aria-label")).toBe("label.modules");
    expect(ewar.children.filter((c) => c.className === "preview-section").length).toBe(1);
    expect(webSection(document, "attacker")!.children[0].textContent).toBe("label.ewar.web");

    controller.setLoadout("attacker", { webs: [], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], scripts: SCRIPTS });
    expect(ewar.children.filter((c) => c.className === "preview-section").length).toBe(1);
    expect(disruptorSection(document, "attacker")!.children[0].textContent).toBe("label.ewar.disruptor");

    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], scripts: SCRIPTS });
    expect(ewar.children.filter((c) => c.className === "preview-section").length).toBe(2);
    expect(webSection(document, "attacker")!.children[0].textContent).toBe("label.ewar.web");
    expect(disruptorSection(document, "attacker")!.children[0].textContent).toBe("label.ewar.disruptor");

    controller.setLoadout("attacker", EMPTY_EWAR_LOADOUT);
    expect(ewar.children.length).toBe(0);
  });

  test("TD script choice persists per row and survives capture/restore round-trip", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [DISRUPTOR, { ...DISRUPTOR, moduleName: "Tracking Disruptor II" }], grapplers: [], scramblers: [], scripts: SCRIPTS };
    controller.setLoadout("target", loadout);

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;

    const section = disruptorSection(document, "target")!;
    const firstRow = section.children[1];
    const firstGear = gearFor(firstRow);
    firstGear.trigger("click");
    const firstScriptPopup = scriptPopupFor(document, "target");
    expect(firstScriptPopup.hidden).toBe(false);
    scriptOptionFor(firstScriptPopup, "Optimal Range Disruption Script")!.trigger("click");
    expect(controller.capture("target")?.disruptors?.[0]?.script).toBe("Optimal Range Disruption Script");
    expect(firstGear.getAttribute("title")).toBe("Optimal Range Disruption Script");

    const secondRow = section.children[2];
    const secondGear = gearFor(secondRow);
    secondGear.trigger("click");
    const secondScriptPopup = scriptPopupFor(document, "target");
    scriptOptionFor(secondScriptPopup, "Tracking Speed Disruption Script")!.trigger("click");
    expect(controller.capture("target")?.disruptors?.[1]?.script).toBe("Tracking Speed Disruption Script");

    const captured = controller.capture("target");
    expect(captured).toEqual({
      webs: [],
      grapplers: [],
      disruptors: [
        { active: true, overloaded: false, script: "Optimal Range Disruption Script" },
        { active: true, overloaded: false, script: "Tracking Speed Disruption Script" },
      ],
    });

    controller.restore("target", loadout, captured);
    const restored = controller.capture("target");
    expect(restored).toEqual(captured);

    const restoredSection = disruptorSection(document, "target")!;
    expect(gearFor(restoredSection.children[1]).getAttribute("title")).toBe("Optimal Range Disruption Script");
    expect(gearFor(restoredSection.children[2]).getAttribute("title")).toBe("Tracking Speed Disruption Script");
  });

  test("stale saved activation is clamped to a shorter loadout", () => {
    const { controller } = buildEwarController();
    const longLoadout: EwarLoadout = { webs: [WEB, WEB2, WEB3], disruptors: [DISRUPTOR, DISRUPTOR2], grapplers: [], scramblers: [], scripts: SCRIPTS };
    const saved: StoredEwarActivation = {
      webs: [
        { active: false, overloaded: true },
        { active: true, overloaded: false },
        { active: false, overloaded: true },
        { active: true, overloaded: false },
      ],
      grapplers: [],
      disruptors: [
        { active: false, overloaded: true, script: "Tracking Speed Disruption Script" },
        { active: true, overloaded: false, script: "none" },
        { active: true, overloaded: true, script: "Optimal Range Disruption Script" },
      ],
    };
    controller.setLoadout("attacker", longLoadout);
    const shortLoadout: EwarLoadout = { webs: [WEB, WEB2], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], scripts: SCRIPTS };
    controller.restore("attacker", shortLoadout, saved);

    expect(controller.capture("attacker")).toEqual({
      webs: [{ active: false, overloaded: true }, { active: true, overloaded: false }],
      grapplers: [],
      disruptors: [{ active: false, overloaded: true, script: "Tracking Speed Disruption Script" }],
    });
  });

  test("projection returns undefined for empty loadouts and carries per-module overload", () => {
    const { controller } = buildEwarController();
    expect(controller.projection("attacker")).toBeUndefined();
    expect(controller.projection("target")).toBeUndefined();

    const loadout: EwarLoadout = { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);
    expect(controller.projection("attacker")).toEqual({
      loadout,
      activation: { webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: [] },
    });

    controller.setLoadout("attacker", EMPTY_EWAR_LOADOUT);
    expect(controller.projection("attacker")).toBeUndefined();
  });

  test("capture returns StoredEwarActivation matching the current state", () => {
    const { controller, document } = buildEwarController();
    const d2 = { ...DISRUPTOR, moduleName: "Tracking Disruptor II" };
    const loadout: EwarLoadout = { webs: [WEB, WEB2], disruptors: [DISRUPTOR, d2], grapplers: [], scramblers: [], scripts: SCRIPTS };
    controller.setLoadout("target", loadout);

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;

    const webSec = webSection(document, "target")!;
    webSec.children[2].children[0].trigger("click");
    const disruptorSec = disruptorSection(document, "target")!;
    disruptorSec.children[2].children[0].trigger("click");
    const firstGear = gearFor(disruptorSec.children[1]);
    firstGear.trigger("click");
    const scriptPopup = scriptPopupFor(document, "target");
    scriptOptionFor(scriptPopup, "Tracking Speed Disruption Script")!.trigger("click");

    expect(controller.capture("target")).toEqual({
      webs: [{ active: true, overloaded: false }, { active: false, overloaded: false }],
      grapplers: [],
      disruptors: [
        { active: true, overloaded: false, script: "Tracking Speed Disruption Script" },
        { active: false, overloaded: false, script: "none" },
      ],
    });
  });

  test("popup controls visibility and trigger aria-expanded", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);

    const trigger = getFake(document, "attacker-ewar-trigger");
    const popup = getFake(document, "attacker-ewar-popup");
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
    controller.setLoadout("attacker", { webs: [], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(document, "attacker")!;
    const row = section.children[1];
    const gear = gearFor(row);
    gear.trigger("click");

    const scriptPopup = scriptPopupFor(document, "attacker");
    expect(scriptPopup.hidden).toBe(false);
    expect(gear.getAttribute("aria-expanded")).toBe("true");
    expect(scriptPopup.children.length).toBe(4);
    expect(scriptPopup.children[0].textContent).toBe(DISRUPTOR2.moduleName);
    expect(selectedScriptOption(scriptPopup)?.getAttribute("data-value")).toBe("Optimal Range Disruption Script");

    scriptOptionFor(scriptPopup, "Tracking Speed Disruption Script")!.trigger("click");
    expect(scriptPopup.hidden).toBe(true);
    expect(gear.getAttribute("aria-expanded")).toBe("false");
    expect(gear.getAttribute("title")).toBe("Tracking Speed Disruption Script");
    expect(gear.getAttribute("aria-label")).toBe("Tracking Speed Disruption Script");
    expect(emitConfigInvalidated).toHaveBeenCalledWith(true);
    expect(controller.capture("attacker")).toEqual({
      webs: [],
      grapplers: [],
      disruptors: [{ active: true, overloaded: false, script: "Tracking Speed Disruption Script" }],
    });
  });

  test("setLoadout renders translated module names and keeps icon inputs canonical", () => {
    const { controller, document, fittingImport, imageCatalog } = buildEwarController("zh");
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], scripts: SCRIPTS });
    const webSectionEl = webSection(document, "attacker")!;
    const webButton = webSectionEl.children[1].children[0];
    const overloadButton = overloadFor(webSectionEl.children[1]);
    expect(webButton.children[1].textContent).toBe(`${WEB.moduleName} (zh)`);
    expect(webButton.children[1].title).toBe(`${WEB.moduleName} (zh)`);
    expect(webButton.getAttribute("aria-label")).toBe(`${WEB.moduleName} (zh)`);
    expect(overloadButton.getAttribute("aria-label")).toContain(`${WEB.moduleName} (zh)`);
    expect(fittingImport.itemName).toHaveBeenCalledWith(WEB.moduleName, "zh");
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith(WEB.moduleName);
    expect(imageCatalog.itemIconUrl).not.toHaveBeenCalledWith(`${WEB.moduleName} (zh)`);
  });

  test("summary hides an icon when no icon URL is available", () => {
    const { controller, document, imageCatalog } = buildEwarController();
    imageCatalog.itemIconUrl.mockImplementation((name) =>
      name === WEB.moduleName ? undefined : `icons/${name.replaceAll(" ", "_")}.png`
    );
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const summary = getFake(document, "attacker-ewar-summary");
    expect(summary.children[0].children[0].tagName).toBe("IMG");
    expect(summary.children[0].children[0].hidden).toBe(true);
    expect(summary.children[0].children[0].src).toBe("");
    expect(summary.children[1].children[0].src).toBe("icons/Tracking_Disruptor_I.png");
  });

  test("selecting None persists over capture/restore round-trip", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(document, "attacker")!;
    const gear = gearFor(section.children[1]);
    gear.trigger("click");

    const scriptPopup = scriptPopupFor(document, "attacker");
    scriptOptionFor(scriptPopup, "none")!.trigger("click");
    expect(controller.capture("attacker")?.disruptors?.[0]?.script).toBe("none");
    expect(gear.getAttribute("title")).toBe("ewar.script.none");

    controller.restore("attacker", loadout, controller.capture("attacker"));
    expect(gearFor(disruptorSection(document, "attacker")!.children[1]).getAttribute("title")).toBe("ewar.script.none");
    expect(controller.capture("attacker")?.disruptors?.[0]?.script).toBe("none");
  });

  test("script popup renders localized names, icons, and multiplier tooltips", () => {
    const { controller, document, imageCatalog, fittingImport } = buildEwarController("zh");
    controller.setLoadout("attacker", { webs: [], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(document, "attacker")!;
    gearFor(section.children[1]).trigger("click");

    const scriptPopup = scriptPopupFor(document, "attacker");
    const noneOption = scriptOptionFor(scriptPopup, "none")!;
    expect(noneOption.children.length).toBe(1);
    expect(noneOption.children[0].textContent).toBe("ewar.script.none");
    expect(noneOption.title).toBe("ewar.script.none.hint");

    const optimalOption = scriptOptionFor(scriptPopup, "Optimal Range Disruption Script")!;
    expect(optimalOption.children[0].tagName).toBe("IMG");
    expect(optimalOption.children[0].src).toBe("icons/Optimal_Range_Disruption_Script.png");
    expect(optimalOption.children[1].textContent).toBe("Optimal Range Disruption Script (zh)");
    expect(fittingImport.itemName).toHaveBeenCalledWith("Optimal Range Disruption Script", "zh");
    expect(optimalOption.title).toBe("optimal x2 · falloff x2 · track x0");
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith("Optimal Range Disruption Script");
  });

  test("overload buttons are present per web and disruptor row", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB, WEB2], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const webRows = webSection(document, "attacker")!.children.slice(1);
    const disruptorRows = disruptorSection(document, "attacker")!.children.slice(1);
    for (const row of webRows) expect(overloadFor(row).className).toBe("ewar-overload-button btn icon-button");
    for (const row of disruptorRows) expect(overloadFor(row).className).toBe("ewar-overload-button btn icon-button");
  });

  test("clicking an overload button toggles its aria-pressed and capture output", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "attacker")!.children[1];
    const webOverload = overloadFor(webRow);
    const disruptorRow = disruptorSection(document, "attacker")!.children[1];
    const disruptorOverload = overloadFor(disruptorRow);

    expect(webOverload.getAttribute("aria-pressed")).toBe("false");
    expect(disruptorOverload.getAttribute("aria-pressed")).toBe("false");
    webOverload.trigger("click");
    disruptorOverload.trigger("click");
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
    expect(disruptorOverload.getAttribute("aria-pressed")).toBe("true");
    expect(controller.capture("attacker")).toEqual({
      webs: [{ active: true, overloaded: true }],
      grapplers: [],
      disruptors: [{ active: true, overloaded: true, script: "Optimal Range Disruption Script" }],
    });
  });

  test("overload button is disabled when its module is off", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("target", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "target")!.children[1];
    const webOverload = overloadFor(webRow);
    webOverload.trigger("click");
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
    webRow.children[0].trigger("click");
    expect(webOverload.disabled).toBe(true);
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
  });

  test("overload state is preserved when its module is toggled off and back on", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "attacker")!.children[1];
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
    expect(controller.capture("attacker")?.webs?.[0]).toEqual({ active: true, overloaded: true });
  });

  test("overload button has an accessible label that includes the module name", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR2], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "attacker")!.children[1];
    const webOverload = overloadFor(webRow);
    expect(webOverload.getAttribute("aria-label")).toBe(`label.overload ${WEB.moduleName}`);
    expect(webOverload.title).toBe(`label.overload ${WEB.moduleName}`);

    const disruptorRow = disruptorSection(document, "attacker")!.children[1];
    const disruptorOverload = overloadFor(disruptorRow);
    expect(disruptorOverload.getAttribute("aria-label")).toBe(`label.overload ${DISRUPTOR2.moduleName}`);
  });

  test("web rows are marked inactive when their module is off", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(document, "attacker")!.children[1];
    expect(webRow.className).toBe("ewar-row");
    webRow.children[0].trigger("click");
    expect(webRow.className).toBe("ewar-row ewar-row-inactive");
    webRow.children[0].trigger("click");
    expect(webRow.className).toBe("ewar-row");
  });

  test("summary items receive title attributes from the effect describer", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const summary = getFake(document, "attacker-ewar-summary");
    expect(summary.children[0].getAttribute("title")).toBe("web-hint");
    expect(summary.children[1].getAttribute("title")).toBe("disruptor-hint");
    expect(ewarEffectDescriber.webHint).toHaveBeenCalled();
    expect(ewarEffectDescriber.disruptorHint).toHaveBeenCalled();
  });

  test("toggling a module refreshes the summary title", () => {
    const { controller, document, ewarEffectDescriber } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    ewarEffectDescriber.webHint.mockReturnValue("web-active");
    const section = webSection(document, "attacker")!;
    section.children[1].children[0].trigger("click");
    expect(getFake(document, "attacker-ewar-summary").children[0].getAttribute("title")).toBe("web-active");
  });

  test("updateSummaries refreshes both sides", () => {
    const { controller, ewarEffectDescriber } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS });
    controller.setLoadout("target", { webs: [WEB2], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS });
    ewarEffectDescriber.webHint.mockClear();

    controller.updateSummaries();
    expect(ewarEffectDescriber.webHint).toHaveBeenCalledTimes(2);
  });

  test("renderSide clears only the ewar section and leaves the booster section untouched", () => {
    const sentinelHolder: { el?: FakeElement } = {};
    const { controller, document } = buildEwarController("en", (document) => {
      sentinelHolder.el = document.createElement("div") as unknown as FakeElement;
      sentinelHolder.el.textContent = "booster sentinel";
      getFake(document, "attacker-booster-section").appendChild(sentinelHolder.el);
    });

    expect(getFake(document, "attacker-booster-section").children.length).toBe(1);
    expect(getFake(document, "attacker-booster-section").children[0]).toBe(sentinelHolder.el!);

    const loadout: EwarLoadout = { webs: [WEB], disruptors: [], grapplers: [], scramblers: [], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);

    expect(ewarSection(document, "attacker").children.filter((c) => c.className === "preview-section").length).toBe(1);
    expect(getFake(document, "attacker-booster-section").children.length).toBe(1);
    expect(getFake(document, "attacker-booster-section").children[0]).toBe(sentinelHolder.el!);
  });
});
