import { fakeDocument, getFake } from "../../testing";
import type { TimeoutId, Timer } from "../../timer";
import type { HintContentProvider } from "./hintContentProvider";
import { HoverHintControllerImpl } from "./hoverHintController";

class ControllableTimer implements Timer {
  private callback?: () => void;
  setTimeout = vi.fn((cb: () => void): TimeoutId => { this.callback = cb; return 1; });
  clearTimeout = vi.fn(() => { this.callback = undefined; });
  setInterval = vi.fn((): TimeoutId => 0);
  clearInterval = vi.fn();
  fire(): void { this.callback?.(); }
  hasPending(): boolean { return this.callback !== undefined; }
}

function dispatch(document: Document, type: string, target: unknown, relatedTarget: unknown = null): void {
  document.dispatchEvent({ type, target, relatedTarget } as unknown as Event);
}

describe("HoverHintControllerImpl", () => {
  let originalDocument: Document | undefined;
  let originalElement: typeof Element | undefined;

  beforeEach(() => {
    originalDocument = globalThis.document;
    originalElement = globalThis.Element;
    globalThis.document = fakeDocument();
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      globalThis.document = originalDocument;
    }
    if (originalElement === undefined) {
      delete (globalThis as Record<string, unknown>).Element;
    } else {
      globalThis.Element = originalElement;
    }
  });

  test("shows hint after hover delay with anchor class and aria-describedby", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "pointerover", anchor);

    expect(hintEl.hidden).toBe(true);
    expect(timer.hasPending()).toBe(true);
    timer.fire();

    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("effect text");
    expect(anchor.classList.add).toHaveBeenCalledWith("hover-hint-anchor");
    expect(anchor.getAttribute("aria-describedby")).toBe("hover-hint");
  });

  test("hides on pointerout to outside and clears pending show", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "pointerover", anchor);
    dispatch(document, "pointerout", anchor, null);

    expect(timer.hasPending()).toBe(false);
    expect(hintEl.hidden).toBe(true);
    expect(anchor.getAttribute("aria-describedby")).toBe(null);
  });

  test("does not hide when pointer moves within the same anchor", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    const child = document.createElement("svg");
    anchor.appendChild(child);
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "pointerover", anchor);
    timer.fire();
    dispatch(document, "pointerout", anchor, child);

    expect(hintEl.hidden).toBe(false);
  });

  test("hides when pointer moves to a non-anchor element", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    const plain = document.createElement("button");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "pointerover", anchor);
    timer.fire();
    dispatch(document, "pointerover", plain);

    expect(hintEl.hidden).toBe(true);
    expect(anchor.getAttribute("aria-describedby")).toBe(null);
  });

  test("focus shows immediately without delay", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "focused hint");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "focusin", anchor);

    expect(timer.hasPending()).toBe(false);
    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("focused hint");
  });

  test("ignores elements without data-hint", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const plain = document.createElement("button");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "pointerover", plain);

    expect(timer.hasPending()).toBe(false);
    expect(hintEl.hidden).toBe(true);
  });

  test("ignores empty data-hint", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "pointerover", anchor);

    expect(timer.hasPending()).toBe(false);
    expect(hintEl.hidden).toBe(true);
  });

  test("resolves anchor from a child via closest", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "parent hint");
    const child = document.createElement("svg");
    anchor.appendChild(child);
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "pointerover", child);
    timer.fire();

    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("parent hint");
    expect(anchor.getAttribute("aria-describedby")).toBe("hover-hint");
  });

  test("dispose hides and cancels pending show", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    const controller = new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "pointerover", anchor);
    controller.dispose();

    expect(timer.hasPending()).toBe(false);
    expect(hintEl.hidden).toBe(true);
  });

  test("dispose stops listening to document events", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    const controller = new HoverHintControllerImpl({ hintEl, timer });

    controller.dispose();
    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(hintEl.hidden).toBe(true);
  });

  test("restores original aria-describedby on hide", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    anchor.setAttribute("aria-describedby", "existing-description");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "focusin", anchor);
    expect(anchor.getAttribute("aria-describedby")).toBe("hover-hint");

    dispatch(document, "focusout", anchor);
    expect(anchor.getAttribute("aria-describedby")).toBe("existing-description");
  });

  test("removes aria-describedby on hide when it was absent before", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "focusin", anchor);
    dispatch(document, "focusout", anchor);
    expect(anchor.getAttribute("aria-describedby")).toBe(null);
  });

  test("delegates content rendering to registered provider on hover", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(hintEl.hidden).toBe(false);
    expect(provider.render).toHaveBeenCalledWith(anchor, hintEl);
    expect(anchor.getAttribute("aria-describedby")).toBe("hover-hint");
  });

  test("delegates content rendering to registered provider on focus", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);

    expect(timer.hasPending()).toBe(false);
    expect(hintEl.hidden).toBe(false);
    expect(provider.render).toHaveBeenCalledWith(anchor, hintEl);
  });

  test("does not show when content key has no registered provider", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "unknown");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "focusin", anchor);

    expect(hintEl.hidden).toBe(true);
    expect(anchor.getAttribute("aria-describedby")).toBe(null);
  });

  test("content provider takes precedence over data-hint string", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "plain string");
    anchor.setAttribute("data-hint-content", "dps");
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);

    expect(provider.render).toHaveBeenCalledWith(anchor, hintEl);
    expect(hintEl.textContent).toBe("");
  });

  test("clears hint element content before delegating to provider", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    hintEl.textContent = "stale content";
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);

    expect(hintEl.textContent).toBe("");
  });

  test("clears hint element content on hide after provider was shown", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider: HintContentProvider = { render: (_a, container) => { container.textContent = "rendered"; } };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);
    expect(hintEl.textContent).toBe("rendered");
    dispatch(document, "focusout", anchor);
    expect(hintEl.textContent).toBe("");
  });

  test("resolves content-provider anchor from a child via closest", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const child = document.createElement("svg");
    anchor.appendChild(child);
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "pointerover", child);
    timer.fire();

    expect(hintEl.hidden).toBe(false);
    expect(provider.render).toHaveBeenCalledWith(anchor, hintEl);
  });

  test("ignores empty data-hint-content key", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "");
    new HoverHintControllerImpl({ hintEl, timer });

    dispatch(document, "pointerover", anchor);

    expect(timer.hasPending()).toBe(false);
    expect(hintEl.hidden).toBe(true);
  });

  test("hides on pointerout to outside for provider-shown hint", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "pointerover", anchor);
    timer.fire();
    dispatch(document, "pointerout", anchor, null);

    expect(hintEl.hidden).toBe(true);
    expect(anchor.getAttribute("aria-describedby")).toBe(null);
  });

  test("restores original aria-describedby on hide via provider path", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    anchor.setAttribute("aria-describedby", "existing-description");
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);
    expect(anchor.getAttribute("aria-describedby")).toBe("hover-hint");
    dispatch(document, "focusout", anchor);
    expect(anchor.getAttribute("aria-describedby")).toBe("existing-description");
  });

  test("calls provider hide hook before clearing content on hide", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider: HintContentProvider = { render: (_a, container) => { container.textContent = "rendered"; }, hide: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);
    dispatch(document, "focusout", anchor);

    expect(provider.hide).toHaveBeenCalledWith(anchor, hintEl);
    expect(hintEl.textContent).toBe("");
  });

  test("reverts anchor activation when provider render throws", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider: HintContentProvider = { render: () => { throw new Error("boom"); } };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);

    expect(() => dispatch(document, "focusin", anchor)).toThrow("boom");

    expect(hintEl.hidden).toBe(true);
    expect(anchor.getAttribute("aria-describedby")).toBe(null);
    expect(anchor.classList.remove).toHaveBeenCalledWith("hover-hint-anchor");
  });

  test("dispose clears providers map", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer });
    controller.registerContentProvider("dps", provider);
    controller.dispose();

    dispatch(document, "focusin", anchor);

    expect(provider.render).not.toHaveBeenCalled();
    expect(hintEl.hidden).toBe(true);
  });
});
