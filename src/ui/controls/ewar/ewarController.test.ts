import { EMPTY_EWAR_LOADOUT } from "../../../sim";
import type { EwarLoadout, StasisWebSpec, TrackingDisruptorSpec } from "../../../sim";
import type { StoredEwarActivation } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { collectEwarEls } from "../elementCollectors";
import { createControlsEls } from "../elements";
import type { PopupGroup } from "../popup";
import { FakeElement, fakeDocument, getFake } from "../../testing";
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

function buildEwarController() {
  const document = fakeDocument();
  globalThis.document = document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const i18n = vi.mocked<I18n>({
    current: vi.fn(),
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
  const controller = new EwarControllerImpl({ els, popupGroup, imageCatalog, i18n });
  controller.setHost(host);
  return { document, controller, els, i18n, imageCatalog, popupGroup, host };
}

function activeScriptButton(group: FakeElement): FakeElement | undefined {
  return group.children.find((button) => button.getAttribute("aria-pressed") === "true");
}

function webSection(popup: FakeElement): FakeElement | undefined {
  return popup.children.find((section) => section.children[0]?.textContent === "label.ewar.web");
}

function disruptorSection(popup: FakeElement): FakeElement | undefined {
  return popup.children.find((section) => section.children[0]?.textContent === "label.ewar.disruptor");
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

    const group = firstDisruptorRow.children[2];
    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("aria-label")).toBe(DISRUPTOR.moduleName);
    expect(group.className).toBe("ewar-script-choice");
    expect(group.children.length).toBe(3);
    expect(group.children[0].getAttribute("data-value")).toBe("none");
    expect(group.children[1].getAttribute("data-value")).toBe("optimalRange");
    expect(group.children[2].getAttribute("data-value")).toBe("trackingSpeed");
    expect(group.children[0].title).toBe("ewar.script.none.hint");
    expect(group.children[1].title).toBe("ewar.script.optimal.hint");
    expect(group.children[2].title).toBe("ewar.script.tracking.hint");
    expect(activeScriptButton(group)?.getAttribute("data-value")).toBe("none");

    const secondRow = disruptors.children[2];
    expect(activeScriptButton(secondRow.children[2])?.getAttribute("data-value")).toBe("optimalRange");

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

  test("toggling a disruptor dims its script choice group", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("target", { webs: [], disruptors: [DISRUPTOR] });

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;
    const section = disruptorSection(popup)!;
    const row = section.children[1];
    const group = row.children[2];
    expect(row.className).toBe("ewar-row");
    expect(group.children[0].disabled).toBe(false);
    row.children[0].trigger("click");
    expect(row.className).toBe("ewar-row ewar-row-inactive");
    expect(row.children[0].getAttribute("aria-pressed")).toBe("false");
    expect(group.children[0].disabled).toBe(true);
    expect(group.children[1].disabled).toBe(true);
    expect(group.children[2].disabled).toBe(true);
    row.children[0].trigger("click");
    expect(row.className).toBe("ewar-row");
    expect(row.children[0].getAttribute("aria-pressed")).toBe("true");
    expect(group.children[0].disabled).toBe(false);
    expect(group.children[1].disabled).toBe(false);
    expect(group.children[2].disabled).toBe(false);
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
    const firstGroup = firstRow.children[2] as FakeElement;
    firstGroup.children[1].trigger("click");
    expect(activeScriptButton(firstGroup)?.getAttribute("data-value")).toBe("optimalRange");

    const secondRow = section.children[2];
    const secondGroup = secondRow.children[2] as FakeElement;
    secondGroup.children[2].trigger("click");
    expect(activeScriptButton(secondGroup)?.getAttribute("data-value")).toBe("trackingSpeed");

    const captured = controller.capture("target");
    expect(captured).toEqual({
      webs: [],
      disruptors: [{ active: true, script: "optimalRange" }, { active: true, script: "trackingSpeed" }],
    });

    controller.restore("target", loadout, captured);
    const restored = controller.capture("target");
    expect(restored).toEqual(captured);

    const restoredSection = disruptorSection(popup)!;
    expect(activeScriptButton(restoredSection.children[1].children[2])?.getAttribute("data-value")).toBe("optimalRange");
    expect(activeScriptButton(restoredSection.children[2].children[2])?.getAttribute("data-value")).toBe("trackingSpeed");
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
    const firstGroup = disruptorSec.children[1].children[2] as FakeElement;
    firstGroup.children[2].trigger("click");

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
