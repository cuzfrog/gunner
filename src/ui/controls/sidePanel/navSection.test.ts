import { fakeDocument, getFake, FakeElement } from "../testSupport";
import { NavSection, type NavSectionEls } from "./navSection";
import type { SidePanel } from "./sidePanelContract";

function mockPanel() {
  const host = { onConfigChange: vi.fn(), onDisplayChange: vi.fn() };
  return { host } as unknown as SidePanel;
}

function navElsFor(document: Document, side: "shipA" | "shipB"): NavSectionEls {
  const prefix = side === "shipA" ? "ship-a" : "ship-b";
  return {
    mode: getFake(document, `${prefix}-mode`) as unknown as HTMLSelectElement,
    range: getFake(document, `${prefix}-range`) as unknown as HTMLInputElement,
    aggressivity: getFake(document, `${prefix}-aggressivity`) as unknown as HTMLInputElement,
    aggressivitySlider: getFake(document, `${prefix}-aggressivity-slider`) as unknown as HTMLInputElement,
    aggressivityValue: getFake(document, `${prefix}-aggressivity-value`) as unknown as HTMLElement,
  };
}

describe("NavSection", () => {
  test("constructor disables the aggressivity slider when the initial mode is not maneuver", () => {
    const document = fakeDocument();
    const panel = mockPanel();
    const els = navElsFor(document, "shipA");
    getFake(document, "ship-a-mode").value = "orbit";
    const section = new NavSection({ panel, els });
    expect(els.aggressivitySlider.disabled).toBe(true);
    expect(section.capture().mode).toBe("orbit");
  });

  test("constructor enables the aggressivity slider when the initial mode is maneuver", () => {
    const document = fakeDocument();
    const panel = mockPanel();
    const els = navElsFor(document, "shipA");
    getFake(document, "ship-a-mode").value = "maneuver";
    const section = new NavSection({ panel, els });
    expect(els.aggressivitySlider.disabled).toBe(false);
  });

  test("changing the mode to maneuver enables the slider and notifies the host", () => {
    const document = fakeDocument();
    const panel = mockPanel();
    const els = navElsFor(document, "shipA");
    getFake(document, "ship-a-mode").value = "orbit";
    const section = new NavSection({ panel, els });
    getFake(document, "ship-a-mode").value = "maneuver";
    (els.mode as unknown as FakeElement).trigger("input");
    expect(els.aggressivitySlider.disabled).toBe(false);
    expect(panel.host.onConfigChange).toHaveBeenCalled();
  });

  test("changing the mode away from maneuver disables the slider", () => {
    const document = fakeDocument();
    const panel = mockPanel();
    const els = navElsFor(document, "shipA");
    getFake(document, "ship-a-mode").value = "maneuver";
    const section = new NavSection({ panel, els });
    getFake(document, "ship-a-mode").value = "keepAtRange";
    (els.mode as unknown as FakeElement).trigger("input");
    expect(els.aggressivitySlider.disabled).toBe(true);
  });

  test("setEnabled reflects the global enabled state and current mode", () => {
    const document = fakeDocument();
    const panel = mockPanel();
    const els = navElsFor(document, "shipA");
    getFake(document, "ship-a-mode").value = "maneuver";
    const section = new NavSection({ panel, els });
    section.setEnabled(false);
    expect(els.mode.disabled).toBe(true);
    expect(els.range.disabled).toBe(true);
    expect(els.aggressivitySlider.disabled).toBe(true);
    section.setEnabled(true);
    expect(els.mode.disabled).toBe(false);
    expect(els.range.disabled).toBe(false);
    expect(els.aggressivitySlider.disabled).toBe(false);
  });

  test("restore sets mode, range and aggressivity and updates slider disabled state", () => {
    const document = fakeDocument();
    const panel = mockPanel();
    const els = navElsFor(document, "shipA");
    const section = new NavSection({ panel, els });
    section.restore({ mode: "maneuver", range: 7500, aggressivity: 2.5 });
    expect(els.mode.value).toBe("maneuver");
    expect(els.range.value).toBe("7500");
    expect(els.aggressivity.value).toBe("2.5");
    expect(els.aggressivitySlider.disabled).toBe(false);
  });

  test("capture returns the current navigation state", () => {
    const document = fakeDocument();
    const panel = mockPanel();
    const els = navElsFor(document, "shipA");
    getFake(document, "ship-a-mode").value = "keepAtRange";
    getFake(document, "ship-a-range").value = "3000";
    getFake(document, "ship-a-aggressivity").value = "0.5";
    const section = new NavSection({ panel, els });
    const state = section.capture();
    expect(state.mode).toBe("keepAtRange");
    expect(state.range).toBe(3000);
    expect(state.aggressivity).toBe(0.5);
  });

  test("shipA and shipB mode changes are independent", () => {
    const document = fakeDocument();
    const panelA = mockPanel();
    const panelB = mockPanel();
    const elsA = navElsFor(document, "shipA");
    const elsB = navElsFor(document, "shipB");
    getFake(document, "ship-a-mode").value = "maneuver";
    getFake(document, "ship-b-mode").value = "orbit";
    new NavSection({ panel: panelA, els: elsA });
    new NavSection({ panel: panelB, els: elsB });
    expect(elsA.aggressivitySlider.disabled).toBe(false);
    expect(elsB.aggressivitySlider.disabled).toBe(true);

    getFake(document, "ship-b-mode").value = "maneuver";
    (elsB.mode as unknown as FakeElement).trigger("input");
    expect(elsA.aggressivitySlider.disabled).toBe(false);
    expect(elsB.aggressivitySlider.disabled).toBe(false);

    getFake(document, "ship-a-mode").value = "orbit";
    (elsA.mode as unknown as FakeElement).trigger("input");
    expect(elsA.aggressivitySlider.disabled).toBe(true);
    expect(elsB.aggressivitySlider.disabled).toBe(false);
  });
});