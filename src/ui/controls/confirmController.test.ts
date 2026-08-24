import { fakeDocument, getFake, FakeElement } from "../testing";
import type { I18n, Language } from "../i18n";
import type { Popup, PopupGroup } from "./popup";
import { ConfirmControllerImpl, type ConfirmController, type ConfirmEls } from "./confirmController";

class StubPopupGroup implements PopupGroup {
  private readonly popups: Popup[] = [];
  register = vi.fn((popup: Popup) => { this.popups.push(popup); });
  open = vi.fn((popup: Popup) => {
    for (const p of this.popups) if (p !== popup && p.isOpen()) p.close();
    if (!popup.isOpen()) popup.open();
  });
  toggle = vi.fn();
  close = vi.fn();
  closeAll = vi.fn();
  hasOpen = vi.fn(() => this.popups.some((p) => p.isOpen()));
  onPointerDown = vi.fn((target: EventTarget | null) => {
    if (!target) return;
    for (const p of this.popups) if (p.isOpen() && !p.contains(target)) p.close();
  });
  onKeyDown = vi.fn((event: { readonly key: string }) => {
    if (event.key !== "Escape") return;
    for (const p of this.popups) if (p.isOpen()) { p.close(); p.focusTrigger(); }
  });
}

function build(document: Document): { controller: ConfirmController & { popup: { contains: (target: EventTarget) => boolean } }; els: ConfirmEls; popupGroup: StubPopupGroup } {
  const popupGroup = new StubPopupGroup();
  const i18n: I18n = {
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  };
  const els: ConfirmEls = {
    confirmPopup: getFake(document, "confirm-popup") as unknown as HTMLElement,
    confirmMessage: getFake(document, "confirm-message") as unknown as HTMLElement,
    confirmOk: getFake(document, "confirm-ok") as unknown as HTMLButtonElement,
    confirmCancel: getFake(document, "confirm-cancel") as unknown as HTMLButtonElement,
  };
  const controller = new ConfirmControllerImpl({ popupGroup, i18n, els });
  return { controller: controller as ConfirmController & { popup: { contains: (target: EventTarget) => boolean } }, els, popupGroup };
}

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
});

afterEach(() => {
  globalThis.document = undefined as unknown as Document;
  globalThis.Element = undefined as unknown as typeof Element;
});

describe("ConfirmController", () => {
  test("confirm resolves true on OK and closes the popup", async () => {
    const { controller, els } = build(globalThis.document);
    const promise = controller.confirm("confirm.deleteProfile");
    expect(els.confirmPopup.hidden).toBe(false);
    expect(els.confirmMessage.textContent).toBe("confirm.deleteProfile");
    (els.confirmOk as unknown as FakeElement).trigger("click");
    await expect(promise).resolves.toBe(true);
    expect(els.confirmPopup.hidden).toBe(true);
  });

  test("confirm resolves false on Cancel and closes the popup", async () => {
    const { controller, els } = build(globalThis.document);
    const promise = controller.confirm("confirm.deleteProfile");
    (els.confirmCancel as unknown as FakeElement).trigger("click");
    await expect(promise).resolves.toBe(false);
    expect(els.confirmPopup.hidden).toBe(true);
  });

  test("confirm resolves false on outside click", async () => {
    const { controller, popupGroup } = build(globalThis.document);
    const promise = controller.confirm("confirm.deleteProfile");
    const outside = getFake(globalThis.document, "profile-name");
    popupGroup.onPointerDown(outside as unknown as EventTarget);
    await expect(promise).resolves.toBe(false);
  });

  test("confirm resolves false on Escape", async () => {
    const { controller, popupGroup } = build(globalThis.document);
    const promise = controller.confirm("confirm.deleteProfile");
    popupGroup.onKeyDown({ key: "Escape" });
    await expect(promise).resolves.toBe(false);
  });

  test("popup contains the OK, Cancel and popup elements", () => {
    const { controller, els } = build(globalThis.document);
    const ok = els.confirmOk as unknown as EventTarget;
    const cancel = els.confirmCancel as unknown as EventTarget;
    const popup = els.confirmPopup as unknown as EventTarget;
    expect(controller.popup.contains(ok)).toBe(true);
    expect(controller.popup.contains(cancel)).toBe(true);
    expect(controller.popup.contains(popup)).toBe(true);
  });

  test("popup does not contain an outside target", () => {
    const { controller } = build(globalThis.document);
    const outside = getFake(globalThis.document, "profile-name") as unknown as EventTarget;
    expect(controller.popup.contains(outside)).toBe(false);
  });

  test("subsequent confirm calls while open return the same promise", async () => {
    const { controller, els } = build(globalThis.document);
    const first = controller.confirm("confirm.deleteProfile");
    const second = controller.confirm("confirm.overwriteProfile");
    expect(second).toBe(first);
    expect(els.confirmMessage.textContent).toBe("confirm.overwriteProfile");
    (els.confirmOk as unknown as FakeElement).trigger("click");
    await expect(first).resolves.toBe(true);
  });
});
