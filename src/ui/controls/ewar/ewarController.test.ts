import { EMPTY_EWAR_LOADOUT } from "../../../sim";
import type { DisruptionScriptSpec, EwarLoadout, StasisWebSpec, TrackingDisruptorSpec } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";
import type { Language } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { collectEwarEls } from "../elementCollectors";
import { createControlsEls } from "../elements";
import type { PopupGroup } from "../popup";
import { FakeElement, fakeDocument, getFake, mockFittingImport } from "../../testing";
import { EwarControllerImpl } from "./ewarController";

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

function buildEwarController(language: Language = "en") {
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
  const popupGroup = vi.mocked<PopupGroup>({
    register: vi.fn(),
    open: vi.fn(),
    toggle: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
    hasOpen: vi.fn(),
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
  });
  const els = collectEwarEls(createControlsEls());
  getFake(document, "attacker-ewar-popup").hidden = true;
  getFake(document, "target-ewar-popup").hidden = true;
  const host = { onConfigChange: vi.fn() };
  const fittingImport = vi.mocked(mockFittingImport());
  fittingImport.itemName = vi.fn((name: string, lang: string) => (lang === "en" ? name : `${name} (${lang})`));
  const controller = new EwarControllerImpl({ els, popupGroup, imageCatalog, fittingImport, i18n });
  controller.setHost(host);
  return { document, controller, els, i18n, imageCatalog, popupGroup, host, fittingImport };
}

function webSection(popup: FakeElement): FakeElement | undefined {
  return popup.children.find((section) => section.children[0]?.textContent === "label.ewar.web");
}

function disruptorSection(popup: FakeElement): FakeElement | undefined {
  return popup.children.find((section) => section.children[0]?.textContent === "label.ewar.disruptor");
}

function overloadFor(row: FakeElement): FakeElement {
  const button = row.children.find((child) => child.className === "ewar-overload-button");
  if (!button) throw new Error("Missing overload button");
  return button;
}

function gearFor(row: FakeElement): FakeElement {
  const gear = row.children.find((child) => child.className === "ewar-script-gear");
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
    const loadout: EwarLoadout = { webs: [WEB2], disruptors: [DISRUPTOR, DISRUPTOR2], scripts: SCRIPTS };
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
    expect(webSummary.children[1].className).toBe("ewar-summary-count");
    expect(webSummary.children[1].textContent).toBe("1/1");

    const disruptorSummary = summary.children[1];
    expect(disruptorSummary.className).toBe("ewar-summary-item");
    expect(disruptorSummary.children[0].tagName).toBe("IMG");
    expect(disruptorSummary.children[0].src).toBe("icons/Tracking_Disruptor_I.png");
    expect(disruptorSummary.children[0].hidden).toBe(false);
    expect(disruptorSummary.children[1].textContent).toBe("2/2");

    expect(popup.children.length).toBe(2);
    const webs = webSection(popup)!;
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

    const disruptors = disruptorSection(popup)!;
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
    expect(firstGear.className).toBe("ewar-script-gear");
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
    expect(getFake(document, "target-ewar-popup").children.length).toBe(0);
  });

  test("toggling a web flips state, updates its section summary, and does not close popup", () => {
    const { controller, document, host } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB, WEB2], disruptors: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const summary = getFake(document, "attacker-ewar-summary");

    const section = webSection(popup)!;
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
    expect(host.onConfigChange).toHaveBeenCalled();

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
    controller.setLoadout("target", { webs: [], disruptors: [DISRUPTOR], scripts: SCRIPTS });

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(popup)!;
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

    controller.setLoadout("attacker", { webs: [WEB], disruptors: [], scripts: SCRIPTS });
    expect(trigger.getAttribute("aria-label")).toBe("label.modules");
    expect(popup.getAttribute("aria-label")).toBe("label.modules");
    expect(popup.children.length).toBe(1);
    expect(popup.children[0].children[0].textContent).toBe("label.ewar.web");

    controller.setLoadout("attacker", { webs: [], disruptors: [DISRUPTOR], scripts: SCRIPTS });
    expect(popup.children.length).toBe(1);
    expect(popup.children[0].children[0].textContent).toBe("label.ewar.disruptor");

    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR], scripts: SCRIPTS });
    expect(popup.children.length).toBe(2);
    expect(popup.children[0].children[0].textContent).toBe("label.ewar.web");
    expect(popup.children[1].children[0].textContent).toBe("label.ewar.disruptor");

    controller.setLoadout("attacker", EMPTY_EWAR_LOADOUT);
    expect(popup.children.length).toBe(0);
  });

  test("TD script choice persists per row and survives capture/restore round-trip", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [DISRUPTOR, { ...DISRUPTOR, moduleName: "Tracking Disruptor II" }], scripts: SCRIPTS };
    controller.setLoadout("target", loadout);

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;

    const section = disruptorSection(popup)!;
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
      disruptors: [
        { active: true, overloaded: false, script: "Optimal Range Disruption Script" },
        { active: true, overloaded: false, script: "Tracking Speed Disruption Script" },
      ],
    });

    controller.restore("target", loadout, captured);
    const restored = controller.capture("target");
    expect(restored).toEqual(captured);

    const restoredSection = disruptorSection(popup)!;
    expect(gearFor(restoredSection.children[1]).getAttribute("title")).toBe("Optimal Range Disruption Script");
    expect(gearFor(restoredSection.children[2]).getAttribute("title")).toBe("Tracking Speed Disruption Script");
  });

  test("stale saved activation is clamped to a shorter loadout", () => {
    const { controller } = buildEwarController();
    const longLoadout: EwarLoadout = { webs: [WEB, WEB2, WEB3], disruptors: [DISRUPTOR, DISRUPTOR2], scripts: SCRIPTS };
    const saved: StoredEwarActivation = {
      webs: [
        { active: false, overloaded: true },
        { active: true, overloaded: false },
        { active: false, overloaded: true },
        { active: true, overloaded: false },
      ],
      disruptors: [
        { active: false, overloaded: true, script: "Tracking Speed Disruption Script" },
        { active: true, overloaded: false, script: "none" },
        { active: true, overloaded: true, script: "Optimal Range Disruption Script" },
      ],
    };
    controller.setLoadout("attacker", longLoadout);
    const shortLoadout: EwarLoadout = { webs: [WEB, WEB2], disruptors: [DISRUPTOR], scripts: SCRIPTS };
    controller.restore("attacker", shortLoadout, saved);

    expect(controller.capture("attacker")).toEqual({
      webs: [{ active: false, overloaded: true }, { active: true, overloaded: false }],
      disruptors: [{ active: false, overloaded: true, script: "Tracking Speed Disruption Script" }],
    });
  });

  test("projection returns undefined for empty loadouts and carries per-module overload", () => {
    const { controller } = buildEwarController();
    expect(controller.projection("attacker")).toBeUndefined();
    expect(controller.projection("target")).toBeUndefined();

    const loadout: EwarLoadout = { webs: [WEB], disruptors: [], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);
    expect(controller.projection("attacker")).toEqual({
      loadout,
      activation: { webs: [{ active: true, overloaded: false }], disruptors: [] },
    });

    controller.setLoadout("attacker", EMPTY_EWAR_LOADOUT);
    expect(controller.projection("attacker")).toBeUndefined();
  });

  test("capture returns StoredEwarActivation matching the current state", () => {
    const { controller, document } = buildEwarController();
    const d2 = { ...DISRUPTOR, moduleName: "Tracking Disruptor II" };
    const loadout: EwarLoadout = { webs: [WEB, WEB2], disruptors: [DISRUPTOR, d2], scripts: SCRIPTS };
    controller.setLoadout("target", loadout);

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;

    const webSec = webSection(popup)!;
    webSec.children[2].children[0].trigger("click");
    const disruptorSec = disruptorSection(popup)!;
    disruptorSec.children[2].children[0].trigger("click");
    const firstGear = gearFor(disruptorSec.children[1]);
    firstGear.trigger("click");
    const scriptPopup = scriptPopupFor(document, "target");
    scriptOptionFor(scriptPopup, "Tracking Speed Disruption Script")!.trigger("click");

    expect(controller.capture("target")).toEqual({
      webs: [{ active: true, overloaded: false }, { active: false, overloaded: false }],
      disruptors: [
        { active: true, overloaded: false, script: "Tracking Speed Disruption Script" },
        { active: false, overloaded: false, script: "none" },
      ],
    });
  });

  test("popup controls visibility and trigger aria-expanded", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [WEB], disruptors: [], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);

    const trigger = getFake(document, "attacker-ewar-trigger");
    const popup = getFake(document, "attacker-ewar-popup");
    const p = controller.popup("attacker");
    expect(p.isOpen()).toBe(false);
    p.open();
    expect(p.isOpen()).toBe(true);
    expect(popup.hidden).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    p.close();
    expect(p.isOpen()).toBe(false);
    expect(popup.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test("script popup opens from gear, highlights current option, and closes on selection", () => {
    const { controller, document, host } = buildEwarController();
    controller.setLoadout("attacker", { webs: [], disruptors: [DISRUPTOR2], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(popup)!;
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
    expect(host.onConfigChange).toHaveBeenCalled();
    expect(controller.capture("attacker")).toEqual({
      webs: [],
      disruptors: [{ active: true, overloaded: false, script: "Tracking Speed Disruption Script" }],
    });
  });

  test("setLoadout renders translated module names", () => {
    const { controller, document, fittingImport } = buildEwarController("zh");
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR], scripts: SCRIPTS });
    const popup = getFake(document, "attacker-ewar-popup");
    const webButton = webSection(popup)!.children[1].children[0];
    expect(webButton.children[1].textContent).toBe(`${WEB.moduleName} (zh)`);
    expect(webButton.getAttribute("aria-label")).toBe(`${WEB.moduleName} (zh)`);
    expect(fittingImport.itemName).toHaveBeenCalledWith(WEB.moduleName, "zh");
  });

  test("summary hides an icon when no icon URL is available", () => {
    const { controller, document, imageCatalog } = buildEwarController();
    imageCatalog.itemIconUrl.mockImplementation((name) =>
      name === WEB.moduleName ? undefined : `icons/${name.replaceAll(" ", "_")}.png`
    );
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR], scripts: SCRIPTS });

    const summary = getFake(document, "attacker-ewar-summary");
    expect(summary.children[0].children[0].tagName).toBe("IMG");
    expect(summary.children[0].children[0].hidden).toBe(true);
    expect(summary.children[0].children[0].src).toBe("");
    expect(summary.children[1].children[0].src).toBe("icons/Tracking_Disruptor_I.png");
  });

  test("selecting None persists over capture/restore round-trip", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [DISRUPTOR2], scripts: SCRIPTS };
    controller.setLoadout("attacker", loadout);

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(popup)!;
    const gear = gearFor(section.children[1]);
    gear.trigger("click");

    const scriptPopup = scriptPopupFor(document, "attacker");
    scriptOptionFor(scriptPopup, "none")!.trigger("click");
    expect(controller.capture("attacker")?.disruptors?.[0]?.script).toBe("none");
    expect(gear.getAttribute("title")).toBe("ewar.script.none");

    controller.restore("attacker", loadout, controller.capture("attacker"));
    expect(gearFor(disruptorSection(popup)!.children[1]).getAttribute("title")).toBe("ewar.script.none");
    expect(controller.capture("attacker")?.disruptors?.[0]?.script).toBe("none");
  });

  test("script popup renders localized names, icons, and multiplier tooltips", () => {
    const { controller, document, imageCatalog, fittingImport } = buildEwarController("zh");
    controller.setLoadout("attacker", { webs: [], disruptors: [DISRUPTOR2], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(popup)!;
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
    controller.setLoadout("attacker", { webs: [WEB, WEB2], disruptors: [DISRUPTOR], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    const webRows = webSection(popup)!.children.slice(1);
    const disruptorRows = disruptorSection(popup)!.children.slice(1);
    for (const row of webRows) expect(overloadFor(row).className).toBe("ewar-overload-button");
    for (const row of disruptorRows) expect(overloadFor(row).className).toBe("ewar-overload-button");
  });

  test("clicking an overload button toggles its aria-pressed and capture output", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR2], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(popup)!.children[1];
    const webOverload = overloadFor(webRow);
    const disruptorRow = disruptorSection(popup)!.children[1];
    const disruptorOverload = overloadFor(disruptorRow);

    expect(webOverload.getAttribute("aria-pressed")).toBe("false");
    expect(disruptorOverload.getAttribute("aria-pressed")).toBe("false");
    webOverload.trigger("click");
    disruptorOverload.trigger("click");
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
    expect(disruptorOverload.getAttribute("aria-pressed")).toBe("true");
    expect(controller.capture("attacker")).toEqual({
      webs: [{ active: true, overloaded: true }],
      disruptors: [{ active: true, overloaded: true, script: "Optimal Range Disruption Script" }],
    });
  });

  test("overload button is disabled when its module is off", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("target", { webs: [WEB], disruptors: [DISRUPTOR], scripts: SCRIPTS });

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(popup)!.children[1];
    const webOverload = overloadFor(webRow);
    webOverload.trigger("click");
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
    webRow.children[0].trigger("click");
    expect(webOverload.disabled).toBe(true);
    expect(webOverload.getAttribute("aria-pressed")).toBe("true");
  });

  test("overload state is preserved when its module is toggled off and back on", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(popup)!.children[1];
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
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR2], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(popup)!.children[1];
    const webOverload = overloadFor(webRow);
    expect(webOverload.getAttribute("aria-label")).toBe(`label.overload ${WEB.moduleName}`);
    expect(webOverload.title).toBe(`label.overload ${WEB.moduleName}`);

    const disruptorRow = disruptorSection(popup)!.children[1];
    const disruptorOverload = overloadFor(disruptorRow);
    expect(disruptorOverload.getAttribute("aria-label")).toBe(`label.overload ${DISRUPTOR2.moduleName}`);
  });

  test("web rows are marked inactive when their module is off", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [], scripts: SCRIPTS });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const webRow = webSection(popup)!.children[1];
    expect(webRow.className).toBe("ewar-row");
    webRow.children[0].trigger("click");
    expect(webRow.className).toBe("ewar-row ewar-row-inactive");
    webRow.children[0].trigger("click");
    expect(webRow.className).toBe("ewar-row");
  });
});
