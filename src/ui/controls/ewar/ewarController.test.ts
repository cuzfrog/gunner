import { EMPTY_EWAR_LOADOUT } from "../../../sim";
import type { EwarLoadout, StasisWebSpec, TrackingDisruptorSpec } from "../../../sim";
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
const DISRUPTOR: TrackingDisruptorSpec = {
  moduleName: "Tracking Disruptor I", optimal: 10000, falloff: 30000,
  disruption: -0.2, defaultScript: "none", overloadStrengthBonusPercent: 20,
};
const DISRUPTOR2: TrackingDisruptorSpec = {
  moduleName: "Tracking Disruptor II", optimal: 12000, falloff: 35000,
  disruption: -0.25, defaultScript: "optimalRange", overloadStrengthBonusPercent: 20,
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

function gearFor(row: FakeElement): FakeElement {
  const gear = row.children[1];
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
    const loadout: EwarLoadout = { webs: [WEB2], disruptors: [DISRUPTOR, DISRUPTOR2] };
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
    expect(secondGear.getAttribute("title")).toBe("ewar.script.optimal");
    expect(secondGear.getAttribute("aria-label")).toBe("ewar.script.optimal");
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
    controller.setLoadout("attacker", { webs: [WEB, WEB2], disruptors: [] });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const summary = getFake(document, "attacker-ewar-summary");

    const section = webSection(popup)!;
    expect(summary.children[0].children[1].textContent).toBe("2/2");
    section.children[1].children[0].trigger("click");
    expect(summary.children[0].children[1].textContent).toBe("1/2");
    expect(popup.hidden).toBe(false);
    expect(section.children[1].children[0].getAttribute("aria-pressed")).toBe("false");
    expect(section.children[2].children[0].getAttribute("aria-pressed")).toBe("true");
    expect(controller.capture("attacker")?.webs).toEqual([false, true]);
    expect(host.onConfigChange).toHaveBeenCalled();

    section.children[1].children[0].trigger("click");
    expect(summary.children[0].children[1].textContent).toBe("2/2");
    expect(controller.capture("attacker")?.webs).toEqual([true, true]);
  });

  test("toggling a disruptor disables its script gear", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("target", { webs: [], disruptors: [DISRUPTOR] });

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(popup)!;
    const row = section.children[1];
    const gear = gearFor(row);
    expect(row.className).toBe("ewar-row");
    expect(gear.disabled).toBe(false);
    row.children[0].trigger("click");
    expect(row.className).toBe("ewar-row ewar-row-inactive");
    expect(row.children[0].getAttribute("aria-pressed")).toBe("false");
    expect(gear.disabled).toBe(true);
    row.children[0].trigger("click");
    expect(row.className).toBe("ewar-row");
    expect(row.children[0].getAttribute("aria-pressed")).toBe("true");
    expect(gear.disabled).toBe(false);
  });

  test("renders one, two, or zero sections based on loadout contents", () => {
    const { controller, document } = buildEwarController();
    const trigger = getFake(document, "attacker-ewar-trigger");
    const popup = getFake(document, "attacker-ewar-popup");

    controller.setLoadout("attacker", { webs: [WEB], disruptors: [] });
    expect(trigger.getAttribute("aria-label")).toBe("label.modules");
    expect(popup.getAttribute("aria-label")).toBe("label.modules");
    expect(popup.children.length).toBe(1);
    expect(popup.children[0].children[0].textContent).toBe("label.ewar.web");

    controller.setLoadout("attacker", { webs: [], disruptors: [DISRUPTOR] });
    expect(popup.children.length).toBe(1);
    expect(popup.children[0].children[0].textContent).toBe("label.ewar.disruptor");

    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR] });
    expect(popup.children.length).toBe(2);
    expect(popup.children[0].children[0].textContent).toBe("label.ewar.web");
    expect(popup.children[1].children[0].textContent).toBe("label.ewar.disruptor");

    controller.setLoadout("attacker", EMPTY_EWAR_LOADOUT);
    expect(popup.children.length).toBe(0);
  });

  test("TD script choice persists per row and survives capture/restore round-trip", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [DISRUPTOR, { ...DISRUPTOR, moduleName: "Tracking Disruptor II" }] };
    controller.setLoadout("target", loadout);

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;

    const section = disruptorSection(popup)!;
    const firstRow = section.children[1];
    const firstGear = gearFor(firstRow);
    firstGear.trigger("click");
    const firstScriptPopup = scriptPopupFor(document, "target");
    expect(firstScriptPopup.hidden).toBe(false);
    scriptOptionFor(firstScriptPopup, "optimalRange")!.trigger("click");
    expect(controller.capture("target")?.disruptors?.[0]?.script).toBe("optimalRange");
    expect(firstGear.getAttribute("title")).toBe("ewar.script.optimal");

    const secondRow = section.children[2];
    const secondGear = gearFor(secondRow);
    secondGear.trigger("click");
    const secondScriptPopup = scriptPopupFor(document, "target");
    scriptOptionFor(secondScriptPopup, "trackingSpeed")!.trigger("click");
    expect(controller.capture("target")?.disruptors?.[1]?.script).toBe("trackingSpeed");

    const captured = controller.capture("target");
    expect(captured).toEqual({
      webs: [],
      disruptors: [{ active: true, script: "optimalRange" }, { active: true, script: "trackingSpeed" }],
    });

    controller.restore("target", loadout, captured);
    const restored = controller.capture("target");
    expect(restored).toEqual(captured);

    const restoredSection = disruptorSection(popup)!;
    expect(gearFor(restoredSection.children[1]).getAttribute("title")).toBe("ewar.script.optimal");
    expect(gearFor(restoredSection.children[2]).getAttribute("title")).toBe("ewar.script.tracking");
  });

  test("stale saved activation is clamped to a shorter loadout", () => {
    const { controller } = buildEwarController();
    const longLoadout: EwarLoadout = { webs: [WEB, WEB2, WEB3], disruptors: [DISRUPTOR, DISRUPTOR2] };
    const saved: StoredEwarActivation = {
      webs: [false, true, false, true],
      disruptors: [{ active: false, script: "trackingSpeed" }, { active: true, script: "none" }, { active: true, script: "optimalRange" }],
    };
    controller.setLoadout("attacker", longLoadout);
    const shortLoadout: EwarLoadout = { webs: [WEB, WEB2], disruptors: [DISRUPTOR] };
    controller.restore("attacker", shortLoadout, saved);

    expect(controller.capture("attacker")).toEqual({
      webs: [false, true],
      disruptors: [{ active: false, script: "trackingSpeed" }],
    });
  });

  test("projection returns undefined for empty loadouts and carries the overload flag", () => {
    const { controller } = buildEwarController();
    expect(controller.projection("attacker", false)).toBeUndefined();
    expect(controller.projection("target", true)).toBeUndefined();

    const loadout: EwarLoadout = { webs: [WEB], disruptors: [] };
    controller.setLoadout("attacker", loadout);
    expect(controller.projection("attacker", true)).toEqual({
      loadout,
      activation: { webs: [{ active: true }], disruptors: [] },
      overloaded: true,
    });
    expect(controller.projection("attacker", false)).toEqual({
      loadout,
      activation: { webs: [{ active: true }], disruptors: [] },
      overloaded: false,
    });

    controller.setLoadout("attacker", EMPTY_EWAR_LOADOUT);
    expect(controller.projection("attacker", false)).toBeUndefined();
  });

  test("capture returns StoredEwarActivation matching the current state", () => {
    const { controller, document } = buildEwarController();
    const d2 = { ...DISRUPTOR, moduleName: "Tracking Disruptor II" };
    const loadout: EwarLoadout = { webs: [WEB, WEB2], disruptors: [DISRUPTOR, d2] };
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
    scriptOptionFor(scriptPopup, "trackingSpeed")!.trigger("click");

    expect(controller.capture("target")).toEqual({
      webs: [true, false],
      disruptors: [{ active: true, script: "trackingSpeed" }, { active: false, script: "none" }],
    });
  });

  test("popup controls visibility and trigger aria-expanded", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [WEB], disruptors: [] };
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
    controller.setLoadout("attacker", { webs: [], disruptors: [DISRUPTOR2] });

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
    expect(selectedScriptOption(scriptPopup)?.getAttribute("data-value")).toBe("optimalRange");

    scriptOptionFor(scriptPopup, "trackingSpeed")!.trigger("click");
    expect(scriptPopup.hidden).toBe(true);
    expect(gear.getAttribute("aria-expanded")).toBe("false");
    expect(gear.getAttribute("title")).toBe("ewar.script.tracking");
    expect(gear.getAttribute("aria-label")).toBe("ewar.script.tracking");
    expect(host.onConfigChange).toHaveBeenCalled();
    expect(controller.capture("attacker")).toEqual({
      webs: [],
      disruptors: [{ active: true, script: "trackingSpeed" }],
    });
  });

  test("setLoadout renders translated module names", () => {
    const { controller, document, fittingImport } = buildEwarController("zh");
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR] });
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
    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR] });

    const summary = getFake(document, "attacker-ewar-summary");
    expect(summary.children[0].children[0].tagName).toBe("IMG");
    expect(summary.children[0].children[0].hidden).toBe(true);
    expect(summary.children[0].children[0].src).toBe("");
    expect(summary.children[1].children[0].src).toBe("icons/Tracking_Disruptor_I.png");
  });
});
