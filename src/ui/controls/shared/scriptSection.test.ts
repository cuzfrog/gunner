import { fakeDocument, FakeElement } from "../../testing";
import type { Popup, PopupGroup } from "../popup";
import { ScriptSection, type ScriptOption, type ScriptSectionConfig } from "./scriptSection";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  globalThis.HTMLElement = FakeElement as unknown as typeof HTMLElement;
  globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
});

interface TestKey {
  readonly index: number;
}

class StubPopupGroup implements PopupGroup {
  registered: Array<{ popup: Popup; parent?: Popup }> = [];
  openCalled: Popup | undefined;
  closeCalled: Popup | undefined;

  register(popup: Popup, options?: { readonly parent?: Popup }): void {
    this.registered.push({ popup, parent: options?.parent });
  }
  open(popup: Popup): void { this.openCalled = popup; popup.open(); }
  toggle(popup: Popup): void { if (popup.isOpen()) popup.close(); else popup.open(); }
  close(popup: Popup): void { this.closeCalled = popup; popup.close(); }
  closeAll(): void { /* no-op */ }
  hasOpen(): boolean { return false; }
  onPointerDown(): void { /* no-op */ }
  onKeyDown(): void { /* no-op */ }
}

function makeParentPopup(): Popup {
  return {
    isOpen: () => false,
    open: vi.fn(),
    close: vi.fn(),
    focusTrigger: vi.fn(),
    contains: vi.fn(() => false),
  };
}

function makeOptions(selectedValue?: string): (key: TestKey) => readonly ScriptOption[] {
  return () => [
    { value: "none", label: "None", selected: selectedValue === undefined },
    { value: "1001", label: "Script A", selected: selectedValue === "1001" },
    { value: "1002", label: "Script B", selected: selectedValue === "1002" },
  ];
}

function makeConfig(overrides?: Partial<ScriptSectionConfig<TestKey>>): ScriptSectionConfig<TestKey> {
  const mountEl = document.createElement("div") as unknown as HTMLElement;
  const parentPopup = makeParentPopup();
  const popupGroup = new StubPopupGroup();
  return {
    popupId: "test-script-popup",
    mountEl,
    parentPopup,
    popupGroup,
    listShape: { itemClass: "ewar-script-option", nameClass: "", role: "menuitem" },
    placement: "alongside-end",
    options: makeOptions(),
    onSelect: vi.fn(),
    gearHint: () => "hint",
    ...overrides,
  };
}

describe("ScriptSection", () => {
  test("constructor creates popup element and appends to mount", () => {
    const config = makeConfig();
    const section = new ScriptSection(config);
    const popupEl = config.mountEl.children[0] as unknown as FakeElement;
    expect(popupEl).toBeDefined();
    expect(popupEl.id).toBe("test-script-popup");
    expect(popupEl.hidden).toBe(true);
    expect(popupEl.getAttribute("role")).toBe("menu");
    void section;
  });

  test("constructor adds placement CSS class", () => {
    const config = makeConfig({ placement: "alongside-start" });
    const section = new ScriptSection(config);
    const popupEl = config.mountEl.children[0] as unknown as FakeElement;
    expect(popupEl.className).toContain("script-popup-alongside-start");
    void section;
  });

  test("constructor registers popup with group as child of parent", () => {
    const group = new StubPopupGroup();
    const config = makeConfig({ popupGroup: group });
    const section = new ScriptSection(config);
    expect(group.registered).toHaveLength(1);
    expect(group.registered[0].parent).toBe(config.parentPopup);
    void section;
  });

  test("createGear returns gear button with aria-controls and hint", () => {
    const section = new ScriptSection(makeConfig());
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    expect(gear.getAttribute("aria-controls")).toBe("test-script-popup");
    expect(gear.getAttribute("data-hint")).toBe("None");
    expect(gear.getAttribute("aria-label")).toBe("None");
    expect(gear.getAttribute("aria-haspopup")).toBe("menu");
    void section;
  });

  test("createGear sets disabled when requested", () => {
    const section = new ScriptSection(makeConfig());
    const gear = section.createGear({ index: 0 }, { hint: "None", disabled: true });
    expect(gear.disabled).toBe(true);
    void section;
  });

  test("createGear sets data-index when provided", () => {
    const section = new ScriptSection(makeConfig());
    const gear = section.createGear({ index: 3 }, { hint: "None", dataIndex: 3 });
    expect(gear.getAttribute("data-index")).toBe("3");
    void section;
  });

  test("open renders options and shows popup via group", () => {
    const group = new StubPopupGroup();
    const config = makeConfig({ popupGroup: group });
    const section = new ScriptSection(config);
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    section.open({ index: 0 }, gear);
    expect(group.openCalled).toBe(section.popup);
    const popupEl = config.mountEl.children[0] as unknown as FakeElement;
    expect(popupEl.hidden).toBe(false);
    expect(gear.getAttribute("aria-expanded")).toBe("true");
    void section;
  });

  test("open renders heading when heading provider is set", () => {
    const config = makeConfig({ heading: () => "Module Name" });
    const section = new ScriptSection(config);
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    section.open({ index: 0 }, gear);
    const popupEl = config.mountEl.children[0] as unknown as FakeElement;
    expect(popupEl.getAttribute("aria-labelledby")).toBe("test-script-popup-label");
    const label = popupEl.children[0] as unknown as FakeElement;
    expect(label.textContent).toBe("Module Name");
    void section;
  });

  test("open without heading does not set aria-labelledby", () => {
    const config = makeConfig();
    const section = new ScriptSection(config);
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    section.open({ index: 0 }, gear);
    const popupEl = config.mountEl.children[0] as unknown as FakeElement;
    expect(popupEl.getAttribute("aria-labelledby")).toBeNull();
    void section;
  });

  test("option click calls onSelect and closes popup", () => {
    const onSelect = vi.fn();
    const config = makeConfig({ onSelect });
    const section = new ScriptSection(config);
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    section.open({ index: 0 }, gear);
    const popupEl = config.mountEl.children[0] as unknown as FakeElement;
    const buttons = popupEl.children.filter((c) => (c as unknown as FakeElement).tagName === "BUTTON") as unknown as FakeElement[];
    buttons[1].trigger("click");
    expect(onSelect).toHaveBeenCalledWith({ index: 0 }, "1001");
    expect(popupEl.hidden).toBe(true);
    void section;
  });

  test("option click updates gear hint via gearHint function", () => {
    const gearHint = vi.fn(() => "Updated hint");
    const config = makeConfig({ gearHint });
    const section = new ScriptSection(config);
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    section.open({ index: 0 }, gear);
    const popupEl = config.mountEl.children[0] as unknown as FakeElement;
    const buttons = popupEl.children.filter((c) => (c as unknown as FakeElement).tagName === "BUTTON") as unknown as FakeElement[];
    buttons[2].trigger("click");
    expect(gearHint).toHaveBeenCalledWith({ index: 0 }, "1002");
    expect(gear.getAttribute("data-hint")).toBe("Updated hint");
    expect(gear.getAttribute("aria-label")).toBe("Updated hint");
    void section;
  });

  test("option click focuses gear after closing", () => {
    const section = new ScriptSection(makeConfig());
    const gear = section.createGear({ index: 0 }, { hint: "None" }) as unknown as FakeElement;
    section.open({ index: 0 }, gear as unknown as HTMLButtonElement);
    const popupEl = (section as unknown as { popupEl: FakeElement }).popupEl;
    const buttons = popupEl.children.filter((c) => (c as unknown as FakeElement).tagName === "BUTTON") as unknown as FakeElement[];
    buttons[0].trigger("click");
    expect(gear.focus).toHaveBeenCalled();
    void section;
  });

  test("close hides popup and sets aria-expanded false on gear", () => {
    const section = new ScriptSection(makeConfig());
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    section.open({ index: 0 }, gear);
    section.close();
    expect(section.isOpen()).toBe(false);
    expect(gear.getAttribute("aria-expanded")).toBe("false");
    void section;
  });

  test("isOpen reflects popup hidden state", () => {
    const section = new ScriptSection(makeConfig());
    expect(section.isOpen()).toBe(false);
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    section.open({ index: 0 }, gear);
    expect(section.isOpen()).toBe(true);
    void section;
  });

  test("focusTrigger focuses the current gear", () => {
    const section = new ScriptSection(makeConfig());
    const gear = section.createGear({ index: 0 }, { hint: "None" }) as unknown as FakeElement;
    section.open({ index: 0 }, gear as unknown as HTMLButtonElement);
    section.focusTrigger();
    expect(gear.focus).toHaveBeenCalled();
    void section;
  });

  test("popup contains returns true for popup element children", () => {
    const config = makeConfig();
    const section = new ScriptSection(config);
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    section.open({ index: 0 }, gear);
    const popupEl = config.mountEl.children[0] as unknown as FakeElement;
    const optionButton = popupEl.children[0] as unknown as EventTarget;
    expect(section.popup.contains(optionButton)).toBe(true);
    void section;
  });

  test("popup contains returns true for current gear", () => {
    const section = new ScriptSection(makeConfig());
    const gear = section.createGear({ index: 0 }, { hint: "None" });
    section.open({ index: 0 }, gear);
    expect(section.popup.contains(gear)).toBe(true);
    void section;
  });

  test("popup contains returns false for unrelated element", () => {
    const section = new ScriptSection(makeConfig());
    const unrelated = new FakeElement() as unknown as EventTarget;
    expect(section.popup.contains(unrelated)).toBe(false);
    void section;
  });

  test("gear click triggers open", () => {
    const section = new ScriptSection(makeConfig());
    const gear = section.createGear({ index: 0 }, { hint: "None" }) as unknown as FakeElement;
    gear.trigger("click");
    expect(section.isOpen()).toBe(true);
    void section;
  });
});
