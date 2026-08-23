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

describe("EwarController", () => {
  test("setLoadout renders one row per instance and disables trigger for empty loadouts", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [WEB], disruptors: [DISRUPTOR, DISRUPTOR2] };
    controller.setLoadout("attacker", loadout);

    const trigger = getFake(document, "attacker-ewar-trigger");
    const summary = getFake(document, "attacker-ewar-summary");
    const popup = getFake(document, "attacker-ewar-popup");
    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute("aria-label")).toBe("label.ewar.mixed");
    expect(trigger.title).toBe("");
    expect(popup.getAttribute("aria-label")).toBe("label.ewar.mixed");
    expect(summary.textContent).toBe("3/3");
    expect(popup.children.length).toBe(3);

    const webRow = popup.children[0] as FakeElement;
    expect(webRow.tagName).toBe("DIV");
    expect(webRow.className).toBe("ewar-row");
    const webButton = webRow.children[0];
    expect(webButton.tagName).toBe("BUTTON");
    expect(webButton.getAttribute("aria-pressed")).toBe("true");
    expect(webButton.title).toBe(WEB.moduleName);
    expect(webButton.children[0].tagName).toBe("IMG");
    expect(webButton.children[0].hidden).toBe(false);
    expect(webButton.children[1].textContent).toBe(WEB.moduleName);
    expect(webButton.children[1].title).toBe(WEB.moduleName);

    const disruptorRow = popup.children[1] as FakeElement;
    expect(disruptorRow.tagName).toBe("DIV");
    expect(disruptorRow.className).toBe("ewar-row");
    const toggle = disruptorRow.children[0];
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.children[1].textContent).toBe(DISRUPTOR.moduleName);

    const group = disruptorRow.children[2];
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

    const secondRow = popup.children[2] as FakeElement;
    expect(activeScriptButton(secondRow.children[2])?.getAttribute("data-value")).toBe("optimalRange");

    controller.setLoadout("target", EMPTY_EWAR_LOADOUT);
    const targetTrigger = getFake(document, "target-ewar-trigger");
    expect(targetTrigger.disabled).toBe(true);
    expect(targetTrigger.title).toBe("title.ewar.empty");
    expect(getFake(document, "target-ewar-summary").textContent).toBe("");
    expect(getFake(document, "target-ewar-popup").children.length).toBe(0);
  });

  test("toggling a web flips state, updates summary, and does not close popup", () => {
    const { controller, document, host } = buildEwarController();
    controller.setLoadout("attacker", { webs: [WEB, WEB2], disruptors: [] });

    const popup = getFake(document, "attacker-ewar-popup");
    popup.hidden = false;
    const summary = getFake(document, "attacker-ewar-summary");

    expect(summary.textContent).toBe("2/2");
    (popup.children[0] as FakeElement).children[0].trigger("click");
    expect(summary.textContent).toBe("1/2");
    expect(popup.hidden).toBe(false);
    expect((popup.children[0] as FakeElement).children[0].getAttribute("aria-pressed")).toBe("false");
    expect((popup.children[1] as FakeElement).children[0].getAttribute("aria-pressed")).toBe("true");
    expect(controller.capture("attacker")?.webs).toEqual([false, true]);
    expect(host.onConfigChange).toHaveBeenCalled();

    (popup.children[0] as FakeElement).children[0].trigger("click");
    expect(summary.textContent).toBe("2/2");
    expect(controller.capture("attacker")?.webs).toEqual([true, true]);
  });

  test("toggling a disruptor dims its script choice group", () => {
    const { controller, document } = buildEwarController();
    controller.setLoadout("target", { webs: [], disruptors: [DISRUPTOR] });

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;
    const row = popup.children[0] as FakeElement;
    expect(row.className).toBe("ewar-row");
    row.children[0].trigger("click");
    expect(row.className).toBe("ewar-row ewar-row-inactive");
    expect(row.children[0].getAttribute("aria-pressed")).toBe("false");
    row.children[0].trigger("click");
    expect(row.className).toBe("ewar-row");
    expect(row.children[0].getAttribute("aria-pressed")).toBe("true");
  });

  test("labels are derived from the loadout contents", () => {
    const { controller, document } = buildEwarController();
    const trigger = getFake(document, "attacker-ewar-trigger");
    const popup = getFake(document, "attacker-ewar-popup");

    controller.setLoadout("attacker", { webs: [WEB], disruptors: [] });
    expect(trigger.getAttribute("aria-label")).toBe("label.ewar.web");
    expect(popup.getAttribute("aria-label")).toBe("label.ewar.web");

    controller.setLoadout("attacker", { webs: [], disruptors: [DISRUPTOR] });
    expect(trigger.getAttribute("aria-label")).toBe("label.ewar.disruptor");
    expect(popup.getAttribute("aria-label")).toBe("label.ewar.disruptor");

    controller.setLoadout("attacker", { webs: [WEB], disruptors: [DISRUPTOR] });
    expect(trigger.getAttribute("aria-label")).toBe("label.ewar.mixed");
    expect(popup.getAttribute("aria-label")).toBe("label.ewar.mixed");
  });

  test("TD script choice persists per row and survives capture/restore round-trip", () => {
    const { controller, document } = buildEwarController();
    const loadout: EwarLoadout = { webs: [], disruptors: [DISRUPTOR, { ...DISRUPTOR, moduleName: "Tracking Disruptor II" }] };
    controller.setLoadout("target", loadout);

    const popup = getFake(document, "target-ewar-popup");
    popup.hidden = false;

    const firstRow = popup.children[0] as FakeElement;
    const firstGroup = firstRow.children[2] as FakeElement;
    firstGroup.children[1].trigger("click");
    expect(activeScriptButton(firstGroup)?.getAttribute("data-value")).toBe("optimalRange");

    const secondRow = popup.children[1] as FakeElement;
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

    const restoredFirst = popup.children[0] as FakeElement;
    expect(activeScriptButton(restoredFirst.children[2])?.getAttribute("data-value")).toBe("optimalRange");
    const restoredSecond = popup.children[1] as FakeElement;
    expect(activeScriptButton(restoredSecond.children[2])?.getAttribute("data-value")).toBe("trackingSpeed");
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

    (popup.children[1] as FakeElement).children[0].trigger("click");
    (popup.children[3] as FakeElement).children[0].trigger("click");
    const firstGroup = (popup.children[2] as FakeElement).children[2] as FakeElement;
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
});
