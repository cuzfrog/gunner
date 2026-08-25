import { PopupGroupImpl, type Popup, type PopupGroup } from "./popupGroup";

class StubPopup implements Popup {
  openCalled = false;
  closeCalled = false;
  focusCalled = false;
  openResult = false;
  containsResults: WeakMap<EventTarget, boolean> = new WeakMap();

  isOpen(): boolean {
    return this.openResult;
  }

  open(): void {
    this.openCalled = true;
    this.openResult = true;
  }

  close(): void {
    this.closeCalled = true;
    this.openResult = false;
  }

  focusTrigger(): void {
    this.focusCalled = true;
  }

  contains(domTarget: EventTarget): boolean {
    return this.containsResults.get(domTarget) ?? false;
  }

  setContains(domTarget: EventTarget, result: boolean): void {
    this.containsResults.set(domTarget, result);
  }
}

function makePopups(count: number): StubPopup[] {
  return Array.from({ length: count }, () => new StubPopup());
}

describe("PopupGroup", () => {
  test("open closes other open popups before opening the requested one", () => {
    const [a, b, c] = makePopups(3);
    a.openResult = true;
    b.openResult = true;

    const group = new PopupGroupImpl();
    group.register(a);
    group.register(b);
    group.register(c);
    group.open(c);

    expect(a.closeCalled).toBe(true);
    expect(b.closeCalled).toBe(true);
    expect(c.openCalled).toBe(true);
    expect(c.isOpen()).toBe(true);
  });

  test("open keeps the requested popup open and only closes others", () => {
    const [a, b] = makePopups(2);
    a.openResult = true;

    const group = new PopupGroupImpl();
    group.register(a);
    group.register(b);
    group.open(a);

    expect(a.openCalled).toBe(false);
    expect(a.closeCalled).toBe(false);
    expect(b.closeCalled).toBe(false);
    expect(a.isOpen()).toBe(true);
  });

  test("toggle closes an open popup", () => {
    const [a] = makePopups(1);
    a.openResult = true;

    const group = new PopupGroupImpl();
    group.register(a);
    group.toggle(a);

    expect(a.closeCalled).toBe(true);
    expect(a.isOpen()).toBe(false);
  });

  test("close closes an open popup", () => {
    const [a] = makePopups(1);
    a.openResult = true;

    const group = new PopupGroupImpl();
    group.register(a);
    group.close(a);

    expect(a.closeCalled).toBe(true);
    expect(a.isOpen()).toBe(false);
  });

  test("close is no-op on an already closed popup", () => {
    const [a] = makePopups(1);

    const group = new PopupGroupImpl();
    group.register(a);
    group.close(a);

    expect(a.closeCalled).toBe(false);
  });

  test("toggle opens a closed popup and closes other open popups", () => {
    const [a, b] = makePopups(2);
    b.openResult = true;

    const group = new PopupGroupImpl();
    group.register(a);
    group.register(b);
    group.toggle(a);

    expect(b.closeCalled).toBe(true);
    expect(a.openCalled).toBe(true);
    expect(a.isOpen()).toBe(true);
  });

  test("closeAll closes every open popup", () => {
    const [a, b, c] = makePopups(3);
    a.openResult = true;
    c.openResult = true;

    const group = new PopupGroupImpl();
    group.register(a);
    group.register(b);
    group.register(c);
    group.closeAll();

    expect(a.closeCalled).toBe(true);
    expect(b.closeCalled).toBe(false);
    expect(c.closeCalled).toBe(true);
  });

  test("hasOpen is true only when at least one popup is open", () => {
    const [a, b] = makePopups(2);
    const group = new PopupGroupImpl();
    group.register(a);
    group.register(b);
    expect(group.hasOpen()).toBe(false);
    a.openResult = true;
    expect(group.hasOpen()).toBe(true);
    a.openResult = false;
    expect(group.hasOpen()).toBe(false);
  });
});

describe("PopupGroup input handling", () => {
  test("onPointerDown does nothing when no popup is open", () => {
    const [a] = makePopups(1);
    const group = new PopupGroupImpl();
    group.register(a);
    group.onPointerDown(new EventTarget());
    expect(a.closeCalled).toBe(false);
  });

  test("onPointerDown closes open popups whose contains returns false", () => {
    const [a, b] = makePopups(2);
    a.openResult = true;
    b.openResult = true;
    const domTarget = new EventTarget();
    a.setContains(domTarget, true);
    b.setContains(domTarget, false);
    const group = new PopupGroupImpl();
    group.register(a);
    group.register(b);
    group.onPointerDown(domTarget);
    expect(a.closeCalled).toBe(false);
    expect(b.closeCalled).toBe(true);
  });

  test("onPointerDown ignores a null shipB", () => {
    const [a] = makePopups(1);
    a.openResult = true;
    const group = new PopupGroupImpl();
    group.register(a);
    group.onPointerDown(null);
    expect(a.closeCalled).toBe(false);
  });

  test("onKeyDown does nothing for non-Escape keys", () => {
    const [a] = makePopups(1);
    a.openResult = true;
    const group = new PopupGroupImpl();
    group.register(a);
    group.onKeyDown({ key: "Enter" });
    expect(a.closeCalled).toBe(false);
    expect(a.focusCalled).toBe(false);
  });

  test("onKeyDown closes all open popups and focuses their triggers on Escape", () => {
    const [a, b] = makePopups(2);
    a.openResult = true;
    b.openResult = true;
    const group = new PopupGroupImpl();
    group.register(a);
    group.register(b);
    group.onKeyDown({ key: "Escape" });
    expect(a.closeCalled).toBe(true);
    expect(a.focusCalled).toBe(true);
    expect(b.closeCalled).toBe(true);
    expect(b.focusCalled).toBe(true);
  });
});
