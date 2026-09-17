import { fakeDocument, getFake } from "../../testing";
import type { FakeElement } from "../../testing";
import type { TimeoutId, Timer } from "../../timer";
import type { EngineView } from "../../../sim";
import type { ViewStream } from "../../viewStream";
import type { HintContentProvider } from "./hintContentProvider";
import { HoverHintControllerImpl } from "./hoverHintController";

function makeViewStream(): ViewStream {
  const listeners = new Set<(view: EngineView) => void>();
  return {
    connect: vi.fn(),
    onViewUpdated: (l: (view: EngineView) => void) => listeners.add(l),
    offViewUpdated: (l: (view: EngineView) => void) => listeners.delete(l),
    currentView: vi.fn(() => undefined),
  } as unknown as ViewStream;
}

class ControllableTimer implements Timer {
  private nextId = 1;
  private callbacks = new Map<TimeoutId, () => void>();
  setTimeout = vi.fn((cb: () => void): TimeoutId => { const id = this.nextId++; this.callbacks.set(id, cb); return id; });
  clearTimeout = vi.fn((id: TimeoutId) => { this.callbacks.delete(id); });
  setInterval = vi.fn((): TimeoutId => 0);
  clearInterval = vi.fn();
  fire(): void {
    let lastId: TimeoutId | undefined;
    for (const id of this.callbacks.keys()) lastId = id;
    if (lastId === undefined) return;
    const cb = this.callbacks.get(lastId);
    this.callbacks.delete(lastId);
    cb?.();
  }
  hasPending(): boolean { return this.callbacks.size > 0; }
}

function dispatch(document: Document, type: string, target: unknown, relatedTarget: unknown = null): void {
  document.dispatchEvent({ type, target, relatedTarget } as unknown as Event);
}

function setViewportWidth(document: Document, width: number): void {
  (document.documentElement as unknown as { clientWidth: number }).clientWidth = width;
}

function stubAnchorRect(anchor: HTMLElement, rect: { left: number; width: number; bottom: number }): void {
  (anchor as unknown as FakeElement).getBoundingClientRect = () => ({
    left: rect.left,
    top: rect.bottom - 40,
    right: rect.left + rect.width,
    bottom: rect.bottom,
    width: rect.width,
    height: 40,
    x: rect.left,
    y: rect.bottom - 40,
  });
}

function renderingProvider(): HintContentProvider {
  return {
    render: vi.fn((_anchor: HTMLElement, container: HTMLElement) => {
      container.appendChild(globalThis.document.createElement("span"));
    }),
  };
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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    dispatch(document, "pointerout", anchor, null);

    expect(timer.hasPending()).toBe(true);
    expect(hintEl.hidden).toBe(true);
    timer.fire();
    expect(timer.hasPending()).toBe(false);
    expect(anchor.getAttribute("aria-describedby")).toBe(null);
  });

  test("deferred hide from null relatedTarget is cancelled by pointerover on same anchor", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    dispatch(document, "pointerout", anchor, null);
    dispatch(document, "pointerover", anchor);

    expect(timer.hasPending()).toBe(true);
    timer.fire();
    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("effect text");
  });

  test("marks tall hints scrollable and clears the class when hidden", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    hintEl.scrollHeight = 5000;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(hintEl.classList.toggle).toHaveBeenCalledWith("hover-hint-scrollable", true);
    dispatch(document, "pointerout", anchor, { tagName: "BODY" });
    expect(hintEl.hidden).toBe(true);
    expect(hintEl.classList.remove).toHaveBeenCalledWith("hover-hint-scrollable");
  });

  test("marks the anchor bridged while a scrollable hint is open and clears it on hide", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    hintEl.scrollHeight = 5000;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    timer.fire();
    expect(anchor.classList.toggle).toHaveBeenCalledWith("hover-hint-anchor-bridged", true);

    dispatch(document, "pointerout", anchor, { tagName: "BODY" });
    timer.fire();
    expect(anchor.classList.remove).toHaveBeenCalledWith("hover-hint-anchor-bridged");
  });

  test("keeps short hints unbridged", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(anchor.classList.toggle).toHaveBeenCalledWith("hover-hint-anchor-bridged", false);
  });

  test("keeps short hints non-scrollable", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(hintEl.classList.toggle).toHaveBeenCalledWith("hover-hint-scrollable", false);
  });

  test("keeps the hint open while the pointer is over it and hides when it leaves", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "shipProfile");
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("shipProfile", provider);

    dispatch(document, "pointerover", anchor);
    timer.fire();
    expect(hintEl.hidden).toBe(false);
    const insideHint = hintEl.children[0];

    dispatch(document, "pointerover", insideHint);
    expect(hintEl.hidden).toBe(false);

    dispatch(document, "pointerout", insideHint, { tagName: "BODY" });
    expect(hintEl.hidden).toBe(true);
  });

  test("keeps the hint open when the pointer moves from the anchor onto the hint", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "shipProfile");
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("shipProfile", provider);

    dispatch(document, "pointerover", anchor);
    timer.fire();
    const insideHint = hintEl.children[0];

    dispatch(document, "pointerout", anchor, insideHint);
    expect(hintEl.hidden).toBe(false);
  });

  // Events on pseudo elements (the CSS gap bridges) and on the hint padding target the hint
  // element itself; the controller must treat the host as part of the hint.
  test("keeps the hint open when the pointer crosses onto the hint element itself", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "shipProfile");
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("shipProfile", provider);

    dispatch(document, "pointerover", anchor);
    timer.fire();

    dispatch(document, "pointerout", anchor, hintEl as unknown as HTMLElement);
    expect(hintEl.hidden).toBe(false);
    dispatch(document, "pointerover", hintEl as unknown as HTMLElement);
    expect(hintEl.hidden).toBe(false);
  });

  test("does not re-render when the pointer returns from the hint to the current anchor", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "shipProfile");
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("shipProfile", provider);

    dispatch(document, "pointerover", anchor);
    timer.fire();
    dispatch(document, "pointerout", anchor, hintEl as unknown as HTMLElement);
    dispatch(document, "pointerover", hintEl as unknown as HTMLElement);
    dispatch(document, "pointerout", hintEl as unknown as HTMLElement, anchor);
    dispatch(document, "pointerover", anchor);

    expect(timer.hasPending()).toBe(false);
    timer.fire();
    expect(provider.render).toHaveBeenCalledTimes(1);
    expect(hintEl.hidden).toBe(false);
  });

  test("scheduleShow does not reset timer when same anchor is hovered again", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    const initialCallCount = timer.setTimeout.mock.calls.length;
    dispatch(document, "pointerover", anchor);
    dispatch(document, "pointerover", anchor);

    expect(timer.setTimeout.mock.calls.length).toBe(initialCallCount);
    expect(timer.hasPending()).toBe(true);
  });

  test("does not hide when pointer moves within the same anchor", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    const child = document.createElement("svg");
    anchor.appendChild(child);
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(hintEl.hidden).toBe(false);
    expect(provider.render).toHaveBeenCalledWith(anchor, hintEl);
    expect(anchor.getAttribute("aria-describedby")).toBe("hover-hint");
  });

  test("keeps hint hidden when provider renders no content", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    anchor.setAttribute("data-value", "42");
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(hintEl.hidden).toBe(true);
    expect(anchor.getAttribute("aria-describedby")).toBe(null);
  });

  test("delegates content rendering to registered provider on focus", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);

    expect(timer.hasPending()).toBe(false);
    expect(hintEl.hidden).toBe(false);
    expect(provider.render).toHaveBeenCalledWith(anchor, hintEl);
  });

  test("does not re-render on focusin when the same anchor is already showing", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);
    dispatch(document, "focusin", anchor);

    expect(provider.render).toHaveBeenCalledTimes(1);
    expect(hintEl.hidden).toBe(false);
  });

  test("does not show when content key has no registered provider", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "unknown");
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
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
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
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
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
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
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
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
    new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });

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
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "pointerover", anchor);
    timer.fire();
    dispatch(document, "pointerout", anchor, null);

    expect(hintEl.hidden).toBe(false);
    timer.fire();
    expect(hintEl.hidden).toBe(true);
    expect(anchor.getAttribute("aria-describedby")).toBe(null);
  });

  test("refresh re-renders current provider content", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    let value = "first";
    const provider: HintContentProvider = { render: (_a, container) => { container.textContent = value; } };
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);
    expect(hintEl.textContent).toBe("first");

    value = "second";
    controller.refresh();
    expect(hintEl.textContent).toBe("second");
  });

  test("refresh is a no-op when no hint is shown", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const provider: HintContentProvider = { render: vi.fn() };
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("dps", provider);

    controller.refresh();
    expect(provider.render).not.toHaveBeenCalled();
  });

  test("refresh hides hint when provider render throws", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    let shouldThrow = false;
    const provider: HintContentProvider = {
      render: (_a, container) => {
        if (shouldThrow) throw new Error("boom");
        container.textContent = "ok";
      },
    };
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("dps", provider);

    dispatch(document, "focusin", anchor);
    expect(hintEl.hidden).toBe(false);

    shouldThrow = true;
    controller.refresh();
    expect(hintEl.hidden).toBe(true);
  });

  test("restores original aria-describedby on hide via provider path", () => {
    const document = globalThis.document;
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as HTMLElement;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint-content", "dps");
    anchor.setAttribute("aria-describedby", "existing-description");
    const provider = renderingProvider();
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
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
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
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
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
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
    const controller = new HoverHintControllerImpl({ hintEl, timer, viewStream: makeViewStream() });
    controller.registerContentProvider("dps", provider);
    controller.dispose();

    dispatch(document, "focusin", anchor);

    expect(provider.render).not.toHaveBeenCalled();
    expect(hintEl.hidden).toBe(true);
  });

  test("centers the hint on the anchor when it fits the viewport", () => {
    const document = globalThis.document;
    setViewportWidth(document, 1540);
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    hintEl.offsetWidth = 300;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    stubAnchorRect(anchor, { left: 500, width: 100, bottom: 200 });
    new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(hintEl.style.left).toBe("550px");
    expect(hintEl.style.top).toBe("200px");
  });

  test("clamps the hint inside the right viewport edge", () => {
    const document = globalThis.document;
    setViewportWidth(document, 990);
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    hintEl.offsetWidth = 420;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    stubAnchorRect(anchor, { left: 900, width: 100, bottom: 200 });
    new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(hintEl.style.left).toBe("768px");
  });

  test("clamps the hint inside the left viewport edge", () => {
    const document = globalThis.document;
    setViewportWidth(document, 990);
    const timer = new ControllableTimer();
    const hintEl = getFake(document, "hover-hint") as unknown as FakeElement;
    hintEl.offsetWidth = 420;
    const anchor = document.createElement("button");
    anchor.setAttribute("data-hint", "effect text");
    stubAnchorRect(anchor, { left: 0, width: 60, bottom: 200 });
    new HoverHintControllerImpl({ hintEl: hintEl as unknown as HTMLElement, timer, viewStream: makeViewStream() });

    dispatch(document, "pointerover", anchor);
    timer.fire();

    expect(hintEl.style.left).toBe("222px");
  });
});
