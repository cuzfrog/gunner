import { fakeDocument, FakeElement } from "../testing";
import { ChoiceGroupImpl, type ChoiceGroupOption, type ChoiceGroupShape, type ChoiceGroup } from "./choiceGroup";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

interface FakeButton {
  readonly value: string;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  addEventListener(event: string, handler: () => void): void;
  handler?: () => void;
}

function fakeButton(value: string): FakeButton {
  const button: FakeButton = {
    value,
    getAttribute: (name) => (name === "data-value" ? value : null),
    setAttribute: vi.fn(),
    addEventListener: (_event, handler) => {
      button.handler = handler;
    },
  };
  return button;
}

function fakeGroup(values: string[], selected: string, extra: string[] = []): { group: HTMLElement; select: HTMLSelectElement; buttons: FakeButton[] } {
  const buttons = [...values, ...extra].map((value) => fakeButton(value));
  const group = { children: buttons as unknown as HTMLCollection } as unknown as HTMLElement;
  const select = { value: selected, dispatchEvent: vi.fn() } as unknown as HTMLSelectElement;
  return { group, select, buttons };
}

describe("ChoiceGroup (static buttons)", () => {
  test("set marks the matching button active and updates aria-pressed", () => {
    const { group, select, buttons } = fakeGroup(["S", "M", "L", "XL"], "S");
    const choice = new ChoiceGroupImpl({ group, select, staticValues: ["S", "M", "L", "XL"] });
    choice.set("L");

    expect(buttons[0].setAttribute).toHaveBeenCalledWith("aria-pressed", "false");
    expect(buttons[2].setAttribute).toHaveBeenCalledWith("aria-pressed", "true");
  });

  test("clicking a button updates the select, toggles visuals and dispatches an input event", () => {
    const { group, select, buttons } = fakeGroup(["S", "M", "L", "XL"], "S");
    const choice = new ChoiceGroupImpl({ group, select, staticValues: ["S", "M", "L", "XL"] });
    buttons[1].handler?.();

    expect(select.value).toBe("M");
    expect((select as unknown as { dispatchEvent: ReturnType<typeof vi.fn> }).dispatchEvent).toHaveBeenCalled();
    const event = (select as unknown as { dispatchEvent: ReturnType<typeof vi.fn> }).dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe("input");
    expect(event.bubbles).toBe(true);
    expect(buttons[0].setAttribute).toHaveBeenCalledWith("aria-pressed", "false");
    expect(buttons[1].setAttribute).toHaveBeenCalledWith("aria-pressed", "true");
  });

  test("ignores clicks on buttons whose value is not in the configured list", () => {
    const { group, select, buttons } = fakeGroup(["S", "M", "L", "XL"], "S", ["?"]);
    const choice = new ChoiceGroupImpl({ group, select, staticValues: ["S", "M", "L", "XL"] });
    buttons[4].handler?.();

    expect(select.value).toBe("S");
    expect((select as unknown as { dispatchEvent: ReturnType<typeof vi.fn> }).dispatchEvent).not.toHaveBeenCalled();
  });
});

describe("ChoiceGroup.render", () => {
  const shape: ChoiceGroupShape = {
    buttonClass: "btn test-option",
  };

  test("builds buttons from options and appends to group", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape });
    const options: ChoiceGroupOption[] = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ];
    choice.render(options, "a");
    expect(group.childElementCount).toBe(2);
    expect(group.children[0].tagName).toBe("BUTTON");
    expect(group.children[0].getAttribute("data-value")).toBe("a");
    expect(group.children[0].getAttribute("aria-pressed")).toBe("true");
    expect(group.children[1].getAttribute("aria-pressed")).toBe("false");
  });

  test("sets button class from shape", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape });
    choice.render([{ value: "a", label: "Alpha" }], "a");
    expect(group.children[0].className).toBe("btn test-option");
  });

  test("adds truncate class when shape.truncateButton is true", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape: { ...shape, truncateButton: true } });
    choice.render([{ value: "a", label: "Alpha" }], "a");
    expect(group.children[0].className).toContain("truncate");
  });

  test("sets button textContent when no labelClass", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape });
    choice.render([{ value: "a", label: "Alpha" }], "a");
    expect(group.children[0].textContent).toBe("Alpha");
  });

  test("wraps label in span when labelClass is set", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape: { ...shape, labelClass: "test-label" } });
    choice.render([{ value: "a", label: "Alpha" }], "a");
    expect(group.children[0].childElementCount).toBe(1);
    expect(group.children[0].children[0].tagName).toBe("SPAN");
    expect(group.children[0].children[0].className).toBe("test-label");
    expect(group.children[0].children[0].textContent).toBe("Alpha");
  });

  test("adds icon img when iconUrl and iconClass provided", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape: { ...shape, iconClass: "test-icon" } });
    choice.render([{ value: "a", label: "Alpha", iconUrl: "icon.png" }], "a");
    expect(group.children[0].childElementCount).toBe(2);
    expect(group.children[0].children[0].tagName).toBe("IMG");
    expect(group.children[0].children[0].className).toBe("test-icon");
  });

  test("omits icon when iconUrl not provided", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape: { ...shape, iconClass: "test-icon" } });
    choice.render([{ value: "a", label: "Alpha" }], "a");
    expect(group.children[0].childElementCount).toBe(0);
  });

  test("sets data-hint on button when provided", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape });
    choice.render([{ value: "a", label: "Alpha", hint: "Hint" }], "a");
    expect(group.children[0].getAttribute("data-hint")).toBe("Hint");
  });

  test("disables button when disabled is true", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape });
    choice.render([{ value: "a", label: "Alpha", disabled: true }], "a");
    expect(group.children[0].getAttribute("disabled")).toBe("");
  });

  test("mirrors options to hidden select when provided", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const select = document.createElement("select") as unknown as HTMLSelectElement;
    const choice = new ChoiceGroupImpl({ group, shape, select });
    choice.render([{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }], "b");
    expect(select.childElementCount).toBe(2);
    expect(select.children[0].tagName).toBe("OPTION");
    expect((select.children[0] as unknown as FakeElement).value).toBe("a");
    expect(select.children[0].textContent).toBe("Alpha");
  });

  test("sets select.value to selected", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const select = document.createElement("select") as unknown as HTMLSelectElement;
    const choice = new ChoiceGroupImpl({ group, shape, select });
    choice.render([{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }], "b");
    expect(select.value).toBe("b");
  });

  test("clicking a rendered button dispatches input on select", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const select = document.createElement("select") as unknown as HTMLSelectElement;
    const dispatchSpy = vi.spyOn(select, "dispatchEvent");
    const choice = new ChoiceGroupImpl({ group, shape, select });
    choice.render([{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }], "a");
    (group.children[1] as unknown as FakeElement).trigger("click");
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as Event;
    expect(event.type).toBe("input");
  });

  test("clicking a rendered button without select dispatches input on group", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const dispatchSpy = vi.spyOn(group, "dispatchEvent");
    const choice = new ChoiceGroupImpl({ group, shape });
    choice.render([{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }], "a");
    (group.children[1] as unknown as FakeElement).trigger("click");
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as Event;
    expect(event.type).toBe("input");
  });

  test("set updates aria-pressed on rendered buttons", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    const choice = new ChoiceGroupImpl({ group, shape });
    choice.render([{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }], "a");
    choice.set("b");
    expect(group.children[0].getAttribute("aria-pressed")).toBe("false");
    expect(group.children[1].getAttribute("aria-pressed")).toBe("true");
  });

  test("clears group before rendering", () => {
    const group = document.createElement("div") as unknown as HTMLElement;
    group.appendChild(document.createElement("span"));
    const choice = new ChoiceGroupImpl({ group, shape });
    choice.render([{ value: "a", label: "Alpha" }], "a");
    expect(group.childElementCount).toBe(1);
    expect(group.children[0].tagName).toBe("BUTTON");
  });
});
