import { fakeDocument, FakeElement, getFake } from "../../testing";
import { UiEventsImpl } from "../../events";
import { createControlsEls } from "../elements";
import { ModulesPopupImpl } from "./modulesPopupController";
import type { ModulesPopupEls } from "./modulesPopupControllerContract";
import type { I18n } from "../../i18n";
import type { PopupGroup, Popup } from "../popup";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
});

function fakeI18n(): I18n {
  return vi.mocked<I18n>({
    current: vi.fn(() => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
}

class StubPopupGroup implements PopupGroup {
  private popups: Popup[] = [];
  register(popup: Popup): void { this.popups.push(popup); }
  open(popup: Popup): void { for (const p of this.popups) if (p !== popup && p.isOpen()) p.close(); if (!popup.isOpen()) popup.open(); }
  toggle(popup: Popup): void { if (popup.isOpen()) popup.close(); else popup.open(); }
  close(popup: Popup): void { popup.close(); }
  closeAll(): void { for (const p of this.popups) p.close(); }
  hasOpen(): boolean { return this.popups.some((p) => p.isOpen()); }
  onPointerDown(): void { /* no-op */ }
  onKeyDown(): void { /* no-op */ }
}

function buildModulesPopup() {
  const document = fakeDocument() as unknown as Document;
  globalThis.document = document;
  const els = createControlsEls();
  const popupGroup = new StubPopupGroup();
  const i18n = fakeI18n();
  const events = new UiEventsImpl();
  const modulesPopupEls: ModulesPopupEls = {
    fields: {
      shipA: { field: els.shipA.ewar.field, trigger: els.shipA.ewar.trigger, popup: els.shipA.ewar.popup },
      shipB: { field: els.shipB.ewar.field, trigger: els.shipB.ewar.trigger, popup: els.shipB.ewar.popup },
    },
  };
  for (const section of [els.shipA.ewar.section, els.shipA.boosterSection, els.shipB.ewar.section, els.shipB.boosterSection]) {
    (section as unknown as FakeElement).className = "preview-section";
    (section as unknown as FakeElement).hidden = true;
  }
  (els.shipA.ewar.popup as unknown as FakeElement).appendChild(els.shipA.ewar.section as unknown as FakeElement);
  (els.shipA.ewar.popup as unknown as FakeElement).appendChild(els.shipA.boosterSection as unknown as FakeElement);
  (els.shipB.ewar.popup as unknown as FakeElement).appendChild(els.shipB.ewar.section as unknown as FakeElement);
  (els.shipB.ewar.popup as unknown as FakeElement).appendChild(els.shipB.boosterSection as unknown as FakeElement);
  (els.shipA.ewar.popup as unknown as FakeElement).hidden = true;
  (els.shipB.ewar.popup as unknown as FakeElement).hidden = true;
  const controller = new ModulesPopupImpl({ els: modulesPopupEls, popupGroup, i18n, uiEvents: events });
  return { document, controller, els, i18n, events, popupGroup };
}

function makeVisible(section: HTMLElement): void {
  const el = section as unknown as FakeElement;
  el.hidden = false;
  el.appendChild(new FakeElement());
}

describe("ModulesPopup", () => {
  test("disables trigger when all sections are hidden", () => {
    const { document } = buildModulesPopup();
    const trigger = getFake(document, "ship-a-ewar-trigger") as unknown as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute("data-hint")).toBe("title.modules.empty");
  });

  test("enables trigger when a section is visible with content", () => {
    const { document, els, controller } = buildModulesPopup();
    makeVisible(els.shipA.boosterSection);
    controller.syncEnabled();
    const trigger = getFake(document, "ship-a-ewar-trigger") as unknown as HTMLButtonElement;
    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute("data-hint")).toBe("");
  });

  test("applies modules label to trigger and popup", () => {
    const { document } = buildModulesPopup();
    const trigger = getFake(document, "ship-a-ewar-trigger");
    const popup = getFake(document, "ship-a-ewar-popup");
    expect(trigger.getAttribute("aria-label")).toBe("label.modules");
    expect(popup.getAttribute("aria-label")).toBe("label.modules");
  });

  test("syncEnabled re-checks section occupancy after DOM changes", () => {
    const { document, els, controller } = buildModulesPopup();
    const trigger = getFake(document, "ship-a-ewar-trigger") as unknown as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    makeVisible(els.shipA.boosterSection);
    controller.syncEnabled();
    expect(trigger.disabled).toBe(false);
  });

  test("registerOnClose fires when popup closes", () => {
    const { document, els, controller } = buildModulesPopup();
    makeVisible(els.shipA.boosterSection);
    controller.syncEnabled();
    let closed = false;
    controller.registerOnClose("shipA", () => { closed = true; });
    const trigger = getFake(document, "ship-a-ewar-trigger");
    trigger.dispatchEvent(new Event("click"));
    trigger.dispatchEvent(new Event("click"));
    expect(closed).toBe(true);
  });

  test("trigger click toggles popup visibility", () => {
    const { document, els, controller } = buildModulesPopup();
    makeVisible(els.shipA.boosterSection);
    controller.syncEnabled();
    const trigger = getFake(document, "ship-a-ewar-trigger");
    const popup = getFake(document, "ship-a-ewar-popup");
    expect(popup.hidden).toBe(true);
    trigger.dispatchEvent(new Event("click"));
    expect(popup.hidden).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.dispatchEvent(new Event("click"));
    expect(popup.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test("keeps trigger enabled when one section goes empty but another remains visible", () => {
    const { document, els, controller } = buildModulesPopup();
    makeVisible(els.shipA.ewar.section);
    makeVisible(els.shipA.boosterSection);
    controller.syncEnabled();
    const trigger = getFake(document, "ship-a-ewar-trigger") as unknown as HTMLButtonElement;
    expect(trigger.disabled).toBe(false);
    const ewarSection = els.shipA.ewar.section as unknown as FakeElement;
    ewarSection.hidden = true;
    ewarSection.innerHTML = "";
    controller.syncEnabled();
    expect(trigger.disabled).toBe(false);
  });
});
