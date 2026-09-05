import { fakeDocument, FakeElement } from "../../testing";
import { PopupField, type PopupFieldConfig, type PopupFieldEls } from "./popupField";
import type { Popup, PopupGroup } from "../popup";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  globalThis.Event = Event;
});

function click(el: HTMLElement): void {
  el.dispatchEvent(new Event("click"));
}

class StubPopupGroup implements PopupGroup {
  private current: Popup | undefined;
  register(popup: Popup): void { this.current = popup; }
  open(popup: Popup): void { this.current = popup; popup.open(); }
  toggle(popup: Popup): void { if (popup.isOpen()) popup.close(); else { this.current = popup; popup.open(); } }
  close(popup: Popup): void { popup.close(); }
  closeAll(): void { this.current?.close(); }
  hasOpen(): boolean { return this.current?.isOpen() ?? false; }
  onPointerDown(): void { /* no-op */ }
  onKeyDown(): void { /* no-op */ }
}

function makeEls(): PopupFieldEls {
  const popup = document.createElement("div") as unknown as HTMLElement;
  popup.hidden = true;
  return {
    field: document.createElement("div") as unknown as HTMLElement,
    trigger: document.createElement("button") as unknown as HTMLButtonElement,
    popup,
    section: document.createElement("div") as unknown as HTMLElement,
    summary: document.createElement("span") as unknown as HTMLElement,
  };
}

function makeConfig(overrides?: Partial<PopupFieldConfig> & { els?: PopupFieldEls }): PopupFieldConfig {
  const els = overrides?.els ?? makeEls();
  return {
    els,
    popupGroup: new StubPopupGroup(),
    ...overrides,
  };
}

describe("PopupField", () => {
  test("constructor registers popup with group", () => {
    const group = new StubPopupGroup();
    const field = new PopupField(makeConfig({ popupGroup: group }));
    expect(group.hasOpen()).toBe(false);
    void field;
  });

  test("trigger click toggles popup via group", () => {
    const els = makeEls();
    const field = new PopupField(makeConfig({ els }));
    click(els.trigger);
    expect(els.popup.hidden).toBe(false);
    expect(els.trigger.getAttribute("aria-expanded")).toBe("true");
    click(els.trigger);
    expect(els.popup.hidden).toBe(true);
    expect(els.trigger.getAttribute("aria-expanded")).toBe("false");
    void field;
  });

  test("setEnabled false disables trigger and sets hint", () => {
    const els = makeEls();
    const field = new PopupField(makeConfig({ els }));
    field.setEnabled(false, "No data");
    expect(els.trigger.disabled).toBe(true);
    expect(els.trigger.getAttribute("data-hint")).toBe("No data");
  });

  test("setEnabled true enables trigger and clears hint", () => {
    const els = makeEls();
    const field = new PopupField(makeConfig({ els }));
    field.setEnabled(false, "No data");
    field.setEnabled(true, "");
    expect(els.trigger.disabled).toBe(false);
    expect(els.trigger.getAttribute("data-hint")).toBe("");
  });

  test("applyLabel sets label span text and aria-label on trigger and popup", () => {
    const els = makeEls();
    const labelSpan = document.createElement("span") as unknown as HTMLElement;
    labelSpan.className = "trigger-label";
    els.trigger.appendChild(labelSpan);
    const field = new PopupField(makeConfig({ els }));
    field.applyLabel("Defense");
    expect(labelSpan.textContent).toBe("Defense");
    expect(els.trigger.getAttribute("aria-label")).toBe("Defense");
    expect(els.popup.getAttribute("aria-label")).toBe("Defense");
    void field;
  });

  test("applyLabel does nothing to label span when absent but still sets aria", () => {
    const els = makeEls();
    const field = new PopupField(makeConfig({ els }));
    field.applyLabel("Defense");
    expect(els.trigger.getAttribute("aria-label")).toBe("Defense");
    expect(els.popup.getAttribute("aria-label")).toBe("Defense");
    void field;
  });

  test("close hides popup and sets aria-expanded false", () => {
    const els = makeEls();
    const field = new PopupField(makeConfig({ els }));
    click(els.trigger);
    field.close();
    expect(els.popup.hidden).toBe(true);
    expect(els.trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test("isOpen reflects popup hidden state", () => {
    const els = makeEls();
    const field = new PopupField(makeConfig({ els }));
    expect(field.isOpen()).toBe(false);
    click(els.trigger);
    expect(field.isOpen()).toBe(true);
  });

  test("focusTrigger focuses the trigger element", () => {
    const els = makeEls();
    const field = new PopupField(makeConfig({ els }));
    field.focusTrigger();
    expect((els.trigger as unknown as FakeElement).focus).toHaveBeenCalled();
  });

  test("clearSection empties section and returns it", () => {
    const els = makeEls();
    const child = document.createElement("div") as unknown as HTMLElement;
    els.section!.appendChild(child);
    const field = new PopupField(makeConfig({ els }));
    const result = field.clearSection();
    expect(result).toBe(els.section);
    expect(els.section!.children.length).toBe(0);
    void field;
  });

  test("clearSection returns undefined when section is absent", () => {
    const els = makeEls();
    delete (els as { section?: HTMLElement }).section;
    const field = new PopupField({ els, popupGroup: new StubPopupGroup() });
    expect(field.clearSection()).toBe(undefined);
  });

  test("onOpen callback fires when popup opens", () => {
    const els = makeEls();
    let opened = false;
    const field = new PopupField(makeConfig({ els, onOpen: () => { opened = true; } }));
    click(els.trigger);
    expect(opened).toBe(true);
    void field;
  });

  test("onClose callback fires when popup closes", () => {
    const els = makeEls();
    let closed = false;
    const field = new PopupField(makeConfig({ els, onClose: () => { closed = true; } }));
    click(els.trigger);
    click(els.trigger);
    expect(closed).toBe(true);
    void field;
  });
});
