import { fakeDocument, FakeElement } from "../../testing";
import { createPopup } from "./createPopup";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

describe("createPopup", () => {
  test("open sets hidden=false and aria-expanded=true", () => {
    const popupEl = document.createElement("div") as unknown as HTMLElement;
    const triggerEl = document.createElement("button") as unknown as HTMLButtonElement;
    const fieldEl = document.createElement("div") as unknown as HTMLElement;
    const popup = createPopup({
      popupEl, triggerEl, fieldEl,
      isOpen: () => false,
    });
    popup.open();
    expect(popupEl.hidden).toBe(false);
    expect(triggerEl.getAttribute("aria-expanded")).toBe("true");
  });

  test("close sets hidden=true and aria-expanded=false", () => {
    const popupEl = document.createElement("div") as unknown as HTMLElement;
    const triggerEl = document.createElement("button") as unknown as HTMLButtonElement;
    const fieldEl = document.createElement("div") as unknown as HTMLElement;
    const popup = createPopup({
      popupEl, triggerEl, fieldEl,
      isOpen: () => false,
    });
    popup.open();
    popup.close();
    expect(popupEl.hidden).toBe(true);
    expect(triggerEl.getAttribute("aria-expanded")).toBe("false");
  });

  test("isOpen delegates to config", () => {
    const popupEl = document.createElement("div") as unknown as HTMLElement;
    const triggerEl = document.createElement("button") as unknown as HTMLButtonElement;
    const fieldEl = document.createElement("div") as unknown as HTMLElement;
    let open = false;
    const popup = createPopup({
      popupEl, triggerEl, fieldEl,
      isOpen: () => open,
    });
    expect(popup.isOpen()).toBe(false);
    open = true;
    expect(popup.isOpen()).toBe(true);
  });

  test("focusTrigger focuses the trigger element", () => {
    const popupEl = document.createElement("div") as unknown as HTMLElement;
    const triggerEl = document.createElement("button") as unknown as HTMLButtonElement;
    const fieldEl = document.createElement("div") as unknown as HTMLElement;
    const popup = createPopup({
      popupEl, triggerEl, fieldEl,
      isOpen: () => false,
    });
    popup.focusTrigger();
    expect((triggerEl as unknown as FakeElement).focus).toHaveBeenCalled();
  });

  test("contains returns true for child of fieldEl", () => {
    const popupEl = document.createElement("div") as unknown as HTMLElement;
    const triggerEl = document.createElement("button") as unknown as HTMLButtonElement;
    const fieldEl = document.createElement("div") as unknown as HTMLElement;
    const child = document.createElement("span") as unknown as HTMLElement;
    fieldEl.appendChild(child);
    const popup = createPopup({
      popupEl, triggerEl, fieldEl,
      isOpen: () => false,
    });
    expect(popup.contains(child)).toBe(true);
  });

  test("contains returns false for non-child", () => {
    const popupEl = document.createElement("div") as unknown as HTMLElement;
    const triggerEl = document.createElement("button") as unknown as HTMLButtonElement;
    const fieldEl = document.createElement("div") as unknown as HTMLElement;
    const outside = document.createElement("span") as unknown as HTMLElement;
    const popup = createPopup({
      popupEl, triggerEl, fieldEl,
      isOpen: () => false,
    });
    expect(popup.contains(outside)).toBe(false);
  });

  test("calls onOpen and onClose callbacks", () => {
    const popupEl = document.createElement("div") as unknown as HTMLElement;
    const triggerEl = document.createElement("button") as unknown as HTMLButtonElement;
    const fieldEl = document.createElement("div") as unknown as HTMLElement;
    let opened = false;
    let closed = false;
    const popup = createPopup({
      popupEl, triggerEl, fieldEl,
      isOpen: () => false,
      onOpen: () => { opened = true; },
      onClose: () => { closed = true; },
    });
    popup.open();
    expect(opened).toBe(true);
    popup.close();
    expect(closed).toBe(true);
  });
});
